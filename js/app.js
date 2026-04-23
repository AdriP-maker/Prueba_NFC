/* ══════════════════════════════════════════
   NFC TOOLKIT — LÓGICA PRINCIPAL
   Web NFC API + Fallback Simulador
   JSONBin.io para persistencia cloud
══════════════════════════════════════════ */

'use strict';

// ── Estado global ───────────────────────
const State = {
  nfcSupported: false,
  nfcScanning:  false,
  nfcReader:    null,       // NDEFReader instance
  abortCtrl:    null,       // AbortController para detener escaneo
  history:      [],         // historial de lecturas
  JSONBIN_BASE: 'https://api.jsonbin.io/v3/b',
  JSONBIN_ID:   null,       // bin creado en esta sesión
};

// ── Init ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  loadHistory();
  checkNFCSupport();
  setupFormHandlers();
  document.getElementById('record-type').addEventListener('change', onRecordTypeChange);
});

// ── Soporte NFC ─────────────────────────
async function checkNFCSupport() {
  const badge      = document.getElementById('nfc-badge');
  const badgeLabel = document.getElementById('nfc-badge-label');
  const overlay    = document.getElementById('nfc-overlay');

  if ('NDEFReader' in window) {
    // API existe — aún necesita permiso en tiempo de ejecución
    State.nfcSupported = true;
    badge.className = 'badge badge--ok';
    badgeLabel.textContent = 'NFC disponible';
    overlay.classList.add('overlay--hidden');
  } else {
    State.nfcSupported = false;
    badge.className = 'badge badge--error';
    badgeLabel.textContent = 'Sin NFC';
    overlay.classList.remove('overlay--hidden');
    // El botón Write también se deshabilita
    document.getElementById('btn-write').disabled = true;
  }
  lucide.createIcons();
}

function dismissOverlay() {
  document.getElementById('nfc-overlay').classList.add('overlay--hidden');
}

// ── Tabs ────────────────────────────────
function switchTab(name) {
  ['write', 'read', 'history'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('tab-btn--active', t === name);
    document.getElementById(`tab-${t}`).setAttribute('aria-selected', t === name);
    const panel = document.getElementById(`panel-${t}`);
    panel.classList.toggle('panel--active', t === name);
    panel.classList.toggle('panel', t !== name);
    if (t !== name) panel.classList.remove('panel--active');
  });
  // Si salimos del panel read, paramos el escaneo
  if (name !== 'read' && State.nfcScanning) stopScan();
  lucide.createIcons();
}

// ── BYTE COUNTER ─────────────────────────
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

// ── PRESETS ──────────────────────────────
function applyPreset(preset) {
  const ta = document.getElementById('payload-input');
  const rt = document.getElementById('record-type');
  switch (preset) {
    case 'url':
      ta.value = 'https://ejemplo.com';
      rt.value = 'url';
      break;
    case 'vcard':
      ta.value =
        'BEGIN:VCARD\nVERSION:3.0\nFN:Nombre Apellido\nTEL:+521234567890\nEMAIL:correo@ejemplo.com\nEND:VCARD';
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
  const val  = document.getElementById('record-type').value;
  document.getElementById('mime-field').style.display = val === 'mime' ? '' : 'none';
}

// ── ESCRITURA NFC ─────────────────────────
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
  const statusEl   = document.getElementById('write-status');
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

  // UI: estado "esperando"
  setWriteStatus('pending', `<strong>✦ Esperando tarjeta NFC…</strong><br>Acerca el teléfono a la tarjeta NTAG213.`);
  btnWrite.disabled = true;

  try {
    const ndef = new NDEFReader();

    // Construir registro NDEF
    let record;
    if (recordType === 'url') {
      record = { recordType: 'url', data: payload };
    } else if (recordType === 'mime') {
      const encoder = new TextEncoder();
      record = { recordType: `mime/${mimeType}`, data: encoder.encode(payload) };
    } else {
      // texto plano
      record = { recordType: 'text', data: payload, lang: 'es' };
    }

    await ndef.write({ records: [record] });

    setWriteStatus('success', `<strong>✓ Tarjeta escrita correctamente</strong><br>${bytes} bytes grabados.`);
    showToast('¡Tarjeta NFC escrita con éxito!', 'success');
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

// ── LECTURA NFC ───────────────────────────
async function startScan() {
  if (!State.nfcSupported) {
    showToast('Web NFC no disponible. Usa el simulador.', 'error');
    return;
  }
  if (State.nfcScanning) return;

  const btnScan     = document.getElementById('btn-scan');
  const btnStop     = document.getElementById('btn-stop-scan');
  const readResult  = document.getElementById('read-result');

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

    // Mostrar animación de escaneo
    readResult.className = 'result-card result-card--hidden';
    const scanAnim = document.createElement('div');
    scanAnim.id = 'scan-anim';
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

    showToast('Escaneo activo. Acerca una tarjeta NFC.');

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

  const btnScan = document.getElementById('btn-scan');
  const btnStop = document.getElementById('btn-stop-scan');
  btnScan.style.display = '';
  btnStop.style.display = 'none';

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
  showToast('¡Tarjeta leída!', 'success');
}

function decodeNDEFRecord(record) {
  const decoder = new TextDecoder();
  switch (record.recordType) {
    case 'text': {
      // Registro tipo texto: saltar el byte de idioma
      const langLen = record.data.getUint8(0) & 0x3f;
      const raw = record.data.buffer.slice(1 + langLen);
      return decoder.decode(raw);
    }
    case 'url': {
      // Prefijo de URL
      const prefixes = [
        '', 'http://www.', 'https://www.', 'http://', 'https://',
        'tel:', 'mailto:', 'ftp://anonymous:anonymous@', 'ftp://ftp.',
        'ftps://', 'sftp://', 'smb://', 'nfs://', 'ftp://', 'dav://',
        'news:', 'telnet://', 'imap:', 'rtsp://', 'urn:', 'pop:',
        'sip:', 'sips:', 'tftp:', 'btspp://', 'btl2cap://', 'btgoep://',
        'tcpobex://', 'irdaobex://', 'file://', 'urn:epc:id:',
        'urn:epc:tag:', 'urn:epc:pat:', 'urn:epc:raw:', 'urn:epc:',
        'urn:nfc:'
      ];
      const prefixByte = record.data.getUint8(0);
      const prefix = prefixes[prefixByte] || '';
      const rest = decoder.decode(record.data.buffer.slice(1));
      return prefix + rest;
    }
    default: {
      try {
        return decoder.decode(record.data.buffer);
      } catch {
        return '(datos binarios no decodificables)';
      }
    }
  }
}

function showReadResult(text) {
  const resultCard = document.getElementById('read-result');
  const contentEl  = document.getElementById('read-content');
  contentEl.textContent = text;
  resultCard.className = 'result-card';

  // Parar escaneo automáticamente
  stopScan();
}

function clearReadResult() {
  document.getElementById('read-result').className = 'result-card result-card--hidden';
}

function copyReadResult() {
  const text = document.getElementById('read-content').textContent;
  navigator.clipboard.writeText(text)
    .then(() => showToast('Copiado al portapapeles', 'success'))
    .catch(() => showToast('No se pudo copiar', 'error'));
}

// ── SIMULADOR ─────────────────────────────
function simulateRead() {
  const val = document.getElementById('sim-input').value.trim();
  if (!val) { showToast('Ingresa texto para simular.', 'error'); return; }
  switchTab('read');
  showReadResult(`[SIMULADO]\n${val}`);
  addToHistory({ type: 'simulated', data: val });
  showToast('Lectura simulada', 'success');
}

// ── HISTORIAL ─────────────────────────────
function addToHistory(entry) {
  entry.ts = new Date().toISOString();
  State.history.unshift(entry);
  if (State.history.length > 50) State.history.pop();
  saveHistory();
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('history-list');
  if (State.history.length === 0) {
    list.innerHTML = '<p class="empty-state">No hay lecturas registradas aún.</p>';
    return;
  }
  list.innerHTML = State.history.map((e, i) => {
    const label = e.type === 'write' ? '✏️ Escritura' : e.type === 'simulated' ? '🔬 Simulado' : '📡 Lectura';
    const date  = new Date(e.ts).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    return `
      <div class="history-item" id="hist-${i}">
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
  try { localStorage.setItem('nfc_history', JSON.stringify(State.history)); } catch {}
}
function loadHistory() {
  try {
    const raw = localStorage.getItem('nfc_history');
    if (raw) State.history = JSON.parse(raw);
  } catch {}
  renderHistory();
}

// ── JSONBIN.IO EXPORT ─────────────────────
async function exportToJsonBin() {
  const key     = document.getElementById('jsonbin-key').value.trim();
  const statusEl = document.getElementById('jsonbin-status');
  statusEl.style.display = '';

  if (State.history.length === 0) {
    showToast('No hay historial para exportar.', 'error');
    statusEl.style.display = 'none';
    return;
  }

  statusEl.style.cssText = 'display:block; background:var(--indigo-dim); border:1px solid var(--indigo); border-radius:var(--r-sm); color:var(--indigo); padding:12px 14px;';
  statusEl.textContent = 'Subiendo a JSONBin.io…';

  const headers = {
    'Content-Type': 'application/json',
    'X-Bin-Name': `NFC-Toolkit-${Date.now()}`,
    'X-Bin-Private': 'false',
  };
  if (key) headers['X-Master-Key'] = key;

  try {
    const endpoint = State.JSONBIN_ID
      ? `${State.JSONBIN_BASE}/${State.JSONBIN_ID}`
      : State.JSONBIN_BASE;
    const method = State.JSONBIN_ID ? 'PUT' : 'POST';

    const res = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify({ app: 'NFC-Toolkit', exported: new Date().toISOString(), history: State.history }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

    const binId = data.metadata?.id || data.record?.metadata?.id || State.JSONBIN_ID;
    if (binId) State.JSONBIN_ID = binId;

    const url = `https://jsonbin.io/b/${binId}`;
    statusEl.style.cssText = 'display:block; background:var(--success-dim); border:1px solid var(--success); border-radius:var(--r-sm); color:var(--success); padding:12px 14px;';
    statusEl.innerHTML = `✓ Exportado con éxito.<br>Bin ID: <code>${binId}</code><br><a href="${url}" target="_blank" rel="noopener">Ver en JSONBin.io ↗</a>`;
    showToast('Historial exportado a JSONBin.io', 'success');

  } catch (err) {
    statusEl.style.cssText = 'display:block; background:var(--danger-dim); border:1px solid var(--danger); border-radius:var(--r-sm); color:var(--danger); padding:12px 14px;';
    statusEl.textContent = `Error: ${err.message}`;
    showToast('Error al exportar.', 'error');
  }
}

// ── HELPERS ───────────────────────────────
function parseNFCError(err) {
  if (err.name === 'NotAllowedError')   return 'Permiso NFC denegado. Actívalo en la configuración del navegador.';
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
