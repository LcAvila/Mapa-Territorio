import { Request as ExRequest, Response as ExResponse, NextFunction as ExNextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key';

export interface AuthRequest extends ExRequest {
  user?: any;
}

export const authenticate = (req: AuthRequest, res: ExResponse, next: ExNextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Acesso negado' });
  }

  try {
    const verified = jwt.verify(token, SECRET_KEY);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Token inválido' });
  }
};

export const requireAdmin = (req: AuthRequest, res: ExResponse, next: ExNextFunction) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'supervisor') {
    return res.status(403).json({ message: 'Acesso restrito' });
  }
  next();
};
