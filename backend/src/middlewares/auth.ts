import { Request as ExRequest, Response as ExResponse, NextFunction as ExNextFunction } from 'express';
import { supabase } from '../lib/supabase';
import { prisma } from '../prisma';

export interface AuthRequest extends ExRequest {
  user?: any;
  isHttpFallback?: boolean;
}

export const authenticate = async (req: AuthRequest, res: ExResponse, next: ExNextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  console.log(`[AUTH] Request received: ${req.method} ${req.originalUrl}. Token present: ${!!token}`);
  if (!token) {
    return res.status(401).json({ message: 'Acesso negado' });
  }

  try {
    // Step 1: Validate session with Supabase
    const { data: { user: sbUser }, error: sbError } = await supabase.auth.getUser(token);
    
    if (sbError || !sbUser) {
      console.error('[AUTH] Supabase error:', sbError?.message);
      return res.status(401).json({ message: 'Sessão inválida ou expirada' });
    }

    // Step 2: Extract our custom user from Prisma
    const accessCode = sbUser.email?.split('@')[0];
    let user: any = null;

    try {
      console.log(`[AUTH] Attempting to match user in Prisma. Email: ${sbUser.email}, extracted code: ${accessCode}`);
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { code: accessCode },
            { username: accessCode }
          ]
        },
        include: {
          permissions: {
            include: { module: true }
          }
        }
      });
    } catch (prismaError) {
      console.warn(`[AUTH] Prisma connection failed. Attempting HTTP Fallback via Supabase API (Port 443)...`);
      
      const { data: httpUser, error: httpError } = await supabase
        .from('users')
        .select('*, permissions:user_permissions(*, module:modules(*))')
        .or(`code.eq.${accessCode},username.eq.${accessCode}`)
        .single();

      if (httpError || !httpUser) {
        console.error(`[AUTH] HTTP Fallback failed:`, httpError?.message || 'User not found');
        return res.status(401).json({ message: 'Perfil não encontrado (Modo Offline)' });
      }

      console.log(`[AUTH] Perfil recuperado com sucesso via HTTP Fallback!`);
      user = httpUser;
      req.isHttpFallback = true;
    }
 
    if (!user) {
      console.error(`[AUTH] User profile not found for accessCode: ${accessCode}`);
      return res.status(401).json({ message: 'Perfil não encontrado' });
    }

    // Step 3: Real-time 'Kick' validation
    const clientTokenVersion = Number(req.headers['x-user-token-version'] || 0);
    // Be more permissive with /me endpoint check to allow getting the profile after login
    const isMeEndpoint = req.path === '/me' || req.originalUrl.includes('/auth/me');

    if (!isMeEndpoint && user.token_version > 0 && clientTokenVersion < user.token_version) {
      return res.status(401).json({ message: 'Sessão encerrada por outro administrador' });
    }
 
    // Step 4: Attach user info to request
    req.user = {
      ...user,
      id: user.id,
      role: user.role,
      tipo: user.tipo,
      repCode: user.repCode
    };

    // Update last_active in background (if possible)
    if (!req.isHttpFallback) {
        prisma.user.update({
          where: { id: user.id },
          data: { last_active: new Date() }
        }).catch(e => console.error('Error updating last_active:', e));
    }

    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ message: 'Falha na autenticação' });
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
    
    // Admin and Supervisor have full access bypass
    if (req.user.role === 'admin' || req.user.role === 'supervisor') return next();

    // Representatives have default view access to their data modules
    const DEFAULT_REP_VIEW_MODULES = ['clients', 'reps', 'territories', 'interests', 'groups'];
    const isRep = req.user.role === 'representante' || req.user.tipo === 'representante';

    if (isRep && level === 'view' && DEFAULT_REP_VIEW_MODULES.includes(moduleId)) {
      return next();
    }

    try {
      const permission = await prisma.userPermission.findUnique({
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
