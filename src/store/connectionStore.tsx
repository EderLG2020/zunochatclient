import { create } from "zustand";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting";

interface ConnectionState {
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
}

/**
 * Estado del socket WS, alimentado por websocket.service.ts. "reconnecting"
 * (vs. "connecting") distingue una caída DESPUÉS de haber estado conectado
 * — así el banner puede avisar "se perdió la conexión" en vez de mostrar
 * el mismo mensaje que al iniciar sesión.
 */
export const useConnectionStore = create<ConnectionState>()((set) => ({
  status: "connecting",
  setStatus: (status) => set({ status }),
}));
