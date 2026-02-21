import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/** Validation middleware - returns 400 with errors if validation fails */
export function validateRequest(req: Request, res: Response, next: NextFunction): void {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    res.status(400).json({ error: errs.array()[0]?.msg || 'Validation failed', details: errs.array() });
    return;
  }
  next();
}
