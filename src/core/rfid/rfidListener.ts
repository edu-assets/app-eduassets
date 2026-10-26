import { exchangeRfidLoginCode, fetchMe, getAuthSessionCapabilities } from '../api/auth.js';
import { setToken } from '../state/tokenStore.js';
import { isAutenticado } from '../state/authStore.js';
import { showToast } from '../ui/index.js';
import { API_BASE_URL } from '../api/apiConfig.js';

interface RfidLoginEvent {
  code?: string;
  token?: string;
  user?: { id: number; nome: string; login: string; nivelAcesso: 'ADMINISTRADOR' | 'EDITOR' };
}

const RECONECTAR_MS = 3000;

function construirUrlWs(cookieMode: boolean): string {
  if (API_BASE_URL) {
    const url = new URL(API_BASE_URL);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws/rfid';
    url.search = '';
    if (cookieMode) url.searchParams.set('auth', 'cookie');
    return url.toString();
  }

  const protocolo = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocolo}//${window.location.host}/ws/rfid${cookieMode ? '?auth=cookie' : ''}`;
}

function conectar(cookieMode: boolean): void {
  const ws = new WebSocket(construirUrlWs(cookieMode));

  ws.addEventListener('message', async (event) => {
    let dados: RfidLoginEvent;
    try {
      dados = JSON.parse(event.data);
    } catch {
      return;
    }

    if (isAutenticado() || (!dados.code && !dados.token)) return;

    try {
      if (dados.code) {
        await exchangeRfidLoginCode(dados.code);
      } else if (dados.token && !setToken(dados.token)) {
        throw new Error('Token RFID inválido ou expirado.');
      }
      await fetchMe();
      window.location.reload();
    } catch {
      setToken(null);
      showToast('Falha ao validar login por cartão.', 'error');
    }
  });

  ws.addEventListener('close', () => setTimeout(() => conectar(cookieMode), RECONECTAR_MS));
  ws.addEventListener('error', () => ws.close());
}

export function initRfidListener(): void {
  const habilitado = import.meta.env.VITE_RFID_BRIDGE_ENABLED === 'true';
  if (!habilitado) return;

  void getAuthSessionCapabilities()
    .then(({ cookieSession }) => conectar(cookieSession))
    .catch(() => conectar(false));
}
