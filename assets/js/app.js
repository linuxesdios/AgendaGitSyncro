// ========== FUNCIONES HELPER ==========
function obtenerListasPersonalizadas() {
  // TEMPORALMENTE: usar estructura antigua hasta completar migración
  const listas = window.configVisual?.listasPersonalizadas || [];
  return listas;
}

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
    personas: [],
    contrasenas: []
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

  // Inicializar listas personalizadas
  inicializarListasPersonalizadas();

  // Renderizar contraseñas al cargar la página
  if (typeof renderizarContrasenas === 'function') {
    setTimeout(() => renderizarContrasenas(), 1000);
  }

  // Verificar modo oscuro automático cada minuto
  setInterval(verificarModoOscuroAutomatico, 60000);

  // Firebase se inicializa automáticamente en sincronizacion-simple.js

  // Inicialización del calendario integrado si es necesario
  setTimeout(() => {
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
  // Auto-guardado DIRECTO en Firebase cada 5 segundos después de cambios
  if (appState.sync.autoSaveTimer) clearTimeout(appState.sync.autoSaveTimer);
  appState.sync.autoSaveTimer = setTimeout(() => {
    if (window.db && window.isFirebaseInitialized) {
      const batch = window.db.batch();

      const tareasRef = window.db.collection('tareas').doc('data');
      batch.set(tareasRef, {
        tareas_criticas: appState.agenda.tareas_criticas || [],
        tareas: appState.agenda.tareas || [],
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });

      const notasRef = window.db.collection('notas').doc('data');
      batch.set(notasRef, {
        notas: appState.agenda.notas || '',
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });

      const sentimientosRef = window.db.collection('sentimientos').doc('data');
      batch.set(sentimientosRef, {
        sentimientos: appState.agenda.sentimientos || '',
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Guardar contraseñas encriptadas
      const contrasenasRef = window.db.collection('contrasenas').doc('data');
      batch.set(contrasenasRef, {
        lista: appState.agenda.contrasenas || [],
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });

      batch.commit().then(() => {
      }).catch(error => {
        console.error('❌ Error en auto-guardado:', error);
      });
    }
  }, 5000);
}

// Cerrar modal al hacer clic fuera
window.onclick = (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
};

function cargarConfigOpciones() {
  // Cargar configuración DESDE FIREBASE (variables globales)
  const config = window.configOpciones || {};

  // Aplicar configuración por defecto si no existe
  if (!window.configOpciones) {
    window.configOpciones = {
      forzarFecha: false,
      sinTactil: false,
      mostrarTodo: false,
      botonesBorrar: false
    };

    // Guardar configuración por defecto en Firebase
    if (typeof guardarConfigEnFirebase === 'function') {
      guardarConfigEnFirebase();
    }
  }

  // Aplicar configuración de columnas
  aplicarConfiguracionColumnas();
}

function cargarConfigVisual() {
  console.log('🚀 EJECUTANDO cargarConfigVisual()');

  try {
    // Cargar configuración DESDE FIREBASE (variables globales)
    const config = window.configVisual || {};
    console.log('📊 Cargando configuración visual desde Firebase:', config);

    // CREAR LISTA POR HACER COMO LISTA PERSONALIZADA PREDETERMINADA
    asegurarListaPorHacerComoPersonalizada();

    const tema = config.tema || 'verde';
    console.log('🎨 Aplicando tema:', tema);
    console.log('📊 Config completa:', config);
    document.body.className = document.body.className.replace(/tema-\w+/g, '').trim();
    document.body.classList.add('tema-' + tema);
    console.log('✅ Tema aplicado. Clases del body:', document.body.className);

    // Actualizar título completo si hay configuración
    const tituloCompleto = config.titulo || '🧠 Agenda de Pablo 😊';
    const titulo = document.getElementById('titulo-agenda');
    if (titulo) titulo.textContent = tituloCompleto;

    // Aplicar visibilidad de secciones usando la función centralizada
    if (typeof aplicarVisibilidadSecciones === 'function') {
      aplicarVisibilidadSecciones();
    }

    // Configurar visualización del calendario de citas
    const calendarioCitas = config.calendarioCitas || 'boton';
    const btnCalendario = document.getElementById('btn-calendario-citas');
    const calendarioIntegrado = document.getElementById('calendario-citas-integrado');

    console.log('📅 DEBUG - Configuración calendario:');
    console.log('  - Modo configurado:', calendarioCitas);
    console.log('  - Botón encontrado:', !!btnCalendario);
    console.log('  - Div calendario encontrado:', !!calendarioIntegrado);
    console.log('  - Config completa:', config);

    if (calendarioCitas === 'integrado') {
      console.log('🔧 ACTIVANDO MODO INTEGRADO');

      // MODO INTEGRADO: Ocultar botón y mostrar calendario fijo
      if (btnCalendario) {
        btnCalendario.style.display = 'none';
        console.log('  ✅ Botón ocultado');
      } else {
        console.log('  ❌ No se encontró el botón');
      }

      if (calendarioIntegrado) {
        // FORZAR VISIBILIDAD COMPLETA CON !important usando CSS
        calendarioIntegrado.style.cssText = `
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          height: auto !important;
          margin-top: 15px;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 10px;
          background: #f9f9f9;
        `;
        console.log('  ✅ Calendario mostrado con CSS forzado');

        // Asegurar que los elementos internos también sean visibles
        const calendarGrid = calendarioIntegrado.querySelector('#calendarGridIntegrado');
        if (calendarGrid) {
          calendarGrid.style.cssText = 'display: grid !important; grid-template-columns: repeat(7,1fr); gap: 2px; min-height: 200px;';
        }

        // Inicializar calendario integrado MÚLTIPLES VECES para asegurar que funcione
        setTimeout(() => {
          console.log('  🚀 Inicializando calendario integrado (1er intento)...');
          if (typeof initializeCalendarioIntegrado === 'function') {
            initializeCalendarioIntegrado();
            console.log('  ✅ Calendario integrado inicializado (1er intento)');
          }

          // Verificar estado después de 200ms
          setTimeout(() => {
            const computedStyle = window.getComputedStyle(calendarioIntegrado);
            console.log('  📊 Estado después de 1er intento:');
            console.log('    - Display computed:', computedStyle.display);
            console.log('    - Visibility computed:', computedStyle.visibility);

            // Si sigue sin verse, forzar de nuevo
            if (computedStyle.display === 'none') {
              console.log('  🔄 Forzando nuevamente...');
              calendarioIntegrado.style.cssText = `
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                height: auto !important;
                margin-top: 15px;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 10px;
                background: #f9f9f9;
                position: relative !important;
                z-index: 1 !important;
              `;

              // Intentar nuevamente la inicialización
              if (typeof initializeCalendarioIntegrado === 'function') {
                initializeCalendarioIntegrado();
                console.log('  ✅ Calendario re-inicializado');
              }

              // Llamar al renderizado específico del calendario
              if (typeof renderCalendarioIntegrado === 'function') {
                renderCalendarioIntegrado();
                console.log('  ✅ Calendario renderizado');
              }
            }
          }, 200);
        }, 100);
      } else {
        console.log('  ❌ No se encontró el div del calendario integrado');
      }
    } else {
      console.log('🔧 ACTIVANDO MODO BOTÓN');

      // MODO BOTÓN: Mostrar botón y ocultar calendario integrado
      if (btnCalendario) {
        btnCalendario.style.display = 'inline-block';
        console.log('  ✅ Botón mostrado');
      }
      if (calendarioIntegrado) {
        calendarioIntegrado.style.display = 'none';
        console.log('  ✅ Calendario ocultado');
      }
    }

    // Aplicar configuración de columnas
    aplicarConfiguracionColumnas();

    // Verificar modo oscuro automático
    verificarModoOscuroAutomatico();

    console.log('✅ cargarConfigVisual() ejecutado correctamente');
  } catch (error) {
    console.error('❌ Error en cargarConfigVisual():', error);
  }
}

// ========== CONFIGURACIÓN DE COLUMNAS ==========
function aplicarConfiguracionColumnas() {
  console.log('📐 APLICANDO CONFIGURACIÓN DE COLUMNAS');

  const configVisual = window.configVisual || {};
  const columnas = parseInt(configVisual.columnas) || 2;

  console.log('📐 Número de columnas configuradas:', columnas);

  const contenedorDosColumnas = document.querySelector('.contenedor-dos-columnas');
  const contenedorListasPersonalizadas = document.getElementById('contenedor-listas-personalizadas');

  if (!contenedorDosColumnas) {
    console.error('❌ No se encontró el contenedor de columnas');
    return;
  }

  // Aplicar estilos según la configuración
  if (columnas === 1) {
    console.log('📐 APLICANDO MODO UNA COLUMNA');

    // Forzar una sola columna con ancho completo
    contenedorDosColumnas.style.cssText = `
      display: grid !important;
      grid-template-columns: 1fr !important;
      gap: 20px;
    `;

    // También aplicar a las listas personalizadas
    if (contenedorListasPersonalizadas) {
      contenedorListasPersonalizadas.style.cssText = `
        margin-top: 20px;
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 20px;
      `;
    }

    console.log('✅ Modo una columna aplicado');
  } else {
    console.log('📐 APLICANDO MODO DOS COLUMNAS');

    // Volver al modo de dos columnas
    contenedorDosColumnas.style.cssText = `
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 20px;
    `;

    // También aplicar a las listas personalizadas
    if (contenedorListasPersonalizadas) {
      contenedorListasPersonalizadas.style.cssText = `
        margin-top: 20px;
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 20px;
      `;
    }

    console.log('✅ Modo dos columnas aplicado');
  }

  console.log('✅ Configuración de columnas aplicada correctamente');
}

// ========== CONVERSIÓN DE LISTA POR HACER A LISTA PERSONALIZADA ==========
function asegurarListaPorHacerComoPersonalizada() {
  console.log('🔄 VERIFICANDO LISTA POR HACER COMO PERSONALIZADA');

  const listasPersonalizadas = obtenerListasPersonalizadas();

  // Verificar si ya existe una lista "Lista para hacer"
  const listaPorHacerExistente = listasPersonalizadas.find(lista =>
    lista.nombre.toLowerCase().includes('lista para hacer') ||
    lista.nombre.toLowerCase().includes('para hacer') ||
    lista.esListaPorDefecto === true
  );

  if (listaPorHacerExistente) {
    console.log('✅ Lista por hacer ya existe como personalizada:', listaPorHacerExistente.nombre);
    return;
  }

  console.log('🚀 CREANDO LISTA POR HACER COMO PERSONALIZADA');

  // Obtener tareas existentes de la lista por hacer tradicional
  const tareasExistentes = appState.agenda.tareas || [];
  console.log('📋 Tareas existentes encontradas:', tareasExistentes.length);

  // Crear la nueva lista personalizada
  const listaPorHacer = {
    id: 'lista-por-hacer-default',
    nombre: 'Lista para hacer',
    emoji: '✅',
    color: '#4ecdc4',
    tareas: [],
    orden: 0,
    esListaPorDefecto: true, // Marcador especial
    fechaCreacion: new Date().toISOString()
  };

  // Migrar tareas existentes al nuevo formato
  if (tareasExistentes.length > 0) {
    console.log('🔄 Migrando tareas existentes...');
    listaPorHacer.tareas = tareasExistentes.map(tarea => ({
      texto: tarea.texto || tarea.titulo || 'Tarea sin descripción',
      fecha: tarea.fecha_fin || tarea.fecha || null,
      estado: tarea.completada ? 'completada' : (tarea.estado || 'pendiente'),
      etiqueta: tarea.etiqueta || null,
      fechaCreacion: tarea.fecha_creacion || new Date().toISOString(),
      fechaCompletada: tarea.fechaCompletada || null,
      id: tarea.id || Date.now().toString() + Math.random()
    }));

    console.log(`✅ ${listaPorHacer.tareas.length} tareas migradas`);

    // Limpiar las tareas del sistema viejo
    appState.agenda.tareas = [];
    console.log('🧹 Sistema de tareas tradicional limpiado');
  }

  // Agregar como primera lista personalizada
  listasPersonalizadas.unshift(listaPorHacer);

  // Actualizar configuración global
  window.configVisual = {
    ...configVisual,
    listasPersonalizadas: listasPersonalizadas
  };

  console.log('💾 Lista por hacer convertida a personalizada:', listaPorHacer);

  // Guardar en Firebase
  if (typeof guardarConfigEnFirebase === 'function') {
    guardarConfigEnFirebase();
  }

  console.log('✅ Conversión completada exitosamente');
}

// ========== FUNCIÓN PARA OCULTAR LA SECCIÓN ORIGINAL ==========
function ocultarSeccionListaPorHacerOriginal() {
  console.log('👁️ OCULTANDO SECCIÓN ORIGINAL DE LISTA POR HACER');

  const seccionOriginal = document.querySelector('.columna-derecha section[data-target="tareas"]');
  if (seccionOriginal) {
    seccionOriginal.style.display = 'none';
    console.log('✅ Sección original ocultada');
  } else {
    console.log('⚠️ No se encontró la sección original para ocultar');
  }
}

// ========== FUNCIÓN PARA CAMBIO INMEDIATO DEL CALENDARIO ==========
function cambiarModoCalendario(modo) {
  console.log('🔧 CAMBIANDO MODO CALENDARIO INMEDIATAMENTE A:', modo);

  const btnCalendario = document.getElementById('btn-calendario-citas');
  const calendarioIntegrado = document.getElementById('calendario-citas-integrado');

  if (modo === 'integrado') {
    console.log('🔧 ACTIVANDO MODO INTEGRADO INMEDIATAMENTE');

    // Ocultar botón y mostrar calendario
    if (btnCalendario) {
      btnCalendario.style.display = 'none';
      console.log('  ✅ Botón ocultado');
    }

    if (calendarioIntegrado) {
      // FORZAR VISIBILIDAD COMPLETA CON !important usando CSS (igual que en cargarConfigVisual)
      calendarioIntegrado.style.cssText = `
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        height: auto !important;
        margin-top: 15px;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 10px;
        background: #f9f9f9;
        position: relative !important;
        z-index: 1 !important;
      `;
      console.log('  ✅ Calendario mostrado con CSS forzado inmediato');

      // Asegurar que los elementos internos también sean visibles
      const calendarGrid = calendarioIntegrado.querySelector('#calendarGridIntegrado');
      if (calendarGrid) {
        calendarGrid.style.cssText = 'display: grid !important; grid-template-columns: repeat(7,1fr); gap: 2px; min-height: 200px;';
      }

      // Inicializar calendario integrado inmediatamente
      setTimeout(() => {
        console.log('  🚀 Inicializando calendario integrado inmediato...');
        if (typeof initializeCalendarioIntegrado === 'function') {
          initializeCalendarioIntegrado();
          console.log('  ✅ Calendario integrado inicializado inmediato');
        }

        // Renderizar también inmediatamente
        if (typeof renderCalendarioIntegrado === 'function') {
          renderCalendarioIntegrado();
          console.log('  ✅ Calendario renderizado inmediato');
        }

        // Verificar estado final
        const computedStyle = window.getComputedStyle(calendarioIntegrado);
        console.log('  📊 Estado final cambiarModoCalendario:');
        console.log('    - Display computed:', computedStyle.display);
        console.log('    - Visibility computed:', computedStyle.visibility);
      }, 50);
    }
  } else {
    console.log('🔧 ACTIVANDO MODO BOTÓN INMEDIATAMENTE');

    // Mostrar botón y ocultar calendario
    if (btnCalendario) {
      btnCalendario.style.display = 'inline-block';
      console.log('  ✅ Botón mostrado');
    }
    if (calendarioIntegrado) {
      calendarioIntegrado.style.display = 'none';
      console.log('  ✅ Calendario ocultado');
    }
  }

  // Guardar en configuración y Firebase
  guardarConfigVisualPanel();
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
window.cambiarModoCalendario = cambiarModoCalendario;
window.aplicarConfiguracionColumnas = aplicarConfiguracionColumnas;
window.insertarIcono = insertarIcono;
window.verificarModoOscuroAutomatico = verificarModoOscuroAutomatico;
window.iniciarPomodoro = iniciarPomodoro;
window.empezarPomodoro = empezarPomodoro;
window.terminarPomodoro = terminarPomodoro;
window.pausarPomodoro = pausarPomodoro;
window.cancelarPomodoro = cancelarPomodoro;
window.nuevoPomodoro = nuevoPomodoro;

// ========== FUNCIÓN PARA INSERTAR ICONOS ==========
function insertarIcono(icono) {
  const input = document.getElementById('config-titulo-input');
  if (input) {
    const cursorPos = input.selectionStart;
    const textBefore = input.value.substring(0, cursorPos);
    const textAfter = input.value.substring(cursorPos);

    // Insertar el icono en la posición del cursor
    input.value = textBefore + icono + textAfter;

    // Colocar el cursor después del icono insertado
    const newCursorPos = cursorPos + icono.length;
    input.setSelectionRange(newCursorPos, newCursorPos);

    // Enfocar el input
    input.focus();
  }
}

// ========== MODO OSCURO AUTOMÁTICO ==========
function verificarModoOscuroAutomatico() {
  const config = window.configVisual || {};

  if (!config.modoOscuroAuto) return;

  const ahora = new Date();
  const horaActual = ahora.getHours() * 60 + ahora.getMinutes(); // Minutos desde medianoche

  const horaInicio = config.horaInicioOscuro || '20:00';
  const horaFin = config.horaFinOscuro || '07:00';

  const [inicioHora, inicioMin] = horaInicio.split(':').map(Number);
  const [finHora, finMin] = horaFin.split(':').map(Number);

  const inicioMinutos = inicioHora * 60 + inicioMin;
  const finMinutos = finHora * 60 + finMin;

  let debeSerOscuro = false;

  // Si hora fin es menor que inicio, el período cruza medianoche
  if (finMinutos < inicioMinutos) {
    debeSerOscuro = horaActual >= inicioMinutos || horaActual <= finMinutos;
  } else {
    debeSerOscuro = horaActual >= inicioMinutos && horaActual <= finMinutos;
  }

  // Verificar tema actual del DOM, no de la configuración
  const esOscuroActualmente = document.body.classList.contains('tema-oscuro');

  if (debeSerOscuro && !esOscuroActualmente) {
    // Cambiar a modo oscuro automáticamente
    document.body.className = document.body.className.replace(/tema-\w+/g, '').trim();
    document.body.classList.add('tema-oscuro');
    console.log('🌙 Modo oscuro automático activado');
  } else if (!debeSerOscuro && esOscuroActualmente) {
    // Volver al tema original (solo si fue cambiado automáticamente)
    const temaOriginal = config.temaOriginal || 'verde';
    document.body.className = document.body.className.replace(/tema-\w+/g, '').trim();
    document.body.classList.add('tema-' + temaOriginal);
    console.log('☀️ Modo oscuro automático desactivado');
  }
}

// ========== POMODORO PARA TDAH ==========
let pomodoroTimer = null;
let pomodoroState = {
  activo: false,
  pausado: false,
  tiempoRestante: 0,
  actividad: '',
  duracionTotal: 0
};

function iniciarPomodoro() {
  const btnPomodoro = document.getElementById('btn-pomodoro');
  if (!btnPomodoro || btnPomodoro.style.display === 'none') {
    return;
  }

  // Resetear estado
  pomodoroState = {
    activo: false,
    pausado: false,
    tiempoRestante: 0,
    actividad: '',
    duracionTotal: 0
  };

  // Mostrar modal inicial
  mostrarEstadoPomodoro('inicial');
  document.getElementById('modal-pomodoro').style.display = 'block';
}

function empezarPomodoro() {
  const actividad = document.getElementById('pomodoro-actividad').value.trim() || 'Actividad sin especificar';
  const duracion = parseInt(document.getElementById('pomodoro-duracion').value);

  if (!duracion || duracion < 1 || duracion > 180) {
    alert('La duración debe ser entre 1 y 180 minutos');
    return;
  }

  pomodoroState = {
    activo: true,
    pausado: false,
    tiempoRestante: duracion * 60, // Convertir a segundos
    actividad: actividad,
    duracionTotal: duracion * 60
  };

  document.getElementById('actividad-actual').textContent = actividad;
  mostrarEstadoPomodoro('enCurso');
  iniciarCronometro();
}

function mostrarEstadoPomodoro(estado) {
  const inicial = document.getElementById('pomodoro-estado-inicial');
  const enCurso = document.getElementById('pomodoro-en-curso');
  const completado = document.getElementById('pomodoro-completado');

  inicial.style.display = estado === 'inicial' ? 'block' : 'none';
  enCurso.style.display = estado === 'enCurso' ? 'block' : 'none';
  completado.style.display = estado === 'completado' ? 'block' : 'none';
}

function iniciarCronometro() {
  pomodoroTimer = setInterval(() => {
    if (!pomodoroState.pausado && pomodoroState.activo) {
      pomodoroState.tiempoRestante--;

      const minutos = Math.floor(pomodoroState.tiempoRestante / 60);
      const segundos = pomodoroState.tiempoRestante % 60;

      document.getElementById('cronometro').textContent =
        `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;

      if (pomodoroState.tiempoRestante <= 0) {
        completarPomodoro();
      }
    }
  }, 1000);
}

function terminarPomodoro() {
  if (pomodoroTimer) {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
  }

  // Mostrar estado completado manualmente
  document.getElementById('actividad-completada').textContent = pomodoroState.actividad;
  mostrarEstadoPomodoro('completado');
  pomodoroState.activo = false;
}

function completarPomodoro() {
  if (pomodoroTimer) {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
  }

  document.getElementById('actividad-completada').textContent = pomodoroState.actividad;
  mostrarEstadoPomodoro('completado');
  pomodoroState.activo = false;

  // Notificación visual/sonora opcional aquí
}

function pausarPomodoro() {
  const btnPausar = document.getElementById('btn-pausar');

  if (!pomodoroState.pausado) {
    pomodoroState.pausado = true;
    btnPausar.textContent = '▶️ Reanudar';
  } else {
    pomodoroState.pausado = false;
    btnPausar.textContent = '⏸️ Pausar';
  }
}

function cancelarPomodoro() {
  if (pomodoroTimer) {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
  }

  pomodoroState = {
    activo: false,
    pausado: false,
    tiempoRestante: 0,
    actividad: '',
    duracionTotal: 0
  };

  document.getElementById('modal-pomodoro').style.display = 'none';
}

function nuevoPomodoro() {
  mostrarEstadoPomodoro('inicial');
  document.getElementById('pomodoro-actividad').value = '';
  document.getElementById('pomodoro-duracion').value = '25';
}

// ========== CONFIGURACIÓN VISUAL ==========
async function guardarConfigVisualPanel() {
  const config = {
    tema: document.getElementById('config-tema-select')?.value || 'verde',
    titulo: document.getElementById('config-titulo-input')?.value || '🧠 Agenda de Pablo 😊',
    modoVisualizacion: document.getElementById('config-modo-visualizacion')?.value || 'estado',
    popupCelebracion: document.getElementById('config-popup-celebracion')?.checked !== false,
    mostrarNotas: document.getElementById('config-mostrar-notas')?.checked === true,
    mostrarSentimientos: document.getElementById('config-mostrar-sentimientos')?.checked === true,
    mostrarContrasenas: document.getElementById('config-mostrar-contrasenas')?.checked === true,
    mostrarPomodoro: document.getElementById('config-mostrar-pomodoro')?.checked === true,
    mostrarProgreso: document.getElementById('config-mostrar-progreso')?.checked === true,
    mostrarResumen: document.getElementById('config-mostrar-resumen')?.checked === true,
    mostrarTareaUniversal: document.getElementById('config-mostrar-tarea-universal')?.checked === true,
    modoOscuroAuto: document.getElementById('config-modo-oscuro-auto')?.checked !== false,
    horaInicioOscuro: document.getElementById('config-hora-inicio-oscuro')?.value || '20:00',
    horaFinOscuro: document.getElementById('config-hora-fin-oscuro')?.value || '07:00',
    calendarioCitas: document.getElementById('config-calendario-citas')?.value || 'boton',
    calendarioMostrarCitas: document.getElementById('config-calendario-mostrar-citas')?.checked !== false,
    calendarioMostrarTareas: document.getElementById('config-calendario-mostrar-tareas')?.checked !== false,
    columnas: parseInt(document.getElementById('config-columnas')?.value) || 2,
    frases: document.getElementById('config-frases-motivacionales')?.value.split('\n').filter(f => f.trim()) || [],
    listasPersonalizadas: (window.configVisual && window.configVisual.listasPersonalizadas) || []
  };

  console.log('💾 Guardando configuración visual en Firebase:', config);
  console.log('🔍 GUARDADO - Valores de checkboxes que se van a guardar:', {
    mostrarNotas: config.mostrarNotas,
    mostrarSentimientos: config.mostrarSentimientos,
    mostrarContrasenas: config.mostrarContrasenas,
    mostrarPomodoro: config.mostrarPomodoro,
    mostrarProgreso: config.mostrarProgreso,
    mostrarResumen: config.mostrarResumen
  });

  // Verificar conectividad
  const conectado = await verificarConectividad();
  if (!conectado) {
    mostrarAlertaConectividad('🔴 No se puede guardar la configuración<br><br>⚠️ Sin conexión a Firebase', 'error');
    return;
  }

  // Guardar DIRECTAMENTE en variables globales (NO localStorage)
  window.configVisual = config;
  console.log('💾 Configuración guardada en variables globales:', window.configVisual);
  console.log('🔍 GUARDADO - Confirmación en window.configVisual:', {
    mostrarNotas: window.configVisual.mostrarNotas,
    mostrarSentimientos: window.configVisual.mostrarSentimientos,
    mostrarContrasenas: window.configVisual.mostrarContrasenas,
    mostrarPomodoro: window.configVisual.mostrarPomodoro,
    mostrarProgreso: window.configVisual.mostrarProgreso,
    mostrarResumen: window.configVisual.mostrarResumen
  });

  // Guardar en Firebase PRIMERO
  if (typeof guardarConfigEnFirebase === 'function') {
    console.log('🔥 Guardando en Firebase...');
    const guardado = await guardarConfigEnFirebase();
    if (guardado) {
      // APLICAR tema INMEDIATAMENTE
      const tema = config.tema || 'verde';
      console.log('🎨 Aplicando tema:', tema);
      document.body.className = document.body.className.replace(/tema-\w+/g, '').trim();
      document.body.classList.add('tema-' + tema);
      console.log('✅ Clases del body:', document.body.className);

      // APLICAR configuración DESPUÉS del guardado exitoso
      console.log('✅ Firebase guardado OK - Aplicando configuración visual...');
      cargarConfigVisual();
      // Aplicar configuración de columnas inmediatamente
      aplicarConfiguracionColumnas();
      // Aplicar visibilidad de secciones inmediatamente
      if (typeof aplicarVisibilidadSecciones === 'function') {
        aplicarVisibilidadSecciones();

        // Verificar modo oscuro automático inmediatamente
        if (typeof verificarModoOscuroAutomatico === 'function') {
          verificarModoOscuroAutomatico();
          console.log('🌙 Verificación de modo oscuro automático aplicada');
        }

        // Actualizar calendarios con la nueva configuración
        if (typeof renderCalendar === 'function') {
          renderCalendar();
        }
        if (typeof renderCalendarioIntegrado === 'function') {
          renderCalendarioIntegrado();
        }
        if (typeof renderCalendarTareas === 'function') {
          renderCalendarTareas();
        }
      }
      mostrarAlerta('✅ Configuración visual guardada en Firebase', 'success');
    } else {
      console.warn('❌ Error guardando en Firebase');
    }
  } else {
    console.warn('⚠️ guardarConfigEnFirebase no disponible');
    // Si no hay Firebase, aplicar directamente
    cargarConfigVisual();
    // Aplicar visibilidad de secciones inmediatamente
    if (typeof aplicarVisibilidadSecciones === 'function') {
      aplicarVisibilidadSecciones();
    }

    // Actualizar calendarios con la nueva configuración
    if (typeof renderCalendar === 'function') {
      renderCalendar();
    }
    if (typeof renderCalendarioIntegrado === 'function') {
      renderCalendarioIntegrado();
    }
    if (typeof renderCalendarTareas === 'function') {
      renderCalendarTareas();
    }
    mostrarAlerta('⚠️ No se pudo sincronizar con Firebase', 'warning');
  }
}

function switchTab(tabName) {
  console.log('📊 ========== CAMBIANDO DE PESTAÑA ==========');
  console.log('  - Pestaña destino:', tabName);
  console.log('  - Listas en memoria:', window.configVisual?.listasPersonalizadas?.length || 0);

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

  // Activar el botón correspondiente (manejo robusto de evento)
  if (window.event && window.event.target && window.event.target.classList.contains('config-tab')) {
    window.event.target.classList.add('active');
  } else {
    // Intentar encontrar el botón por atributo onclick si no hay evento directo
    const btn = document.querySelector(`.config-tab[onclick*="'${tabName}'"]`);
    if (btn) btn.classList.add('active');
  }

  // Cargar datos específicos del tab
  if (tabName === 'visual') {
    console.log('🎨 Cambiando a pestaña VISUAL');
    cargarConfigVisualEnFormulario();
    // Renderizar listas personalizadas inmediatamente
    console.log('📋 Intentando renderizar listas...');
    console.log('  - Función disponible:', typeof renderizarListasPersonalizadas);
    console.log('  - Listas en memoria:', window.configVisual?.listasPersonalizadas?.length || 0);
    if (typeof renderizarListasPersonalizadas === 'function') {
      renderizarListasPersonalizadas();
    } else {
      console.error('❌ renderizarListasPersonalizadas NO está disponible');
    }
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
  // Cargar configuración DESDE FIREBASE (variables globales)
  const config = window.configVisual || {};
  console.log('📝 Cargando configuración visual en formulario desde Firebase:', config);

  const temaSelect = document.getElementById('config-tema-select');
  if (temaSelect) temaSelect.value = config.tema || 'verde';

  const tituloInput = document.getElementById('config-titulo-input');
  if (tituloInput) tituloInput.value = config.titulo || '🧠 Agenda de Pablo 😊';

  // Actualizar título completo
  const titulo = document.getElementById('titulo-agenda');
  if (titulo) titulo.textContent = config.titulo || '🧠 Agenda de Pablo 😊';

  const modoVisualizacion = document.getElementById('config-modo-visualizacion');
  if (modoVisualizacion) modoVisualizacion.value = config.modoVisualizacion || 'estado';

  const popupCelebracion = document.getElementById('config-popup-celebracion');
  if (popupCelebracion) popupCelebracion.checked = config.popupCelebracion !== false;

  const mostrarNotas = document.getElementById('config-mostrar-notas');
  if (mostrarNotas) mostrarNotas.checked = config.mostrarNotas === true;

  const mostrarSentimientos = document.getElementById('config-mostrar-sentimientos');
  if (mostrarSentimientos) mostrarSentimientos.checked = config.mostrarSentimientos === true;

  const mostrarContrasenas = document.getElementById('config-mostrar-contrasenas');
  if (mostrarContrasenas) mostrarContrasenas.checked = config.mostrarContrasenas === true;

  const mostrarPomodoro = document.getElementById('config-mostrar-pomodoro');
  if (mostrarPomodoro) mostrarPomodoro.checked = config.mostrarPomodoro === true;

  const mostrarProgreso = document.getElementById('config-mostrar-progreso');
  if (mostrarProgreso) mostrarProgreso.checked = config.mostrarProgreso === true;

  const mostrarResumen = document.getElementById('config-mostrar-resumen');
  if (mostrarResumen) mostrarResumen.checked = config.mostrarResumen === true;

  const mostrarTareaUniversal = document.getElementById('config-mostrar-tarea-universal');
  if (mostrarTareaUniversal) mostrarTareaUniversal.checked = config.mostrarTareaUniversal !== false;

  const modoOscuroAuto = document.getElementById('config-modo-oscuro-auto');
  if (modoOscuroAuto) modoOscuroAuto.checked = config.modoOscuroAuto !== false;

  const horaInicioOscuro = document.getElementById('config-hora-inicio-oscuro');
  if (horaInicioOscuro) horaInicioOscuro.value = config.horaInicioOscuro || '20:00';

  const horaFinOscuro = document.getElementById('config-hora-fin-oscuro');
  if (horaFinOscuro) horaFinOscuro.value = config.horaFinOscuro || '07:00';

  const calendarioCitas = document.getElementById('config-calendario-citas');
  if (calendarioCitas) {
    calendarioCitas.value = config.calendarioCitas || 'boton';
    console.log('📅 Calendario citas configurado como:', calendarioCitas.value);
  }

  const calendarioMostrarCitas = document.getElementById('config-calendario-mostrar-citas');
  if (calendarioMostrarCitas) calendarioMostrarCitas.checked = config.calendarioMostrarCitas !== false;

  const calendarioMostrarTareas = document.getElementById('config-calendario-mostrar-tareas');
  if (calendarioMostrarTareas) calendarioMostrarTareas.checked = config.calendarioMostrarTareas !== false;

  const columnas = document.getElementById('config-columnas');
  if (columnas) {
    columnas.value = config.columnas || 2;
    console.log('📐 Columnas configuradas como:', columnas.value);
  }

  const frasesMotivacionales = document.getElementById('config-frases-motivacionales');
  if (frasesMotivacionales) frasesMotivacionales.value = (config.frases || []).join('\n');

  // Cargar listas personalizadas
  renderizarListasPersonalizadas();
}

function cargarConfigFuncionalesEnFormulario() {
  // Cargar configuración DESDE FIREBASE (variables globales)
  const config = window.configFuncionales || {};

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

async function guardarConfigFuncionales() {
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

  // Verificar conectividad
  const conectado = await verificarConectividad();
  if (!conectado) {
    mostrarAlertaConectividad('🔴 No se puede guardar la configuración funcional<br><br>⚠️ Sin conexión a Firebase', 'error');
    return;
  }

  // Guardar DIRECTAMENTE en variables globales (NO localStorage)
  window.configFuncionales = config;

  // Guardar en Firebase
  if (typeof guardarConfigEnFirebase === 'function') {
    const guardado = await guardarConfigEnFirebase();
    if (guardado) {
      mostrarAlerta('✅ Configuración funcional guardada en Firebase', 'success');
    }
  } else {
    mostrarAlerta('⚠️ No se pudo sincronizar con Firebase', 'warning');
  }
}

// Función que espera a que las listas estén cargadas antes de renderizar
function esperarYRenderizarListas(intentos = 0, maxIntentos = 20) {
  console.log(`🔍 Intento ${intentos + 1}/${maxIntentos} - Verificando disponibilidad de listas...`);

  const listasDisponibles = window.configVisual?.listasPersonalizadas?.length > 0;
  console.log(`📊 Listas en memoria: ${window.configVisual?.listasPersonalizadas?.length || 0}`);

  if (listasDisponibles) {
    console.log('✅ ¡LISTAS ENCONTRADAS! Renderizando ahora...');
    if (typeof renderizarListasPersonalizadas === 'function') {
      renderizarListasPersonalizadas();
    }
    return true;
  }

  if (intentos >= maxIntentos - 1) {
    console.log('⚠️ Timeout alcanzado. Renderizando con listas vacías...');
    if (typeof renderizarListasPersonalizadas === 'function') {
      renderizarListasPersonalizadas();
    }
    return false;
  }

  // Intentar de nuevo en 200ms
  setTimeout(() => esperarYRenderizarListas(intentos + 1, maxIntentos), 200);
}

function toggleConfigFloating() {
  abrirModal('modal-config');

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
    cargarConfigVisualEnFormulario();

    // 3. Estrategia de Fuerza Bruta: Renderizar múltiples veces
    forzarRenderizado();
    setTimeout(() => forzarRenderizado(), 100);
    setTimeout(() => forzarRenderizado(), 300);
    setTimeout(() => forzarRenderizado(), 600);
  }, 100);
}

// ========== SISTEMA DE CONTRASEÑAS ENCRIPTADAS ==========
let contrasenaMaestra = null;
let mantenerSesion = false;
const SALT = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

// Función para generar clave de encriptación desde contraseña maestra
async function generarClaveEncriptacion(password) {
  const encoder = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Función para encriptar texto
async function encriptarTexto(texto, password) {
  const encoder = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const clave = await generarClaveEncriptacion(password);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    clave,
    encoder.encode(texto)
  );

  // Combinar IV + datos encriptados en base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

// Función para desencriptar texto
async function desencriptarTexto(textoEncriptado, password) {
  try {
    const decoder = new TextDecoder();
    const combined = new Uint8Array(atob(textoEncriptado).split('').map(char => char.charCodeAt(0)));

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const clave = await generarClaveEncriptacion(password);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      clave,
      encrypted
    );

    return decoder.decode(decrypted);
  } catch (error) {
    throw new Error('Contraseña maestra incorrecta o datos corruptos');
  }
}

// Función para solicitar contraseña maestra
async function solicitarContrasenaMaestra(proposito = 'acceder a las contraseñas') {
  return new Promise((resolve, reject) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 400px;">
        <h4 style="color: #e74c3c; text-align: center;">🔐 Contraseña Maestra</h4>
        <p style="text-align: center; margin: 15px 0;">
          Necesitas ingresar la contraseña maestra para ${proposito}.
        </p>
        <div style="margin: 20px 0;">
          <input type="password" id="password-maestra-input" placeholder="Contraseña maestra"
                 style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; margin-bottom: 15px;">

          <div style="display: flex; align-items: center; gap: 8px; background: #f8f9fa; padding: 10px; border-radius: 6px; border: 1px solid #e9ecef;">
            <input type="checkbox" id="mantener-sesion-checkbox" style="margin: 0;">
            <label for="mantener-sesion-checkbox" style="margin: 0; cursor: pointer; color: #495057; font-size: 14px;">
              🔒 Mantener durante esta sesión (hasta actualizar la página)
            </label>
          </div>
        </div>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button onclick="cerrarModalContrasenaMaestra(false)"
                  style="padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Cancelar
          </button>
          <button onclick="confirmarContrasenaMaestra()"
                  style="padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Confirmar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    window.cerrarModalContrasenaMaestra = (exito) => {
      document.body.removeChild(modal);
      if (exito) {
        resolve(contrasenaMaestra);
      } else {
        reject(new Error('Cancelado por el usuario'));
      }
    };

    window.confirmarContrasenaMaestra = () => {
      const password = document.getElementById('password-maestra-input').value;
      const mantenerCheckbox = document.getElementById('mantener-sesion-checkbox');

      if (password.trim() === '') {
        mostrarModalError('Campo requerido', 'Por favor, ingresa la contraseña maestra.');
        return;
      }

      contrasenaMaestra = password;
      mantenerSesion = mantenerCheckbox.checked;
      cerrarModalContrasenaMaestra(true);
    };

    // Focus automático y Enter para confirmar
    setTimeout(() => {
      const input = document.getElementById('password-maestra-input');
      if (input) {
        input.focus();
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            confirmarContrasenaMaestra();
          }
        });
      }
    }, 100);
  });
}

// Función para mostrar/ocultar contraseñas
function toggleMostrarContrasena(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
    const button = input.nextElementSibling;
    if (button) {
      button.textContent = input.type === 'password' ? '👁️' : '🙈';
    }
  }
}

// Función para renderizar lista de contraseñas
async function renderizarContrasenas() {
  const lista = document.getElementById('lista-contrasenas');
  if (!lista) return;

  const contrasenas = appState.agenda.contrasenas || [];

  if (contrasenas.length === 0) {
    lista.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">No hay contraseñas guardadas aún.</p>';
    return;
  }

  let html = '<div class="contrasenas-grid" style="display: grid; gap: 15px;">';

  for (const contrasena of contrasenas) {
    // Intentar desencriptar usuario si tenemos contraseña maestra
    let usuarioMostrar = '••••••••••';
    try {
      if (contrasenaMaestra && contrasena.usuarioEncriptado) {
        usuarioMostrar = await desencriptarTexto(contrasena.usuarioEncriptado, contrasenaMaestra);
      }
    } catch (error) {
      // Si falla la desencriptación, mantener asteriscos
      usuarioMostrar = '••••••••••';
    }

    html += `
      <div class="contrasena-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: #f9f9f9;">
        <div class="contrasena-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h5 style="margin: 0; color: #2c3e50; font-size: 16px;">${contrasena.servicio}</h5>
          <div style="display: flex; gap: 5px;">
            <button onclick="editarContrasena('${contrasena.id}')" title="Editar"
                    style="background: #3498db; color: white; border: none; padding: 5px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">
              ✏️
            </button>
            <button onclick="eliminarContrasena('${contrasena.id}')" title="Eliminar"
                    style="background: #e74c3c; color: white; border: none; padding: 5px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">
              🗑️
            </button>
          </div>
        </div>
        <div class="contrasena-fields" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label style="font-size: 12px; color: #666; display: block; margin-bottom: 3px;">👤 Usuario</label>
            <div style="display: flex; align-items: center; gap: 5px;">
              <input type="text" value="${usuarioMostrar}" readonly
                     style="flex: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px; background: #f8f9fa; font-size: 14px; color: #495057;">
              <button onclick="copiarAlPortapapeles('${usuarioMostrar}')" title="Copiar usuario"
                      style="background: #28a745; color: white; border: none; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                📋
              </button>
            </div>
          </div>
          <div>
            <label style="font-size: 12px; color: #666; display: block; margin-bottom: 3px;">🔑 Contraseña</label>
            <div style="display: flex; align-items: center; gap: 5px;">
              <input type="password" value="••••••••••••••" readonly
                     style="flex: 1; padding: 6px; border: 1px solid #ccc; border-radius: 4px; background: #fff; font-size: 14px;">
              <button onclick="revelarCampoContrasena(this, '${contrasena.id}', 'contrasena')"
                      style="background: #95a5a6; color: white; border: none; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                👁️
              </button>
            </div>
          </div>
        </div>
        ${contrasena.notas ? `
          <div style="margin-top: 10px;">
            <label style="font-size: 12px; color: #666; display: block; margin-bottom: 3px;">📝 Notas</label>
            <div style="padding: 6px; background: #ecf0f1; border-radius: 4px; font-size: 13px; color: #555;">
              ${contrasena.notas}
            </div>
          </div>
        ` : ''}
        <div style="margin-top: 8px; font-size: 11px; color: #95a5a6; text-align: right;">
          Creado: ${contrasena.fechaCreacion}
        </div>
      </div>
    `;
  }

  html += '</div>';
  lista.innerHTML = html;

  // Actualizar estado de seguridad si el modal está abierto
  actualizarEstadoSeguridadContrasenas();
}

// Función para revelar un campo específico
async function revelarCampoContrasena(button, id, campo) {
  try {
    if (!contrasenaMaestra) {
      contrasenaMaestra = await solicitarContrasenaMaestra(`ver ${campo === 'usuario' ? 'el usuario' : 'la contraseña'}`);
    }

    const contrasena = appState.agenda.contrasenas.find(c => c.id === id);
    if (!contrasena) {
      mostrarModalError('Error', 'Contraseña no encontrada');
      return;
    }

    const input = button.previousElementSibling;
    let valorDesencriptado;

    if (campo === 'usuario') {
      valorDesencriptado = await desencriptarTexto(contrasena.usuarioEncriptado, contrasenaMaestra);
    } else {
      valorDesencriptado = await desencriptarTexto(contrasena.contrasenaEncriptada, contrasenaMaestra);
    }

    // Mostrar temporalmente
    input.type = 'text';
    input.value = valorDesencriptado;
    button.textContent = '🙈';
    button.style.background = '#e74c3c';

    // Copiar al portapapeles
    await navigator.clipboard.writeText(valorDesencriptado);

    // Notificación temporal
    const originalText = button.textContent;
    button.textContent = '✅';
    setTimeout(() => {
      button.textContent = originalText;
    }, 1000);

    // Ocultar después de 10 segundos
    setTimeout(() => {
      input.type = 'password';
      input.value = campo === 'usuario' ? '••••••••••' : '••••••••••••••';
      button.textContent = '👁️';
      button.style.background = '#95a5a6';
    }, 10000);

  } catch (error) {
    mostrarModalError('Error al revelar el campo', error.message);
    if (!mantenerSesion) {
      contrasenaMaestra = null; // Reset solo si no se mantiene la sesión
    }
  }
}

// Función para mostrar modales de error estéticos
function mostrarModalError(titulo, mensaje) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 400px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
      <h4 style="color: #e74c3c; margin: 0 0 15px 0;">${titulo}</h4>
      <p style="margin: 15px 0 25px 0; color: #555; line-height: 1.5;">${mensaje}</p>
      <button onclick="cerrarModalError()"
              style="background: #e74c3c; color: white; border: none; padding: 12px 25px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 500;">
        Entendido
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  window.cerrarModalError = () => {
    document.body.removeChild(modal);
  };

  // Auto-cerrar después de 5 segundos
  setTimeout(() => {
    if (modal.parentNode) {
      cerrarModalError();
    }
  }, 5000);
}

// Función para mostrar modales de éxito estéticos
function mostrarModalExito(titulo, mensaje) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 400px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
      <h4 style="color: #27ae60; margin: 0 0 15px 0;">${titulo}</h4>
      <p style="margin: 15px 0 25px 0; color: #555; line-height: 1.5;">${mensaje}</p>
      <button onclick="cerrarModalExito()"
              style="background: #27ae60; color: white; border: none; padding: 12px 25px; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 500;">
        ¡Genial!
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  window.cerrarModalExito = () => {
    document.body.removeChild(modal);
  };

  // Auto-cerrar después de 3 segundos
  setTimeout(() => {
    if (modal.parentNode) {
      cerrarModalExito();
    }
  }, 3000);
}

// Función para abrir modal de nueva contraseña
async function abrirModalNuevaContrasena() {
  try {
    if (!contrasenaMaestra) {
      contrasenaMaestra = await solicitarContrasenaMaestra('crear una nueva contraseña');
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <h4 style="color: #e74c3c; text-align: center;">🔐 Nueva Contraseña Encriptada</h4>
        <form id="form-nueva-contrasena" style="display: grid; gap: 15px;">
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 5px;">🏢 Servicio/Lugar:</label>
            <input type="text" id="nuevo-servicio" required
                   placeholder="Gmail, Facebook, Banco, etc."
                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
              <label style="display: block; font-weight: bold; margin-bottom: 5px;">👤 Usuario:</label>
              <div style="position: relative;">
                <input type="password" id="nuevo-usuario" required
                       placeholder="usuario@email.com"
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; padding-right: 40px;">
                <button type="button" onclick="toggleMostrarContrasena('nuevo-usuario')"
                        style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px;">
                  👁️
                </button>
              </div>
            </div>
            <div>
              <label style="display: block; font-weight: bold; margin-bottom: 5px;">🔑 Contraseña:</label>
              <div style="position: relative;">
                <input type="password" id="nueva-contrasena" required
                       placeholder="Contraseña secreta"
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; padding-right: 40px;">
                <button type="button" onclick="toggleMostrarContrasena('nueva-contrasena')"
                        style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px;">
                  👁️
                </button>
              </div>
            </div>
          </div>
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 5px;">📝 Notas (opcional):</label>
            <textarea id="nuevas-notas" rows="3"
                      placeholder="Información adicional, preguntas de seguridad, etc."
                      style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; resize: vertical;"></textarea>
          </div>
          <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px;">
            <button type="button" onclick="cerrarModalNuevaContrasena()"
                    style="padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Cancelar
            </button>
            <button type="submit"
                    style="padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
              💾 Guardar Encriptado
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Configurar el formulario
    document.getElementById('form-nueva-contrasena').addEventListener('submit', async (e) => {
      e.preventDefault();
      await guardarNuevaContrasena();
    });

    window.cerrarModalNuevaContrasena = () => {
      document.body.removeChild(modal);
    };

    // Focus automático
    setTimeout(() => {
      document.getElementById('nuevo-servicio')?.focus();
    }, 100);

  } catch (error) {
    mostrarModalError('Acceso denegado', 'No se puede crear contraseña sin la contraseña maestra');
  }
}

// Función para guardar nueva contraseña
async function guardarNuevaContrasena() {
  try {
    const servicio = document.getElementById('nuevo-servicio').value.trim();
    const usuario = document.getElementById('nuevo-usuario').value.trim();
    const contrasena = document.getElementById('nueva-contrasena').value.trim();
    const notas = document.getElementById('nuevas-notas').value.trim();

    if (!servicio || !usuario || !contrasena) {
      mostrarModalError('Campos incompletos', 'Por favor, completa todos los campos obligatorios');
      return;
    }

    // Encriptar usuario y contraseña
    const usuarioEncriptado = await encriptarTexto(usuario, contrasenaMaestra);
    const contrasenaEncriptada = await encriptarTexto(contrasena, contrasenaMaestra);

    // Crear objeto contraseña
    const nuevaContrasena = {
      id: Date.now().toString(),
      servicio: servicio,
      usuario: '••••••••', // Mostrar asteriscos
      usuarioEncriptado: usuarioEncriptado,
      contrasenaEncriptada: contrasenaEncriptada,
      notas: notas,
      fechaCreacion: new Date().toISOString().slice(0, 10),
      ultimaActualizacion: new Date().toISOString().slice(0, 10),
      algoritmo: 'AES-256-GCM'
    };

    // Agregar a la lista
    if (!appState.agenda.contrasenas) {
      appState.agenda.contrasenas = [];
    }
    appState.agenda.contrasenas.push(nuevaContrasena);

    // Guardar y actualizar interfaz
    scheduleAutoSave();
    await renderizarContrasenas();
    cerrarModalNuevaContrasena();

    // Mostrar confirmación
    mostrarModalExito('¡Contraseña guardada!', 'La contraseña se ha guardado y encriptado exitosamente en Firebase');

  } catch (error) {
    mostrarModalError('Error al guardar', 'No se pudo guardar la contraseña: ' + error.message);
  }
}

// Función para eliminar contraseña
async function eliminarContrasena(id) {
  try {
    // Pedir contraseña maestra para eliminar
    if (!contrasenaMaestra) {
      contrasenaMaestra = await solicitarContrasenaMaestra('eliminar una contraseña');
    }

    // Buscar la contraseña para mostrar el nombre del servicio
    const contrasena = appState.agenda.contrasenas.find(c => c.id === id);
    if (!contrasena) {
      mostrarModalError('Error', 'Contraseña no encontrada');
      return;
    }

    // Confirmar eliminación
    if (!confirm(`🔐 ¿Estás seguro de que quieres eliminar permanentemente la contraseña de "${contrasena.servicio}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    // Eliminar la contraseña
    appState.agenda.contrasenas = appState.agenda.contrasenas.filter(c => c.id !== id);
    scheduleAutoSave();
    await renderizarContrasenas();

    // Mostrar confirmación
    mostrarModalExito('¡Contraseña eliminada!', `La contraseña de "${contrasena.servicio}" ha sido eliminada permanentemente`);

  } catch (error) {
    mostrarModalError('Error al eliminar', 'No se pudo eliminar la contraseña: ' + error.message);
    if (!mantenerSesion) {
      contrasenaMaestra = null; // Reset solo si no se mantiene la sesión
    }
  }
}

// Función para editar contraseña
async function editarContrasena(id) {
  try {
    // Pedir contraseña maestra para editar
    if (!contrasenaMaestra) {
      contrasenaMaestra = await solicitarContrasenaMaestra('editar una contraseña');
    }

    // Buscar la contraseña a editar
    const contrasena = appState.agenda.contrasenas.find(c => c.id === id);
    if (!contrasena) {
      mostrarModalError('Error', 'Contraseña no encontrada');
      return;
    }

    // Desencriptar los datos actuales
    const usuarioActual = await desencriptarTexto(contrasena.usuarioEncriptado, contrasenaMaestra);
    const contrasenaActual = await desencriptarTexto(contrasena.contrasenaEncriptada, contrasenaMaestra);

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <h4 style="color: #3498db; text-align: center;">✏️ Editar Contraseña</h4>
        <form id="form-editar-contrasena" style="display: grid; gap: 15px;">
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 5px;">🏢 Servicio/Lugar:</label>
            <input type="text" id="editar-servicio" required value="${contrasena.servicio}"
                   placeholder="Gmail, Facebook, Banco, etc."
                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
              <label style="display: block; font-weight: bold; margin-bottom: 5px;">👤 Usuario:</label>
              <div style="position: relative;">
                <input type="password" id="editar-usuario" required value="${usuarioActual}"
                       placeholder="usuario@email.com"
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; padding-right: 40px;">
                <button type="button" onclick="toggleMostrarContrasena('editar-usuario')"
                        style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px;">
                  👁️
                </button>
              </div>
            </div>
            <div>
              <label style="display: block; font-weight: bold; margin-bottom: 5px;">🔑 Contraseña:</label>
              <div style="position: relative;">
                <input type="password" id="editar-contrasena" required value="${contrasenaActual}"
                       placeholder="Contraseña secreta"
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; padding-right: 40px;">
                <button type="button" onclick="toggleMostrarContrasena('editar-contrasena')"
                        style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px;">
                  👁️
                </button>
              </div>
            </div>
          </div>
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 5px;">📝 Notas (opcional):</label>
            <textarea id="editar-notas" rows="3" value="${contrasena.notas || ''}"
                      placeholder="Información adicional, preguntas de seguridad, etc."
                      style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; resize: vertical;">${contrasena.notas || ''}</textarea>
          </div>
          <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px;">
            <button type="button" onclick="cerrarModalEditarContrasena()"
                    style="padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Cancelar
            </button>
            <button type="submit"
                    style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
              💾 Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Configurar el formulario
    document.getElementById('form-editar-contrasena').addEventListener('submit', async (e) => {
      e.preventDefault();
      await guardarContrasenaEditada(id);
    });

    window.cerrarModalEditarContrasena = () => {
      document.body.removeChild(modal);
    };

    // Focus automático
    setTimeout(() => {
      document.getElementById('editar-servicio')?.focus();
    }, 100);

  } catch (error) {
    mostrarModalError('Error al editar', 'No se pudo cargar la contraseña para edición: ' + error.message);
    if (!mantenerSesion) {
      contrasenaMaestra = null;
    }
  }
}

// Función para guardar contraseña editada
async function guardarContrasenaEditada(id) {
  try {
    const servicio = document.getElementById('editar-servicio').value.trim();
    const usuario = document.getElementById('editar-usuario').value.trim();
    const contrasena = document.getElementById('editar-contrasena').value.trim();
    const notas = document.getElementById('editar-notas').value.trim();

    if (!servicio || !usuario || !contrasena) {
      mostrarModalError('Campos incompletos', 'Por favor, completa todos los campos obligatorios');
      return;
    }

    // Encriptar usuario y contraseña
    const usuarioEncriptado = await encriptarTexto(usuario, contrasenaMaestra);
    const contrasenaEncriptada = await encriptarTexto(contrasena, contrasenaMaestra);

    // Actualizar la contraseña en el array
    const index = appState.agenda.contrasenas.findIndex(c => c.id === id);
    if (index !== -1) {
      appState.agenda.contrasenas[index] = {
        ...appState.agenda.contrasenas[index],
        servicio: servicio,
        usuario: '••••••••', // Mostrar asteriscos
        usuarioEncriptado: usuarioEncriptado,
        contrasenaEncriptada: contrasenaEncriptada,
        notas: notas,
        ultimaActualizacion: new Date().toISOString().slice(0, 10)
      };

      // Guardar y actualizar interfaz
      scheduleAutoSave();
      await renderizarContrasenas();
      cerrarModalEditarContrasena();

      // Mostrar confirmación
      mostrarModalExito('¡Contraseña actualizada!', 'Los cambios se han guardado y encriptado exitosamente');
    } else {
      mostrarModalError('Error', 'No se encontró la contraseña a editar');
    }

  } catch (error) {
    mostrarModalError('Error al guardar cambios', 'No se pudieron guardar los cambios: ' + error.message);
  }
}

// Función para copiar texto al portapapeles
async function copiarAlPortapapeles(texto) {
  try {
    await navigator.clipboard.writeText(texto);

    // Mostrar feedback temporal
    const event = window.event || {};
    const button = event.target || event.srcElement;
    if (button) {
      const originalText = button.textContent;
      button.textContent = '✅';
      button.style.background = '#28a745';
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '#28a745';
      }, 1000);
    }

  } catch (error) {
    mostrarModalError('Error', 'No se pudo copiar al portapapeles');
  }
}

// Función para cambiar contraseña maestra
async function cambiarContrasenaMaestra() {
  try {
    // Si hay contraseñas guardadas, pedir la contraseña actual primero
    const contrasenasGuardadas = appState.agenda.contrasenas || [];
    if (contrasenasGuardadas.length > 0) {
      if (!contrasenaMaestra) {
        contrasenaMaestra = await solicitarContrasenaMaestra('confirmar tu identidad antes de cambiar la contraseña maestra');
      }
    }

    // Modal para cambiar contraseña maestra
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 450px;">
        <h4 style="color: #e74c3c; text-align: center;">🔄 Cambiar Contraseña Maestra</h4>
        <p style="text-align: center; margin: 15px 0; color: #666; line-height: 1.5;">
          ${contrasenasGuardadas.length > 0 ?
            '⚠️ Cambiar la contraseña maestra reencriptará todas tus contraseñas guardadas con la nueva clave.' :
            'Establece una nueva contraseña maestra para proteger tus contraseñas.'}
        </p>
        <form id="form-cambiar-contrasena-maestra" style="display: grid; gap: 15px;">
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 5px;">🔑 Nueva Contraseña Maestra:</label>
            <input type="password" id="nueva-contrasena-maestra" required
                   placeholder="Mínimo 8 caracteres, incluye mayúsculas y símbolos"
                   style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px;">
          </div>
          <div>
            <label style="display: block; font-weight: bold; margin-bottom: 5px;">🔒 Confirmar Nueva Contraseña:</label>
            <input type="password" id="confirmar-contrasena-maestra" required
                   placeholder="Repite la nueva contraseña"
                   style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px;">
          </div>
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 12px; border-radius: 6px;">
            <div style="font-size: 14px; font-weight: 500; color: #856404; margin-bottom: 5px;">⚠️ Importante:</div>
            <ul style="margin: 0; padding-left: 20px; color: #856404; font-size: 13px;">
              <li>Asegúrate de recordar la nueva contraseña</li>
              <li>Sin ella no podrás acceder a tus contraseñas guardadas</li>
              <li>No hay forma de recuperar contraseñas si la olvidas</li>
            </ul>
          </div>
          <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px;">
            <button type="button" onclick="cerrarModalCambiarContrasena()"
                    style="padding: 10px 20px; background: #95a5a6; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Cancelar
            </button>
            <button type="submit"
                    style="padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
              🔄 Cambiar Contraseña
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Configurar formulario
    document.getElementById('form-cambiar-contrasena-maestra').addEventListener('submit', async (e) => {
      e.preventDefault();
      await procesarCambioContrasenaMaestra();
    });

    window.cerrarModalCambiarContrasena = () => {
      document.body.removeChild(modal);
    };

    // Focus automático
    setTimeout(() => {
      document.getElementById('nueva-contrasena-maestra')?.focus();
    }, 100);

  } catch (error) {
    mostrarModalError('Error', 'No se pudo abrir el modal para cambiar contraseña: ' + error.message);
  }
}

// Función para procesar el cambio de contraseña maestra
async function procesarCambioContrasenaMaestra() {
  try {
    const nuevaContrasena = document.getElementById('nueva-contrasena-maestra').value;
    const confirmarContrasena = document.getElementById('confirmar-contrasena-maestra').value;

    // Validaciones
    if (nuevaContrasena.length < 8) {
      mostrarModalError('Contraseña débil', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      mostrarModalError('Error', 'Las contraseñas no coinciden');
      return;
    }

    // Si hay contraseñas guardadas, reencriptar todas
    const contrasenasGuardadas = appState.agenda.contrasenas || [];
    if (contrasenasGuardadas.length > 0 && contrasenaMaestra) {

      // Mostrar progreso
      const progressModal = document.createElement('div');
      progressModal.className = 'modal';
      progressModal.style.display = 'block';
      progressModal.innerHTML = `
        <div class="modal-content" style="max-width: 300px; text-align: center;">
          <h4 style="color: #e74c3c;">🔄 Reencriptando contraseñas...</h4>
          <p>Por favor, espera mientras se actualizan tus contraseñas con la nueva clave.</p>
          <div style="margin: 20px 0;">
            <div style="background: #f0f0f0; border-radius: 10px; height: 20px; overflow: hidden;">
              <div id="progress-bar" style="background: #e74c3c; height: 100%; width: 0%; transition: width 0.3s;"></div>
            </div>
            <div id="progress-text" style="margin-top: 10px; font-size: 14px;">0 de ${contrasenasGuardadas.length}</div>
          </div>
        </div>
      `;
      document.body.appendChild(progressModal);

      // Reencriptar cada contraseña
      for (let i = 0; i < contrasenasGuardadas.length; i++) {
        const contrasena = contrasenasGuardadas[i];

        // Desencriptar con contraseña antigua
        const usuarioDesencriptado = await desencriptarTexto(contrasena.usuarioEncriptado, contrasenaMaestra);
        const contrasenaDesencriptada = await desencriptarTexto(contrasena.contrasenaEncriptada, contrasenaMaestra);

        // Reencriptar con nueva contraseña
        contrasena.usuarioEncriptado = await encriptarTexto(usuarioDesencriptado, nuevaContrasena);
        contrasena.contrasenaEncriptada = await encriptarTexto(contrasenaDesencriptada, nuevaContrasena);
        contrasena.ultimaActualizacion = new Date().toISOString().slice(0, 10);

        // Actualizar progreso
        const progress = ((i + 1) / contrasenasGuardadas.length) * 100;
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        if (progressBar) progressBar.style.width = progress + '%';
        if (progressText) progressText.textContent = `${i + 1} de ${contrasenasGuardadas.length}`;

        // Pequeña pausa para mostrar progreso
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Remover modal de progreso
      document.body.removeChild(progressModal);
    }

    // Establecer nueva contraseña maestra
    contrasenaMaestra = nuevaContrasena;
    mantenerSesion = true; // Mantener sesión automáticamente después del cambio

    // Guardar cambios
    scheduleAutoSave();
    await renderizarContrasenas();
    cerrarModalCambiarContrasena();

    // Actualizar estado en configuración
    actualizarEstadoSeguridadContrasenas();

    // Mostrar confirmación
    mostrarModalExito('¡Contraseña cambiada!', `Contraseña maestra actualizada exitosamente. ${contrasenasGuardadas.length > 0 ? `Se reencriptaron ${contrasenasGuardadas.length} contraseñas.` : ''}`);

  } catch (error) {
    mostrarModalError('Error al cambiar contraseña', 'No se pudo cambiar la contraseña maestra: ' + error.message);
  }
}

// Función para cerrar sesión de contraseñas
function cerrarSesionContrasenas() {
  if (confirm('¿Estás seguro de que quieres cerrar la sesión de contraseñas?\n\nTendrás que ingresar la contraseña maestra nuevamente para ver o gestionar contraseñas.')) {
    contrasenaMaestra = null;
    mantenerSesion = false;

    // Re-renderizar contraseñas (mostrará asteriscos)
    renderizarContrasenas();

    // Actualizar estado
    actualizarEstadoSeguridadContrasenas();

    mostrarModalExito('Sesión cerrada', 'Has cerrado la sesión de contraseñas de forma segura');
  }
}

// Función para actualizar el estado de seguridad en configuración
function actualizarEstadoSeguridadContrasenas() {
  const estadoDiv = document.getElementById('estado-seguridad-contrasenas');
  if (estadoDiv) {
    const contrasenasCount = (appState.agenda.contrasenas || []).length;
    const sesionEstado = contrasenaMaestra ? (mantenerSesion ? 'Activa (mantenida)' : 'Activa') : 'No iniciada';

    estadoDiv.innerHTML = `
      🔒 Sesión: ${sesionEstado}<br>
      🗃️ Contraseñas guardadas: ${contrasenasCount}<br>
      🛡️ Encriptación: AES-256-GCM
    `;
  }
}

window.guardarConfigVisualPanel = guardarConfigVisualPanel;
window.switchTab = switchTab;
window.cargarConfigVisualEnFormulario = cargarConfigVisualEnFormulario;
window.cargarConfigFuncionalesEnFormulario = cargarConfigFuncionalesEnFormulario;
window.guardarConfigFuncionales = guardarConfigFuncionales;
window.toggleConfigFloating = toggleConfigFloating;

// ========== FUNCIONES GLOBALES DE CONTRASEÑAS ==========
window.abrirModalNuevaContrasena = abrirModalNuevaContrasena;
window.renderizarContrasenas = renderizarContrasenas;
window.revelarCampoContrasena = revelarCampoContrasena;
window.eliminarContrasena = eliminarContrasena;
window.editarContrasena = editarContrasena;
window.toggleMostrarContrasena = toggleMostrarContrasena;
window.mostrarModalError = mostrarModalError;
window.mostrarModalExito = mostrarModalExito;
window.guardarContrasenaEditada = guardarContrasenaEditada;
window.copiarAlPortapapeles = copiarAlPortapapeles;
window.cambiarContrasenaMaestra = cambiarContrasenaMaestra;
window.cerrarSesionContrasenas = cerrarSesionContrasenas;
window.actualizarEstadoSeguridadContrasenas = actualizarEstadoSeguridadContrasenas;

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

// ========== LISTAS PERSONALIZADAS ==========
async function agregarListaPersonalizada() {
  console.log('🚀 EJECUTANDO agregarListaPersonalizada()');

  const nombre = document.getElementById('nueva-lista-personalizada')?.value?.trim();
  const emoji = document.getElementById('emoji-lista-personalizada')?.value || '📝';
  const color = document.getElementById('color-lista-personalizada')?.value || '#667eea';

  console.log('📊 Datos del formulario:', { nombre, emoji, color });

  if (!nombre) {
    mostrarAlerta('❌ Por favor escribe un nombre para la lista', 'error');
    return;
  }

  // Verificar conectividad
  const conectado = await verificarConectividad();
  if (!conectado) {
    mostrarAlertaConectividad('🔴 No se puede crear la lista<br><br>⚠️ Sin conexión a Firebase', 'error');
    return;
  }

  // Obtener listas actuales
  const configVisual = window.configVisual || {};
  const listasPersonalizadas = configVisual.listasPersonalizadas || [];

  console.log('📋 Listas actuales:', listasPersonalizadas);

  // Verificar si ya existe
  if (listasPersonalizadas.some(lista => lista.nombre.toLowerCase() === nombre.toLowerCase())) {
    mostrarAlerta('❌ Ya existe una lista con ese nombre', 'error');
    return;
  }

  // Añadir nueva lista
  const nuevaLista = {
    id: Date.now().toString(),
    nombre: nombre,
    emoji: emoji,
    color: color,
    tareas: [],
    orden: listasPersonalizadas.length
  };

  console.log('✨ Nueva lista creada:', nuevaLista);

  listasPersonalizadas.push(nuevaLista);

  // Actualizar configuración global
  window.configVisual = {
    ...configVisual,
    listasPersonalizadas: listasPersonalizadas
  };

  console.log('💾 Configuración actualizada:', window.configVisual);

  // Limpiar formulario
  document.getElementById('nueva-lista-personalizada').value = '';
  document.getElementById('emoji-lista-personalizada').value = '🏥';
  document.getElementById('color-lista-personalizada').value = '#667eea';

  // Guardar en Firebase
  if (typeof guardarConfigEnFirebase === 'function') {
    const guardado = await guardarConfigEnFirebase();
    if (guardado) {
      console.log('✅ Configuración guardada en Firebase');
      mostrarAlerta(`✅ Lista "${nombre}" creada correctamente`, 'success');

      // Re-renderizar configuración PRIMERO
      renderizarListasPersonalizadas();

      // Regenerar las secciones principales para incluir la nueva lista
      setTimeout(() => {
        console.log('🔄 Regenerando secciones principales...');
        if (typeof regenerarSeccionesListasPersonalizadas === 'function') {
          regenerarSeccionesListasPersonalizadas();
        }
        if (typeof renderizar === 'function') {
          renderizar();
        }
      }, 500);
    } else {
      mostrarAlerta('❌ Error al guardar en Firebase', 'error');
    }
  } else {
    mostrarAlerta('⚠️ No se pudo sincronizar con Firebase', 'warning');
  }
}

function eliminarListaPersonalizada(id) {
  const configVisual = window.configVisual || {};
  const listasPersonalizadas = configVisual.listasPersonalizadas || [];

  // Buscar la lista
  const lista = listasPersonalizadas.find(l => l.id === id);
  if (!lista) return;

  // Confirmar eliminación
  if (confirm(`¿Estás seguro de que quieres eliminar la lista "${lista.nombre}"?\n\nEsto también eliminará todas las tareas de esta lista.`)) {
    // Filtrar lista eliminada
    const nuevasListas = listasPersonalizadas.filter(l => l.id !== id);

    // Actualizar configuración global
    window.configVisual = {
      ...configVisual,
      listasPersonalizadas: nuevasListas
    };

    // Re-renderizar
    renderizarListasPersonalizadas();

    // Guardar en Firebase
    guardarConfigEnFirebase();

    mostrarAlerta(`✅ Lista "${lista.nombre}" eliminada`, 'success');
  }
}

function renderizarListasPersonalizadas() {
  console.log('📋 EJECUTANDO renderizarListasPersonalizadas()');

  const contenedor = document.getElementById('listas-personalizadas-contenido');
  console.log('  Contenedor encontrado:', !!contenedor);

  if (!contenedor) {
    console.error('❌ No se encontró el contenedor listas-personalizadas-contenido');
    return;
  }

  const configVisual = window.configVisual || {};
  const listasPersonalizadas = configVisual.listasPersonalizadas || [];

  // Debug simplificado

  if (listasPersonalizadas.length === 0) {
    console.log('  ⚠️ No hay listas personalizadas, mostrando mensaje por defecto');
    contenedor.innerHTML = `
      <div style="text-align:center;color:#666;padding:20px;font-style:italic;">
        <span style="font-size:20px;">📝</span> Añade tus listas personalizadas...
      </div>
    `;
    return;
  }

  console.log('  ✅ Generando HTML para', listasPersonalizadas.length, 'listas');
  let html = '';
  listasPersonalizadas.forEach((lista, index) => {

    // Verificar si es una lista obligatoria
    const listasObligatorias = ['Tareas Críticas', 'Lista para hacer', 'tareas-criticas', 'para-hacer'];
    const esListaObligatoria = listasObligatorias.some(nombre =>
      lista.nombre.toLowerCase().includes(nombre.toLowerCase()) ||
      lista.id === nombre ||
      lista.tipo === 'criticas' ||
      lista.tipo === 'regular' ||
      lista.esListaPorDefecto === true
    );

    const botonEliminar = esListaObligatoria ?
      '<span style="color:#666;font-size:12px;padding:4px 8px;">🔒 Sistema</span>' :
      `<button onclick="eliminarListaPersonalizada('${lista.id}')" style="background:#ff4757;color:white;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px;" title="Eliminar lista">🗑️</button>`;

    html += `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;margin-bottom:8px;background:rgba(255,255,255,0.7);border-radius:6px;border-left:4px solid ${lista.color};">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:16px;">${lista.emoji}</span>
          <span style="font-weight:500;color:#333;">${lista.nombre}</span>
          <small style="color:#666;">(${lista.tareas ? lista.tareas.length : 0} tareas)</small>
        </div>
        ${botonEliminar}
      </div>
    `;
  });

  contenedor.innerHTML = html;
}

// ========== FUNCIONES PARA SECCIONES PRINCIPALES DE LISTAS ==========
function regenerarSeccionesListasPersonalizadas() {
  console.log('🔄 REGENERANDO SECCIONES DE LISTAS PERSONALIZADAS');

  // Eliminar secciones existentes de listas personalizadas
  document.querySelectorAll('.seccion-lista-personalizada').forEach(seccion => {
    seccion.remove();
  });

  const configVisual = window.configVisual || {};
  const listasPersonalizadas = configVisual.listasPersonalizadas || [];

  console.log('📋 Listas a generar:', listasPersonalizadas.length);

  if (listasPersonalizadas.length === 0) return;

  // Buscar la columna derecha para insertar las nuevas secciones
  const columnaDerecha = document.querySelector('.columna-derecha');
  if (!columnaDerecha) {
    console.error('❌ No se encontró la columna derecha');
    return;
  }

  // Generar cada lista personalizada y agregarla AL FINAL de la columna derecha
  listasPersonalizadas.forEach((lista, index) => {
    const seccionHTML = generarSeccionListaPersonalizada(lista);
    const seccionElement = document.createElement('div');
    seccionElement.innerHTML = seccionHTML;

    // Extraer el elemento section del div temporal
    const sectionNode = seccionElement.firstElementChild;
    sectionNode.className = 'drop-zone seccion-lista-personalizada'; // Asegurar clases

    columnaDerecha.appendChild(sectionNode);
    console.log(`✅ Sección generada para lista: ${lista.nombre}`);
  });

  console.log('✅ Regeneración de secciones completada');
}

function generarSeccionListaPersonalizada(lista) {
  const sectionId = `lista-personalizada-${lista.id}`;
  const filtroId = `filtros-content-lista-${lista.id}`;

  return `
    <section class="drop-zone seccion-lista-personalizada" data-target="lista-${lista.id}" style="border-left: 4px solid ${lista.color};">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h3 style="margin: 0; color: ${lista.color};">${lista.emoji} ${lista.nombre}</h3>
        <div style="display: flex; gap: 3px; flex-wrap: wrap;">
          <button onclick="abrirModalNuevaTareaLista('${lista.id}')" class="boton-cargar" style="padding: 4px 8px; font-size: 10px; background: ${lista.color}; color: white;">+</button>
        </div>
      </div>

      <div class="filtros-container">
        <button class="filtros-toggle" onclick="toggleFiltros('lista-${lista.id}')">
          <span>🔍 Filtros</span>
          <span id="filtros-icon-lista-${lista.id}">▼</span>
        </button>
        <div id="${filtroId}" class="filtros-content">
          <div class="filtros-grid">
            <div class="filtro-grupo">
              <label class="filtro-label">Estado</label>
              <select id="filtro-estado-lista-${lista.id}" onchange="aplicarFiltros('lista-${lista.id}')" class="filtro-select">
                <option value="">Todos</option>
                <option value="pendiente">Pendientes</option>
                <option value="en_progreso">En progreso</option>
                <option value="completada">Completadas</option>
              </select>
            </div>
            <div class="filtro-grupo">
              <label class="filtro-label">Fecha</label>
              <select id="filtro-fecha-lista-${lista.id}" onchange="aplicarFiltros('lista-${lista.id}')" class="filtro-select">
                <option value="">Todas</option>
                <option value="hoy">Hoy</option>
                <option value="manana">Mañana</option>
                <option value="esta_semana">Esta semana</option>
                <option value="pasadas">Atrasadas</option>
              </select>
            </div>
            <div class="filtro-grupo">
              <label class="filtro-label">Persona</label>
              <select id="filtro-persona-lista-${lista.id}" onchange="aplicarFiltros('lista-${lista.id}')" class="filtro-select">
                <option value="">Todas</option>
              </select>
            </div>
            <div class="filtro-grupo">
              <label class="filtro-label">Etiqueta</label>
              <select id="filtro-etiqueta-lista-${lista.id}" onchange="aplicarFiltros('lista-${lista.id}')" class="filtro-select">
                <option value="">Todas</option>
              </select>
            </div>
          </div>

          <div style="text-align: center; margin-top: 10px;">
            <button onclick="limpiarFiltros('lista-${lista.id}')" class="btn-secundario" style="font-size: 11px; padding: 5px 10px;">🔄 Limpiar filtros</button>
          </div>
        </div>
      </div>

      <div id="${sectionId}" class="lista-tareas" style="min-height: 60px;">
        <div style="color:#777;padding:10px;text-align:center;">No hay tareas en esta lista</div>
      </div>
      
      <!-- Botón grande para añadir tarea -->
      <button onclick="abrirModalNuevaTareaLista('${lista.id}')" class="boton-add-task" 
        style="width: 100%; padding: 12px; margin-top: 15px; background: linear-gradient(135deg, ${lista.color} 0%, ${lista.color}dd 100%); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <span style="font-size: 18px;">➕</span>
        <span>Añadir tarea</span>
      </button>
    </section>
  `;
}

function abrirModalNuevaTareaLista(listaId) {
  console.log('🚀 Abriendo modal para nueva tarea en lista:', listaId);

  // Encontrar la lista
  const configVisual = window.configVisual || {};
  const listasPersonalizadas = configVisual.listasPersonalizadas || [];
  const lista = listasPersonalizadas.find(l => l.id === listaId);

  if (!lista) {
    mostrarAlerta('❌ Lista no encontrada', 'error');
    return;
  }

  // Usar el modal existente de tareas pero con modificaciones
  const modal = document.getElementById('modal-tarea');
  if (modal) {
    // Guardar el ID de la lista en el modal para usarlo al guardar
    modal.setAttribute('data-lista-personalizada', listaId);

    // Cambiar el título del modal
    const titulo = modal.querySelector('h4');
    if (titulo) {
      titulo.textContent = `Añadir tarea a ${lista.emoji} ${lista.nombre}`;
    }

    abrirModal('modal-tarea');
  }
}

function limpiarListaPersonalizada(listaId) {
  const configVisual = window.configVisual || {};
  const listasPersonalizadas = configVisual.listasPersonalizadas || [];
  const lista = listasPersonalizadas.find(l => l.id === listaId);

  if (!lista) return;

  if (confirm(`¿Estás seguro de que quieres eliminar TODAS las tareas de "${lista.nombre}"?`)) {
    lista.tareas = [];
    guardarConfigEnFirebase();
    renderizarListaPersonalizada(listaId);
    mostrarAlerta(`✅ Todas las tareas de "${lista.nombre}" eliminadas`, 'success');
  }
}

// ========== RENDERIZADO RICO DE LISTAS PERSONALIZADAS ==========
function renderizarListaPersonalizada(listaId) {
  const listasPersonalizadas = obtenerListasPersonalizadas();
  const lista = listasPersonalizadas.find(l => l.id === listaId);

  if (!lista) return;

  const contenedor = document.getElementById(`lista-personalizada-${listaId}`);
  if (!contenedor) return;

  const tareas = lista.tareas || [];
  contenedor.innerHTML = '';

  if (tareas.length === 0) {
    contenedor.innerHTML = '<div style="color:#777;padding:10px;text-align:center;">No hay tareas en esta lista</div>';
    return;
  }

  // Verificar configuración de opciones
  const configOpciones = window.configOpciones || {};
  const sinTactil = configOpciones.sinTactil || false;

  tareas.forEach((tarea, index) => {
    const div = document.createElement('div');
    div.className = 'tarea-item';
    if (tarea.estado === 'completada') div.classList.add('tarea-completada');

    // Verificar si es urgente (fecha límite es hoy o pasada)
    const fechaString = Array.isArray(tarea.fecha) ? fechaArrayToString(tarea.fecha) : tarea.fecha;
    const esUrgente = esFechaHoy(fechaString) || esFechaPasada(fechaString);
    if (esUrgente && tarea.estado !== 'completada') {
      div.classList.add('urgente');
      div.dataset.urgente = 'true';
    }

    // Aplicar colores según modo de visualización (si existe la función)
    if (typeof aplicarColorVisualizacion === 'function') {
      aplicarColorVisualizacion(div, tarea, 'critica'); // Usamos 'critica' para mantener el estilo
    }

    // Símbolo de estado (Click para cambiar estado)
    const simbolo = document.createElement('span');
    simbolo.className = 'tarea-simbolo';
    // Usar la misma lógica de símbolos que tareas críticas
    if (typeof obtenerSimbolo === 'function') {
      simbolo.textContent = obtenerSimbolo(tarea);
    } else {
      simbolo.textContent = tarea.estado === 'completada' ? '✓' : (tarea.estado === 'en_progreso' ? '⏳' : '●');
    }
    simbolo.onclick = () => completarTareaListaPersonalizada(listaId, index);

    // Contenido de texto (Click para editar)
    const texto = document.createElement('div');
    texto.className = 'tarea-texto';
    texto.style.cursor = 'pointer';

    let contenido = `<strong>${escapeHtml(tarea.texto)}</strong>`;

    // Etiqueta
    if (tarea.etiqueta) {
      if (typeof obtenerEtiquetaInfo === 'function') {
        const etiquetaInfo = obtenerEtiquetaInfo(tarea.etiqueta, 'tareas');
        if (etiquetaInfo) {
          contenido += ` <span style="background: rgba(78, 205, 196, 0.1); color: #2d5a27; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-left: 5px;">${etiquetaInfo.simbolo} ${etiquetaInfo.nombre}</span>`;
        }
      }
    }

    // Fecha
    if (tarea.fecha) {
      const fechaMostrar = Array.isArray(tarea.fecha) ? fechaArrayToString(tarea.fecha) : tarea.fecha;
      const colorFecha = (esFechaHoy(fechaString) || esFechaPasada(fechaString)) ? '#ff1744' : '#666';
      contenido += ` <small style="background: ${esUrgente ? '#ffcdd2' : '#ffe5e5'}; color: ${colorFecha}; padding: 2px 6px; border-radius: 3px; font-weight: ${esUrgente ? 'bold' : 'normal'};">📅 ${fechaMostrar}</small>`;
    }

    // Persona asignada
    if (tarea.persona) {
      contenido += ` <span style="background: #e3f2fd; color: #1976d2; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">👤 ${escapeHtml(tarea.persona)}</span>`;
    }

    texto.innerHTML = contenido;
    texto.onclick = () => editarTareaListaPersonalizada(listaId, index);

    div.appendChild(simbolo);
    div.appendChild(texto);

    // Botón de Subtareas
    const btnSubtarea = document.createElement('button');
    btnSubtarea.className = 'btn-subtarea';
    btnSubtarea.textContent = '📝';
    btnSubtarea.title = 'Añadir subtarea';
    btnSubtarea.onclick = (e) => {
      e.stopPropagation();
      abrirModalSubtareaListaPersonalizada(listaId, index);
    };
    div.appendChild(btnSubtarea);

    // Botón de Borrar
    const btnBorrar = document.createElement('button');
    btnBorrar.className = 'btn-borrar-tarea';
    btnBorrar.textContent = '🗑️';
    btnBorrar.title = 'Eliminar tarea';
    btnBorrar.onclick = (e) => {
      e.stopPropagation();
      mostrarCuentaRegresiva(() => {
        ejecutarEliminacionTareaListaPersonalizada(listaId, index);
      });
    };
    div.appendChild(btnBorrar);

    contenedor.appendChild(div);

    // Renderizar Subtareas (IGUAL QUE EN TAREAS CRÍTICAS Y NORMALES)
    if (tarea.subtareas && tarea.subtareas.length > 0) {
      tarea.subtareas.forEach((subtarea, subIndex) => {
        const subDiv = document.createElement('div');
        subDiv.className = 'subtarea-item';
        if (subtarea.completada) subDiv.classList.add('subtarea-completada');

        const subSimbolo = document.createElement('span');
        subSimbolo.className = 'subtarea-simbolo';
        subSimbolo.textContent = obtenerSimboloSubtarea(subtarea);
        subSimbolo.onclick = () => cambiarEstadoSubtareaListaPersonalizada(listaId, index, subIndex);

        const subTexto = document.createElement('div');
        subTexto.className = 'subtarea-texto';
        subTexto.style.cursor = 'pointer';
        let contenidoSub = subtarea.texto;
        if (subtarea.persona || subtarea.fecha_migrar) {
          contenidoSub += ' <span style="font-size: 11px; color: #9c27b0;">→ ';
          if (subtarea.persona) {
            contenidoSub += `<span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 3px; font-size: 10px;">👤 ${escapeHtml(subtarea.persona)}</span>`;
          }
          if (subtarea.fecha_migrar) {
            contenidoSub += `<span style="background: #ffe5e5; color: #666; padding: 2px 6px; border-radius: 3px; font-size: 10px;">📅 ${subtarea.fecha_migrar}</span>`;
          }
          contenidoSub += '</span>';
        }
        subTexto.innerHTML = contenidoSub;
        subTexto.onclick = () => abrirEditorSubtareaListaPersonalizada(listaId, index, subIndex);

        const btnBorrarSub = document.createElement('button');
        btnBorrarSub.className = 'btn-borrar-subtarea';
        btnBorrarSub.textContent = '🗑️';
        btnBorrarSub.onclick = (e) => {
          e.stopPropagation();
          eliminarSubtareaListaPersonalizada(listaId, index, subIndex);
        };

        subDiv.appendChild(subSimbolo);
        subDiv.appendChild(subTexto);
        subDiv.appendChild(btnBorrarSub);
        contenedor.appendChild(subDiv);
      });
    }
  });
}

// ========== GESTIÓN DE SUBTAREAS EN LISTAS PERSONALIZADAS ==========
function abrirModalSubtareaListaPersonalizada(listaId, tareaIndex) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-subtarea-lp';
  modal.innerHTML = `
    <div class="modal-content">
      <h4>📝 Nueva Subtarea</h4>
      <div class="form-group">
        <label>Descripción:</label>
        <input type="text" id="subtarea-lp-texto" placeholder="Ej: Revisar documentos">
      </div>
      <div class="modal-botones">
        <button class="btn-primario" onclick="agregarSubtareaListaPersonalizada('${listaId}', ${tareaIndex})">Añadir</button>
        <button class="btn-secundario" onclick="cerrarModal('modal-subtarea-lp')">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.style.display = 'block';
  setTimeout(() => document.getElementById('subtarea-lp-texto').focus(), 100);
}

function agregarSubtareaListaPersonalizada(listaId, tareaIndex) {
  const texto = document.getElementById('subtarea-lp-texto').value.trim();
  if (texto) {
    guardarSubtareaListaPersonalizada(listaId, tareaIndex, texto);
    cerrarModal('modal-subtarea-lp');
  }
}

function guardarSubtareaListaPersonalizada(listaId, tareaIndex, texto) {
  const configVisual = window.configVisual || {};
  const listas = configVisual.listasPersonalizadas || [];
  const listaIndex = listas.findIndex(l => l.id === listaId);

  if (listaIndex === -1) return;

  const tarea = listas[listaIndex].tareas[tareaIndex];
  if (!tarea.subtareas) tarea.subtareas = [];

  tarea.subtareas.push({
    texto: texto,
    completada: false,
    fechaCreacion: new Date().toISOString()
  });

  // Actualizar estado global
  window.configVisual = {
    ...configVisual,
    listasPersonalizadas: listas
  };

  renderizarListaPersonalizada(listaId);
  guardarConfigEnFirebase();
}

function cambiarEstadoSubtareaListaPersonalizada(listaId, tareaIndex, subIndex) {
  const configVisual = window.configVisual || {};
  const listas = configVisual.listasPersonalizadas || [];
  const listaIndex = listas.findIndex(l => l.id === listaId);

  if (listaIndex === -1) return;

  const tarea = listas[listaIndex].tareas[tareaIndex];
  const subtarea = tarea.subtareas[subIndex];
  if (!subtarea.estado) subtarea.estado = 'pendiente';

  if (subtarea.estado === 'pendiente') {
    subtarea.estado = 'migrada';
    subtarea.completada = false;
    appState.ui.subtareaSeleccionada = { tipo: 'lista_personalizada', listaId, tareaIndex, subIndex };

    // Actualizar estado global
    window.configVisual = { ...configVisual, listasPersonalizadas: listas };
    renderizarListaPersonalizada(listaId);
    guardarConfigEnFirebase();

    abrirModal('modal-migrar');
    return;
  } else if (subtarea.estado === 'migrada') {
    if (subtarea.persona) {
      subtarea.estado = 'completada';
      subtarea.completada = true;
      mostrarCelebracion();
    } else {
      subtarea.estado = 'programada';
      subtarea.completada = false;
    }
  } else if (subtarea.estado === 'programada') {
    subtarea.estado = 'completada';
    subtarea.completada = true;
    mostrarCelebracion();
  } else {
    subtarea.estado = 'pendiente';
    subtarea.completada = false;
    delete subtarea.persona;
    delete subtarea.fecha_migrar;
  }

  // Actualizar estado global
  window.configVisual = { ...configVisual, listasPersonalizadas: listas };
  renderizarListaPersonalizada(listaId);
  guardarConfigEnFirebase();
}

function abrirEditorSubtareaListaPersonalizada(listaId, tareaIndex, subIndex) {
  const configVisual = window.configVisual || {};
  const listas = configVisual.listasPersonalizadas || [];
  const lista = listas.find(l => l.id === listaId);

  if (!lista || !lista.tareas[tareaIndex] || !lista.tareas[tareaIndex].subtareas[subIndex]) return;

  const subtarea = lista.tareas[tareaIndex].subtareas[subIndex];

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-editor-subtarea-lp';
  modal.innerHTML = `
    <div class="modal-content">
      <h4>✏️ Editar Subtarea</h4>
      <div class="form-group">
        <label>Descripción:</label>
        <input type="text" id="editor-subtarea-lp-texto" value="${escapeHtml(subtarea.texto)}">
      </div>
      <div class="form-group">
        <label>Fecha límite:</label>
        <input type="date" id="editor-subtarea-lp-fecha" value="${subtarea.fecha_fin || ''}">
      </div>
      <div class="form-group">
        <label>Persona asignada:</label>
        <input type="text" id="editor-subtarea-lp-persona" value="${subtarea.persona || ''}">
      </div>
      <div class="form-group">
        <label>Fecha migración:</label>
        <input type="date" id="editor-subtarea-lp-fecha-migrar" value="${subtarea.fecha_migrar || ''}">
      </div>
      <div class="modal-botones">
        <button class="btn-primario" onclick="guardarEdicionSubtareaListaPersonalizada('${listaId}', ${tareaIndex}, ${subIndex})">Guardar</button>
        <button class="btn-secundario" onclick="cerrarModal('modal-editor-subtarea-lp')">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = 'block';
}

function guardarEdicionSubtareaListaPersonalizada(listaId, tareaIndex, subIndex) {
  const configVisual = window.configVisual || {};
  const listas = configVisual.listasPersonalizadas || [];
  const listaIndex = listas.findIndex(l => l.id === listaId);

  if (listaIndex === -1) return;

  const tarea = listas[listaIndex].tareas[tareaIndex];
  const subtarea = tarea.subtareas[subIndex];
  const texto = document.getElementById('editor-subtarea-lp-texto').value.trim();
  const fecha = document.getElementById('editor-subtarea-lp-fecha').value;
  const persona = document.getElementById('editor-subtarea-lp-persona').value.trim();
  const fechaMigrar = document.getElementById('editor-subtarea-lp-fecha-migrar').value;

  if (!texto) {
    alert('El texto no puede estar vacío');
    return;
  }

  subtarea.texto = texto;
  subtarea.fecha_fin = fecha || null;
  subtarea.persona = persona || null;
  subtarea.fecha_migrar = fechaMigrar || null;

  // Actualizar estado global
  window.configVisual = { ...configVisual, listasPersonalizadas: listas };

  cerrarModal('modal-editor-subtarea-lp');
  renderizarListaPersonalizada(listaId);
  guardarConfigEnFirebase();
  mostrarAlerta('✅ Subtarea actualizada', 'success');
}

function eliminarSubtareaListaPersonalizada(listaId, tareaIndex, subIndex) {
  const configFuncionales = window.configFuncionales || {};
  const necesitaConfirmacion = configFuncionales.confirmacionBorrar !== false;

  if (necesitaConfirmacion && typeof mostrarCuentaRegresiva === 'function') {
    mostrarCuentaRegresiva(() => {
      ejecutarEliminacionSubtareaListaPersonalizada(listaId, tareaIndex, subIndex);
    });
  } else {
    ejecutarEliminacionSubtareaListaPersonalizada(listaId, tareaIndex, subIndex);
  }
}

function ejecutarEliminacionSubtareaListaPersonalizada(listaId, tareaIndex, subIndex) {
  const configVisual = window.configVisual || {};
  const listas = configVisual.listasPersonalizadas || [];
  const listaIndex = listas.findIndex(l => l.id === listaId);

  if (listaIndex === -1) return;

  listas[listaIndex].tareas[tareaIndex].subtareas.splice(subIndex, 1);

  // Actualizar estado global
  window.configVisual = { ...configVisual, listasPersonalizadas: listas };

  renderizarListaPersonalizada(listaId);
  guardarConfigEnFirebase();
  mostrarAlerta('🗑️ Subtarea eliminada', 'info');
}

function cargarConfigVisual() {
  const configVisual = window.configVisual || {};

  // Listas Personalizadas - NO crear lista por defecto
  // La lista "Por hacer" original (appState.agenda.tareas) debe mantenerse como la principal
  // Las listas personalizadas son adicionales, no reemplazan la lista nativa

  if (!configVisual.listasPersonalizadas) {
    configVisual.listasPersonalizadas = [];
  }

  // Actualizar configuración global
  window.configVisual = configVisual;

  // Regenerar y renderizar listas personalizadas
  if (typeof regenerarSeccionesListasPersonalizadas === 'function') {
    regenerarSeccionesListasPersonalizadas();
  }
  if (typeof renderizarTodasLasListasPersonalizadas === 'function') {
    renderizarTodasLasListasPersonalizadas();
  }
}

function agregarTareaAListaPersonalizada(listaId, texto, fecha = null, etiqueta = null) {
  const listasPersonalizadas = obtenerListasPersonalizadas();
  const lista = listasPersonalizadas.find(l => l.id === listaId);

  if (!lista) return;

  const nuevaTarea = {
    id: Date.now(), // ID como number
    texto: texto,
    fecha: fecha ? (typeof fecha === 'string' ? fechaStringToArray(fecha) : fecha) : null, // Fecha como array
    etiqueta: etiqueta || null,
    estado: 'pendiente',
    fechaCreacion: new Date().toISOString()
  };

  lista.tareas = lista.tareas || [];
  lista.tareas.push(nuevaTarea);

  // Actualizar configuración global
  window.configVisual = { ...configVisual, listasPersonalizadas };

  // Guardar en Firebase
  guardarConfigEnFirebase();

  // Re-renderizar
  renderizarListaPersonalizada(listaId);
}

function editarTareaListaPersonalizada(listaId, index) {
  const configVisual = window.configVisual || {};
  const listas = configVisual.listasPersonalizadas || [];
  const lista = listas.find(l => l.id === listaId);

  if (!lista || !lista.tareas[index]) return;

  const tarea = lista.tareas[index];

  // Crear modal dinámicamente
  const modalId = 'modal-editor-lista-personalizada';
  let modal = document.getElementById(modalId);

  if (modal) {
    modal.remove();
  }

  modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = modalId;
  modal.innerHTML = `
    <div class="modal-content">
      <h4>✏️ Editar Tarea</h4>
      <div class="form-group">
        <label>Descripción:</label>
        <input type="text" id="editor-lp-texto" value="${escapeHtml(tarea.texto)}">
      </div>
      <div class="form-group">
        <label>📅 Reprogramar (Fecha límite):</label>
        <input type="date" id="editor-lp-fecha" value="${tarea.fecha || ''}">
      </div>
      <div class="form-group">
        <label>👤 Delegar (Persona):</label>
        <input type="text" id="editor-lp-persona" value="${tarea.persona || ''}" placeholder="Nombre de la persona">
      </div>
      <div class="modal-botones">
        <button class="btn-primario" onclick="guardarEdicionListaPersonalizada('${listaId}', ${index})">Guardar</button>
        <button class="btn-secundario" onclick="document.getElementById('${modalId}').remove()">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = 'block';

  // Foco en el input de texto
  setTimeout(() => {
    const input = document.getElementById('editor-lp-texto');
    if (input) input.focus();
  }, 100);
}

function guardarEdicionListaPersonalizada(listaId, index) {
  const configVisual = window.configVisual || {};
  const listas = configVisual.listasPersonalizadas || [];
  const listaIndex = listas.findIndex(l => l.id === listaId);

  if (listaIndex === -1) return;

  const texto = document.getElementById('editor-lp-texto').value;
  const fecha = document.getElementById('editor-lp-fecha').value;
  const persona = document.getElementById('editor-lp-persona').value;

  if (!texto || !texto.trim()) {
    alert('El texto de la tarea no puede estar vacío');
    return;
  }

  // Actualizar tarea
  listas[listaIndex].tareas[index].texto = texto.trim();
  listas[listaIndex].tareas[index].fecha = fecha || null;
  listas[listaIndex].tareas[index].persona = persona ? persona.trim() : null;

  // Actualizar estado global
  window.configVisual = {
    ...configVisual,
    listasPersonalizadas: listas
  };

  // Cerrar modal
  const modal = document.getElementById('modal-editor-lista-personalizada');
  if (modal) modal.remove();

  // Renderizar y guardar
  renderizarListaPersonalizada(listaId);
  guardarConfigEnFirebase();
}

function ejecutarEliminacionTareaListaPersonalizada(listaId, tareaIndex) {
  console.log('🗑️ ELIMINANDO TAREA DE LISTA PERSONALIZADA:', { listaId, tareaIndex });

  const configVisual = window.configVisual || {};
  const listasPersonalizadas = configVisual.listasPersonalizadas || [];
  const listaIndex = listasPersonalizadas.findIndex(l => l.id === listaId);

  if (listaIndex === -1) {
    console.error('❌ Lista no encontrada:', listaId);
    return;
  }

  const lista = listasPersonalizadas[listaIndex];

  if (!lista.tareas || tareaIndex < 0 || tareaIndex >= lista.tareas.length) {
    console.error('❌ Índice de tarea inválido:', tareaIndex);
    return;
  }

  const tareaEliminada = lista.tareas[tareaIndex];
  console.log('📝 Eliminando tarea:', tareaEliminada.texto);

  // Eliminar tarea del array
  listasPersonalizadas[listaIndex].tareas.splice(tareaIndex, 1);

  // Actualizar configuración global
  window.configVisual = {
    ...configVisual,
    listasPersonalizadas
  };

  // Guardar en Firebase
  guardarConfigEnFirebase();

  // Renderizar
  renderizarListaPersonalizada(listaId);

  registrarAccion('Eliminar tarea (lista personalizada)', tareaEliminada.texto);
  mostrarPopupCelebracion();
}

function eliminarListaPersonalizada(listaId) {
  console.log('🗑️ ELIMINANDO LISTA PERSONALIZADA COMPLETA:', listaId);

  const listasPersonalizadas = obtenerListasPersonalizadas();
  const listaIndex = listasPersonalizadas.findIndex(l => l.id === listaId);

  if (listaIndex === -1) {
    console.error('❌ Lista no encontrada:', listaId);
    return;
  }

  const lista = listasPersonalizadas[listaIndex];

  // VALIDAR QUE NO SEA UNA LISTA OBLIGATORIA
  const listasObligatorias = ['Tareas Críticas', 'Lista para hacer', 'tareas-criticas', 'para-hacer'];
  const esListaObligatoria = listasObligatorias.some(nombre =>
    lista.nombre.toLowerCase().includes(nombre.toLowerCase()) ||
    lista.id === nombre ||
    lista.tipo === 'criticas' ||
    lista.tipo === 'regular' ||
    lista.esListaPorDefecto === true
  );

  if (esListaObligatoria) {
    mostrarAlerta(`🚫 No se puede eliminar "${lista.nombre}" porque es una lista obligatoria del sistema.`, 'error');
    return;
  }

  const numTareas = lista.tareas ? lista.tareas.length : 0;

  // VALIDAR QUE LA LISTA ESTÉ VACÍA
  if (numTareas > 0) {
    mostrarAlerta(`❌ No se puede eliminar "${lista.nombre}" porque contiene ${numTareas} tarea(s). Elimina todas las tareas primero.`, 'error');
    return;
  }

  // Confirmar eliminación
  if (!confirm(`¿Eliminar la lista "${lista.emoji} ${lista.nombre}"?`)) {
    return;
  }

  console.log('📝 Eliminando lista:', lista.nombre);

  // Eliminar lista del array
  listasPersonalizadas.splice(listaIndex, 1);

  // Actualizar configuración global
  window.configVisual = {
    ...configVisual,
    listasPersonalizadas
  };

  // Guardar en Firebase
  guardarConfigEnFirebase();

  // Re-renderizar las secciones de listas personalizadas
  if (typeof regenerarSeccionesListasPersonalizadas === 'function') {
    regenerarSeccionesListasPersonalizadas();
  }

  // Re-renderizar el panel de configuración
  if (typeof renderizarListasPersonalizadas === 'function') {
    renderizarListasPersonalizadas();
  }

  registrarAccion('Eliminar lista personalizada', lista.nombre);
  mostrarAlerta(`✅ Lista "${lista.nombre}" eliminada`, 'success');
}


function completarTareaListaPersonalizada(listaId, tareaIndex) {
  console.log('🎯 CLICK EN TAREA DE LISTA PERSONALIZADA:', { listaId, tareaIndex });

  const listasPersonalizadas = obtenerListasPersonalizadas();
  const lista = listasPersonalizadas.find(l => l.id === listaId);

  if (!lista || !lista.tareas[tareaIndex]) return;

  const tarea = lista.tareas[tareaIndex];
  console.log('📊 Estado actual:', tarea.estado, '| Tarea:', tarea.texto);

  const estadoAnterior = tarea.estado || 'pendiente';

  // ========== FLUJO DE ESTADOS (IGUAL QUE TAREAS NORMALES) ==========
  if (!tarea.estado || tarea.estado === 'pendiente') {
    console.log('▶️ Pendiente → Migrada (abriendo modal migrar)');
    tarea.estado = 'migrada';
    tarea.completada = false;

    // Guardar referencia de la tarea en UI
    appState.ui.tareaSeleccionada = {
      tipo: 'lista_personalizada',
      listaId,
      tareaIndex
    };

    // Actualizar en memoria
    window.configVisual = { ...configVisual, listasPersonalizadas };
    renderizarListaPersonalizada(listaId);
    guardarConfigEnFirebase();

    // Abrir modal para delegar/reprogramar
    abrirModal('modal-migrar');
    return;

  } else if (tarea.estado === 'migrada') {
    // Si tiene persona asignada, completar directamente
    if (tarea.persona) {
      console.log('▶️ Migrada (con persona) → Completada');
      tarea.estado = 'completada';
      tarea.completada = true;
      tarea.fechaCompletada = new Date().toISOString();
      mostrarCelebracion();
    } else {
      console.log('▶️ Migrada (sin persona) → Programada');
      tarea.estado = 'programada';
      tarea.completada = false;
    }

  } else if (tarea.estado === 'programada') {
    console.log('▶️ Programada → Completada');
    tarea.estado = 'completada';
    tarea.completada = true;
    tarea.fechaCompletada = new Date().toISOString();
    mostrarCelebracion();

  } else {
    // Estado completada → volver a pendiente
    console.log('▶️ Completada → Pendiente (reiniciando)');
    tarea.estado = 'pendiente';
    tarea.completada = false;
    delete tarea.persona;
    delete tarea.fecha_migrar;
    delete tarea.fechaCompletada;
  }

  console.log('🔄 Actualizando y guardando...');

  // Actualizar configuración global
  window.configVisual = { ...configVisual, listasPersonalizadas };

  // Guardar en Firebase
  guardarConfigEnFirebase();

  // Re-renderizar
  renderizarListaPersonalizada(listaId);
}



window.agregarListaPersonalizada = agregarListaPersonalizada;
window.eliminarListaPersonalizada = eliminarListaPersonalizada;
window.renderizarListasPersonalizadas = renderizarListasPersonalizadas;
window.regenerarSeccionesListasPersonalizadas = regenerarSeccionesListasPersonalizadas;
window.generarSeccionListaPersonalizada = generarSeccionListaPersonalizada;
window.abrirModalNuevaTareaLista = abrirModalNuevaTareaLista;
window.limpiarListaPersonalizada = limpiarListaPersonalizada;
window.renderizarListaPersonalizada = renderizarListaPersonalizada;
window.agregarTareaAListaPersonalizada = agregarTareaAListaPersonalizada;
window.completarTareaListaPersonalizada = completarTareaListaPersonalizada;
window.ejecutarEliminacionTareaListaPersonalizada = ejecutarEliminacionTareaListaPersonalizada;
window.editarTareaListaPersonalizada = editarTareaListaPersonalizada;
window.guardarEdicionListaPersonalizada = guardarEdicionListaPersonalizada;

// ========== FUNCIÓN PRINCIPAL PARA RENDERIZAR TODAS LAS LISTAS ==========
let renderizarListasTimeout = null;
function renderizarTodasLasListasPersonalizadas() {
  // Debounce para evitar renderizados repetitivos
  if (renderizarListasTimeout) {
    clearTimeout(renderizarListasTimeout);
  }

  renderizarListasTimeout = setTimeout(() => {
    console.log('🔄 RENDERIZANDO TODAS LAS LISTAS PERSONALIZADAS');

  // Usar función helper para obtener las listas
  const listasPersonalizadas = obtenerListasPersonalizadas();

  console.log('📋 Listas encontradas:', listasPersonalizadas.length);

  // Asegurarse de que las secciones HTML existen
  regenerarSeccionesListasPersonalizadas();

  // Renderizar el contenido de cada lista
  listasPersonalizadas.forEach(lista => {
    renderizarListaPersonalizada(lista.id);
    console.log(`✅ Lista renderizada: ${lista.nombre}`);
  });

    console.log('✅ Renderizado de listas personalizadas completado');
    renderizarListasTimeout = null;
  }, 100); // 100ms de debounce
}

// ========== FUNCIÓN PARA CARGAR LISTAS AL INICIO ==========
function inicializarListasPersonalizadas() {
  console.log('🚀 INICIALIZANDO LISTAS PERSONALIZADAS EN STARTUP');

  // Esperar un momento para que todo se haya cargado
  setTimeout(() => {
    regenerarSeccionesListasPersonalizadas();
    renderizarTodasLasListasPersonalizadas();
  }, 1000);
}

// ========== MODAL UNIVERSAL DE TAREAS ==========
function abrirModalTareaUniversal() {
  llenarListasPersonalizadasEnModal();
  llenarEtiquetasEnModal();
  abrirModal('modal-tarea-universal');
  setTimeout(() => document.getElementById('tarea-universal-texto').focus(), 100);
}

function llenarListasPersonalizadasEnModal() {
  const select = document.getElementById('listas-personalizadas-options');
  if (!select) return;

  const listas = obtenerListasPersonalizadas();
  select.innerHTML = ''; // Limpiar opciones anteriores

  listas.forEach(lista => {
    const option = document.createElement('option');
    option.value = `personalizada_${lista.id}`;
    option.textContent = `${lista.emoji} ${lista.nombre}`;
    select.appendChild(option);
  });
}

function llenarEtiquetasEnModal() {
  const select = document.getElementById('tarea-universal-etiqueta');
  if (!select) return;

  // Limpiar opciones excepto la primera
  while (select.children.length > 1) {
    select.removeChild(select.lastChild);
  }

  // Agregar etiquetas desde la configuración
  const configuracion = window.configOpciones || {};
  if (configuracion.etiquetasTareas && configuracion.etiquetasTareas.length > 0) {
    configuracion.etiquetasTareas.forEach(etiqueta => {
      const option = document.createElement('option');
      option.value = etiqueta.nombre;
      option.textContent = `${etiqueta.color} ${etiqueta.nombre}`;
      select.appendChild(option);
    });
  }
}

async function agregarTareaUniversal() {
  const texto = document.getElementById('tarea-universal-texto').value.trim();
  const destino = document.getElementById('tarea-universal-destino').value;
  const fecha = document.getElementById('tarea-universal-fecha').value;
  const etiqueta = document.getElementById('tarea-universal-etiqueta').value;

  if (!texto) {
    alert('Por favor, ingresa una descripción para la tarea');
    return;
  }

  try {
    if (destino === 'criticas') {
      // Agregar a tareas críticas
      const nuevaTarea = {
        id: Date.now().toString(),
        titulo: texto,
        razon: '',
        fecha_fin: fecha,
        etiqueta: etiqueta || null,
        completada: false,
        estado: 'pendiente',
        fecha_creacion: new Date().toISOString()
      };
      appState.agenda.tareas_criticas.push(nuevaTarea);
      registrarAccion('Crear tarea crítica', `"${texto}" ${etiqueta ? `[${etiqueta}]` : ''} ${fecha ? `(vence: ${fecha})` : ''}`.trim());

    } else if (destino === 'normales') {
      // Agregar a tareas normales
      const nuevaTarea = {
        id: Date.now().toString(),
        texto: texto,
        fecha_fin: fecha,
        etiqueta: etiqueta || null,
        completada: false,
        estado: 'pendiente',
        fecha_creacion: new Date().toISOString()
      };
      appState.agenda.tareas.push(nuevaTarea);
      registrarAccion('Crear tarea normal', `"${texto}" ${etiqueta ? `[${etiqueta}]` : ''} ${fecha ? `(vence: ${fecha})` : ''}`.trim());

    } else if (destino.startsWith('personalizada_')) {
      // Agregar a lista personalizada
      const listaId = destino.replace('personalizada_', '');
      await agregarTareaAListaPersonalizada(listaId, texto, fecha, etiqueta);
      const lista = obtenerListasPersonalizadas().find(l => l.id === listaId);
      registrarAccion('Crear tarea en lista personalizada', `"${texto}" en ${lista ? lista.nombre : 'lista'} ${etiqueta ? `[${etiqueta}]` : ''} ${fecha ? `(vence: ${fecha})` : ''}`.trim());
    }

    // Limpiar formulario y cerrar modal
    document.getElementById('tarea-universal-texto').value = '';
    document.getElementById('tarea-universal-fecha').value = '';
    document.getElementById('tarea-universal-etiqueta').value = '';
    cerrarModal('modal-tarea-universal');

    // Renderizar y guardar
    renderizar();
    renderizarTodasLasListasPersonalizadas();
    await guardarJSON(true);

    mostrarAlerta(`✅ Tarea "${texto}" creada exitosamente`, 'success');

  } catch (error) {
    mostrarAlerta('❌ Error al crear la tarea', 'error');
    console.error('Error creando tarea universal:', error);
  }
}

// ========== INTEGRACIÓN CON EL MODAL DE TAREAS ==========
function modificarModalTareaParaListasPersonalizadas() {
  // Esta función será llamada cuando se agregue una tarea
  // Verifica si el modal tiene asignada una lista personalizada
  const modal = document.getElementById('modal-tarea');
  if (!modal) return null;

  const listaPersonalizadaId = modal.getAttribute('data-lista-personalizada');
  return listaPersonalizadaId;
}

window.renderizarTodasLasListasPersonalizadas = renderizarTodasLasListasPersonalizadas;
window.inicializarListasPersonalizadas = inicializarListasPersonalizadas;
window.modificarModalTareaParaListasPersonalizadas = modificarModalTareaParaListasPersonalizadas;
window.asegurarListaPorHacerComoPersonalizada = asegurarListaPorHacerComoPersonalizada;
window.ocultarSeccionListaPorHacerOriginal = ocultarSeccionListaPorHacerOriginal;
function toggleSubtareaListaPersonalizada(listaId, tareaIndex, subIndex) {
  cambiarEstadoSubtareaListaPersonalizada(listaId, tareaIndex, subIndex);
}

window.cambiarEstadoSubtareaListaPersonalizada = cambiarEstadoSubtareaListaPersonalizada;
window.abrirEditorSubtareaListaPersonalizada = abrirEditorSubtareaListaPersonalizada;
window.guardarEdicionSubtareaListaPersonalizada = guardarEdicionSubtareaListaPersonalizada;
window.eliminarSubtareaListaPersonalizada = eliminarSubtareaListaPersonalizada;
window.abrirModalSubtareaListaPersonalizada = abrirModalSubtareaListaPersonalizada;
window.guardarSubtareaListaPersonalizada = guardarSubtareaListaPersonalizada;
window.toggleSubtareaListaPersonalizada = toggleSubtareaListaPersonalizada;
