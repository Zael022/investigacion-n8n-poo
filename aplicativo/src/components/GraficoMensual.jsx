import { formatearMonto, formatearMontoCorto, nombreMes } from '../lib/formato.js';

// Gráfico de barras simple (sin librerías): facturado por mes, últimos 6 meses
export default function GraficoMensual({ meses = [] }) {
  const maximo = Math.max(1, ...meses.map((m) => m.total));
  const actual = meses.at(-1)?.mes;

  return (
    <div className="tarjeta p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-semibold">Facturado por mes</h2>
        <span className="text-xs text-tinta-3">colones · últimos 6 meses</span>
      </div>
      <div className="flex h-44 items-end gap-3" role="img" aria-label="Gráfico de barras del total facturado por mes">
        {meses.map((m) => {
          const alto = Math.max(2, Math.round((m.total / maximo) * 100));
          return (
            <div key={m.mes} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="monto text-[11px] text-tinta-2 opacity-80 group-hover:opacity-100">{formatearMontoCorto(m.total)}</span>
              <div
                className={`w-full max-w-14 rounded-t-md transition-all ${m.mes === actual ? 'bg-pino' : 'bg-pino/35 group-hover:bg-pino/55'}`}
                style={{ height: `${alto}%` }}
                title={formatearMonto(m.total)}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-3 border-t border-linea pt-2">
        {meses.map((m) => (
          <span key={m.mes} className="flex-1 text-center text-xs capitalize text-tinta-3">{nombreMes(m.mes)}</span>
        ))}
      </div>
    </div>
  );
}
