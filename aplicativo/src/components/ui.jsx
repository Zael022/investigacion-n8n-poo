// Componentes pequeños reutilizables

const TONOS = {
  pino: 'bg-pino-claro text-pino',
  ambar: 'bg-ambar-claro text-ambar',
  teja: 'bg-teja-claro text-teja',
  cielo: 'bg-cielo-claro text-cielo',
  gris: 'bg-papel-2 text-tinta-2',
};

export function Insignia({ tono = 'gris', children }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONOS[tono] ?? TONOS.gris}`}>
      {children}
    </span>
  );
}

export function EstadoFactura({ factura }) {
  return <Insignia tono={factura.tonoEstado}>{factura.estaVencida ? 'Vencida' : factura.etiquetaEstado}</Insignia>;
}

export function Alerta({ tipo = 'error', titulo, children, accion }) {
  const estilos = {
    error: 'border-teja/30 bg-teja-claro text-teja',
    aviso: 'border-ambar/30 bg-ambar-claro text-ambar',
    exito: 'border-pino/30 bg-pino-claro text-pino',
    info: 'border-cielo/30 bg-cielo-claro text-cielo',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${estilos[tipo]}`} role={tipo === 'error' ? 'alert' : 'status'}>
      {titulo && <p className="font-semibold">{titulo}</p>}
      {children && <div className="text-tinta-2">{children}</div>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}

export function Cargando({ texto = 'Cargando' }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-tinta-3">
      <span className="punto-carga"><span /><span /><span /></span>
      {texto}
    </div>
  );
}

export function Encabezado({ titulo, subtitulo, children }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{titulo}</h1>
        {subtitulo && <p className="mt-1 max-w-2xl text-sm text-tinta-2">{subtitulo}</p>}
      </div>
      {children}
    </header>
  );
}
