import { RouteCycle, RouteCycleWeek, RouteSequence, RouteClientSnapshot, RouteAssignment } from '../types/routes';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const routePlanningService = {
  async createCycle(data: Partial<RouteCycle>): Promise<RouteCycle> {
    const res = await fetch(`${API_URL}/api/route-planning/cycles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Falha ao criar ciclo');
    return res.json();
  },

  async distributeClients(cycleId: number): Promise<{ total: number }> {
    const res = await fetch(`${API_URL}/api/route-planning/cycles/${cycleId}/distribute`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Falha ao distribuir clientes');
    return res.json();
  },

  async generateSequence(data: { cycleId: number; weekId: number; supervisorId: number }): Promise<RouteSequence> {
    const res = await fetch(`${API_URL}/api/route-planning/sequences`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Falha ao gerar sequência');
    return res.json();
  },

  async optimizeRoute(sequenceId: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_URL}/api/route-planning/sequences/${sequenceId}/optimize`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Falha ao otimizar rota');
    return res.json();
  }
};
