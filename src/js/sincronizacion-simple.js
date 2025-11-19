// ========== SINCRONIZACIÓN FIREBASE FIRESTORE ==========

let db = null;
let isFirebaseInitialized = false;

function getFirebaseConfig() {
  const saved = localStorage.getItem('firebase-config');
  if (saved) {
    return JSON.parse(saved);
  }
  return { apiKey: '', projectId: '', messagingSenderId: '', appId: '' };
}

function initFirebase() {
  const config = getFirebaseConfig();
  if (!config.apiKey || !config.projectId) {
    console.log('⚠️ Firebase no configurado');
    return false;
  }

  try {
    const firebaseConfig = {
      apiKey: config.apiKey,
      authDomain: config.projectId + '.firebaseapp.com',
      projectId: config.projectId,
      storageBucket: config.projectId + '.firebasestorage.app',
      messagingSenderId: config.messagingSenderId || '123456789',
      appId: config.appId || '1:123456789:web:abcdef123456'
    };

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    db = firebase.firestore();
    isFirebaseInitialized = true;
    console.log('✅ Firebase inicializado');
    return true;
  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error);
    return false;
  }
}

function setupAutoSync() {
  if (!isFirebaseInitialized) return;
  
  // Sincronización automática cada 30 segundos
  setInterval(() => {
    guardarJSON(true);
  }, 30000);
  
  // Guardar al cambiar de pestaña/cerrar
  window.addEventListener('beforeunload', () => {
    guardarJSON(true);
  });
  
  // Guardar al perder foco
  window.addEventListener('blur', () => {
    guardarJSON(true);
  });
}

function guardarConfigFirebase() {
  const apiKey = document.getElementById('firebase-apikey')?.value || '';
  const projectId = document.getElementById('firebase-projectid')?.value || '';
  const messagingSenderId = document.getElementById('firebase-messagingsenderid')?.value || '';
  const appId = document.getElementById('firebase-appid')?.value || '';
  
  if (!apiKey || !projectId) {
    mostrarAlerta('❌ Completa API Key y Project ID', 'error');
    return;
  }

  const config = { apiKey, projectId, messagingSenderId, appId };
  localStorage.setItem('firebase-config', JSON.stringify(config));
  
  if (initFirebase()) {
    mostrarAlerta('✅ Firebase configurado correctamente', 'success');
    setupAutoSync();
    setTimeout(() => extendsClassPull(), 1000);
  } else {
    mostrarAlerta('❌ Error en configuración', 'error');
  }
}

function probarConexionFirebase() {
  if (!initFirebase()) {
    mostrarStatusFirebase('❌ Firebase no configurado', 'error');
    return;
  }

  mostrarStatusFirebase('🔄 Probando Firebase...', 'info');

  db.collection('test').doc('connection').set({
    test: true,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    mostrarStatusFirebase('✅ Firebase conectado', 'success');
  }).catch((error) => {
    mostrarStatusFirebase('❌ Error: ' + error.message, 'error');
  });
}

function extendsClassPull() {
  if (!isFirebaseInitialized) {
    mostrarAlerta('⚠️ Firebase no disponible', 'warning');
    return;
  }

  db.collection('agenda').doc('data').get().then((doc) => {
    if (doc.exists) {
      const data = doc.data();
      console.log('📥 Sincronizado desde Firebase');
      procesarJSON(data);
      mostrarAlerta('✅ Datos sincronizados', 'success');
    } else {
      console.log('📝 Primera vez, creando datos');
      guardarJSON(true);
    }
  }).catch((error) => {
    console.error('Error:', error);
    mostrarAlerta('❌ Error: ' + error.message, 'error');
  });
}

function guardarJSON(silent = false) {
  if (!isFirebaseInitialized) {
    if (!silent) mostrarAlerta('⚠️ Firebase no disponible', 'warning');
    return false;
  }

  const dataToSave = {
    fecha: appState.agenda.fecha,
    dia_semana: appState.agenda.dia_semana,
    tareas_criticas: appState.agenda.tareas_criticas,
    tareas: appState.agenda.tareas,
    notas: appState.agenda.notas,
    citas: appState.agenda.citas || [],
    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
  };

  db.collection('agenda').doc('data').set(dataToSave).then(() => {
    if (!silent) {
      console.log('✅ Guardado en Firebase');
      mostrarAlerta('💾 Guardado automáticamente', 'success');
    }
  }).catch((error) => {
    if (!silent) {
      console.error('Error guardando:', error);
      mostrarAlerta('❌ Error: ' + error.message, 'error');
    }
  });

  return true;
}

function procesarJSON(data) {
  if (!data) return;
  
  appState.agenda.fecha = data.fecha || new Date().toISOString().slice(0, 10);
  appState.agenda.dia_semana = data.dia_semana || '';
  appState.agenda.tareas_criticas = data.tareas_criticas || [];
  appState.agenda.tareas = data.tareas || [];
  appState.agenda.notas = data.notas || '';
  appState.agenda.citas = data.citas || [];
  
  if (typeof renderizar === 'function') {
    renderizar();
  }
}

function mostrarStatusFirebase(mensaje, tipo) {
  const status = document.getElementById('extendsclass-status');
  if (!status) return;

  status.textContent = mensaje;
  status.style.display = 'block';

  if (tipo === 'success') {
    status.style.background = '#d4edda';
    status.style.color = '#155724';
  } else if (tipo === 'error') {
    status.style.background = '#f8d7da';
    status.style.color = '#721c24';
  } else {
    status.style.background = '#d1ecf1';
    status.style.color = '#0c5460';
  }

  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

function cargarConfiguracionesModal() {
  const visualConfig = JSON.parse(localStorage.getItem('config-visual') || '{}');
  const firebaseConfig = getFirebaseConfig();
  const googleConfig = getGoogleCalendarConfig();
  
  const temaEl = document.getElementById('config-tema-select');
  const nombreEl = document.getElementById('config-nombre-input');
  const apiKeyEl = document.getElementById('firebase-apikey');
  const projectIdEl = document.getElementById('firebase-projectid');
  const messagingSenderIdEl = document.getElementById('firebase-messagingsenderid');
  const appIdEl = document.getElementById('firebase-appid');
  const googleApiKeyEl = document.getElementById('google-apikey');
  const googleClientIdEl = document.getElementById('google-clientid');

  if (temaEl) temaEl.value = visualConfig.tema || 'claro';
  if (nombreEl) nombreEl.value = visualConfig.nombre || 'Pablo';
  if (apiKeyEl) apiKeyEl.value = firebaseConfig.apiKey || '';
  if (projectIdEl) projectIdEl.value = firebaseConfig.projectId || '';
  if (messagingSenderIdEl) messagingSenderIdEl.value = firebaseConfig.messagingSenderId || '';
  if (appIdEl) appIdEl.value = firebaseConfig.appId || '';
  if (googleApiKeyEl) googleApiKeyEl.value = googleConfig.apiKey || '';
  if (googleClientIdEl) googleClientIdEl.value = googleConfig.clientId || '';
}

function cambiarFraseMotivacional() {
  const frases = [
    "El éxito es la suma de pequeños esfuerzos repetidos día tras día",
    "Cada día es una nueva oportunidad para mejorar",
    "La disciplina es el puente entre metas y logros"
  ];
  
  const fraseEl = document.getElementById('frase-motivacional');
  if (fraseEl) {
    const nuevaFrase = frases[Math.floor(Math.random() * frases.length)];
    fraseEl.textContent = '"' + nuevaFrase + '"';
  }
}

function cargarConfigVisual() {
  const config = JSON.parse(localStorage.getItem('config-visual') || '{}');
  if (config.tema === 'oscuro') {
    document.body.classList.add('tema-oscuro');
  }
}

function toggleConfigFloating() {
  const modal = document.getElementById('modal-config');
  if (modal) {
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
    if (modal.style.display === 'block') {
      cargarConfiguracionesModal();
    }
  }
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.config-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.getElementById('tab-' + tabName)?.classList.add('active');
  event.target.classList.add('active');
}

function guardarConfigVisualPanel() {
  const tema = document.getElementById('config-tema-select')?.value || 'claro';
  const nombre = document.getElementById('config-nombre-input')?.value || 'Pablo';
  
  const config = { tema, nombre };
  localStorage.setItem('config-visual', JSON.stringify(config));
  
  document.body.classList.toggle('tema-oscuro', tema === 'oscuro');
  
  const titulo = document.getElementById('titulo-agenda');
  if (titulo) {
    titulo.textContent = '🧠 Agenda de ' + nombre + ' 🚆';
  }
  
  mostrarAlerta('✅ Configuración visual aplicada', 'success');
}

function guardarConfigOpciones() {
  const config = {
    forzarFecha: document.getElementById('config-forzar-fecha')?.checked || false,
    sinTactil: document.getElementById('config-sin-tactil')?.checked || false,
    mostrarTodo: document.getElementById('config-mostrar-todo')?.checked || false,
    botonesBorrar: document.getElementById('config-botones-borrar')?.checked || false
  };
  
  localStorage.setItem('config-opciones', JSON.stringify(config));
}

function verHistorial() {
  const data = JSON.stringify(appState.agenda, null, 2);
  const popup = window.open('', '_blank', 'width=800,height=600');
  popup.document.write(`
    <html><head><title>Historial JSON</title></head>
    <body style="font-family:monospace;padding:20px;">
      <h3>Historial de la Agenda</h3>
      <pre>${data}</pre>
    </body></html>
  `);
  mostrarAlerta('📜 Historial abierto en nueva ventana', 'success');
}

function hacerCopia() {
  const data = JSON.stringify(appState.agenda, null, 2);
  navigator.clipboard.writeText(data).then(() => {
    mostrarAlerta('📋 JSON copiado al portapapeles', 'success');
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = data;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    mostrarAlerta('📋 JSON copiado (fallback)', 'success');
  });
}

function abrirHistoricoTareas() {
  const total = appState.agenda.tareas.length + appState.agenda.tareas_criticas.length;
  const completadas = appState.agenda.tareas.filter(t => t.completada).length + 
                     appState.agenda.tareas_criticas.filter(t => t.completada).length;
  const pendientes = total - completadas;
  
  mostrarAlerta(`📊 Total: ${total} | Completadas: ${completadas} | Pendientes: ${pendientes}`, 'info');
}

function abrirGraficos() {
  const stats = {
    tareas: appState.agenda.tareas.length,
    criticas: appState.agenda.tareas_criticas.length,
    citas: appState.agenda.citas.length,
    completadas: appState.agenda.tareas.filter(t => t.completada).length + 
                appState.agenda.tareas_criticas.filter(t => t.completada).length
  };
  
  mostrarAlerta(`📈 Tareas: ${stats.tareas} | Críticas: ${stats.criticas} | Citas: ${stats.citas} | Completadas: ${stats.completadas}`, 'info');
}

function restaurarBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          // Validar estructura básica
          if (typeof data === 'object') {
            // Asegurar que existan las propiedades necesarias
            appState.agenda.fecha = data.fecha || new Date().toISOString().slice(0, 10);
            appState.agenda.dia_semana = data.dia_semana || '';
            appState.agenda.tareas_criticas = Array.isArray(data.tareas_criticas) ? data.tareas_criticas : [];
            appState.agenda.tareas = Array.isArray(data.tareas) ? data.tareas : [];
            appState.agenda.notas = data.notas || '';
            appState.agenda.citas = Array.isArray(data.citas) ? data.citas : [];
            appState.agenda.personas = Array.isArray(data.personas) ? data.personas : [];
            
            // Asegurar IDs únicos
            appState.agenda.tareas_criticas.forEach((tarea, i) => {
              if (!tarea.id) tarea.id = 'critica_' + Date.now() + '_' + i;
            });
            appState.agenda.tareas.forEach((tarea, i) => {
              if (!tarea.id) tarea.id = 'tarea_' + Date.now() + '_' + i;
            });
            appState.agenda.citas.forEach((cita, i) => {
              if (!cita.id) cita.id = 'cita_' + Date.now() + '_' + i;
            });
            
            renderizar();
            guardarJSON();
            mostrarAlerta('✅ JSON importado correctamente', 'success');
          } else {
            mostrarAlerta('❌ Formato de JSON inválido', 'error');
          }
        } catch (error) {
          mostrarAlerta('❌ Error: ' + error.message, 'error');
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

function crearBackupManual() {
  const data = JSON.stringify(appState.agenda, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'agenda-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  mostrarAlerta('💾 Backup descargado', 'success');
}

function activarNotificaciones() {
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        mostrarAlerta('🔔 Notificaciones activadas', 'success');
        localStorage.setItem('notificaciones-activas', 'true');
        iniciarRecordatorios();
      } else {
        mostrarAlerta('❌ Notificaciones denegadas', 'error');
      }
    });
  } else {
    mostrarAlerta('❌ Navegador no compatible', 'error');
  }
}

function enviarNotificacion(titulo, mensaje) {
  if (Notification.permission === 'granted') {
    new Notification(titulo, {
      body: mensaje,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🧠</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📋</text></svg>'
    });
  }
}

function iniciarRecordatorios() {
  if (localStorage.getItem('notificaciones-activas') !== 'true') return;
  
  // Revisar cada 30 minutos
  setInterval(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    
    // Tareas críticas de hoy
    const criticasHoy = appState.agenda.tareas_criticas.filter(t => 
      !t.completada && (t.fecha_fin === hoy || t.fecha_migrar === hoy)
    );
    
    if (criticasHoy.length > 0) {
      enviarNotificacion('🚨 Tareas Críticas', `Tienes ${criticasHoy.length} tareas críticas para hoy`);
    }
    
    // Citas próximas (próximas 2 horas)
    const ahora = new Date();
    const dosHoras = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
    
    const citasProximas = appState.agenda.citas.filter(cita => {
      if (!cita.fecha || !cita.hora) return false;
      const fechaCita = new Date(cita.fecha + 'T' + cita.hora + ':00');
      return fechaCita > ahora && fechaCita <= dosHoras;
    });
    
    if (citasProximas.length > 0) {
      const cita = citasProximas[0];
      enviarNotificacion('📅 Cita Próxima', `${cita.descripcion} a las ${cita.hora}`);
    }
  }, 30 * 60 * 1000); // 30 minutos
}

let gapi = null;
let isGoogleCalendarReady = false;

function initGoogleCalendar() {
  const script = document.createElement('script');
  script.src = 'https://apis.google.com/js/api.js';
  script.onload = () => {
    gapi = window.gapi;
    gapi.load('client:auth2', () => {
      const config = getGoogleCalendarConfig();
      if (config.apiKey && config.clientId) {
        gapi.client.init({
          apiKey: config.apiKey,
          clientId: config.clientId,
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
          scope: 'https://www.googleapis.com/auth/calendar'
        }).then(() => {
          isGoogleCalendarReady = true;
          console.log('✅ Google Calendar API lista');
        });
      }
    });
  };
  document.head.appendChild(script);
}

function getGoogleCalendarConfig() {
  const saved = localStorage.getItem('google-calendar-config');
  if (saved) {
    return JSON.parse(saved);
  }
  return { apiKey: '', clientId: '' };
}

function guardarConfigGoogleCalendar() {
  const apiKey = document.getElementById('google-apikey')?.value || '';
  const clientId = document.getElementById('google-clientid')?.value || '';
  
  if (!apiKey || !clientId) {
    mostrarAlerta('❌ Completa API Key y Client ID', 'error');
    return;
  }

  const config = { apiKey, clientId };
  localStorage.setItem('google-calendar-config', JSON.stringify(config));
  
  initGoogleCalendar();
  mostrarAlerta('✅ Google Calendar configurado', 'success');
}

function conectarGoogleCalendar() {
  if (!isGoogleCalendarReady) {
    mostrarAlerta('⚠️ Configura Google Calendar primero', 'warning');
    return;
  }
  
  gapi.auth2.getAuthInstance().signIn().then(() => {
    mostrarAlerta('✅ Conectado a Google Calendar', 'success');
    localStorage.setItem('google-calendar-connected', 'true');
  }).catch(error => {
    mostrarAlerta('❌ Error conectando: ' + error.error, 'error');
  });
}

function crearEventoGoogleCalendar(titulo, fecha, esUrgente = false) {
  if (!isGoogleCalendarReady || !gapi.auth2.getAuthInstance().isSignedIn.get()) {
    return; // Silencioso si no está configurado
  }
  
  const fechaInicio = fecha + 'T' + (esUrgente ? '09:00:00' : '10:00:00');
  const fechaFin = fecha + 'T' + (esUrgente ? '09:30:00' : '10:30:00');
  
  const evento = {
    summary: (esUrgente ? '🚨 ' : '✅ ') + titulo,
    start: {
      dateTime: fechaInicio,
      timeZone: 'Europe/Madrid'
    },
    end: {
      dateTime: fechaFin,
      timeZone: 'Europe/Madrid'
    },
    description: 'Creado desde Agenda Pablo',
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 10 }
      ]
    }
  };
  
  gapi.client.calendar.events.insert({
    calendarId: 'primary',
    resource: evento
  }).then(() => {
    console.log('📅 Evento creado en Google Calendar');
  }).catch(error => {
    console.error('Error creando evento:', error);
  });
}

function exportarGoogleCalendar() {
  let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Agenda Pablo//ES\n';
  
  // Exportar citas
  appState.agenda.citas.forEach(cita => {
    if (cita.fecha) {
      const fechaHora = cita.fecha.replace(/-/g, '') + 'T120000';
      icsContent += 'BEGIN:VEVENT\n';
      icsContent += `UID:${cita.id || Date.now()}@agenda-pablo\n`;
      icsContent += `DTSTART:${fechaHora}\n`;
      icsContent += `SUMMARY:${cita.nombre || 'Cita'}\n`;
      icsContent += `DESCRIPTION:Cita desde Agenda Pablo\n`;
      icsContent += 'END:VEVENT\n';
    }
  });
  
  // Exportar tareas críticas con fecha
  appState.agenda.tareas_criticas.forEach(tarea => {
    if (tarea.fecha_fin) {
      const fecha = tarea.fecha_fin.replace(/-/g, '') + 'T090000';
      icsContent += 'BEGIN:VEVENT\n';
      icsContent += `UID:critica-${tarea.id || Date.now()}@agenda-pablo\n`;
      icsContent += `DTSTART:${fecha}\n`;
      icsContent += `SUMMARY:🚨 ${tarea.titulo}\n`;
      icsContent += `DESCRIPTION:Tarea crítica desde Agenda Pablo\n`;
      icsContent += 'END:VEVENT\n';
    }
  });
  
  // Exportar tareas normales con fecha
  appState.agenda.tareas.forEach(tarea => {
    if (tarea.fecha_fin) {
      const fecha = tarea.fecha_fin.replace(/-/g, '') + 'T100000';
      icsContent += 'BEGIN:VEVENT\n';
      icsContent += `UID:tarea-${tarea.id || Date.now()}@agenda-pablo\n`;
      icsContent += `DTSTART:${fecha}\n`;
      icsContent += `SUMMARY:✅ ${tarea.texto}\n`;
      icsContent += `DESCRIPTION:Tarea desde Agenda Pablo\n`;
      icsContent += 'END:VEVENT\n';
    }
  });
  
  icsContent += 'END:VCALENDAR';
  
  const blob = new Blob([icsContent], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'agenda-pablo-' + new Date().toISOString().slice(0, 10) + '.ics';
  a.click();
  URL.revokeObjectURL(url);
  
  mostrarAlerta('📅 Archivo .ics descargado', 'success');
}

// Inicializar Firebase y sincronización
document.addEventListener('DOMContentLoaded', () => {
  const config = getFirebaseConfig();
  if (config.apiKey && config.projectId) {
    if (initFirebase()) {
      setupAutoSync();
      setTimeout(() => extendsClassPull(), 1000);
    }
  } else {
    console.log('💡 Configura Firebase en ⚙️ → Firebase');
  }
  
  // Iniciar notificaciones si están activadas
  if (localStorage.getItem('notificaciones-activas') === 'true') {
    iniciarRecordatorios();
  }
});

// Exports
window.getFirebaseConfig = getFirebaseConfig;
window.initFirebase = initFirebase;
window.setupAutoSync = setupAutoSync;
window.guardarConfigFirebase = guardarConfigFirebase;
window.probarConexionFirebase = probarConexionFirebase;
window.extendsClassPull = extendsClassPull;
window.guardarJSON = guardarJSON;
window.procesarJSON = procesarJSON;
window.mostrarStatusFirebase = mostrarStatusFirebase;
window.cargarConfigVisual = cargarConfigVisual;
window.toggleConfigFloating = toggleConfigFloating;
window.switchTab = switchTab;
window.guardarConfigVisualPanel = guardarConfigVisualPanel;
window.guardarConfigOpciones = guardarConfigOpciones;
window.verHistorial = verHistorial;
window.hacerCopia = hacerCopia;
window.abrirHistoricoTareas = abrirHistoricoTareas;
window.abrirGraficos = abrirGraficos;
window.restaurarBackup = restaurarBackup;
window.crearBackupManual = crearBackupManual;
window.activarNotificaciones = activarNotificaciones;
window.enviarNotificacion = enviarNotificacion;
window.iniciarRecordatorios = iniciarRecordatorios;
window.initGoogleCalendar = initGoogleCalendar;
window.getGoogleCalendarConfig = getGoogleCalendarConfig;
window.guardarConfigGoogleCalendar = guardarConfigGoogleCalendar;
window.conectarGoogleCalendar = conectarGoogleCalendar;
window.crearEventoGoogleCalendar = crearEventoGoogleCalendar;
window.exportarGoogleCalendar = exportarGoogleCalendar;
window.cargarConfiguracionesModal = cargarConfiguracionesModal;
window.cambiarFraseMotivacional = cambiarFraseMotivacional;
window.guardarConfigExtendsClass = guardarConfigFirebase;
window.probarConexionExtendsClass = probarConexionFirebase;