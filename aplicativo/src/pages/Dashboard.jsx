import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { n8n } from '../api/n8nClient.js';
import { Factura } from '../models/Factura.js';
import KpiCards from '../components/KpiCards.jsx';
import GraficoMensual from '../components/GraficoMensual.jsx';
import TablaFacturas from '../components/TablaFacturas.jsx';
import { Alerta, Cargando, Encabezado, Insignia } from '../components/ui.jsx';
import { haceCuanto } from '../lib/formato.js';

const FILTROS = [
  ['', 'Todas'],
  ['por_pagar', 'Por pagar'],
  ['pendiente_aprobacion', 'Por aprobar'],
  ['pagada', 'Pagadas'],
  ['rechazada', 'Rechazadas'],
];

export default function Dashboard() {
  const [resumen, setResumen] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [filtro, setFiltro] = useState({ q: '', estado: '' });
  const [error, setError] = useState(null);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [ocupado, setOcupado] = useState(null);

  const cargarResumen = useCallback(async () => {
    try {
      setResumen(await n8n.resumen());
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const cargarLista = useCallback(async (f) => {
    setCargandoLista(true);
    try {
      setFacturas(Factura.lista(await n8n.listarFacturas(f)));
    } catch (e) {
      setError(e.message);
    } finally {
      setCargandoLista(false);
    }
  }, []);

  useEffect(() => { cargarResumen(); }, [cargarResumen]);

  // Pequeña espera al escribir para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => cargarLista(filtro), 250);
    return () => clearTimeout(t);
  }, [filtro, cargarLista]);

  async function marcarPagada(factura) {
    if (!confirm(`¿Marcar ${factura.codigo} (${factura.totalFormateado}) como pagada?`)) return;
    setOcupado(factura.id);
    try {
      await n8n.marcarPagada(factura.id);
      await Promise.all([cargarResumen(), cargarLista(filtro)]);
    } catch (e) {
      alert(e.message);
    } finally {
      setOcupado(null);
    }
  }

  return (
    <>
      <Encabezado titulo="Panel de facturas" subtitulo="Lo que se debe, lo que vence y lo que espera aprobación. Los datos vienen directo de la base de datos, sin pasar por la IA.">
        <Link to="/subir" className="btn btn-primario">+ Subir factura</Link>
      </Encabezado>

      {error && (
        <div className="mb-6">
          <Alerta titulo="No se pudo cargar el panel">{error}</Alerta>
        </div>
      )}

      {!resumen && !error && <Cargando texto="Cargando indicadores" />}

      {resumen && (
        <div className="space-y-6">
          <KpiCards resumen={resumen} />

          {resumen.pendientes_aprobacion > 0 && (
            <Alerta
              tipo="aviso"
              titulo={`${resumen.pendientes_aprobacion} ${resumen.pendientes_aprobacion === 1 ? 'factura espera' : 'facturas esperan'} aprobación`}
              accion={<Link to="/aprobaciones" className="text-sm font-semibold underline">Revisar ahora →</Link>}
            />
          )}

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <GraficoMensual meses={resumen.por_mes} />
            <div className="tarjeta p-5">
              <h2 className="mb-3 font-display text-lg font-semibold">Notificaciones</h2>
              {resumen.notificaciones.length === 0 && <p className="text-sm text-tinta-3">Sin notificaciones todavía.</p>}
              <ul className="space-y-3">
                {resumen.notificaciones.map((n) => (
                  <li key={n.id} className="border-b border-linea/60 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{n.asunto}</p>
                      <Insignia tono={n.canal === 'panel' ? 'pino' : 'cielo'}>{n.canal}</Insignia>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-tinta-2">{n.mensaje}</p>
                    <p className="mt-1 text-[11px] text-tinta-3">Para {n.destinatario} · {haceCuanto(n.creado_en)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <section className="tarjeta mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linea px-4 py-3">
          <h2 className="font-display text-lg font-semibold">Facturas</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 rounded-lg bg-papel-2 p-1">
              {FILTROS.map(([valor, texto]) => (
                <button
                  key={valor}
                  onClick={() => setFiltro((f) => ({ ...f, estado: valor }))}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${filtro.estado === valor ? 'bg-[#fffdf8] text-tinta shadow-sm' : 'text-tinta-2'}`}
                >
                  {texto}
                </button>
              ))}
            </div>
            <input
              className="campo w-48 py-1.5 text-sm"
              placeholder="Buscar proveedor o número"
              value={filtro.q}
              onChange={(e) => setFiltro((f) => ({ ...f, q: e.target.value }))}
            />
          </div>
        </div>
        {cargandoLista ? (
          <div className="px-4"><Cargando /></div>
        ) : (
          <TablaFacturas facturas={facturas} onMarcarPagada={marcarPagada} ocupado={ocupado} vacia="No hay facturas con ese filtro." />
        )}
      </section>
    </>
  );
}
