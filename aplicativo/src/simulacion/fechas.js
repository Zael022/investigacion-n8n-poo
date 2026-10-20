// Utilidades de fecha en formato AAAA-MM-DD, usando la fecha local del navegador.

export function hoyISO() {
  const d = new Date();
  return aISO(d);
}

export function aISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function sumarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number);
  return aISO(new Date(a, m - 1, d + dias));
}

export function diasEntre(desdeIso, hastaIso) {
  const [a1, m1, d1] = desdeIso.split('-').map(Number);
  const [a2, m2, d2] = hastaIso.split('-').map(Number);
  return Math.round((new Date(a2, m2 - 1, d2) - new Date(a1, m1 - 1, d1)) / 86_400_000);
}
