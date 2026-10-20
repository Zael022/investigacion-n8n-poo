/**
 * Modelos del backend simulado.
 * Cada clase equivale a una "clase" de la investigación (WF_Proveedor, WF_Factura, WF_Pago, WF_Notificador)
 * y guarda su propio estado. Se convierten a objetos simples (toJSON) para guardarse en localStorage.
 */

export const TASAS_IVA_VALIDAS = [0, 1, 2, 4, 13]; // Costa Rica, Ley 9635

export class Proveedor {
  constructor({ id, nombre, identificacion = '', correo = '', creadoEn = new Date().toISOString() }) {
    this.id = id;
    this.nombre = nombre;
    this.identificacion = Proveedor.soloDigitos(identificacion);
    this.correo = correo;
    this.creadoEn = creadoEn;
  }

  static soloDigitos(valor) {
    return String(valor ?? '').replace(/\D/g, '');
  }

  /** Cédula física (9), jurídica (10) o DIMEX (11-12) */
  static cedulaValida(cedula) {
    return [9, 10, 11, 12].includes(Proveedor.soloDigitos(cedula).length);
  }

  toJSON() {
    return { id: this.id, nombre: this.nombre, identificacion: this.identificacion, correo: this.correo, creadoEn: this.creadoEn };
  }
}

/**
 * Factura: entidad con ciclo de vida.
 * borrador -> validada | rechazada -> registrada | pendiente_aprobacion -> aprobada | rechazada -> pagada
 */
export class Factura {
  static #TRANSICIONES = {
    borrador: ['validada', 'rechazada'],
    validada: ['registrada', 'pendiente_aprobacion'],
    rechazada: [],
    registrada: ['pagada'],
    pendiente_aprobacion: ['aprobada', 'rechazada'],
    aprobada: ['pagada'],
    pagada: [],
  };

  constructor(datos) {
    this.id = datos.id;
    this.proveedorId = datos.proveedorId;
    this.numero = String(datos.numero ?? '').trim();
    this.fechaEmision = datos.fechaEmision;
    this.condicionDias = Number.isInteger(datos.condicionDias) ? datos.condicionDias : 30;
    this.moneda = datos.moneda === 'USD' ? 'USD' : 'CRC';
    this.subtotal = Number(datos.subtotal) || 0;
    this.impuestos = Number(datos.impuestos) || 0;
    this.total = Number(datos.total) || 0;
    this.tasas = Array.isArray(datos.tasas) ? datos.tasas : [];
    this.estado = datos.estado ?? 'borrador';
    this.errores = datos.errores ?? [];
    this.advertencias = datos.advertencias ?? [];
    this.comentario = datos.comentario ?? '';
    this.creadoEn = datos.creadoEn ?? new Date().toISOString();
  }

  get codigo() {
    return 'F-' + String(this.id).padStart(5, '0');
  }

  get porPagar() {
    return ['registrada', 'aprobada', 'pendiente_aprobacion'].includes(this.estado);
  }

  /** Cambia de estado solo si la transición está permitida (encapsulamiento del ciclo de vida). */
  cambiarEstado(nuevo) {
    if (!Factura.#TRANSICIONES[this.estado]?.includes(nuevo)) {
      throw new Error(`La factura ${this.codigo} está "${this.estado}" y no puede pasar a "${nuevo}".`);
    }
    this.estado = nuevo;
  }

  toJSON() {
    const { id, proveedorId, numero, fechaEmision, condicionDias, moneda, subtotal, impuestos, total, tasas, estado, errores, advertencias, comentario, creadoEn } = this;
    return { id, proveedorId, numero, fechaEmision, condicionDias, moneda, subtotal, impuestos, total, tasas, estado, errores, advertencias, comentario, creadoEn };
  }
}

export class Pago {
  constructor({ id, facturaId, fechaVencimiento, estado = 'programado', recordatorioEnviado = false, pagadoEn = null }) {
    Object.assign(this, { id, facturaId, fechaVencimiento, estado, recordatorioEnviado, pagadoEn });
  }

  toJSON() {
    return { ...this };
  }
}

export class Notificacion {
  constructor({ id, canal, destinatario, asunto, mensaje, facturaId = null, creadoEn = new Date().toISOString() }) {
    Object.assign(this, { id, canal, destinatario, asunto, mensaje, facturaId, creadoEn });
  }

  toJSON() {
    return { ...this };
  }
}

/** Interfaz común de respuesta de todos los "métodos" (igual que en la investigación). */
export const Respuesta = {
  ok: (data) => ({ ok: true, data, error: null }),
  error: (error, data = null) => ({ ok: false, data, error }),
};
