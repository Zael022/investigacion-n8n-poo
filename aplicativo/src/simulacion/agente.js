import { hoyISO } from './fechas.js';

/**
 * AgenteOrquestadorSimulado
 * Imita al nodo AI Agent de n8n: recibe una petición, decide qué "métodos" (herramientas) llamar
 * y en qué orden, y registra cada paso. NO usa un modelo de IA: la extracción de datos y la
 * interpretación de preguntas se hacen con reglas fijas. En la etapa con backend real, esta clase
 * se reemplaza por el agente de n8n.
 */
export class AgenteOrquestadorSimulado {
  #herramientas;

  constructor({ proveedores, facturas, pagos, notificador, almacen }) {
    this.almacen = almacen;
    // Registro de herramientas: nombre -> función (como las tools del AI Agent)
    this.#herramientas = {
      buscar_proveedor: (a) => proveedores.buscar(a.texto),
      registrar_proveedor: (a) => proveedores.registrar(a),
      crear_factura: (a) => facturas.crear(a),
      validar_factura: (a) => facturas.validar(a.facturaId),
      guardar_factura: (a) => facturas.guardar(a.facturaId),
      programar_pago: (a) => pagos.programar(a.facturaId),
      consultar_facturas: (a) => facturas.consultar(a),
      notificar: (a) => notificador.notificar(a),
    };
  }

  /** Ejecuta una herramienta y deja constancia del paso */
  #usar(pasos, herramienta, argumentos) {
    const r = this.#herramientas[herramienta](argumentos);
    pasos.push({ herramienta, ok: r.ok, error: r.error });
    return r;
  }

  /* ---------------- Registro de facturas ---------------- */

  static #numero(texto) {
    return Number(String(texto).replace(/\./g, '').replace(',', '.'));
  }

  /** Extrae los campos de una factura a partir de su texto (simulación de la IA). */
  static extraerDatos(texto) {
    const t = texto.replace(/\r/g, '');
    const receptor = /Comercial Pac[íi]fico/i;
    const cedulas = [...t.matchAll(/C[ée]d(?:ula|\.)\s*jur[íi]dica:?\s*([\d-]{9,14})/gi)].map((m) => m[1]).filter((c) => c.replace(/\D/g, '') !== '3101000000');
    const nombres = [...t.matchAll(/([A-ZÁÉÍÓÚÑ][^\n·:]*?\b(?:S\.A\.|Ltda\.))/g)].map((m) => m[1].trim()).filter((n) => !receptor.test(n));
    let emisor = (nombres[0] ?? '').replace(/^[A-Z]{1,3}\s+(?=[A-ZÁÉÍÓÚÑ])/, '');
    if (emisor && emisor === emisor.toUpperCase()) {
      emisor = emisor.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, e, l) => e + l.toUpperCase()).replace(/\bY\b/g, 'y').replace(/S\.a\./i, 'S.A.');
    }
    const fecha = t.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const credito = t.match(/Cr[ée]dito\s+(\d+)\s+d[íi]as/i);
    const moneda = /\bUSD\b|US\$/.test(t) ? 'USD' : 'CRC';
    const monto = String.raw`(?:₡|US\$)\s*([\d.]+,\d{2})`;
    const subtotal = t.match(new RegExp(String.raw`Subtotal[^\n]*?` + monto));
    const ivas = [...t.matchAll(new RegExp(String.raw`IVA\s+(\d+(?:[.,]\d+)?)\s*%\s*` + monto, 'g'))];
    const total = t.match(new RegExp(String.raw`TOTAL COMPROBANTE\s*` + monto, 'i'));
    const numero = t.match(/\b(\d{20})\b/) ?? t.match(/N\.?º[^\d\n]*(\d{4,})/);

    const datos = {
      emisor,
      identificacion: cedulas[0] ?? '',
      correo: (t.match(/[\w.+-]+@[\w.-]+\.\w+/) ?? [''])[0],
      numero: numero?.[1] ?? null,
      fechaEmision: fecha ? `${fecha[3]}-${fecha[2]}-${fecha[1]}` : null,
      condicionDias: credito ? Number(credito[1]) : /Contado/i.test(t) ? 0 : 30,
      moneda,
      subtotal: subtotal ? AgenteOrquestadorSimulado.#numero(subtotal[1]) : null,
      impuestos: ivas.length ? Math.round(ivas.reduce((s, m) => s + AgenteOrquestadorSimulado.#numero(m[2]), 0) * 100) / 100 : 0,
      tasas: ivas.map((m) => Number(m[1].replace(',', '.'))),
      total: total ? AgenteOrquestadorSimulado.#numero(total[1]) : null,
    };
    const faltan = ['emisor', 'numero', 'fechaEmision', 'subtotal', 'total'].filter((k) => !datos[k]);
    return { datos, faltan };
  }

  registrarFactura(texto) {
    const pasos = [];
    const { datos, faltan } = AgenteOrquestadorSimulado.extraerDatos(texto);
    if (faltan.length) {
      return { mensaje: `No pude leer estos datos de la factura: ${faltan.join(', ')}. Revisá que el PDF tenga texto o pegá los datos manualmente.`, facturaId: null, pasos };
    }

    // 1. Buscar proveedor (por cédula; si no hay, por nombre)
    let r = this.#usar(pasos, 'buscar_proveedor', { texto: datos.identificacion || datos.emisor });
    let proveedor = r.data?.proveedor;
    // 2. Registrarlo si no existe
    if (!proveedor) {
      r = this.#usar(pasos, 'registrar_proveedor', { nombre: datos.emisor, identificacion: datos.identificacion, correo: datos.correo });
      if (!r.ok) return { mensaje: 'No pude registrar al proveedor: ' + r.error, facturaId: null, pasos };
      proveedor = r.data.proveedor;
    }
    // 3. Crear la factura
    r = this.#usar(pasos, 'crear_factura', { ...datos, proveedorId: proveedor.id });
    if (!r.ok) return { mensaje: 'No pude crear la factura: ' + r.error, facturaId: null, pasos };
    const facturaId = r.data.factura.id;
    // 4. Validar (reglas deterministas)
    r = this.#usar(pasos, 'validar_factura', { facturaId });
    if (!r.data.valida) {
      return { mensaje: `No registré la factura de ${proveedor.nombre} porque no pasó la validación: ${r.data.errores.join(' ')}`, facturaId, pasos };
    }
    // 5. Guardar y 6. programar el pago
    r = this.#usar(pasos, 'guardar_factura', { facturaId });
    const requiereAprobacion = r.data.requiereAprobacion;
    const pago = this.#usar(pasos, 'programar_pago', { facturaId });
    const [a, m, d] = pago.data.pago.fechaVencimiento.split('-');
    let mensaje = `Registré la factura ${r.data.factura.numero} de ${proveedor.nombre}${proveedor.nombre.endsWith('.') ? '' : '.'} El pago vence el ${d}/${m}/${a}.`;
    if (requiereAprobacion) {
      this.#usar(pasos, 'notificar', { canal: 'panel', destinatario: 'aprobador', asunto: `Factura F-${String(facturaId).padStart(5, '0')} requiere aprobación`, mensaje: `La factura ${datos.numero} de ${proveedor.nombre} supera el umbral de aprobación.`, facturaId });
      mensaje += ' Como supera el umbral, quedó pendiente de aprobación humana.';
    }
    return { mensaje, facturaId, pasos, requiereAprobacion };
  }

  /* ---------------- Preguntas en lenguaje natural ---------------- */

  #detectarProveedor(texto) {
    const sinTildes = (x) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const t = sinTildes(texto);
    // Palabras genéricas que no identifican a un proveedor
    const genericas = new Set(['s.a.', 'ltda.', 'del', 'de', 'la', 'el', 'y', 'los', 'las', 'distribuidora', 'servicios', 'empresarial',
      'industrial', 'centro', 'suministros', 'transportes', 'logistica', 'integral', 'pacifico', 'mantenimiento', 'informaticos', 'agricola']);
    let mejor = null;
    let puntos = 0;
    for (const p of this.almacen.proveedores) {
      const palabras = sinTildes(p.nombre).split(/\s+/).filter((w) => w.length > 3 && !genericas.has(w));
      const coincidencias = palabras.filter((w) => t.includes(w)).length;
      if (coincidencias > puntos) { mejor = p; puntos = coincidencias; }
    }
    return mejor;
  }

  preguntar(mensaje) {
    const pasos = [];
    const t = mensaje.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const proveedor = this.#detectarProveedor(mensaje);
    const filtros = { proveedor: proveedor?.nombre ?? '', estado: '', venceEnDias: null };

    if (/pagad/.test(t) && !/(por pagar|sin pagar|no pagad|pendiente)/.test(t)) filtros.estado = 'pagada';
    else if (/aprob/.test(t)) filtros.estado = 'pendiente_aprobacion';
    else if (/rechaz/.test(t)) filtros.estado = 'rechazada';
    else if (/venc|semana/.test(t)) { filtros.estado = 'por_pagar'; filtros.venceEnDias = /semana/.test(t) ? 7 : 3; }
    else if (/deb|deud|pagar|pendiente|total|cuanto/.test(t)) filtros.estado = 'por_pagar';
    else if (!proveedor) {
      return { mensaje: 'En esta simulación puedo responder preguntas sobre cuánto se debe, qué vence, facturas pagadas, rechazadas o por aprobar, y facturas de un proveedor.', tabla: null, pasos };
    }

    const r = this.#usar(pasos, 'consultar_facturas', filtros);
    const { cantidad, totales, facturas } = r.data;
    const montos = Object.entries(totales).map(([mon, v]) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: mon }).format(v)).join(' y ');
    const de = proveedor ? ` de ${proveedor.nombre}` : '';
    const uno = cantidad === 1;
    const descripciones = {
      por_pagar: filtros.venceEnDias ? `que ${uno ? 'vence' : 'vencen'} en los próximos ${filtros.venceEnDias} días o ya ${uno ? 'está vencida' : 'están vencidas'}` : `${uno ? 'pendiente' : 'pendientes'} de pago`,
      pagada: uno ? 'pagada' : 'pagadas',
      pendiente_aprobacion: `${uno ? 'pendiente' : 'pendientes'} de aprobación`,
      rechazada: uno ? 'rechazada' : 'rechazadas',
      '': 'en el sistema',
    };
    const texto = cantidad === 0
      ? `No encontré facturas${de} con ese criterio.`
      : `${uno ? 'Hay 1 factura' : `Hay ${cantidad} facturas`}${de} ${descripciones[filtros.estado]}, por un total de ${montos}.`;
    return { mensaje: texto + ` (Consulta del ${hoyISO().split('-').reverse().join('/')}.)`, tabla: cantidad ? { cantidad, totales, facturas } : null, pasos };
  }
}
