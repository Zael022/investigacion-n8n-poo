import { useCallback, useEffect, useState } from 'react';
import { n8n } from '../api/n8nClient.js';
import { Factura } from '../models/Factura.js';
import FacturaCard from '../components/FacturaCard.jsx';
import { Alerta, Cargando, Encabezado } from '../components/ui.jsx';
import { formatearMonto } from '../lib/formato.js';

// Human-in-the-loop: la IA nunca aprueba montos altos; una persona decide aquí.
export default function Aprobaciones() {
  const [pendientes, setPendientes] = useState(null);
  const [umbral, setUmbral] = useState(null);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const datos = await n8n.aprobacionesPendientes();
      setPendientes(Factura.lista(datos));
      setUmbral(datos[0]?.umbral ?? null);
      setError(null);
    } catch (e) {
      setError(e.message);
      setPendientes([]);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function decidir(factura, decision, comentario) {
    try {
      await n8n.decidirAprobacion(factura.id, decision, comentario);
      setAviso(`${factura.codigo} ${decision === 'aprobar' ? 'aprobada' : 'rechazada'}.`);
      await cargar();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <>
      <Encabezado
        titulo="Aprobaciones"
        subtitulo={`Facturas que superan el umbral${umbral ? ' de ' + formatearMonto(umbral) : ''}. La IA nunca aprueba montos altos: una persona decide.`}
      />
      {error && <div className="mb-4"><Alerta titulo="No se pudieron cargar las aprobaciones">{error}</Alerta></div>}
      {aviso && <div className="mb-4"><Alerta tipo="exito" titulo={aviso} /></div>}
      {pendientes === null && <Cargando />}
      {pendientes?.length === 0 && !error && (
        <div className="tarjeta grid place-items-center px-6 py-16 text-center">
          <p className="font-display text-xl font-semibold">Nada pendiente</p>
          <p className="mt-1 text-sm text-tinta-2">Cuando el agente registre una factura grande, aparecerá aquí.</p>
        </div>
      )}
      <div className="space-y-6">
        {pendientes?.map((f) => (
          <TarjetaAprobacion key={f.id} factura={f} onDecidir={decidir} />
        ))}
      </div>
    </>
  );
}

function TarjetaAprobacion({ factura, onDecidir }) {
  const [comentario, setComentario] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function decidir(decision) {
    if (decision === 'rechazar' && comentario.trim().length < 5) {
      alert('Para rechazar, escribí el motivo en el comentario.');
      return;
    }
    setOcupado(true);
    await onDecidir(factura, decision, comentario);
    setOcupado(false);
  }

  return (
    <div className="space-y-3">
      <FacturaCard factura={factura} />
      <div className="tarjeta flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-[16rem] flex-1 text-sm">
          <span className="mb-1 block font-semibold">Comentario <span className="font-normal text-tinta-3">(obligatorio para rechazar)</span></span>
          <input className="campo" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ej.: el monto no coincide con la orden de compra" />
        </label>
        <button className="btn btn-secundario text-teja" disabled={ocupado} onClick={() => decidir('rechazar')}>Rechazar</button>
        <button className="btn btn-primario" disabled={ocupado} onClick={() => decidir('aprobar')}>Aprobar</button>
      </div>
    </div>
  );
}
