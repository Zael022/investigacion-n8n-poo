import { useEffect, useRef, useState } from 'react';
import { n8n } from '../api/n8nClient.js';
import { Factura } from '../models/Factura.js';
import TablaFacturas from '../components/TablaFacturas.jsx';
import PasosAgente from '../components/PasosAgente.jsx';
import { Encabezado } from '../components/ui.jsx';
import { formatearMonto } from '../lib/formato.js';

const SUGERENCIAS = [
  '¿Cuánto debemos en total?',
  '¿Qué facturas vencen esta semana?',
  '¿Cuánto le debo a Monteverde?',
  '¿Qué facturas de Golfo Azul ya están pagadas?',
];

export default function Chat() {
  const [mensajes, setMensajes] = useState([]);
  const [entrada, setEntrada] = useState('');
  const [esperando, setEsperando] = useState(false);
  const fin = useRef(null);

  useEffect(() => { fin.current?.scrollIntoView({ behavior: 'smooth' }); }, [mensajes, esperando]);

  async function enviar(texto) {
    const t = texto.trim();
    if (!t || esperando) return;
    setEntrada('');
    setMensajes((m) => [...m, { rol: 'usuario', texto: t }]);
    setEsperando(true);
    try {
      const data = await n8n.preguntar(t);
      setMensajes((m) => [...m, {
        rol: 'agente',
        texto: data.mensaje || '(sin respuesta)',
        tabla: data.tabla,
        pasos: data.pasos ?? [],
      }]);
    } catch (e) {
      setMensajes((m) => [...m, { rol: 'error', texto: e.message }]);
    } finally {
      setEsperando(false);
    }
  }

  function nuevaConversacion() {
    n8n.nuevaConversacion();
    setMensajes([]);
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <Encabezado
        titulo="Preguntar al agente"
        subtitulo="Preguntá en lenguaje natural. El agente consulta la base de datos con filtros seguros; las cifras de la tabla vienen de la base, no de la IA."
      >
        {mensajes.length > 0 && <button className="btn btn-secundario" onClick={nuevaConversacion}>Nueva conversación</button>}
      </Encabezado>

      <div className="flex-1 space-y-4">
        {mensajes.length === 0 && (
          <div className="tarjeta p-6">
            <p className="mb-3 text-sm font-semibold">Probá con alguna de estas preguntas:</p>
            <div className="flex flex-wrap gap-2">
              {SUGERENCIAS.map((s) => (
                <button key={s} className="rounded-full border border-linea bg-papel px-3 py-1.5 text-sm hover:border-pino hover:text-pino" onClick={() => enviar(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensajes.map((m, i) => (
          <Mensaje key={i} mensaje={m} />
        ))}

        {esperando && (
          <div className="flex items-center gap-2 text-sm text-tinta-3">
            <span className="punto-carga text-pino"><span /><span /><span /></span>
            El agente está consultando…
          </div>
        )}
        <div ref={fin} />
      </div>

      <form
        className="sticky bottom-0 mt-6 flex gap-2 bg-papel py-4"
        onSubmit={(e) => { e.preventDefault(); enviar(entrada); }}
      >
        <input
          className="campo flex-1"
          placeholder="Escribí tu pregunta…"
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
          disabled={esperando}
          maxLength={2000}
        />
        <button className="btn btn-primario" disabled={esperando || !entrada.trim()}>Enviar</button>
      </form>
    </div>
  );
}

function Mensaje({ mensaje }) {
  if (mensaje.rol === 'usuario') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-pino px-4 py-2.5 text-sm text-papel">{mensaje.texto}</p>
      </div>
    );
  }
  if (mensaje.rol === 'error') {
    return <p className="max-w-[80%] rounded-2xl border border-teja/30 bg-teja-claro px-4 py-2.5 text-sm text-teja">{mensaje.texto}</p>;
  }

  const tabla = mensaje.tabla;
  const facturas = tabla ? Factura.lista(tabla.facturas) : [];
  return (
    <div className="max-w-full space-y-2">
      <div className="tarjeta max-w-[85%] rounded-bl-sm px-4 py-3 text-sm">
        <p className="whitespace-pre-line">{mensaje.texto}</p>
        {mensaje.pasos.length > 0 && (
          <div className="mt-3 border-t border-linea pt-2">
            <PasosAgente pasos={mensaje.pasos} compacto />
          </div>
        )}
      </div>
      {tabla && facturas.length > 0 && (
        <div className="tarjeta overflow-hidden">
          <div className="flex flex-wrap justify-between gap-2 border-b border-linea bg-papel-2/50 px-4 py-2 text-xs text-tinta-2">
            <span>{tabla.cantidad} {tabla.cantidad === 1 ? 'factura' : 'facturas'} · datos de la base</span>
            <span className="monto font-medium text-tinta">
              {Object.entries(tabla.totales ?? {}).map(([moneda, total]) => formatearMonto(total, moneda)).join(' + ')}
            </span>
          </div>
          <TablaFacturas facturas={facturas} />
        </div>
      )}
    </div>
  );
}
