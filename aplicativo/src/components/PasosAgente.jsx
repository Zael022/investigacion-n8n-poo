// Muestra qué "métodos" (herramientas / sub-workflows) decidió llamar el orquestador
const NOMBRES = {
  buscar_proveedor: 'Proveedor.buscar()',
  registrar_proveedor: 'Proveedor.registrar()',
  crear_factura: 'Factura.crear()',
  validar_factura: 'Factura.validar()',
  guardar_factura: 'Factura.guardar()',
  consultar_facturas: 'Factura.consultar()',
  programar_pago: 'Pago.programar()',
  notificar: 'Notificador.notificar()',
};

export default function PasosAgente({ pasos = [], compacto = false }) {
  if (!pasos.length) return null;
  return (
    <div className={compacto ? '' : 'tarjeta p-4'}>
      {!compacto && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-tinta-3">
          Métodos que eligió el agente ({pasos.length})
        </p>
      )}
      <ol className="flex flex-wrap items-center gap-1.5">
        {pasos.map((p, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span
              className={`monto rounded-md border px-2 py-1 text-[11px] ${
                p.ok ? 'border-pino/30 bg-pino-claro/60 text-pino' : 'border-teja/30 bg-teja-claro text-teja'
              }`}
              title={p.error ?? 'ok'}
            >
              {NOMBRES[p.herramienta] ?? p.herramienta}
            </span>
            {i < pasos.length - 1 && <span className="text-tinta-3" aria-hidden>→</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
