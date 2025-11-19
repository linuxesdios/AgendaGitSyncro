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
    githubAutoSync: false,
    githubAutoTimer: null,
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

  // Cargar automáticamente desde GitHub al inicio
  (async () => {
    try {
      const { repo, path, branch, token } = getSyncConfig();
      if (!repo || !path || !token) {
        console.log('GitHub no configurado');
        return;
      }
      
      // Validar formato del repo
      if (!repo.includes('/')) {
        console.log('Formato de repo inválido');
        return;
      }

      console.log('Cargando desde GitHub:', repo, path);
      
      const [repoOwner, repoName] = repo.split('/');
      const url = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}&_t=${Date.now()}&no-cache=1`;
      const r = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        cache: 'no-store'
      });
      
      if (!r.ok) {
        throw new Error(`Error GitHub (${r.status}): ${await r.text()}`);
      }

      const response = await r.json();
      console.log('Respuesta de GitHub:', response);
      console.log('📥 DATOS CARGADOS DE GITHUB:', {
        sha_github: response.sha,
        size_github: response.size,
        sha_esperado: window.currentSHA
      });

      // Verificar si tenemos el SHA más reciente
      if (window.currentSHA && response.sha !== window.currentSHA) {
        console.log('⚠️ SHA no coincide - esperando 2 segundos para propagación CDN...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Intentar una vez más
        console.log('🔄 Reintentando carga después del delay...');
        const r2 = await fetch(url.replace(/&_t=\d+/, `&_t=${Date.now()}`), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          cache: 'no-store'
        });

        if (r2.ok) {
          const response2 = await r2.json();
          console.log('📥 SEGUNDO INTENTO - SHA:', response2.sha);
          if (response2.sha === window.currentSHA) {
            console.log('✅ SHA ahora coincide - usando datos frescos');
            // Usar response2 en lugar de response
            Object.assign(response, response2);
          }
        }
      }
      
      // Para archivos grandes, usar la URL de descarga directa
      let text;
      if (response.download_url) {
        // Para download_url (CDN de GitHub), solo usar cache: 'no-store' sin headers adicionales
        const downloadR = await fetch(response.download_url + `?_t=${Date.now()}`, {
          cache: 'no-store'
        });
        if (!downloadR.ok) throw new Error('Error al descargar archivo');
        text = await downloadR.text();
      } else if (response.content && response.encoding === 'base64') {
        // Decodificar correctamente UTF-8 desde base64
        const base64Content = response.content.replace(/\n/g, '');
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        text = new TextDecoder('utf-8').decode(bytes);
      } else {
        throw new Error('No se pudo obtener el contenido del archivo');
      }
      
      console.log('Contenido decodificado:', text);
      
      let data;
      
      // Detectar si es XML o JSON
      if (text.trim().startsWith('<?xml') || text.trim().startsWith('<agenda')) {
        // Es XML, convertir a JSON
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        data = convertXMLtoJSON(xmlDoc);
        console.log('XML convertido a JSON:', data);
        console.log('📥 CONTENIDO PARSEADO DE GITHUB:', {
          total_tareas_cargadas: data.tareas ? data.tareas.length : 0,
          total_criticas_cargadas: data.tareas_criticas ? data.tareas_criticas.length : 0,
          ultimas_3_tareas_cargadas: data.tareas ? data.tareas.slice(-3).map(t => ({id: t.id, texto: t.texto})) : []
        });
      } else {
        // Es JSON
        data = JSON.parse(text);
      }
      
      console.log('Datos parseados:', data);
      procesarJSON(data);
      mostrarAlerta('✅ Agenda cargada desde GitHub', 'success');
      
      // NO activar auto-sync por defecto para evitar conflictos
      appState.sync.githubAutoSync = false;
      
      // Evitar guardado automático inmediato después de cargar
      if (appState.sync.autoSaveTimer) {
        clearTimeout(appState.sync.autoSaveTimer);
        appState.sync.autoSaveTimer = null;
      }
    } catch (err) {
      console.error('Error al cargar desde GitHub:', err);
      mostrarAlerta('⚠️ No se pudo cargar desde GitHub', 'info');
    }
  })();
  
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
  
  // Iniciar auto-guardado optimizado cada minuto (solo después de 2 minutos de inicialización)
  setTimeout(() => {
    setInterval(() => {
      guardarJSON(true);
    }, 60000);
  }, 120000);
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
  // No auto-guardar durante los primeros 30 segundos de inicialización
  if (Date.now() - window.appStartTime < 30000) {
    console.log('Auto-guardado deshabilitado durante inicialización');
    return;
  }

  // No auto-guardar si ya se está guardando (prevenir race conditions)
  if (appState.sync.isSaving) {
    console.log('🚫 Auto-save cancelado - guardado en progreso');
    return;
  }

  if (appState.sync.autoSaveTimer) clearTimeout(appState.sync.autoSaveTimer);
  appState.sync.autoSaveTimer = setTimeout(() => {
    console.log('⏰ Ejecutando auto-save programado');
    guardarJSON(true);
  }, 3000); // Incrementado a 3 segundos para más seguridad
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