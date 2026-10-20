import { Proveedor, Factura, Pago, Notificacion } from './modelos.js';
import { hoyISO, sumarDias } from './fechas.js';

const CLAVE = 'facturas-ia.datos.v1';

/**
 * Almacen: simula la base de datos. Guarda todo en localStorage del navegador.
 * En la etapa con backend real, esta clase se reemplaza por consultas a PostgreSQL desde n8n.
 */
export class Almacen {
  #datos;

  constructor() {
    this.#datos = this.#cargar() ?? Almacen.datosIniciales();
    this.guardar();
  }

  #cargar() {
    try {
      const crudo = localStorage.getItem(CLAVE);
      if (!crudo) return null;
      const d = JSON.parse(crudo);
      return {
        config: d.config,
        proveedores: d.proveedores.map((p) => new Proveedor(p)),
        facturas: d.facturas.map((f) => new Factura(f)),
        pagos: d.pagos.map((p) => new Pago(p)),
        notificaciones: d.notificaciones.map((n) => new Notificacion(n)),
        auditoria: d.auditoria ?? [],
        secuencias: d.secuencias,
      };
    } catch {
      return null;
    }
  }

  guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(this.#datos));
    } catch {
      /* sin almacenamiento disponible: los datos viven solo en memoria */
    }
  }

  reiniciar() {
    this.#datos = Almacen.datosIniciales();
    this.guardar();
  }

  get config() { return this.#datos.config; }
  get proveedores() { return this.#datos.proveedores; }
  get facturas() { return this.#datos.facturas; }
  get pagos() { return this.#datos.pagos; }
  get notificaciones() { return this.#datos.notificaciones; }

  siguienteId(tabla) {
    this.#datos.secuencias[tabla] = (this.#datos.secuencias[tabla] ?? 0) + 1;
    return this.#datos.secuencias[tabla];
  }

  auditar(facturaId, accion, actor = 'agente', detalle = {}) {
    this.#datos.auditoria.push({ facturaId, accion, actor, detalle, fecha: new Date().toISOString() });
  }

  /** Datos de demostración. Las fechas son relativas a hoy para que siempre haya vencimientos. */
  static datosIniciales() {
    const hoy = hoyISO();
    const proveedores = [
      new Proveedor({ id: 1, nombre: 'Papelería y Suministros Golfo Azul S.A.', identificacion: '3101000101', correo: 'ventas@golfoazul.example' }),
      new Proveedor({ id: 2, nombre: 'Distribuidora Agrícola Monteverde Ltda.', identificacion: '3102000202', correo: 'pedidos@monteverde-agricola.example' }),
      new Proveedor({ id: 3, nombre: 'Ferretería El Roble S.A.', identificacion: '3101000505', correo: 'facturas@ferroble.example' }),
      new Proveedor({ id: 4, nombre: 'Limpieza Integral del Pacífico S.A.', identificacion: '3101000707', correo: 'admin@limpiezaintegral.example' }),
      new Proveedor({ id: 5, nombre: 'Mantenimiento Industrial Brenes S.A.', identificacion: '3101000808', correo: 'cobros@mibrenes.example' }),
    ];
    const historial = [
      // [proveedorId, numero, días desde hoy, crédito, subtotal, estado]
      [1, '00100001010000000041', -150, 30, 120000, 'pagada'],
      [2, '00100001010000000187', -120, 15, 340000, 'pagada'],
      [3, '00100001010000000095', -95, 30, 210000, 'pagada'],
      [4, '00100001010000000331', -70, 30, 95000, 'pagada'],
      [5, '00100001010000000046', -45, 30, 88000, 'registrada'],
      [4, '00100001010000000359', -29, 30, 150000, 'registrada'],
      [2, '00100001010000000193', -25, 30, 410000, 'registrada'],
      [5, '00100001010000000118', -12, 15, 265000, 'aprobada'],
      [3, '00100001010000000120', -5, 30, 72000, 'registrada'],
      [5, '00100001010000000199', -2, 30, 620000, 'pendiente_aprobacion'],
    ];
    const facturas = [];
    const pagos = [];
    historial.forEach(([proveedorId, numero, desplazamiento, condicionDias, subtotal, estado], i) => {
      const id = i + 1;
      const impuestos = Math.round(subtotal * 0.13 * 100) / 100;
      const fechaEmision = sumarDias(hoy, desplazamiento);
      facturas.push(new Factura({ id, proveedorId, numero, fechaEmision, condicionDias, moneda: 'CRC', subtotal, impuestos, total: subtotal + impuestos, tasas: [13], estado }));
      const vence = sumarDias(fechaEmision, condicionDias);
      pagos.push(new Pago({ id, facturaId: id, fechaVencimiento: vence, estado: estado === 'pagada' ? 'pagado' : 'programado', pagadoEn: estado === 'pagada' ? sumarDias(vence, -2) : null }));
    });
    return {
      config: { empresa: 'Comercial Pacífico S.A.', umbralCRC: 500000, umbralUSD: 1000, diasRecordatorio: 3 },
      proveedores,
      facturas,
      pagos,
      notificaciones: [
        new Notificacion({ id: 1, canal: 'panel', destinatario: 'aprobador', asunto: 'Factura F-00010 requiere aprobación', mensaje: 'La factura 00100001010000000199 de Mantenimiento Industrial Brenes S.A. supera el umbral de aprobación.', facturaId: 10 }),
      ],
      auditoria: [],
      secuencias: { proveedores: proveedores.length, facturas: facturas.length, pagos: pagos.length, notificaciones: 1 },
    };
  }
}
