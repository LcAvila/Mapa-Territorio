import { Request, Response } from 'express';
import { RoutePlanningService } from '../services/route-planning.service';
import { validateBody, createCycleSchema } from '../utils/validation';

const planningService = new RoutePlanningService();

export const createCycle = async (req: Request, res: Response) => {
  try {
    console.log('[ROUTE_PLANNING] Request Body:', JSON.stringify(req.body, null, 2));
    
    const validation = validateBody(createCycleSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({ message: 'Dados inválidos', details: validation.error });
    }

    const cycle = await planningService.createCycle(req.body);
    res.status(201).json(cycle);
  } catch (error: any) {
    console.error('[ROUTE_PLANNING] Error creating cycle:', error);
    res.status(400).json({ message: error.message });
  }
};

export const getSummary = async (req: Request, res: Response) => {
  try {
    const summary = await planningService.getSummary();
    res.json(summary);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const distributeClients = async (req: Request, res: Response) => {
  try {
    const result = await planningService.distributeClients(Number(req.params.id));
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const generateSequence = async (req: Request, res: Response) => {
  try {
    const { cycleId, weekId, supervisorId } = req.body;
    const sequence = await planningService.generateSequence(cycleId, weekId, supervisorId);
    res.json(sequence);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const optimizeRoute = async (req: Request, res: Response) => {
  try {
    const result = await planningService.optimizeRoute(Number(req.params.id));
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
