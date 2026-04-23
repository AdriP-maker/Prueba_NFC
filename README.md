# 📡 NFC Toolkit — Prototipo Web RFID/NFC

Prototipo web para **leer y escribir tarjetas NFC/RFID** desde un teléfono Android usando Chrome y la **Web NFC API** nativa. Sin backend, sin base de datos. 100% lado cliente.

---

## ✨ Características

| Feature | Detalle |
|---|---|
| ✏️ **Escritura NFC** | Escribe texto, URLs o vCards en tarjetas NTAG213 (≤ 144 bytes) |
| 📡 **Lectura NFC** | Escanea tarjetas y decodifica registros NDEF (texto, URL, MIME) |
| 🔬 **Simulador** | Prueba la UI sin hardware NFC |
| 📋 **Historial** | Persiste en `localStorage` automáticamente |
| ☁️ **Export JSONBin** | Sube el historial a JSONBin.io sin backend |

---

## 🚀 Despliegue en GitHub Pages

### Opción A — Rama `main`, carpeta `/docs` (recomendada)

```bash
# 1. Clona o crea tu repo
git init nfc-toolkit
cd nfc-toolkit

# 2. Copia los archivos del proyecto
#    La estructura debe quedar así:
#    /index.html
#    /css/styles.css
#    /js/app.js
#    /README.md

# 3. Sube al repositorio
git add .
git commit -m "feat: prototipo NFC Toolkit inicial"
git remote add origin https://github.com/TU_USUARIO/nfc-toolkit.git
git push -u origin main

# 4. En GitHub → Settings → Pages:
#    Source: "Deploy from a branch"
#    Branch: main / (root)
#    → Save

# 5. Tu app estará en:
#    https://TU_USUARIO.github.io/nfc-toolkit/
```

### Opción B — Rama `gh-pages`

```bash
# Instala gh-pages una sola vez (opcional, solo para automatizar)
npm install -g gh-pages

# Publica directamente
gh-pages -d . --dotfiles

# O manualmente:
git checkout -b gh-pages
git push origin gh-pages
# Luego configura GitHub Pages → Branch: gh-pages / (root)
```

> **Importante:** GitHub Pages sirve solo HTTPS. La Web NFC API **requiere HTTPS** (o localhost),
> por lo que GitHub Pages es la opción de despliegue ideal.

---

## 📱 Compatibilidad de Navegadores

| Navegador / Plataforma | Web NFC API | Alternativa |
|---|---|---|
| ✅ Chrome ≥ 89 en Android | ✔ Sí | — |
| ❌ Chrome en Windows/Mac/Linux | ✗ No | Simulador |
| ❌ Firefox (cualquier plataforma) | ✗ No | Simulador |
| ❌ Safari / iOS | ✗ No | Aplicación nativa |
| ❌ Edge (escritorio) | ✗ No | Simulador |

> **La Web NFC API solo funciona en Chrome Android 89+ con HTTPS.**

---

## 🏷️ Tipos de tarjeta soportados

| Tipo | Capacidad NDEF | Formato |
|---|---|---|
| NTAG213 | **144 bytes** | NDEF |
| NTAG215 | 504 bytes | NDEF |
| NTAG216 | 888 bytes | NDEF |
| MIFARE Ultralight | 46 bytes | NDEF |
| Type 2 Tag (ISO 14443-3A) | Variable | NDEF |

> El prototipo valida el límite de **144 bytes** (NTAG213 por defecto).
> Puedes ampliar este límite si usas NTAG215/216.

---

## 🔌 APIs Externas Gratuitas usadas

### 1. JSONBin.io (persistencia cloud)
- **URL:** https://jsonbin.io
- **Uso:** Almacena el historial de lecturas/escrituras como JSON
- **Sin cuenta necesaria** para bins públicos
- **Límite:** 10,000 req/mes gratis

### 2. Alternativas si Web NFC no está disponible

| Alternativa | Descripción | URL |
|---|---|---|
| **NFC TagInfo** (App Android) | App gratuita de diagnóstico NFC → exporta datos → los pegas en el simulador | [Google Play](https://play.google.com/store/apps/details?id=at.nfctools.taginfo) |
| **NFC Tools** (App Android) | Lee/escribe tags y puede compartir el contenido | [Google Play](https://play.google.com/store/apps/details?id=com.wakdev.wdnfc) |
| **NFC.cool Simulator** | Simulador online de tags NFC para pruebas | https://nfc.cool |
| **ndefeditor.com** | Editor NDEF online, genera payloads en base64 | https://www.ndefeditor.com |

---

## ⚠️ Limitaciones Conocidas

1. **Solo Chrome en Android**: La Web NFC API no está implementada en otros navegadores ni plataformas.
2. **Requiere HTTPS**: No funciona en `http://localhost` en algunos dispositivos (usar `https://` o `127.0.0.1`).
3. **Sin acceso a UID en escritura**: La API no expone el UID de la tarjeta durante `write()`.
4. **Tarjetas bloqueadas**: NTAG213 con OTP o páginas bloqueadas no se pueden sobreescribir.
5. **Permisos por gesto de usuario**: El escaneo/escritura debe iniciarse desde un evento del usuario (tap/click), no automáticamente.
6. **MIFARE Classic no soportado**: La API solo soporta tags NDEF (Type 2, 4, ISO-DEP). MIFARE Classic no es NDEF.
7. **Límite de registros**: El prototipo escribe un solo registro NDEF por tarjeta.

---

## 🏗️ Estructura del Proyecto

```
nfc-toolkit/
├── index.html          ← Página única (SPA)
├── css/
│   └── styles.css      ← Diseño móvil-first, dark mode
├── js/
│   └── app.js          ← Lógica NFC + fallback + historial
└── README.md
```

---

## 🔒 Seguridad y Privacidad

- **Sin servidor propio**: Todo el procesamiento ocurre en el dispositivo.
- **localStorage**: El historial se guarda localmente en el navegador.
- **JSONBin.io**: Los bins públicos son accesibles por cualquiera con el ID. Usa tu API Key para bins privados.

---

## 📦 Dependencias (CDN, sin instalación)

| Librería | Versión | Uso |
|---|---|---|
| [Lucide Icons](https://lucide.dev) | Latest | Iconografía SVG |
| [Google Fonts (Inter + Space Grotesk)](https://fonts.google.com) | — | Tipografía |
| **Web NFC API** | Nativa Chrome | NFC hardware |
| **JSONBin.io REST API** | v3 | Persistencia cloud |
