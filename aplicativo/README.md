# Aplicativo: gestión inteligente de facturas (versión con backend simulado)

Aplicación web para subir facturas en PDF, procesarlas con un "agente orquestador", validarlas, aprobarlas y consultar lo que se debe.

> **Modo demostración.** El backend está **simulado dentro del navegador**: los datos se guardan en el `localStorage` del equipo y el agente usa **reglas fijas, no un modelo de IA real**. La simulación imita los workflows de n8n descritos en la investigación, para poder conectar n8n más adelante sin cambiar las pantallas.

## Tecnologías

- **React 19** — interfaz por componentes.
- **Vite 8** — servidor de desarrollo y compilación.
- **Tailwind CSS 4** — estilos.
- **React Router 7** — navegación entre pantallas.
- **pdf.js** — lectura del texto de los PDF en el navegador.

## Cómo ejecutarlo

Requisito: **Node.js 22** (mínimo 20.19).

```bash
cd aplicativo
npm install
npm run dev
```

Abrí http://localhost:5173 y probá con los PDF de la carpeta [`../facturas-ejemplo`](../facturas-ejemplo).

## Pantallas

| Pantalla | Qué hace |
| --- | --- |
| Panel | Total por pagar, vencimientos de la semana, vencidas, por aprobar, gráfico de 6 meses, notificaciones y tabla de facturas con filtros. |
| Subir factura | Arrastrar un PDF (o pegar el texto); el agente simulado registra la factura y muestra los métodos que eligió. |
| Preguntar al agente | Preguntas como "¿Cuánto debemos en total?" o "¿Qué facturas vencen esta semana?". |
| Aprobaciones | Las facturas que superan el umbral (₡500 000) esperan que una persona las apruebe o rechace. |

## Resultado esperado con las facturas de ejemplo

| Factura | Resultado |
| --- | --- |
| 01 Golfo Azul | Registrada (proveedor existente) |
| 02 Monteverde | Registrada (dos tarifas de IVA: 1 % y 13 %) |
| 03 Nube Tica | Registrada en dólares (proveedor nuevo) |
| 04 Caldera | Pendiente de aprobación (supera el umbral) |
| 05 El Roble | Rechazada: la suma no cuadra |
| 06 Centro Médico | Registrada (IVA 4 %) |
| 01 por segunda vez | Rechazada por duplicada |

## Estructura y POO

```
src/
├── simulacion/              ← backend simulado (enfoque B de la investigación: clases JavaScript)
│   ├── modelos.js           Proveedor, Factura (ciclo de vida), Pago, Notificacion
│   ├── servicios.js         ServicioProveedor, ServicioFactura, ServicioPago, Notificador + canales
│   ├── agente.js            AgenteOrquestadorSimulado (elige qué métodos llamar)
│   ├── almacen.js           Almacen: guarda los datos en localStorage
│   └── ServidorSimulado.js  Misma interfaz que el cliente de n8n
├── api/n8nClient.js         ClienteN8n (para el backend real) y la instancia que usa la app
├── models/Factura.js        Clase de presentación de una factura
├── components/  pages/      Interfaz
```

Pilares aplicados:

- **Encapsulamiento:** campos privados (`#almacen`, `#herramientas`, `#TRANSICIONES`) y transiciones de estado controladas en `Factura.cambiarEstado()`.
- **Herencia y polimorfismo:** `CanalPanel`, `CanalEmail` y `CanalSlack` heredan de `CanalNotificacion` y cada uno implementa `preparar()` a su manera.
- **Abstracción:** `ServidorSimulado` y `ClienteN8n` exponen los mismos métodos; las pantallas no saben cuál están usando.
- **Interfaz común:** todos los servicios devuelven `{ ok, data, error }`.

## Pasar al backend real (etapa siguiente)

En `src/api/n8nClient.js` se cambia `new ServidorSimulado()` por `new ClienteN8n()` y se configuran los webhooks de n8n. Las pantallas no cambian.

## Qué se probó

Se probó en un navegador automatizado (Chromium): carga de las 6 facturas de ejemplo y de una duplicada, preguntas en el chat, aprobación de una factura, marcar una factura como pagada, persistencia al recargar la página y vista en ancho de teléfono. No se probó con n8n ni con un modelo de IA real, porque esta versión no los usa.
