# NFC · RFID · Bluetooth Toolkit

Versión extendida del proyecto original [Prueba_NFC](https://github.com/AdriP-maker/Prueba_NFC.git) con soporte completo de **Web Bluetooth API**.

## Nuevas funcionalidades Bluetooth

### Conexión BLE
- Buscar y conectar a dispositivos **Bluetooth Low Energy** directamente desde el navegador
- Filtrar por nombre, UUID de servicio, o aceptar cualquier dispositivo BLE
- Visualización automática de **servicios GATT y características** del dispositivo
- Clic en cualquier característica para llenar los campos de lectura/escritura

### Lectura Bluetooth
- Leer valores de cualquier característica GATT
- **Suscripción a notificaciones** (streaming en tiempo real)
- Decodificación inteligente: batería (%), frecuencia cardíaca (bpm), temperatura (°C), texto UTF-8, HEX
- Presets para características estándar: Batería, Info dispositivo, HM-10/HC-08, Frecuencia cardíaca, Temperatura

### Escritura Bluetooth
- Escribir en cualquier característica GATT escribible
- Formatos de envío: **Texto UTF-8**, **HEX** (ej: `FF 0A 1B`), **Uint8 decimal**
- Soporte para `writeValue` y `writeValueWithoutResponse`

## Compatibilidad

| Tecnología | Chrome Android | Chrome Desktop | Safari/iOS | Firefox |
|---|---|---|---|---|
| Web NFC (NFC/RFID) | ✅ | ❌ | ❌ | ❌ |
| Web Bluetooth (BLE) | ✅ | ✅ Win/Mac/Linux | ❌ | ❌ |

## Estructura

```
nfc-bt-toolkit/
├── index.html       ← HTML con 4 tabs: Escribir, Leer NFC, Bluetooth, Historial
├── js/
│   └── app.js       ← Lógica NFC + Bluetooth + Historial
└── css/
    └── styles.css   ← Design system con tokens BT
```

## Uso

Servir con cualquier servidor HTTP estático. El archivo `index.html` abre directamente en Chrome.

```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .
```

> **Nota:** Web Bluetooth y Web NFC requieren **HTTPS** en producción (o `localhost` para desarrollo).
