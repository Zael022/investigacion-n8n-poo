import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { n8n } from '../api/n8nClient.js';
import { Factura } from '../models/Factura.js';
import UploadZone from '../components/UploadZone.jsx';
import FacturaCard from '../components/FacturaCard.jsx';
import PasosAgente from '../components/PasosAgente.jsx';
import { Alerta, Encabezado } from '../components/ui.jsx';

// Estados de la pantalla: inactivo -> leyendo -> listo_para_enviar -> procesando -> resultado | error
export default function Subir() {
  const [modo, setModo] = useState('pdf');
  const [estado, setEstado] = useState('inactivo');
  const [archivo, setArchivo] = useState(null);
  const [urlVista, setUrlVista] = useState(null);
  const [texto, setTexto] = useState('');
  const [nota, setNota] = useState('');
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [segundos, setSegundos] = useState(0);

  // Liberar la URL de vista previa del PDF
  useEffect(() => () => urlVista && URL.revokeObjectURL(urlVista), [urlVista]);

  // Contador mientras el agente trabaja
  useEffect(() => {
    if (estado !== 'procesando') return;
    setSegundos(0);
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [estado]);

  async function alElegirArchivo(f) {
    setError(null);
    setResultado(null);
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Solo se aceptan archivos PDF.');
      return;
    }
    setArchivo(f);
    setUrlVista(URL.createObjectURL(f));
    setEstado('leyendo');
    try {
      // pdf.js pesa ~1 MB: se carga solo cuando hace falta
      const { extraerTextoPdf } = await import('../lib/pdf.js');
      const { texto: t, esEscaneado } = await extraerTextoPdf(f);
      setTexto(t);
      if (esEscaneado) {
        setError('Este PDF parece escaneado (es una imagen, no tiene texto). Copiá los datos en la pestaña "Pegar texto".');
        setEstado('inactivo');
      } else {
        setEstado('listo_para_enviar');
      }
    } catch {
      setError('No se pudo leer el PDF. ¿Está dañado o protegido con contraseña?');
      setEstado('inactivo');
    }
  }

  async function procesar() {
    setEstado('procesando');
    setError(null);
    try {
      const data = await n8n.registrarFactura({ texto, nombreArchivo: archivo?.name ?? '', nota });
      setResultado({
        mensaje: data.mensaje,
        factura: data.factura ? Factura.desdeApi(data.factura) : null,
        requiereAprobacion: data.requiere_aprobacion,
        pasos: data.pasos ?? [],
      });
      setEstado('resultado');
    } catch (e) {
      setError(e.message);
      setEstado('listo_para_enviar');
    }
  }

  function reiniciar() {
    setArchivo(null);
    setUrlVista(null);
    setTexto('');
    setNota('');
    setResultado(null);
    setError(null);
    setEstado('inactivo');
  }

  const puedeEnviar = texto.trim().length >= 30 && estado !== 'procesando' && estado !== 'leyendo';

  return (
    <>
      <Encabezado
        titulo="Subir factura"
        subtitulo="El agente lee la factura, busca o registra al proveedor, la crea, la valida con reglas fijas, la guarda y programa el pago. Vos solo revisás el resultado."
      />

      {estado === 'resultado' && resultado ? (
        <div className="space-y-4">
          <Alerta
            tipo={resultado.factura?.estado === 'rechazada' || !resultado.factura ? 'aviso' : 'exito'}
            titulo="Respuesta del agente"
          >
            <p className="mt-1 whitespace-pre-line">{resultado.mensaje || 'El agente terminó sin mensaje.'}</p>
          </Alerta>
          {resultado.requiereAprobacion && (
            <Alerta
              tipo="aviso"
              titulo="Esta factura supera el umbral y necesita aprobación humana"
              accion={<Link to="/aprobaciones" className="text-sm font-semibold underline">Ir a aprobaciones →</Link>}
            />
          )}
          <PasosAgente pasos={resultado.pasos} />
          {resultado.factura ? (
            <FacturaCard factura={resultado.factura} />
          ) : (
            <p className="text-sm text-tinta-2">No se creó ninguna factura en esta petición.</p>
          )}
          <div className="flex gap-2">
            <button className="btn btn-primario" onClick={reiniciar}>Subir otra factura</button>
            <Link to="/" className="btn btn-secundario">Ver panel</Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex gap-1 rounded-lg bg-papel-2 p-1 text-sm">
              {[['pdf', 'Subir PDF'], ['texto', 'Pegar texto']].map(([v, t]) => (
                <button
                  key={v}
                  className={`flex-1 rounded-md px-3 py-1.5 font-semibold ${modo === v ? 'bg-[#fffdf8] shadow-sm' : 'text-tinta-2'}`}
                  onClick={() => setModo(v)}
                >
                  {t}
                </button>
              ))}
            </div>

            {modo === 'pdf' ? (
              <UploadZone onArchivo={alElegirArchivo} deshabilitado={estado === 'procesando'} />
            ) : (
              <textarea
                className="campo h-64 font-mono text-xs"
                placeholder="Pegá aquí el texto de la factura (proveedor, cédula, número, fecha, subtotal, IVA, total…)"
                value={texto}
                onChange={(e) => { setTexto(e.target.value); setEstado(e.target.value.trim() ? 'listo_para_enviar' : 'inactivo'); }}
              />
            )}

            {archivo && modo === 'pdf' && (
              <p className="text-sm text-tinta-2">
                Archivo: <span className="font-semibold">{archivo.name}</span>
                {estado === 'leyendo' && ' · leyendo…'}
              </p>
            )}

            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Nota para el agente <span className="font-normal text-tinta-3">(opcional)</span></span>
              <input className="campo" placeholder="Ej.: el crédito es a 45 días" value={nota} onChange={(e) => setNota(e.target.value)} />
            </label>

            {error && <Alerta titulo="Atención">{error}</Alerta>}

            <button className="btn btn-primario w-full py-3" disabled={!puedeEnviar} onClick={procesar}>
              {estado === 'procesando' ? (
                <>
                  <span className="punto-carga"><span /><span /><span /></span>
                  El agente está trabajando… {segundos}s
                </>
              ) : (
                'Procesar con el agente'
              )}
            </button>
            {estado === 'procesando' && (
              <p className="text-center text-xs text-tinta-3">Suele tardar entre 5 y 20 segundos (varias llamadas al modelo y a la base de datos).</p>
            )}
          </div>

          <div className="space-y-3">
            {urlVista && modo === 'pdf' ? (
              <object data={urlVista} type="application/pdf" className="h-[420px] w-full rounded-xl border border-linea bg-white">
                <p className="p-4 text-sm">Tu navegador no puede mostrar el PDF.</p>
              </object>
            ) : (
              <div className="grid h-[420px] place-items-center rounded-xl border border-dashed border-linea text-sm text-tinta-3">
                Aquí verás la vista previa
              </div>
            )}
            {texto && modo === 'pdf' && (
              <details className="tarjeta p-3 text-sm">
                <summary className="cursor-pointer font-semibold">Texto que recibirá el agente ({texto.length} caracteres)</summary>
                <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-xs text-tinta-2">{texto}</pre>
              </details>
            )}
          </div>
        </div>
      )}
    </>
  );
}
