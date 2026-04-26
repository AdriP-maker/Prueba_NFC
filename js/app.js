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

// Mapa completo: UUID corto (4 hex) → nombre legible del SERVICIO
const BLE_SERVICE_NAMES = {
  // ── Servicios estándar GATT (Bluetooth SIG) ──────────
  '1800': 'Acceso genérico',
  '1801': 'Atributo genérico',
  '1802': 'Alerta inmediata',
  '1803': 'Nivel de enlace (Link Loss)',
  '1804': 'Potencia de TX',
  '1805': 'Hora actual',
  '1806': 'Zona horaria DST',
  '1807': 'Hora por referencia',
  '1808': 'Glucosa (Glucose)',
  '1809': 'Termómetro de salud',
  '180a': 'Información del dispositivo',
  '180d': 'Frecuencia cardíaca',
  '180e': 'Teléfono de acceso (Phone Alert)',
  '180f': 'Batería',
  '1810': 'Presión arterial',
  '1811': 'Notificación de alerta',
  '1812': 'Interfaz de dispositivo humano (HID)',
  '1813': 'Registro de escaneo (Scan Parameters)',
  '1814': 'Cadencia velocidad de running',
  '1815': 'Automatización IO',
  '1816': 'Cadencia velocidad de ciclismo (CSC)',
  '1817': 'Potencia de ciclismo',
  '1818': 'Control de ciclismo (CPS)',
  '1819': 'Ubicación y navegación',
  '181a': 'Monitoreo ambiental',
  '181b': 'Composición corporal',
  '181c': 'Usuario de datos',
  '181d': 'Peso y escala corporal',
  '181e': 'Bond Management',
  '181f': 'Glucosa continua (CGM)',
  '1820': 'Protocolo de internet (IPSS)',
  '1821': 'Indoor Positioning',
  '1822': 'Pulse Oximeter',
  '1823': 'HTTP Proxy',
  '1824': 'Transport Discovery',
  '1825': 'Object Transfer',
  '1826': 'Fitness Machine',
  '1827': 'Mesh Provisioning',
  '1828': 'Mesh Proxy',
  '1829': 'Reconnection Configuration',
  '183a': 'Insulin Delivery',
  '183b': 'Binary Sensor',
  '183c': 'Emergency Configuration',
  '183e': 'Physical Activity Monitor',
  '1843': 'Audio Input Control',
  '1844': 'Volume Control',
  '1845': 'Volume Offset Control',
  '1846': 'Coordinated Set Identification',
  '1847': 'Media Control',
  '1848': 'Generic Media Control',
  '1849': 'Constant Tone Extension',
  '184a': 'Telephone Bearer',
  '184b': 'Generic Telephone Bearer',
  '184c': 'Microphone Control',
  '184d': 'Audio Stream Control',
  '184e': 'Broadcast Audio Announcement',
  '184f': 'Published Audio Capabilities',
  // ── Módulos Serial BLE más comunes ───────────────────
  'ffe0': 'HM-10 / HC-08 Serial',
  'ffe5': 'HM-10 Control',
  'fff0': 'BLE Serial genérico',
  'fff5': 'BLE UART genérico',
  'ffd0': 'Módulo BLE UART (CC2541)',
  'ffd5': 'Módulo BLE UART (CC2541) TX',
  'fee0': 'Xiaomi Mi Band (salud)',
  'fee7': 'Xiaomi Mi Band (data)',
  'feea': 'Tile Tracker',
  'fef5': 'Nordic DFU',
  // ── Nordic UART Service (NUS) ─────────────────────────
  '6e400001': 'Nordic UART Service (NUS)',
  // ── Espressif / ESP32 ─────────────────────────────────
  'abcd': 'ESP32 Custom Serial',
  // ── Apple ─────────────────────────────────────────────
  'fd44': 'Apple Continuity',
  'fd6f': 'Apple AirDrop / COVID',
  // ── Google ────────────────────────────────────────────
  'fe2c': 'Google Fast Pair',
  'fea0': 'Google Nearby',
  // ── Samsung ───────────────────────────────────────────
  'fd98': 'Samsung Galaxy Buds',
  // ── Fitbit ────────────────────────────────────────────
  'adab': 'Fitbit Service',
  // ── Otros populares ──────────────────────────────────
  'a8b3': 'Xiaomi Scale 2',
  'd0611e78': 'Apple AirPods',
};

// Mapa completo: UUID corto (4 hex) → nombre legible de CARACTERÍSTICA
const BLE_CHAR_NAMES = {
  // ── Características GATT estándar ────────────────────
  '2a00': 'Nombre del dispositivo',
  '2a01': 'Apariencia',
  '2a02': 'Privacidad periférica',
  '2a03': 'Dirección reconectable',
  '2a04': 'Parámetros de conexión preferidos',
  '2a05': 'Cambio de servicio',
  '2a06': 'Nivel de alerta',
  '2a07': 'Potencia de TX',
  '2a08': 'Fecha y hora',
  '2a09': 'Día de la semana',
  '2a0a': 'Fecha/hora del día',
  '2a0d': 'DST offset',
  '2a0e': 'Zona horaria',
  '2a0f': 'Hora local',
  '2a11': 'Hora por referencia',
  '2a12': 'Referencia de actualización de hora',
  '2a13': 'Fuente de hora',
  '2a14': 'Información de referencia de hora',
  '2a16': 'Intervalo de actualización de hora',
  '2a17': 'Tiempo con DST',
  '2a18': 'Medición de glucosa',
  '2a19': 'Nivel de batería (%)',
  '2a1c': 'Medición de temperatura',
  '2a1d': 'Tipo de temperatura',
  '2a1e': 'Temperatura intermedia',
  '2a21': 'Intervalo de medición',
  '2a22': 'Boot Keyboard Input Report',
  '2a23': 'System ID',
  '2a24': 'Número de modelo',
  '2a25': 'Número de serie',
  '2a26': 'Revisión de firmware',
  '2a27': 'Revisión de hardware',
  '2a28': 'Revisión de software',
  '2a29': 'Nombre del fabricante',
  '2a2a': 'Certificación IEEE 11073',
  '2a2b': 'Hora actual',
  '2a2c': 'Declinación magnética',
  '2a31': 'Scan Refresh',
  '2a32': 'Boot Keyboard Output Report',
  '2a33': 'Boot Mouse Input Report',
  '2a34': 'Contexto de glucosa',
  '2a35': 'Presión arterial',
  '2a36': 'Presión arterial intermedia',
  '2a37': 'Medición de frecuencia cardíaca',
  '2a38': 'Posición del sensor (cuerpo)',
  '2a39': 'Control de frecuencia cardíaca',
  '2a3f': 'Estado de alerta',
  '2a40': 'Categoría de alerta de nueva alerta',
  '2a41': 'Categoría de alerta no leída',
  '2a42': 'Nueva alerta',
  '2a43': 'Categoría de alerta no leída soportada',
  '2a44': 'Alert Notification Control Point',
  '2a45': 'Unread Alert Status',
  '2a46': 'New Alert',
  '2a47': 'Supported New Alert Category',
  '2a48': 'Supported Unread Alert Category',
  '2a49': 'Características de presión arterial',
  '2a4a': 'HID Info',
  '2a4b': 'Report Map (HID)',
  '2a4c': 'HID Control Point',
  '2a4d': 'HID Report',
  '2a4e': 'HID Protocol Mode',
  '2a4f': 'Scan Interval Window',
  '2a50': 'PnP ID',
  '2a51': 'Característica de glucosa',
  '2a52': 'Record Access Control Point (glucosa)',
  '2a53': 'Medición de velocidad de carrera',
  '2a54': 'Característica de velocidad de carrera',
  '2a55': 'SC Control Point',
  '2a56': 'Digital I/O',
  '2a58': 'Analog',
  '2a5a': 'Aggregate',
  '2a5b': 'Medición CSC (ciclismo)',
  '2a5c': 'Características CSC',
  '2a5d': 'Posición del sensor (ciclismo)',
  '2a5e': 'SpO2 (Oximetría)',
  '2a5f': 'Características Oxímetro',
  '2a63': 'Medición de potencia de ciclismo',
  '2a64': 'Vector de potencia de ciclismo',
  '2a65': 'Características de potencia de ciclismo',
  '2a66': 'CPS Control Point',
  '2a67': 'Datos de ubicación y velocidad',
  '2a68': 'Navegación',
  '2a69': 'Posición de calidad',
  '2a6a': 'LN Feature',
  '2a6b': 'LN Control Point',
  '2a6c': 'Elevación',
  '2a6d': 'Presión',
  '2a6e': 'Temperatura ambiente',
  '2a6f': 'Humedad relativa',
  '2a70': 'Verdadero Viento Velocidad',
  '2a71': 'Verdadero Viento Dirección',
  '2a72': 'Viento aparente velocidad',
  '2a73': 'Viento aparente dirección',
  '2a74': 'Ráfaga de viento',
  '2a75': 'Concentración de polvo fino (PM2.5)',
  '2a76': 'Polvo grueso (PM10)',
  '2a77': 'Irradiancia',
  '2a78': 'Lluvia',
  '2a79': 'Índice UV',
  '2a7a': 'Viento velocidad ráfaga',
  '2a7b': 'Día del año',
  '2a7d': 'Descriptor de valor (DSV)',
  '2a7e': 'Aerobic Heart Rate Lower Limit',
  '2a7f': 'Aerobic Threshold',
  '2a80': 'Age',
  '2a81': 'Anaerobic Heart Rate Lower Limit',
  '2a82': 'Anaerobic Heart Rate Upper Limit',
  '2a83': 'Anaerobic Threshold',
  '2a84': 'Aerobic Heart Rate Upper Limit',
  '2a85': 'Date of Birth',
  '2a86': 'Date of Threshold Assessment',
  '2a87': 'Email Address',
  '2a88': 'Fat Burn Heart Rate Lower Limit',
  '2a89': 'Fat Burn Heart Rate Upper Limit',
  '2a8a': 'First Name',
  '2a8b': 'Five Zone Heart Rate Limits',
  '2a8c': 'Gender',
  '2a8d': 'Heart Rate Max',
  '2a8e': 'Height',
  '2a8f': 'Hip Circumference',
  '2a90': 'Last Name',
  '2a91': 'Maximum Recommended Heart Rate',
  '2a92': 'Resting Heart Rate',
  '2a93': 'Sport Type',
  '2a94': 'Three Zone Heart Rate Limits',
  '2a95': 'Two Zone Heart Rate Limit',
  '2a96': 'VO2 Max',
  '2a97': 'Waist Circumference',
  '2a98': 'Weight',
  '2a99': 'Database Change Increment',
  '2a9a': 'User Index',
  '2a9b': 'Body Composition Feature',
  '2a9c': 'Body Composition Measurement',
  '2a9d': 'Weight Measurement',
  '2a9e': 'Weight Scale Feature',
  '2a9f': 'User Control Point',
  '2aa0': 'Magnetic Flux Density 2D',
  '2aa1': 'Magnetic Flux Density 3D',
  '2aa2': 'Language',
  '2aa3': 'Barometric Pressure Trend',
  '2aa4': 'Bond Management Control Point',
  '2aa5': 'Bond Management Feature',
  '2aa6': 'Central Address Resolution',
  '2aa7': 'CGM Measurement',
  '2aa8': 'CGM Feature',
  '2aa9': 'CGM Status',
  '2aaa': 'CGM Session Start Time',
  '2aab': 'CGM Session Run Time',
  '2aac': 'CGM Specific Ops Control Point',
  '2aad': 'Indoor Positioning Configuration',
  '2aae': 'Latitude',
  '2aaf': 'Longitude',
  '2ab0': 'Local North Coordinate',
  '2ab1': 'Local East Coordinate',
  '2ab2': 'Floor Number',
  '2ab3': 'Altitude',
  '2ab4': 'Uncertainty',
  '2ab5': 'Location Name',
  '2ab6': 'URI',
  '2ab7': 'HTTP Headers',
  '2ab8': 'HTTP Status Code',
  '2ab9': 'HTTP Entity Body',
  '2aba': 'HTTP Control Point',
  '2abb': 'HTTPS Security',
  '2abc': 'TDS Control Point',
  '2abd': 'OTS Feature',
  '2abe': 'Object Name',
  '2abf': 'Object Type',
  '2ac0': 'Object Size',
  '2ac1': 'Object First-Created',
  '2ac2': 'Object Last-Modified',
  '2ac3': 'Object ID',
  '2ac4': 'Object Properties',
  '2ac5': 'Object Action Control Point',
  '2ac6': 'Object List Control Point',
  '2ac7': 'Object List Filter',
  '2ac8': 'Object Changed',
  '2ac9': 'Resolvable Private Address Only',
  '2acb': 'Fitness Machine Feature',
  '2acc': 'Treadmill Data',
  '2acd': 'Cross Trainer Data',
  '2ace': 'Step Climber Data',
  '2acf': 'Stair Climber Data',
  '2ad0': 'Rower Data',
  '2ad1': 'Indoor Bike Data',
  '2ad2': 'Training Status',
  '2ad3': 'Supported Speed Range',
  '2ad4': 'Supported Inclination Range',
  '2ad5': 'Supported Resistance Level Range',
  '2ad6': 'Supported Heart Rate Range',
  '2ad7': 'Supported Power Range',
  '2ad8': 'Fitness Machine Control Point',
  '2ad9': 'Fitness Machine Status',
  '2ada': 'Mesh Provisioning Data In',
  '2adb': 'Mesh Provisioning Data Out',
  '2adc': 'Mesh Proxy Data In',
  '2add': 'Mesh Proxy Data Out',
  '2b1d': 'RC Feature',
  '2b1e': 'RC Settings',
  '2b1f': 'Reconnection Configuration Control Point',
  // ── Nordic UART ───────────────────────────────────────
  '6e400002': 'NUS TX (escribir)',
  '6e400003': 'NUS RX (notificaciones)',
  // ── HM-10 / HC-08 ─────────────────────────────────────
  'ffe1': 'HM-10 UART TX/RX',
  'ffe2': 'HM-10 UART (alt)',
  // ── BLE Serial genérico ───────────────────────────────
  'fff1': 'Serial Write',
  'fff2': 'Serial Read',
  'fff3': 'Serial Notify',
  'fff4': 'Serial Control',
  'fff6': 'Serial Data',
  // ── Xiaomi ────────────────────────────────────────────
  'ff01': 'Xiaomi Steps',
  'ff02': 'Xiaomi Activity',
  'ff03': 'Xiaomi Heart Rate',
  'ff06': 'Xiaomi Realtime Steps',
  // ── Sensores varios ───────────────────────────────────
  'aa01': 'Sensor IR (temperatura)',
  'aa02': 'Sensor Humedad',
  'aa03': 'Sensor Barómetro',
  'aa04': 'Sensor Giroscopio',
  'aa05': 'Sensor Acelerómetro',
  'aa06': 'Sensor Magnetómetro',
  'aa07': 'Sensor Óptico (luxómetro)',
  'aa08': 'Sensor Movimiento',
};

// Mapa de nombre canónico GATT → nombre legible
const BLE_GATT_NAME_MAP = {
  'battery_service':                'Batería',
  'device_information':             'Información del dispositivo',
  'heart_rate':                     'Frecuencia cardíaca',
  'health_thermometer':             'Termómetro de salud',
  'generic_access':                 'Acceso genérico',
  'generic_attribute':              'Atributo genérico',
  'immediate_alert':                'Alerta inmediata',
  'link_loss':                      'Pérdida de enlace',
  'tx_power':                       'Potencia de TX',
  'current_time':                   'Hora actual',
  'reference_time_update':          'Actualización de hora',
  'next_dst_change':                'Cambio DST',
  'glucose':                        'Glucosa',
  'cycling_speed_and_cadence':      'Velocidad y cadencia ciclismo',
  'automation_io':                  'Automatización IO',
  'cycling_power':                  'Potencia de ciclismo',
  'location_and_navigation':        'Ubicación y navegación',
  'environmental_sensing':          'Sensores ambientales',
  'body_composition':               'Composición corporal',
  'user_data':                      'Datos de usuario',
  'weight_scale':                   'Báscula de peso',
  'blood_pressure':                 'Presión arterial',
  'alert_notification':             'Notificación de alerta',
  'human_interface_device':         'Dispositivo HID (teclado/ratón)',
  'scan_parameters':                'Parámetros de escaneo',
  'running_speed_and_cadence':      'Velocidad y cadencia running',
  'fitness_machine':                'Máquina de fitness',
  'pulse_oximeter':                 'Oxímetro de pulso',
  'continuous_glucose_monitoring':  'Monitoreo glucosa continuo',
  'insulin_delivery':               'Suministro de insulina',
  'reconnection_configuration':     'Reconfiguración de reconexión',
  // Características estándar
  'battery_level':                  'Nivel de batería (%)',
  'heart_rate_measurement':         'Medición de frecuencia cardíaca',
  'body_sensor_location':           'Posición del sensor corporal',
  'heart_rate_control_point':       'Control frecuencia cardíaca',
  'temperature_measurement':        'Medición de temperatura',
  'temperature_type':               'Tipo de temperatura',
  'firmware_revision_string':       'Revisión de firmware',
  'hardware_revision_string':       'Revisión de hardware',
  'software_revision_string':       'Revisión de software',
  'manufacturer_name_string':       'Nombre del fabricante',
  'model_number_string':            'Número de modelo',
  'serial_number_string':           'Número de serie',
  'system_id':                      'System ID',
  'ieee_11073-20601_regulatory':    'Certificación IEEE 11073',
  'pnp_id':                         'PnP ID',
  'device_name':                    'Nombre del dispositivo',
  'appearance':                     'Apariencia',
  'gap_peripheral_preferred_connection_parameters': 'Parámetros de conexión preferidos',
};

const BT_PRESETS = {
  // ── Estándar GATT ──────────────────────────────────────
  battery: {
    service: 'battery_service',
    char:    'battery_level',
    label:   '🔋 Batería',
    group:   'Estándar',
  },
  device_name: {
    service: 'generic_access',
    char:    'device_name',
    label:   '📛 Nombre del dispositivo',
    group:   'Estándar',
  },
  device_info: {
    service: 'device_information',
    char:    'manufacturer_name_string',
    label:   '🏭 Fabricante',
    group:   'Estándar',
  },
  firmware: {
    service: 'device_information',
    char:    'firmware_revision_string',
    label:   '💾 Firmware',
    group:   'Estándar',
  },
  model: {
    service: 'device_information',
    char:    'model_number_string',
    label:   '🔢 Modelo',
    group:   'Estándar',
  },
  // ── Salud / Medical ────────────────────────────────────
  heart_rate: {
    service: 'heart_rate',
    char:    'heart_rate_measurement',
    label:   '❤️ Frec. cardíaca',
    group:   'Salud',
  },
  body_sensor: {
    service: 'heart_rate',
    char:    'body_sensor_location',
    label:   '📍 Posición sensor',
    group:   'Salud',
  },
  temp: {
    service: 'health_thermometer',
    char:    'temperature_measurement',
    label:   '🌡️ Temperatura',
    group:   'Salud',
  },
  blood_pressure: {
    service: 'blood_pressure',
    char:    '00002a35-0000-1000-8000-00805f9b34fb',
    label:   '💉 Presión arterial',
    group:   'Salud',
  },
  spo2: {
    service: 'pulse_oximeter',
    char:    '00002a5e-0000-1000-8000-00805f9b34fb',
    label:   '🫁 SpO2 / Oximetría',
    group:   'Salud',
  },
  glucose: {
    service: 'glucose',
    char:    '00002a18-0000-1000-8000-00805f9b34fb',
    label:   '🩸 Glucosa',
    group:   'Salud',
  },
  // ── Deporte / Fitness ──────────────────────────────────
  cycling_csc: {
    service: 'cycling_speed_and_cadence',
    char:    '00002a5b-0000-1000-8000-00805f9b34fb',
    label:   '🚴 Velocidad/Cadencia bici',
    group:   'Deporte',
  },
  cycling_power: {
    service: 'cycling_power',
    char:    '00002a63-0000-1000-8000-00805f9b34fb',
    label:   '⚡ Potencia ciclismo',
    group:   'Deporte',
  },
  running_csc: {
    service: 'running_speed_and_cadence',
    char:    '00002a53-0000-1000-8000-00805f9b34fb',
    label:   '🏃 Velocidad/Cadencia running',
    group:   'Deporte',
  },
  // ── Ambiente / IoT ─────────────────────────────────────
  humidity: {
    service: 'environmental_sensing',
    char:    '00002a6f-0000-1000-8000-00805f9b34fb',
    label:   '💧 Humedad',
    group:   'Ambiente',
  },
  pressure: {
    service: 'environmental_sensing',
    char:    '00002a6d-0000-1000-8000-00805f9b34fb',
    label:   '📊 Presión barométrica',
    group:   'Ambiente',
  },
  ambient_temp: {
    service: 'environmental_sensing',
    char:    '00002a6e-0000-1000-8000-00805f9b34fb',
    label:   '🌡️ Temp. ambiente',
    group:   'Ambiente',
  },
  uv_index: {
    service: 'environmental_sensing',
    char:    '00002a76-0000-1000-8000-00805f9b34fb',
    label:   '☀️ Índice UV',
    group:   'Ambiente',
  },
  // ── Módulos Serial BLE ─────────────────────────────────
  hm10: {
    service: '0000ffe0-0000-1000-8000-00805f9b34fb',
    char:    '0000ffe1-0000-1000-8000-00805f9b34fb',
    label:   '📡 HM-10 / HC-08',
    group:   'Módulos Serial',
  },
  nordic_nus: {
    service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    char:    '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
    label:   '📡 Nordic UART (NUS)',
    group:   'Módulos Serial',
  },
  ble_serial: {
    service: '0000fff0-0000-1000-8000-00805f9b34fb',
    char:    '0000fff1-0000-1000-8000-00805f9b34fb',
    label:   '📡 BLE Serial genérico',
    group:   'Módulos Serial',
  },
  // ── Wearables / Trackers ───────────────────────────────
  xiaomi_steps: {
    service: '0000fee0-0000-1000-8000-00805f9b34fb',
    char:    '00000007-0000-3512-2118-0009af100700',
    label:   '👟 Xiaomi Mi Band pasos',
    group:   'Wearables',
  },
  // ── Localización ──────────────────────────────────────
  location: {
    service: 'location_and_navigation',
    char:    '00002a67-0000-1000-8000-00805f9b34fb',
    label:   '📍 Ubicación y velocidad',
    group:   'Localización',
  },
};

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  loadHistory();
  checkNFCSupport();
  checkBTSupport();
  setupFormHandlers();
  populatePresetSelect();
  document.getElementById('record-type').addEventListener('change', onRecordTypeChange);
  document.getElementById('bt-accept-all').addEventListener('change', onBtAcceptAllChange);
});

function populatePresetSelect() {
  const sel = document.getElementById('bt-preset-select');
  if (!sel) return;
  // Agrupar por 'group'
  const groups = {};
  for (const [key, preset] of Object.entries(BT_PRESETS)) {
    const g = preset.group || 'Otros';
    if (!groups[g]) groups[g] = [];
    groups[g].push({ key, ...preset });
  }
  for (const [groupName, presets] of Object.entries(groups)) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = groupName;
    presets.forEach(p => {
      const opt = document.createElement('option');
      opt.value       = p.key;
      opt.textContent = p.label;
      optgroup.appendChild(opt);
    });
    sel.appendChild(optgroup);
  }
}

function btApplyPresetSelect() {
  const key = document.getElementById('bt-preset-select').value;
  if (!key) { showToast('Selecciona un preset primero.', 'error'); return; }
  btSetPreset(key);
}

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

  // Lista completa de servicios opcionales para poder acceder a ellos tras conectar
  const ALL_OPTIONAL_SERVICES = [
    // Estándar GATT por nombre
    'battery_service', 'device_information', 'heart_rate', 'health_thermometer',
    'generic_access', 'generic_attribute', 'immediate_alert', 'link_loss',
    'tx_power', 'current_time', 'glucose', 'blood_pressure', 'alert_notification',
    'human_interface_device', 'scan_parameters', 'running_speed_and_cadence',
    'cycling_speed_and_cadence', 'cycling_power', 'location_and_navigation',
    'environmental_sensing', 'body_composition', 'user_data', 'weight_scale',
    'automation_io', 'fitness_machine', 'pulse_oximeter',
    'continuous_glucose_monitoring', 'insulin_delivery',
    'reconnection_configuration', 'phone_alert_status',
    // Estándar GATT por UUID completo (Bluetooth SIG 0x18xx)
    '00001800-0000-1000-8000-00805f9b34fb',
    '00001801-0000-1000-8000-00805f9b34fb',
    '00001802-0000-1000-8000-00805f9b34fb',
    '00001803-0000-1000-8000-00805f9b34fb',
    '00001804-0000-1000-8000-00805f9b34fb',
    '00001805-0000-1000-8000-00805f9b34fb',
    '00001806-0000-1000-8000-00805f9b34fb',
    '00001807-0000-1000-8000-00805f9b34fb',
    '00001808-0000-1000-8000-00805f9b34fb',
    '00001809-0000-1000-8000-00805f9b34fb',
    '0000180a-0000-1000-8000-00805f9b34fb',
    '0000180d-0000-1000-8000-00805f9b34fb',
    '0000180e-0000-1000-8000-00805f9b34fb',
    '0000180f-0000-1000-8000-00805f9b34fb',
    '00001810-0000-1000-8000-00805f9b34fb',
    '00001811-0000-1000-8000-00805f9b34fb',
    '00001812-0000-1000-8000-00805f9b34fb',
    '00001813-0000-1000-8000-00805f9b34fb',
    '00001814-0000-1000-8000-00805f9b34fb',
    '00001815-0000-1000-8000-00805f9b34fb',
    '00001816-0000-1000-8000-00805f9b34fb',
    '00001818-0000-1000-8000-00805f9b34fb',
    '00001819-0000-1000-8000-00805f9b34fb',
    '0000181a-0000-1000-8000-00805f9b34fb',
    '0000181b-0000-1000-8000-00805f9b34fb',
    '0000181c-0000-1000-8000-00805f9b34fb',
    '0000181d-0000-1000-8000-00805f9b34fb',
    '0000181e-0000-1000-8000-00805f9b34fb',
    '0000181f-0000-1000-8000-00805f9b34fb',
    '00001820-0000-1000-8000-00805f9b34fb',
    '00001821-0000-1000-8000-00805f9b34fb',
    '00001822-0000-1000-8000-00805f9b34fb',
    '00001826-0000-1000-8000-00805f9b34fb',
    '0000183a-0000-1000-8000-00805f9b34fb',
    '0000183e-0000-1000-8000-00805f9b34fb',
    // Módulos Serial BLE más usados
    '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / HC-08
    '0000ffe5-0000-1000-8000-00805f9b34fb', // HM-10 control
    '0000fff0-0000-1000-8000-00805f9b34fb', // BLE Serial genérico
    '0000fff5-0000-1000-8000-00805f9b34fb',
    '0000ffd0-0000-1000-8000-00805f9b34fb', // CC2541
    '0000ffd5-0000-1000-8000-00805f9b34fb',
    // Nordic UART Service (NUS)
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    // Xiaomi Mi Band
    '0000fee0-0000-1000-8000-00805f9b34fb',
    '0000fee7-0000-1000-8000-00805f9b34fb',
    // TI SensorTag servicios
    'f000aa00-0451-4000-b000-000000000000', // IR Temperatura
    'f000aa10-0451-4000-b000-000000000000', // Acelerómetro
    'f000aa20-0451-4000-b000-000000000000', // Humedad
    'f000aa30-0451-4000-b000-000000000000', // Magnetómetro
    'f000aa40-0451-4000-b000-000000000000', // Barómetro
    'f000aa50-0451-4000-b000-000000000000', // Giroscopio
    'f000aa70-0451-4000-b000-000000000000', // Sensor óptico
    'f000aa80-0451-4000-b000-000000000000', // Movimiento
    'f000ac00-0451-4000-b000-000000000000', // IO
    // ESP32 / Arduino custom
    '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
    'beb5483e-36e1-4688-b7f5-ea07361b26a8',
    // Google Fast Pair
    '0000fe2c-0000-1000-8000-00805f9b34fb',
    // Apple
    '0000fd6f-0000-1000-8000-00805f9b34fb',
  ];

  if (acceptAll) {
    requestOptions.acceptAllDevices = true;
    requestOptions.optionalServices = ALL_OPTIONAL_SERVICES;
  } else {
    const filters = [];
    if (nameFilter)    filters.push({ namePrefix: nameFilter });
    if (serviceFilter) filters.push({ services: [normalizeUUID(serviceFilter)] });
    if (!filters.length) {
      requestOptions.acceptAllDevices = true;
      requestOptions.optionalServices = ALL_OPTIONAL_SERVICES;
    } else {
      requestOptions.filters = filters;
      requestOptions.optionalServices = ALL_OPTIONAL_SERVICES;
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
      const svcName  = getServiceName(uuid);
      const charList = chars.map(c => {
        const charName = getCharName(c.uuid);
        const props = Object.entries(c.properties)
          .filter(([, v]) => v)
          .map(([k]) => `<span class="prop-chip">${propLabel(k)}</span>`)
          .join('');
        return `
          <div class="bt-char-item" onclick="btFillFromService('${uuid}','${c.uuid}')">
            <div class="bt-char-info">
              <span class="bt-char-name">${charName}</span>
              <span class="bt-char-uuid">${c.uuid}</span>
            </div>
            <span class="bt-char-props">${props}</span>
          </div>`;
      }).join('');

      return `
        <div class="bt-service-item">
          <div class="bt-service-header">
            <i data-lucide="layers" style="width:13px;height:13px"></i>
            <span class="bt-svc-name">${svcName}</span>
            <span class="bt-svc-uuid">${uuid}</span>
          </div>
          ${charList || '<div class="bt-char-empty">Sin características accesibles</div>'}
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

// Traduce nombres de propiedades BLE a etiquetas legibles
function propLabel(prop) {
  const map = {
    read:                  'leer',
    write:                 'escribir',
    writeWithoutResponse:  'escribir(sin resp)',
    notify:                'notificar',
    indicate:              'indicar',
    broadcast:             'broadcast',
    authenticatedSignedWrites: 'firmado',
    reliableWrite:         'escritura fiable',
    writableAuxiliaries:   'aux. escribible',
  };
  return map[prop] || prop;
}

function formatBTValue(dataView, serviceUUID, charUUID) {
  const charLow = charUUID.toLowerCase().trim();
  const svcLow  = serviceUUID.toLowerCase().trim();

  // Extraer UUID corto (4 hex) desde cualquier formato
  const charShort = charLow.length === 36 ? charLow.substring(4, 8)
                  : charLow.length === 4   ? charLow
                  : charLow.substring(0, 4);
  const svcShort  = svcLow.length === 36  ? svcLow.substring(4, 8)
                  : svcLow.length === 4    ? svcLow
                  : svcLow.substring(0, 4);

  try {
    // ── Batería ───────────────────────────────────────────
    if (charShort === '2a19' || charLow === 'battery_level') {
      return `🔋 ${dataView.getUint8(0)}%`;
    }

    // ── Frecuencia cardíaca ───────────────────────────────
    if (charShort === '2a37' || charLow === 'heart_rate_measurement') {
      const flags = dataView.getUint8(0);
      const hr    = (flags & 0x01) ? dataView.getUint16(1, true) : dataView.getUint8(1);
      const ee    = (flags & 0x08) ? ` | Energía: ${dataView.getUint16((flags & 0x01) ? 3 : 2, true)} kJ` : '';
      return `❤️ ${hr} bpm${ee}`;
    }

    // ── Temperatura termómetro (IEEE 11073 FLOAT) ─────────
    if (charShort === '2a1c' || charLow === 'temperature_measurement') {
      const flags = dataView.getUint8(0);
      const mantBuf = dataView.getInt8(3) << 16 | dataView.getUint8(2) << 8 | dataView.getUint8(1);
      const exp     = dataView.getInt8(4);
      const celsius = mantBuf * Math.pow(10, exp);
      const unit    = (flags & 0x01) ? `${(celsius * 9/5 + 32).toFixed(2)} °F` : `${celsius.toFixed(2)} °C`;
      return `🌡️ ${unit}`;
    }

    // ── Temperatura ambiente (sint16, factor 0.01) ────────
    if (charShort === '2a6e') {
      return `🌡️ ${(dataView.getInt16(0, true) * 0.01).toFixed(2)} °C`;
    }

    // ── Humedad relativa (uint16, factor 0.01) ────────────
    if (charShort === '2a6f') {
      return `💧 ${(dataView.getUint16(0, true) * 0.01).toFixed(2)} %HR`;
    }

    // ── Presión barométrica (uint32, factor 0.1 Pa) ───────
    if (charShort === '2a6d') {
      const pa  = dataView.getUint32(0, true) * 0.1;
      const hpa = (pa / 100).toFixed(2);
      return `📊 ${hpa} hPa (${pa.toFixed(0)} Pa)`;
    }

    // ── Elevación (sint24, factor 0.01 m) ─────────────────
    if (charShort === '2a6c') {
      const raw = (dataView.getUint8(2) << 16) | (dataView.getUint8(1) << 8) | dataView.getUint8(0);
      const signed = raw > 0x7FFFFF ? raw - 0x1000000 : raw;
      return `⛰️ ${(signed * 0.01).toFixed(2)} m`;
    }

    // ── Índice UV (uint8) ─────────────────────────────────
    if (charShort === '2a76') {
      const uv = dataView.getUint8(0);
      const label = uv <= 2 ? 'Bajo' : uv <= 5 ? 'Moderado' : uv <= 7 ? 'Alto' : uv <= 10 ? 'Muy alto' : 'Extremo';
      return `☀️ UV ${uv} (${label})`;
    }

    // ── Concentración PM2.5 (uint16, µg/m³) ──────────────
    if (charShort === '2a75') {
      return `🌫️ PM2.5: ${dataView.getUint16(0, true)} µg/m³`;
    }

    // ── Presión arterial (sfloat x2 + pulse) ─────────────
    if (charShort === '2a35' || charLow === 'blood_pressure_measurement') {
      const flags    = dataView.getUint8(0);
      const systolic = sfloat(dataView, 1);
      const diastol  = sfloat(dataView, 3);
      const mean     = sfloat(dataView, 5);
      const unit     = (flags & 0x01) ? 'kPa' : 'mmHg';
      let out = `💉 ${systolic}/${diastol} (media: ${mean}) ${unit}`;
      if (flags & 0x04) out += ` | Pulso: ${sfloat(dataView, 14)} bpm`;
      return out;
    }

    // ── SpO2 (uint16 flags + uint16 SpO2 + uint16 HR) ────
    if (charShort === '2a5e') {
      const flags = dataView.getUint8(0);
      const spo2  = (flags & 0x01) ? `SpO2: ${dataView.getUint16(1, true) / 100}%` : `SpO2: ${dataView.getUint8(1)}%`;
      return `🫁 ${spo2}`;
    }

    // ── Glucosa ───────────────────────────────────────────
    if (charShort === '2a18') {
      const flags = dataView.getUint8(0);
      const unit  = (flags & 0x04) ? 'mg/dL' : 'mmol/L';
      const val   = sfloat(dataView, 10);
      return `🩸 Glucosa: ${val} ${unit}`;
    }

    // ── Velocidad y cadencia ciclismo (CSC) ──────────────
    if (charShort === '2a5b') {
      const flags = dataView.getUint8(0);
      let out = '🚴 ';
      let offset = 1;
      if (flags & 0x01) {
        const cumRev   = dataView.getUint32(offset, true); offset += 4;
        const lastEvt  = dataView.getUint16(offset, true); offset += 2;
        out += `Rev. rueda: ${cumRev} | Evento: ${lastEvt} `;
      }
      if (flags & 0x02) {
        const cumCrank = dataView.getUint16(offset, true); offset += 2;
        const lastCrank = dataView.getUint16(offset, true);
        out += `| Pedal: ${cumCrank} | Evento pedal: ${lastCrank}`;
      }
      return out;
    }

    // ── Potencia de ciclismo (sint16, Watts) ──────────────
    if (charShort === '2a63') {
      const flags = dataView.getUint8(0);
      const watts = dataView.getInt16(2, true);
      return `⚡ ${watts} W`;
    }

    // ── Velocidad/cadencia running (RSC) ──────────────────
    if (charShort === '2a53') {
      const flags   = dataView.getUint8(0);
      const speed   = (dataView.getUint16(1, true) * 1/256).toFixed(2);
      const cadence = dataView.getUint8(3);
      const stride  = (flags & 0x01) ? ` | Paso: ${dataView.getUint16(4, true) / 100} m` : '';
      const dist    = (flags & 0x02) ? ` | Dist: ${dataView.getUint32(6, true)} m` : '';
      return `🏃 ${speed} m/s | ${cadence} rpm${stride}${dist}`;
    }

    // ── Nombre del dispositivo / strings texto ─────────────
    if (['2a00','2a24','2a25','2a26','2a27','2a28','2a29','2a2a','device_name',
         'manufacturer_name_string','model_number_string','serial_number_string',
         'firmware_revision_string','hardware_revision_string','software_revision_string',
         'ieee_11073-20601_regulatory_certification_data_list'].includes(charShort) ||
        ['device_name','manufacturer_name_string','model_number_string',
         'serial_number_string','firmware_revision_string','hardware_revision_string',
         'software_revision_string'].includes(charLow)) {
      return new TextDecoder().decode(dataView.buffer);
    }

    // ── Fecha/Hora (year uint16, month, day, hours, min, sec uint8) ──
    if (charShort === '2a08' || charShort === '2a2b') {
      if (dataView.byteLength >= 7) {
        const yr  = dataView.getUint16(0, true);
        const mo  = dataView.getUint8(2);
        const d   = dataView.getUint8(3);
        const h   = dataView.getUint8(4);
        const min = dataView.getUint8(5);
        const s   = dataView.getUint8(6);
        return `📅 ${yr}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')} ${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      }
    }

    // ── System ID (uint40 + uint24) ───────────────────────
    if (charShort === '2a23' || charLow === 'system_id') {
      const bytes = new Uint8Array(dataView.buffer);
      const hex   = Array.from(bytes).map(b => b.toString(16).padStart(2,'0').toUpperCase()).join(':');
      return `🆔 ${hex}`;
    }

    // ── PnP ID ────────────────────────────────────────────
    if (charShort === '2a50' || charLow === 'pnp_id') {
      const source  = dataView.getUint8(0) === 1 ? 'Bluetooth SIG' : 'USB IF';
      const vendor  = dataView.getUint16(1, true).toString(16).toUpperCase().padStart(4,'0');
      const product = dataView.getUint16(3, true).toString(16).toUpperCase().padStart(4,'0');
      const version = dataView.getUint16(5, true);
      return `🔌 Fuente: ${source} | Vendor: 0x${vendor} | Producto: 0x${product} | Ver: ${version}`;
    }

    // ── Nivel de alerta (uint8: 0=sin alerta, 1=media, 2=alta) ──
    if (charShort === '2a06') {
      const levels = ['🔕 Sin alerta', '🔔 Alerta media', '🔊 Alerta alta'];
      return levels[dataView.getUint8(0)] || `Alerta: ${dataView.getUint8(0)}`;
    }

    // ── Potencia TX (int8 dBm) ────────────────────────────
    if (charShort === '2a07') {
      return `📶 TX Power: ${dataView.getInt8(0)} dBm`;
    }

    // ── Sensor de posición corporal (HR) ──────────────────
    if (charShort === '2a38' || charLow === 'body_sensor_location') {
      const pos = ['Otro','Pecho','Muñeca','Dedo','Mano','Lóbulo oreja','Pie'];
      return `📍 ${pos[dataView.getUint8(0)] || 'Desconocido'}`;
    }

    // ── Peso (uint16, factor 0.005 kg) ───────────────────
    if (charShort === '2a9d') {
      const kg = dataView.getUint16(1, true) * 0.005;
      return `⚖️ ${kg.toFixed(3)} kg`;
    }

    // ── Composición corporal (múltiples campos) ───────────
    if (charShort === '2a9c') {
      const flags = dataView.getUint16(0, true);
      const fat   = dataView.getUint16(2, true) * 0.1;
      return `🧬 Grasa corporal: ${fat.toFixed(1)}%`;
    }

    // ── Datos de máquina fitness (bicicleta estática) ─────
    if (charShort === '2ad2') {
      const b0  = dataView.getUint8(0);
      const statusMap = [
        'Otro','Idle','En espera','En uso',
        'Pausa','Error','Fitness Check','Session Ended',
      ];
      return `🏋️ Estado: ${statusMap[b0] || b0}`;
    }

    // ── Treadmill Data ────────────────────────────────────
    if (charShort === '2acc') {
      const speed = dataView.getUint16(2, true) * 0.01;
      return `🏃 Cinta: ${speed.toFixed(2)} km/h`;
    }

    // ── Indoor Bike Data ──────────────────────────────────
    if (charShort === '2ad2') {
      const speed = dataView.getUint16(2, true) * 0.01;
      return `🚴 Bici indoor: ${speed.toFixed(2)} km/h`;
    }

    // ── Latitud / Longitud (sint32, factor 1e-7) ──────────
    if (charShort === '2aae') {
      return `🌍 Lat: ${(dataView.getInt32(0, true) * 1e-7).toFixed(7)}°`;
    }
    if (charShort === '2aaf') {
      return `🌍 Lon: ${(dataView.getInt32(0, true) * 1e-7).toFixed(7)}°`;
    }

    // ── Altitud (uint16, factor 0.125 m) ─────────────────
    if (charShort === '2ab3') {
      return `⛰️ ${(dataView.getUint16(0, true) * 0.125).toFixed(3)} m`;
    }

    // ── Flujo magnético 2D ────────────────────────────────
    if (charShort === '2aa0') {
      const x = dataView.getInt16(0, true) * 1e-7;
      const y = dataView.getInt16(2, true) * 1e-7;
      return `🧲 X: ${x.toFixed(7)} T | Y: ${y.toFixed(7)} T`;
    }

    // ── Módulos serial BLE (HM-10, Nordic NUS, genéricos) ─
    if (['ffe1','ffe2','fff1','fff2','fff3','fff6',
         '6e400002','6e400003'].includes(charShort) ||
        charLow.includes('ffe1') || charLow.includes('fff1') ||
        charLow.includes('6e400002') || charLow.includes('6e400003')) {
      // Primero intentar texto
      try {
        const t = new TextDecoder('utf-8', { fatal: true }).decode(dataView.buffer);
        if (/^[\x09\x0A\x0D\x20-\x7E\u00C0-\u024F]+$/.test(t)) return `📡 "${t}"`;
      } catch {}
      // Si no es texto: mostrar HEX + ASCII
      return formatHexAscii(dataView);
    }

    // ── Apariencia del dispositivo (uint16) ───────────────
    if (charShort === '2a01' || charLow === 'appearance') {
      return `🎭 ${getAppearanceName(dataView.getUint16(0, true))}`;
    }

    // ── Fallback: intentar texto UTF-8 primero ─────────────
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(dataView.buffer);
      if (text && /^[\x09\x0A\x0D\x20-\x7E\u00C0-\u024F\u00A0-\u02AF]+$/.test(text)) {
        return text;
      }
    } catch {}

    // ── Fallback final: HEX + ASCII ───────────────────────
    return formatHexAscii(dataView);

  } catch (e) {
    // Si algo explota durante el decode, caer a HEX seguro
    return formatHexAscii(dataView);
  }
}

// Formatea bytes como HEX + ASCII printable
function formatHexAscii(dataView) {
  const bytes   = new Uint8Array(dataView.buffer);
  const hex     = Array.from(bytes).map(b => b.toString(16).padStart(2,'0').toUpperCase()).join(' ');
  const ascii   = Array.from(bytes).map(b => (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : '.').join('');
  const dec     = Array.from(bytes).join(', ');
  return `HEX: ${hex}\nASCII: ${ascii}\nDEC: [${dec}]`;
}

// Decodifica SFLOAT BLE (IEEE 11073)
function sfloat(dv, offset) {
  const raw = dv.getUint16(offset, true);
  let mantissa = raw & 0x0FFF;
  let exp      = raw >> 12;
  if (exp >= 0x0008) exp -= 0x0010;
  if (mantissa >= 0x0800) mantissa -= 0x1000;
  if (mantissa === 0x07FF || mantissa === 0x0800 || mantissa === 0x07FE) return NaN;
  return (mantissa * Math.pow(10, exp)).toFixed(2);
}

// Tabla de apariencias BLE (subset más comunes)
function getAppearanceName(code) {
  const map = {
    0:    'Desconocida',
    64:   'Teléfono',
    128:  'Computadora',
    192:  'Reloj',
    193:  'Reloj deportivo',
    256:  'Pantalla',
    320:  'Control remoto',
    384:  'Sensor de ojo',
    448:  'Dispositivo médico',
    512:  'Termómetro',
    576:  'Monitor de corazón',
    640:  'Báscula de peso',
    704:  'Presión arterial',
    768:  'HID genérico',
    832:  'Teclado',
    833:  'Ratón',
    834:  'Joystick',
    835:  'Gamepad',
    836:  'Tableta digitalizadora',
    837:  'Lector de tarjetas',
    838:  'Lápiz digital',
    839:  'Escáner de código de barras',
    896:  'Glucómetro',
    960:  'Oxímetro de pulso (dedo)',
    961:  'Oxímetro de pulso (muñeca)',
    1024: 'Dispositivo de running',
    1088: 'Ciclismo (velocidad)',
    1089: 'Ciclismo (cadencia)',
    1090: 'Ciclismo (velocidad y cadencia)',
    1091: 'Ciclismo (potencia)',
    3136: 'Sensor genérico',
    3137: 'Sensor de movimiento',
    3138: 'Sensor de aire',
    3139: 'Temperatura',
    3140: 'Humedad',
    3141: 'Barómetro',
    3142: 'Sensor de presencia',
    3143: 'Velocidad del viento',
    5184: 'Audífonos / Auriculares',
    5185: 'Altavoz Bluetooth',
    5186: 'Auriculares externos',
    5696: 'Caminadora (Treadmill)',
    5697: 'Elíptica',
    5698: 'Escaladora',
    5699: 'Bicicleta estática',
    5700: 'Máquina de remo',
  };
  return map[code] || `Código 0x${code.toString(16).toUpperCase()}`;
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
  if (!uuid) return 'Servicio desconocido';
  const u = uuid.toLowerCase().trim();

  // 1. Nombre canónico GATT (ej: 'battery_service')
  if (BLE_GATT_NAME_MAP[u]) return BLE_GATT_NAME_MAP[u];

  // 2. UUID corto de 4 caracteres (ej: 'ffe0')
  if (BLE_SERVICE_NAMES[u]) return BLE_SERVICE_NAMES[u];

  // 3. UUID largo completo (ej: '0000180f-0000-1000-8000-00805f9b34fb')
  //    → extraer los 4 dígitos del segmento corto (posición 4-8)
  if (u.length === 36 && u.includes('-')) {
    const short4 = u.substring(4, 8);
    if (BLE_SERVICE_NAMES[short4]) return BLE_SERVICE_NAMES[short4];
    // UUID no estándar (vendor): mostrar prefijo legible
    const prefix = u.substring(0, 8).toUpperCase();
    return `Servicio propietario (${prefix}…)`;
  }

  // 4. UUID corto de 8 caracteres (ej: '6e400001')
  if (u.length === 8) {
    const short4 = u.substring(4, 8);
    if (BLE_SERVICE_NAMES[short4]) return BLE_SERVICE_NAMES[short4];
    if (BLE_SERVICE_NAMES[u]) return BLE_SERVICE_NAMES[u];
    return `Servicio propietario (${u.toUpperCase()})`;
  }

  return `Desconocido (${u.substring(0, 8).toUpperCase()}…)`;
}

function getCharName(uuid) {
  if (!uuid) return 'Característica desconocida';
  const u = uuid.toLowerCase().trim();

  // 1. Nombre canónico GATT (ej: 'battery_level')
  if (BLE_GATT_NAME_MAP[u]) return BLE_GATT_NAME_MAP[u];

  // 2. UUID corto de 4 caracteres
  if (BLE_CHAR_NAMES[u]) return BLE_CHAR_NAMES[u];

  // 3. UUID largo → extraer short
  if (u.length === 36 && u.includes('-')) {
    const short4 = u.substring(4, 8);
    if (BLE_CHAR_NAMES[short4]) return BLE_CHAR_NAMES[short4];
    // Comprobar también los 8 primeros dígitos para UUIDs vendor
    const short8 = u.substring(0, 8).replace(/-/g, '');
    if (BLE_CHAR_NAMES[short8]) return BLE_CHAR_NAMES[short8];
    return `Característica propietaria (${u.substring(0,8).toUpperCase()}…)`;
  }

  return `Carct. desconocida (${u.substring(0, 8).toUpperCase()})`;
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
    `Servicio:  ${getServiceName(svc)}\nCaract.:   ${getCharName(char)}\nUUID Svc:  ${svc}\nUUID Char: ${char}\n\n${text}`;
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
