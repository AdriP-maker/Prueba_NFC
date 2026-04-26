/* ══════════════════════════════════════════════════════
   NFC · RFID · BLUETOOTH TOOLKIT
   Web NFC API  +  Web Bluetooth API  +  Simulador
   JSONBin.io para persistencia cloud
══════════════════════════════════════════════════════ */

'use strict';

// ── Estado global ──────────────────────────────────────
const State = {
  // NFC
  nfcSupported: false,
  nfcScanning:  false,
  nfcReader:    null,
  abortCtrl:    null,

  // Bluetooth
  btSupported:   false,
  btDevice:      null,
  btServer:      null,
  btNotifyChar:  null,
  btNotifying:   false,

  // Historial compartido
  history:      [],
  JSONBIN_BASE: 'https://api.jsonbin.io/v3/b',
  JSONBIN_ID:   null,
};

// ── Constantes BLE ──────────────────────────────────────
const BT_PRESETS = {
  battery: {
    service: 'battery_service',
    char:    'battery_level',
    label:   'Batería',
  },
  device_info: {
    service: 'device_information',
    char:    'firmware_revision_string',
    label:   'Info dispositivo',
  },
  hm10: {
    service: '0000ffe0-0000-1000-8000-00805f9b34fb',
    char:    '0000ffe1-0000-1000-8000-00805f9b34fb',
    label:   'HM-10/HC-08',
  },
  heart_rate: {
    service: 'heart_rate',
    char:    'heart_rate_measurement',
    label:   'Frecuencia cardíaca',
  },
  temp: {
    service: 'health_thermometer',
    char:    'temperature_measurement',
    label:   'Temperatura',
  },
};

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  loadHistory();
  checkNFCSupport();
  checkBTSupport();
  setupFormHandlers();
  document.getElementById('record-type').addEventListener('change', onRecordTypeChange);
  document.getElementById('bt-accept-all').addEventListener('change', onBtAcceptAllChange);
});

// ── NFC: Soporte ────────────────────────────────────────
async function checkNFCSupport() {
  const badge      = document.getElementById('nfc-badge');
  const badgeLabel = document.getElementById('nfc-badge-label');
  const overlay    = document.getElementById('nfc-overlay');

  if ('NDEFReader' in window) {
    State.nfcSupported = true;
    badge.className    = 'badge badge--ok';
    badgeLabel.textContent = 'NFC ✓';
    overlay.classList.add('overlay--hidden');
  } else {
    State.nfcSupported = false;
    badge.className    = 'badge badge--error';
    badgeLabel.textContent = 'Sin NFC';
    overlay.classList.remove('overlay--hidden');
    document.getElementById('btn-write').disabled = true;
  }
  lucide.createIcons();
}

function dismissOverlay() {
  document.getElementById('nfc-overlay').classList.add('overlay--hidden');
}

// ── Bluetooth: Soporte ──────────────────────────────────
async function checkBTSupport() {
  const badge      = document.getElementById('bt-badge');
  const badgeLabel = document.getElementById('bt-badge-label');

  if (navigator.bluetooth) {
    try {
      const avail = await navigator.bluetooth.getAvailability();
      State.btSupported = avail;
      if (avail) {
        badge.className = 'badge badge--bt-ok';
        badgeLabel.textContent = 'BT ✓';
      } else {
        badge.className = 'badge badge--error';
        badgeLabel.textContent = 'BT apagado';
      }
    } catch {
      State.btSupported = true; // puede que getAvailability falle pero la API existe
      badge.className = 'badge badge--bt-ok';
      badgeLabel.textContent = 'BT ✓';
    }
  } else {
    State.btSupported = false;
    badge.className = 'badge badge--error';
    badgeLabel.textContent = 'Sin BT';
  }
  lucide.createIcons();
}

// ── Bluetooth: Conectar ─────────────────────────────────
async function btConnect() {
  if (!navigator.bluetooth) {
    showToast('Web Bluetooth no disponible en este navegador.', 'error');
    return;
  }

  const nameFilter    = document.getElementById('bt-name-filter').value.trim();
  const serviceFilter = document.getElementById('bt-service-filter').value.trim();
  const acceptAll     = document.getElementById('bt-accept-all').checked;

  const requestOptions = {};

  if (acceptAll) {
    requestOptions.acceptAllDevices = true;
    requestOptions.optionalServices = [
      'battery_service', 'device_information', 'heart_rate',
      'health_thermometer', 'generic_access', 'generic_attribute',
      '0000ffe0-0000-1000-8000-00805f9b34fb',
      '0000fff0-0000-1000-8000-00805f9b34fb',
    ];
  } else {
    const filters = [];
    if (nameFilter)    filters.push({ namePrefix: nameFilter });
    if (serviceFilter) filters.push({ services: [normalizeUUID(serviceFilter)] });
    if (!filters.length) {
      // Sin filtros específicos: buscar dispositivos genéricos
      requestOptions.acceptAllDevices = true;
      requestOptions.optionalServices = [
        'battery_service', 'device_information', 'heart_rate',
        'health_thermometer', 'generic_access',
        '0000ffe0-0000-1000-8000-00805f9b34fb',
        '0000fff0-0000-1000-8000-00805f9b34fb',
      ];
    } else {
      requestOptions.filters = filters;
      requestOptions.optionalServices = [
        'battery_service', 'device_information', 'heart_rate',
        'health_thermometer',
        '0000ffe0-0000-1000-8000-00805f9b34fb',
      ];
    }
  }

  const btnConnect    = document.getElementById('btn-bt-connect');
  const btnDisconnect = document.getElementById('btn-bt-disconnect');

  try {
    btnConnect.disabled = true;
    btnConnect.innerHTML = '<i data-lucide="loader-2"></i> Buscando…';
    lucide.createIcons();

    const device = await navigator.bluetooth.requestDevice(requestOptions);
    State.btDevice = device;

    device.addEventListener('gattserverdisconnected', onBtDisconnected);

    showToast(`Conectando con ${device.name || device.id}…`);

    const server = await device.gatt.connect();
    State.btServer = server;

    // Actualizar UI
    btnConnect.style.display    = 'none';
    btnDisconnect.style.display = '';

    showBtDeviceInfo(device);
    await listBtServices(server);

    enableBtButtons(true);
    showToast(`✓ Conectado: ${device.name || 'Dispositivo BLE'}`, 'success');
    addToHistory({ type: 'bt-connect', data: `Conectado: ${device.name || device.id}` });

  } catch (err) {
    if (err.name !== 'NotFoundError' && err.name !== 'AbortError') {
      showToast(parseBTError(err), 'error');
    } else if (err.name === 'AbortError') {
      showToast('Búsqueda cancelada.', '');
    }
  } finally {
    btnConnect.disabled = false;
    btnConnect.innerHTML = '<i data-lucide="bluetooth-searching"></i> Buscar y conectar';
    lucide.createIcons();
  }
}

function onBtDisconnected() {
  State.btServer  = null;
  State.btNotifying = false;
  State.btNotifyChar = null;

  document.getElementById('btn-bt-connect').style.display    = '';
  document.getElementById('btn-bt-disconnect').style.display = 'none';
  document.getElementById('bt-device-info').className = 'bt-device-card bt-device-card--hidden';
  document.getElementById('bt-notify-badge').style.display = 'none';
  enableBtButtons(false);

  showToast(`Dispositivo desconectado.`, 'error');
}

function btDisconnect() {
  if (State.btDevice && State.btDevice.gatt.connected) {
    State.btDevice.gatt.disconnect();
  } else {
    onBtDisconnected();
  }
}

function showBtDeviceInfo(device) {
  const card = document.getElementById('bt-device-info');
  document.getElementById('bt-device-name').textContent = device.name || 'Dispositivo BLE';
  document.getElementById('bt-device-id').textContent   = `ID: ${device.id.substring(0, 16)}…`;
  card.className = 'bt-device-card';
}

async function listBtServices(server) {
  const container = document.getElementById('bt-services-list');
  container.innerHTML = '<span class="bt-svc-loading">Obteniendo servicios…</span>';

  try {
    const services = await server.getPrimaryServices();
    if (!services.length) {
      container.innerHTML = '<span style="color:var(--text-muted);font-size:0.78rem">Sin servicios GATT detectados</span>';
      return;
    }

    const items = await Promise.all(services.map(async (svc) => {
      let chars = [];
      try {
        chars = await svc.getCharacteristics();
      } catch {}
      return { uuid: svc.uuid, chars };
    }));

    container.innerHTML = items.map(({ uuid, chars }) => {
      const shortName = getServiceName(uuid);
      const charList  = chars.map(c => {
        const props = Object.entries(c.properties)
          .filter(([, v]) => v)
          .map(([k]) => `<span class="prop-chip">${k}</span>`)
          .join('');
        return `
          <div class="bt-char-item" onclick="btFillFromService('${uuid}','${c.uuid}')">
            <span class="bt-char-uuid">${c.uuid}</span>
            <span class="bt-char-props">${props}</span>
          </div>`;
      }).join('');

      return `
        <div class="bt-service-item">
          <div class="bt-service-header">
            <i data-lucide="layers" style="width:13px;height:13px"></i>
            <span>${shortName}</span>
            <span class="bt-svc-uuid">${uuid}</span>
          </div>
          ${charList}
        </div>`;
    }).join('');

    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<span style="color:var(--danger);font-size:0.78rem">Error al listar servicios: ${err.message}</span>`;
  }
}

function btFillFromService(serviceUuid, charUuid) {
  document.getElementById('bt-read-service').value  = serviceUuid;
  document.getElementById('bt-read-char').value     = charUuid;
  document.getElementById('bt-write-service').value = serviceUuid;
  document.getElementById('bt-write-char').value    = charUuid;
  showToast('UUIDs copiados a los campos de lectura y escritura.', 'success');
}

function enableBtButtons(enabled) {
  document.getElementById('btn-bt-read').disabled    = !enabled;
  document.getElementById('btn-bt-notify').disabled  = !enabled;
  document.getElementById('btn-bt-write').disabled   = !enabled;
}

// ── Bluetooth: Leer característica ─────────────────────
async function btReadChar() {
  const serviceUUID = document.getElementById('bt-read-service').value.trim();
  const charUUID    = document.getElementById('bt-read-char').value.trim();

  if (!serviceUUID || !charUUID) {
    showToast('Completa los UUIDs de servicio y característica.', 'error');
    return;
  }

  if (!State.btServer || !State.btServer.connected) {
    showToast('No hay dispositivo conectado.', 'error');
    return;
  }

  try {
    const service = await State.btServer.getPrimaryService(normalizeUUID(serviceUUID));
    const char    = await service.getCharacteristic(normalizeUUID(charUUID));
    const value   = await char.readValue();

    const decoded = formatBTValue(value, serviceUUID, charUUID);
    showBtReadResult(decoded, serviceUUID, charUUID);
    addToHistory({ type: 'bt-read', data: `[${getServiceName(serviceUUID)}] ${decoded}` });
    showToast('Característica leída.', 'success');

  } catch (err) {
    showToast(parseBTError(err), 'error');
  }
}

// ── Bluetooth: Notificaciones (suscripción) ─────────────
async function btToggleNotify() {
  if (State.btNotifying) {
    await btStopNotify();
  } else {
    await btStartNotify();
  }
}

async function btStartNotify() {
  const serviceUUID = document.getElementById('bt-read-service').value.trim();
  const charUUID    = document.getElementById('bt-read-char').value.trim();

  if (!serviceUUID || !charUUID) {
    showToast('Completa los UUIDs antes de suscribir.', 'error');
    return;
  }

  if (!State.btServer || !State.btServer.connected) {
    showToast('No hay dispositivo conectado.', 'error');
    return;
  }

  try {
    const service = await State.btServer.getPrimaryService(normalizeUUID(serviceUUID));
    const char    = await service.getCharacteristic(normalizeUUID(charUUID));

    if (!char.properties.notify && !char.properties.indicate) {
      showToast('Esta característica no soporta notificaciones.', 'error');
      return;
    }

    char.addEventListener('characteristicvaluechanged', (event) => {
      const decoded = formatBTValue(event.target.value, serviceUUID, charUUID);
      const ts      = new Date().toLocaleTimeString('es-MX');
      const prev    = document.getElementById('bt-read-content').textContent;
      const newLine = `[${ts}] ${decoded}`;

      // Mostrar las últimas 15 lecturas
      const lines = prev ? prev.split('\n') : [];
      lines.unshift(newLine);
      if (lines.length > 15) lines.pop();
      document.getElementById('bt-read-content').textContent = lines.join('\n');

      document.getElementById('bt-read-result').className = 'result-card';
    });

    await char.startNotifications();
    State.btNotifyChar = char;
    State.btNotifying  = true;

    document.getElementById('btn-bt-notify').innerHTML = '<i data-lucide="activity"></i> Detener';
    document.getElementById('bt-notify-badge').style.display = '';
    lucide.createIcons();

    showToast('Suscripción activa. Recibiendo datos…', 'success');

  } catch (err) {
    showToast(parseBTError(err), 'error');
  }
}

async function btStopNotify() {
  if (State.btNotifyChar) {
    try {
      await State.btNotifyChar.stopNotifications();
    } catch {}
    State.btNotifyChar = null;
  }
  State.btNotifying = false;
  document.getElementById('btn-bt-notify').innerHTML = '<i data-lucide="activity"></i> Suscribir';
  document.getElementById('bt-notify-badge').style.display = 'none';
  lucide.createIcons();
  showToast('Suscripción detenida.');
}

// ── Bluetooth: Escribir característica ─────────────────
async function btWriteChar() {
  const serviceUUID = document.getElementById('bt-write-service').value.trim();
  const charUUID    = document.getElementById('bt-write-char').value.trim();
  const rawValue    = document.getElementById('bt-write-value').value;
  const format      = document.getElementById('bt-write-format').value;
  const statusEl    = document.getElementById('bt-write-status');

  if (!serviceUUID || !charUUID) {
    showToast('Completa los UUIDs de servicio y característica.', 'error');
    return;
  }
  if (!rawValue.trim()) {
    showToast('El campo de valor está vacío.', 'error');
    return;
  }
  if (!State.btServer || !State.btServer.connected) {
    showToast('No hay dispositivo conectado.', 'error');
    return;
  }

  // Construir el buffer de datos
  let buffer;
  try {
    buffer = buildWriteBuffer(rawValue, format);
  } catch (e) {
    showToast(`Formato inválido: ${e.message}`, 'error');
    return;
  }

  statusEl.className = 'status-card status-card--pending';
  statusEl.innerHTML = `<strong>↑ Enviando datos…</strong><br>${buffer.byteLength} bytes al dispositivo.`;

  try {
    const service = await State.btServer.getPrimaryService(normalizeUUID(serviceUUID));
    const char    = await service.getCharacteristic(normalizeUUID(charUUID));

    // Intentar writeValue o writeValueWithoutResponse
    if (char.properties.write) {
      await char.writeValue(buffer);
    } else if (char.properties.writeWithoutResponse) {
      await char.writeValueWithoutResponse(buffer);
    } else {
      throw new Error('Característica no permite escritura.');
    }

    statusEl.className = 'status-card status-card--success';
    statusEl.innerHTML = `<strong>✓ Datos enviados</strong><br>${buffer.byteLength} bytes escritos correctamente.`;
    showToast('Datos enviados al dispositivo BLE.', 'success');
    addToHistory({ type: 'bt-write', data: `[${getServiceName(serviceUUID)}/${charUUID.substring(0,8)}…] → ${rawValue.substring(0, 60)}` });

  } catch (err) {
    statusEl.className = 'status-card status-card--error';
    statusEl.innerHTML = `<strong>✗ Error al escribir</strong><br>${parseBTError(err)}`;
    showToast(parseBTError(err), 'error');
  }
}

// ── Bluetooth: Helpers ──────────────────────────────────
function buildWriteBuffer(value, format) {
  switch (format) {
    case 'text': {
      return new TextEncoder().encode(value);
    }
    case 'hex': {
      const hex = value.replace(/\s+/g, '');
      if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) {
        throw new Error('Hex inválido. Usa pares como: FF 0A 1B');
      }
      const arr = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        arr[i / 2] = parseInt(hex.substr(i, 2), 16);
      }
      return arr.buffer;
    }
    case 'uint8': {
      const nums = value.trim().split(/[\s,]+/).map(n => parseInt(n, 10));
      if (nums.some(n => isNaN(n) || n < 0 || n > 255)) {
        throw new Error('Valores fuera de rango 0-255.');
      }
      return new Uint8Array(nums).buffer;
    }
    default:
      return new TextEncoder().encode(value);
  }
}

function formatBTValue(dataView, serviceUUID, charUUID) {
  // Decodificación inteligente según la característica conocida
  const svcLow  = serviceUUID.toLowerCase();
  const charLow = charUUID.toLowerCase();

  // Nivel de batería (uint8)
  if (charLow.includes('2a19') || charLow === 'battery_level') {
    return `${dataView.getUint8(0)}%`;
  }
  // Frecuencia cardíaca
  if (charLow.includes('2a37') || charLow === 'heart_rate_measurement') {
    const flags = dataView.getUint8(0);
    const hr    = (flags & 0x01) ? dataView.getUint16(1, true) : dataView.getUint8(1);
    return `${hr} bpm`;
  }
  // Temperatura (IEEE 11073)
  if (charLow.includes('2a1c') || charLow === 'temperature_measurement') {
    try {
      const mantissa = ((dataView.getUint8(3) << 16) | (dataView.getUint8(2) << 8) | dataView.getUint8(1));
      const exp      = dataView.getInt8(4);
      return `${(mantissa * Math.pow(10, exp)).toFixed(2)} °C`;
    } catch { /* fallback */ }
  }

  // Intentar UTF-8 primero
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(dataView.buffer);
    if (text && /^[\x20-\x7E\n\r\t\u00C0-\u024F]+$/.test(text)) return text;
  } catch {}

  // Hex como fallback
  const bytes = new Uint8Array(dataView.buffer);
  const hex   = Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
  const dec   = Array.from(bytes).join(', ');
  return `HEX: ${hex}\nDEC: [${dec}]`;
}

function normalizeUUID(uuid) {
  // Si parece un nombre estándar (sin guiones ni hex puro), devuélvelo tal cual
  if (/^[a-z_]+$/.test(uuid)) return uuid;
  // UUID corto (4 hex) → expandir
  if (/^[0-9a-fA-F]{4}$/.test(uuid)) {
    return `0000${uuid.toLowerCase()}-0000-1000-8000-00805f9b34fb`;
  }
  return uuid.toLowerCase();
}

function getServiceName(uuid) {
  const map = {
    'battery_service':      'Batería',
    'device_information':   'Info dispositivo',
    'heart_rate':           'Frecuencia cardíaca',
    'health_thermometer':   'Termómetro',
    'generic_access':       'Acceso genérico',
    'generic_attribute':    'Atributo genérico',
  };
  if (map[uuid]) return map[uuid];
  // Intentar identificar por UUID corto
  const short = uuid.substring(4, 8).toLowerCase();
  const shortMap = {
    '180f': 'Batería',
    '180a': 'Info dispositivo',
    '180d': 'Frecuencia cardíaca',
    '1809': 'Termómetro',
    '1800': 'Acceso genérico',
    '1801': 'Atributo genérico',
    'ffe0': 'HM-10/HC-08 Serial',
    'fff0': 'BLE Serial genérico',
  };
  return shortMap[short] || uuid.substring(0, 8) + '…';
}

function parseBTError(err) {
  if (err.name === 'NotFoundError')       return 'No se encontraron dispositivos Bluetooth.';
  if (err.name === 'SecurityError')       return 'Permiso Bluetooth denegado por el navegador.';
  if (err.name === 'NetworkError')        return 'Error de conexión Bluetooth. ¿El dispositivo está encendido?';
  if (err.name === 'NotSupportedError')   return 'Operación no soportada por este dispositivo BLE.';
  if (err.name === 'InvalidStateError')   return 'El dispositivo no está conectado. Reconecta primero.';
  if (err.name === 'AbortError')          return 'Operación Bluetooth cancelada.';
  if (err.name === 'NotAllowedError')     return 'Permiso Bluetooth denegado. Actívalo en la configuración.';
  return err.message || 'Error Bluetooth desconocido.';
}

function showBtReadResult(text, svc, char) {
  document.getElementById('bt-read-content').textContent =
    `Servicio: ${getServiceName(svc)}\nCaract.: ${char.substring(0, 8)}…\n\n${text}`;
  document.getElementById('bt-read-result').className = 'result-card';
}

function btCopyResult() {
  navigator.clipboard.writeText(document.getElementById('bt-read-content').textContent)
    .then(() => showToast('Copiado al portapapeles', 'success'))
    .catch(() => showToast('No se pudo copiar', 'error'));
}

function btClearResult() {
  document.getElementById('bt-read-result').className = 'result-card result-card--hidden';
  if (State.btNotifying) btStopNotify();
}

function btSetPreset(key) {
  const p = BT_PRESETS[key];
  if (!p) return;
  document.getElementById('bt-read-service').value  = p.service;
  document.getElementById('bt-read-char').value     = p.char;
  document.getElementById('bt-write-service').value = p.service;
  document.getElementById('bt-write-char').value    = p.char;
  showToast(`Preset "${p.label}" cargado.`, 'success');
}

function onBtAcceptAllChange() {
  const checked  = document.getElementById('bt-accept-all').checked;
  const nameEl   = document.getElementById('bt-name-filter');
  const svcEl    = document.getElementById('bt-service-filter');
  nameEl.disabled = checked;
  svcEl.disabled  = checked;
  nameEl.style.opacity = checked ? '0.4' : '1';
  svcEl.style.opacity  = checked ? '0.4' : '1';
}

// ── NFC: Soporte / Tabs ─────────────────────────────────
function switchTab(name) {
  const tabs = ['write', 'read', 'bluetooth', 'history'];
  tabs.forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('tab-btn--active', t === name);
    document.getElementById(`tab-${t}`).setAttribute('aria-selected', t === name);
    const panel = document.getElementById(`panel-${t}`);
    if (t === name) {
      panel.classList.add('panel--active');
      panel.classList.remove('panel');
    } else {
      panel.classList.remove('panel--active');
      panel.classList.add('panel');
    }
  });
  if (name !== 'read' && State.nfcScanning) stopScan();
  lucide.createIcons();
}

// ── NFC: Byte counter ───────────────────────────────────
function updateByteCount() {
  const text  = document.getElementById('payload-input').value;
  const bytes = new TextEncoder().encode(text).length;
  const max   = 144;
  const fill  = document.getElementById('byte-fill');
  const count = document.getElementById('byte-count');

  fill.style.width = `${Math.min((bytes / max) * 100, 100)}%`;
  count.textContent = `${bytes} / ${max} bytes`;

  if (bytes > max * 0.85) {
    fill.classList.add('byte-fill--warn');
    count.style.color = 'var(--warning)';
  } else {
    fill.classList.remove('byte-fill--warn');
    count.style.color = '';
  }
}

// ── NFC: Presets ────────────────────────────────────────
function applyPreset(preset) {
  const ta = document.getElementById('payload-input');
  const rt = document.getElementById('record-type');
  switch (preset) {
    case 'rfid-id':
      ta.value = 'ID:RFID-001\nTipo: NTAG213\nSector: Almacén A\nFecha: ' + new Date().toLocaleDateString('es-MX');
      rt.value = 'text';
      showToast('Plantilla RFID ID cargada', '');
      break;
    case 'url':
      ta.value = 'https://ejemplo.com';
      rt.value = 'url';
      break;
    case 'vcard':
      ta.value = 'BEGIN:VCARD\nVERSION:3.0\nFN:Nombre Apellido\nTEL:+521234567890\nEMAIL:correo@ejemplo.com\nEND:VCARD';
      rt.value = 'mime';
      document.getElementById('mime-type').value = 'text/vcard';
      document.getElementById('mime-field').style.display = '';
      break;
    case 'text':
      ta.value = 'Hola desde NFC Toolkit';
      rt.value = 'text';
      break;
    case 'wifi':
      ta.value = 'WIFI:T:WPA;S:NombreRed;P:Contraseña;;';
      rt.value = 'text';
      break;
    default:
      ta.value = '';
  }
  updateByteCount();
}

function onRecordTypeChange() {
  const val = document.getElementById('record-type').value;
  document.getElementById('mime-field').style.display = val === 'mime' ? '' : 'none';
}

// ── NFC: Escritura ──────────────────────────────────────
function setupFormHandlers() {
  document.getElementById('write-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await writeToNFC();
  });
}

async function writeToNFC() {
  const payload    = document.getElementById('payload-input').value.trim();
  const recordType = document.getElementById('record-type').value;
  const mimeType   = document.getElementById('mime-type').value.trim() || 'application/octet-stream';
  const btnWrite   = document.getElementById('btn-write');

  if (!payload) { showToast('El campo de contenido está vacío.', 'error'); return; }

  const bytes = new TextEncoder().encode(payload).length;
  if (bytes > 144) {
    showToast(`Excede 144 bytes (${bytes} bytes). Reduce el contenido.`, 'error');
    return;
  }
  if (!State.nfcSupported) {
    showToast('Web NFC no disponible. Usa el simulador.', 'error');
    return;
  }

  setWriteStatus('pending', `<strong>✦ Esperando tarjeta NFC/RFID…</strong><br>Acerca el teléfono a la tarjeta.`);
  btnWrite.disabled = true;

  try {
    const ndef = new NDEFReader();
    let record;
    if (recordType === 'url') {
      record = { recordType: 'url', data: payload };
    } else if (recordType === 'mime') {
      record = { recordType: `mime/${mimeType}`, data: new TextEncoder().encode(payload) };
    } else {
      record = { recordType: 'text', data: payload, lang: 'es' };
    }

    await ndef.write({ records: [record] });

    setWriteStatus('success', `<strong>✓ Tarjeta NFC/RFID escrita</strong><br>${bytes} bytes grabados.`);
    showToast('¡Tarjeta NFC/RFID escrita!', 'success');
    addToHistory({ type: 'write', data: payload, bytes });

  } catch (err) {
    const msg = parseNFCError(err);
    setWriteStatus('error', `<strong>✗ Error al escribir</strong><br>${msg}`);
    showToast(msg, 'error');
  } finally {
    btnWrite.disabled = false;
  }
}

function setWriteStatus(type, html) {
  const el = document.getElementById('write-status');
  el.className = `status-card status-card--${type}`;
  el.innerHTML = html;
}

// ── NFC: Lectura ────────────────────────────────────────
async function startScan() {
  if (!State.nfcSupported) {
    showToast('Web NFC no disponible. Usa el simulador.', 'error');
    return;
  }
  if (State.nfcScanning) return;

  const btnScan = document.getElementById('btn-scan');
  const btnStop = document.getElementById('btn-stop-scan');

  try {
    State.abortCtrl = new AbortController();
    State.nfcReader = new NDEFReader();

    State.nfcReader.addEventListener('reading', ({ message, serialNumber }) => {
      handleNDEFMessage(message, serialNumber);
    });
    State.nfcReader.addEventListener('readingerror', () => {
      showToast('Error al leer la tarjeta. Intenta de nuevo.', 'error');
    });

    await State.nfcReader.scan({ signal: State.abortCtrl.signal });
    State.nfcScanning = true;

    btnScan.style.display = 'none';
    btnStop.style.display = '';

    document.getElementById('read-result').className = 'result-card result-card--hidden';

    const scanAnim = document.createElement('div');
    scanAnim.id    = 'scan-anim';
    scanAnim.className = 'scanning-anim';
    scanAnim.innerHTML = `
      <div class="scan-ring"></div>
      <div class="scan-ring"></div>
      <div class="scan-ring"></div>
      <svg class="scan-icon-center" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
        <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
        <circle cx="12" cy="20" r="1"/>
      </svg>`;
    btnStop.insertAdjacentElement('afterend', scanAnim);

    showToast('Escaneo activo. Acerca una tarjeta NFC o RFID HF.');
  } catch (err) {
    const msg = parseNFCError(err);
    showToast(msg, 'error');
    State.nfcScanning = false;
  }
}

function stopScan() {
  if (State.abortCtrl) State.abortCtrl.abort();
  State.nfcScanning = false;
  State.nfcReader   = null;

  document.getElementById('btn-scan').style.display = '';
  document.getElementById('btn-stop-scan').style.display = 'none';
  const anim = document.getElementById('scan-anim');
  if (anim) anim.remove();
  showToast('Escaneo detenido.');
}

function handleNDEFMessage(message, serialNumber) {
  const anim = document.getElementById('scan-anim');
  if (anim) anim.remove();

  const lines = [];
  if (serialNumber) lines.push(`Serial: ${serialNumber}`);

  message.records.forEach((record, i) => {
    lines.push(`— Registro ${i + 1} [${record.recordType}] —`);
    lines.push(decodeNDEFRecord(record));
  });

  const text = lines.join('\n');
  showReadResult(text);
  addToHistory({ type: 'read', data: text });
  showToast('¡Tarjeta NFC/RFID leída!', 'success');
}

function decodeNDEFRecord(record) {
  const decoder = new TextDecoder();
  switch (record.recordType) {
    case 'text': {
      const langLen = record.data.getUint8(0) & 0x3f;
      const raw = record.data.buffer.slice(1 + langLen);
      return decoder.decode(raw);
    }
    case 'url': {
      const prefixes = [
        '', 'http://www.', 'https://www.', 'http://', 'https://',
        'tel:', 'mailto:', 'ftp://anonymous:anonymous@', 'ftp://ftp.',
        'ftps://', 'sftp://', 'smb://', 'nfs://', 'ftp://', 'dav://',
        'news:', 'telnet://', 'imap:', 'rtsp://', 'urn:', 'pop:',
        'sip:', 'sips:', 'tftp:', 'btspp://', 'btl2cap://', 'btgoep://',
        'tcpobex://', 'irdaobex://', 'file://', 'urn:epc:id:',
        'urn:epc:tag:', 'urn:epc:pat:', 'urn:epc:raw:', 'urn:epc:',
        'urn:nfc:',
      ];
      const prefixByte = record.data.getUint8(0);
      const prefix = prefixes[prefixByte] || '';
      return prefix + decoder.decode(record.data.buffer.slice(1));
    }
    default: {
      try { return decoder.decode(record.data.buffer); }
      catch { return '(datos binarios no decodificables)'; }
    }
  }
}

function showReadResult(text) {
  const contentEl = document.getElementById('read-content');
  contentEl.textContent = text;
  document.getElementById('read-result').className = 'result-card';
  stopScan();
}

function clearReadResult() {
  document.getElementById('read-result').className = 'result-card result-card--hidden';
}

function copyReadResult() {
  navigator.clipboard.writeText(document.getElementById('read-content').textContent)
    .then(() => showToast('Copiado al portapapeles', 'success'))
    .catch(() => showToast('No se pudo copiar', 'error'));
}

// ── Simulador NFC ───────────────────────────────────────
function simulateRead() {
  const val = document.getElementById('sim-input').value.trim();
  if (!val) { showToast('Ingresa texto para simular.', 'error'); return; }
  switchTab('read');
  showReadResult(`[SIMULADO NFC/RFID]\n${val}`);
  addToHistory({ type: 'simulated', data: val });
  showToast('Lectura NFC/RFID simulada', 'success');
}

// ── Historial ───────────────────────────────────────────
function addToHistory(entry) {
  entry.ts = new Date().toISOString();
  State.history.unshift(entry);
  if (State.history.length > 50) State.history.pop();
  saveHistory();
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('history-list');
  if (!State.history.length) {
    list.innerHTML = '<p class="empty-state">No hay registros aún.</p>';
    return;
  }
  const typeLabel = {
    'write':       '✏️ NFC Escritura',
    'read':        '📡 NFC Lectura',
    'simulated':   '🔬 NFC Simulado',
    'bt-read':     '🔵 BT Lectura',
    'bt-write':    '🔵 BT Escritura',
    'bt-connect':  '🔵 BT Conexión',
  };
  const typeColor = {
    'write':       'var(--accent)',
    'read':        'var(--success)',
    'simulated':   'var(--warning)',
    'bt-read':     'var(--bt-color)',
    'bt-write':    'var(--bt-color-dim)',
    'bt-connect':  'var(--bt-color)',
  };
  list.innerHTML = State.history.map((e, i) => {
    const label = typeLabel[e.type] || '📋 Registro';
    const color = typeColor[e.type] || 'var(--accent)';
    const date  = new Date(e.ts).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    return `
      <div class="history-item" style="border-left-color:${color}">
        <div class="history-item-time">${label} · ${date}${e.bytes ? ` · ${e.bytes} bytes` : ''}</div>
        <div class="history-item-data">${escapeHTML(e.data)}</div>
      </div>`;
  }).join('');
}

function clearHistory() {
  if (!confirm('¿Borrar todo el historial?')) return;
  State.history = [];
  saveHistory();
  renderHistory();
  showToast('Historial borrado.');
}

function saveHistory() {
  try { localStorage.setItem('nfc_bt_history', JSON.stringify(State.history)); } catch {}
}

function loadHistory() {
  try {
    const raw = localStorage.getItem('nfc_bt_history') || localStorage.getItem('nfc_history');
    if (raw) State.history = JSON.parse(raw);
  } catch {}
  renderHistory();
}

// ── JSONBin Export ──────────────────────────────────────
async function exportToJsonBin() {
  const key      = document.getElementById('jsonbin-key').value.trim();
  const statusEl = document.getElementById('jsonbin-status');
  statusEl.style.display = '';

  if (!State.history.length) {
    showToast('No hay historial para exportar.', 'error');
    statusEl.style.display = 'none';
    return;
  }

  statusEl.style.cssText = 'display:block;background:var(--indigo-dim);border:1px solid var(--indigo);border-radius:var(--r-sm);color:var(--indigo);padding:12px 14px;';
  statusEl.textContent = 'Subiendo a JSONBin.io…';

  const headers = {
    'Content-Type': 'application/json',
    'X-Bin-Name':   `NFC-BT-Toolkit-${Date.now()}`,
    'X-Bin-Private': 'false',
  };
  if (key) headers['X-Master-Key'] = key;

  try {
    const endpoint = State.JSONBIN_ID ? `${State.JSONBIN_BASE}/${State.JSONBIN_ID}` : State.JSONBIN_BASE;
    const method   = State.JSONBIN_ID ? 'PUT' : 'POST';

    const res = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify({ app: 'NFC-BT-Toolkit', exported: new Date().toISOString(), history: State.history }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

    const binId = data.metadata?.id || State.JSONBIN_ID;
    if (binId) State.JSONBIN_ID = binId;

    statusEl.style.cssText = 'display:block;background:var(--success-dim);border:1px solid var(--success);border-radius:var(--r-sm);color:var(--success);padding:12px 14px;';
    statusEl.innerHTML = `✓ Exportado.<br>Bin ID: <code>${binId}</code><br><a href="https://jsonbin.io/b/${binId}" target="_blank" rel="noopener">Ver en JSONBin.io ↗</a>`;
    showToast('Historial exportado a JSONBin.io', 'success');

  } catch (err) {
    statusEl.style.cssText = 'display:block;background:var(--danger-dim);border:1px solid var(--danger);border-radius:var(--r-sm);color:var(--danger);padding:12px 14px;';
    statusEl.textContent = `Error: ${err.message}`;
    showToast('Error al exportar.', 'error');
  }
}

// ── Helpers generales ───────────────────────────────────
function parseNFCError(err) {
  if (err.name === 'NotAllowedError')   return 'Permiso NFC denegado. Actívalo en la configuración.';
  if (err.name === 'NotSupportedError') return 'NFC no soportado en este dispositivo/navegador.';
  if (err.name === 'NotReadableError')  return 'NFC ocupado. Cierra otras apps que usen NFC.';
  if (err.name === 'AbortError')        return 'Operación cancelada.';
  if (err.name === 'NetworkError')      return 'Error de red al acceder al NFC.';
  return err.message || 'Error desconocido.';
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let toastTimer = null;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast${type ? ` toast--${type}` : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast toast--hidden'; }, 3500);
}
