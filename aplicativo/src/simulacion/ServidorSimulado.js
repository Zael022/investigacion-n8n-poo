import { Almacen } from './almacen.js';
import { ServicioProveedor, ServicioFactura, ServicioPago, Notificador } from './servicios.js';
import { AgenteOrquestadorSimulado } from './agente.js';
import { hoyISO, sumarDias, diasEntre } from './fechas.js';

/**
 * ServidorSimulado: reemplaza a n8n mientras no hay backend real.
 * Expone EXACTAMENTE los mismos métodos que ClienteN8n (src/api/n8nClient.js),
 * así las pantallas no saben si hablan con n8n o con la simulación (polimorfismo).
 */
export class ServidorSimulado {
  #almacen;
  #agente;
  #facturas;
  #pagos;
  #sessionId = crypto.randomUUID();

  constructor() {
    this.#construir();
  }

  #construir() {
    this.#almacen = new Almacen();
    const proveedores = new ServicioProveedor(this.#almacen);
    this.#facturas = new ServicioFactura(this.#almacen, proveedores);
    this.#pagos = new ServicioPago(this.#almacen, this.#facturas);
    const notificador = new Notificador(this.#almacen);
    this.#agente = new AgenteOrquestadorSimulado({ proveedores, facturas: this.#facturas, pagos: this.#pagos, notificador, almacen: this.#almacen });
  }

  get esSimulado() { return true; }
  /** Acceso para las subclases (ServidorConN8n) */
  get agente() { return this.#agente; }
  get servicioFacturas() { return this.#facturas; }
  get sessionId() { return this.#sessionId; }
  nuevaConversacion() { this.#sessionId = crypto.randomUUID(); return this.#sessionId; }

  /** Vuelve a los datos de demostración */
  reiniciarDatos() {
    this.#almacen.reiniciar();
    this.#construir();
  }

  // Latencia artificial para que la interfaz se comporte como con un servidor real
  #esperar(ms) { return new Promise((r) => setTimeout(r, ms)); }

  #resultado(respuesta) {
    if (!respuesta.ok) throw new Error(respuesta.error);
    return respuesta.data;
  }

  // ---------- Agente orquestador ----------
  async registrarFactura({ texto }) {
    await this.#esperar(900);
    if (!texto || texto.trim().length < 30) throw new Error('El texto de la factura está vacío o es muy corto.');
    const r = this.#agente.registrarFactura(texto);
    const factura = r.facturaId ? this.#facturas.vistaLista(this.#facturas.porId(r.facturaId)) : null;
    return { mensaje: r.mensaje, factura, requiere_aprobacion: factura?.estado === 'pendiente_aprobacion', tabla: null, pasos: r.pasos };
  }

  async preguntar(mensaje) {
    await this.#esperar(700);
    return this.#agente.preguntar(mensaje);
  }

  // ---------- API del panel (sin agente) ----------
  async resumen() {
    await this.#esperar(150);
    const hoy = hoyISO();
    const vistas = this.#almacen.facturas.filter((f) => f.estado !== 'borrador').map((f) => this.#facturas.vistaLista(f, hoy));
    const porPagar = vistas.filter((f) => ['registrada', 'aprobada', 'pendiente_aprobacion'].includes(f.estado));
    const semana = porPagar.filter((f) => f.dias_para_vencer !== null && f.dias_para_vencer >= 0 && f.dias_para_vencer <= 7);
    const meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - i));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const suma = (lista) => Math.round(lista.reduce((s, f) => s + f.total, 0) * 100) / 100;
    return {
      por_pagar_crc: suma(porPagar.filter((f) => f.moneda === 'CRC')),
      por_pagar_cantidad: porPagar.length,
      vence_semana_monto: suma(semana.filter((f) => f.moneda === 'CRC')),
      vence_semana_cantidad: semana.length,
      vencidas: porPagar.filter((f) => f.dias_para_vencer !== null && f.dias_para_vencer < 0).length,
      pendientes_aprobacion: vistas.filter((f) => f.estado === 'pendiente_aprobacion').length,
      por_mes: meses.map((mes) => ({ mes, total: suma(vistas.filter((f) => f.moneda === 'CRC' && f.estado !== 'rechazada' && f.fecha_emision.startsWith(mes))) })),
      notificaciones: [...this.#almacen.notificaciones].reverse().slice(0, 6).map((n) => ({ id: n.id, canal: n.canal, destinatario: n.destinatario, asunto: n.asunto, mensaje: n.mensaje, creado_en: n.creadoEn })),
    };
  }

  async listarFacturas({ q = '', estado = '' } = {}) {
    await this.#esperar(150);
    return this.#resultado(this.#facturas.consultar({ proveedor: q, estado })).facturas;
  }

  async aprobacionesPendientes() {
    await this.#esperar(150);
    const umbral = this.#almacen.config.umbralCRC;
    return this.#resultado(this.#facturas.consultar({ estado: 'pendiente_aprobacion' })).facturas.map((f) => ({ ...f, umbral }));
  }

  async decidirAprobacion(facturaId, decision, comentario = '') {
    await this.#esperar(300);
    const f = this.#facturas.porId(Number(facturaId));
    if (!f || f.estado !== 'pendiente_aprobacion') throw new Error('La factura no existe o ya no está pendiente de aprobación.');
    if (decision === 'rechazar' && comentario.trim().length < 5) throw new Error('Para rechazar escribí un comentario con el motivo.');
    f.cambiarEstado(decision === 'aprobar' ? 'aprobada' : 'rechazada');
    f.comentario = comentario;
    if (f.estado === 'rechazada') {
      const i = this.#almacen.pagos.findIndex((p) => p.facturaId === f.id);
      if (i >= 0) this.#almacen.pagos.splice(i, 1);
    }
    this.#almacen.auditar(f.id, 'aprobacion', 'humano', { decision, comentario });
    this.#almacen.guardar();
    return { id: f.id, codigo: f.codigo, estado: f.estado };
  }

  async marcarPagada(facturaId) {
    await this.#esperar(300);
    return this.#resultado(this.#pagos.marcarPagada(Number(facturaId)));
  }
}

// Utilidades expuestas solo para pruebas
export const _fechas = { hoyISO, sumarDias, diasEntre };
