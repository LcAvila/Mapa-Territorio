import { Request, Response } from 'express';
import { VisitRouteService } from '../services/VisitRouteService';
import { AuthRequest } from '../middlewares/auth';
import { validateBody, updateVisitRouteSchema } from '../utils/validation';

const visitService = new VisitRouteService();

export const startRoute = async (req: Request, res: Response) => {
  try {
    const result = await visitService.startRoute(Number(req.params.id));
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const createManualRoute = async (req: Request, res: Response) => {
  try {
    const { supervisorId, date, name, semana, clientIds, startPoint, startLat, startLng } = req.body;
    console.log('[CREATE_MANUAL_ROUTE] Payload:', { supervisorId, date, semana, clientIdsLength: clientIds?.length });
    
    if (!supervisorId || !date || !clientIds || !Array.isArray(clientIds)) {
      return res.status(400).json({ message: 'Dados incompletos para criação do roteiro.' });
    }
    const result = await visitService.createManualRoute({
      supervisorId: Number(supervisorId),
      date: new Date(date),
      name: name ? String(name) : undefined,
      semana: semana ? String(semana) : undefined,
      clientIds: clientIds.map(Number),
      startPoint,
      startLat: startLat ? Number(startLat) : undefined,
      startLng: startLng ? Number(startLng) : undefined
    });
    res.status(201).json(result);
  } catch (error: any) {
    console.error('[CREATE_MANUAL_ROUTE] Error:', error);
    res.status(400).json({ message: error.message });
  }
};

export const checkin = async (req: Request, res: Response) => {
  try {
    const result = await visitService.checkin(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getSequence = async (req: Request, res: Response) => {
  try {
    const result = await visitService.getSequence(Number(req.params.id));
    if (!result) return res.status(404).json({ message: 'Roteiro não encontrado' });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    const result = await visitService.getSummary(userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const checkout = async (req: Request, res: Response) => {
  try {
    const result = await visitService.checkout(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const registerResult = async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user; // Assumindo que o middleware de auth coloca o user no req
    const result = await visitService.registerResult({ ...req.body, userId });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getSuggestions = async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;
    const targetUserId = req.query.userId ? Number(req.query.userId) : userId;
    const result = await visitService.getSuggestions(targetUserId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getRouteDetails = async (req: Request, res: Response) => {
  try {
    const result = await visitService.getRouteDetails(Number(req.params.id));
    res.json(result);
  } catch (error: any) {
    const status = error.message?.includes('não encontrado') ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
};

export const getRouteGeoJSON = async (req: Request, res: Response) => {
  try {
    const result = await visitService.getRouteGeoJSON(Number(req.params.id));
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateRoute = async (req: AuthRequest, res: Response) => {
  try {
    const validation = validateBody(updateVisitRouteSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error });
    }

    const actor = req.user;
    if (!actor?.id) {
      return res.status(401).json({ message: 'Usuário não autenticado.' });
    }

    const { name, route_date, semana } = validation.data;
    const result = await visitService.updateRoute(
      Number(req.params.id),
      {
        ...(name !== undefined ? { name } : {}),
        ...(route_date !== undefined ? { route_date: new Date(route_date) } : {}),
        ...(semana !== undefined ? { semana } : {}),
      },
      { id: Number(actor.id), role: String(actor.role || '') }
    );

    res.json({
      id: result.id,
      name: result.name?.trim() || `Roteiro #${result.id}`,
      date: (result.route_date || result.created_at).toISOString().split('T')[0],
      semana: result.semana,
      status: result.optimization_status,
    });
  } catch (error: any) {
    const status = error.message?.includes('permissão') ? 403 : 400;
    res.status(status).json({ message: error.message });
  }
};

export const deleteRoute = async (req: AuthRequest, res: Response) => {
  try {
    const actor = req.user;
    if (!actor?.id) {
      return res.status(401).json({ message: 'Usuário não autenticado.' });
    }

    const result = await visitService.deleteRoute(
      Number(req.params.id),
      { id: Number(actor.id), role: String(actor.role || '') }
    );
    res.json(result);
  } catch (error: any) {
    const status = error.message?.includes('permissão') ? 403
      : error.message?.includes('não encontrado') ? 404
      : 400;
    res.status(status).json({ message: error.message });
  }
};
