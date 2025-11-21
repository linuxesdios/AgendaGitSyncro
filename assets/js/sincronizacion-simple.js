// ========== SINCRONIZACIÓN FIREBASE FIRESTORE ==========

let db = null;
let isFirebaseInitialized = false;
let isOnline = navigator.onLine;
let conectividadModal = null;

// ========== SISTEMA DE DETECTAR CONECTIVIDAD ==========
function mostrarAlertaConectividad(mensaje, tipo = 'warning', persistente = false) {
  // Crear modal de conectividad si no existe
  if (!conectividadModal) {
    conectividadModal = document.createElement('div');
    conectividadModal.id = 'modal-conectividad';
    conectividadModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: none;
      justify-content: center;
      align-items: center;
    `;
    document.body.appendChild(conectividadModal);
  }

  const color = tipo === 'error' ? '#f44336' : tipo === 'success' ? '#4caf50' : '#ff9800';
  const icono = tipo === 'error' ? '❌' : tipo === 'success' ? '✅' : '⚠️';

  conectividadModal.innerHTML = `
    <div style="
      background: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 500px;
      width: 90%;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      border: 3px solid ${color};
    ">
      <div style="font-size: 48px; margin-bottom: 20px;">${icono}</div>
      <h3 style="margin: 0 0 15px 0; color: ${color};">ESTADO DE CONECTIVIDAD</h3>
      <p style="font-size: 18px; margin: 15px 0; color: #333;">${mensaje}</p>
      ${!persistente ? `<button onclick="cerrarModalConectividad()" style="
        background: ${color};
        color: white;
        border: none;
        padding: 12px 25px;
        border-radius: 5px;
        font-size: 16px;
        cursor: pointer;
        margin-top: 15px;
      ">Entendido</button>` : ''}
    </div>
  `;

  conectividadModal.style.display = 'flex';

  if (!persistente) {
    setTimeout(() => {
      cerrarModalConectividad();
    }, 5000);
  }
}

function cerrarModalConectividad() {
  if (conectividadModal) {
    conectividadModal.style.display = 'none';
  }
}

function verificarConectividad() {
  return new Promise((resolve) => {
    if (!navigator.onLine) {
      resolve(false);
      return;
    }

    if (!isFirebaseInitialized) {
      resolve(false);
      return;
    }

    // Probar conexión real con Firebase
    db.collection('test').doc('connectivity').set({
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      test: true
    }).then(() => {
      resolve(true);
    }).catch(() => {
      resolve(false);
    });
  });
}

// Monitoreo de conectividad
window.addEventListener('online', async () => {
  isOnline = true;
  const conectado = await verificarConectividad();
  if (conectado) {
    mostrarAlertaConectividad('🟢 Conexión restaurada. Los datos se están sincronizando automáticamente.', 'success');
    // Forzar sincronización cuando se recupere la conexión
    setTimeout(() => {
      extendsClassPull();
    }, 1000);
  }
});

window.addEventListener('offline', () => {
  isOnline = false;
  mostrarAlertaConectividad('🔴 SIN CONEXIÓN A INTERNET<br><br>⚠️ CUIDADO: No se está guardando ni cargando nada.<br>Los cambios se perderán al cerrar la aplicación.', 'error', true);
});

function getFirebaseConfig() {
  // Configuración directa de Firebase
  return {
    apiKey: 'AIzaSyDbZBugeuekmI44sng37Fj3Q9ab5cNiRUY',
    projectId: 'agenda-pablo-f6d0d',
    messagingSenderId: '679447909448'
  };
}

async function initFirebase() {
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

    // Actualizar exportaciones globales
    window.isFirebaseInitialized = isFirebaseInitialized;
    window.db = db;

    // Verificar conectividad inicial
    const conectado = await verificarConectividad();
    if (!conectado) {
      mostrarAlertaConectividad('🔴 SIN CONEXIÓN CON FIREBASE<br><br>⚠️ CUIDADO: No se puede guardar ni cargar datos.<br>Verifica tu conexión a internet.', 'error');
    }

    console.log('✅ Firebase inicializado');
    return true;
  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error);
    mostrarAlertaConectividad('❌ ERROR DE FIREBASE<br><br>No se pudo conectar a la base de datos.<br>Verifica la configuración.', 'error');
    return false;
  }
}

// ========== FUNCIÓN AUXILIAR PARA VERIFICAR CONECTIVIDAD ==========
async function ejecutarOperacionFirebase(operacion, mensajeError = 'No se puede realizar la operación sin conexión') {
  const conectado = await verificarConectividad();
  if (!conectado) {
    mostrarAlertaConectividad(`🔴 ${mensajeError}<br><br>⚠️ CUIDADO: No hay conexión con Firebase.`, 'error');
    return false;
  }

  try {
    const resultado = await operacion();
    return resultado;
  } catch (error) {
    console.error('Error en operación Firebase:', error);
    mostrarAlertaConectividad(`❌ Error de Firebase: ${error.message}`, 'error');
    return false;
  }
}

function setupAutoSync() {
  if (!isFirebaseInitialized) return;

  // Sincronización automática cada 30 segundos (solo si hay conexión)
  setInterval(async () => {
    const conectado = await verificarConectividad();
    if (conectado) {
      guardarJSON(true);
    }
  }, 30000);

  // Guardar al cambiar de pestaña/cerrar (solo si hay conexión)
  window.addEventListener('beforeunload', async () => {
    const conectado = await verificarConectividad();
    if (conectado) {
      guardarJSON(true);
    }
  });

  // Guardar al perder foco (solo si hay conexión)
  window.addEventListener('blur', async () => {
    const conectado = await verificarConectividad();
    if (conectado) {
      guardarJSON(true);
    }
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

async function extendsClassPull() {
  const conectado = await verificarConectividad();
  if (!conectado) {
    mostrarAlertaConectividad('🔴 No se pueden sincronizar los datos<br><br>⚠️ Sin conexión a Firebase', 'error');
    return;
  }

  if (!isFirebaseInitialized) {
    mostrarAlerta('⚠️ Firebase no disponible', 'warning');
    return;
  }

  return ejecutarOperacionFirebase(async () => {
    const [tareasDoc, citasDoc, notasDoc, sentimientosDoc, historialDoc, configDoc, personasDoc, etiquetasDoc, historialTareasDoc] = await Promise.all([
      db.collection('tareas').doc('data').get(),
      db.collection('citas').doc('data').get(),
      db.collection('notas').doc('data').get(),
      db.collection('sentimientos').doc('data').get(),
      db.collection('historial').doc('eliminados').get(),
      db.collection('config').doc('settings').get(),
      db.collection('personas').doc('asignadas').get(),
      db.collection('etiquetas').doc('data').get(),
      db.collection('historial').doc('tareas').get()
    ]);

    const data = {
      tareas_criticas: tareasDoc.exists ? (tareasDoc.data().tareas_criticas || []) : [],
      tareas: tareasDoc.exists ? (tareasDoc.data().tareas || []) : [],
      citas: citasDoc.exists ? (citasDoc.data().citas || []) : [],
      notas: notasDoc.exists ? (notasDoc.data().notas || '') : '',
      sentimientos: sentimientosDoc.exists ? (sentimientosDoc.data().sentimientos || '') : ''
    };

    // Cargar configuraciones DIRECTAMENTE en memoria (NO localStorage)
    if (configDoc.exists) {
      const configFirebase = configDoc.data();

      // Guardar configuraciones en variables globales para acceso directo
      const visualRemote = configFirebase.visual || {};

      // PROTECCIÓN CONTRA SOBRESCRITURA DE LISTAS PERSONALIZADAS
      // Si Firebase devuelve 0 listas (o undefined) pero localmente tenemos listas,
      // es probable que sea una condición de carrera o lectura de caché antigua.
      // En este caso, PRESERVAMOS las listas locales para no perder datos recién creados.
      const listasLocales = window.configVisual && window.configVisual.listasPersonalizadas;
      const listasRemotas = visualRemote.listasPersonalizadas;

      if ((!listasRemotas || listasRemotas.length === 0) && (listasLocales && listasLocales.length > 0)) {
        console.warn(`🛡️ PROTECCIÓN ACTIVADA: Firebase devolvió 0 listas pero hay ${listasLocales.length} locales. Preservando listas locales.`);
        visualRemote.listasPersonalizadas = listasLocales;
      }

      window.configVisual = visualRemote;
      window.configFuncionales = configFirebase.funcionales || {};
      window.configOpciones = configFirebase.opciones || {};

      // Aplicar tema INMEDIATAMENTE después de cargar desde Firebase
      const tema = visualRemote.tema || 'verde';
      console.log('🎨 Aplicando tema desde Firebase:', tema);
      document.body.className = document.body.className.replace(/tema-\w+/g, '').trim();
      document.body.classList.add('tema-' + tema);
      console.log('✅ Tema aplicado desde Firebase. Clases:', document.body.className);

      aplicarConfiguracionSincronizada();

      // Si el panel de configuración está abierto, actualizar la vista de listas personalizadas
      const modalConfig = document.getElementById('modal-config');
      if (modalConfig && modalConfig.style.display === 'block') {
        // El modal está abierto, actualizar el contenido de listas personalizadas
        const visualTab = document.getElementById('tab-visual');
        if (visualTab && visualTab.classList.contains('active')) {
          // La pestaña Visual está activa, renderizar las listas
          if (typeof renderizarListasPersonalizadas === 'function') {
            setTimeout(() => {
              renderizarListasPersonalizadas();
            }, 100);
          }
        }
      }
    }

    // Cargar datos auxiliares DIRECTAMENTE en memoria (NO localStorage)
    if (historialDoc.exists) {
      window.historialEliminados = historialDoc.data().items || [];
    }

    if (personasDoc.exists) {
      window.personasAsignadas = personasDoc.data().lista || [];
    }

    if (etiquetasDoc.exists) {
      window.etiquetasData = etiquetasDoc.data() || {};
    }

    // Cargar historial de tareas completadas en memoria global
    if (historialTareasDoc.exists) {
      window.historialTareas = historialTareasDoc.data().items || [];
    } else {
      window.historialTareas = [];
    }

    console.log('📥 Sincronizado desde Firebase');
    console.log('📊 Datos recibidos:', {
      tareas_criticas: data.tareas_criticas.length,
      tareas: data.tareas.length,
      citas: data.citas.length,
      notas: data.notas.length
    });

    console.log('🔍 DETALLE DE TAREAS:');
    console.log('  📋 Tareas normales (van a "Por hacer"):', data.tareas.length);
    data.tareas.forEach((t, i) => {
      console.log(`    ${i + 1}. ${t.texto} (estado: ${t.estado})`);
    });
    console.log('  🚨 Tareas críticas:', data.tareas_criticas.length);
    data.tareas_criticas.forEach((t, i) => {
      console.log(`    ${i + 1}. ${t.titulo} (estado: ${t.estado})`);
    });

    procesarJSON(data);

    // IMPORTANTE: Re-renderizar la interfaz después de sincronizar
    if (typeof renderizar === 'function') {
      renderizar();
      console.log('🔄 Interfaz re-renderizada después de sincronización');
    }

    // Actualizar calendarios si están visibles
    if (typeof renderCalendar === 'function') {
      renderCalendar();
    }
    if (typeof renderCitasPanel === 'function') {
      renderCitasPanel();
    }

    // Actualizar filtros después de cargar datos
    setTimeout(() => {
      actualizarFiltrosPersonas();
      actualizarFiltrosEtiquetas();
      // Mostrar resumen diario después de cargar datos
      setTimeout(() => mostrarResumenDiario(), 500);
    }, 100);

    mostrarAlerta('✅ Datos sincronizados desde Firebase', 'success');
    return true;
  }, 'No se pueden sincronizar los datos');
}

async function guardarJSON(silent = false) {
  if (!isFirebaseInitialized) {
    if (!silent) mostrarAlerta('⚠️ Firebase no disponible', 'warning');
    return false;
  }

  const conectado = await verificarConectividad();
  if (!conectado) {
    if (!silent) {
      mostrarAlertaConectividad('🔴 No se puede guardar<br><br>⚠️ Sin conexión a Firebase', 'error');
    }
    return false;
  }

  return ejecutarOperacionFirebase(async () => {
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

    await batch.commit();

    if (!silent) {
      console.log('✅ Guardado en Firebase');
      mostrarAlerta('💾 Guardado automáticamente', 'success');
    }

    return true;
  }, 'No se puede guardar sin conexión');
}

async function guardarConfigEnFirebase() {
  if (!isFirebaseInitialized) return false;

  return ejecutarOperacionFirebase(async () => {
    const configCompleta = {
      visual: window.configVisual || {},
      funcionales: window.configFuncionales || {},
      opciones: window.configOpciones || {},
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };

    const batch = db.batch();

    // Guardar configuración
    const configRef = db.collection('config').doc('settings');
    batch.set(configRef, configCompleta);

    // Guardar personas
    const personasRef = db.collection('personas').doc('asignadas');
    batch.set(personasRef, {
      lista: window.personasAsignadas || [],
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Guardar etiquetas
    const etiquetasRef = db.collection('etiquetas').doc('data');
    batch.set(etiquetasRef, {
      ...window.etiquetasData || {},
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();
    console.log('✅ Configuración completa guardada en Firebase');
    return true;
  }, 'No se puede guardar la configuración sin conexión');
}

function aplicarConfiguracionSincronizada() {
  console.log('🔄 EJECUTANDO aplicarConfiguracionSincronizada()');

  try {
    const configVisual = window.configVisual || {};

    // 1. Aplicar TEMA
    const tema = configVisual.tema || 'verde';
    console.log('🎨 Aplicando tema:', tema);
    document.body.className = document.body.className.replace(/tema-\w+/g, '').trim();
    document.body.classList.add('tema-' + tema);

    // 2. Aplicar NOMBRE
    const nombre = configVisual.nombre || 'Pablo';
    const titulo = document.getElementById('titulo-agenda');
    if (titulo) titulo.textContent = '🧠 Agenda de ' + nombre + ' 😊';

    // 3. Aplicar MODO VISUALIZACIÓN
    console.log('🎯 Modo visualización:', configVisual.modoVisualizacion || 'estado');

    // 4. Aplicar COLUMNAS
    if (typeof aplicarConfiguracionColumnas === 'function') {
      aplicarConfiguracionColumnas();
    }

    // 5. Aplicar VISIBILIDAD DE SECCIONES
    aplicarVisibilidadSecciones();

    // 6. Aplicar CALENDARIO
    const calendarioCitas = configVisual.calendarioCitas || 'boton';
    const btnCalendario = document.getElementById('btn-calendario-citas');
    const calendarioIntegrado = document.getElementById('calendario-citas-integrado');
    if (calendarioCitas === 'integrado') {
      if (btnCalendario) btnCalendario.style.display = 'none';
      if (calendarioIntegrado) {
        calendarioIntegrado.style.cssText = 'display: block !important; visibility: visible !important;';
        if (typeof initializeCalendarioIntegrado === 'function') {
          setTimeout(() => initializeCalendarioIntegrado(), 100);
        }
      }
    } else {
      if (btnCalendario) btnCalendario.style.display = 'inline-block';
      if (calendarioIntegrado) calendarioIntegrado.style.display = 'none';
    }

    // 7. Aplicar NOTIFICACIONES
    const configFuncionales = window.configFuncionales || {};
    if (configFuncionales.notificacionesActivas) {
      iniciarSistemaNotificaciones();
    }

    // 8. Regenerar LISTAS PERSONALIZADAS
    if (typeof regenerarSeccionesListasPersonalizadas === 'function') {
      setTimeout(() => {
        regenerarSeccionesListasPersonalizadas();
        if (typeof renderizarTodasLasListasPersonalizadas === 'function') {
          renderizarTodasLasListasPersonalizadas();
        }
      }, 200);
    }

    console.log('✅ aplicarConfiguracionSincronizada() completado exitosamente');
  } catch (error) {
    console.error('❌ Error en aplicarConfiguracionSincronizada():', error);
  }
}

function procesarJSON(data) {
  if (!data) return;

  console.log('🔄 procesarJSON recibió desde Firebase:', {
    tareas_criticas: data.tareas_criticas ? data.tareas_criticas.length : 0,
    tareas: data.tareas ? data.tareas.length : 0,
    citas: data.citas ? data.citas.length : 0
  });

  console.log('📊 appState.agenda.citas ANTES:', appState.agenda.citas ? appState.agenda.citas.length : 0);

  // Actualizar SOLO el estado en memoria, NO localStorage
  appState.agenda.fecha = data.fecha || new Date().toISOString().slice(0, 10);
  appState.agenda.dia_semana = data.dia_semana || '';
  appState.agenda.tareas_criticas = data.tareas_criticas || [];
  appState.agenda.tareas = data.tareas || [];
  appState.agenda.notas = data.notas || '';
  appState.agenda.sentimientos = data.sentimientos || '';
  appState.agenda.citas = data.citas || [];

  console.log('📊 appState.agenda.citas DESPUÉS:', appState.agenda.citas.length);
  console.log('📋 Contenido de citas:', appState.agenda.citas);

  // Actualizar textarea de notas
  const notasEl = document.getElementById('notas-texto');
  if (notasEl && appState.agenda.notas) {
    notasEl.value = appState.agenda.notas;
    if (typeof autoResizeTextarea === 'function') {
      autoResizeTextarea(notasEl);
    }
  }

  // Actualizar textarea de sentimientos
  const sentimientosEl = document.getElementById('sentimientos-texto');
  if (sentimientosEl && appState.agenda.sentimientos) {
    sentimientosEl.value = appState.agenda.sentimientos;
    if (typeof autoResizeTextarea === 'function') {
      autoResizeTextarea(sentimientosEl);
    }
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
  const visualConfig = window.configVisual || {};
  const firebaseConfig = getFirebaseConfig();

  const temaEl = document.getElementById('config-tema-select');
  const nombreEl = document.getElementById('config-nombre-input');
  const frasesEl = document.getElementById('config-frases-motivacionales');
  const popupCelebracionEl = document.getElementById('config-popup-celebracion');
  const mostrarNotasEl = document.getElementById('config-mostrar-notas');
  const mostrarSentimientosEl = document.getElementById('config-mostrar-sentimientos');
  const modoVisualizacionEl = document.getElementById('config-modo-visualizacion');
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
  if (modoVisualizacionEl) modoVisualizacionEl.value = visualConfig.modoVisualizacion || 'estado';
  if (apiKeyEl) apiKeyEl.value = firebaseConfig.apiKey || '';
  if (projectIdEl) projectIdEl.value = firebaseConfig.projectId || '';
  if (messagingSenderIdEl) messagingSenderIdEl.value = firebaseConfig.messagingSenderId || '';
  if (appIdEl) appIdEl.value = firebaseConfig.appId || '';

  // Cargar configuraciones funcionales
  cargarConfigFuncionales();

  // Cargar etiquetas
  renderizarListaEtiquetas('etiquetas-tareas-lista', 'tareas');
  renderizarListaEtiquetas('etiquetas-citas-lista', 'citas');

  // Cargar log, backups y personas
  cargarLog();
  cargarListaSalvados();
  cargarListaPersonas();
  actualizarFiltrosPersonas();
  actualizarFiltrosEtiquetas();
}

function cambiarFraseMotivacional() {
  // Usar frases personalizadas DESDE FIREBASE (variables globales)
  const configVisual = window.configVisual || {};
  let frases = configVisual.frases || [];

  // Si no hay frases personalizadas, usar frases por defecto
  if (frases.length === 0) {
    frases = [
      "El éxito es la suma de pequeños esfuerzos repetidos día tras día",
      "Cada día es una nueva oportunidad para mejorar",
      "La disciplina es el puente entre metas y logros"
    ];
  }

  const fraseEl = document.getElementById('frase-motivacional');
  if (fraseEl) {
    const nuevaFrase = frases[Math.floor(Math.random() * frases.length)];
    fraseEl.textContent = '"' + nuevaFrase + '"';
  }
}

function cargarConfigVisualBasico() {
  // Función básica para aplicar tema - no conflictúa con la principal en app.js
  const config = window.configVisual || {};
  const tema = config.tema || 'verde';
  document.body.classList.add('tema-' + tema);
}

function toggleConfigFloating() {
  const modal = document.getElementById('modal-config');
  if (!modal) return;

  // Toggle modal visibility
  if (modal.style.display === 'block') {
    modal.style.display = 'none';
    return;
  }

  modal.style.display = 'block';

  // Función auxiliar para forzar el renderizado
  const forzarRenderizado = () => {
    if (typeof renderizarListasPersonalizadas === 'function') {
      renderizarListasPersonalizadas();
    }
  };

  // Configurar pestaña visual y renderizar con reintentos
  setTimeout(() => {
    // 1. Cambiar a pestaña Visual
    document.querySelectorAll('.config-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

    const visualTab = document.getElementById('tab-visual');
    if (visualTab) visualTab.classList.add('active');

    const visualBtn = document.querySelector('.config-tab[onclick*="visual"]');
    if (visualBtn) visualBtn.classList.add('active');

    // 2. Cargar configuración en formulario
    cargarConfiguracionesModal();

    // 3. Estrategia de Fuerza Bruta: Renderizar múltiples veces
    forzarRenderizado();
    setTimeout(() => forzarRenderizado(), 100);
    setTimeout(() => forzarRenderizado(), 300);
    setTimeout(() => forzarRenderizado(), 600);
  }, 100);
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

// Función guardarConfigVisualPanel eliminada de aquí porque ya existe en app.js
// Se debe usar la versión de app.js para evitar conflictos y SyntaxError

async function guardarConfigOpciones() {
  const config = {
    forzarFecha: document.getElementById('config-forzar-fecha')?.checked || false,
    sinTactil: document.getElementById('config-sin-tactil')?.checked || false,
    mostrarTodo: document.getElementById('config-mostrar-todo')?.checked || false,
    botonesBorrar: document.getElementById('config-botones-borrar')?.checked || false
  };

  console.log('💾 Guardando configuración de opciones en Firebase:', config);

  // Verificar conectividad
  const conectado = await verificarConectividad();
  if (!conectado) {
    mostrarAlertaConectividad('🔴 No se puede guardar las opciones<br><br>⚠️ Sin conexión a Firebase', 'error');
    return;
  }

  // Guardar DIRECTAMENTE en variables globales (NO localStorage)
  window.configOpciones = config;

  // Guardar en Firebase
  if (typeof guardarConfigEnFirebase === 'function') {
    const guardado = await guardarConfigEnFirebase();
    if (guardado) {
      mostrarAlerta('✅ Opciones guardadas en Firebase', 'success');
    }
  } else {
    mostrarAlerta('⚠️ No se pudo sincronizar las opciones con Firebase', 'warning');
  }
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
    popupCelebracion: document.getElementById('config-popup-celebracion')?.checked || false,
    popupDiario: document.getElementById('config-popup-diario')?.value || 'una_vez'
  };

  // Guardar DIRECTAMENTE en variable global (NO localStorage)
  window.configFuncionales = config;

  // Reiniciar el sistema de notificaciones si está activo
  if (config.notificacionesActivas) {
    iniciarSistemaNotificaciones();
  } else {
    detenerSistemaNotificaciones();
  }

  // Guardar en Firebase
  guardarConfigEnFirebase();

  mostrarAlerta('✅ Configuración funcional guardada', 'success');
}

function cargarConfigFuncionales() {
  const config = window.configFuncionales || {};

  const fechaObligatoriaEl = document.getElementById('config-fecha-obligatoria');
  const confirmacionBorrarEl = document.getElementById('config-confirmacion-borrar');
  const autoMayusculaEl = document.getElementById('config-auto-mayuscula');
  const notificacionesActivasEl = document.getElementById('config-notificaciones-activas');
  const notif1DiaEl = document.getElementById('config-notif-1-dia');
  const notif2HorasEl = document.getElementById('config-notif-2-horas');
  const notif30MinEl = document.getElementById('config-notif-30-min');
  const popupCelebracionEl = document.getElementById('config-popup-celebracion');
  const popupDiarioEl = document.getElementById('config-popup-diario');

  if (fechaObligatoriaEl) fechaObligatoriaEl.checked = config.fechaObligatoria || false;
  if (confirmacionBorrarEl) confirmacionBorrarEl.checked = config.confirmacionBorrar !== false;
  if (autoMayusculaEl) autoMayusculaEl.checked = config.autoMayuscula !== false;
  if (notificacionesActivasEl) notificacionesActivasEl.checked = config.notificacionesActivas || false;
  if (notif1DiaEl) notif1DiaEl.checked = config.notif1Dia !== false;
  if (notif2HorasEl) notif2HorasEl.checked = config.notif2Horas !== false;
  if (notif30MinEl) notif30MinEl.checked = config.notif30Min !== false;
  if (popupCelebracionEl) popupCelebracionEl.checked = config.popupCelebracion !== false;
  if (popupDiarioEl) popupDiarioEl.value = config.popupDiario || 'una_vez';
}

function mostrarResumenDiario() {
  // Usar configuración DESDE FIREBASE (variables globales)
  const config = window.configFuncionales || {};

  // Opciones: 'nunca', 'una_vez', 'siempre'
  const modoPopup = config.popupDiario || 'una_vez';

  if (modoPopup === 'nunca') return;

  const hoy = new Date().toISOString().slice(0, 10);

  // Si es 'una_vez', verificar si ya se mostró hoy usando localStorage
  if (modoPopup === 'una_vez') {
    const ultimoPopup = localStorage.getItem('ultimo-popup-diario');
    if (ultimoPopup === hoy) {
      console.log('✅ Popup diario ya mostrado hoy:', hoy);
      return;
    }
  }

  // Buscar tareas del día
  const tareasHoy = [...(appState.agenda.tareas_criticas || []), ...(appState.agenda.tareas || [])]
    .filter(t => !t.completada && (t.fecha_fin === hoy || t.fecha_migrar === hoy));

  // Buscar tareas pasadas
  const tareasPasadas = [...(appState.agenda.tareas_criticas || []), ...(appState.agenda.tareas || [])]
    .filter(t => !t.completada && ((t.fecha_fin && esFechaPasada(t.fecha_fin)) || (t.fecha_migrar && esFechaPasada(t.fecha_migrar))));

  // Buscar citas del día
  const citasHoy = (appState.agenda.citas || []).filter(c => c.fecha === hoy);

  if (tareasHoy.length === 0 && citasHoy.length === 0 && tareasPasadas.length === 0) {
    // Marcar como mostrado hoy en localStorage
    localStorage.setItem('ultimo-popup-diario', hoy);
    return;
  }

  let contenido = `🌅 RESUMEN DEL DÍA - ${hoy}\n\n`;

  if (tareasPasadas.length > 0) {
    contenido += `⚠️ TAREAS ATRASADAS (${tareasPasadas.length}):\n`;
    tareasPasadas.forEach((t, i) => {
      const texto = t.titulo || t.texto;
      const fecha = t.fecha_fin || t.fecha_migrar;
      const tipo = appState.agenda.tareas_criticas?.includes(t) ? '😨' : '✅';
      contenido += `${i + 1}. ${tipo} ${texto} (${fecha})\n`;
    });
    contenido += '\n';
  }

  if (tareasHoy.length > 0) {
    contenido += `📝 TAREAS DE HOY (${tareasHoy.length}):\n`;
    tareasHoy.forEach((t, i) => {
      const texto = t.titulo || t.texto;
      const tipo = appState.agenda.tareas_criticas?.includes(t) ? '😨' : '✅';
      contenido += `${i + 1}. ${tipo} ${texto}\n`;
    });
    contenido += '\n';
  }

  if (citasHoy.length > 0) {
    contenido += `📅 CITAS DE HOY (${citasHoy.length}):\n`;
    citasHoy.forEach((c, i) => {
      const descripcion = (c.nombre && c.nombre.includes(' - ')) ? c.nombre.split(' - ')[1] : (c.nombre || 'Sin descripción');
      const hora = (c.nombre && c.nombre.includes(' - ')) ? c.nombre.split(' - ')[0] : '';
      contenido += `${i + 1}. 🕰️ ${hora} - ${descripcion}\n`;
    });
  }

  contenido += '\n💪 ¡Que tengas un día productivo!';

  // Crear overlay
  const overlay = document.createElement('div');
  overlay.className = 'dashboard-overlay';
  overlay.innerHTML = `
    <div class="dashboard-content" style="max-width:500px;">
      <pre style="white-space:pre-wrap;font-family:inherit;">${contenido}</pre>
      <div style="margin-top:20px;text-align:center;">
        <button onclick="cerrarResumenDiario()" class="btn-primario">Entendido</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.classList.add('show');

  // Marcar como mostrado hoy en localStorage
  if (modoPopup === 'una_vez') {
    localStorage.setItem('ultimo-popup-diario', hoy);
    console.log('✅ Popup diario marcado como mostrado:', hoy);
  }
}

function cerrarResumenDiario() {
  const overlay = document.querySelector('.dashboard-overlay');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  }
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
async function guardarTareaCompletada(tarea, esCritica = false) {
  const conectado = await verificarConectividad();
  if (!conectado) {
    console.warn('⚠️ No se puede guardar historial de tarea completada sin conexión');
    // Mostrar popup de celebración de todas formas
    mostrarPopupCelebracion();
    return;
  }

  return ejecutarOperacionFirebase(async () => {
    const fecha = new Date().toISOString().slice(0, 10);
    const hora = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const tareaHistorial = {
      id: Date.now(),
      texto: tarea.titulo || tarea.texto,
      fecha: fecha,
      hora: hora,
      esCritica: esCritica,
      fechaLimite: tarea.fecha_fin || null,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Obtener historial actual de Firebase
    const historialRef = db.collection('historial').doc('tareas');
    const historialDoc = await historialRef.get();
    const historial = historialDoc.exists ? (historialDoc.data().items || []) : [];

    historial.push(tareaHistorial);

    // Mantener solo últimos 1000 registros
    if (historial.length > 1000) {
      historial.splice(0, historial.length - 1000);
    }

    // Guardar en Firebase
    await historialRef.set({
      items: historial,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Historial de tarea guardado en Firebase');

    // Mostrar popup de celebración
    mostrarPopupCelebracion();
    return true;
  }, 'No se puede guardar el historial sin conexión');
}

function mostrarPopupCelebracion() {
  // Verificar si los popups están activados DESDE FIREBASE (variables globales)
  const visualConfig = window.configVisual || {};
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
  // Usar historial DESDE VARIABLES GLOBALES (cargadas desde Firebase)
  const historial = window.historialTareas || [];

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
  const config = window.configFuncionales || {};

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
  const config = window.configFuncionales || {};
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
      const config = window.configFuncionales || {};
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
  const config = window.configVisual || {};
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
      setTimeout(() => {
        extendsClassPull();
        // Verificar salvado diario después de cargar datos
        setTimeout(() => verificarSalvadoDiario(), 2000);
      }, 1000);
    }
  } else {
    console.log('💡 Configura Firebase en ⚙️ → Firebase');
  }

  // Aplicar visibilidad de secciones al cargar
  setTimeout(() => {
    aplicarVisibilidadSecciones();
    inicializarEtiquetas();
    inicializarPersonas();
    // Cargar filtros después de inicializar datos
    setTimeout(() => {
      actualizarFiltrosPersonas();
      actualizarFiltrosEtiquetas();
      // Mostrar resumen diario si no hay Firebase
      setTimeout(() => mostrarResumenDiario(), 1000);
    }, 200);
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
// window.cargarConfigVisual = cargarConfigVisual; // Eliminado para evitar ReferenceError y conflicto con app.js
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

// Exportar estado de Firebase
window.isFirebaseInitialized = isFirebaseInitialized;
window.db = db;

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
    const colorCircle = etiqueta.color ? `<span style="display:inline-block;width:12px;height:12px;background:${etiqueta.color};border-radius:50%;margin-right:5px;"></span>` : '';
    div.innerHTML = `
      <span onclick="editarEtiqueta('${tipo}', ${index})" style="cursor:pointer;flex:1;" title="Clic para editar">${colorCircle}${etiqueta.simbolo} ${etiqueta.nombre}</span>
      <button onclick="eliminarEtiqueta('${tipo}', ${index})" style="background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;padding:2px 6px;border-radius:3px;cursor:pointer;">❌</button>
    `;
    container.appendChild(div);
  });
}

function agregarEtiquetaTarea() {
  const nombre = document.getElementById('nueva-etiqueta-tarea').value.trim();
  const simbolo = document.getElementById('simbolo-etiqueta-tarea').value;
  const color = document.getElementById('color-etiqueta-tarea').value;
  if (!nombre) return;

  const etiquetas = JSON.parse(localStorage.getItem('etiquetas') || '{}');
  if (!etiquetas.tareas) etiquetas.tareas = [];
  etiquetas.tareas.push({ nombre, simbolo, color });
  localStorage.setItem('etiquetas', JSON.stringify(etiquetas));

  guardarConfigEnFirebase();
  registrarAccion('Añadir etiqueta de tarea', `${simbolo} ${nombre}`);
  document.getElementById('nueva-etiqueta-tarea').value = '';
  renderizarListaEtiquetas('etiquetas-tareas-lista', 'tareas');
  actualizarFiltrosEtiquetas();
}

function agregarEtiquetaCita() {
  const nombre = document.getElementById('nueva-etiqueta-cita').value.trim();
  const simbolo = document.getElementById('simbolo-etiqueta-cita').value;
  const color = document.getElementById('color-etiqueta-cita').value;
  if (!nombre) return;

  const etiquetas = JSON.parse(localStorage.getItem('etiquetas') || '{}');
  if (!etiquetas.citas) etiquetas.citas = [];
  etiquetas.citas.push({ nombre, simbolo, color });
  localStorage.setItem('etiquetas', JSON.stringify(etiquetas));

  guardarConfigEnFirebase();
  registrarAccion('Añadir etiqueta de cita', `${simbolo} ${nombre}`);
  document.getElementById('nueva-etiqueta-cita').value = '';
  renderizarListaEtiquetas('etiquetas-citas-lista', 'citas');
  actualizarFiltrosEtiquetas();
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

  // Sanitize item to remove any Firestore specific objects like serverTimestamp
  const sanitizedItem = JSON.parse(JSON.stringify(item));

  const entrada = {
    id: Date.now().toString(),
    tipo: tipo,
    data: sanitizedItem,
    fecha_eliminacion: new Date().toISOString(),
    restaurable: true
  };

  historial.push(entrada);
  if (historial.length > 1000) {
    historial.splice(0, historial.length - 1000);
  }

  localStorage.setItem('historial-eliminados', JSON.stringify(historial));

  // Guardar en Firebase - crear la colección historial
  if (isFirebaseInitialized) {
    db.collection('historial').doc('eliminados').set({
      items: historial,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(error => {
      console.error('Error guardando en historial:', error);
    });
  }
}

// ========== SISTEMA DE LOG ==========
function registrarAccion(accion, detalles = '') {
  const entrada = {
    id: Date.now().toString(),
    accion: accion,
    detalles: detalles,
    fecha: new Date().toISOString().slice(0, 10),
    hora: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    timestamp: new Date().toISOString()
  };

  // Guardar en localStorage
  const log = JSON.parse(localStorage.getItem('log-acciones') || '[]');
  log.push(entrada);
  if (log.length > 2000) {
    log.splice(0, log.length - 2000);
  }
  localStorage.setItem('log-acciones', JSON.stringify(log));

  // Guardar en Firebase
  if (isFirebaseInitialized) {
    db.collection('log').doc('acciones').set({
      entries: log,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(error => {
      console.error('Error guardando log:', error);
    });
  }
}

// ========== SISTEMA DE SALVADO DIARIO ==========
function verificarSalvadoDiario() {
  if (!isFirebaseInitialized) return;

  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, '-');
  const nombreSalvado = `salvadodiario${hoy}`;

  // Verificar si ya existe el salvado de hoy
  db.collection('salvados').doc(nombreSalvado).get().then(doc => {
    if (!doc.exists) {
      crearSalvadoDiario(nombreSalvado);
    }
  }).catch(error => {
    console.error('Error verificando salvado diario:', error);
  });
}

function crearSalvadoDiario(nombre) {
  const configVisual = window.configVisual || {};
  const listasPersonalizadas = configVisual.listasPersonalizadas || [];

  const salvado = {
    fecha: new Date().toISOString().slice(0, 10),
    timestamp: new Date().toISOString(),
    tareas_criticas: appState.agenda.tareas_criticas || [],
    tareas: appState.agenda.tareas || [],
    citas: appState.agenda.citas || [],
    listas_personalizadas: listasPersonalizadas  // ← NUEVO: Incluir listas personalizadas
  };

  console.log('💾 Creando salvado con:', {
    tareas_criticas: salvado.tareas_criticas.length,
    tareas: salvado.tareas.length,
    citas: salvado.citas.length,
    listas_personalizadas: salvado.listas_personalizadas.length
  });

  db.collection('salvados').doc(nombre).set(salvado).then(() => {
    console.log('✅ Salvado diario creado:', nombre);
    registrarAccion('Crear salvado diario', nombre);
    limpiarSalvadosAntiguos();
  }).catch(error => {
    console.error('Error creando salvado diario:', error);
  });
}

function limpiarSalvadosAntiguos() {
  if (!isFirebaseInitialized) return;

  db.collection('salvados').get().then(snapshot => {
    const salvados = [];
    snapshot.forEach(doc => {
      if (doc.id.startsWith('salvadodiario')) {
        salvados.push({ id: doc.id, data: doc.data() });
      }
    });

    // Ordenar por fecha (más recientes primero)
    salvados.sort((a, b) => new Date(b.data.timestamp) - new Date(a.data.timestamp));

    // Si hay más de 15, eliminar los más antiguos
    if (salvados.length > 15) {
      const aEliminar = salvados.slice(15);
      aEliminar.forEach(salvado => {
        db.collection('salvados').doc(salvado.id).delete();
      });
      console.log(`🗑️ Eliminados ${aEliminar.length} salvados antiguos`);
    }
  }).catch(error => {
    console.error('Error limpiando salvados antiguos:', error);
  });
}

function cargarListaSalvados() {
  const container = document.getElementById('backups-container');
  if (!container || !isFirebaseInitialized) return;

  db.collection('salvados').get().then(snapshot => {
    const salvados = [];
    snapshot.forEach(doc => {
      if (doc.id.startsWith('salvadodiario')) {
        salvados.push({ id: doc.id, data: doc.data() });
      }
    });

    if (salvados.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">No hay salvados disponibles</div>';
      return;
    }

    // Ordenar por fecha (más recientes primero)
    salvados.sort((a, b) => new Date(b.data.timestamp) - new Date(a.data.timestamp));

    container.innerHTML = salvados.map(salvado => {
      const fecha = salvado.data.fecha;
      const tareas = (salvado.data.tareas_criticas?.length || 0) + (salvado.data.tareas?.length || 0);
      const citas = salvado.data.citas?.length || 0;

      return `<div style="margin-bottom:8px;padding:10px;border:1px solid #ddd;border-radius:6px;background:white;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:bold;color:#2d5a27;">💾 ${fecha}</div>
            <div style="color:#666;font-size:11px;">${tareas} tareas, ${citas} citas</div>
          </div>
          <button onclick="restaurarSalvado('${salvado.id}')" class="btn-secundario" style="font-size:11px;padding:4px 8px;">🔄 Restaurar</button>
        </div>
      </div>`;
    }).join('');
  }).catch(error => {
    container.innerHTML = '<div style="text-align:center;color:#f44;padding:20px;">Error cargando salvados</div>';
    console.error('Error cargando salvados:', error);
  });
}

function restaurarSalvado(nombreSalvado) {
  const confirmacion = confirm('⚠️ ¿Estás seguro de restaurar este salvado?\n\nSe perderán todos los datos actuales (tareas, citas) y se reemplazarán con los del salvado seleccionado.\n\n¿Continuar?');

  if (!confirmacion) return;

  db.collection('salvados').doc(nombreSalvado).get().then(doc => {
    if (doc.exists) {
      const data = doc.data();

      // Restaurar datos
      appState.agenda.tareas_criticas = data.tareas_criticas || [];
      appState.agenda.tareas = data.tareas || [];
      appState.agenda.citas = data.citas || [];

      // Guardar en Firebase
      guardarJSON(true);

      // Renderizar
      renderizar();

      registrarAccion('Restaurar salvado', nombreSalvado);
      mostrarAlerta('✅ Salvado restaurado correctamente', 'success');

      // Cerrar modal
      cerrarModal('modal-config');
    } else {
      mostrarAlerta('❌ Salvado no encontrado', 'error');
    }
  }).catch(error => {
    mostrarAlerta('❌ Error restaurando salvado: ' + error.message, 'error');
  });
}

function crearSalvadoManual() {
  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, '-');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const nombreSalvado = `salvadodiario${hoy}-manual-${timestamp}`;

  crearSalvadoDiario(nombreSalvado);
  setTimeout(() => cargarListaSalvados(), 1000);
  mostrarAlerta('💾 Salvado manual creado', 'success');
}

// ========== FUNCIONES DE LOG ==========
function cargarLog() {
  const log = JSON.parse(localStorage.getItem('log-acciones') || '[]');
  const container = document.getElementById('log-container');
  if (!container) return;

  if (log.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">No hay acciones registradas</div>';
    return;
  }

  // Mostrar últimas 50 entradas
  const entradas = log.slice(-50).reverse();
  container.innerHTML = entradas.map(entrada =>
    `<div style="margin-bottom:8px;padding:8px;border-left:3px solid #4ecdc4;background:white;">
      <div style="font-weight:bold;color:#2d5a27;">${entrada.accion}</div>
      <div style="color:#666;font-size:11px;">${entrada.fecha} ${entrada.hora}</div>
      ${entrada.detalles ? `<div style="color:#333;margin-top:4px;">${entrada.detalles}</div>` : ''}
    </div>`
  ).join('');
}

function limpiarLog() {
  if (confirm('¿Estás seguro de que quieres limpiar todo el log?')) {
    localStorage.setItem('log-acciones', '[]');
    if (isFirebaseInitialized) {
      db.collection('log').doc('acciones').set({
        entries: [],
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    cargarLog();
    mostrarAlerta('🗑️ Log limpiado', 'info');
  }
}

function exportarLog() {
  const log = JSON.parse(localStorage.getItem('log-acciones') || '[]');
  const texto = log.map(entrada =>
    `${entrada.fecha} ${entrada.hora} - ${entrada.accion}${entrada.detalles ? ': ' + entrada.detalles : ''}`
  ).join('\n');

  const blob = new Blob([texto], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'log-acciones-' + new Date().toISOString().slice(0, 10) + '.txt';
  a.click();
  URL.revokeObjectURL(url);
  mostrarAlerta('📥 Log exportado', 'success');
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
window.registrarAccion = registrarAccion;

function editarEtiqueta(tipo, index) {
  const etiquetas = JSON.parse(localStorage.getItem('etiquetas') || '{}');
  const etiqueta = etiquetas[tipo][index];
  if (!etiqueta) return;

  // Crear modal de edición
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-editar-etiqueta';
  modal.innerHTML = `
    <div class="modal-content">
      <h4>✏️ Editar Etiqueta</h4>
      <div style="display:flex;gap:5px;margin-bottom:10px;flex-wrap:wrap;">
        <input type="text" id="editar-nombre-etiqueta" placeholder="Nombre etiqueta" value="${etiqueta.nombre}" style="flex:1;min-width:120px;padding:6px;">
        <select id="editar-simbolo-etiqueta" style="padding:6px;min-width:100px;">
          <option value="💼">💼 Trabajo</option>
          <option value="🏥">🏥 Salud</option>
          <option value="🎮">🎮 Ocio</option>
          <option value="📚">📚 Estudio</option>
          <option value="🏠">🏠 Casa</option>
          <option value="💰">💰 Finanzas</option>
          <option value="🚗">🚗 Transporte</option>
          <option value="🍽️">🍽️ Comida</option>
          <option value="📞">📞 Llamadas</option>
          <option value="🛍️">🛍️ Compras</option>
          <option value="✈️">✈️ Viajes</option>
          <option value="📱">📱 Tecnología</option>
          <option value="🏋️">🏋️ Ejercicio</option>
          <option value="📝">📝 Documentos</option>
          <option value="🎉">🎉 Eventos</option>
          <option value="👥">👥 Social</option>
          <option value="🎨">🎨 Creatividad</option>
          <option value="🔧">🔧 Reparaciones</option>
          <option value="🌱">🌱 Jardinería</option>
          <option value="📧">📧 Email</option>
        </select>
        <div style="display:flex;gap:3px;align-items:center;">
          <input type="color" id="editar-color-etiqueta" value="${etiqueta.color || '#4ecdc4'}" style="width:35px;height:35px;padding:2px;border:1px solid #ddd;border-radius:4px;">
          <button onclick="guardarEdicionEtiqueta('${tipo}', ${index})" class="btn-primario" style="padding:6px 12px;white-space:nowrap;">✓ Guardar</button>
        </div>
      </div>
      <div class="modal-botones">
        <button class="btn-secundario" onclick="cerrarModalEdicion()">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = 'block';

  // Preseleccionar símbolo actual
  document.getElementById('editar-simbolo-etiqueta').value = etiqueta.simbolo;

  // Foco en el nombre
  setTimeout(() => document.getElementById('editar-nombre-etiqueta').focus(), 100);
}

function guardarEdicionEtiqueta(tipo, index) {
  const nombre = document.getElementById('editar-nombre-etiqueta').value.trim();
  const simbolo = document.getElementById('editar-simbolo-etiqueta').value;
  const color = document.getElementById('editar-color-etiqueta').value;

  if (!nombre) {
    alert('El nombre no puede estar vacío');
    return;
  }

  const etiquetas = JSON.parse(localStorage.getItem('etiquetas') || '{}');
  etiquetas[tipo][index] = { nombre, simbolo, color };

  localStorage.setItem('etiquetas', JSON.stringify(etiquetas));
  guardarConfigEnFirebase();
  renderizarListaEtiquetas(`etiquetas-${tipo}-lista`, tipo);
  actualizarFiltrosEtiquetas();
  registrarAccion('Editar etiqueta', `${simbolo} ${nombre}`);

  cerrarModalEdicion();
  mostrarAlerta('✅ Etiqueta actualizada', 'success');
}

function cerrarModalEdicion() {
  const modal = document.getElementById('modal-editar-etiqueta');
  if (modal) {
    modal.remove();
  }
}

window.editarEtiqueta = editarEtiqueta;
window.guardarEdicionEtiqueta = guardarEdicionEtiqueta;
window.cerrarModalEdicion = cerrarModalEdicion;
// ========== GESTIÓN DE PERSONAS ==========
function inicializarPersonas() {
  const personas = JSON.parse(localStorage.getItem('personas-asignadas') || '[]');
  if (personas.length === 0) {
    const personasDefault = ['Juan', 'María', 'Carlos'];
    localStorage.setItem('personas-asignadas', JSON.stringify(personasDefault));
  }
}

function cargarListaPersonas() {
  const personas = JSON.parse(localStorage.getItem('personas-asignadas') || '[]');
  const container = document.getElementById('personas-lista');
  if (!container) return;

  if (personas.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#666;padding:20px;">No hay personas registradas</div>';
    return;
  }

  container.innerHTML = personas.map((persona, index) =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border:1px solid #ddd;border-radius:4px;margin-bottom:5px;background:white;">
      <span style="font-weight:500;">👤 ${persona}</span>
      <button onclick="eliminarPersona(${index})" style="background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;padding:2px 6px;border-radius:3px;cursor:pointer;font-size:11px;">🗑️</button>
    </div>`
  ).join('');
}

function agregarPersona() {
  const nombre = document.getElementById('nueva-persona').value.trim();
  if (!nombre) return;

  const personas = JSON.parse(localStorage.getItem('personas-asignadas') || '[]');
  if (personas.includes(nombre)) {
    mostrarAlerta('⚠️ Esta persona ya existe', 'warning');
    return;
  }

  personas.push(nombre);
  localStorage.setItem('personas-asignadas', JSON.stringify(personas));

  // Sincronizar con Firebase
  if (isFirebaseInitialized) {
    db.collection('personas').doc('asignadas').set({
      lista: personas,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  document.getElementById('nueva-persona').value = '';
  cargarListaPersonas();
  actualizarFiltrosPersonas();
  registrarAccion('Añadir persona', nombre);
  mostrarAlerta('✅ Persona añadida', 'success');
}

function eliminarPersona(index) {
  const personas = JSON.parse(localStorage.getItem('personas-asignadas') || '[]');
  const nombre = personas[index];

  if (confirm(`¿Eliminar a ${nombre}?`)) {
    personas.splice(index, 1);
    localStorage.setItem('personas-asignadas', JSON.stringify(personas));

    // Sincronizar con Firebase
    if (isFirebaseInitialized) {
      db.collection('personas').doc('asignadas').set({
        lista: personas,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    cargarListaPersonas();
    actualizarFiltrosPersonas();
    registrarAccion('Eliminar persona', nombre);
    mostrarAlerta('🗑️ Persona eliminada', 'info');
  }
}

function actualizarFiltrosPersonas() {
  const personas = JSON.parse(localStorage.getItem('personas-asignadas') || '[]');
  const filtros = ['filtro-persona-criticas', 'filtro-persona-tareas'];

  filtros.forEach(filtroId => {
    const select = document.getElementById(filtroId);
    if (select) {
      const valorActual = select.value;
      select.innerHTML = '<option value="">Todas</option>';
      personas.forEach(persona => {
        const option = document.createElement('option');
        option.value = persona;
        option.textContent = persona;
        if (persona === valorActual) option.selected = true;
        select.appendChild(option);
      });
    }
  });
}

function actualizarFiltrosEtiquetas() {
  const etiquetas = JSON.parse(localStorage.getItem('etiquetas') || '{}');

  // Filtros de tareas
  const filtroTareas = document.getElementById('filtro-etiqueta-tareas');
  if (filtroTareas && etiquetas.tareas) {
    const valorActual = filtroTareas.value;
    filtroTareas.innerHTML = '<option value="">Todas</option>';
    etiquetas.tareas.forEach(etiqueta => {
      const option = document.createElement('option');
      option.value = etiqueta.nombre;
      option.textContent = `${etiqueta.simbolo} ${etiqueta.nombre}`;
      if (etiqueta.nombre === valorActual) option.selected = true;
      filtroTareas.appendChild(option);
    });
  }

  // Filtros de críticas
  const filtroCriticas = document.getElementById('filtro-etiqueta-criticas');
  if (filtroCriticas && etiquetas.tareas) {
    const valorActual = filtroCriticas.value;
    filtroCriticas.innerHTML = '<option value="">Todas</option>';
    etiquetas.tareas.forEach(etiqueta => {
      const option = document.createElement('option');
      option.value = etiqueta.nombre;
      option.textContent = `${etiqueta.simbolo} ${etiqueta.nombre}`;
      if (etiqueta.nombre === valorActual) option.selected = true;
      filtroCriticas.appendChild(option);
    });
  }
}

window.cargarLog = cargarLog;
window.limpiarLog = limpiarLog;
window.exportarLog = exportarLog;
window.verificarSalvadoDiario = verificarSalvadoDiario;
window.crearSalvadoDiario = crearSalvadoDiario;
window.limpiarSalvadosAntiguos = limpiarSalvadosAntiguos;
window.cargarListaSalvados = cargarListaSalvados;
window.restaurarSalvado = restaurarSalvado;
window.crearSalvadoManual = crearSalvadoManual;
window.guardarConfigEnFirebase = guardarConfigEnFirebase;
window.aplicarConfiguracionSincronizada = aplicarConfiguracionSincronizada;
window.inicializarPersonas = inicializarPersonas;
window.cargarListaPersonas = cargarListaPersonas;
window.agregarPersona = agregarPersona;
window.eliminarPersona = eliminarPersona;
window.actualizarFiltrosPersonas = actualizarFiltrosPersonas;
window.actualizarFiltrosEtiquetas = actualizarFiltrosEtiquetas;
window.mostrarResumenDiario = mostrarResumenDiario;
window.cerrarResumenDiario = cerrarResumenDiario;

function mostrarResumenDiarioManual() {
  const hoy = new Date().toISOString().slice(0, 10);

  // Buscar tareas del día
  const tareasHoy = [...(appState.agenda.tareas_criticas || []), ...(appState.agenda.tareas || [])]
    .filter(t => !t.completada && (t.fecha_fin === hoy || t.fecha_migrar === hoy));

  // Buscar tareas pasadas
  const tareasPasadas = [...(appState.agenda.tareas_criticas || []), ...(appState.agenda.tareas || [])]
    .filter(t => !t.completada && ((t.fecha_fin && esFechaPasada(t.fecha_fin)) || (t.fecha_migrar && esFechaPasada(t.fecha_migrar))));

  // Buscar citas del día
  const citasHoy = (appState.agenda.citas || []).filter(c => c.fecha === hoy);

  let contenido = `🌅 RESUMEN DEL DÍA - ${hoy}\n\n`;

  if (tareasHoy.length === 0 && citasHoy.length === 0 && tareasPasadas.length === 0) {
    contenido += '🎉 ¡No tienes tareas ni citas pendientes!\n\n😎 ¡Disfruta tu día libre!';
  } else {
    if (tareasPasadas.length > 0) {
      contenido += `⚠️ TAREAS ATRASADAS (${tareasPasadas.length}):\n`;
      tareasPasadas.forEach((t, i) => {
        const texto = t.titulo || t.texto;
        const fecha = t.fecha_fin || t.fecha_migrar;
        const tipo = appState.agenda.tareas_criticas?.includes(t) ? '😨' : '✅';
        contenido += `${i + 1}. ${tipo} ${texto} (${fecha})\n`;
      });
      contenido += '\n';
    }

    if (tareasHoy.length > 0) {
      contenido += `📝 TAREAS DE HOY (${tareasHoy.length}):\n`;
      tareasHoy.forEach((t, i) => {
        const texto = t.titulo || t.texto;
        const tipo = appState.agenda.tareas_criticas?.includes(t) ? '😨' : '✅';
        contenido += `${i + 1}. ${tipo} ${texto}\n`;
      });
      contenido += '\n';
    }

    if (citasHoy.length > 0) {
      contenido += `📅 CITAS DE HOY (${citasHoy.length}):\n`;
      citasHoy.forEach((c, i) => {
        const descripcion = (c.nombre && c.nombre.includes(' - ')) ? c.nombre.split(' - ')[1] : (c.nombre || 'Sin descripción');
        const hora = (c.nombre && c.nombre.includes(' - ')) ? c.nombre.split(' - ')[0] : '';
        contenido += `${i + 1}. 🕰️ ${hora} - ${descripcion}\n`;
      });
      contenido += '\n';
    }

    contenido += '💪 ¡Que tengas un día productivo!';
  }

  // Crear overlay
  const overlay = document.createElement('div');
  overlay.className = 'dashboard-overlay';
  overlay.innerHTML = `
    <div class="dashboard-content" style="max-width:500px;">
      <pre style="white-space:pre-wrap;font-family:inherit;">${contenido}</pre>
      <div style="margin-top:20px;text-align:center;">
        <button onclick="cerrarResumenDiario()" class="btn-primario">Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.classList.add('show');
}

window.mostrarResumenDiarioManual = mostrarResumenDiarioManual;

// ========== CARGAR HISTORIAL DESDE FIREBASE ==========
async function cargarHistorialFirebase() {
  if (!isFirebaseInitialized) {
    console.warn('⚠️ Firebase no inicializado, cargando historial local');
    // Cargar datos locales como fallback
    const historialTareas = JSON.parse(localStorage.getItem('historial-tareas') || '[]');
    const historialEliminados = JSON.parse(localStorage.getItem('historial-eliminados') || '[]');
    const historialSentimientos = JSON.parse(localStorage.getItem('historial-sentimientos') || '[]');

    return [...historialTareas, ...historialEliminados, ...historialSentimientos];
  }

  try {
    // Cargar desde Firebase usando la nueva estructura
    const [historialDoc, sentimientosDoc, logDoc] = await Promise.all([
      db.collection('historial').doc('eliminados').get(),
      db.collection('sentimientos').doc('data').get(),
      db.collection('log').doc('acciones').get()
    ]);

    const historialCompleto = [];

    // Agregar elementos del historial de eliminados
    if (historialDoc.exists) {
      const historialData = historialDoc.data();
      if (historialData.items && Array.isArray(historialData.items)) {
        historialData.items.forEach(item => {
          historialCompleto.push({
            ...item,
            tipo: 'eliminado'
          });
        });
      }
    }

    // Agregar sentimientos
    if (sentimientosDoc.exists) {
      const sentimientosData = sentimientosDoc.data();
      if (sentimientosData.sentimientos) {
        // Si es un string, intentar parsearlo
        let sentimientos = sentimientosData.sentimientos;
        if (typeof sentimientos === 'string') {
          try {
            sentimientos = JSON.parse(sentimientos);
          } catch (e) {
            sentimientos = [];
          }
        }

        if (Array.isArray(sentimientos)) {
          sentimientos.forEach(sentimiento => {
            historialCompleto.push({
              ...sentimiento,
              tipo: 'sentimiento'
            });
          });
        }
      }
    }

    // Agregar log de acciones
    if (logDoc.exists) {
      const logData = logDoc.data();
      if (logData.entries && Array.isArray(logData.entries)) {
        logData.entries.forEach(entry => {
          historialCompleto.push({
            ...entry,
            tipo: 'accion'
          });
        });
      }
    }

    // Agregar historial local como complemento
    const historialLocal = JSON.parse(localStorage.getItem('historial-tareas') || '[]');
    historialLocal.forEach(item => {
      historialCompleto.push({
        ...item,
        tipo: 'tarea_local'
      });
    });

    // Ordenar por timestamp/fecha
    historialCompleto.sort((a, b) => {
      const fechaA = new Date(a.timestamp || a.fecha + 'T00:00:00' || '2000-01-01');
      const fechaB = new Date(b.timestamp || b.fecha + 'T00:00:00' || '2000-01-01');
      return fechaB - fechaA; // Más recientes primero
    });

    console.log(`✅ Historial cargado desde Firebase: ${historialCompleto.length} elementos`);
    return historialCompleto;

  } catch (error) {
    console.error('❌ Error cargando historial desde Firebase:', error);
    // Fallback a localStorage
    const historialTareas = JSON.parse(localStorage.getItem('historial-tareas') || '[]');
    const historialEliminados = JSON.parse(localStorage.getItem('historial-eliminados') || '[]');
    const historialSentimientos = JSON.parse(localStorage.getItem('historial-sentimientos') || '[]');

    return [...historialTareas, ...historialEliminados, ...historialSentimientos];
  }
}

window.cargarHistorialFirebase = cargarHistorialFirebase;

// ========== EXPORTAR NUEVAS FUNCIONES DE CONECTIVIDAD ==========
window.mostrarAlertaConectividad = mostrarAlertaConectividad;
window.cerrarModalConectividad = cerrarModalConectividad;
window.verificarConectividad = verificarConectividad;
window.ejecutarOperacionFirebase = ejecutarOperacionFirebase;

