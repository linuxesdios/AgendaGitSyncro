// ==================== BOTTOM NAVIGATION (SUPER RÁPIDO) ====================

// Estado simple
const navState = {
  currentTab: 'criticas',
  counts: { criticas: 0, citas: 0, listas: 0 }
};

// Bandera para indicar que estamos en modo móvil
window.MODO_BOTTOM_NAV = true;

// Inicialización instantánea
document.addEventListener('DOMContentLoaded', () => {
  console.log('📱 Bottom Navigation iniciando...');
  initBottomNav();

  // Esperar a que appState esté disponible y datos cargados
  const checkAppState = setInterval(() => {
    if (window.appState && window.configVisual) {
      console.log('✅ AppState y configVisual disponibles');
      console.log('📊 Tareas críticas:', window.appState.agenda?.tareas_criticas?.length || 0);
      console.log('📅 Citas:', window.appState.agenda?.citas?.length || 0);
      clearInterval(checkAppState);

      // Dar tiempo a que Supabase termine de cargar
      setTimeout(() => {
        renderizarContenido();
        console.log('✅ Bottom Navigation renderizado');
      }, 500);
    }
  }, 100);

  // Timeout de seguridad (más tiempo para Supabase)
  setTimeout(() => {
    clearInterval(checkAppState);
    console.log('⏰ Timeout - Renderizando con datos actuales');
    renderizarContenido();
  }, 5000);
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
  console.log('🔄 Renderizando contenido inicial...');
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

  const tareasCriticas = window.appState?.agenda?.tareas_criticas || [];
  const tareasActivas = tareasCriticas.filter(t => !t.completada);
  navState.counts.criticas = tareasActivas.length;

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

  const listas = window.appState?.agenda?.listasPersonalizadas || [];

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

  let html = '';
  
  listas.forEach((lista, listaIndex) => {
    const tareas = lista.tareas || [];
    const tareasActivas = tareas.filter(t => !t.completada);
    
    html += `
      <div class="tarea-carrusel" style="background: linear-gradient(135deg, ${lista.color || '#667eea'}, ${lista.color || '#764ba2'});">
        <div class="tarea-layout">
          <div class="tarea-contenido">
            <div class="tarea-header">
              <span class="tarea-urgencia">${lista.emoji || '📝'}</span>
              <span class="tarea-titulo" style="color: white;">${lista.nombre}</span>
            </div>
            <div class="tarea-meta-grande">
              <div class="meta-fecha" style="color: rgba(255,255,255,0.9);">📊 ${tareasActivas.length} tareas activas</div>
              ${lista.descripcion ? `<div class="meta-persona" style="color: rgba(255,255,255,0.8);">${lista.descripcion}</div>` : ''}
            </div>
          </div>
          <div class="tarea-botones" onclick="event.stopPropagation();" style="flex-direction: row; gap: 8px;">
            <button onclick="abrirListaPersonalizada('${lista.id || listaIndex}')" class="btn-subtarea" title="Ver lista" style="background: rgba(255,255,255,0.9); color: ${lista.color || '#667eea'}; width: auto; padding: 8px 12px;">📋 Ver</button>
          </div>
        </div>
      </div>
    `;
    
    tareasActivas.forEach((tarea, tareaIndex) => {
      const esHoy = tarea.fecha && esFechaHoy(tarea.fecha);
      const claseHoy = esHoy ? 'style="background: #fff3cd; border-left: 4px solid #ffc107;"' : '';
      
      html += `
        <div class="tarea-carrusel" ${claseHoy} style="margin-left: 20px; border-left: 3px solid ${lista.color || '#667eea'};">
          <div class="tarea-layout">
            <div class="tarea-contenido">
              <div class="tarea-header">
                <span class="tarea-urgencia">${esHoy ? '📅' : '📝'}</span>
                <span class="tarea-titulo">${tarea.texto || 'Sin título'}</span>
              </div>
              <div class="tarea-meta-grande">
                <div class="meta-fecha">📅 ${tarea.fecha || 'Sin fecha'}</div>
                ${tarea.persona ? `<div class="meta-persona">👤 ${tarea.persona}</div>` : ''}
              </div>
            </div>
            <div class="tarea-botones" onclick="event.stopPropagation();">
              <button onclick="eliminarTareaPersonalizada('${lista.id}', ${tareaIndex})" class="btn-borrar-tarea" title="Eliminar">🗑️</button>
              <button onclick="completarTareaPersonalizada('${lista.id}', ${tareaIndex})" class="btn-pomodoro-tarea" title="Completar">✅</button>
            </div>
          </div>
        </div>
      `;
    });
  });
  
  container.innerHTML = html;
}

// Crear tarjeta de tarea completa
function crearTarjetaTarea(tarea, index) {
  const fechaTexto = tarea.fecha_fin ? formatearFecha(tarea.fecha_fin) : 'Sin fecha';
  const esUrgente = esFechaHoy(tarea.fecha_fin) || esFechaPasada(tarea.fecha_fin);
  const claseUrgente = esUrgente ? 'style="background: #ffebee; border-left: 4px solid #f44336;"' : '';

  return `
    <div class="tarea-carrusel" ${claseUrgente}>
      <div class="tarea-layout">
        <div class="tarea-contenido">
          <div class="tarea-header">
            <span class="tarea-urgencia">🚨</span>
            <span class="tarea-titulo">${tarea.titulo || 'Sin título'}</span>
          </div>
          <div class="tarea-meta-grande">
            <div class="meta-fecha">📅 ${fechaTexto}</div>
            ${tarea.persona ? `<div class="meta-persona">👤 ${tarea.persona}</div>` : ''}
            ${tarea.etiqueta ? `<div class="meta-etiqueta">#${tarea.etiqueta}</div>` : ''}
          </div>
        </div>
        <div class="tarea-botones" onclick="event.stopPropagation();">
          <button onclick="editarTareaCritica(${index})" class="btn-borrar-tarea" title="Editar">✏️</button>
          <button onclick="eliminarTareaCritica(${index})" class="btn-pomodoro-tarea" title="Eliminar">🗑️</button>
          <button onclick="completarTareaCritica(${index})" class="btn-subtarea" title="Completar">✅</button>
        </div>
      </div>
    </div>
  `;
}

// Crear tarjeta de cita completa
function crearTarjetaCita(cita) {
  const fechaTexto = formatearFechaCompleta(cita.fechaObj);
  const horaTexto = cita.hora || '';
  const nombre = cita.nombre || cita.titulo || 'Sin título';
  const fechaKey = Array.isArray(cita.fecha) ? cita.fecha.join('-') : cita.fecha;
  const esHoy = cita.fechaObj && esFechaHoy(cita.fechaObj.toISOString().slice(0, 10));
  const claseUrgente = esHoy ? 'style="background: #e3f2fd; border-left: 4px solid #2196f3;"' : '';

  return `
    <div class="tarea-carrusel" ${claseUrgente}>
      <div class="tarea-layout">
        <div class="tarea-contenido">
          <div class="tarea-header">
            <span class="tarea-urgencia">📅</span>
            <span class="tarea-titulo">${nombre}</span>
          </div>
          <div class="tarea-meta-grande">
            <div class="meta-fecha">📅 ${fechaTexto}</div>
            ${horaTexto ? `<div class="meta-persona">⏰ ${horaTexto}</div>` : ''}
            ${cita.lugar ? `<div class="meta-etiqueta">📍 ${cita.lugar}</div>` : ''}
          </div>
        </div>
        <div class="tarea-botones" onclick="event.stopPropagation();">
          <button onclick="deleteCita('${fechaKey}', '${nombre}')" class="btn-borrar-tarea" title="Eliminar">🗑️</button>
        </div>
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

// Funciones auxiliares
function esFechaHoy(fechaStr) {
  if (!fechaStr) return false;
  const hoy = new Date().toISOString().slice(0, 10);
  return fechaStr === hoy;
}

function esFechaPasada(fechaStr) {
  if (!fechaStr) return false;
  const fecha = new Date(fechaStr);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return fecha < hoy;
}

// Funciones de acción
function completarTareaCritica(index) {
  const tareas = window.appState?.agenda?.tareas_criticas || [];
  if (tareas[index]) {
    tareas[index].completada = true;
    if (typeof guardarDatos === 'function') guardarDatos();
    renderizarCriticas();
  }
}

function eliminarTareaCritica(index) {
  if (!confirm('¿Eliminar tarea crítica?')) return;
  const tareas = window.appState?.agenda?.tareas_criticas || [];
  if (tareas[index]) {
    tareas.splice(index, 1);
    if (typeof guardarDatos === 'function') guardarDatos();
    renderizarCriticas();
  }
}

function completarTareaPersonalizada(listaId, tareaIndex) {
  const listas = window.appState?.agenda?.listasPersonalizadas || [];
  const lista = listas.find(l => l.id === listaId);
  
  if (lista && lista.tareas && lista.tareas[tareaIndex]) {
    lista.tareas[tareaIndex].completada = true;
    if (typeof guardarDatos === 'function') guardarDatos();
    renderizarListasPersonalizadas();
  }
}

function eliminarTareaPersonalizada(listaId, tareaIndex) {
  if (!confirm('¿Eliminar tarea?')) return;
  
  const listas = window.appState?.agenda?.listasPersonalizadas || [];
  const lista = listas.find(l => l.id === listaId);
  
  if (lista && lista.tareas && lista.tareas[tareaIndex]) {
    lista.tareas.splice(tareaIndex, 1);
    if (typeof guardarDatos === 'function') guardarDatos();
    renderizarListasPersonalizadas();
  }
}

function deleteCita(fechaKey, nombre) {
  if (!confirm('¿Eliminar cita?')) return;
  const citas = window.appState?.agenda?.citas || [];
  const index = citas.findIndex(c => c.nombre === nombre);
  if (index !== -1) {
    citas.splice(index, 1);
    if (typeof guardarDatos === 'function') guardarDatos();
    renderizarCitas();
  }
}

function abrirListaPersonalizada(listaId) {
  alert('🚧 Función en desarrollo: Ver lista completa');
}

// Actualización automática
window.actualizarBottomNav = function() {
  if (!document.getElementById('mobile-app')) return;
  renderizarTab(navState.currentTab);
};