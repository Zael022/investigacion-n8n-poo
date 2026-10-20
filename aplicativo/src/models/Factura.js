import { formatearMonto, formatearFecha } from '../lib/formato.js';

/**
 * Clase Factura del lado del cliente.
 * Es el "espejo" del objeto Factura que manejan los workflows WF_Factura_* en n8n:
 * mismos campos y mismo ciclo de vida (estado). Encapsula las reglas de
 * presentación para que los componentes no repitan lógica.
 */
export class Factura {
  // Ciclo de vida: cada estado sabe su etiqueta y su tono visual
  static ESTADOS = {
    borrador: { etiqueta: 'Borrador', tono: 'gris' },
    validada: { etiqueta: 'Validada', tono: 'cielo' },
    rechazada: { etiqueta: 'Rechazada', tono: 'teja' },
    registrada: { etiqueta: 'Registrada', tono: 'pino' },
    pendiente_aprobacion: { etiqueta: 'Pendiente de aprobación', tono: 'ambar' },
    aprobada: { etiqueta: 'Aprobada', tono: 'pino' },
    pagada: { etiqueta: 'Pagada', tono: 'gris' },
  };

  constructor(datos = {}) {
    this.id = datos.id ?? null;
    this.codigo = datos.codigo ?? '';
    this.numero = datos.numero ?? '';
    this.proveedor = datos.proveedor ?? '';
    this.identificacion = datos.identificacion ?? '';
    this.fechaEmision = datos.fecha_emision ?? null;
    this.condicionDias = datos.condicion_dias ?? null;
    this.moneda = datos.moneda ?? 'CRC';
    this.subtotal = Factura.#numero(datos.subtotal);
    this.impuestos = Factura.#numero(datos.impuestos);
    this.total = Factura.#numero(datos.total);
    this.estado = datos.estado ?? 'borrador';
    this.vence = datos.vence ?? datos.fecha_vencimiento ?? null;
    this.errores = Array.isArray(datos.errores) ? datos.errores : [];
    this.advertencias = Array.isArray(datos.advertencias) ? datos.advertencias : [];
  }

  // Método privado: los montos pueden llegar como texto desde PostgreSQL
  static #numero(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  static desdeApi(datos) {
    return datos instanceof Factura ? datos : new Factura(datos);
  }

  static lista(arreglo) {
    return (arreglo ?? []).map((d) => Factura.desdeApi(d));
  }

  get totalFormateado() {
    return formatearMonto(this.total, this.moneda);
  }

  get subtotalFormateado() {
    return formatearMonto(this.subtotal, this.moneda);
  }

  get impuestosFormateados() {
    return formatearMonto(this.impuestos, this.moneda);
  }

  get fechaEmisionFormateada() {
    return formatearFecha(this.fechaEmision);
  }

  get venceFormateado() {
    return formatearFecha(this.vence);
  }

  get estaPaga() {
    return this.estado === 'pagada';
  }

  get esPagable() {
    return ['registrada', 'aprobada'].includes(this.estado);
  }

  /** Días que faltan para el vencimiento (negativo = vencida). null si no hay pago programado. */
  get diasParaVencer() {
    if (!this.vence) return null;
    const [a, m, d] = this.vence.slice(0, 10).split('-').map(Number);
    const vence = new Date(a, m - 1, d);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.round((vence - hoy) / 86_400_000);
  }

  get estaVencida() {
    return !this.estaPaga && this.estado !== 'rechazada' && this.diasParaVencer !== null && this.diasParaVencer < 0;
  }

  get etiquetaEstado() {
    return Factura.ESTADOS[this.estado]?.etiqueta ?? this.estado;
  }

  get tonoEstado() {
    if (this.estaVencida) return 'teja';
    return Factura.ESTADOS[this.estado]?.tono ?? 'gris';
  }

  get textoVencimiento() {
    const d = this.diasParaVencer;
    if (d === null || this.estaPaga || this.estado === 'rechazada') return null;
    if (d < 0) return `Vencida hace ${-d} ${-d === 1 ? 'día' : 'días'}`;
    if (d === 0) return 'Vence hoy';
    return `Vence en ${d} ${d === 1 ? 'día' : 'días'}`;
  }
}
