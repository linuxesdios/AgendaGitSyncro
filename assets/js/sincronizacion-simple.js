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

  Promise.all([
    db.collection('tareas').doc('data').get(),
    db.collection('citas').doc('data').get(),
    db.collection('notas').doc('data').get(),
    db.collection('sentimientos').doc('data').get()
  ]).then(([tareasDoc, citasDoc, notasDoc, sentimientosDoc]) => {
    const data = {
      tareas_criticas: tareasDoc.exists ? (tareasDoc.data().tareas_criticas || []) : [],
      tareas: tareasDoc.exists ? (tareasDoc.data().tareas || []) : [],
      citas: citasDoc.exists ? (citasDoc.data().citas || []) : [],
      notas: notasDoc.exists ? (notasDoc.data().notas || '') : '',
      sentimientos: sentimientosDoc.exists ? (sentimientosDoc.data().sentimientos || '') : ''
    };
    
    console.log('📥 Sincronizado desde Firebase');
    procesarJSON(data);
    mostrarAlerta('✅ Datos sincronizados', 'success');
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

  // Guardar en colecciones separadas
  const batch = db.batch();
  
  // Tareas
  const tareasRef = db.collection('tareas').doc('data');
  batch.set(tareasRef, {
    tareas_criticas: appState.agenda.tareas_criticas || [],
    tareas: appState.agenda.tareas || [],
    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  // Citas
  const citasRef = db.collection('citas').doc('data');
  batch.set(citasRef, {
    citas: appState.agenda.citas || [],
    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  // Notas
  const notasRef = db.collection('notas').doc('data');
  batch.set(notasRef, {
    notas: appState.agenda.notas || '',
    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  // Sentimientos
  const sentimientosRef = db.collection('sentimientos').doc('data');
  batch.set(sentimientosRef, {
    sentimientos: appState.agenda.sentimientos || '',
    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
  });

  batch.commit().then(() => {
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
  appState.agenda.sentimientos = data.sentimientos || '';
  appState.agenda.citas = data.citas || [];
  
  // Actualizar textarea de notas
  const notasEl = document.getElementById('notas-texto');
  if (notasEl && appState.agenda.notas) {
    notasEl.value = appState.agenda.notas;
    autoResizeTextarea(notasEl);
  }
  
  // Actualizar textarea de sentimientos
  const sentimientosEl = document.getElementById('sentimientos-texto');
  if (sentimientosEl && appState.agenda.sentimientos) {
    sentimientosEl.value = appState.agenda.sentimientos;
    autoResizeTextarea(sentimientosEl);
  }
  
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
  
  const temaEl = document.getElementById('config-tema-select');
  const nombreEl = document.getElementById('config-nombre-input');
  const frasesEl = document.getElementById('config-frases-motivacionales');
  const popupCelebracionEl = document.getElementById('config-popup-celebracion');
  const mostrarNotasEl = document.getElementById('config-mostrar-notas');
  const mostrarSentimientosEl = document.getElementById('config-mostrar-sentimientos');
  const apiKeyEl = document.getElementById('firebase-apikey');
  const projectIdEl = document.getElementById('firebase-projectid');
  const messagingSenderIdEl = document.getElementById('firebase-messagingsenderid');
  const appIdEl = document.getElementById('firebase-appid');

  if (temaEl) temaEl.value = visualConfig.tema || 'verde';
  if (nombreEl) nombreEl.value = visualConfig.nombre || 'Pablo';
  if (frasesEl) frasesEl.value = (visualConfig.frases || []).join('\n');
  if (popupCelebracionEl) popupCelebracionEl.checked = visualConfig.popupCelebracion !== false;
  if (mostrarNotasEl) mostrarNotasEl.checked = visualConfig.mostrarNotas !== false;
  if (mostrarSentimientosEl) mostrarSentimientosEl.checked = visualConfig.mostrarSentimientos !== false;
  if (apiKeyEl) apiKeyEl.value = firebaseConfig.apiKey || '';
  if (projectIdEl) projectIdEl.value = firebaseConfig.projectId || '';
  if (messagingSenderIdEl) messagingSenderIdEl.value = firebaseConfig.messagingSenderId || '';
  if (appIdEl) appIdEl.value = firebaseConfig.appId || '';
  
  // Cargar configuraciones funcionales
  cargarConfigFuncionales();
  
  // Cargar etiquetas
  renderizarListaEtiquetas('etiquetas-tareas-lista', 'tareas');
  renderizarListaEtiquetas('etiquetas-citas-lista', 'citas');
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
  const tema = config.tema || 'verde';
  document.body.classList.add('tema-' + tema);
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
  // Limpiar pestañas activas
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.config-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Activar nueva pestaña
  const newTab = document.getElementById('tab-' + tabName);
  if (newTab) {
    newTab.classList.add('active');
  }
  
  // Activar botón de pestaña
  if (event && event.target) {
    event.target.classList.add('active');
  }
}

function guardarConfigVisualPanel() {
  const tema = document.getElementById('config-tema-select')?.value || 'verde';
  const nombre = document.getElementById('config-nombre-input')?.value || 'Pablo';
  const frasesTexto = document.getElementById('config-frases-motivacionales')?.value || '';
  const popupCelebracion = document.getElementById('config-popup-celebracion')?.checked || false;
  const mostrarNotas = document.getElementById('config-mostrar-notas')?.checked !== false;
  const mostrarSentimientos = document.getElementById('config-mostrar-sentimientos')?.checked !== false;
  
  // Procesar frases (una por línea, filtrar vacías)
  const frases = frasesTexto.split('\n')
    .map(f => f.trim())
    .filter(f => f.length > 0);
  
  const config = { tema, nombre, frases, popupCelebracion, mostrarNotas, mostrarSentimientos };
  localStorage.setItem('config-visual', JSON.stringify(config));
  
  // Aplicar tema
  document.body.classList.remove('modo-oscuro', 'tema-verde', 'tema-azul', 'tema-amarillo');
  document.body.classList.add('tema-' + tema);
  
  // Actualizar título
  const titulo = document.getElementById('titulo-agenda');
  if (titulo) {
    titulo.textContent = '🧠 Agenda de ' + nombre + ' 😊';
  }
  
  // Mostrar/ocultar secciones
  aplicarVisibilidadSecciones();
  
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

function guardarConfigFuncionales() {
  const config = {
    fechaObligatoria: document.getElementById('config-fecha-obligatoria')?.checked || false,
    confirmacionBorrar: document.getElementById('config-confirmacion-borrar')?.checked || false,
    autoMayuscula: document.getElementById('config-auto-mayuscula')?.checked || false,
    notificacionesActivas: document.getElementById('config-notificaciones-activas')?.checked || false,
    notif1Dia: document.getElementById('config-notif-1-dia')?.checked || false,
    notif2Horas: document.getElementById('config-notif-2-horas')?.checked || false,
    notif30Min: document.getElementById('config-notif-30-min')?.checked || false,
    popupCelebracion: document.getElementById('config-popup-celebracion')?.checked || false
  };
  
  localStorage.setItem('config-funcionales', JSON.stringify(config));
  
  // Reiniciar el sistema de notificaciones si está activo
  if (config.notificacionesActivas) {
    iniciarSistemaNotificaciones();
  } else {
    detenerSistemaNotificaciones();
  }
  
  mostrarAlerta('✅ Configuración funcional guardada', 'success');
}

function cargarConfigFuncionales() {
  const config = JSON.parse(localStorage.getItem('config-funcionales') || '{}');
  
  const fechaObligatoriaEl = document.getElementById('config-fecha-obligatoria');
  const confirmacionBorrarEl = document.getElementById('config-confirmacion-borrar');
  const autoMayusculaEl = document.getElementById('config-auto-mayuscula');
  const notificacionesActivasEl = document.getElementById('config-notificaciones-activas');
  const notif1DiaEl = document.getElementById('config-notif-1-dia');
  const notif2HorasEl = document.getElementById('config-notif-2-horas');
  const notif30MinEl = document.getElementById('config-notif-30-min');
  const popupCelebracionEl = document.getElementById('config-popup-celebracion');
  
  if (fechaObligatoriaEl) fechaObligatoriaEl.checked = config.fechaObligatoria || false;
  if (confirmacionBorrarEl) confirmacionBorrarEl.checked = config.confirmacionBorrar !== false; // Por defecto true
  if (autoMayusculaEl) autoMayusculaEl.checked = config.autoMayuscula !== false; // Por defecto true
  if (notificacionesActivasEl) notificacionesActivasEl.checked = config.notificacionesActivas || false;
  if (notif1DiaEl) notif1DiaEl.checked = config.notif1Dia !== false; // Por defecto true
  if (notif2HorasEl) notif2HorasEl.checked = config.notif2Horas !== false; // Por defecto true
  if (notif30MinEl) notif30MinEl.checked = config.notif30Min !== false; // Por defecto true
  if (popupCelebracionEl) popupCelebracionEl.checked = config.popupCelebracion !== false; // Por defecto true
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

// ========== HISTORIAL Y CELEBRACIONES ==========
function guardarTareaCompletada(tarea, esCritica = false) {
  const historial = JSON.parse(localStorage.getItem('historial-tareas') || '[]');
  const fecha = new Date().toISOString().slice(0, 10);
  const hora = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  
  const tareaHistorial = {
    id: Date.now(),
    texto: tarea.titulo || tarea.texto,
    fecha: fecha,
    hora: hora,
    esCritica: esCritica,
    fechaLimite: tarea.fecha_fin || null
  };
  
  historial.push(tareaHistorial);
  
  // Mantener solo últimos 1000 registros
  if (historial.length > 1000) {
    historial.splice(0, historial.length - 1000);
  }
  
  localStorage.setItem('historial-tareas', JSON.stringify(historial));
  
  // Mostrar popup de celebración
  mostrarPopupCelebracion();
}

function mostrarPopupCelebracion() {
  // Verificar si los popups están activados
  const visualConfig = JSON.parse(localStorage.getItem('config-visual') || '{}');
  if (visualConfig.popupCelebracion === false) {
    return;
  }
  
  // Obtener frases personalizadas
  const frasesPersonalizadas = visualConfig.frases || [];
  
  const frasesDefault = [
    "¡Excelente trabajo! 🎉",
    "¡Una tarea menos! 💪",
    "¡Sigue así! ⭐",
    "¡Genial! 🚀",
    "¡Bien hecho! 👏",
    "¡Progreso! 📈",
    "¡Fantástico! ✨",
    "¡Increíble! 🌟",
    "¡Vas muy bien! 🎯",
    "¡Imparable! 🔥"
  ];
  
  // Usar frases personalizadas si existen, sino usar las por defecto
  const frases = frasesPersonalizadas.length > 0 ? frasesPersonalizadas : frasesDefault;
  const frase = frases[Math.floor(Math.random() * frases.length)];
  
  // Crear overlay transparente como el dashboard
  const overlay = document.createElement('div');
  overlay.className = 'dashboard-overlay';
  overlay.innerHTML = `<div class="dashboard-content celebration-style">${frase}</div>`;
  
  document.body.appendChild(overlay);
  
  // Mostrar inmediatamente
  overlay.classList.add('show');
  
  // Remover después de 1 segundo
  setTimeout(() => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  }, 1000);
}

function mostrarResumenHoy() {
  const hoy = new Date().toISOString().slice(0, 10);
  const historial = JSON.parse(localStorage.getItem('historial-tareas') || '[]');
  const tareasHoy = historial.filter(t => t.fecha === hoy);
  
  const totalHoy = appState.agenda.tareas.length + appState.agenda.tareas_criticas.length;
  const completadasHoy = tareasHoy.length;
  const pendientesHoy = totalHoy - appState.agenda.tareas.filter(t => t.completada).length - appState.agenda.tareas_criticas.filter(t => t.completada).length;
  
  let resumen = `📅 RESUMEN DE HOY (${hoy})\n\n`;
  resumen += `✅ Completadas: ${completadasHoy}\n`;
  resumen += `⏳ Pendientes: ${pendientesHoy}\n`;
  resumen += `📊 Total: ${totalHoy}\n\n`;
  
  if (tareasHoy.length > 0) {
    resumen += "TAREAS COMPLETADAS HOY:\n";
    tareasHoy.forEach((t, i) => {
      resumen += `${i + 1}. ${t.texto} (${t.hora})${t.esCritica ? ' 🚨' : ''}\n`;
    });
  }
  
  const popup = window.open('', '_blank', 'width=600,height=500');
  popup.document.write(`
    <html><head><title>Resumen de Hoy</title></head>
    <body style="font-family:monospace;padding:20px;background:#f5f5f5;">
      <pre style="background:white;padding:20px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">${resumen}</pre>
    </body></html>
  `);
}

function mostrarDashboardMotivacional() {
  const historial = JSON.parse(localStorage.getItem('historial-tareas') || '[]');
  const hoy = new Date();
  const hace7Dias = new Date();
  hace7Dias.setDate(hoy.getDate() - 7);
  
  // Datos de hoy
  const hoyStr = hoy.toISOString().slice(0, 10);
  const tareasHoy = historial.filter(t => t.fecha === hoyStr);
  const totalActual = appState.agenda.tareas.length + appState.agenda.tareas_criticas.length;
  const completadasActuales = appState.agenda.tareas.filter(t => t.completada).length + appState.agenda.tareas_criticas.filter(t => t.completada).length;
  const pendientesHoy = totalActual - completadasActuales;
  
  // Datos semanales
  const tareasSemana = historial.filter(t => {
    const fechaTarea = new Date(t.fecha + 'T00:00:00');
    return fechaTarea >= hace7Dias && fechaTarea <= hoy;
  });
  
  // Crear gráfico visual simple
  const completadasSemana = tareasSemana.length;
  const criticasSemana = tareasSemana.filter(t => t.esCritica).length;
  const promedioDiario = Math.round(completadasSemana / 7 * 10) / 10;
  
  // Barra de progreso visual
  const porcentajeHoy = totalActual > 0 ? Math.round((tareasHoy.length / totalActual) * 100) : 0;
  const barraProgreso = '█'.repeat(Math.floor(porcentajeHoy / 5)) + '░'.repeat(20 - Math.floor(porcentajeHoy / 5));
  
  // Mensaje motivacional
  let mensaje = '';
  if (tareasHoy.length >= 5) mensaje = '🎆 ¡Eres imparable hoy!';
  else if (tareasHoy.length >= 3) mensaje = '🚀 ¡Excelente ritmo!';
  else if (tareasHoy.length >= 1) mensaje = '🌟 ¡Buen comienzo!';
  else mensaje = '💪 ¡Es hora de brillar!';
  
  const dashboard = `🎆 MI PROGRESO SEMANAL

${mensaje}

📅 HOY (${hoyStr})
✅ Completadas: ${tareasHoy.length}
⏳ Pendientes: ${pendientesHoy}
📊 Progreso: [${barraProgreso}] ${porcentajeHoy}%

📈 ESTA SEMANA
✨ Total logradas: ${completadasSemana}
🚨 Críticas resueltas: ${criticasSemana}
🎯 Promedio diario: ${promedioDiario}

🏆 RACHA DE ÉXITO
${completadasSemana > 10 ? '🔥 ¡Racha de fuego!' : completadasSemana > 5 ? '⭐ ¡Muy bien!' : '🌱 ¡Creciendo!'}

📝 ÚLTIMAS TAREAS COMPLETADAS:
${tareasHoy.slice(-3).map((t, i) => `${i + 1}. ${t.texto} (${t.hora})${t.esCritica ? ' 🚨' : ''}`).join('\n') || 'Aún no hay tareas completadas hoy'}`;
  
  // Crear overlay transparente
  const overlay = document.createElement('div');
  overlay.className = 'dashboard-overlay';
  overlay.innerHTML = `<div class="dashboard-content"><pre>${dashboard}</pre></div>`;
  
  document.body.appendChild(overlay);
  
  // Mostrar inmediatamente
  overlay.classList.add('show');
  
  // Cerrar al hacer clic
  overlay.addEventListener('click', () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  });
}

// ========== SISTEMA DE NOTIFICACIONES ==========
let intervalosNotificaciones = [];

function solicitarPermisoNotificaciones() {
  if (!('Notification' in window)) {
    mostrarAlerta('❌ Tu navegador no soporta notificaciones', 'error');
    return;
  }
  
  if (Notification.permission === 'granted') {
    mostrarAlerta('✅ Permisos ya concedidos', 'success');
    iniciarSistemaNotificaciones();
    return;
  }
  
  if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        mostrarAlerta('✅ Permisos concedidos', 'success');
        iniciarSistemaNotificaciones();
      } else {
        mostrarAlerta('❌ Permisos denegados', 'error');
      }
    });
  } else {
    mostrarAlerta('❌ Permisos denegados previamente', 'error');
  }
}

function iniciarSistemaNotificaciones() {
  const config = JSON.parse(localStorage.getItem('config-funcionales') || '{}');
  
  if (!config.notificacionesActivas || Notification.permission !== 'granted') {
    return;
  }
  
  // Limpiar intervalos anteriores
  detenerSistemaNotificaciones();
  
  // Verificar notificaciones cada minuto
  const intervalo = setInterval(verificarNotificaciones, 60000);
  intervalosNotificaciones.push(intervalo);
  
  // Verificar inmediatamente
  verificarNotificaciones();
  
  console.log('🔔 Sistema de notificaciones iniciado');
}

function detenerSistemaNotificaciones() {
  intervalosNotificaciones.forEach(intervalo => clearInterval(intervalo));
  intervalosNotificaciones = [];
  console.log('🔕 Sistema de notificaciones detenido');
}

function verificarNotificaciones() {
  const config = JSON.parse(localStorage.getItem('config-funcionales') || '{}');
  const ahora = new Date();
  
  if (!config.notificacionesActivas || !appState.agenda.citas) {
    return;
  }
  
  appState.agenda.citas.forEach(cita => {
    const fechaCita = parsearFechaCita(cita);
    if (!fechaCita) return;
    
    const diferenciaMilisegundos = fechaCita.getTime() - ahora.getTime();
    const diferenciaMinutos = Math.floor(diferenciaMilisegundos / (1000 * 60));
    
    // Verificar si necesita notificación
    const necesitaNotificacion = (
      (config.notif1Dia && diferenciaMinutos <= 1440 && diferenciaMinutos > 1439) || // 1 día = 1440 min
      (config.notif2Horas && diferenciaMinutos <= 120 && diferenciaMinutos > 119) || // 2 horas = 120 min
      (config.notif30Min && diferenciaMinutos <= 30 && diferenciaMinutos > 29) // 30 min
    );
    
    if (necesitaNotificacion && !yaNotificado(cita, diferenciaMinutos)) {
      enviarNotificacion(cita, diferenciaMinutos);
      marcarComoNotificado(cita, diferenciaMinutos);
    }
  });
}

function parsearFechaCita(cita) {
  try {
    // Extraer hora de la descripción (formato: "HH:MM - Descripción")
    const partes = cita.nombre.split(' - ');
    if (partes.length < 2) return null;
    
    const hora = partes[0].trim();
    const [horas, minutos] = hora.split(':').map(n => parseInt(n));
    
    if (isNaN(horas) || isNaN(minutos)) return null;
    
    const fechaCita = new Date(cita.fecha + 'T00:00:00');
    fechaCita.setHours(horas, minutos, 0, 0);
    
    return fechaCita;
  } catch (error) {
    console.error('Error parseando fecha de cita:', error);
    return null;
  }
}

function enviarNotificacion(cita, minutosRestantes) {
  const descripcion = cita.nombre.split(' - ')[1] || cita.nombre;
  let tiempoTexto = '';
  
  if (minutosRestantes <= 30) {
    tiempoTexto = '30 minutos';
  } else if (minutosRestantes <= 120) {
    tiempoTexto = '2 horas';
  } else {
    tiempoTexto = '1 día';
  }
  
  const notification = new Notification('📅 Recordatorio de Cita', {
    body: `${descripcion}\nEn ${tiempoTexto} - ${cita.fecha}`,
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📅</text></svg>',
    tag: `cita-${cita.fecha}-${cita.nombre}`,
    requireInteraction: true
  });
  
  // Auto-cerrar después de 10 segundos
  setTimeout(() => notification.close(), 10000);
  
  console.log(`🔔 Notificación enviada: ${descripcion} en ${tiempoTexto}`);
}

function yaNotificado(cita, minutosRestantes) {
  const clave = `notif-${cita.fecha}-${cita.nombre}-${Math.floor(minutosRestantes / 30)}`;
  return localStorage.getItem(clave) === 'true';
}

function marcarComoNotificado(cita, minutosRestantes) {
  const clave = `notif-${cita.fecha}-${cita.nombre}-${Math.floor(minutosRestantes / 30)}`;
  localStorage.setItem(clave, 'true');
}



function limpiarNotificacionesAntiguas() {
  const hace7Dias = new Date();
  hace7Dias.setDate(hace7Dias.getDate() - 7);
  
  Object.keys(localStorage).forEach(clave => {
    if (clave.startsWith('notif-')) {
      try {
        const fecha = clave.split('-')[1];
        const fechaNotif = new Date(fecha + 'T00:00:00');
        if (fechaNotif < hace7Dias) {
          localStorage.removeItem(clave);
        }
      } catch (error) {
        // Ignorar errores de parsing
      }
    }
  });
}

// Iniciar sistema al cargar la página
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const config = JSON.parse(localStorage.getItem('config-funcionales') || '{}');
      if (config.notificacionesActivas) {
        iniciarSistemaNotificaciones();
      }
    }, 2000);
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



function aplicarVisibilidadSecciones() {
  const config = JSON.parse(localStorage.getItem('config-visual') || '{}');
  const mostrarNotas = config.mostrarNotas !== false;
  const mostrarSentimientos = config.mostrarSentimientos !== false;
  
  const seccionNotas = document.getElementById('seccion-notas');
  const seccionSentimientos = document.getElementById('seccion-sentimientos');
  if (seccionNotas) seccionNotas.style.display = mostrarNotas ? 'block' : 'none';
  if (seccionSentimientos) seccionSentimientos.style.display = mostrarSentimientos ? 'block' : 'none';
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
  
  // Aplicar visibilidad de secciones al cargar
  setTimeout(() => {
    aplicarVisibilidadSecciones();
    inicializarEtiquetas();
  }, 100);
  
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

window.cargarConfiguracionesModal = cargarConfiguracionesModal;
window.cambiarFraseMotivacional = cambiarFraseMotivacional;
window.guardarConfigFuncionales = guardarConfigFuncionales;
window.cargarConfigFuncionales = cargarConfigFuncionales;
window.guardarConfigExtendsClass = guardarConfigFirebase;
window.probarConexionExtendsClass = probarConexionFirebase;

// ========== HISTORIAL DE SENTIMIENTOS ==========
function guardarSentimiento(texto) {
  if (!texto || !texto.trim()) return;
  
  const fecha = new Date().toISOString().slice(0, 10);
  const hora = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  
  const sentimientoHistorial = {
    id: Date.now(),
    texto: texto.trim(),
    fecha: fecha,
    hora: hora,
    timestamp: new Date().toISOString()
  };
  
  // Guardar en localStorage (backup)
  const historialLocal = JSON.parse(localStorage.getItem('historial-sentimientos') || '[]');
  historialLocal.push(sentimientoHistorial);
  if (historialLocal.length > 500) {
    historialLocal.splice(0, historialLocal.length - 500);
  }
  localStorage.setItem('historial-sentimientos', JSON.stringify(historialLocal));
  
  // Guardar en Firebase
  if (isFirebaseInitialized) {
    db.collection('sentimientos').add(sentimientoHistorial).then(() => {
      console.log('✅ Sentimiento guardado en Firebase');
    }).catch(error => {
      console.error('❌ Error guardando sentimiento:', error);
    });
  }
}

// ========== SISTEMA DE ETIQUETAS ==========
function inicializarEtiquetas() {
  const etiquetas = JSON.parse(localStorage.getItem('etiquetas') || '{}');
  if (!etiquetas.tareas) {
    etiquetas.tareas = [
      { nombre: 'Salud', simbolo: '🏥' },
      { nombre: 'Laboral', simbolo: '💼' },
      { nombre: 'Ocio', simbolo: '🎮' }
    ];
  }
  if (!etiquetas.citas) {
    etiquetas.citas = [
      { nombre: 'Salud', simbolo: '🏥' },
      { nombre: 'Laboral', simbolo: '💼' },
      { nombre: 'Ocio', simbolo: '🎮' }
    ];
  }
  localStorage.setItem('etiquetas', JSON.stringify(etiquetas));
  return etiquetas;
}

function cargarEtiquetasEnSelect(selectId, tipo) {
  const etiquetas = JSON.parse(localStorage.getItem('etiquetas') || '{}');
  const select = document.getElementById(selectId);
  if (!select || !etiquetas[tipo]) return;
  
  select.innerHTML = '<option value="">Sin etiqueta</option>';
  etiquetas[tipo].forEach(etiqueta => {
    const option = document.createElement('option');
    option.value = etiqueta.nombre;
    option.textContent = `${etiqueta.simbolo} ${etiqueta.nombre}`;
    select.appendChild(option);
  });
}

function renderizarListaEtiquetas(containerId, tipo) {
  const etiquetas = JSON.parse(localStorage.getItem('etiquetas') || '{}');
  const container = document.getElementById(containerId);
  if (!container || !etiquetas[tipo]) return;
  
  container.innerHTML = '';
  etiquetas[tipo].forEach((etiqueta, index) => {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px;border:1px solid #ddd;border-radius:4px;margin-bottom:5px;';
    div.innerHTML = `
      <span>${etiqueta.simbolo} ${etiqueta.nombre}</span>
      <button onclick="eliminarEtiqueta('${tipo}', ${index})" style="background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;padding:2px 6px;border-radius:3px;cursor:pointer;">❌</button>
    `;
    container.appendChild(div);
  });
}

function agregarEtiquetaTarea() {
  const nombre = document.getElementById('nueva-etiqueta-tarea').value.trim();
  const simbolo = document.getElementById('simbolo-etiqueta-tarea').value;
  if (!nombre) return;
  
  const etiquetas = JSON.parse(localStorage.getItem('etiquetas') || '{}');
  if (!etiquetas.tareas) etiquetas.tareas = [];
  etiquetas.tareas.push({ nombre, simbolo });
  localStorage.setItem('etiquetas', JSON.stringify(etiquetas));
  
  document.getElementById('nueva-etiqueta-tarea').value = '';
  renderizarListaEtiquetas('etiquetas-tareas-lista', 'tareas');
}

function agregarEtiquetaCita() {
  const nombre = document.getElementById('nueva-etiqueta-cita').value.trim();
  const simbolo = document.getElementById('simbolo-etiqueta-cita').value;
  if (!nombre) return;
  
  const etiquetas = JSON.parse(localStorage.getItem('etiquetas') || '{}');
  if (!etiquetas.citas) etiquetas.citas = [];
  etiquetas.citas.push({ nombre, simbolo });
  localStorage.setItem('etiquetas', JSON.stringify(etiquetas));
  
  document.getElementById('nueva-etiqueta-cita').value = '';
  renderizarListaEtiquetas('etiquetas-citas-lista', 'citas');
}

function eliminarEtiqueta(tipo, index) {
  const etiquetas = JSON.parse(localStorage.getItem('etiquetas') || '{}');
  if (etiquetas[tipo]) {
    etiquetas[tipo].splice(index, 1);
    localStorage.setItem('etiquetas', JSON.stringify(etiquetas));
    renderizarListaEtiquetas(`etiquetas-${tipo}-lista`, tipo);
  }
}

function guardarEtiquetas() {
  mostrarAlerta('✅ Etiquetas guardadas', 'success');
}

function obtenerEtiquetaInfo(nombre, tipo) {
  const etiquetas = JSON.parse(localStorage.getItem('etiquetas') || '{}');
  if (!etiquetas[tipo]) return null;
  return etiquetas[tipo].find(e => e.nombre === nombre);
}

// ========== HISTORIAL SUAVE (SOFT DELETE) ==========
function moverAHistorial(item, tipo) {
  const historial = JSON.parse(localStorage.getItem('historial-eliminados') || '[]');
  const entrada = {
    id: Date.now().toString(),
    tipo: tipo,
    data: item,
    fecha_eliminacion: new Date().toISOString(),
    restaurable: true
  };
  
  historial.push(entrada);
  if (historial.length > 1000) {
    historial.splice(0, historial.length - 1000);
  }
  
  localStorage.setItem('historial-eliminados', JSON.stringify(historial));
  
  // Guardar en Firebase
  if (isFirebaseInitialized) {
    db.collection('historial').add(entrada).catch(error => {
      console.error('Error guardando en historial:', error);
    });
  }
}

window.guardarSentimiento = guardarSentimiento;
window.aplicarVisibilidadSecciones = aplicarVisibilidadSecciones;
window.inicializarEtiquetas = inicializarEtiquetas;
window.cargarEtiquetasEnSelect = cargarEtiquetasEnSelect;
window.renderizarListaEtiquetas = renderizarListaEtiquetas;
window.agregarEtiquetaTarea = agregarEtiquetaTarea;
window.agregarEtiquetaCita = agregarEtiquetaCita;
window.eliminarEtiqueta = eliminarEtiqueta;
window.guardarEtiquetas = guardarEtiquetas;
window.obtenerEtiquetaInfo = obtenerEtiquetaInfo;
window.moverAHistorial = moverAHistorial;

