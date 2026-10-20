import { ServidorSimulado } from './ServidorSimulado.js';

/**
 * ServidorConN8n: HEREDA de ServidorSimulado y redefine (polimorfismo) las dos operaciones
 * que necesitan inteligencia artificial: registrar una factura y responder preguntas.
 * Esas dos operaciones las hace el AI Agent de n8n con Groq. Los datos se siguen guardando
 * en el navegador, porque el backend con base de datos todavía no está construido.
 */
export class ServidorConN8n extends ServidorSimulado {
  #url;

  constructor(url = '/api/facturas') {
    super();
    this.#url = url;
  }

  get esSimulado() { return false; }

  async #llamarAgente(cuerpo) {
    let res;
    try {
      res = await fetch(this.#url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...cuerpo, session_id: this.sessionId }) });
    } catch {
      throw new Error('No se pudo conectar con n8n. ¿Está corriendo "npx n8n"?');
    }
    if (res.status === 404) throw new Error('n8n no encontró el webhook "facturas". Revisá que el workflow esté publicado.');
    const texto = await res.text();
    let json = null;
    try { json = JSON.parse(texto); } catch { /* respuesta no JSON */ }
    if (!json) throw new Error('n8n respondió algo inesperado: ' + texto.slice(0, 160));
    if (!json.ok) throw new Error(json.error || 'El agente de n8n devolvió un error.');
    return json.data;
  }

  async registrarFactura({ texto }) {
    if (!texto || texto.trim().length < 30) throw new Error('El texto de la factura está vacío o es muy corto.');
    const r = await this.#llamarAgente({ accion: 'registrar', texto_factura: texto });
    const d = r.datos ?? {};
    // El agente de IA extrajo los datos; el sistema los registra y vuelve a validar con reglas fijas.
    const datos = {
      emisor: d.emisor, identificacion: d.identificacion ?? '', correo: d.correo ?? '', numero: d.numero,
      fechaEmision: d.fecha_emision, condicionDias: Number.isInteger(Number(d.condicion_dias)) ? Number(d.condicion_dias) : 30,
      moneda: d.moneda === 'USD' ? 'USD' : 'CRC', subtotal: Number(d.subtotal), impuestos: Number(d.impuestos ?? 0),
      tasas: Array.isArray(d.tasas) ? d.tasas.map(Number) : [], total: Number(d.total),
    };
    const pasosN8n = (r.pasos ?? []).map((p) => ({ herramienta: 'n8n: ' + p.herramienta, ok: p.ok, error: p.error }));
    const local = this.agente.registrarDesdeDatos(datos, [{ herramienta: 'n8n: AI Agent (Groq)', ok: true, error: null }, ...pasosN8n]);
    const factura = local.facturaId ? this.servicioFacturas.vistaLista(this.servicioFacturas.porId(local.facturaId)) : null;
    const mensaje = (r.mensaje ? 'Agente de IA (n8n): ' + r.mensaje + '\n\n' : '') + 'Sistema: ' + local.mensaje;
    return { mensaje, factura, requiere_aprobacion: factura?.estado === 'pendiente_aprobacion', tabla: null, pasos: local.pasos };
  }

  async preguntar(mensaje) {
    const contexto = this.servicioFacturas.consultar({}).data.facturas.map((f) => ({
      codigo: f.codigo, proveedor: f.proveedor, numero: f.numero, emitida: f.fecha_emision, total: f.total,
      moneda: f.moneda, estado: f.estado, vence: f.vence, dias_para_vencer: f.dias_para_vencer,
    }));
    const r = await this.#llamarAgente({ accion: 'chat', mensaje, contexto });
    // La tabla se arma con datos del sistema (no del modelo), usando la misma consulta del agente local.
    const tabla = this.agente.preguntar(mensaje).tabla;
    return { mensaje: r.mensaje, tabla, pasos: [{ herramienta: 'n8n: AI Agent (Groq)', ok: true, error: null }, ...(r.pasos ?? []).map((p) => ({ ...p, herramienta: 'n8n: ' + p.herramienta }))] };
  }
}
