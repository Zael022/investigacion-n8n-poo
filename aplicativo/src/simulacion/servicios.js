import { Proveedor, Factura, Pago, Notificacion, Respuesta, TASAS_IVA_VALIDAS } from './modelos.js';
import { hoyISO, sumarDias, diasEntre } from './fechas.js';

/*
 * Servicios = los "métodos" de cada clase de la investigación.
 * En n8n cada uno sería un sub-workflow (WF_<Clase>_<Método>). Aquí son métodos de clases JavaScript.
 * Todos devuelven la interfaz común { ok, data, error }.
 */

const normalizar = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export class ServicioProveedor {
  constructor(almacen) { this.almacen = almacen; }

  /** WF_Proveedor_Buscar: coincidencia exacta por cédula o aproximada por nombre */
  buscar(texto) {
    const cedula = Proveedor.soloDigitos(texto);
    const lista = this.almacen.proveedores;
    let encontrado = cedula.length >= 9 ? lista.find((p) => p.identificacion === cedula) : null;
    if (!encontrado && normalizar(texto).length >= 4) {
      const t = normalizar(texto);
      encontrado = lista.find((p) => normalizar(p.nombre).includes(t) || t.includes(normalizar(p.nombre)));
    }
    return Respuesta.ok({ encontrado: !!encontrado, proveedor: encontrado?.toJSON() ?? null });
  }

  /** WF_Proveedor_Registrar: constructor con validación; no duplica cédulas */
  registrar({ nombre, identificacion, correo = '' }) {
    const errores = [];
    if (!nombre || nombre.trim().length < 3) errores.push('El nombre del proveedor es obligatorio.');
    if (identificacion && !Proveedor.cedulaValida(identificacion)) errores.push(`La cédula "${identificacion}" no es válida.`);
    if (errores.length) return Respuesta.error(errores.join(' '));
    const existente = this.almacen.proveedores.find((p) => p.identificacion && p.identificacion === Proveedor.soloDigitos(identificacion));
    if (existente) return Respuesta.ok({ proveedor: existente.toJSON(), nuevo: false });
    const proveedor = new Proveedor({ id: this.almacen.siguienteId('proveedores'), nombre: nombre.trim(), identificacion, correo });
    this.almacen.proveedores.push(proveedor);
    this.almacen.guardar();
    return Respuesta.ok({ proveedor: proveedor.toJSON(), nuevo: true });
  }

  porId(id) { return this.almacen.proveedores.find((p) => p.id === id); }
}

export class ServicioFactura {
  constructor(almacen, proveedores) {
    this.almacen = almacen;
    this.proveedores = proveedores;
  }

  porId(id) { return this.almacen.facturas.find((f) => f.id === id); }

  /** WF_Factura_Crear: constructor; estado borrador */
  crear(datos) {
    const faltan = ['proveedorId', 'numero', 'fechaEmision', 'subtotal', 'total'].filter((k) => datos[k] === null || datos[k] === undefined || datos[k] === '');
    if (faltan.length) return Respuesta.error('Faltan datos obligatorios: ' + faltan.join(', '), { faltan });
    if (!this.proveedores.porId(datos.proveedorId)) return Respuesta.error('El proveedor no existe.');
    const factura = new Factura({ ...datos, id: this.almacen.siguienteId('facturas'), estado: 'borrador' });
    this.almacen.facturas.push(factura);
    this.almacen.auditar(factura.id, 'crear');
    this.almacen.guardar();
    return Respuesta.ok({ factura: factura.toJSON() });
  }

  /** WF_Factura_Validar: reglas deterministas. La IA no decide si una factura es válida. */
  validar(facturaId) {
    const f = this.porId(facturaId);
    if (!f) return Respuesta.error('No existe esa factura.');
    if (!['borrador', 'validada', 'rechazada'].includes(f.estado)) return Respuesta.error(`La factura ya está "${f.estado}".`);
    const errores = [];
    const advertencias = [];
    const prov = this.proveedores.porId(f.proveedorId);
    const tolerancia = f.moneda === 'USD' ? 0.05 : 1;
    const suma = Math.round((f.subtotal + f.impuestos) * 100) / 100;
    const fmt = (n) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: f.moneda }).format(n);

    if (!(f.total > 0)) errores.push('El total debe ser mayor que cero.');
    if (Math.abs(suma - f.total) > tolerancia) {
      errores.push(`La suma no cuadra: subtotal ${fmt(f.subtotal)} + IVA ${fmt(f.impuestos)} = ${fmt(suma)}, pero el total dice ${fmt(f.total)}.`);
    }
    for (const t of f.tasas) {
      if (!TASAS_IVA_VALIDAS.includes(t)) advertencias.push(`Tarifa de IVA inusual: ${t} %.`);
    }
    const hoy = hoyISO();
    if (f.fechaEmision > hoy) errores.push(`La fecha de emisión (${f.fechaEmision}) está en el futuro.`);
    else if (diasEntre(f.fechaEmision, hoy) > 365) advertencias.push('La factura tiene más de un año de emitida.');
    if (!prov?.identificacion) advertencias.push('El proveedor no tiene cédula registrada.');
    else if (!Proveedor.cedulaValida(prov.identificacion)) errores.push('La cédula del proveedor no es válida.');
    const duplicada = this.almacen.facturas.some((o) => o.id !== f.id && o.proveedorId === f.proveedorId && o.numero === f.numero && !['borrador', 'rechazada'].includes(o.estado));
    if (duplicada) errores.push(`Ya existe una factura registrada con el número ${f.numero} de este proveedor.`);

    const valida = errores.length === 0;
    f.errores = errores;
    f.advertencias = advertencias;
    f.estado = valida ? 'validada' : 'rechazada';
    this.almacen.auditar(f.id, 'validar', 'sistema', { valida });
    this.almacen.guardar();
    return Respuesta.ok({ valida, errores, advertencias });
  }

  /** WF_Factura_Guardar: aplica la regla de aprobación (umbral) */
  guardar(facturaId) {
    const f = this.porId(facturaId);
    if (!f) return Respuesta.error('No existe esa factura.');
    if (f.estado !== 'validada') return Respuesta.error(`Solo se guardan facturas validadas; esta está "${f.estado}".`);
    const umbral = f.moneda === 'USD' ? this.almacen.config.umbralUSD : this.almacen.config.umbralCRC;
    const requiereAprobacion = f.total > umbral;
    f.cambiarEstado(requiereAprobacion ? 'pendiente_aprobacion' : 'registrada');
    this.almacen.auditar(f.id, 'guardar', 'sistema', { estado: f.estado });
    this.almacen.guardar();
    return Respuesta.ok({ factura: f.toJSON(), requiereAprobacion });
  }

  /** WF_Factura_Consultar: filtros fijos (el agente nunca escribe consultas libres) */
  consultar({ proveedor = '', estado = '', venceEnDias = null } = {}) {
    const hoy = hoyISO();
    const lista = this.almacen.facturas
      .filter((f) => f.estado !== 'borrador')
      .filter((f) => {
        if (!estado) return true;
        if (estado === 'por_pagar') return f.porPagar;
        return f.estado === estado;
      })
      .filter((f) => {
        if (!proveedor) return true;
        const p = this.proveedores.porId(f.proveedorId);
        return normalizar(p?.nombre).includes(normalizar(proveedor)) || p?.identificacion === Proveedor.soloDigitos(proveedor) || normalizar(f.numero).includes(normalizar(proveedor)) || normalizar(f.codigo).includes(normalizar(proveedor));
      })
      .map((f) => this.vistaLista(f, hoy))
      .filter((v) => venceEnDias === null || (v.dias_para_vencer !== null && v.dias_para_vencer <= venceEnDias))
      .sort((a, b) => (b.fecha_emision.localeCompare(a.fecha_emision)) || b.id - a.id);
    const totales = {};
    for (const f of lista) totales[f.moneda] = Math.round(((totales[f.moneda] ?? 0) + f.total) * 100) / 100;
    return Respuesta.ok({ cantidad: lista.length, totales, facturas: lista });
  }

  vistaLista(f, hoy = hoyISO()) {
    const p = this.proveedores.porId(f.proveedorId);
    const pago = this.almacen.pagos.find((x) => x.facturaId === f.id);
    return {
      id: f.id, codigo: f.codigo, numero: f.numero, proveedor: p?.nombre ?? '—', identificacion: p?.identificacion ?? '',
      fecha_emision: f.fechaEmision, condicion_dias: f.condicionDias, moneda: f.moneda,
      subtotal: f.subtotal, impuestos: f.impuestos, total: f.total, estado: f.estado,
      errores: f.errores, advertencias: f.advertencias,
      vence: pago?.fechaVencimiento ?? null,
      dias_para_vencer: pago && pago.estado === 'programado' ? diasEntre(hoy, pago.fechaVencimiento) : null,
    };
  }
}

export class ServicioPago {
  constructor(almacen, facturas) {
    this.almacen = almacen;
    this.facturas = facturas;
  }

  /** WF_Pago_Programar: vencimiento = emisión + días de crédito */
  programar(facturaId) {
    const f = this.facturas.porId(facturaId);
    if (!f || !f.porPagar) return Respuesta.error('Solo se programan pagos de facturas guardadas.');
    let pago = this.almacen.pagos.find((p) => p.facturaId === facturaId);
    const vence = sumarDias(f.fechaEmision, f.condicionDias);
    if (!pago) {
      pago = new Pago({ id: this.almacen.siguienteId('pagos'), facturaId, fechaVencimiento: vence });
      this.almacen.pagos.push(pago);
    } else {
      pago.fechaVencimiento = vence;
    }
    this.almacen.guardar();
    return Respuesta.ok({ pago: pago.toJSON(), diasRestantes: diasEntre(hoyISO(), vence) });
  }

  marcarPagada(facturaId) {
    const f = this.facturas.porId(facturaId);
    if (!f || !['registrada', 'aprobada'].includes(f.estado)) return Respuesta.error('Solo se pueden marcar como pagadas facturas registradas o aprobadas.');
    f.cambiarEstado('pagada');
    const pago = this.almacen.pagos.find((p) => p.facturaId === facturaId);
    if (pago) { pago.estado = 'pagado'; pago.pagadoEn = new Date().toISOString(); }
    this.almacen.auditar(f.id, 'pago', 'humano');
    this.almacen.guardar();
    return Respuesta.ok({ id: f.id, codigo: f.codigo, estado: f.estado });
  }
}

/* ---------- Notificador: polimorfismo real con herencia ---------- */

export class CanalNotificacion {
  get nombre() { throw new Error('Cada canal debe definir su nombre'); }
  /** Cada canal prepara el mensaje a su manera */
  preparar(asunto, mensaje) { throw new Error('Cada canal debe implementar preparar()'); }
}

export class CanalPanel extends CanalNotificacion {
  get nombre() { return 'panel'; }
  preparar(asunto, mensaje) { return { asunto, mensaje }; }
}

export class CanalEmail extends CanalNotificacion {
  get nombre() { return 'email'; }
  preparar(asunto, mensaje) { return { asunto: '[Facturas] ' + asunto, mensaje: mensaje + '\n\n— Asistente de Facturas (envío simulado)' }; }
}

export class CanalSlack extends CanalNotificacion {
  get nombre() { return 'slack'; }
  preparar(asunto, mensaje) { return { asunto: '*' + asunto + '*', mensaje: mensaje + ' (envío simulado)' }; }
}

export class Notificador {
  #canales = new Map();

  constructor(almacen) {
    this.almacen = almacen;
    for (const c of [new CanalPanel(), new CanalEmail(), new CanalSlack()]) this.#canales.set(c.nombre, c);
  }

  /** WF_Notificador_Notificar: mismo contrato, distinta implementación según el canal */
  notificar({ canal = 'panel', destinatario, asunto, mensaje, facturaId = null }) {
    const implementacion = this.#canales.get(canal) ?? this.#canales.get('panel');
    const preparado = implementacion.preparar(asunto, mensaje);
    const n = new Notificacion({ id: this.almacen.siguienteId('notificaciones'), canal: implementacion.nombre, destinatario, ...preparado, facturaId });
    this.almacen.notificaciones.push(n);
    this.almacen.guardar();
    return Respuesta.ok({ enviado: true, canal: implementacion.nombre });
  }
}
