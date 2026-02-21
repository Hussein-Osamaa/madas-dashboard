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

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded', code: 'storage/no-file' });
    return;
  }
  const storagePath = (req.body.path as string) || `businesses/${req.businessId || 'default'}/uploads/${req.file.filename}`;

  // In production: upload to S3 and return signed/public URL
  // For now: return a local URL that the server can serve
  const baseUrl = config.s3.publicUrl || `http://localhost:${config.port}`;
  const url = `${baseUrl}/files/${storagePath}`;

  // Move file to a persistent location if using local storage
  // For S3: use @aws-sdk/client-s3 PutObject
  const finalPath = path.join(uploadDir, storagePath.replace(/\//g, '_'));
  const finalDir = path.dirname(finalPath);
  if (!fs.existsSync(finalDir)) {
    fs.mkdirSync(finalDir, { recursive: true });
  }
  fs.renameSync(req.file.path, finalPath);

  res.json({ url, path: storagePath });
});

export default router;
