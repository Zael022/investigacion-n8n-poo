import { formatearMonto } from '../lib/formato.js';

export default function KpiCards({ resumen }) {
  const kpis = [
    {
      titulo: 'Total por pagar',
      valor: formatearMonto(resumen.por_pagar_crc),
      detalle: `${resumen.por_pagar_cantidad} ${resumen.por_pagar_cantidad === 1 ? 'factura' : 'facturas'}`,
      tono: 'text-tinta',
      destacado: true,
    },
    {
      titulo: 'Vence esta semana',
      valor: formatearMonto(resumen.vence_semana_monto),
      detalle: `${resumen.vence_semana_cantidad} en los próximos 7 días`,
      tono: 'text-ambar',
    },
    {
      titulo: 'Pagos vencidos',
      valor: resumen.vencidas,
      detalle: resumen.vencidas ? 'Requieren atención' : 'Todo al día',
      tono: resumen.vencidas ? 'text-teja' : 'text-pino',
    },
    {
      titulo: 'Por aprobar',
      valor: resumen.pendientes_aprobacion,
      detalle: 'Superan el umbral',
      tono: resumen.pendientes_aprobacion ? 'text-ambar' : 'text-pino',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => (
        <div key={k.titulo} className={`tarjeta p-4 ${k.destacado ? 'border-pino/40 bg-pino-claro/40' : ''}`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-tinta-3">{k.titulo}</p>
          <p className={`monto mt-2 text-2xl font-medium ${k.tono}`}>{k.valor}</p>
          <p className="mt-1 text-xs text-tinta-2">{k.detalle}</p>
        </div>
      ))}
    </div>
  );
}
