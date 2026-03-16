import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { jwtMiddleware } from '../middleware/jwt.middleware';
import { tenantMiddleware } from '../middleware/tenant.middleware';
import { config } from '../config';
import fs from 'fs';
import os from 'os';

const router = Router();
router.use(jwtMiddleware);
router.use(tenantMiddleware);

const uploadDir = path.join(os.tmpdir(), 'madas-uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/** Allowed MIME types whitelist */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

/** Extension derived from MIME — prevents extension spoofing via originalname */
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
  'image/webp': '.webp', 'image/svg+xml': '.svg',
  'application/pdf': '.pdf', 'text/csv': '.csv',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = MIME_TO_EXT[file.mimetype] || '.bin';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

/** Sanitize a storage path: strip path traversal, null bytes, and absolute paths */
function sanitizeStoragePath(rawPath: string): string {
  return rawPath
    .replace(/\0/g, '')
    .replace(/\.\.\//g, '')
    .replace(/\.\.[\\]/g, '')
    .replace(/^[/\\]+/, '')
    .replace(/[/\\]+/g, '/')
    .slice(0, 500);
}

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded', code: 'storage/no-file' });
    return;
  }

  const rawPath = (req.body.path as string) || `businesses/${req.businessId || 'default'}/uploads/${req.file.filename}`;
  const storagePath = sanitizeStoragePath(rawPath);

  const baseUrl = config.s3.publicUrl || `http://localhost:${config.port}`;
  const url = `${baseUrl}/files/${storagePath}`;

  const safeFilename = storagePath.replace(/\//g, '_');
  const finalPath = path.join(uploadDir, safeFilename);

  try {
    fs.renameSync(req.file.path, finalPath);
  } catch {
    fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Failed to store file', code: 'storage/write-error' });
    return;
  }

  res.json({ url, path: storagePath });
});

export default router;
