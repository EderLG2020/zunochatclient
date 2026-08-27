# Generador de assets (Playwright + HTML/CSS + Sharp/FFmpeg)

Genera PNG/JPG/PDF/GIF desde templates HTML, o screenshots (o animaciones) de rutas en vivo de la app.

## Setup (una sola vez)

```bash
npm install
npm run playwright:install   # descarga Chromium (~200MB)
```

## Listar templates disponibles

```bash
npm run asset:list
```

## Generar desde un template

```bash
npm run asset:generate -- chat-message --format png --data '{"user":"Eder","message":"Hola","time":"10:32","status":"online"}'
npm run asset:generate -- chat-thread --format jpg --dataFile scripts/assets/templates/chat/chat-thread/data.example.json
npm run asset:generate -- documents/report --format pdf --dataFile scripts/assets/templates/documents/report/data.example.json
```

- `--data '<json>'` → datos inline.
- `--dataFile <ruta>` → datos desde un archivo `.json`.
- Si el nombre del template es único (ej. `chat-message`) no hace falta la categoría; si hay ambigüedad, usá `categoria/nombre` (ej. `chat/chat-message`).

Salida por defecto: `assets/generated/<png|jpg|pdf>/<nombre>.<ext>`

## Screenshot de una ruta en vivo

Requiere `npm run dev` corriendo (y el backend, si la vista usa datos reales):

```bash
npm run asset:generate -- --screenshot /login --format png --viewport desktop
npm run asset:generate -- --screenshot /chat --format png --fullPage
```

Salida: `assets/generated/screenshots/<ruta>.<ext>`

## GIF de una animación o proceso (Sharp + FFmpeg)

Captura cuadros del viewport durante un tiempo dado y los arma en un GIF animado.
Sirve tanto para un template (si tiene animaciones CSS) como para una ruta en vivo
(ej. el efecto de "escribiendo…", un mensaje que entra, un modal que se abre):

```bash
npm run asset:generate -- --screenshot /chat --format gif --duration 4000 --fps 12 --gifWidth 480
npm run asset:generate -- chat-message --format gif --duration 2000
```

- `--duration <ms>` → cuánto dura la captura (default `3000`).
- `--fps <n>` → cuadros por segundo capturados y del GIF de salida (default `10`).
- `--loop <n>` → repeticiones del GIF; `0` = infinito (default `0`).
- `--gifWidth <px>` → redimensiona cada frame con Sharp antes de armar el GIF (si se omite, usa el ancho del viewport).

Internamente: Playwright saca un screenshot por frame, Sharp los redimensiona (en paralelo)
si se pidió `--gifWidth`, y FFmpeg (vía `ffmpeg-static`, sin depender de un ffmpeg del sistema)
arma el GIF con paleta de 2 pasos (`palettegen` + `paletteuse`) para que no salga con bandas de color.

Salida: `assets/generated/screenshots/<ruta>.gif` (o `assets/generated/gif/<template>.gif`).

## Dónde se guarda (`ASSETS_OUTPUT_DIR`)

Prioridad: `--out <ruta>` > variable de entorno `ASSETS_OUTPUT_DIR` > `assets/generated/` (default).

```bash
ASSETS_OUTPUT_DIR=/var/data/zunochat-assets npm run asset:generate -- chat-message --format png
# -> /var/data/zunochat-assets/png/chat-message.png
```

También se puede definir en `.env` (ver `.env.example`).

## Flags

| Flag | Qué hace |
|---|---|
| `--format <png\|jpg\|pdf\|gif>` | Formato de salida (default `png`) |
| `--screenshot <ruta>` | Captura una ruta en vivo en vez de un template |
| `--viewport <desktop\|tablet\|mobile>` | Atajo de tamaño |
| `--width` / `--height` / `--deviceScaleFactor` | Tamaño y nitidez manual |
| `--fullPage` | Página completa (screenshots) |
| `--quality <0-100>` | Calidad jpg |
| `--transparent` | PNG con fondo transparente |
| `--background <color>` | Fuerza un color de fondo |
| `--page <A4\|Letter>` / `--landscape` / `--margin` | Opciones de PDF |
| `--duration <ms>` / `--fps <n>` / `--loop <n>` / `--gifWidth <n>` | Opciones de GIF |
| `--out <ruta>` | Fuerza la ruta/nombre de salida |
| `--data '<json>'` / `--dataFile <ruta>` | Datos para el template |
| `--help` | Ayuda |

## Crear un template nuevo

1. Creá `scripts/assets/templates/<categoria>/<nombre>/index.html` (+ `style.css` opcional).
2. Usá `{{clave}}`, `{{#if clave}}...{{/if}}`, `{{#each lista}}...{{this.x}}...{{/each}}` para los datos.
3. (Opcional) `meta.json` con tamaño por defecto: `{ "width": 600, "height": 300, "description": "..." }`.
4. (Opcional) `data.example.json` con datos de ejemplo, para usar con `--dataFile`.

Ya queda disponible en `npm run asset:list` y `npm run asset:generate -- <nombre>`.
