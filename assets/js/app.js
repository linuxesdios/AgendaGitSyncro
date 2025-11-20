// ========== ESTADO GLOBAL ==========
const appState = {
  agenda: {
    fecha: new Date().toISOString().slice(0, 10),
    dia_semana: '',
    tareas_criticas: [],
    tareas: [],
    notas: '',
    sentimientos: '',
    citas: [],
    personas: []
  },
  calendar: {
    currentDate: new Date(),
    selectedDate: null
  },
  sync: {
    autoSaveTimer: null,
    saveQueue: [],
    isSaving: false
  },
  ui: {
    tareaSeleccionada: null,
    tareaEditando: null,
    criticaEditando: null,
    mostrarLargoPlazo: true
  },
  filtros: {
    criticas: {
      estado: '',
      fecha: '',
      persona: '',
      etiqueta: ''
    },
    tareas: {
      estado: '',
      fecha: '',
      persona: '',
      etiqueta: ''
    }
  }
};

// ========== CONFIGURACIÓN EXTENDSCLASS ==========
// Compatibilidad con Firebase
function getExtendsClassConfig() {
  return { configured: true };
}

// ========== DETECCIÓN DE DISPOSITIVO ==========
const isMobile = () => {
  return window.innerWidth <= 1024 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
};

const isTabletOrMobile = () => {
  return window.innerWidth <= 1024 && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
};

const isDesktop = () => {
  return !isMobile() && window.matchMedia('(pointer: fine)').matches;
};

// ========== INICIALIZACIÓN PRINCIPAL ==========
document.addEventListener('DOMContentLoaded', () => {
  console.log('Iniciando aplicación...');
  window.appStartTime = Date.now();
  
  // Aplicar clases adaptativas
  document.body.classList.add(isMobile() ? 'mobile-device' : 'desktop-device');
  
  // Cargar configuración visual guardada
  cargarConfigVisual();
  
  // Cargar configuración de opciones
  cargarConfigOpciones();
  
  actualizarFecha();
  initializeCalendar();
  renderCalendar();
  
  // Renderizar estado inicial (puede estar vacío)
  renderizar();

  // Firebase se inicializa automáticamente en sincronizacion-simple.js
  
  // Logs de depuración
  setTimeout(() => {
    console.log('🔍 Cargando: citas desde localStorage:', localStorage.getItem('agenda'));
    console.log('🔍 Cargando: appState.agenda.citas:', appState.agenda.citas);
    console.log('🔍 Cargando: Total citas en memoria:', appState.agenda.citas?.length || 0);
    
    // LIMPIAR localStorage de citas
    const agendaLocal = localStorage.getItem('agenda');
    if (agendaLocal) {
      try {
        const data = JSON.parse(agendaLocal);
        if (data.citas && data.citas.length > 0) {
          console.warn('⚠️ Encontradas citas en localStorage, ELIMINANDO...');
          data.citas = [];
          localStorage.setItem('agenda', JSON.stringify(data));
          console.log('✅ localStorage limpiado');
        }
      } catch (e) {
        console.error('Error limpiando localStorage:', e);
      }
    }
    
    const calendarioIntegrado = document.getElementById('calendario-citas-integrado');
    if (calendarioIntegrado && calendarioIntegrado.style.display === 'block') {
      if (typeof initializeCalendarioIntegrado === 'function') {
        initializeCalendarioIntegrado();
      }
    }
  }, 1000);
  
  // Listener optimizado para cambios en notas
  const notasEl = document.getElementById('notas-texto');
  if (notasEl) {
    const optimizedHandler = debounce(() => {
      appState.agenda.notas = notasEl.value;
      autoResizeTextarea(notasEl);
      autoCapitalize(notasEl);
      scheduleAutoSave();
    }, 300);
    
    notasEl.addEventListener('input', optimizedHandler);
    autoResizeTextarea(notasEl);
  }
  
  // Listener optimizado para cambios en sentimientos
  const sentimientosEl = document.getElementById('sentimientos-texto');
  if (sentimientosEl) {
    const optimizedHandler = debounce(() => {
      appState.agenda.sentimientos = sentimientosEl.value;
      guardarSentimiento(sentimientosEl.value);
      autoResizeTextarea(sentimientosEl);
      autoCapitalize(sentimientosEl);
      scheduleAutoSave();
    }, 300);
    
    sentimientosEl.addEventListener('input', optimizedHandler);
    autoResizeTextarea(sentimientosEl);
  }
  
  // Configurar auto-capitalización
  setupAutoCapitalize();
  
  // Configurar header colapsable en móvil
  if (isMobile()) {
    const headerCenter = document.querySelector('.header-center');
    let headerTimer;
    
    const collapseHeader = () => {
      headerCenter.classList.add('collapsed');
    };
    
    const expandHeader = () => {
      headerCenter.classList.remove('collapsed');
      clearTimeout(headerTimer);
      headerTimer = setTimeout(collapseHeader, 5000);
    };
    
    headerCenter.addEventListener('click', expandHeader);
    
    // Auto-colapsar después de 5 segundos
    headerTimer = setTimeout(collapseHeader, 5000);
  }
  
  // Firebase maneja la sincronización automática
});

function actualizarFecha() {
  const hoy = new Date();
  const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('fecha-actual').textContent = hoy.toLocaleDateString('es-ES', opciones);
}

// ========== UTILIDADES ==========
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function escapeHtml(text) {
  if (!text) return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function escapeXml(text) {
  return escapeHtml(text);
}

function mostrarAlerta(mensaje, tipo) {
  // Crear toast notification
  const toast = document.createElement('div');
  toast.className = `toast-notification ${tipo}`;
  toast.textContent = mensaje;
  
  document.body.appendChild(toast);
  
  // Mostrar con animación
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  // Ocultar y eliminar
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// ========== FUNCIONES DE FECHA ==========
function esFechaHoy(fecha) {
  if (!fecha) return false;
  const hoy = new Date().toISOString().slice(0, 10);
  return fecha === hoy;
}

function esFechaPasada(fecha) {
  if (!fecha) return false;
  const hoy = new Date().toISOString().slice(0, 10);
  return fecha < hoy;
}

function esLargoPlazo(fecha) {
  if (!fecha) return false;
  const hoy = new Date();
  const fechaTarea = new Date(fecha);
  const diferenciaDias = Math.ceil((fechaTarea - hoy) / (1000 * 60 * 60 * 24));
  return diferenciaDias > 15;
}

// ========== AUTO-RESIZE TEXTAREA ==========
function autoResizeTextarea(textarea) {
  if (!textarea) return;
  
  // Resetear altura para calcular correctamente
  textarea.style.height = 'auto';
  
  // Calcular nueva altura basada en el contenido
  const scrollHeight = textarea.scrollHeight;
  const minHeight = 60; // min-height del CSS
  const maxHeight = 300; // max-height del CSS
  
  // Si no hay contenido, usar altura mínima
  if (!textarea.value.trim()) {
    textarea.style.height = minHeight + 'px';
    return;
  }
  
  // Ajustar altura entre min y max
  const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
  textarea.style.height = newHeight + 'px';
}

// ========== AUTO-CAPITALIZE ==========
function autoCapitalize(input) {
  const cursorPos = input.selectionStart;
  const value = input.value;
  
  // Solo capitalizar la primera letra del texto completo
  if (value.length > 0 && cursorPos === 1) {
    const newValue = value[0].toUpperCase() + value.substring(1);
    input.value = newValue;
    input.setSelectionRange(cursorPos, cursorPos);
  }
}

function setupAutoCapitalize() {
  // Aplicar a todos los inputs de texto y textareas
  document.querySelectorAll('input[type="text"], textarea, #cita-descripcion').forEach(input => {
    input.addEventListener('input', () => autoCapitalize(input));
  });
}

// ========== AUTO-SAVE ==========
function scheduleAutoSave() {
  // Auto-guardado con Firebase cada 5 segundos después de cambios
  if (appState.sync.autoSaveTimer) clearTimeout(appState.sync.autoSaveTimer);
  appState.sync.autoSaveTimer = setTimeout(() => {
    guardarJSON(true);
  }, 5000);
}

// Cerrar modal al hacer clic fuera
window.onclick = (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
};

function cargarConfigOpciones() {
  const config = JSON.parse(localStorage.getItem('config-opciones') || '{}');
  // Aplicar configuración por defecto si no existe
  if (!localStorage.getItem('config-opciones')) {
    const configDefault = {
      forzarFecha: false,
      sinTactil: false,
      mostrarTodo: false,
      botonesBorrar: false
    };
    localStorage.setItem('config-opciones', JSON.stringify(configDefault));
  }
}

function cargarConfigVisual() {
  const config = JSON.parse(localStorage.getItem('config-visual') || '{}');
  console.log('📊 Cargando configuración visual:', config);
  
  const tema = config.tema || 'verde';
  document.body.classList.remove('tema-verde', 'tema-azul', 'tema-amarillo', 'tema-oscuro');
  document.body.classList.add('tema-' + tema);
  
  // Actualizar título si hay nombre configurado
  const nombre = config.nombre || 'Pablo';
  const titulo = document.getElementById('titulo-agenda');
  if (titulo) {
    titulo.textContent = '🧠 Agenda de ' + nombre + ' 😊';
  }
  
  // Mostrar/ocultar secciones
  const mostrarNotas = config.mostrarNotas !== false;
  const mostrarSentimientos = config.mostrarSentimientos !== false;
  const seccionNotas = document.getElementById('seccion-notas');
  const seccionSentimientos = document.getElementById('seccion-sentimientos');
  if (seccionNotas) seccionNotas.style.display = mostrarNotas ? 'block' : 'none';
  if (seccionSentimientos) seccionSentimientos.style.display = mostrarSentimientos ? 'block' : 'none';
  
  // Configurar visualización del calendario de citas
  const calendarioCitas = config.calendarioCitas || 'boton';
  const btnCalendario = document.getElementById('btn-calendario-citas');
  const calendarioIntegrado = document.getElementById('calendario-citas-integrado');
  
  console.log('📅 Modo calendario:', calendarioCitas);
  
  if (calendarioCitas === 'integrado') {
    if (btnCalendario) btnCalendario.style.display = 'none';
    if (calendarioIntegrado) calendarioIntegrado.style.display = 'block';
  } else {
    if (btnCalendario) btnCalendario.style.display = 'inline-block';
    if (calendarioIntegrado) calendarioIntegrado.style.display = 'none';
  }
}

// Hacer funciones disponibles globalmente para compatibilidad
window.appState = appState;
window.getExtendsClassConfig = getExtendsClassConfig;
window.isMobile = isMobile;
window.isTabletOrMobile = isTabletOrMobile;
window.isDesktop = isDesktop;
window.debounce = debounce;
window.escapeHtml = escapeHtml;
window.escapeXml = escapeXml;
window.mostrarAlerta = mostrarAlerta;
window.esFechaHoy = esFechaHoy;
window.esFechaPasada = esFechaPasada;
window.esLargoPlazo = esLargoPlazo;
window.autoResizeTextarea = autoResizeTextarea;
window.autoCapitalize = autoCapitalize;
window.setupAutoCapitalize = setupAutoCapitalize;
window.scheduleAutoSave = scheduleAutoSave;
window.cargarConfigOpciones = cargarConfigOpciones;
window.cargarConfigVisual = cargarConfigVisual;


// ========== CONFIGURACIÓN VISUAL ==========
function guardarConfigVisualPanel() {
  const config = {
    tema: document.getElementById('config-tema-select')?.value || 'verde',
    nombre: document.getElementById('config-nombre-input')?.value || 'Pablo',
    modoVisualizacion: document.getElementById('config-modo-visualizacion')?.value || 'estado',
    popupCelebracion: document.getElementById('config-popup-celebracion')?.checked !== false,
    mostrarNotas: document.getElementById('config-mostrar-notas')?.checked !== false,
    mostrarSentimientos: document.getElementById('config-mostrar-sentimientos')?.checked !== false,
    calendarioCitas: document.getElementById('config-calendario-citas')?.value || 'boton',
    frases: document.getElementById('config-frases-motivacionales')?.value.split('\n').filter(f => f.trim()) || []
  };
  
  console.log('💾 Guardando configuración visual:', config);
  localStorage.setItem('config-visual', JSON.stringify(config));
  
  // Aplicar configuración inmediatamente
  cargarConfigVisual();
  
  // Sincronizar con Firebase
  if (typeof guardarConfigEnFirebase === 'function') {
    console.log('🔥 Sincronizando con Firebase...');
    guardarConfigEnFirebase();
  } else {
    console.warn('⚠️ guardarConfigEnFirebase no disponible');
  }
  
  mostrarAlerta('✅ Configuración visual guardada', 'success');
}

function switchTab(tabName) {
  // Ocultar todos los contenidos
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Desactivar todos los botones
  document.querySelectorAll('.config-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Activar el tab seleccionado
  const tabContent = document.getElementById(`tab-${tabName}`);
  if (tabContent) {
    tabContent.classList.add('active');
  }
  
  // Activar el botón correspondiente
  event.target.classList.add('active');
  
  // Cargar datos específicos del tab
  if (tabName === 'visual') {
    cargarConfigVisualEnFormulario();
  } else if (tabName === 'funcionales') {
    cargarConfigFuncionalesEnFormulario();
  } else if (tabName === 'etiquetas') {
    if (typeof cargarListaEtiquetas === 'function') {
      cargarListaEtiquetas();
    }
  } else if (tabName === 'personas') {
    if (typeof cargarListaPersonas === 'function') {
      cargarListaPersonas();
    }
  } else if (tabName === 'backups') {
    if (typeof cargarListaSalvados === 'function') {
      cargarListaSalvados();
    }
  } else if (tabName === 'log') {
    if (typeof cargarLog === 'function') {
      cargarLog();
    }
  }
}

function cargarConfigVisualEnFormulario() {
  const config = JSON.parse(localStorage.getItem('config-visual') || '{}');
  console.log('📝 Cargando configuración visual en formulario:', config);
  
  const temaSelect = document.getElementById('config-tema-select');
  if (temaSelect) temaSelect.value = config.tema || 'verde';
  
  const nombreInput = document.getElementById('config-nombre-input');
  if (nombreInput) nombreInput.value = config.nombre || 'Pablo';
  
  const modoVisualizacion = document.getElementById('config-modo-visualizacion');
  if (modoVisualizacion) modoVisualizacion.value = config.modoVisualizacion || 'estado';
  
  const popupCelebracion = document.getElementById('config-popup-celebracion');
  if (popupCelebracion) popupCelebracion.checked = config.popupCelebracion !== false;
  
  const mostrarNotas = document.getElementById('config-mostrar-notas');
  if (mostrarNotas) mostrarNotas.checked = config.mostrarNotas !== false;
  
  const mostrarSentimientos = document.getElementById('config-mostrar-sentimientos');
  if (mostrarSentimientos) mostrarSentimientos.checked = config.mostrarSentimientos !== false;
  
  const calendarioCitas = document.getElementById('config-calendario-citas');
  if (calendarioCitas) {
    calendarioCitas.value = config.calendarioCitas || 'boton';
    console.log('📅 Calendario citas configurado como:', calendarioCitas.value);
  }
  
  const frasesMotivacionales = document.getElementById('config-frases-motivacionales');
  if (frasesMotivacionales) frasesMotivacionales.value = (config.frases || []).join('\n');
}

function cargarConfigFuncionalesEnFormulario() {
  const config = JSON.parse(localStorage.getItem('config-funcionales') || '{}');
  
  const fechaObligatoria = document.getElementById('config-fecha-obligatoria');
  if (fechaObligatoria) fechaObligatoria.checked = config.fechaObligatoria || false;
  
  const confirmacionBorrar = document.getElementById('config-confirmacion-borrar');
  if (confirmacionBorrar) confirmacionBorrar.checked = config.confirmacionBorrar !== false;
  
  const autoMayuscula = document.getElementById('config-auto-mayuscula');
  if (autoMayuscula) autoMayuscula.checked = config.autoMayuscula !== false;
  
  const popupDiario = document.getElementById('config-popup-diario');
  if (popupDiario) popupDiario.checked = config.popupDiario || false;
  
  const notificacionesActivas = document.getElementById('config-notificaciones-activas');
  if (notificacionesActivas) notificacionesActivas.checked = config.notificacionesActivas || false;
  
  const notif1Dia = document.getElementById('config-notif-1-dia');
  if (notif1Dia) notif1Dia.checked = config.notif1Dia || false;
  
  const notif2Horas = document.getElementById('config-notif-2-horas');
  if (notif2Horas) notif2Horas.checked = config.notif2Horas || false;
  
  const notif30Min = document.getElementById('config-notif-30-min');
  if (notif30Min) notif30Min.checked = config.notif30Min || false;
}

function guardarConfigFuncionales() {
  const config = {
    fechaObligatoria: document.getElementById('config-fecha-obligatoria')?.checked || false,
    confirmacionBorrar: document.getElementById('config-confirmacion-borrar')?.checked !== false,
    autoMayuscula: document.getElementById('config-auto-mayuscula')?.checked !== false,
    popupDiario: document.getElementById('config-popup-diario')?.checked || false,
    notificacionesActivas: document.getElementById('config-notificaciones-activas')?.checked || false,
    notif1Dia: document.getElementById('config-notif-1-dia')?.checked || false,
    notif2Horas: document.getElementById('config-notif-2-horas')?.checked || false,
    notif30Min: document.getElementById('config-notif-30-min')?.checked || false
  };
  
  localStorage.setItem('config-funcionales', JSON.stringify(config));
  
  // Sincronizar con Firebase si está disponible
  if (typeof guardarConfigEnFirebase === 'function') {
    guardarConfigEnFirebase();
  }
  
  mostrarAlerta('✅ Configuración funcional guardada', 'success');
}

function toggleConfigFloating() {
  abrirModal('modal-config');
  // Cargar configuración visual por defecto
  cargarConfigVisualEnFormulario();
}

window.guardarConfigVisualPanel = guardarConfigVisualPanel;
window.switchTab = switchTab;
window.cargarConfigVisualEnFormulario = cargarConfigVisualEnFormulario;
window.cargarConfigFuncionalesEnFormulario = cargarConfigFuncionalesEnFormulario;
window.guardarConfigFuncionales = guardarConfigFuncionales;
window.toggleConfigFloating = toggleConfigFloating;

// ========== EDITOR DE BASE DE DATOS ==========
function abrirEditorBaseDatos() {
  // Verificar si Firebase está disponible de múltiples formas
  const firebaseDisponible = window.db &&
    (window.isFirebaseInitialized ||
     (typeof window.firebase !== 'undefined' && window.firebase.apps && window.firebase.apps.length > 0));

  if (!firebaseDisponible) {
    mostrarAlerta('❌ Firebase no está inicializado. No se puede acceder a la base de datos.', 'error');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-editor-db';
  modal.style.zIndex = '2000';

  modal.innerHTML = `
    <div class="modal-content" style="max-width:900px;height:85vh;">
      <h4>🔧 Editor de Base de Datos Firebase</h4>
      <p style="font-size:12px;color:#666;margin-bottom:15px;">
        ⚠️ <strong>Advertencia:</strong> Estás editando directamente Firebase.
        Los cambios se aplicarán inmediatamente en la nube.
      </p>

      <div style="display:flex;gap:10px;margin-bottom:15px;">
        <label style="font-weight:bold;align-self:center;">📋 Tabla:</label>
        <select id="selector-tabla" onchange="cargarTablaFirebase()" style="flex:1;padding:8px;border-radius:4px;border:1px solid #ddd;">
          <option value="">Selecciona una tabla...</option>
          <option value="tareas">📝 Tareas</option>
          <option value="citas">📅 Citas</option>
          <option value="notas">📄 Notas</option>
          <option value="sentimientos">💭 Sentimientos</option>
          <option value="historial/eliminados">🗑️ Historial Eliminados</option>
          <option value="config/settings">⚙️ Configuración</option>
          <option value="personas/asignadas">👥 Personas</option>
          <option value="log/acciones">📊 Log de Acciones</option>
        </select>
        <button class="btn-secundario" onclick="cargarTablaFirebase()" style="padding:8px 12px;">🔄 Cargar</button>
      </div>

      <div id="info-tabla" style="margin-bottom:15px;padding:8px;background:#f5f5f5;border-radius:4px;display:none;"></div>

      <div style="margin-bottom:15px;">
        <textarea
          id="editor-firebase-datos"
          style="width:100%;height:400px;font-family:monospace;font-size:12px;border:1px solid #ddd;border-radius:4px;padding:10px;resize:vertical;"
          placeholder="Selecciona una tabla para comenzar a editar..."
          readonly
        ></textarea>
      </div>

      <div style="display:flex;gap:10px;margin-bottom:15px;">
        <button class="btn-secundario" onclick="validarJSONFirebase()" style="flex:1;">✅ Validar</button>
        <button class="btn-secundario" onclick="formatearJSONFirebase()" style="flex:1;">🎨 Formatear</button>
        <button class="btn-secundario" onclick="restaurarTablaFirebase()" style="flex:1;">🔄 Restaurar</button>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:15px;">
        <button class="btn-secundario" onclick="forzarSincronizacion()" style="flex:1;">⚡ Sincronizar App</button>
        <button class="btn-secundario" onclick="limpiarDatosLocales()" style="flex:1;">🧹 Limpiar Local</button>
      </div>

      <div id="estado-firebase" style="margin-bottom:15px;padding:10px;border-radius:4px;display:none;"></div>

      <div class="modal-botones">
        <button id="btn-guardar-firebase" class="btn-primario" onclick="guardarTablaFirebase()" disabled>💾 Guardar en Firebase</button>
        <button class="btn-secundario" onclick="cerrarModal('modal-editor-db')">❌ Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = 'block';
}

let datosOriginalesFirebase = null;
let tablaActualFirebase = null;

async function cargarTablaFirebase() {
  const selector = document.getElementById('selector-tabla');
  const textarea = document.getElementById('editor-firebase-datos');
  const info = document.getElementById('info-tabla');
  const estado = document.getElementById('estado-firebase');
  const btnGuardar = document.getElementById('btn-guardar-firebase');

  if (!selector || !textarea) return;

  const tabla = selector.value;
  if (!tabla) {
    textarea.value = '';
    textarea.readOnly = true;
    btnGuardar.disabled = true;
    info.style.display = 'none';
    estado.style.display = 'none';
    return;
  }

  estado.style.display = 'block';
  estado.style.background = '#fff3cd';
  estado.innerHTML = '🔄 Cargando datos de Firebase...';

  try {
    tablaActualFirebase = tabla;
    const [collection, documento] = tabla.includes('/') ? tabla.split('/') : [tabla, 'data'];

    console.log(`🔍 Cargando: ${collection}/${documento}`);

    const docRef = window.db.collection(collection).doc(documento);
    const docSnap = await docRef.get();

    let datos = {};
    if (docSnap.exists) {
      datos = docSnap.data();
    } else {
      console.warn(`⚠️ Documento ${collection}/${documento} no existe`);
      datos = { mensaje: 'Documento no existe en Firebase' };
    }

    datosOriginalesFirebase = JSON.parse(JSON.stringify(datos));
    textarea.value = JSON.stringify(datos, null, 2);
    textarea.readOnly = false;
    btnGuardar.disabled = false;

    // Mostrar información de la tabla
    let infoExtra = '';
    if (collection === 'citas' && datos.citas) {
      const citasConFormatos = datos.citas.reduce((acc, cita) => {
        if (cita.hora && cita.descripcion) acc.nuevas++;
        else if (cita.nombre) acc.viejas++;
        else acc.inconsistentes++;
        return acc;
      }, { nuevas: 0, viejas: 0, inconsistentes: 0 });

      infoExtra = `<br>🔍 ${datos.citas.length} citas: ${citasConFormatos.viejas} formato viejo, ${citasConFormatos.nuevas} formato nuevo`;
      if (citasConFormatos.inconsistentes > 0) {
        infoExtra += `, ⚠️ ${citasConFormatos.inconsistentes} inconsistentes`;
      }
    }

    info.style.display = 'block';
    info.innerHTML = `
      📋 <strong>${collection}/${documento}</strong><br>
      📊 Tamaño: ${JSON.stringify(datos).length} caracteres<br>
      🔑 Campos: ${Object.keys(datos).length}${infoExtra}
    `;

    estado.style.display = 'block';
    estado.style.background = '#e8f5e8';
    estado.style.color = '#2e7d32';
    estado.innerHTML = '✅ Datos cargados correctamente desde Firebase';

  } catch (error) {
    console.error('Error cargando tabla:', error);
    estado.style.display = 'block';
    estado.style.background = '#ffe6e6';
    estado.style.color = '#d32f2f';
    estado.innerHTML = `❌ Error: ${error.message}`;

    textarea.value = '';
    textarea.readOnly = true;
    btnGuardar.disabled = true;
    datosOriginalesFirebase = null;
  }
}

function validarJSONFirebase() {
  const textarea = document.getElementById('editor-firebase-datos');
  const estado = document.getElementById('estado-firebase');

  if (!textarea || !estado) return;

  try {
    const datos = JSON.parse(textarea.value);
    estado.style.display = 'block';
    estado.style.background = '#e8f5e8';
    estado.style.color = '#2e7d32';
    estado.innerHTML = `✅ <strong>JSON válido</strong><br>🔑 ${Object.keys(datos).length} campos, ${JSON.stringify(datos).length} caracteres`;
  } catch (error) {
    estado.style.display = 'block';
    estado.style.background = '#ffe6e6';
    estado.style.color = '#d32f2f';
    estado.innerHTML = `❌ <strong>Error de sintaxis JSON:</strong><br>${error.message}`;
  }
}

function formatearJSONFirebase() {
  const textarea = document.getElementById('editor-firebase-datos');
  if (!textarea || textarea.readOnly) return;

  try {
    const datos = JSON.parse(textarea.value);
    textarea.value = JSON.stringify(datos, null, 2);
    mostrarAlerta('🎨 JSON formateado correctamente', 'success');
  } catch (error) {
    mostrarAlerta('❌ Error: JSON inválido, no se puede formatear', 'error');
  }
}

function restaurarTablaFirebase() {
  const textarea = document.getElementById('editor-firebase-datos');
  const estado = document.getElementById('estado-firebase');

  if (!textarea || !datosOriginalesFirebase) return;

  textarea.value = JSON.stringify(datosOriginalesFirebase, null, 2);

  if (estado) {
    estado.style.display = 'block';
    estado.style.background = '#fff3cd';
    estado.innerHTML = '🔄 Datos restaurados al estado original de Firebase';
  }

  mostrarAlerta('🔄 Datos restaurados desde Firebase', 'info');
}

async function guardarTablaFirebase() {
  const textarea = document.getElementById('editor-firebase-datos');
  const estado = document.getElementById('estado-firebase');

  if (!textarea || !tablaActualFirebase) {
    mostrarAlerta('❌ No hay tabla seleccionada', 'error');
    return;
  }

  try {
    const nuevosDatos = JSON.parse(textarea.value);

    const confirmacion = confirm(`
🔥 ¿Guardar cambios en Firebase?

📋 Tabla: ${tablaActualFirebase}
📊 Campos: ${Object.keys(nuevosDatos).length}
📏 Tamaño: ${JSON.stringify(nuevosDatos).length} caracteres

⚠️ Esta acción actualizará directamente la base de datos en la nube.
¿Continuar?`);

    if (!confirmacion) return;

    estado.style.display = 'block';
    estado.style.background = '#fff3cd';
    estado.innerHTML = '🔄 Procesando y guardando cambios en Firebase...';

    const [collection, documento] = tablaActualFirebase.includes('/') ?
      tablaActualFirebase.split('/') : [tablaActualFirebase, 'data'];

    // Normalizar datos específicos para citas
    let datosNormalizados = { ...nuevosDatos };
    if (collection === 'citas' && datosNormalizados.citas && Array.isArray(datosNormalizados.citas)) {
      console.log('📝 Normalizando estructura de citas...');

      datosNormalizados.citas = datosNormalizados.citas.map(cita => {
        // Si la cita tiene la estructura nueva (hora, descripcion separadas)
        if (cita.hora && cita.descripcion && !cita.nombre) {
          return {
            id: cita.id || Date.now().toString(),
            fecha: cita.fecha,
            nombre: `${cita.hora} - ${cita.descripcion}`,
            etiqueta: cita.etiqueta || null
          };
        }
        // Si ya tiene la estructura correcta (nombre con formato "hora - descripcion")
        else if (cita.nombre && cita.fecha) {
          return {
            id: cita.id || Date.now().toString(),
            fecha: cita.fecha,
            nombre: cita.nombre,
            etiqueta: cita.etiqueta || null
          };
        }
        // Estructura fallback
        else {
          console.warn('⚠️ Cita con estructura inconsistente:', cita);
          return {
            id: cita.id || Date.now().toString(),
            fecha: cita.fecha || new Date().toISOString().slice(0, 10),
            nombre: cita.nombre || cita.titulo || cita.descripcion || 'Sin descripción',
            etiqueta: cita.etiqueta || null
          };
        }
      });

      console.log(`✅ ${datosNormalizados.citas.length} citas normalizadas`);
    }

    // Añadir timestamp de última actualización
    const datosConTimestamp = {
      ...datosNormalizados,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };

    console.log('💾 Guardando en Firebase:', { collection, documento, datos: datosConTimestamp });

    await window.db.collection(collection).doc(documento).set(datosConTimestamp);

    // Actualizar los datos originales con los normalizados
    datosOriginalesFirebase = JSON.parse(JSON.stringify(datosNormalizados));

    // Registrar la acción
    if (typeof registrarAccion === 'function') {
      registrarAccion('Editar Firebase', `Tabla ${tablaActualFirebase} actualizada manualmente`);
    }

    estado.style.display = 'block';
    estado.style.background = '#e8f5e8';
    estado.style.color = '#2e7d32';
    estado.innerHTML = '✅ Cambios guardados exitosamente en Firebase';

    mostrarAlerta('💾 Tabla actualizada en Firebase', 'success');

    // Si es una tabla que afecta la aplicación local, sincronizar
    if (['tareas', 'citas', 'notas'].includes(collection)) {
      setTimeout(() => {
        if (typeof extendsClassPull === 'function') {
          extendsClassPull();
          mostrarAlerta('🔄 Sincronizando cambios localmente...', 'info');
        }
      }, 1500);
    }

    // Recargar los datos desde Firebase para confirmar que se guardaron
    setTimeout(() => {
      cargarTablaFirebase();
    }, 2000);

  } catch (error) {
    console.error('Error guardando en Firebase:', error);
    estado.style.display = 'block';
    estado.style.background = '#ffe6e6';
    estado.style.color = '#d32f2f';
    estado.innerHTML = `❌ Error guardando: ${error.message}`;
    mostrarAlerta(`❌ Error: ${error.message}`, 'error');
  }
}

// ========== FUNCIÓN DE SINCRONIZACIÓN FORZADA ==========
function forzarSincronizacion() {
  const estado = document.getElementById('estado-firebase');

  if (estado) {
    estado.style.display = 'block';
    estado.style.background = '#fff3cd';
    estado.innerHTML = '⚡ Forzando sincronización completa desde Firebase...';
  }

  console.log('⚡ Iniciando sincronización forzada...');

  if (typeof extendsClassPull === 'function') {
    extendsClassPull();

    setTimeout(() => {
      if (estado) {
        estado.style.display = 'block';
        estado.style.background = '#e8f5e8';
        estado.style.color = '#2e7d32';
        estado.innerHTML = '✅ Sincronización forzada completada';
      }
      mostrarAlerta('⚡ Aplicación sincronizada desde Firebase', 'success');

      // Recargar la tabla actual para mostrar los datos actualizados
      setTimeout(() => {
        cargarTablaFirebase();
      }, 500);
    }, 2000);
  } else {
    if (estado) {
      estado.style.display = 'block';
      estado.style.background = '#ffe6e6';
      estado.style.color = '#d32f2f';
      estado.innerHTML = '❌ Función de sincronización no disponible';
    }
    mostrarAlerta('❌ Error: Función de sincronización no encontrada', 'error');
  }
}

// ========== FUNCIÓN DE LIMPIEZA DE DATOS LOCALES ==========
function limpiarDatosLocales() {
  const confirmacion = confirm(`
🧹 ¿Limpiar TODOS los datos locales?

Esta acción eliminará:
• Estado actual de la aplicación
• Datos en memoria (appState)
• NO afecta Firebase ni localStorage

Después de limpiar, se sincronizará desde Firebase.
¿Continuar?`);

  if (!confirmacion) return;

  const estado = document.getElementById('estado-firebase');

  if (estado) {
    estado.style.display = 'block';
    estado.style.background = '#fff3cd';
    estado.innerHTML = '🧹 Limpiando datos locales...';
  }

  console.log('🧹 Iniciando limpieza de datos locales...');

  // Limpiar appState
  if (window.appState && window.appState.agenda) {
    console.log('📊 Datos ANTES de limpiar:', {
      citas: window.appState.agenda.citas ? window.appState.agenda.citas.length : 0,
      tareas: window.appState.agenda.tareas ? window.appState.agenda.tareas.length : 0,
      tareas_criticas: window.appState.agenda.tareas_criticas ? window.appState.agenda.tareas_criticas.length : 0
    });

    window.appState.agenda.citas = [];
    window.appState.agenda.tareas = [];
    window.appState.agenda.tareas_criticas = [];
    window.appState.agenda.notas = '';
    window.appState.agenda.sentimientos = '';

    console.log('✅ appState limpiado');
  }

  // Re-renderizar inmediatamente
  if (typeof renderizar === 'function') {
    renderizar();
    console.log('🔄 Interfaz re-renderizada después de limpiar');
  }

  setTimeout(() => {
    if (estado) {
      estado.style.display = 'block';
      estado.style.background = '#e8f5e8';
      estado.style.color = '#2e7d32';
      estado.innerHTML = '✅ Datos locales limpiados - Sincronizando desde Firebase...';
    }

    // Forzar sincronización desde Firebase
    if (typeof extendsClassPull === 'function') {
      extendsClassPull();
    }

    mostrarAlerta('🧹 Datos locales limpiados y sincronizados', 'success');
  }, 500);
}

window.abrirEditorBaseDatos = abrirEditorBaseDatos;
window.cargarTablaFirebase = cargarTablaFirebase;
window.validarJSONFirebase = validarJSONFirebase;
window.formatearJSONFirebase = formatearJSONFirebase;
window.restaurarTablaFirebase = restaurarTablaFirebase;
window.guardarTablaFirebase = guardarTablaFirebase;
window.forzarSincronizacion = forzarSincronizacion;
window.limpiarDatosLocales = limpiarDatosLocales;
