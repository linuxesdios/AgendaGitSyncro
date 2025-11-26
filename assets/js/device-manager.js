/**
 * Device Manager - Gestión de identificación de dispositivos
 * Genera y mantiene IDs únicos para cada dispositivo/navegador
 */

// Generar UUID v4
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Obtener o crear Device ID único
function getDeviceId() {
    const STORAGE_KEY = 'agenda_device_id';
    let deviceId = localStorage.getItem(STORAGE_KEY);

    if (!deviceId) {
        deviceId = generateUUID();
        localStorage.setItem(STORAGE_KEY, deviceId);
        console.log('✅ Nuevo Device ID generado:', deviceId);
    }

    return deviceId;
}

// Detectar información del dispositivo
function detectDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = 'Desktop';
    let browserName = 'Unknown';

    // Detectar tipo de dispositivo
    if (/mobile/i.test(ua)) {
        deviceType = 'Mobile';
    } else if (/tablet|ipad/i.test(ua)) {
        deviceType = 'Tablet';
    }

    // Detectar navegador
    if (ua.indexOf('Firefox') > -1) {
        browserName = 'Firefox';
    } else if (ua.indexOf('Edg') > -1) {
        browserName = 'Edge';
    } else if (ua.indexOf('Chrome') > -1) {
        browserName = 'Chrome';
    } else if (ua.indexOf('Safari') > -1) {
        browserName = 'Safari';
    }

    return {
        type: deviceType,
        browser: browserName,
        platform: navigator.platform || 'Unknown'
    };
}

// Obtener nombre descriptivo del dispositivo
function getDeviceName() {
    const STORAGE_KEY = 'agenda_device_name';
    let deviceName = localStorage.getItem(STORAGE_KEY);

    if (!deviceName) {
        const info = detectDeviceInfo();
        deviceName = `${info.browser} ${info.type}`;
        localStorage.setItem(STORAGE_KEY, deviceName);
    }

    return deviceName;
}

// Permitir al usuario personalizar el nombre del dispositivo
function setCustomDeviceName(customName) {
    const STORAGE_KEY = 'agenda_device_name';
    if (customName && customName.trim()) {
        localStorage.setItem(STORAGE_KEY, customName.trim());
        console.log('✅ Nombre de dispositivo personalizado:', customName);
        return true;
    }
    return false;
}

// Obtener metadata completo del dispositivo
function getDeviceMetadata() {
    return {
        deviceId: getDeviceId(),
        deviceName: getDeviceName(),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
    };
}

// Log de debug con información del dispositivo
console.log('📱 Device Manager cargado');
console.log('  Device ID:', getDeviceId());
console.log('  Device Name:', getDeviceName());
