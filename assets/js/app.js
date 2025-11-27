// ========== FUNCIONES HELPER ==========
function obtenerListasPersonalizadas() {
  // TEMPORALMENTE: usar estructura antigua hasta completar migración
  const listas = window.configVisual?.listasPersonalizadas || [];
  console.log('🔍 obtenerListasPersonalizadas() llamado. Total listas:', listas.length);

  // Log subtasks for each list for debugging
  listas.forEach((lista, idx) => {
    const totalTareas = lista.tareas?.length || 0;
    const tareasConSubtareas = lista.tareas?.filter(t => t.subtareas && t.subtareas.length > 0).length || 0;
    console.log(`  📋 Lista ${idx} "${lista.nombre}": ${totalTareas} tareas, ${tareasConSubtareas} con subtareas`);

    lista.tareas?.forEach((tarea, tidx) => {
      if (tarea.subtareas && tarea.subtareas.length > 0) {
        console.log(`    ✓ Tarea ${tidx} "${tarea.texto}": ${tarea.subtareas.length} subtareas`);
      }
    });
  });

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
// Compatibilidad con Supabase
function getExtendsClassConfig() {
  return { configured: true };
}

// ========== DETECCIÓN DE DISPOSITIVO ==========
const isMobile = () => {
  return window.innerWidth <= 768 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
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

  // ⚡ APLICAR TEMA INMEDIATAMENTE desde localStorage (antes de Supabase)
  // Esto evita el "flash" de color verde mientras carga Supabase
  const temaCache = localStorage.getItem('tema_cache') || 'verde';
  const tituloCache = localStorage.getItem('titulo_cache') || 'Agenda';

  console.log('⚡ Aplicando tema desde cache:', temaCache);
  document.body.classList.add('tema-' + temaCache);

  const tituloElement = document.getElementById('titulo-agenda');
  if (tituloElement) {
    tituloElement.textContent = tituloCache;
  }

  // Aplicar clases adaptativas
  document.body.classList.add(isMobile() ? 'mobile-device' : 'desktop-device');

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

  // Verificar salvado automático diario
  if (typeof verificarSalvadoDiario === 'function') {
    setTimeout(() => verificarSalvadoDiario(), 2000); // Esperar a que Supabase se cargue
  }

  // Supabase se inicializa automáticamente en supabase-sync.js

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

  // ========== DETECTOR DE CONECTIVIDAD ==========
  inicializarDetectorConectividad();

  // Supabase maneja la sincronización automática
});

// ========== DETECTOR DE CONECTIVIDAD ==========
let modalSinInternet = null;

function inicializarDetectorConectividad() {
  console.log('🌐 Inicializando detector de conectividad...');

  // Escuchar eventos nativos del navegador
  window.addEventListener('online', manejarConexionRestaurada);
  window.addEventListener('offline', manejarConexionPerdida);

  // Verificar conectividad periódicamente (cada 30 segundos)
  setInterval(verificarConectividad, 30000);

  // Verificar inmediatamente
  verificarConectividad();
}

async function verificarConectividad() {
  // Verificar primero la conexión del navegador
  if (!navigator.onLine) {
    manejarConexionPerdida();
    return;
  }

  // Verificar conexión a Supabase si está configurado
  if (window.supabaseClient) {
    try {
      const { error } = await window.supabaseClient
        .from('agenda_data')
        .select('id')
        .limit(1);

      if (error) {
        console.warn('⚠️ Error de conectividad con Supabase:', error);
        // No bloqueamos si solo es error de Supabase, podría ser problema de permisos
      }
    } catch (err) {
      console.warn('⚠️ No se puede verificar Supabase:', err);
    }
  }
}

function manejarConexionPerdida() {
  console.error('❌ CONEXIÓN A INTERNET PERDIDA');
  mostrarModalSinInternet();
}

function manejarConexionRestaurada() {
  console.log('✅ CONEXIÓN A INTERNET RESTAURADA');
  cerrarModalSinInternet();

  // Intentar sincronizar inmediatamente
  if (typeof supabasePush === 'function') {
    setTimeout(() => {
      console.log('🔄 Sincronizando datos tras restaurar conexión...');
      supabasePush();
    }, 1000);
  }
}

function mostrarModalSinInternet() {
  // No crear duplicados
  if (modalSinInternet && modalSinInternet.style.display === 'flex') {
    return;
  }

  // Crear modal bloqueante
  if (!modalSinInternet) {
    modalSinInternet = document.createElement('div');
    modalSinInternet.id = 'modal-sin-internet';
    modalSinInternet.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 99999;
      display: flex;
      justify-content: center;
      align-items: center;
      backdrop-filter: blur(10px);
    `;

    modalSinInternet.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 40px;
        border-radius: 20px;
        max-width: 500px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        border: 3px solid rgba(255,255,255,0.3);
      ">
        <div style="font-size: 80px; margin-bottom: 20px; animation: pulse 2s infinite;">📡</div>
        <h2 style="color: white; margin: 0 0 20px 0; font-size: 28px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
          ⚠️ Sin Conexión a Internet
        </h2>
        <p style="color: rgba(255,255,255,0.95); font-size: 18px; line-height: 1.6; margin: 0 0 25px 0;">
          La aplicación está <strong>bloqueada</strong> porque no hay conexión a internet.
        </p>
        <p style="color: rgba(255,255,255,0.85); font-size: 16px; line-height: 1.5; margin: 0 0 25px 0;">
          No puedes trabajar sin conexión porque los cambios no se podrían guardar en Supabase.
        </p>
        <div style="
          background: rgba(255,255,255,0.2);
          padding: 15px;
          border-radius: 10px;
          margin-top: 20px;
          border: 1px solid rgba(255,255,255,0.3);
        ">
          <p style="color: white; margin: 0; font-size: 14px;">
            ⏳ Esperando reconexión automática...<br>
            <span style="opacity: 0.8; font-size: 12px;">La aplicación se desbloqueará cuando vuelva internet</span>
          </p>
        </div>
      </div>
    `;

    document.body.appendChild(modalSinInternet);
  } else {
    modalSinInternet.style.display = 'flex';
  }
}

function cerrarModalSinInternet() {
  if (modalSinInternet) {
    modalSinInternet.style.display = 'none';
  }
}

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
  const config = window.configFuncionales || {};

  // Solo aplicar si el usuario tiene habilitada la auto-mayúscula
  if (config.autoMayuscula === false) return;

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
  const config = window.configFuncionales || {};

  // Obtener todos los inputs de texto y textareas relevantes
  const inputs = document.querySelectorAll('input[type="text"], textarea, #cita-descripcion');

  inputs.forEach(input => {
    // Remover event listeners previos (si existen) para evitar duplicados
    if (input._autoCapitalizeHandler) {
      input.removeEventListener('input', input._autoCapitalizeHandler);
      delete input._autoCapitalizeHandler;
    }

    // Solo agregar event listener si auto-mayúscula está habilitada
    if (config.autoMayuscula !== false) {
      const handler = () => autoCapitalize(input);
      input.addEventListener('input', handler);
      input._autoCapitalizeHandler = handler; // Guardar referencia para poder remover después
    }
  });
}

// ========== AUTO-SAVE ==========
function scheduleAutoSave() {
  // Auto-guardado usando Supabase cada 5 segundos después de cambios
  if (appState.sync.autoSaveTimer) clearTimeout(appState.sync.autoSaveTimer);
  appState.sync.autoSaveTimer = setTimeout(() => {
    // Utilizar supabasePush para guardar todos los datos
    if (window.supabaseClient) {
      console.log('🔄 Auto-guardado via Supabase (push)');
      supabasePush();
    } else {
      console.warn('⚠️ Supabase no está inicializado, no se puede auto-guardar');
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
  // Cargar configuración de opciones desde Supabase (si está disponible)
  const config = window.configOpciones || {};

  // Aplicar configuración por defecto si no existe
  if (!window.configOpciones) {
    window.configOpciones = {
      forzarFecha: false,
      sinTactil: false,
      mostrarTodo: false,
      botonesBorrar: false
    };
    // Guardar configuración en Supabase (si está disponible)
    if (window.supabaseClient) {
      if (typeof guardarConfigEnSupabase === 'function') {
        guardarConfigEnSupabase();
      }
    }
  }
  // Aplicar configuración de columnas
  aplicarConfiguracionColumnas();
}

function cargarConfigVisual() {
  console.log('🚀 ========== CARGANDO CONFIGURACIÓN VISUAL ==========');
  console.log('🚀 window.configVisual existe:', !!window.configVisual);
  console.log('🚀 Stack trace:', new Error().stack.split('\n')[1]);

  try {
    const config = window.configVisual || {};
    console.log('📋 Configuración visual cargada:', config);
    console.log('📋 Tema específico:', config.tema);

    // APLICAR TEMA INMEDIATAMENTE
    const tema = config.tema || 'verde';
    console.log(`🎨 ========== APLICANDO TEMA ==========`);
    console.log(`🎨 Tema en config:`, tema);
    console.log(`🎨 Config completa:`, config);
    console.log(`🎨 DOM estado:`, {
      readyState: document.readyState,
      bodyExists: !!document.body,
      bodyClassName: document.body?.className || 'SIN BODY'
    });
    console.log(`🎨 Body classes ANTES:`, document.body.className);

    // Verificar que el body existe
    if (!document.body) {
      console.error('❌ document.body no existe! Esperando...');
      setTimeout(() => cargarConfigVisual(), 100);
      return;
    }

    // Limpiar clases de tema existentes
    document.body.className = document.body.className.replace(/tema-\w+/g, '').trim();
    console.log(`🎨 Body classes DESPUÉS de limpiar:`, document.body.className);

    // Agregar nueva clase de tema
    document.body.classList.add('tema-' + tema);
    console.log(`🎨 Body classes FINAL:`, document.body.className);
    console.log(`🎨 Tema aplicado: tema-${tema}`);
    console.log(`🎨 =====================================`);

    // APLICAR TÍTULO PERSONALIZADO INMEDIATAMENTE
    const tituloPersonalizado = config.titulo || 'Agenda';
    const tituloElement = document.getElementById('titulo-agenda');
    if (tituloElement) {
      tituloElement.textContent = tituloPersonalizado;
      console.log(`📝 Título aplicado: ${tituloPersonalizado}`);
    }

    // ⚡ ACTUALIZAR CACHE en localStorage
    localStorage.setItem('tema_cache', tema);
    localStorage.setItem('titulo_cache', tituloPersonalizado);
    console.log('⚡ Cache actualizado con tema y título de Supabase');

    // Aplicar visibilidad de secciones
    if (typeof aplicarVisibilidadSecciones === 'function') {
      aplicarVisibilidadSecciones();
    }

    // Configurar columnas y modo oscuro
    aplicarConfiguracionColumnas();
    verificarModoOscuroAutomatico();

    // Regenerar y renderizar listas personalizadas (funcionalidad de la función duplicada)
    if (!config.listasPersonalizadas) {
      config.listasPersonalizadas = [];
      window.configVisual.listasPersonalizadas = [];
    }
    if (typeof regenerarSeccionesListasPersonalizadas === 'function') {
      regenerarSeccionesListasPersonalizadas();
    }
    if (typeof renderizarTodasLasListasPersonalizadas === 'function') {
      renderizarTodasLasListasPersonalizadas();
    }

    // Cargar valores en el formulario de configuración
    cargarConfigVisualEnFormulario();

    console.log('✅ cargarConfigVisual completado - tema aplicado');
  } catch (error) {
    console.error('❌ Error al cargar configuración visual desde Supabase:', error);
  }
}

// ========== ESCUCHAR EVENTO DE CONFIGURACIÓN CARGADA ==========
document.addEventListener('supabaseConfigLoaded', (evento) => {
  console.log('🎧 Evento supabaseConfigLoaded recibido:', evento.detail);

  const config = evento.detail.config || {};
  console.log('🎨 Configuración recibida en evento:', config);

  // Aplicar configuración visual inmediatamente
  cargarConfigVisual();
});

// ========== NOTIFICACIONES ==========
function solicitarPermisoNotificaciones() {
  console.log('🔔 Solicitando permisos de notificaciones...');

  if (!("Notification" in window)) {
    mostrarAlerta('❌ Tu navegador no soporta notificaciones', 'error');
    return;
  }

  if (Notification.permission === "granted") {
    mostrarAlerta('✅ Ya tienes permisos de notificaciones activados', 'success');
    return;
  }

  if (Notification.permission === "denied") {
    mostrarAlerta('❌ Permisos de notificaciones denegados. Ve a configuración del navegador para activarlos manualmente.', 'warning');
    return;
  }

  // Solicitar permiso
  Notification.requestPermission().then(function (permission) {
    if (permission === "granted") {
      mostrarAlerta('✅ ¡Permisos de notificaciones activados!', 'success');
      // Mostrar notificación de prueba
      new Notification('🎉 ¡Notificaciones activadas!', {
        body: 'Ya puedes recibir recordatorios de tu agenda',
        icon: '/favicon.ico'
      });
    } else {
      mostrarAlerta('❌ Permisos de notificaciones denegados', 'error');
    }
  });
}

// ========== CONFIGURACIÓN DE COLUMNAS ==========
function aplicarConfiguracionColumnas() {
  console.log('📐 APLICANDO CONFIGURACIÓN DE COLUMNAS');

  const configVisual = window.configVisual || {};
  let columnas = parseInt(configVisual.columnas) || 2;

  // 📱 FORZAR UNA COLUMNA EN MÓVIL (ignorar configuración)
  if (isMobile()) {
    columnas = 1;
    console.log('📱 Dispositivo móvil detectado - Forzando UNA columna');
  }

  console.log('📐 Número de columnas a aplicar:', columnas);

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

  // Guardar en Supabase
  if (typeof supabasePush === 'function') {
    supabasePush();
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

  // Guardar en configuración con Supabase
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
window.solicitarPermisoNotificaciones = solicitarPermisoNotificaciones;
window.cambiarModoCalendario = cambiarModoCalendario;
window.aplicarConfiguracionColumnas = aplicarConfiguracionColumnas;
window.insertarIcono = insertarIcono;
window.verificarModoOscuroAutomatico = verificarModoOscuroAutomatico;
window.iniciarPomodoro = iniciarPomodoro;
window.iniciarPomodoroConTarea = iniciarPomodoroConTarea;
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

  if (!config.modoOscuroAuto) {
    console.log('🌙 Modo oscuro automático desactivado en config');
    return;
  }

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

  console.log(`🌙 Verificación modo oscuro automático:`, {
    horaActual: `${Math.floor(horaActual / 60)}:${(horaActual % 60).toString().padStart(2, '0')}`,
    horaInicio,
    horaFin,
    debeSerOscuro
  });

  // Guardar tema original si no existe
  if (!config.temaOriginal) {
    config.temaOriginal = config.tema || 'verde';
    window.configVisual.temaOriginal = config.temaOriginal;
  }

  const claseActual = document.body.className;
  const tieneOscuro = claseActual.includes('tema-oscuro');

  if (debeSerOscuro && !tieneOscuro) {
    // Cambiar a modo oscuro automáticamente (sobrescribir cualquier tema)
    document.body.className = document.body.className.replace(/tema-\w+/g, '').trim();
    document.body.classList.add('tema-oscuro');
    console.log(`🌙 Modo oscuro automático ACTIVADO (tema original: ${config.temaOriginal})`);
  } else if (!debeSerOscuro && tieneOscuro) {
    // Volver al tema original guardado
    const temaOriginal = config.temaOriginal || config.tema || 'verde';
    document.body.className = document.body.className.replace(/tema-\w+/g, '').trim();
    document.body.classList.add('tema-' + temaOriginal);
    console.log(`☀️ Modo oscuro automático DESACTIVADO - Restaurado tema: ${temaOriginal}`);
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

// Función para iniciar Pomodoro con nombre de tarea pre-cargado
function iniciarPomodoroConTarea(nombreTarea) {
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

  // Pre-cargar el nombre de la tarea
  setTimeout(() => {
    const inputActividad = document.getElementById('pomodoro-actividad');
    if (inputActividad) {
      inputActividad.value = nombreTarea;
      inputActividad.focus();
      inputActividad.setSelectionRange(nombreTarea.length, nombreTarea.length);
    }
  }, 50);
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
  const temaSeleccionado = document.getElementById('config-tema-select')?.value || 'verde';
  console.log(`💾 ========== GUARDANDO TEMA ==========`);
  console.log(`💾 Tema seleccionado en UI:`, temaSeleccionado);

  const config = {
    tema: temaSeleccionado,
    titulo: document.getElementById('config-titulo-input')?.value || 'Agenda',
    modoVisualizacion: document.getElementById('config-modo-visualizacion')?.value || 'estado',
    popupCelebracion: document.getElementById('config-popup-celebracion')?.checked !== false,
    mostrarNotas: document.getElementById('config-mostrar-notas')?.checked === true,
    mostrarSentimientos: document.getElementById('config-mostrar-sentimientos')?.checked === true,
    mostrarContrasenas: document.getElementById('config-mostrar-contrasenas')?.checked === true,
    mostrarPomodoro: document.getElementById('config-mostrar-pomodoro')?.checked === true,
    mostrarProgreso: document.getElementById('config-mostrar-progreso')?.checked === true,
    mostrarResumen: document.getElementById('config-mostrar-resumen')?.checked === true,
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

  console.log('💾 Guardando configuración visual en Supabase:', config);

  // Guardar DIRECTAMENTE en variables globales
  window.configVisual = config;

  // ⚡ GUARDAR EN LOCALSTORAGE para aplicación instantánea (evitar flash verde)
  localStorage.setItem('tema_cache', config.tema);
  localStorage.setItem('titulo_cache', config.titulo);
  console.log('⚡ Tema y título guardados en cache localStorage');

  // Guardar en Supabase
  if (typeof window.supabasePush === 'function') {
    console.log('⚡ Guardando en Supabase...');
    const guardado = await window.supabasePush();
    if (guardado) {
      // APLICAR tema INMEDIATAMENTE
      const tema = config.tema || 'verde';
      console.log(`💾 Aplicando tema después de guardar: ${tema}`);
      console.log(`💾 Body classes antes de aplicar:`, document.body.className);

      document.body.className = document.body.className.replace(/tema-\w+/g, '').trim();
      document.body.classList.add('tema-' + tema);

      console.log(`💾 Body classes después de aplicar:`, document.body.className);
      console.log(`💾 Tema aplicado exitosamente: tema-${tema}`);
      console.log(`💾 ===================================`);

      // APLICAR configuración
      cargarConfigVisual();
      aplicarConfiguracionColumnas();
      if (typeof aplicarVisibilidadSecciones === 'function') {
        aplicarVisibilidadSecciones();
      }
      mostrarAlerta('✅ Configuración visual guardada en Supabase', 'success');
    } else {
      console.warn('❌ Error guardando en Supabase');
      mostrarAlerta('❌ Error guardando en Supabase', 'error');
    }
  } else {
    console.warn('⚠️ supabasePush no disponible');
    cargarConfigVisual();
    aplicarConfiguracionColumnas();
    mostrarAlerta('⚠️ No se pudo sincronizar con Supabase', 'warning');
  }
}

// ========== FUNCIONES PARA MOSTRAR/OCULTAR CITAS Y TAREAS EN CALENDARIO ==========
async function mostarCitaCalendario() {
  console.log('📅 Cambiando visibilidad de citas en calendario');

  const checkbox = document.getElementById('config-calendario-mostrar-citas');
  if (!checkbox) {
    console.warn('⚠️ No se encontró el checkbox de mostrar citas');
    return;
  }

  // Actualizar configuración
  if (!window.configVisual) {
    window.configVisual = {};
  }

  window.configVisual.calendarioMostrarCitas = checkbox.checked;
  console.log('📅 Mostrar citas en calendario:', checkbox.checked);

  // Guardar en Supabase
  if (typeof window.supabasePush === 'function') {
    await window.supabasePush();
    console.log('💾 Configuración guardada en Supabase');
  }

  // Re-renderizar calendarios
  if (typeof renderCalendar === 'function') {
    renderCalendar();
  }
  if (typeof renderCalendarTareas === 'function') {
    renderCalendarTareas();
  }
  if (typeof renderCalendarioIntegrado === 'function') {
    renderCalendarioIntegrado();
  }

  mostrarAlerta(checkbox.checked ? '✅ Citas visibles en calendario' : '❌ Citas ocultadas del calendario', 'info');
}

async function mostarTareaCalendario() {
  console.log('✅ Cambiando visibilidad de tareas en calendario');

  const checkbox = document.getElementById('config-calendario-mostrar-tareas');
  if (!checkbox) {
    console.warn('⚠️ No se encontró el checkbox de mostrar tareas');
    return;
  }

  // Actualizar configuración
  if (!window.configVisual) {
    window.configVisual = {};
  }

  window.configVisual.calendarioMostrarTareas = checkbox.checked;
  console.log('✅ Mostrar tareas en calendario:', checkbox.checked);

  // Guardar en Supabase
  if (typeof window.supabasePush === 'function') {
    await window.supabasePush();
    console.log('💾 Configuración guardada en Supabase');
  }

  // Re-renderizar calendarios
  if (typeof renderCalendar === 'function') {
    renderCalendar();
  }
  if (typeof renderCalendarTareas === 'function') {
    renderCalendarTareas();
  }
  if (typeof renderCalendarioIntegrado === 'function') {
    renderCalendarioIntegrado();
  }

  mostrarAlerta(checkbox.checked ? '✅ Tareas visibles en calendario' : '❌ Tareas ocultadas del calendario', 'info');
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
    if (typeof renderizarListasPersonalizadas === 'function') {
      renderizarListasPersonalizadas();
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
    // Cargar backups desde Supabase
    if (typeof cargarListaBackups === 'function') {
      cargarListaBackups();
    }
    // Mantener compatibilidad con salvados antiguos
    if (typeof cargarListaSalvados === 'function') {
      cargarListaSalvados();
    }
  } else if (tabName === 'log') {
    if (typeof cargarLog === 'function') {
      cargarLog();
    }
  } else if (tabName === 'supabase') {
    if (typeof cargarConfigSupabaseEnFormulario === 'function') {
      cargarConfigSupabaseEnFormulario();
    }
  }
}

function cargarConfigVisualEnFormulario() {
  // Cargar configuración DESDE VARIABLES GLOBALES (sincronizadas con Supabase)
  const config = window.configVisual || {};
  console.log('📝 Cargando configuración visual en formulario:', config);

  const temaSelect = document.getElementById('config-tema-select');
  if (temaSelect) temaSelect.value = config.tema || 'verde';

  const tituloInput = document.getElementById('config-titulo-input');
  if (tituloInput) tituloInput.value = config.titulo || 'Agenda';

  // Actualizar título completo
  const titulo = document.getElementById('titulo-agenda');
  if (titulo) titulo.textContent = config.titulo || 'Agenda';

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

  const modoOscuroAuto = document.getElementById('config-modo-oscuro-auto');
  if (modoOscuroAuto) modoOscuroAuto.checked = config.modoOscuroAuto !== false;

  const horaInicioOscuro = document.getElementById('config-hora-inicio-oscuro');
  if (horaInicioOscuro) horaInicioOscuro.value = config.horaInicioOscuro || '20:00';

  const horaFinOscuro = document.getElementById('config-hora-fin-oscuro');
  if (horaFinOscuro) horaFinOscuro.value = config.horaFinOscuro || '07:00';

  const calendarioCitas = document.getElementById('config-calendario-citas');
  if (calendarioCitas) {
    calendarioCitas.value = config.calendarioCitas || 'boton';
  }

  const calendarioMostrarCitas = document.getElementById('config-calendario-mostrar-citas');
  if (calendarioMostrarCitas) {
    calendarioMostrarCitas.checked = config.calendarioMostrarCitas !== false;
  }

  const calendarioMostrarTareas = document.getElementById('config-calendario-mostrar-tareas');
  if (calendarioMostrarTareas) {
    calendarioMostrarTareas.checked = config.calendarioMostrarTareas !== false;
  }

  const columnas = document.getElementById('config-columnas');
  if (columnas) {
    columnas.value = config.columnas || 2;
  }

  // 📱 OCULTAR selector de columnas en móvil (siempre usa 1 columna)
  const columnasContainer = document.getElementById('config-columnas-container');
  if (columnasContainer) {
    if (isMobile()) {
      columnasContainer.style.display = 'none';
      console.log('📱 Selector de columnas ocultado en móvil');
    } else {
      columnasContainer.style.display = 'block';
    }
  }

  const frasesMotivacionales = document.getElementById('config-frases-motivacionales');
  if (frasesMotivacionales) frasesMotivacionales.value = (config.frases || []).join('\n');

  // Cargar listas personalizadas
  renderizarListasPersonalizadas();
}

function cargarConfigFuncionalesEnFormulario() {
  // Cargar configuración DESDE VARIABLES GLOBALES (sincronizadas con Supabase)
  const config = window.configFuncionales || {};

  // 🔍 LOG DE DEPURACIÓN: Ver qué se está cargando
  console.log('📥 CARGANDO Config Funcional desde Supabase:', config);
  console.log('📋 Detalles:', {
    fechaObligatoria: config.fechaObligatoria,
    confirmacionBorrar: config.confirmacionBorrar,
    autoMayuscula: config.autoMayuscula,
    popupDiario: config.popupDiario
  });

  const fechaObligatoria = document.getElementById('config-fecha-obligatoria');
  if (fechaObligatoria) fechaObligatoria.checked = config.fechaObligatoria === true;

  const confirmacionBorrar = document.getElementById('config-confirmacion-borrar');
  if (confirmacionBorrar) confirmacionBorrar.checked = config.confirmacionBorrar !== false;

  const autoMayuscula = document.getElementById('config-auto-mayuscula');
  if (autoMayuscula) autoMayuscula.checked = config.autoMayuscula !== false;

  const popupDiario = document.getElementById('config-popup-diario');
  if (popupDiario) popupDiario.value = config.popupDiario || 'nunca';

  const notificacionesActivas = document.getElementById('config-notificaciones-activas');
  if (notificacionesActivas) notificacionesActivas.checked = config.notificacionesActivas === true;

  const notif1Dia = document.getElementById('config-notif-1-dia');
  if (notif1Dia) notif1Dia.checked = config.notif1Dia === true;

  const notif2Horas = document.getElementById('config-notif-2-horas');
  if (notif2Horas) notif2Horas.checked = config.notif2Horas === true;

  const notif30Min = document.getElementById('config-notif-30-min');
  if (notif30Min) notif30Min.checked = config.notif30Min === true;

  console.log('✅ Config funcional cargada en formulario');
}

async function guardarConfigFuncionales() {
  const fechaObligatoriaEl = document.getElementById('config-fecha-obligatoria');
  const confirmacionBorrarEl = document.getElementById('config-confirmacion-borrar');
  const autoMayusculaEl = document.getElementById('config-auto-mayuscula');
  const popupDiarioEl = document.getElementById('config-popup-diario');
  const notificacionesActivasEl = document.getElementById('config-notificaciones-activas');
  const notif1DiaEl = document.getElementById('config-notif-1-dia');
  const notif2HorasEl = document.getElementById('config-notif-2-horas');
  const notif30MinEl = document.getElementById('config-notif-30-min');

  const config = {
    fechaObligatoria: fechaObligatoriaEl ? fechaObligatoriaEl.checked : false,
    confirmacionBorrar: confirmacionBorrarEl ? confirmacionBorrarEl.checked : true,
    autoMayuscula: autoMayusculaEl ? autoMayusculaEl.checked : true,
    popupDiario: popupDiarioEl ? popupDiarioEl.value : 'nunca',
    notificacionesActivas: notificacionesActivasEl ? notificacionesActivasEl.checked : false,
    notif1Dia: notif1DiaEl ? notif1DiaEl.checked : false,
    notif2Horas: notif2HorasEl ? notif2HorasEl.checked : false,
    notif30Min: notif30MinEl ? notif30MinEl.checked : false
  };

  // 🔍 LOG DE DEPURACIÓN: Ver qué se está guardando
  console.log('💾 GUARDANDO Config Funcional:', config);
  console.log('📋 Detalles:', {
    fechaObligatoria: config.fechaObligatoria,
    confirmacionBorrar: config.confirmacionBorrar,
    autoMayuscula: config.autoMayuscula,
    popupDiario: config.popupDiario
  });

  // Guardar DIRECTAMENTE en variables globales
  window.configFuncionales = config;

  // ⚠️ IMPORTANTE: Guardar en Supabase SIN hacer Pull antes
  // Esto evita que se sobrescriban los cambios del usuario
  if (typeof supabasePush === 'function') {
    console.log('☁️ Guardando en Supabase (skipPullBefore = true)...');
    const guardado = await supabasePush(false, true); // skipPullBefore = true
    if (guardado) {
      console.log('✅ Configuración funcional guardada exitosamente');
      mostrarAlerta('✅ Configuración funcional guardada en Supabase', 'success');
    } else {
      console.warn('⚠️ Error al guardar en Supabase');
      mostrarAlerta('⚠️ Error al guardar en Supabase', 'warning');
    }
  } else {
    mostrarAlerta('⚠️ No se pudo sincronizar con Supabase', 'warning');
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
    // Cargar etiquetas en la configuración
    if (typeof window.renderizarListaEtiquetas === 'function') {
      window.renderizarListaEtiquetas('etiquetas-tareas-lista', 'tareas');
      window.renderizarListaEtiquetas('etiquetas-citas-lista', 'citas');
    }
    // Cargar lista de backups si está disponible
    if (typeof cargarListaBackups === 'function') {
      cargarListaBackups();
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
    await guardarJSON(true); // Guardado inmediato en lugar de programado
    await renderizarContrasenas();
    cerrarModalNuevaContrasena();

    // Mostrar confirmación
    mostrarModalExito('¡Contraseña guardada!', 'La contraseña se ha guardado y encriptada exitosamente en Supabase');

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
    await guardarJSON(true); // Guardado inmediato en lugar de programado
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
      await guardarJSON(true); // Guardado inmediato en lugar de programado
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

    // Guardar cambios INMEDIATAMENTE (crítico: todas las contraseñas fueron reencriptadas)
    await guardarJSON(true);
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

// ========== EDITOR DE BASE DE DATOS SUPABASE ==========
function abrirEditorBaseDatos() {
  // Verificar si Supabase está inicializado
  if (!window.supabaseClient) {
    mostrarAlerta('❌ Supabase no está inicializado. No se puede acceder a la base de datos.', 'error');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-editor-db';
  modal.style.zIndex = '2000';

  modal.innerHTML = `
    <div class="modal-content" style="max-width:900px;height:85vh;">
      <h4>🔧 Editor de Base de Datos Supabase</h4>
      <p style="font-size:12px;color:#666;margin-bottom:15px;">
        ⚠️ <strong>Advertencia:</strong> Estás editando directamente la tabla 'agenda_data' en Supabase.
        Los cambios se aplicarán inmediatamente en la nube.
      </p>

      <div style="display:flex;gap:10px;margin-bottom:15px;">
        <label style="font-weight:bold;align-self:center;">📋 Colección (ID):</label>
        <select id="selector-tabla" onchange="cargarTablaSupabase()" style="flex:1;padding:8px;border-radius:4px;border:1px solid #ddd;">
          <option value="">Selecciona una colección...</option>
          <option value="tareas">📝 Tareas (tareas)</option>
          <option value="citas">📅 Citas (citas)</option>
          <option value="config">⚙️ Configuración (config)</option>
          <option value="notas">📄 Notas (notas)</option>
          <option value="sentimientos">💭 Sentimientos (sentimientos)</option>
          <option value="contrasenas">🔐 Contraseñas (contrasenas)</option>
          <option value="historial_eliminados">🗑️ Historial Eliminados (historial_eliminados)</option>
          <option value="historial_tareas">📊 Historial Tareas (historial_tareas)</option>
          <option value="personas">👥 Personas (personas)</option>
          <option value="etiquetas">🏷️ Etiquetas (etiquetas)</option>
          <option value="log">📊 Log (log)</option>
          <option value="salvados">💾 Backups (salvados)</option>
        </select>
        <button class="btn-secundario" onclick="cargarTablaSupabase()" style="padding:8px 12px;">🔄 Cargar</button>
      </div>

      <div id="info-tabla" style="margin-bottom:15px;padding:8px;background:#f5f5f5;border-radius:4px;display:none;"></div>

      <div style="margin-bottom:15px;">
        <textarea
          id="editor-supabase-datos"
          style="width:100%;height:400px;font-family:monospace;font-size:12px;border:1px solid #ddd;border-radius:4px;padding:10px;resize:vertical;"
          placeholder="Selecciona una colección para comenzar a editar..."
          readonly
        ></textarea>
      </div>

      <div style="display:flex;gap:10px;margin-bottom:15px;">
        <button class="btn-secundario" onclick="validarJSONSupabase()" style="flex:1;">✅ Validar</button>
        <button class="btn-secundario" onclick="formatearJSONSupabase()" style="flex:1;">🎨 Formatear</button>
        <button class="btn-secundario" onclick="restaurarTablaSupabase()" style="flex:1;">🔄 Restaurar Original</button>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:15px;">
        <button class="btn-secundario" onclick="forzarSincronizacionSupabase()" style="flex:1;">⚡ Sincronizar App</button>
        <button class="btn-secundario" onclick="limpiarDatosLocales()" style="flex:1;">🧹 Limpiar Local</button>
      </div>

      <div id="estado-supabase" style="margin-bottom:15px;padding:10px;border-radius:4px;display:none;"></div>

      <div class="modal-botones">
        <button id="btn-guardar-supabase" class="btn-primario" onclick="guardarTablaSupabase()" disabled>💾 Guardar en Supabase</button>
        <button class="btn-secundario" onclick="cerrarModal('modal-editor-db')">❌ Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = 'block';

  // Auto-cargar si había una tabla seleccionada previamente
  setTimeout(() => {
    const selector = document.getElementById('selector-tabla');
    if (selector && tablaActualSupabase) {
      console.log('🔄 Auto-cargando tabla previamente seleccionada:', tablaActualSupabase);
      selector.value = tablaActualSupabase;
      cargarTablaSupabase();
    }
  }, 100);
}

let datosOriginalesSupabase = null;
let tablaActualSupabase = null;

async function cargarTablaSupabase() {
  const selector = document.getElementById('selector-tabla');
  const textarea = document.getElementById('editor-supabase-datos');
  const info = document.getElementById('info-tabla');
  const estado = document.getElementById('estado-supabase');
  const btnGuardar = document.getElementById('btn-guardar-supabase');

  if (!selector || !textarea) return;

  const idColeccion = selector.value;
  if (!idColeccion) {
    textarea.value = '';
    textarea.readOnly = true;
    btnGuardar.disabled = true;
    info.style.display = 'none';
    estado.style.display = 'none';
    return;
  }

  estado.style.display = 'block';
  estado.style.background = '#fff3cd';
  estado.style.color = '#856404';
  estado.innerHTML = '🔄 Cargando datos de Supabase...';

  try {
    tablaActualSupabase = idColeccion;
    console.log(`🔍 Cargando colección: ${idColeccion}`);

    // Verificar conexión antes de intentar cargar
    if (!window.supabaseClient) {
      throw new Error('Cliente de Supabase no está inicializado');
    }

    const { data, error } = await Promise.race([
      window.supabaseClient
        .from('agenda_data')
        .select('data')
        .eq('id', idColeccion)
        .single(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: La consulta tardó más de 10 segundos')), 10000)
      )
    ]);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const datos = data?.data || {};

    datosOriginalesSupabase = JSON.parse(JSON.stringify(datos));
    textarea.value = JSON.stringify(datos, null, 2);
    textarea.readOnly = false;
    btnGuardar.disabled = false;

    info.style.display = 'block';
    info.innerHTML = `
      📋 <strong>${idColeccion}</strong><br>
      📊 Tamaño: ${JSON.stringify(datos).length} caracteres<br>
      🔑 Campos: ${Object.keys(datos).length}
    `;

    estado.style.display = 'block';
    estado.style.background = '#e8f5e8';
    estado.style.color = '#2e7d32';
    estado.innerHTML = '✅ Datos cargados correctamente desde Supabase';

  } catch (error) {
    console.error('Error cargando tabla:', error);
    estado.style.display = 'block';
    estado.style.background = '#ffe6e6';
    estado.style.color = '#d32f2f';
    estado.innerHTML = `❌ Error: ${error.message}`;

    textarea.value = '';
    textarea.readOnly = true;
    btnGuardar.disabled = true;
    datosOriginalesSupabase = null;
  }
}

function validarJSONSupabase() {
  const textarea = document.getElementById('editor-supabase-datos');
  const estado = document.getElementById('estado-supabase');

  if (!textarea || !estado) return;

  try {
    const datos = JSON.parse(textarea.value);
    estado.style.display = 'block';
    estado.style.background = '#e8f5e8';
    estado.style.color = '#2e7d32';
    estado.innerHTML = `✅ <strong>JSON válido</strong><br>🔑 ${Object.keys(datos).length} campos`;
  } catch (error) {
    estado.style.display = 'block';
    estado.style.background = '#ffe6e6';
    estado.style.color = '#d32f2f';
    estado.innerHTML = `❌ <strong>Error de sintaxis JSON:</strong><br>${error.message}`;
  }
}

function formatearJSONSupabase() {
  const textarea = document.getElementById('editor-supabase-datos');
  if (!textarea || textarea.readOnly) return;

  try {
    const datos = JSON.parse(textarea.value);
    textarea.value = JSON.stringify(datos, null, 2);
    mostrarAlerta('🎨 JSON formateado correctamente', 'success');
  } catch (error) {
    mostrarAlerta('❌ Error: JSON inválido', 'error');
  }
}

function restaurarTablaSupabase() {
  const textarea = document.getElementById('editor-supabase-datos');
  const estado = document.getElementById('estado-supabase');

  if (!textarea || !datosOriginalesSupabase) return;

  textarea.value = JSON.stringify(datosOriginalesSupabase, null, 2);

  if (estado) {
    estado.style.display = 'block';
    estado.style.background = '#fff3cd';
    estado.innerHTML = '🔄 Datos restaurados al estado original';
  }
}

async function guardarTablaSupabase() {
  const textarea = document.getElementById('editor-supabase-datos');
  const estado = document.getElementById('estado-supabase');

  if (!textarea || !tablaActualSupabase) {
    mostrarAlerta('❌ No hay colección seleccionada', 'error');
    return;
  }

  try {
    const nuevosDatos = JSON.parse(textarea.value);

    const confirmacion = confirm(`
🔥 ¿Guardar cambios en Supabase?

📋 Colección: ${tablaActualSupabase}
⚠️ Esta acción actualizará directamente la base de datos.
¿Continuar?`);

    if (!confirmacion) return;

    estado.style.display = 'block';
    estado.style.background = '#fff3cd';
    estado.innerHTML = '🔄 Guardando cambios en Supabase...';

    const { error } = await window.supabaseClient
      .from('agenda_data')
      .upsert({ id: tablaActualSupabase, data: nuevosDatos }, { onConflict: 'id' });

    if (error) throw error;

    datosOriginalesSupabase = JSON.parse(JSON.stringify(nuevosDatos));

    estado.style.display = 'block';
    estado.style.background = '#e8f5e8';
    estado.style.color = '#2e7d32';
    estado.innerHTML = '✅ Cambios guardados exitosamente en Supabase';

    mostrarAlerta('💾 Colección actualizada en Supabase', 'success');

    // Sincronizar localmente si es necesario
    if (['tareas', 'citas', 'config'].includes(tablaActualSupabase)) {
      setTimeout(() => {
        if (typeof supabasePull === 'function') {
          supabasePull();
          mostrarAlerta('🔄 Sincronizando cambios localmente...', 'info');
        }
      }, 1500);
    }

  } catch (error) {
    console.error('Error guardando en Supabase:', error);
    estado.style.display = 'block';
    estado.style.background = '#ffe6e6';
    estado.style.color = '#d32f2f';
    estado.innerHTML = `❌ Error guardando: ${error.message}`;
    mostrarAlerta(`❌ Error: ${error.message}`, 'error');
  }
}

function forzarSincronizacionSupabase() {
  const estado = document.getElementById('estado-supabase');
  if (estado) {
    estado.style.display = 'block';
    estado.style.background = '#fff3cd';
    estado.innerHTML = '⚡ Forzando sincronización...';
  }

  if (typeof supabasePull === 'function') {
    supabasePull();
    mostrarAlerta('⚡ Sincronización iniciada', 'success');
  }
}

// ========== FUNCIÓN DE LIMPIEZA DE DATOS LOCALES ==========
function limpiarDatosLocales() {
  const confirmacion = confirm(`
🧹 ¿Limpiar TODOS los datos locales?

Esta acción eliminará:
• Estado actual de la aplicación
• Datos en memoria (appState)
• NO afecta Supabase ni localStorage

Después de limpiar, se sincronizará desde Supabase.
¿Continuar?`);

  if (!confirmacion) return;

  const estado = document.getElementById('estado-supabase');

  if (estado) {
    estado.style.display = 'block';
    estado.style.background = '#fff3cd';
    estado.innerHTML = '🧹 Limpiando datos locales...';
  }

  console.log('🧹 Iniciando limpieza de datos locales...');

  // Limpiar appState
  if (window.appState && window.appState.agenda) {
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
  }

  setTimeout(() => {
    if (estado) {
      estado.style.display = 'block';
      estado.style.background = '#e8f5e8';
      estado.style.color = '#2e7d32';
      estado.innerHTML = '✅ Datos locales limpiados - Sincronizando desde Supabase...';
    }

    // Forzar sincronización desde Supabase
    if (typeof supabasePull === 'function') {
      supabasePull();
    }

    mostrarAlerta('🧹 Datos locales limpiados y sincronizados', 'success');
  }, 500);
}

window.abrirEditorBaseDatos = abrirEditorBaseDatos;
window.cargarTablaSupabase = cargarTablaSupabase;
window.validarJSONSupabase = validarJSONSupabase;
window.formatearJSONSupabase = formatearJSONSupabase;
window.restaurarTablaSupabase = restaurarTablaSupabase;
window.guardarTablaSupabase = guardarTablaSupabase;
window.forzarSincronizacionSupabase = forzarSincronizacionSupabase;
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

  // Guardar en Supabase
  if (typeof supabasePush === 'function') {
    const guardado = await supabasePush();
    if (guardado) {
      console.log('✅ Configuración guardada en Supabase');
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
      mostrarAlerta('❌ Error al guardar en Supabase', 'error');
    }
  } else {
    mostrarAlerta('⚠️ No se pudo sincronizar con Supabase', 'warning');
  }
}

// Variable global para controlar el modo de edición
let listaEnEdicion = null;

function editarListaPersonalizada(id) {
  console.log('✏️ Editando lista:', id);

  const configVisual = window.configVisual || {};
  const listasPersonalizadas = configVisual.listasPersonalizadas || [];

  // Buscar la lista
  const lista = listasPersonalizadas.find(l => l.id === id);
  if (!lista) {
    mostrarAlerta('❌ No se encontró la lista', 'error');
    return;
  }

  // Guardar el ID de la lista en edición
  listaEnEdicion = id;

  // Rellenar los campos del formulario
  document.getElementById('nueva-lista-personalizada').value = lista.nombre;
  document.getElementById('emoji-lista-personalizada').value = lista.emoji;
  document.getElementById('color-lista-personalizada').value = lista.color;

  // Cambiar el botón para modo edición
  const botonContainer = document.querySelector('#nueva-lista-personalizada').closest('div[style*="grid-template-columns"]');
  if (botonContainer) {
    const boton = botonContainer.querySelector('button');
    if (boton) {
      boton.innerHTML = '💾 Guardar Cambios';
      boton.setAttribute('onclick', 'guardarEdicionListaPersonalizada()');
      boton.style.background = 'rgba(76, 209, 55, 0.9)';

      // Añadir botón de cancelar si no existe
      if (!botonContainer.querySelector('.btn-cancelar-edicion')) {
        const btnCancelar = document.createElement('button');
        btnCancelar.className = 'btn-cancelar-edicion';
        btnCancelar.innerHTML = '❌ Cancelar';
        btnCancelar.setAttribute('onclick', 'cancelarEdicionListaPersonalizada()');
        btnCancelar.style.cssText = 'padding:8px 16px;background:rgba(255,71,87,0.9);color:white;border:none;border-radius:6px;font-weight:bold;cursor:pointer;transition:all 0.3s ease;';
        botonContainer.appendChild(btnCancelar);
      }
    }
  }

  // Scroll al formulario
  document.getElementById('nueva-lista-personalizada').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  document.getElementById('nueva-lista-personalizada').focus();

  mostrarAlerta(`✏️ Editando lista: ${lista.nombre}`, 'info');
}

async function guardarEdicionListaPersonalizada() {
  console.log('💾 Guardando edición de lista:', listaEnEdicion);

  if (!listaEnEdicion) {
    mostrarAlerta('❌ No hay lista en edición', 'error');
    return;
  }

  const nombre = document.getElementById('nueva-lista-personalizada')?.value?.trim();
  const emoji = document.getElementById('emoji-lista-personalizada')?.value || '📝';
  const color = document.getElementById('color-lista-personalizada')?.value || '#667eea';

  console.log('📊 Valores leídos del formulario:', { nombre, emoji, color });

  if (!nombre) {
    mostrarAlerta('❌ Por favor escribe un nombre para la lista', 'error');
    return;
  }

  const configVisual = window.configVisual || {};
  const listasPersonalizadas = configVisual.listasPersonalizadas || [];

  console.log('📋 Listas antes de actualizar:', JSON.parse(JSON.stringify(listasPersonalizadas)));

  // Buscar la lista
  const listaIndex = listasPersonalizadas.findIndex(l => l.id === listaEnEdicion);
  if (listaIndex === -1) {
    mostrarAlerta('❌ No se encontró la lista', 'error');
    cancelarEdicionListaPersonalizada();
    return;
  }

  console.log('🔍 Lista encontrada en índice:', listaIndex, 'Color anterior:', listasPersonalizadas[listaIndex].color);

  // Verificar si el nuevo nombre ya existe en otra lista
  const nombreExistente = listasPersonalizadas.find((l, idx) =>
    idx !== listaIndex && l.nombre.toLowerCase() === nombre.toLowerCase()
  );

  if (nombreExistente) {
    mostrarAlerta('❌ Ya existe otra lista con ese nombre', 'error');
    return;
  }

  // Actualizar la lista
  listasPersonalizadas[listaIndex] = {
    ...listasPersonalizadas[listaIndex],
    nombre: nombre,
    emoji: emoji,
    color: color
  };

  console.log('✏️ Lista después de actualizar:', JSON.parse(JSON.stringify(listasPersonalizadas[listaIndex])));

  // Actualizar configuración global
  window.configVisual = {
    ...configVisual,
    listasPersonalizadas: listasPersonalizadas
  };

  console.log('💾 window.configVisual.listasPersonalizadas actualizado:', JSON.parse(JSON.stringify(window.configVisual.listasPersonalizadas)));

  // Guardar en Supabase
  if (typeof supabasePush === 'function') {
    const guardado = await supabasePush();
    if (guardado) {
      console.log('✅ Configuración guardada en Supabase');
      mostrarAlerta(`✅ Lista "${nombre}" actualizada correctamente`, 'success');

      // Cancelar modo edición
      cancelarEdicionListaPersonalizada();

      // Re-renderizar configuración
      renderizarListasPersonalizadas();

      // Regenerar las secciones principales INMEDIATAMENTE
      console.log('🔄 Regenerando secciones principales con nuevo color...');
      if (typeof regenerarSeccionesListasPersonalizadas === 'function') {
        regenerarSeccionesListasPersonalizadas();
      }

      // Renderizar todas las tareas con un pequeño delay
      setTimeout(() => {
        if (typeof renderizar === 'function') {
          renderizar();
        }
        // Asegurar que las listas personalizadas se renderizan con los nuevos colores
        if (typeof renderizarTodasLasListasPersonalizadas === 'function') {
          renderizarTodasLasListasPersonalizadas();
        }
      }, 100);
    } else {
      mostrarAlerta('❌ Error al guardar en Supabase', 'error');
    }
  } else {
    mostrarAlerta('⚠️ No se pudo sincronizar con Supabase', 'warning');
    cancelarEdicionListaPersonalizada();
  }
}

function cancelarEdicionListaPersonalizada() {
  console.log('❌ Cancelando edición de lista');

  // Limpiar variable de edición
  listaEnEdicion = null;

  // Limpiar formulario
  document.getElementById('nueva-lista-personalizada').value = '';
  document.getElementById('emoji-lista-personalizada').value = '🏥';
  document.getElementById('color-lista-personalizada').value = '#667eea';

  // Restaurar botón original
  const botonContainer = document.querySelector('#nueva-lista-personalizada').closest('div[style*="grid-template-columns"]');
  if (botonContainer) {
    const boton = botonContainer.querySelector('button:not(.btn-cancelar-edicion)');
    if (boton) {
      boton.innerHTML = '✓ Añadir Lista';
      boton.setAttribute('onclick', 'agregarListaPersonalizada()');
      boton.style.background = 'rgba(255,255,255,0.9)';
    }

    // Eliminar botón de cancelar
    const btnCancelar = botonContainer.querySelector('.btn-cancelar-edicion');
    if (btnCancelar) {
      btnCancelar.remove();
    }
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

    // Guardar en Supabase
    if (typeof supabasePush === 'function') {
      supabasePush();
    }

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
      `<button onclick="event.stopPropagation();eliminarListaPersonalizada('${lista.id}')" style="background:#ff4757;color:white;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:12px;" title="Eliminar lista">🗑️</button>`;

    const cursorStyle = esListaObligatoria ? 'default' : 'pointer';
    const editFunction = esListaObligatoria ? '' : `onclick="editarListaPersonalizada('${lista.id}')"`;

    html += `
      <div ${editFunction} style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;margin-bottom:8px;background:rgba(255,255,255,0.7);border-radius:6px;border-left:4px solid ${lista.color};cursor:${cursorStyle};transition:all 0.2s ease;" onmouseover="if('${esListaObligatoria}'==='false')this.style.background='rgba(255,255,255,0.9)'" onmouseout="this.style.background='rgba(255,255,255,0.7)'">
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
    supabasePush();
    renderizarListaPersonalizada(listaId);
    mostrarAlerta(`✅ Todas las tareas de "${lista.nombre}" eliminadas`, 'success');
  }
}

// ========== RENDERIZADO RICO DE LISTAS PERSONALIZADAS ==========
function renderizarListaPersonalizada(listaId) {
  const listasPersonalizadas = obtenerListasPersonalizadas();
  const lista = listasPersonalizadas.find(l => l.id === listaId);

  console.log('🎨 Renderizando lista:', listaId);
  console.log('📊 Lista encontrada:', lista ? lista.nombre : 'null');
  console.log('📋 Tareas en lista:', lista?.tareas?.length || 0);

  // Log subtareas para cada tarea
  if (lista && lista.tareas) {
    lista.tareas.forEach((t, idx) => {
      if (t.subtareas && t.subtareas.length > 0) {
        console.log(`  ✓ Tarea ${idx} "${t.texto}": ${t.subtareas.length} subtareas`);
        t.subtareas.forEach((s, sidx) => {
          console.log(`    ${sidx + 1}. ${s.texto}`);
        });
      }
    });
  }

  if (!lista) {
    console.error('❌ Lista no encontrada al renderizar:', listaId);
    return;
  }

  const contenedor = document.getElementById(`lista-personalizada-${listaId}`);
  if (!contenedor) {
    console.error('❌ Contenedor no encontrado:', `lista-personalizada-${listaId}`);
    return;
  }

  const tareas = lista.tareas || [];
  console.log(`📋 Tareas en lista ${lista.nombre}:`, tareas.length);

  try {
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

      // Fecha con indicadores de urgencia (usando función compartida)
      if (tarea.fecha) {
        const fechaMostrar = Array.isArray(tarea.fecha) ? fechaArrayToString(tarea.fecha) : tarea.fecha;
        if (typeof renderizarFechaConUrgencia === 'function') {
          contenido += ` ${renderizarFechaConUrgencia(fechaMostrar, esUrgente)}`;
        } else {
          // Fallback si la función no está disponible
          const colorFecha = (esFechaHoy(fechaString) || esFechaPasada(fechaString)) ? '#ff1744' : '#666';
          contenido += ` <small style="background: ${esUrgente ? '#ffcdd2' : '#ffe5e5'}; color: ${colorFecha}; padding: 2px 6px; border-radius: 3px; font-weight: ${esUrgente ? 'bold' : 'normal'};">📅 ${fechaMostrar}</small>`;
        }
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

      // Botón de Pomodoro
      const btnPomodoroPersonalizada = document.createElement('button');
      btnPomodoroPersonalizada.className = 'btn-pomodoro-tarea';
      btnPomodoroPersonalizada.textContent = '🍅';
      btnPomodoroPersonalizada.title = 'Iniciar Pomodoro para esta tarea';
      btnPomodoroPersonalizada.onclick = (e) => {
        e.stopPropagation();
        iniciarPomodoroConTarea(tarea.texto);
      };
      div.appendChild(btnPomodoroPersonalizada);

      // Botón de Borrar
      const btnBorrar = document.createElement('button');
      btnBorrar.className = 'btn-borrar-tarea';
      btnBorrar.textContent = '🗑️';
      btnBorrar.title = 'Eliminar tarea';
      btnBorrar.onclick = (e) => {
        e.stopPropagation();
        mostrarCuentaRegresiva(() => {
          // Verificar índice actualizado en tiempo real
          const configVisualActual = window.configVisual || {};
          const listasActuales = configVisualActual.listasPersonalizadas || [];
          const listaActual = listasActuales.find(l => l.id === listaId);

          if (!listaActual || !listaActual.tareas || index >= listaActual.tareas.length) {
            // No interferir si ya hay una eliminación en progreso
            if (window.eliminandoTarea) {
              console.log('🔄 Eliminación en progreso, saltando validación de índice');
              return;
            }

            console.warn('⚠️ Índice obsoleto detectado, re-renderizando lista');
            mostrarAlerta('🔄 Actualizando interfaz...', 'info');
            renderizarListasPersonalizadas();
            return;
          }

          ejecutarEliminacionTareaListaPersonalizada(listaId, index);
        });
      };
      div.appendChild(btnBorrar);

      // Agregar alerta de urgencia si es necesario (usando función compartida)
      if (esUrgente && tarea.estado !== 'completada') {
        const esPasada = esFechaPasada(fechaString);
        const esHoy = esFechaHoy(fechaString);
        if (typeof crearAlertaUrgencia === 'function') {
          const alerta = crearAlertaUrgencia(esPasada, esHoy, tarea.estado === 'completada');
          if (alerta) div.appendChild(alerta);
        }
      }

      // Configurar drag & drop (usando función compartida)
      if (typeof configurarDragAndDrop === 'function') {
        configurarDragAndDrop(div, 'lista-personalizada', index, listaId);
      }

      contenedor.appendChild(div);

      // Renderizar Subtareas (IGUAL QUE EN TAREAS CRÍTICAS Y NORMALES)
      if (tarea.subtareas && tarea.subtareas.length > 0) {
        console.log(`  📝 Renderizando ${tarea.subtareas.length} subtareas para "${tarea.texto}"`);
        tarea.subtareas.forEach((subtarea, subIndex) => {
          try {
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

            console.log(`    ✅ Subtarea ${subIndex} "${subtarea.texto}" añadida al DOM`);
          } catch (error) {
            console.error(`    ❌ Error renderizando subtarea ${subIndex}:`, error);
          }
        });
      }
    });

    console.log(`✅ Renderizado completado para lista "${lista.nombre}". Total elementos en DOM: ${contenedor.children.length}`);
  } catch (error) {
    console.error('❌ Error crítico en renderizarListaPersonalizada:', error);
    console.error('Stack trace:', error.stack);
  }
}

// ========== GESTIÓN DE SUBTAREAS EN LISTAS PERSONALIZADAS ==========
function abrirModalSubtareaListaPersonalizada(listaId, tareaIndex) {
  // Eliminar cualquier modal existente para evitar duplicados
  const modalExistente = document.getElementById('modal-subtarea-lp');
  if (modalExistente) {
    console.log('🗑️ Eliminando modal duplicado...');
    modalExistente.remove();
  }

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
  setTimeout(() => {
    const input = document.getElementById('subtarea-lp-texto');
    if (input) {
      input.focus();
      console.log('✅ Focus establecido en input de subtarea');
    } else {
      console.error('❌ No se pudo establecer focus en input');
    }
  }, 100);
}

async function agregarSubtareaListaPersonalizada(listaId, tareaIndex) {
  console.log('📝 INICIANDO agregarSubtareaListaPersonalizada:', { listaId, tareaIndex });

  const inputTexto = document.getElementById('subtarea-lp-texto');
  console.log('🔍 Input encontrado:', inputTexto);
  console.log('🔍 Valor del input:', inputTexto ? inputTexto.value : 'INPUT NO ENCONTRADO');

  const texto = inputTexto ? inputTexto.value.trim() : '';
  console.log('📝 Texto final después de trim:', `"${texto}"`, 'Length:', texto.length);

  if (texto && texto.length > 0) {
    console.log('✅ Texto válido, guardando subtarea...');
    await guardarSubtareaListaPersonalizada(listaId, tareaIndex, texto);
    // Limpiar campo de texto
    if (inputTexto) inputTexto.value = '';
    cerrarModal('modal-subtarea-lp');
  } else {
    console.error('❌ Texto vacío o inválido');
    console.error('   - inputTexto existe:', !!inputTexto);
    console.error('   - inputTexto.value:', inputTexto ? inputTexto.value : 'N/A');
    console.error('   - texto después de trim:', texto);
    alert('Por favor, ingresa una descripción para la subtarea');
  }
}

async function guardarSubtareaListaPersonalizada(listaId, tareaIndex, texto) {
  const configVisual = window.configVisual || {};
  const listas = configVisual.listasPersonalizadas || [];
  const listaIndex = listas.findIndex(l => l.id === listaId);

  console.log('💾 Guardando subtarea:', { listaIndex, totalListas: listas.length });

  if (listaIndex === -1) {
    console.error('❌ Lista no encontrada:', listaId);
    return;
  }

  const tarea = listas[listaIndex].tareas[tareaIndex];
  if (!tarea) {
    console.error('❌ Tarea no encontrada:', tareaIndex);
    return;
  }

  if (!tarea.subtareas) tarea.subtareas = [];

  tarea.subtareas.push({
    texto: texto,
    completada: false,
    estado: 'pendiente',
    fechaCreacion: new Date().toISOString()
  });

  console.log('✅ Subtarea añadida. Total subtareas:', tarea.subtareas.length);
  console.log('📊 Contenido de la tarea actualizada:', JSON.stringify(tarea, null, 2));

  // Actualizar estado global - Método directo sin spread
  if (!window.configVisual) {
    window.configVisual = {};
  }
  window.configVisual.listasPersonalizadas = listas;

  console.log('🔄 window.configVisual actualizado (mutación directa)');
  console.log('📊 Verificando que se guardó:', window.configVisual.listasPersonalizadas[listaIndex].tareas[tareaIndex].subtareas);

  // Pequeño delay antes de renderizar para asegurar que el estado se actualizó
  await new Promise(resolve => setTimeout(resolve, 10));

  renderizarListaPersonalizada(listaId);
  await guardarJSON(true); // Guardado inmediato
  console.log('✅ Guardado completado');
}

async function cambiarEstadoSubtareaListaPersonalizada(listaId, tareaIndex, subIndex) {
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
    await guardarJSON(true);

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
  await guardarJSON(true);
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

async function guardarEdicionSubtareaListaPersonalizada(listaId, tareaIndex, subIndex) {
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
  await guardarJSON(true);
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

async function ejecutarEliminacionSubtareaListaPersonalizada(listaId, tareaIndex, subIndex) {
  const configVisual = window.configVisual || {};
  const listas = configVisual.listasPersonalizadas || [];
  const listaIndex = listas.findIndex(l => l.id === listaId);

  if (listaIndex === -1) return;

  listas[listaIndex].tareas[tareaIndex].subtareas.splice(subIndex, 1);

  // Actualizar estado global
  window.configVisual = { ...configVisual, listasPersonalizadas: listas };

  renderizarListaPersonalizada(listaId);
  await guardarJSON(true);
  mostrarAlerta('🗑️ Subtarea eliminada', 'info');
}

// FUNCIÓN ELIMINADA: cargarConfigVisual() duplicada estaba aquí
// La función correcta está en la línea 332 con aplicación de tema y título

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

  // Guardar en Supabase
  supabasePush();

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
  supabasePush();
}

// Variable para evitar interferencias durante eliminación
window.eliminandoTarea = false;

function ejecutarEliminacionTareaListaPersonalizada(listaId, tareaIndex) {
  console.log('🗑️ ELIMINANDO TAREA DE LISTA PERSONALIZADA:', { listaId, tareaIndex });

  // Marcar que estamos eliminando para evitar interferencias
  window.eliminandoTarea = true;

  const configVisual = window.configVisual || {};
  const listasPersonalizadas = configVisual.listasPersonalizadas || [];
  const listaIndex = listasPersonalizadas.findIndex(l => l.id === listaId);

  if (listaIndex === -1) {
    console.error('❌ Lista no encontrada:', listaId);
    mostrarAlerta('❌ Error: Lista no encontrada', 'error');
    return;
  }

  const lista = listasPersonalizadas[listaIndex];

  // Logging adicional para diagnóstico
  console.log('📋 Estado de la lista:', {
    nombre: lista.nombre,
    totalTareas: lista.tareas?.length || 0,
    tareaIndex: tareaIndex,
    tareas: lista.tareas?.map((t, i) => `${i}: ${t.texto}`) || []
  });

  if (!lista.tareas || tareaIndex < 0 || tareaIndex >= lista.tareas.length) {
    console.error('❌ Índice de tarea inválido:', {
      tareaIndex,
      longitudLista: lista.tareas?.length || 0,
      tareasDisponibles: lista.tareas?.map((t, i) => `${i}: ${t.texto}`) || 'Sin tareas'
    });
    mostrarAlerta('❌ Error: Tarea no encontrada. La interfaz se actualizará automáticamente.', 'warning');

    // Forzar re-renderizado para sincronizar interfaz con datos
    setTimeout(() => {
      renderizarListasPersonalizadas();
    }, 100);
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

  // Guardar en Supabase PRIMERO, luego renderizar
  console.log('🔵 ELIMINACIÓN: Iniciando guardado en Supabase...');

  if (typeof window.supabasePush === 'function') {
    window.supabasePush().then(() => {
      console.log('🔵 ELIMINACIÓN: ✅ Guardado completado, renderizando...');

      // Solo renderizar después de guardar exitosamente
      renderizarListaPersonalizada(listaId);

      registrarAccion('Eliminar tarea (lista personalizada)', tareaEliminada.texto);
      mostrarPopupCelebracion();
      mostrarAlerta('✅ Tarea eliminada correctamente', 'success');

      // Limpiar flag de eliminación
      window.eliminandoTarea = false;

    }).catch((error) => {
      console.error('🔵 ELIMINACIÓN: ❌ Error guardando:', error);
      mostrarAlerta('❌ Error eliminando tarea', 'error');

      // Limpiar flag de eliminación incluso en caso de error
      eliminandoTarea = false;
    });
  } else {
    // Fallback si no hay Supabase
    renderizarListaPersonalizada(listaId);
    registrarAccion('Eliminar tarea (lista personalizada)', tareaEliminada.texto);
    mostrarPopupCelebracion();
    mostrarAlerta('✅ Tarea eliminada correctamente', 'success');

    // Limpiar flag de eliminación
    eliminandoTarea = false;
  }
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

  // Guardar en Supabase
  supabasePush();

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
    supabasePush();

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

  // Guardar en Supabase
  supabasePush();

  // Re-renderizar
  renderizarListaPersonalizada(listaId);
}



window.agregarListaPersonalizada = agregarListaPersonalizada;
window.editarListaPersonalizada = editarListaPersonalizada;
window.guardarEdicionListaPersonalizada = guardarEdicionListaPersonalizada;
window.cancelarEdicionListaPersonalizada = cancelarEdicionListaPersonalizada;
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

// ========== MODAL DE LISTAS PERSONALIZADAS (NUEVO) ==========

function abrirModalListaPersonalizada() {
  abrirModal('modal-listas-personalizadas');
  renderizarListasEnModalPersonalizado();
}

function insertarEmojiEnInput(inputId, emoji) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = emoji;
  }
}

function renderizarListasEnModalPersonalizado() {
  const contenedor = document.getElementById('listas-personalizadas-modal-lista');
  if (!contenedor) return;

  const configVisual = window.configVisual || {};
  const listas = configVisual.listasPersonalizadas || [];

  if (listas.length === 0) {
    contenedor.innerHTML = '<p style="color:#999;text-align:center;font-style:italic;">No hay listas personalizadas aún.</p>';
    return;
  }

  let html = '';
  listas.forEach(lista => {
    html += `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;margin-bottom:5px;background:#fff;border:1px solid #eee;border-radius:4px;border-left:4px solid ${lista.color};">
        <div>
          <span style="font-size:18px;margin-right:5px;">${lista.emoji}</span>
          <strong>${lista.nombre}</strong>
        </div>
        <button onclick="eliminarListaDesdeModal('${lista.id}')" style="color:red;border:none;background:none;cursor:pointer;">🗑️</button>
      </div>
    `;
  });

  contenedor.innerHTML = html;
}

function agregarListaPersonalizadaDesdeModal() {
  const nombreInput = document.getElementById('nueva-lista-nombre');
  const emojiInput = document.getElementById('nueva-lista-emoji');
  const colorInput = document.getElementById('nueva-lista-color');

  const nombre = nombreInput.value.trim();
  const emoji = emojiInput.value.trim() || '📋';
  const color = colorInput.value;

  if (!nombre) {
    alert('Por favor, escribe un nombre para la lista.');
    return;
  }

  if (!window.configVisual) window.configVisual = {};
  if (!window.configVisual.listasPersonalizadas) window.configVisual.listasPersonalizadas = [];

  // Crear ID único
  const id = 'lista-' + Date.now();

  const nuevaLista = {
    id: id,
    nombre: nombre,
    emoji: emoji,
    color: color,
    tipo: 'personalizada',
    tareas: []
  };

  window.configVisual.listasPersonalizadas.push(nuevaLista);

  // Limpiar formulario
  nombreInput.value = '';
  emojiInput.value = '';

  // Actualizar vista previa
  renderizarListasEnModalPersonalizado();

  // Feedback visual
  const btn = document.querySelector('#modal-listas-personalizadas .btn-primario');
  if (btn) {
    const originalText = btn.textContent;
    btn.textContent = '✅ Añadido';
    setTimeout(() => btn.textContent = originalText, 1000);
  }
}

function eliminarListaDesdeModal(id) {
  if (!confirm('¿Seguro que quieres eliminar esta lista?')) return;

  if (window.configVisual && window.configVisual.listasPersonalizadas) {
    window.configVisual.listasPersonalizadas = window.configVisual.listasPersonalizadas.filter(l => l.id !== id);
    renderizarListasEnModalPersonalizado();
  }
}

async function guardarYSalirListasPersonalizadas() {
  console.log('💾 Guardando listas personalizadas...');

  // ⚠️ IMPORTANTE: No usar guardarConfigVisualPanel() si no estamos seguros de que el modal de configuración existe
  // porque podría resetear otros valores a default.

  // 1. Asegurar que window.configVisual tiene los datos actualizados
  if (!window.configVisual) window.configVisual = {};
  // (Las listas ya se agregaron a window.configVisual.listasPersonalizadas en la función agregar...)

  // 2. Guardar directamente en Supabase
  if (typeof window.supabasePush === 'function') {
    await window.supabasePush();
    mostrarAlerta('✅ Listas guardadas correctamente', 'success');
  } else {
    console.warn('⚠️ supabasePush no disponible, los cambios solo son locales');
  }

  // 3. Cerrar modal
  cerrarModal('modal-listas-personalizadas');

  // 4. Renderizar cambios
  if (typeof renderizarListasPersonalizadas === 'function') renderizarListasPersonalizadas();
  if (typeof renderizar === 'function') renderizar();

  // 5. Recargar para asegurar que todo se aplique limpios (opcional, pero seguro)
  // location.reload(); 
}
