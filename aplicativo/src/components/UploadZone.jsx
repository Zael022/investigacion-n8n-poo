import { useRef, useState } from 'react';

// Zona para arrastrar y soltar (o elegir) un PDF
export default function UploadZone({ onArchivo, deshabilitado }) {
  const input = useRef(null);
  const [encima, setEncima] = useState(false);

  function recibir(archivos) {
    const archivo = archivos?.[0];
    if (archivo) onArchivo(archivo);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
      onDragLeave={() => setEncima(false)}
      onDrop={(e) => { e.preventDefault(); setEncima(false); if (!deshabilitado) recibir(e.dataTransfer.files); }}
      onClick={() => !deshabilitado && input.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
      role="button"
      tabIndex={0}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
        encima ? 'border-pino bg-pino-claro/50' : 'border-linea bg-[#fffdf8] hover:border-pino/50'
      } ${deshabilitado ? 'pointer-events-none opacity-60' : ''}`}
    >
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 text-pino">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M12 18v-6M9 15l3-3 3 3" />
      </svg>
      <p className="font-semibold">Arrastrá aquí el PDF de la factura</p>
      <p className="mt-1 text-sm text-tinta-3">o hacé clic para elegirlo · PDF con texto (factura electrónica)</p>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => { recibir(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
