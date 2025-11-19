// ========== ESTADO GLOBAL ==========
const appState = {
  agenda: {
    fecha: new Date().toISOString().slice(0, 10),
    dia_semana: '',
    tareas_criticas: [],
    tareas: [],
    notas: '',
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
      prioridad: ''
    },
    tareas: {
      estado: '',
      fecha: '',
      prioridad: ''
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
  
  // Listener optimizado para cambios en notas
  const notasEl = document.getElementById('notas-texto');
  if (notasEl) {
    const optimizedHandler = debounce(() => {
      autoResizeTextarea(notasEl);
      autoCapitalize(notasEl);
      scheduleAutoSave();
    }, 300);
    
    notasEl.addEventListener('input', optimizedHandler);
    // Ajustar altura inicial
    autoResizeTextarea(notasEl);
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