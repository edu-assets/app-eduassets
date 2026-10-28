import { exchangeRfidLoginCode, fetchMe, getAuthSessionCapabilities } from '../api/auth.js';
import { isAutenticado } from '../state/authStore.js';
import { showToast } from '../ui/index.js';
import { API_BASE_URL } from '../api/apiConfig.js';

interface RfidLoginEvent {
  code?: string;
}

const RECONECTAR_MS = 3000;

function construirUrlWs(): string {
  if (API_BASE_URL) {
    const url = new URL(API_BASE_URL);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws/rfid';
    url.search = '';
    url.searchParams.set('auth', 'cookie');
    return url.toString();
  }

  const protocolo = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocolo}//${window.location.host}/ws/rfid?auth=cookie`;
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

    if (isAutenticado() || !dados.code) return;

    try {
      await exchangeRfidLoginCode(dados.code);
      await fetchMe();
      window.location.reload();
    } catch {
      showToast('Falha ao validar login por cartão.', 'error');
    }
  });

  ws.addEventListener('close', () => setTimeout(conectar, RECONECTAR_MS));
  ws.addEventListener('error', () => ws.close());
}

export function initRfidListener(): void {
  if (import.meta.env.VITE_RFID_BRIDGE_ENABLED !== 'true') return;

  void getAuthSessionCapabilities()
    .then(({ cookieSession }) => {
      if (cookieSession) conectar();
    })
    .catch(() => undefined);
}
