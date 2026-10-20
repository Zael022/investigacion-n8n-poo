/**
 * ClienteN8n: única puerta del front end hacia n8n.
 *
 * - Encapsula las URLs de los webhooks y el formato de la interfaz común
 *   { ok, data, error } que devuelven TODOS los workflows.
 * - El navegador llama a /api/...; el servidor de Vite agrega la API key
 *   y reenvía a http://localhost:5678/webhook/... (ver vite.config.js).
 */
export class ErrorN8n extends Error {
  constructor(mensaje, { status = null, detalle = null } = {}) {
    super(mensaje);
    this.name = 'ErrorN8n';
    this.status = status;
    this.detalle = detalle;
  }
}

export class ClienteN8n {
  #base;
  #sessionId;

  constructor(base = '/api') {
    this.#base = base;
    this.#sessionId = ClienteN8n.#leerSesion();
  }

  // ---------- Sesión de chat (la memoria del agente se guarda por session_id) ----------
  static #leerSesion() {
    try {
      const guardada = sessionStorage.getItem('facturas.session_id');
      if (guardada) return guardada;
    } catch {
      /* sessionStorage no disponible */
    }
    return ClienteN8n.#nuevaSesionId();
  }

  static #nuevaSesionId() {
    const id = crypto.randomUUID();
    try {
      sessionStorage.setItem('facturas.session_id', id);
    } catch {
      /* ignorar */
    }
    return id;
  }

  get sessionId() {
    return this.#sessionId;
  }

  nuevaConversacion() {
    this.#sessionId = ClienteN8n.#nuevaSesionId();
    return this.#sessionId;
  }

  // ---------- Petición genérica ----------
  async #pedir(ruta, { method = 'GET', body, query } = {}) {
    const qs = query ? '?' + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '' && v != null)) : '';
    let res;
    try {
      res = await fetch(`${this.#base}/${ruta}${qs}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ErrorN8n('No se pudo conectar con el servidor. ¿Está corriendo "npm run dev"?');
    }

    const texto = await res.text();
    let json = null;
    try {
      json = texto ? JSON.parse(texto) : null;
    } catch {
      /* respuesta no JSON */
    }

    if (res.status === 403 || res.status === 401) {
      throw new ErrorN8n('n8n rechazó la API key. Revisá N8N_WEBHOOK_API_KEY en el archivo .env y reiniciá "npm run dev".', { status: res.status });
    }
    if (res.status === 404) {
      throw new ErrorN8n('El webhook no existe o el workflow no está publicado en n8n. Revisá el paso de importación del README.', { status: 404 });
    }
    if (res.status >= 500 && !json) {
      throw new ErrorN8n('n8n no está disponible (¿está corriendo Docker?).', { status: res.status });
    }
    if (!json || typeof json.ok !== 'boolean') {
      throw new ErrorN8n('Respuesta inesperada de n8n.', { status: res.status, detalle: texto.slice(0, 300) });
    }
    if (!json.ok) {
      throw new ErrorN8n(json.error || 'Ocurrió un error.', { status: res.status, detalle: json.data });
    }
    return json.data;
  }

  // ---------- Agente orquestador ----------
  registrarFactura({ texto, nombreArchivo = '', nota = '' }) {
    return this.#pedir('facturas', {
      method: 'POST',
      body: {
        accion: 'registrar',
        texto_factura: texto,
        nombre_archivo: nombreArchivo,
        mensaje: nota,
        // Cada factura usa su propia sesión para no mezclar contexto
        session_id: crypto.randomUUID(),
      },
    });
  }

  preguntar(mensaje) {
    return this.#pedir('facturas', {
      method: 'POST',
      body: { accion: 'chat', mensaje, session_id: this.#sessionId },
    });
  }

  // ---------- API del panel (sin IA) ----------
  resumen() {
    return this.#pedir('panel/resumen');
  }

  listarFacturas({ q = '', estado = '' } = {}) {
    return this.#pedir('panel/facturas', { query: { q, estado } });
  }

  aprobacionesPendientes() {
    return this.#pedir('panel/aprobaciones');
  }

  decidirAprobacion(facturaId, decision, comentario = '') {
    return this.#pedir('panel/aprobaciones/decidir', {
      method: 'POST',
      body: { factura_id: facturaId, decision, comentario },
    });
  }

  marcarPagada(facturaId) {
    return this.#pedir('panel/pagos/marcar', { method: 'POST', body: { factura_id: facturaId } });
  }
}

// ---------------------------------------------------------------------------
// Instancia única compartida por toda la aplicación.
// Mientras no hay backend real se usa ServidorSimulado, que tiene los mismos métodos
// que ClienteN8n. Para conectar n8n más adelante basta con cambiar esta línea por:
//   export const n8n = new ClienteN8n();
// ---------------------------------------------------------------------------
import { ServidorSimulado } from '../simulacion/ServidorSimulado.js';

export const n8n = new ServidorSimulado();
