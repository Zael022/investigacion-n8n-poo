import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Extrae el texto de un PDF en el navegador.
 * Groq (Llama) trabaja con texto, así que el PDF se convierte aquí y
 * a n8n solo viaja el texto: más rápido y sin enviar archivos pesados.
 */
export async function extraerTextoPdf(archivo, maxPaginas = 5) {
  const datos = new Uint8Array(await archivo.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: datos }).promise;
  const paginas = Math.min(pdf.numPages, maxPaginas);
  let texto = '';

  for (let i = 1; i <= paginas; i++) {
    const pagina = await pdf.getPage(i);
    const contenido = await pagina.getTextContent();
    for (const item of contenido.items) {
      if (!('str' in item)) continue;
      texto += item.str + (item.hasEOL ? '\n' : ' ');
    }
    texto += '\n';
  }

  // Limpieza: espacios repetidos y líneas vacías de más
  texto = texto
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { texto, paginas: pdf.numPages, esEscaneado: texto.replace(/\s/g, '').length < 30 };
}
