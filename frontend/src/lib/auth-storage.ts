export type StoredAuthData = {
    token: string | null;
    role: string | null;
    userId: number | null;
    userName: string | null;
    tipo: string | null;
    estado_end: string | null;
    assigned_state: string | null;
    assigned_states: string[];
    defaultWorkspace: string | null;
    inactivityLimit: number | null;
    tokenVersion: number | null;
  };
  
  const AUTH_KEYS = [
    'token',
    'role',
    'userId',
    'userName',
    'tipo',
    'estado_end',
    'assigned_state',
    'assigned_states',
    'defaultWorkspace',
    'inactivityLimit',
    'tokenVersion',
    'lastActivityTime',
  ] as const;
  
  export function readStoredAuth(): StoredAuthData {
    const assignedStatesRaw = localStorage.getItem('assigned_states');
  
    return {
      token: localStorage.getItem('token'),
      role: localStorage.getItem('role'),
      userId: localStorage.getItem('userId')
        ? Number(localStorage.getItem('userId'))
        : null,
      userName: localStorage.getItem('userName'),
      tipo: localStorage.getItem('tipo'),
      estado_end: localStorage.getItem('estado_end'),
      assigned_state: localStorage.getItem('assigned_state'),
      assigned_states: assignedStatesRaw ? JSON.parse(assignedStatesRaw) : [],
      defaultWorkspace: localStorage.getItem('defaultWorkspace'),
      inactivityLimit: localStorage.getItem('inactivityLimit')
        ? Number(localStorage.getItem('inactivityLimit'))
        : null,
      tokenVersion: localStorage.getItem('tokenVersion')
        ? Number(localStorage.getItem('tokenVersion'))
        : null,
    };
  }
  
  type PersistAuthInput = Partial<StoredAuthData> & {
    token: string;
    role: string;
    userId: number;
  };
  
  export function persistAuth(data: PersistAuthInput) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('userId', String(data.userId));
    localStorage.setItem('lastActivityTime', Date.now().toString());
  
    data.userName != null
      ? localStorage.setItem('userName', data.userName)
      : localStorage.removeItem('userName');
  
    data.tipo != null
      ? localStorage.setItem('tipo', data.tipo)
      : localStorage.removeItem('tipo');
  
    data.estado_end != null
      ? localStorage.setItem('estado_end', data.estado_end)
      : localStorage.removeItem('estado_end');
  
    data.assigned_state != null
      ? localStorage.setItem('assigned_state', data.assigned_state)
      : localStorage.removeItem('assigned_state');
  
    localStorage.setItem(
      'assigned_states',
      JSON.stringify(data.assigned_states ?? [])
    );
  
    data.defaultWorkspace != null
      ? localStorage.setItem('defaultWorkspace', data.defaultWorkspace)
      : localStorage.removeItem('defaultWorkspace');
  
    data.inactivityLimit != null
      ? localStorage.setItem('inactivityLimit', String(data.inactivityLimit))
      : localStorage.removeItem('inactivityLimit');
  
    data.tokenVersion != null
      ? localStorage.setItem('tokenVersion', String(data.tokenVersion))
      : localStorage.removeItem('tokenVersion');
  }
  
  export function clearStoredAuth() {
    AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
  }
  
  export function touchLastActivity() {
    localStorage.setItem('lastActivityTime', Date.now().toString());
  }
  
  export function getLastActivityTime() {
    return localStorage.getItem('lastActivityTime');
  }