import { Response as ExResponse, NextFunction as ExNextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../prisma';
import { logUserActivity } from '../utils/logger';

type PrismaModelName = 'user' | 'cliente' | 'feedPost' | 'feedComment' | 'territory' | 'bairro';

/**
 * Middleware to check if a user owns a specific resource.
 * Admins bypass entirely. Supervisors can only access resources from their subordinates.
 */
export const requireOwnership = (modelName: PrismaModelName, idParam: string = 'id', ownerField: string = 'userId') => {
  return async (req: AuthRequest, res: ExResponse, next: ExNextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado' });
    
    // Only admins get full bypass
    if (req.user.role === 'admin') return next();

    const resourceId = Number(req.params[idParam]);
    if (isNaN(resourceId)) return res.status(400).json({ message: 'ID inválido' });

    try {
      const resource = await (prisma[modelName] as any).findUnique({
        where: { id: resourceId },
        select: { [ownerField]: true }
      });

      if (!resource) return res.status(404).json({ message: 'Recurso não encontrado' });

      const ownerId = resource[ownerField];
      const isOwner = ownerId === req.user.id;

      // Supervisors can access their own resources AND their subordinates' resources
      if (req.user.role === 'supervisor') {
        const subordinateIds = req.user.subordinateIds || [];
        const canAccess = isOwner || subordinateIds.includes(ownerId);
        if (!canAccess) {
          return res.status(403).json({ message: 'Acesso negado: recurso não pertence a você ou seus subordinados' });
        }
        return next();
      }

      // Regular users: must be the owner
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
 * Password complexity validation
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const validatePasswordStrength = (password: string): boolean => {
  if (!password || password.length < 8) return false;
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  return regex.test(password);
};
