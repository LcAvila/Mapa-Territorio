import { Request, Response } from 'express';
import { VisitRouteService } from '../services/VisitRouteService';

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
    const { supervisorId, date, clientIds, startPoint, startLat, startLng } = req.body;
    console.log('[CREATE_MANUAL_ROUTE] Payload:', { supervisorId, date, clientIdsLength: clientIds?.length });
    
    if (!supervisorId || !date || !clientIds || !Array.isArray(clientIds)) {
      return res.status(400).json({ message: 'Dados incompletos para criação do roteiro.' });
    }
    const result = await visitService.createManualRoute({
      supervisorId: Number(supervisorId),
      date: new Date(date),
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

export const getRouteGeoJSON = async (req: Request, res: Response) => {
  try {
    const result = await visitService.getRouteGeoJSON(Number(req.params.id));
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
