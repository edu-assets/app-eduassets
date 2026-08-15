import { fetchMe } from '../api/auth.js';
import { setToken } from '../state/tokenStore.js';
import { isAutenticado } from '../state/authStore.js';
import { showToast } from '../ui/index.js';

interface RfidLoginEvent {
  token: string;
  user: { id: number; nome: string; login: string; nivelAcesso: 'ADMINISTRADOR' | 'EDITOR' };
}

const RECONECTAR_MS = 3000;

function construirUrlWs(): string {
  const protocolo = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocolo}//${window.location.host}/ws/rfid`;
}

function conectar(): void {
  const ws = new WebSocket(construirUrlWs());

  ws.addEventListener('message', async (event) => {
    let dados: RfidLoginEvent;
    try {
      dados = JSON.parse(event.data);
    } catch {
      return;
    }

    if (isAutenticado()) return; 

    setToken(dados.token);
    try {
      await fetchMe();
      window.location.reload(); 
    } catch {
      setToken(null);
      showToast('Falha ao validar login por cartão.', 'error');
    }
  });

  ws.addEventListener('close', () => setTimeout(conectar, RECONECTAR_MS));
  ws.addEventListener('error', () => ws.close());
}

export function initRfidListener(): void {
  conectar();
}