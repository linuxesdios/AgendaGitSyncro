// ==================== BOTTOM NAVIGATION (SUPER RÁPIDO) ====================

// Estado simple
const navState = {
  currentTab: 'criticas',
  counts: { criticas: 0, citas: 0, listas: 0 }
};

// Inicialización instantánea
document.addEventListener('DOMContentLoaded', () => {
  initBottomNav();

  // Esperar a que appState esté disponible
  const checkAppState = setInterval(() => {
    if (window.appState && window.configVisual) {
      clearInterval(checkAppState);
      renderizarContenido();
    }
  }, 100);

  // Timeout de seguridad
  setTimeout(() => {
    clearInterval(checkAppState);
    renderizarContenido();
  }, 3000);
});

// Configurar navegación
function initBottomNav() {
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      switchTab(tab);
    });
  });
}

// Cambiar de tab (instantáneo)
function switchTab(tabName) {
  // Actualizar estado
  navState.currentTab = tabName;

  // Actualizar navegación
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tabName);
  });

  // Actualizar contenido
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });

  // Actualizar header
  updateHeader(tabName);

  // Renderizar contenido solo del tab actual
  renderizarTab(tabName);
}

// Actualizar header
function updateHeader(tabName) {
  const icons = { criticas: '🚨', citas: '📅', listas: '📋', mas: '⚡' };
  const titles = { criticas: 'Tareas Críticas', citas: 'Citas', listas: 'Listas', mas: 'Más' };

  document.getElementById('current-tab-icon').textContent = icons[tabName];
  document.getElementById('current-tab-title').textContent = titles[tabName];

  const count = navState.counts[tabName] || 0;
  const badge = document.getElementById('current-tab-badge');
  if (count > 0 && tabName !== 'mas') {
    badge.textContent = count;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

// Renderizar todo el contenido inicial
function renderizarContenido() {
  renderizarTab('criticas'); // Solo el tab actual
}

// Renderizar tab específico
function renderizarTab(tabName) {
  switch(tabName) {
    case 'criticas':
      renderizarCriticas();
      break;
    case 'citas':
      renderizarCitas();
      break;
    case 'listas':
      renderizarListasPersonalizadas();
      break;
  }
}

// Renderizar tareas críticas
function renderizarCriticas() {
  const container = document.getElementById('lista-criticas-movil');
  if (!container) return;

  // Obtener tareas del appState global
  const tareasCriticas = window.appState?.tareas?.criticas || [];
  navState.counts.criticas = tareasCriticas.filter(t => !t.completada).length;

  // Filtrar solo las no completadas
  const tareasActivas = tareasCriticas.filter(t => !t.completada);

  if (tareasActivas.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✨</div>
        <div class="empty-text">
          No hay tareas críticas.<br>
          <small>¡Toca el botón + para agregar una!</small>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = tareasActivas.map((tarea, index) => crearTarjetaTarea(tarea, index)).join('');
  updateHeader(navState.currentTab);
}

// Renderizar citas
function renderizarCitas() {
  const container = document.getElementById('lista-citas-movil');
  if (!container) return;

  const citas = window.appState?.agenda?.citas || [];
  navState.counts.citas = citas.length;

  if (citas.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <div class="empty-text">
          No hay citas programadas.<br>
          <small>Toca el botón + para crear una</small>
        </div>
      </div>
    `;
    return;
  }

  // Procesar y ordenar citas
  const citasConFecha = citas.map(cita => {
    let fechaObj = null;
    if (cita.fecha) {
      if (Array.isArray(cita.fecha) && cita.fecha.length === 3) {
        const [año, mes, día] = cita.fecha;
        fechaObj = new Date(año, mes - 1, día);
      } else if (typeof cita.fecha === 'string') {
        fechaObj = new Date(cita.fecha);
      }
    }
    return { ...cita, fechaObj };
  }).filter(c => c.fechaObj && !isNaN(c.fechaObj)).sort((a, b) => a.fechaObj - b.fechaObj);

  container.innerHTML = citasConFecha.map(cita => crearTarjetaCita(cita)).join('');
  updateHeader(navState.currentTab);
}

// Renderizar listas personalizadas
function renderizarListasPersonalizadas() {
  const container = document.getElementById('listas-personalizadas-movil');
  if (!container) return;

  const configVisual = window.configVisual || {};
  const listas = configVisual.listasPersonalizadas || [];

  if (listas.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-text">
          No hay listas personalizadas.<br>
          <small>Crea una desde Configuración</small>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = listas.map(lista => {
    const count = lista.tareas?.length || 0;
    return `
      <div class="task-card">
        <div class="task-header">
          <span class="task-icon">${lista.emoji || '📝'}</span>
          <div class="task-title">${lista.nombre}</div>
          <span class="tab-badge">${count}</span>
        </div>
        ${lista.descripcion ? `<div class="task-meta"><span>${lista.descripcion}</span></div>` : ''}
      </div>
    `;
  }).join('');
}

// Crear tarjeta de tarea
function crearTarjetaTarea(tarea, index) {
  const urgenciaIcono = tarea.urgencia === 3 ? '🔴' : tarea.urgencia === 2 ? '🟡' : '🟢';
  const fechaTexto = tarea.fecha ? formatearFecha(tarea.fecha) : '';

  // Encontrar el índice real en appState.tareas.criticas
  const indiceReal = window.appState?.tareas?.criticas?.findIndex(t =>
    t.titulo === tarea.titulo && t.fecha === tarea.fecha
  ) ?? index;

  return `
    <div class="task-card" onclick="editarTareaCritica(${indiceReal})">
      <div class="task-header">
        <span class="task-icon">${urgenciaIcono}</span>
        <div class="task-title">${tarea.titulo || 'Sin título'}</div>
      </div>
      ${fechaTexto || tarea.persona || tarea.etiqueta ? `
        <div class="task-meta">
          ${fechaTexto ? `<span>📅 ${fechaTexto}</span>` : ''}
          ${tarea.persona ? `<span class="task-tag">👤 ${tarea.persona}</span>` : ''}
          ${tarea.etiqueta ? `<span class="task-tag">${tarea.etiqueta}</span>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

// Crear tarjeta de cita
function crearTarjetaCita(cita) {
  const fechaTexto = formatearFechaCompleta(cita.fechaObj);
  const horaTexto = cita.hora || '';
  const nombre = cita.nombre || cita.titulo || 'Sin título';

  return `
    <div class="task-card">
      <div class="task-header">
        <span class="task-icon">📅</span>
        <div class="task-title">${nombre}</div>
      </div>
      <div class="task-meta">
        <span>📅 ${fechaTexto}</span>
        ${horaTexto ? `<span>⏰ ${horaTexto}</span>` : ''}
        ${cita.lugar ? `<span>📍 ${cita.lugar}</span>` : ''}
      </div>
    </div>
  `;
}

// Formatear fecha simple
function formatearFecha(fecha) {
  if (!fecha) return '';

  let fechaObj;
  if (Array.isArray(fecha) && fecha.length === 3) {
    const [año, mes, día] = fecha;
    fechaObj = new Date(año, mes - 1, día);
  } else if (typeof fecha === 'string') {
    fechaObj = new Date(fecha);
  } else {
    return '';
  }

  if (isNaN(fechaObj)) return '';

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fechaObj.setHours(0, 0, 0, 0);

  const diff = Math.floor((fechaObj - hoy) / (1000 * 60 * 60 * 24));

  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  if (diff > 0 && diff <= 7) return `En ${diff} días`;
  if (diff < 0 && diff >= -7) return `Hace ${Math.abs(diff)} días`;

  return fechaObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// Formatear fecha completa
function formatearFechaCompleta(fecha) {
  if (!fecha || isNaN(fecha)) return '';
  return fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ==================== SINCRONIZACIÓN Y ACTUALIZACIÓN ====================

// Actualizar todo el bottom nav (llamar cuando cambien datos)
window.actualizarBottomNav = function() {
  if (!document.getElementById('mobile-app')) return;
  renderizarTab(navState.currentTab);
};

// Actualizar solo contadores sin re-renderizar
window.actualizarContadoresBottomNav = function() {
  if (!window.appState) return;

  navState.counts.criticas = (window.appState.tareas?.criticas || []).filter(t => !t.completada).length;
  navState.counts.citas = (window.appState.agenda?.citas || []).length;

  const configVisual = window.configVisual || {};
  const listas = configVisual.listasPersonalizadas || [];
  let totalListas = 0;
  listas.forEach(lista => {
    totalListas += (lista.tareas || []).length;
  });
  navState.counts.listas = totalListas;

  updateHeader(navState.currentTab);
};

// Observar cambios en appState (polling ligero cada 2 segundos)
setInterval(() => {
  if (document.getElementById('mobile-app') && window.appState) {
    actualizarContadoresBottomNav();
  }
}, 2000);

// Hook para cuando se guarden datos
const guardarDatosOriginal = window.guardarDatos;
if (typeof guardarDatosOriginal === 'function') {
  window.guardarDatos = function() {
    guardarDatosOriginal.apply(this, arguments);
    setTimeout(() => {
      if (window.actualizarBottomNav) {
        window.actualizarBottomNav();
      }
    }, 100);
  };
}

// Hook para cuando se carguen datos
const cargarDatosOriginal = window.cargarDatos;
if (typeof cargarDatosOriginal === 'function') {
  window.cargarDatos = function() {
    const result = cargarDatosOriginal.apply(this, arguments);
    setTimeout(() => {
      if (window.actualizarBottomNav) {
        window.actualizarBottomNav();
      }
    }, 100);
    return result;
  };
}

// Escuchar eventos de cierre de modales
document.addEventListener('click', (e) => {
  const modal = e.target.closest('.modal');
  if (modal && e.target.classList.contains('modal')) {
    // Modal cerrado, actualizar
    setTimeout(() => {
      if (window.actualizarBottomNav) {
        window.actualizarBottomNav();
      }
    }, 300);
  }
});

// Escuchar cuando se agreguen o eliminen elementos del DOM
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList' && mutation.target.classList?.contains('modal')) {
      // Se modificó un modal, actualizar después
      setTimeout(() => {
        if (window.actualizarBottomNav && document.getElementById('mobile-app')) {
          actualizarContadoresBottomNav();
        }
      }, 500);
    }
  });
});

// Observar modales si existen
setTimeout(() => {
  const modales = document.querySelectorAll('.modal');
  modales.forEach(modal => {
    observer.observe(modal, { childList: true, subtree: true });
  });
}, 1000);
