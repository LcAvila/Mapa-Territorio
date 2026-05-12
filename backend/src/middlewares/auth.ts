import { Request as ExRequest, Response as ExResponse, NextFunction as ExNextFunction } from 'express';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { prisma } from '../prisma';

export interface AuthRequest extends ExRequest {
  user?: any;
  isHttpFallback?: boolean;
  supabaseAdmin?: any;
}

// Simple in-memory cache for auth sessions to reduce Supabase/DB load
// Key: token, Value: { user, expiresAt }
const authCache = new Map<string, { user: any; expiresAt: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes cache

export const authenticate = async (req: AuthRequest, res: ExResponse, next: ExNextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  // Attach supabaseAdmin to request for easier fallback in routes
  req.supabaseAdmin = supabaseAdmin;
  
  if (!token) {
    console.log(`[AUTH] Access denied: No token provided for ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ message: 'Acesso negado' });
  }

  // Check cache first
  const cached = authCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    // console.log(`[AUTH] Cache hit for token. User: ${cached.user.username}`);
    req.user = cached.user;
    // Update last_active in background without awaiting - only if DB is likely up
    // To avoid pool exhaustion, we skip this if we are in fallback mode
    return next();
  }

  try {
    // Step 1: Validate session with Supabase
    const { data: { user: sbUser }, error: sbError } = await supabase.auth.getUser(token);
    
    if (sbError || !sbUser) {
      console.error('[AUTH] Supabase Auth error:', sbError?.message);
      return res.status(401).json({ message: 'Sessão inválida ou expirada' });
    }

    // Step 2: Extract our custom user from Prisma or Supabase HTTP
    const accessCode = sbUser.email?.split('@')[0];
    let user: any = null;

    try {
      // Set a timeout for Prisma to avoid hanging
      const prismaUserPromise = (prisma.user as any).findFirst({
        where: {
          OR: [
            { supabase_id: sbUser.id },
            sbUser.email ? { email: { equals: sbUser.email, mode: 'insensitive' } } : null,
            accessCode ? { code: accessCode } : null,
            accessCode ? { username: accessCode } : null,
            sbUser.email === 'avila.estudohtml@gmail.com' ? { username: 'admin' } : null
          ].filter(Boolean) as any
        },
        include: {
          permissions: { include: { module: true } },
          managedUsers: { select: { id: true } }
        }
      });

      // Simple race for timeout (5 seconds)
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma Timeout')), 5000));
      user = await Promise.race([prismaUserPromise, timeoutPromise]);
      
    } catch (err) {
      console.warn(`[AUTH] Prisma failed or timed out. Using Supabase HTTP Fallback...`);
      
      const { data: httpUser, error: httpError } = await supabase
        .from('users')
        .select('*, permissions:user_permissions(*, module:modules(*))')
        .or(`supabase_id.eq.${sbUser.id},email.eq.${sbUser.email},code.eq.${accessCode},username.eq.${accessCode}`)
        .single();

      if (httpError || !httpUser) {
        console.error(`[AUTH] HTTP Fallback failed:`, httpError?.message || 'User not found');
        return res.status(401).json({ message: 'Perfil não encontrado (Modo Offline)' });
      }

      user = {
        ...httpUser,
        permissions: (httpUser.permissions || []).map((p: any) => ({
            ...p,
            module: p.module || p.modules
        })),
        managedUsers: httpUser.managedUsers?.map((m: any) => ({ id: m.managed_user_id || m.id })) || []
      };
      req.isHttpFallback = true;
    }
 
    if (!user) {
      console.error(`[AUTH] User not found in database for email: ${sbUser.email}`);
      return res.status(401).json({ message: 'Perfil não sincronizado. Entre em contato com o administrador.' });
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
      subordinateIds: user.managedUsers?.map((s: any) => s.id) || []
    };

    // Store in cache
    authCache.set(token, {
      user: req.user,
      expiresAt: Date.now() + CACHE_TTL
    });

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
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso restrito a administradores' });
  }
  next();
};

export const requirePermission = (moduleId: string, level: 'view' | 'edit' = 'view') => {
  return async (req: AuthRequest, res: ExResponse, next: ExNextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Não autenticado' });
    
    // Admin has full access bypass
    if (req.user.role === 'admin') return next();

    console.log(`[PERMS] Checking ${level} for module ${moduleId} (User: ${req.user.id}, Role: ${req.user.role})`);

    // Standard users have default view access to certain modules
    // Using a more inclusive list and ensuring role check is robust
    const DEFAULT_VIEW_MODULES = ['clients', 'reps', 'territories', 'interests', 'groups', 'notifications', 'baserotas', 'clientes', 'routes', 'users'];
    const userRole = String(req.user.role || '').toLowerCase();
    const isStandardUser = userRole === 'user' || userRole === 'representante';

    console.log(`[PERMS] Checking module: ${moduleId}, level: ${level}, role: ${userRole}`);

    if (level === 'view') {
      if (DEFAULT_VIEW_MODULES.includes(moduleId) || moduleId === 'baserotas' || moduleId === 'clientes') {
        if (isStandardUser || userRole === 'supervisor' || userRole === 'admin') {
          console.log(`[PERMS] Auto-granting view access to ${moduleId} for role ${userRole}`);
          return next();
        }
      }
    }

    // Standard users can also edit their own profile/notifications if needed
    if (level === 'edit' && (moduleId === 'notifications' || moduleId === 'users')) {
      if (isStandardUser || userRole === 'supervisor') {
        console.log(`[PERMS] Auto-granting edit access to ${moduleId} for role ${userRole}`);
        return next();
      }
    }

    try {
      // Usando queryRaw com timeout para evitar travamento
      const queryPromise = prisma.$queryRawUnsafe(
        'SELECT "canView", "canEdit" FROM "user_permissions" WHERE "userId" = $1 AND "moduleId" = $2',
        req.user.id, moduleId
      );
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma Timeout')), 3000));
      
      const perms = await Promise.race([queryPromise, timeoutPromise]) as any[];
      const permission = perms[0];

      if (!permission) {
        console.warn(`[PERMS] No permission record found for module: ${moduleId}`);
        return res.status(403).json({ message: `Sem permissão para o módulo: ${moduleId}` });
      }

      if (level === 'view' && !permission.canView) {
        console.warn(`[PERMS] View access denied for module: ${moduleId}`);
        return res.status(403).json({ message: 'Acesso de visualização negado' });
      }

      if (level === 'edit' && !permission.canEdit) {
        console.warn(`[PERMS] Edit access denied for module: ${moduleId}`);
        return res.status(403).json({ message: 'Acesso de edição negado' });
      }

      console.log(`[PERMS] Access granted for module: ${moduleId}`);
      next();
    } catch (error) {
      console.error(`[PERMS] Prisma failed for permissions of module ${moduleId}. Using user.permissions from session...`);
      
      // Fallback: Check permissions already attached to user object in authenticate()
      const userPerm = req.user.permissions?.find((p: any) => p.moduleId === moduleId || p.module?.id === moduleId);
      
      if (userPerm) {
        if (level === 'view' && userPerm.canView) return next();
        if (level === 'edit' && userPerm.canEdit) return next();
      }

      console.warn(`[PERMS] Fallback failed for module: ${moduleId}`);
      res.status(403).json({ message: 'Acesso negado (Erro de Permissão)' });
    }
  };
};
