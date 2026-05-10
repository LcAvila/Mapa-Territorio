import { Response as ExResponse, NextFunction as ExNextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../prisma';

/**
 * Middleware to check if a user owns a specific resource.
 * Admins and Supervisors bypass this check.
 */
export const requireOwnership = (modelName: string, idParam: string = 'id', ownerField: string = 'userId') => {
  return async (req: AuthRequest, res: ExResponse, next: ExNextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado' });
    
    // Admins and supervisors see everything
    if (req.user.role === 'admin' || req.user.role === 'supervisor') return next();

    const resourceId = Number(req.params[idParam]);
    if (isNaN(resourceId)) return res.status(400).json({ message: 'ID inválido' });

    try {
      const resource = await (prisma as any)[modelName].findUnique({
        where: { id: resourceId },
        select: { [ownerField]: true }
      });

      if (!resource) return res.status(404).json({ message: 'Recurso não encontrado' });

      // Check if user is the owner
      const ownerId = resource[ownerField];
      const isOwner = ownerId === req.user.id;

      if (!isOwner) {
        return res.status(403).json({ message: 'Acesso negado: Você não é o proprietário deste recurso' });
      }

      next();
    } catch (error) {
      console.error(`Ownership check error for ${modelName}:`, error);
      res.status(500).json({ message: 'Erro ao verificar propriedade do recurso' });
    }
  };
};

/**
 * Password complexity validation regex
 * - One uppercase
 * - One lowercase
 * - One number
 * - One symbol
 * - Min 8 characters (optional but recommended)
 */
export const validatePasswordStrength = (password: string): boolean => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{6,}$/;
  return regex.test(password);
};
