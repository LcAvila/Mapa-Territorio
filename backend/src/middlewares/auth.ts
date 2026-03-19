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

export const requirePermission = (moduleId: string, level: 'view' | 'edit' = 'view') => {
  return async (req: AuthRequest, res: ExResponse, next: ExNextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado' });
    
    // Admin has full access
    if (req.user.role === 'admin') return next();

    try {
      // Import prisma dynamically to avoid circular dependencies if any
      const { prisma } = require('../prisma');
      const permission = await (prisma as any).userPermission.findUnique({
        where: {
          userId_moduleId: {
            userId: req.user.id,
            moduleId: moduleId
          }
        }
      });

      if (!permission) {
        return res.status(403).json({ message: `Sem permissão para o módulo: ${moduleId}` });
      }

      if (level === 'view' && !permission.canView) {
        return res.status(403).json({ message: 'Acesso de visualização negado' });
      }

      if (level === 'edit' && !permission.canEdit) {
        return res.status(403).json({ message: 'Acesso de edição negado' });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Erro ao verificar permissões' });
    }
  };
};
