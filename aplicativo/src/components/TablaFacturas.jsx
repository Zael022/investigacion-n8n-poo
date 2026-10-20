import { EstadoFactura } from './ui.jsx';

/**
 * Tabla de objetos Factura. Recibe instancias de la clase Factura,
 * así que solo usa sus getters (polimorfismo de presentación).
 */
export default function TablaFacturas({ facturas, onMarcarPagada, ocupado = null, vacia = 'No hay facturas.' }) {
  if (!facturas.length) return <p className="px-4 py-10 text-center text-sm text-tinta-3">{vacia}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="border-b border-linea text-left text-xs uppercase tracking-wider text-tinta-3">
            <th className="px-4 py-2 font-semibold">Código</th>
            <th className="px-4 py-2 font-semibold">Proveedor</th>
            <th className="px-4 py-2 font-semibold">Emitida</th>
            <th className="px-4 py-2 font-semibold">Vence</th>
            <th className="px-4 py-2 text-right font-semibold">Total</th>
            <th className="px-4 py-2 font-semibold">Estado</th>
            {onMarcarPagada && <th className="px-4 py-2" />}
          </tr>
        </thead>
        <tbody>
          {facturas.map((f) => (
            <tr key={f.id} className="border-b border-linea/60 last:border-0 hover:bg-papel-2/50">
              <td className="px-4 py-3">
                <span className="monto text-xs font-medium">{f.codigo}</span>
                <span className="monto block max-w-[11rem] truncate text-[11px] text-tinta-3" title={f.numero}>{f.numero}</span>
              </td>
              <td className="px-4 py-3 font-medium">{f.proveedor}</td>
              <td className="px-4 py-3 text-tinta-2">{f.fechaEmisionFormateada}</td>
              <td className="px-4 py-3">
                <span className="text-tinta-2">{f.venceFormateado}</span>
                {f.textoVencimiento && (
                  <span className={`block text-[11px] ${f.estaVencida ? 'font-semibold text-teja' : f.diasParaVencer <= 7 ? 'text-ambar' : 'text-tinta-3'}`}>
                    {f.textoVencimiento}
                  </span>
                )}
              </td>
              <td className="monto px-4 py-3 text-right">{f.totalFormateado}</td>
              <td className="px-4 py-3"><EstadoFactura factura={f} /></td>
              {onMarcarPagada && (
                <td className="px-4 py-3 text-right">
                  {f.esPagable && (
                    <button className="btn btn-secundario whitespace-nowrap px-3 py-1 text-xs" disabled={ocupado === f.id} onClick={() => onMarcarPagada(f)}>
                      {ocupado === f.id ? 'Guardando…' : 'Marcar pagada'}
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
