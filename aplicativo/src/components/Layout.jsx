import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { n8n } from '../api/n8nClient.js';

const ENLACES = [
  { a: '/', texto: 'Panel', icono: IconoPanel, fin: true },
  { a: '/subir', texto: 'Subir factura', icono: IconoSubir },
  { a: '/chat', texto: 'Preguntar al agente', icono: IconoChat },
  { a: '/aprobaciones', texto: 'Aprobaciones', icono: IconoCheck },
];

export default function Layout() {
  const [confirmando, setConfirmando] = useState(false);

  function reiniciar() {
    n8n.reiniciarDatos();
    window.location.assign('/');
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[248px_1fr]">
      <aside className="border-b border-linea bg-papel-2/60 md:border-b-0 md:border-r md:min-h-screen">
        <div className="flex items-center gap-3 px-5 pt-5 pb-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-pino font-display text-xl text-papel">₡</div>
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold">Facturas IA</p>
            <p className="text-xs text-tinta-3">Comercial Pacífico S.A. (ficticia)</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {ENLACES.map(({ a, texto, icono: Icono, fin }) => (
            <NavLink
              key={a}
              to={a}
              end={fin}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-pino text-papel' : 'text-tinta-2 hover:bg-papel-2'
                }`
              }
            >
              <Icono />
              {texto}
            </NavLink>
          ))}
        </nav>

        <div className="mx-5 mt-8 hidden space-y-3 md:block">
          <div className="rounded-xl border border-ambar/40 bg-ambar-claro p-4 text-xs leading-relaxed text-tinta-2">
            <p className="mb-1 font-semibold text-ambar">Modo demostración</p>
            El backend está <b>simulado en el navegador</b>: los datos se guardan solo en este equipo y el
            agente usa reglas fijas, no un modelo de IA real.
          </div>
          {confirmando ? (
            <div className="rounded-xl border border-linea bg-papel p-3 text-xs">
              <p className="mb-2 text-tinta-2">¿Borrar los cambios y volver a los datos de ejemplo?</p>
              <div className="flex gap-2">
                <button className="btn btn-peligro px-3 py-1 text-xs" onClick={reiniciar}>Sí, reiniciar</button>
                <button className="btn btn-secundario px-3 py-1 text-xs" onClick={() => setConfirmando(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button className="text-xs font-semibold text-tinta-3 underline hover:text-tinta" onClick={() => setConfirmando(true)}>
              Reiniciar datos de demostración
            </button>
          )}
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <p className="mb-4 rounded-lg bg-ambar-claro px-3 py-2 text-xs text-ambar md:hidden">
          Modo demostración: backend simulado en el navegador.
        </p>
        <Outlet />
      </main>
    </div>
  );
}

function IconoPanel() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}
function IconoSubir() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M12 18v-6M9 15l3-3 3 3" />
    </svg>
  );
}
function IconoChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
    </svg>
  );
}
function IconoCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 12l2 2 4-4" /><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
    </svg>
  );
}
