// ========== ARCHIVO DE COMPATIBILIDAD ==========
// Este archivo asegura que todas las funciones estén disponibles globalmente
// para mantener la compatibilidad con el HTML que usa onclick y otras referencias directas

// ========== FUNCIONES PRINCIPALES YA EXPORTADAS ==========
// Las funciones principales ya están exportadas en sus respectivos archivos:
// - app.js: funciones básicas y estado global
// - tareas.js: gestión de tareas y filtros
// - calendario.js: gestión del calendario y citas
// - sincronizacion.js: GitHub y configuración
// - rendimiento.js: optimizaciones y drag & drop

// ========== FUNCIONES ADICIONALES NECESARIAS ==========

// Función para inicializar todo cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Iniciar monitor de rendimiento
  if (typeof performanceMonitor !== 'undefined') {
    performanceMonitor.start();
  }
  
  // Configurar eventos de cierre de modales
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        cerrarModal(modal.id);
      }
    });
  });
  
  // Limpiar recursos al cerrar
  window.addEventListener('beforeunload', () => {
    if (typeof performanceMonitor !== 'undefined') {
      performanceMonitor.stop();
    }
  });
});

// ========== FUNCIONES DE UTILIDAD ADICIONALES ==========

// Función para abrir modales (si no está definida)
if (typeof openModal === 'undefined') {
  window.openModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.style.display = 'flex';
    }
  };
}

// Función para cerrar modales (si no está definida)
if (typeof closeModal === 'undefined') {
  window.closeModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.style.display = 'none';
    }
  };
}

// ========== VERIFICACIÓN DE FUNCIONES CRÍTICAS ==========
// Verificar que las funciones críticas estén disponibles
const funcionesCriticas = [
  'renderizar',
  'nuevaTareaCritica',
  'agregarTareaCritica',
  'nuevaTarea',
  'agregarTarea',
  'abrirModal',
  'cerrarModal',
  'confirmarCita',
  'guardarMigracion',
  'aplicarFiltros',
  'toggleFiltros',
  'limpiarFiltros',
  'toggleLargoPlazo',
  'cambiarFiltroCitas',
  'abrirModalNuevaCita',
  'guardarNuevaCita',
  'abrirCalendario',
  'abrirCalendarioTareas',
  'deleteCita',
  'toggleConfigFloating',
  'switchTab',
  'guardarConfigExtendsClass',
  'guardarConfigVisualPanel',
  'guardarConfigOpciones',
  'probarConexionExtendsClass',
  'verHistorial',
  'hacerCopia',
  'abrirHistoricoTareas',
  'abrirGraficos',
  'guardarJSON',
  'extendsClassPull',
  'cambiarFraseMotivacional',
  'abrirModalCitaPeriodica',
  'crearCitaPeriodica',
  'abrirModalCitasRelativas',
  'actualizarPreviewFecha',
  'agregarCitaRelativa',
  'eliminarCitaRelativa',
  'guardarCitasRelativas',
  'restaurarBackup',
  'crearBackupManual'
];

// Verificar funciones al cargar
setTimeout(() => {
  const funcionesFaltantes = funcionesCriticas.filter(func => typeof window[func] === 'undefined');
  
  if (funcionesFaltantes.length > 0) {
    console.warn('⚠️ Funciones faltantes:', funcionesFaltantes);
    
    // Crear funciones stub para evitar errores
    funcionesFaltantes.forEach(func => {
      window[func] = function() {
        console.error(`❌ Función ${func} no está implementada`);
        mostrarAlerta(`Error: Función ${func} no disponible`, 'error');
      };
    });
  }
}, 1000);

// ========== FUNCIONES DE RESPALDO ==========
// Funciones de respaldo en caso de que no se carguen los módulos principales

if (typeof mostrarAlerta === 'undefined') {
  window.mostrarAlerta = function(mensaje, tipo) {
    alert(mensaje);
  };
}

if (typeof escapeHtml === 'undefined') {
  window.escapeHtml = function(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
  };
}

if (typeof esFechaHoy === 'undefined') {
  window.esFechaHoy = function(fecha) {
    if (!fecha) return false;
    const hoy = new Date().toISOString().slice(0, 10);
    return fecha === hoy;
  };
}

if (typeof esFechaPasada === 'undefined') {
  window.esFechaPasada = function(fecha) {
    if (!fecha) return false;
    const hoy = new Date().toISOString().slice(0, 10);
    return fecha < hoy;
  };
}

// ========== INICIALIZACIÓN DE RESPALDO ==========
// Si el estado global no está disponible, crear uno básico
if (typeof appState === 'undefined') {
  window.appState = {
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
  
  console.warn('⚠️ Estado global no encontrado, usando estado de respaldo');
}

// ========== FUNCIONES DE RENDERIZADO DE RESPALDO ==========
if (typeof renderizar === 'undefined') {
  window.renderizar = function() {
    // Renderizar tareas críticas básico
    const listaCriticas = document.getElementById('lista-criticas');
    if (listaCriticas && appState.agenda.tareas_criticas) {
      listaCriticas.innerHTML = appState.agenda.tareas_criticas.length === 0 ? 
        '<div style="color:#777;padding:10px;text-align:center;">No hay tareas críticas</div>' :
        appState.agenda.tareas_criticas.map(t => `<div class="tarea-item"><span class="tarea-simbolo">●</span><div class="tarea-texto">${escapeHtml(t.titulo)}</div></div>`).join('');
    }
    
    // Renderizar tareas normales básico
    const listaMetodo = document.getElementById('lista-metodo');
    if (listaMetodo && appState.agenda.tareas) {
      listaMetodo.innerHTML = appState.agenda.tareas.length === 0 ? 
        '<div style="color:#777;padding:10px;text-align:center;">No hay tareas</div>' :
        appState.agenda.tareas.map(t => `<div class="tarea-item"><span class="tarea-simbolo">●</span><div class="tarea-texto">${escapeHtml(t.texto)}</div></div>`).join('');
    }
    
    // Renderizar notas
    const notasTexto = document.getElementById('notas-texto');
    if (notasTexto && appState.agenda.notas) {
      notasTexto.value = Array.isArray(appState.agenda.notas) ? appState.agenda.notas.join('\n') : appState.agenda.notas;
    }
  };
}

// ========== EXPORT PARA DEBUGGING ==========
window.compatibilityCheck = {
  verificarFunciones: () => {
    const funcionesFaltantes = funcionesCriticas.filter(func => typeof window[func] === 'undefined');
    return funcionesFaltantes.length === 0;
  },

  listarFunciones: () => {
    funcionesCriticas.forEach(func => {
      console.log(`${func}: ${typeof window[func]}`);
    });
  }
};