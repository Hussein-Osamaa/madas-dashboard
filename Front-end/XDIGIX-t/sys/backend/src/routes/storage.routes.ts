import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { jwtMiddleware } from '../middleware/jwt.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { config } from '../config';
import fs from 'fs';

/* ─── Lazy-load optional heavy deps ───────────────────────────────────────
   sharp and @aws-sdk/client-s3 are available but we load them lazily so the
   server starts cleanly even if a native build is missing (e.g. CI).
──────────────────────────────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sharpFn: ((input: Buffer) => any) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  sharpFn = require('sharp');
} catch {
  console.warn('[storage] sharp not available — images stored as-is (no WebP conversion)');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let S3ClientClass: (new (cfg: object) => any) | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let PutObjectCommandClass: (new (cfg: object) => any) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const s3mod = require('@aws-sdk/client-s3');
  S3ClientClass = s3mod.S3Client;
  PutObjectCommandClass = s3mod.PutObjectCommand;
} catch {
  console.warn('[storage] @aws-sdk/client-s3 not available — S3 uploads disabled');
}

/* ─── S3 client (instantiated only when credentials are present) ─────── */
const isS3Configured = !!(
  config.s3.accessKeyId &&
  config.s3.secretAccessKey &&
  config.s3.bucket
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let s3: any | null = null;
if (isS3Configured && S3ClientClass) {
  const s3Opts: Record<string, unknown> = {
    region: config.s3.region || 'auto',
    credentials: {
      accessKeyId: config.s3.accessKeyId as string,
      secretAccessKey: config.s3.secretAccessKey as string,
    },
  };
  // Support Cloudflare R2, MinIO, and other S3-compatible endpoints
  if (config.s3.endpoint) s3Opts.endpoint = config.s3.endpoint;
  s3 = new S3ClientClass(s3Opts);
  console.log(`[storage] S3 configured → bucket=${config.s3.bucket} region=${config.s3.region}`);
} else {
  console.log('[storage] S3 not configured → local filesystem fallback active');
}

/* ─── Local filesystem fallback (development only) ───────────────────────
   app.ts mounts express.static(process.cwd()/uploads) at /storage/files
   so files written here are immediately accessible via HTTP.
──────────────────────────────────────────────────────────────────────────── */
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!isS3Configured && !fs.existsSync(LOCAL_UPLOAD_DIR)) {
  fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
}

/* ─── Allowed MIME types whitelist ─────────────────────────────────────── */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

/** Canonical extension derived from MIME — prevents extension spoofing */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg':    '.jpg',
  'image/png':     '.png',
  'image/gif':     '.gif',
  'image/webp':    '.webp',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
  'text/csv':      '.csv',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

/* ─── Multer — always memory storage ────────────────────────────────────
   We hold the buffer in memory so we can run Sharp and then decide whether
   to write to S3 or the local filesystem.
──────────────────────────────────────────────────────────────────────────── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB hard cap
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

/* ─── SVG sanitizer ──────────────────────────────────────────────────────
   DOMPurify is browser-only; we use targeted regex to strip known XSS
   vectors from SVG before persisting. Conservative: strip, not allow-list.
──────────────────────────────────────────────────────────────────────────── */
function sanitizeSvg(buffer: Buffer): Buffer {
  let svg = buffer.toString('utf8');

  // Remove <script> blocks
  svg = svg.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');

  // Remove <foreignObject> blocks (can embed arbitrary HTML)
  svg = svg.replace(/<foreignObject\b[\s\S]*?<\/foreignObject\s*>/gi, '');

  // Strip all event handler attributes (on*)
  svg = svg.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '');
  svg = svg.replace(/\s+on\w+\s*=\s*'[^']*'/gi, '');

  // Strip javascript: and data: URIs in href / src / action / xlink:href
  svg = svg.replace(
    /((?:xlink:)?href|src|action)\s*=\s*"(javascript|data):[^"]*"/gi,
    '$1="#"'
  );
  svg = svg.replace(
    /((?:xlink:)?href|src|action)\s*=\s*'(javascript|data):[^']*'/gi,
    "$1='#'"
  );

  // Remove external xlink:href references on <use> (allow internal fragment refs only)
  svg = svg.replace(
    /(<use\b[^>]*)\s+xlink:href\s*=\s*"(?!#)[^"]*"/gi,
    '$1'
  );
  svg = svg.replace(
    /(<use\b[^>]*)\s+href\s*=\s*"(?!#)[^"]*"/gi,
    '$1'
  );

  return Buffer.from(svg, 'utf8');
}

/* ─── Image processing pipeline ──────────────────────────────────────────
   Raster images  → resize to max 2048 px wide → WebP (quality 80)
   SVG            → strip dangerous constructs, keep as SVG
   Other files    → pass through unchanged
──────────────────────────────────────────────────────────────────────────── */
async function processFile(
  buffer: Buffer,
  mimetype: string
): Promise<{ buffer: Buffer; contentType: string }> {
  if (mimetype === 'image/svg+xml') {
    return { buffer: sanitizeSvg(buffer), contentType: 'image/svg+xml' };
  }

  if (mimetype.startsWith('image/') && sharpFn) {
    const webpBuffer: Buffer = await sharpFn(buffer)
      .resize({ width: 2048, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return { buffer: webpBuffer, contentType: 'image/webp' };
  }

  // Non-image files or sharp unavailable → store unchanged
  return { buffer, contentType: mimetype };
}

/* ─── Routes ─────────────────────────────────────────────────────────── */
const router = Router();
router.use(jwtMiddleware);
router.use(tenantMiddleware);

/**
 * POST /api/storage/upload
 *
 * Accepts multipart/form-data with field name `file`.
 * Returns { url: string, path: string }
 *
 * Production (S3 configured):
 *   Uploads to S3/R2 at uploads/{tenantId}/{uuid}.{ext}
 *   Returns CDN URL from S3_PUBLIC_URL env var.
 *
 * Development (S3 not configured):
 *   Writes to process.cwd()/uploads/{tenantId}/{uuid}.{ext}
 *   Returns http://localhost:{PORT}/storage/files/{tenantId}/{uuid}.{ext}
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded', code: 'storage/no-file' });
    return;
  }

  const tenantId: string = (req as any).tenantId || 'default';
  const uuid = uuidv4();

  try {
    const { buffer, contentType } = await processFile(req.file.buffer, req.file.mimetype);

    // Use .webp extension if Sharp converted the image, otherwise keep original ext
    const ext = contentType === 'image/webp' ? '.webp' : (MIME_TO_EXT[req.file.mimetype] || '.bin');
    const filename = `${uuid}${ext}`;

    if (isS3Configured && s3 && PutObjectCommandClass) {
      /* ── S3 / Cloudflare R2 / MinIO ─────────────────────────────── */
      const s3Key = `uploads/${tenantId}/${filename}`;

      await s3.send(
        new PutObjectCommandClass({
          Bucket: config.s3.bucket,
          Key: s3Key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
          // ACL: 'public-read',  // Uncomment for AWS S3; omit for Cloudflare R2
        })
      );

      const publicBase = (config.s3.publicUrl || '').replace(/\/$/, '');
      const url = `${publicBase}/${s3Key}`;

      console.log(
        `[storage] → S3 ${s3Key} ${(buffer.length / 1024).toFixed(1)} KB ${contentType}`
      );
      res.json({ url, path: s3Key });
    } else {
      /* ── Local filesystem fallback ──────────────────────────────── */
      const tenantDir = path.join(LOCAL_UPLOAD_DIR, tenantId);
      if (!fs.existsSync(tenantDir)) fs.mkdirSync(tenantDir, { recursive: true });

      const localPath = path.join(tenantDir, filename);
      fs.writeFileSync(localPath, buffer);

      // Served via express.static at /storage/files → uploads/
      const baseUrl = `http://localhost:${config.port}`;
      const storagePath = `${tenantId}/${filename}`;
      const url = `${baseUrl}/storage/files/${storagePath}`;

      console.log(
        `[storage] → local ${storagePath} ${(buffer.length / 1024).toFixed(1)} KB ${contentType}`
      );
      res.json({ url, path: storagePath });
    }
  } catch (err) {
    console.error('[storage] Upload error:', err);
    res.status(500).json({ error: 'Upload failed', code: 'storage/upload-error' });
  }
});

export default router;
