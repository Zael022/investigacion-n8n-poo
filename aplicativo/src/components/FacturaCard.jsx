import { EstadoFactura } from './ui.jsx';

// Vista detallada de un objeto Factura
export default function FacturaCard({ factura }) {
  if (!factura) return null;
  const f = factura;
  const filas = [
    ['Proveedor', f.proveedor],
    ['Cédula', f.identificacion || '—'],
    ['Número', f.numero],
    ['Emitida', f.fechaEmisionFormateada],
    ['Crédito', f.condicionDias != null ? `${f.condicionDias} días` : '—'],
    ['Vence', f.vence ? `${f.venceFormateado}${f.textoVencimiento ? ' · ' + f.textoVencimiento.toLowerCase() : ''}` : 'Sin pago programado'],
  ];

  return (
    <article className="tarjeta overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-linea bg-papel-2/50 px-5 py-4">
        <div>
          <p className="monto text-xs text-tinta-3">{f.codigo}</p>
          <p className="font-display text-xl font-semibold">{f.proveedor}</p>
        </div>
        <EstadoFactura factura={f} />
      </div>

      <div className="grid gap-6 px-5 py-4 sm:grid-cols-[1fr_auto]">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
          {filas.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-tinta-3">{k}</dt>
              <dd className={k === 'Número' || k === 'Cédula' ? 'monto break-all text-[13px]' : ''}>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="min-w-[13rem] rounded-xl bg-papel-2/60 p-4 text-sm">
          <div className="flex justify-between gap-4"><span className="text-tinta-3">Subtotal</span><span className="monto">{f.subtotalFormateado}</span></div>
          <div className="mt-1 flex justify-between gap-4"><span className="text-tinta-3">IVA</span><span className="monto">{f.impuestosFormateados}</span></div>
          <div className="mt-2 flex justify-between gap-4 border-t border-linea pt-2 font-semibold"><span>Total</span><span className="monto">{f.totalFormateado}</span></div>
        </div>
      </div>

      {(f.errores.length > 0 || f.advertencias.length > 0) && (
        <div className="space-y-2 border-t border-linea px-5 py-4 text-sm">
          {f.errores.map((e) => (
            <p key={e} className="flex gap-2 text-teja"><span aria-hidden>✕</span>{e}</p>
          ))}
          {f.advertencias.map((a) => (
            <p key={a} className="flex gap-2 text-ambar"><span aria-hidden>!</span>{a}</p>
          ))}
        </div>
      )}
    </article>
  );
}
