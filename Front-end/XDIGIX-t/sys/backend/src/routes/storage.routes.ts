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
   Raster images  → generate 3 responsive sizes (400w, 800w, 2048w) as WebP
   SVG            → strip dangerous constructs, keep as SVG
   Other files    → pass through unchanged
──────────────────────────────────────────────────────────────────────────── */

export interface ImageVariant {
  buffer: Buffer;
  suffix: string; // '' for original, '-800w', '-400w'
  contentType: string;
}

const IMAGE_SIZES = [
  { width: 400, suffix: '-400w' },
  { width: 800, suffix: '-800w' },
  { width: 2048, suffix: '' },     // Original/full size
];

async function processFile(
  buffer: Buffer,
  mimetype: string
): Promise<{ buffer: Buffer; contentType: string; variants?: ImageVariant[] }> {
  if (mimetype === 'image/svg+xml') {
    return { buffer: sanitizeSvg(buffer), contentType: 'image/svg+xml' };
  }

  if (mimetype.startsWith('image/') && sharpFn) {
    // Generate all 3 responsive sizes in parallel
    const variants = await Promise.all(
      IMAGE_SIZES.map(async (size) => ({
        buffer: await sharpFn(buffer)
          .resize({ width: size.width, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer(),
        suffix: size.suffix,
        contentType: 'image/webp',
      }))
    );
    // The "original" (largest) variant is the one with empty suffix
    const primary = variants.find(v => v.suffix === '') || variants[variants.length - 1];
    return { buffer: primary.buffer, contentType: 'image/webp', variants };
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
    const { buffer, contentType, variants } = await processFile(req.file.buffer, req.file.mimetype);

    // Use .webp extension if Sharp converted the image, otherwise keep original ext
    const ext = contentType === 'image/webp' ? '.webp' : (MIME_TO_EXT[req.file.mimetype] || '.bin');
    const filename = `${uuid}${ext}`;

    if (isS3Configured && s3 && PutObjectCommandClass) {
      /* ── S3 / Cloudflare R2 / MinIO ─────────────────────────────── */
      const publicBase = (config.s3.publicUrl || '').replace(/\/$/, '');

      // Upload all responsive variants in parallel (or single file if no variants)
      const filesToUpload = variants && variants.length > 0
        ? variants.map(v => ({
            key: `uploads/${tenantId}/${uuid}${v.suffix}${ext}`,
            body: v.buffer,
            type: v.contentType,
          }))
        : [{ key: `uploads/${tenantId}/${filename}`, body: buffer, type: contentType }];

      await Promise.all(filesToUpload.map(f =>
        s3.send(new PutObjectCommandClass({
          Bucket: config.s3.bucket,
          Key: f.key,
          Body: f.body,
          ContentType: f.type,
          CacheControl: 'public, max-age=31536000, immutable',
        }))
      ));

      const primaryKey = `uploads/${tenantId}/${filename}`;
      const url = `${publicBase}/${primaryKey}`;

      // Build srcset URLs for responsive images
      const srcset: Record<string, string> = {};
      if (variants && variants.length > 0) {
        for (const v of variants) {
          const w = v.suffix === '' ? '2048w' : v.suffix.replace('-', '') ;
          srcset[w] = `${publicBase}/uploads/${tenantId}/${uuid}${v.suffix}${ext}`;
        }
      }

      console.log(
        `[storage] → S3 ${primaryKey} ${(buffer.length / 1024).toFixed(1)} KB ${contentType}${variants ? ` (${variants.length} variants)` : ''}`
      );
      res.json({ url, path: primaryKey, ...(Object.keys(srcset).length > 0 ? { srcset } : {}) });
    } else {
      /* ── Local filesystem fallback ──────────────────────────────── */
      const tenantDir = path.join(LOCAL_UPLOAD_DIR, tenantId);
      if (!fs.existsSync(tenantDir)) fs.mkdirSync(tenantDir, { recursive: true });

      const localPath = path.join(tenantDir, filename);
      fs.writeFileSync(localPath, buffer);

      // Served via express.static at /storage/files → uploads/
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${config.port}`;
      const baseUrl = `${protocol}://${host}`;
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

/**
 * GET /api/storage/list
 *
 * Lists all uploaded files for the current tenant.
 * Returns { files: Array<{ url: string, path: string, size?: number, lastModified?: string }> }
 */
router.get('/list', async (req: Request, res: Response) => {
  const tenantId: string = (req as any).tenantId || 'default';

  try {
    if (isS3Configured && s3) {
      /* ── S3 / Cloudflare R2 / MinIO ─────────────────────────────── */
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
      const prefix = `uploads/${tenantId}/`;
      const result = await s3.send(
        new ListObjectsV2Command({
          Bucket: config.s3.bucket,
          Prefix: prefix,
          MaxKeys: 500,
        })
      );
      const publicBase = (config.s3.publicUrl || '').replace(/\/$/, '');
      const files = ((result.Contents || []) as Array<{ Key: string; Size?: number; LastModified?: Date }>)
        .filter((obj) => {
          const ext = (obj.Key || '').split('.').pop()?.toLowerCase() || '';
          return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
        })
        .map((obj) => ({
          url: `${publicBase}/${obj.Key}`,
          path: obj.Key,
          size: obj.Size || 0,
          lastModified: obj.LastModified ? new Date(obj.LastModified).toISOString() : undefined,
        }))
        .sort((a, b) => (b.lastModified || '').localeCompare(a.lastModified || ''));

      res.json({ files });
    } else {
      /* ── Local filesystem fallback ──────────────────────────────── */
      const tenantDir = path.join(LOCAL_UPLOAD_DIR, tenantId);
      if (!fs.existsSync(tenantDir)) {
        res.json({ files: [] });
        return;
      }
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${config.port}`;
      const baseUrl = `${protocol}://${host}`;

      const entries = fs.readdirSync(tenantDir);
      const imageExts = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']);
      const files = entries
        .filter((name) => {
          const ext = name.split('.').pop()?.toLowerCase() || '';
          return imageExts.has(ext);
        })
        .map((name) => {
          const filePath = path.join(tenantDir, name);
          const stat = fs.statSync(filePath);
          return {
            url: `${baseUrl}/storage/files/${tenantId}/${name}`,
            path: `${tenantId}/${name}`,
            size: stat.size,
            lastModified: stat.mtime.toISOString(),
          };
        })
        .sort((a, b) => (b.lastModified || '').localeCompare(a.lastModified || ''));

      res.json({ files });
    }
  } catch (err) {
    console.error('[storage] List error:', err);
    res.status(500).json({ error: 'Failed to list files', code: 'storage/list-error' });
  }
});

export default router;
