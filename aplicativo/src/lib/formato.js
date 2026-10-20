// Funciones de formato para Costa Rica (colones, fechas DD/MM/AAAA)

export function formatearMonto(valor, moneda = 'CRC') {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: moneda === 'USD' ? 'USD' : 'CRC',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatearMontoCorto(valor) {
  const n = Number(valor) || 0;
  if (n >= 1_000_000) return '₡' + (n / 1_000_000).toLocaleString('es-CR', { maximumFractionDigits: 1 }) + ' M';
  if (n >= 1_000) return '₡' + Math.round(n / 1_000).toLocaleString('es-CR') + ' mil';
  return '₡' + n.toLocaleString('es-CR');
}

// "2026-10-20" -> "20/10/2026" (sin pasar por Date para evitar desfases de zona horaria)
export function formatearFecha(iso) {
  if (!iso) return '—';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return d && m && a ? `${d}/${m}/${a}` : String(iso);
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
export function nombreMes(aaaaMm) {
  const [a, m] = String(aaaaMm).split('-');
  return `${MESES[Number(m) - 1] ?? m} ${String(a).slice(2)}`;
}

export function haceCuanto(fechaIso) {
  const seg = Math.round((Date.now() - new Date(fechaIso).getTime()) / 1000);
  if (seg < 60) return 'hace un momento';
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}
