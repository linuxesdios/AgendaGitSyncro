// ==================== BOTTOM NAVIGATION (VERSIÓN SIMPLE) ====================

// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Configurar botones de navegación
  const navButtons = document.querySelectorAll('.nav-item');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      cambiarTab(btn.dataset.tab);
    });
  });

  // Escuchar evento de Supabase
  window.addEventListener('supabaseDataLoaded', () => {
    renderizarTodo();
  });

  // Escuchar cuando se guardan datos nuevos (AUTO-PUSH)
  window.addEventListener('supabaseDataSaved', () => {
    renderizarTodo();
  });

  // Timeout de seguridad
  setTimeout(() => {
    renderizarTodo();
  }, 3000);

  // Activar tab de críticas por defecto
  setTimeout(() => {
    cambiarTab('criticas');
  }, 100);

  // ========== GESTOS SWIPE (DESLIZAR) ==========
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  const tabsOrder = ['criticas', 'citas', 'listas'];

  document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    // Umbral mínimo para considerar swipe (50px) y límite vertical (100px) para no interferir con scroll
    if (Math.abs(diffX) > 50 && Math.abs(diffY) < 100) {
      const currentTab = document.querySelector('.nav-item.active')?.dataset.tab;
      if (!currentTab) return;

      const currentIndex = tabsOrder.indexOf(currentTab);
      if (currentIndex === -1) return;

      if (diffX > 0) {
        // Swipe Derecha -> Pestaña Anterior (Izquierda)
        const prevIndex = (currentIndex - 1 + tabsOrder.length) % tabsOrder.length;
        cambiarTab(tabsOrder[prevIndex]);
      } else {
        // Swipe Izquierda -> Pestaña Siguiente (Derecha)
        const nextIndex = (currentIndex + 1) % tabsOrder.length;
        cambiarTab(tabsOrder[nextIndex]);
      }
    }
  }
});

function cambiarTab(tabName) {
  // Actualizar botones
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tabName);
  });

  // Actualizar contenido
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });

  // Actualizar header
  const icons = { criticas: '🚨', citas: '📅', listas: '📋' };
  const titles = { criticas: 'Tareas Críticas', citas: 'Citas', listas: 'Listas' };

  const iconEl = document.getElementById('current-tab-icon');
  const titleEl = document.getElementById('current-tab-title');

  if (iconEl) iconEl.textContent = icons[tabName];
  if (titleEl) titleEl.textContent = titles[tabName];

  renderizarTab(tabName);
}

function renderizarTab(tabName) {
  if (!tabName) return;

  try {
    if (tabName === 'criticas') renderizarCriticasMovil();
    if (tabName === 'citas') renderizarCitasMovil();
    if (tabName === 'listas') renderizarListasMovil();
  } catch (error) {
    console.error('❌ Error en renderizarTab:', error);
  }
}

function renderizarTodo() {
  renderizarCriticasMovil();
  renderizarCitasMovil();
  renderizarListasMovil();
}

// ==================== RENDERIZADO DE CRÍTICAS ====================
function renderizarCriticasMovil() {
  try {
    const container = document.getElementById('lista-criticas-movil');
    if (!container) return;

    const tareas = window.appState?.agenda?.tareas_criticas || [];
    const activas = tareas.filter(t => !t.completada);

    if (activas.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">🎉</div><div class="empty-text">No hay tareas críticas<br><small>Crea una nueva con el botón +</small></div></div>';
      return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const añoActual = hoy.getFullYear();

    container.innerHTML = activas.map(t => {
      let alertaHtml = '';
      let cardStyle = '';
      let fechaFormateada = '';

      if (t.fecha_fin) {
        const [year, month, day] = t.fecha_fin.split('-').map(Number);
        const fechaTarea = new Date(year, month - 1, day);
        fechaTarea.setHours(0, 0, 0, 0);
        fechaFormateada = year !== añoActual ? `${day}/${month}/${year}` : `${day}/${month}`;

        if (fechaTarea < hoy) {
          cardStyle = 'background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%); border-left: 4px solid #f44336;';
          alertaHtml = '<span style="background:#f44336;color:white;padding:4px 8px;border-radius:12px;font-size:13px;font-weight:bold;">⚠️ PASADA</span>';
        } else if (fechaTarea.getTime() === hoy.getTime()) {
          cardStyle = 'background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%); border-left: 4px solid #f44336;';
          alertaHtml = '<span style="background:#f44336;color:white;padding:4px 8px;border-radius:12px;font-size:10px;font-weight:bold;">⚠️ Hoy</span>';
        }
      }

      return `
      <div class="task-card" style="${cardStyle}">
        <div class="task-main">
          <span class="task-icon">🚨</span>
          <div class="task-content-area">
            <div class="task-title">${t.titulo || 'Sin título'}</div>
            <div class="task-meta">
              ${fechaFormateada ? `<span class="task-meta-item">📅 ${fechaFormateada}</span>` : ''}
              ${t.persona ? `<span class="task-meta-item">👤 ${t.persona}</span>` : ''}
              ${t.etiqueta ? `<span class="task-meta-item">🏷️ ${t.etiqueta}</span>` : ''}
            </div>
          </div>
          ${alertaHtml}
          <div style="display: flex; flex-direction: row; gap: 6px;">
            <button class="task-btn btn-edit" onclick="editarTareaCritica('${t.id}')" title="Editar">✏️</button>
            <button class="task-btn btn-delete" onclick="eliminarTareaCritica('${t.id}')" title="Eliminar">🗑️</button>
            <button class="task-btn btn-postpone" onclick="abrirModalMigrarCritica('${t.id}')" title="Posponer/Delegar" style="background: linear-gradient(135deg, #ff9800, #f57c00);">⏰</button>
          </div>
        </div>
      </div>
    `;
    }).join('');
  } catch (error) {
    console.error('❌ ERROR en renderizarCriticas:', error);
  }
}

// ==================== RENDERIZADO DE CITAS ====================
function renderizarCitasMovil() {
  const container = document.getElementById('lista-citas-movil');
  if (!container) return;

  const citas = window.appState?.agenda?.citas || [];

  if (citas.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-text">No hay citas<br><small>Crea una nueva con el botón 📅</small></div></div>';
    return;
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const añoActual = hoy.getFullYear();

  container.innerHTML = citas.map(c => {
    let fechaStr = '';
    let cardStyle = '';
    let alertaHtml = '';

    if (c.fecha) {
      let fechaCita;
      if (Array.isArray(c.fecha)) {
        fechaCita = new Date(c.fecha[0], c.fecha[1] - 1, c.fecha[2]);
        fechaStr = c.fecha[0] !== añoActual ? `${c.fecha[2]}/${c.fecha[1]}/${c.fecha[0]}` : `${c.fecha[2]}/${c.fecha[1]}`;
      } else if (typeof c.fecha === 'string') {
        if (c.fecha.includes('-')) {
          const [year, month, day] = c.fecha.split('-').map(Number);
          fechaCita = new Date(year, month - 1, day);
        } else if (c.fecha.includes('/')) {
          const parts = c.fecha.split('/');
          if (parts[2]?.length === 4) {
            fechaCita = new Date(parts[2], parts[1] - 1, parts[0]);
          }
        }
      }

      if (fechaCita) {
        fechaCita.setHours(0, 0, 0, 0);
        if (fechaCita < hoy) {
          cardStyle = 'background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%); border-left: 4px solid #f44336;';
          alertaHtml = '<span style="background:#f44336;color:white;padding:4px 8px;border-radius:12px;font-size:13px;font-weight:bold;">⚠️ PASADA</span>';
        } else if (fechaCita.getTime() === hoy.getTime()) {
          cardStyle = 'background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%); border-left: 4px solid #f44336;';
          alertaHtml = '<span style="background:#f44336;color:white;padding:4px 8px;border-radius:12px;font-size:10px;font-weight:bold;">⚠️ Hoy</span>';
        }
      }
    }

    return `
      <div class="task-card" style="${cardStyle}">
        <div class="task-main">
          <span class="task-icon">📅</span>
          <div class="task-content-area">
            <div class="task-title">${c.nombre || 'Sin título'}</div>
            <div class="task-meta">
              ${fechaStr ? `<span class="task-meta-item">📅 ${fechaStr}</span>` : ''}
              ${c.hora ? `<span class="task-meta-item">⏰ ${c.hora}</span>` : ''}
              ${c.lugar ? `<span class="task-meta-item">📍 ${c.lugar}</span>` : ''}
              ${c.etiqueta ? `<span class="task-meta-item">🏷️ ${c.etiqueta}</span>` : ''}
            </div>
          </div>
          ${alertaHtml}
          <div style="display: flex; flex-direction: row; gap: 6px;">
            <button class="task-btn btn-edit" onclick="editarCita('${c.id}')" title="Editar">✏️</button>
            <button class="task-btn btn-delete" onclick="eliminarCita('${c.id}')" title="Eliminar">🗑️</button>
            <button class="task-btn btn-postpone" onclick="abrirModalMigrarCita('${c.id}')" title="Posponer" style="background: linear-gradient(135deg, #ff9800, #f57c00);">⏰</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==================== RENDERIZADO DE LISTAS (PESTAÑAS) ====================
function renderizarListasMovil() {
  console.log('📱 RENDERIZANDO LISTAS PARA MÓVIL (MODO PESTAÑAS)');
  const contenedor = document.getElementById('listas-personalizadas-movil');

  if (!contenedor) return;

  const listas = window.tareasData?.listasPersonalizadas || [];

  if (listas.length === 0) {
    contenedor.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <div class="empty-text">No hay listas personalizadas<br><small>Crea una en Configuración</small></div>
            </div>
        `;
    return;
  }

  // Inicializar lista activa si no existe o no es válida
  if (!window.activeListId || !listas.find(l => l.id === window.activeListId)) {
    window.activeListId = listas[0].id;
  }

  // 1. Renderizar Pestañas (Scroll Horizontal)
  let tabsHtml = `
        <div class="list-tabs-container" style="
            display: flex; 
            overflow-x: auto; 
            padding: 10px 5px; 
            gap: 10px; 
            margin-bottom: 15px; 
            scrollbar-width: none; 
            -ms-overflow-style: none;
            border-bottom: 1px solid #eee;
        ">
    `;

  listas.forEach(lista => {
    const isActive = lista.id === window.activeListId;
    const bg = isActive ? (lista.color || '#4ecdc4') : '#f0f0f0';
    const color = isActive ? '#fff' : '#666';
    const fontWeight = isActive ? 'bold' : 'normal';
    const border = isActive ? 'none' : '1px solid #ddd';

    tabsHtml += `
            <button onclick="cambiarListaActiva('${lista.id}')" 
                    style="
                        background: ${bg}; 
                        color: ${color}; 
                        border: ${border}; 
                        padding: 8px 16px; 
                        border-radius: 20px; 
                        white-space: nowrap; 
                        font-weight: ${fontWeight}; 
                        font-size: 14px; 
                        box-shadow: ${isActive ? '0 2px 5px rgba(0,0,0,0.2)' : 'none'};
                        transition: all 0.2s ease;
                        flex-shrink: 0;
                    ">
                ${lista.emoji || '📝'} ${lista.nombre}
            </button>
        `;
  });
  tabsHtml += '</div>';

  // 2. Renderizar Contenido de la Lista Activa
  const listaActiva = listas.find(l => l.id === window.activeListId);
  let contentHtml = '';

  if (listaActiva) {
    const tareas = listaActiva.tareas || [];
    const tareasPendientes = tareas.length;

    contentHtml = `
            <div class="task-card" style="border-left: 5px solid ${listaActiva.color || '#4ecdc4'}; margin-bottom: 16px; animation: fadeIn 0.3s ease;">
                <div style="padding: 12px; background: rgba(0,0,0,0.02); border-bottom: 1px solid rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">${listaActiva.emoji || '📋'}</span>
                        <span style="font-weight: bold; color: #333;">${listaActiva.nombre}</span>
                        <span style="background: ${listaActiva.color || '#4ecdc4'}; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px;">${tareasPendientes}</span>
                    </div>
                    <button onclick="abrirModalNuevaTareaLista('${listaActiva.id}')" style="background: none; border: none; font-size: 18px; cursor: pointer;">➕</button>
                </div>
                <div style="padding: 0;">`;

    if (tareas.length === 0) {
      contentHtml += `<div style="padding: 20px; text-align: center; color: #999; font-style: italic;">No hay tareas en esta lista</div>`;
    } else {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const añoActual = hoy.getFullYear();
      
      tareas.forEach((tarea, tIndex) => {
        const textStyle = 'color: #333;';
        const opacity = '1';
        
        let fechaFormateada = '';
        let alertaBadge = '';
        let cardStyle = '';
        
        if (tarea.fecha) {
          let fechaTarea;
          if (Array.isArray(tarea.fecha)) {
            const [year, month, day] = tarea.fecha;
            fechaFormateada = year !== añoActual ? `${day}/${month}/${year}` : `${day}/${month}`;
            fechaTarea = new Date(year, month - 1, day);
          } else if (typeof tarea.fecha === 'string') {
            const [year, month, day] = tarea.fecha.split('-').map(Number);
            fechaFormateada = year !== añoActual ? `${day}/${month}/${year}` : `${day}/${month}`;
            fechaTarea = new Date(year, month - 1, day);
          }
          
          if (fechaTarea) {
            fechaTarea.setHours(0, 0, 0, 0);
            if (fechaTarea < hoy) {
              alertaBadge = '<span style="background:#f44336;color:white;padding:4px 8px;border-radius:12px;font-size:13px;font-weight:bold;">⚠️ PASADA</span>';
              cardStyle = 'background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);';
            } else if (fechaTarea.getTime() === hoy.getTime()) {
              alertaBadge = '<span style="background:#f44336;color:white;padding:4px 8px;border-radius:12px;font-size:10px;font-weight:bold;">⚠️ Hoy</span>';
              cardStyle = 'background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);';
            }
          }
        }

        contentHtml += `
                    <div style="padding: 12px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px; opacity: ${opacity}; ${cardStyle}">
                        <span class="task-icon" style="font-size: 20px;">${listaActiva.emoji || '📋'}</span>
                        <div style="flex: 1; ${textStyle}">
                            ${tarea.texto}
                            ${fechaFormateada ? `<div style="font-size: 11px; color: #666;">📅 ${fechaFormateada}</div>` : ''}
                        </div>
                        
                        ${alertaBadge}
                        
                        <div style="display: flex; flex-direction: row; gap: 6px;">
                            <button class="task-btn btn-edit" onclick="editarTareaListaPersonalizada('${listaActiva.id}', ${tIndex})" title="Editar" style="width: 36px; height: 36px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.1); background: linear-gradient(135deg, #2196F3, #1976D2); color: white; display: flex; align-items: center; justify-content: center;">✏️</button>
                            <button class="task-btn btn-delete" onclick="eliminarTareaListaPersonalizada('${listaActiva.id}', ${tIndex})" title="Eliminar" style="width: 36px; height: 36px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.1); background: linear-gradient(135deg, #ff6b6b, #ee5a52); color: white; display: flex; align-items: center; justify-content: center;">🗑️</button>
                            <button class="task-btn btn-postpone" onclick="abrirModalMigrarListaPersonalizada('${listaActiva.id}', ${tIndex})" title="Posponer/Delegar" style="width: 36px; height: 36px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.1); background: linear-gradient(135deg, #ff9800, #f57c00); color: white; display: flex; align-items: center; justify-content: center;">⏰</button>
                        </div>
                    </div>
                `;
      });
    }
    contentHtml += `</div></div>`;
  }

  contenedor.innerHTML = tabsHtml + contentHtml;
}

// Función global para cambiar de pestaña
window.cambiarListaActiva = function (id) {
  window.activeListId = id;
  renderizarListasMovil();
}

// ==================== FUNCIONES AUXILIARES PARA TAREAS CRÍTICAS ====================

function completarTareaCritica(id) {
  const tarea = window.appState.agenda.tareas_criticas.find(t => t.id === id);
  if (!tarea) return;

  tarea.completada = true;
  tarea.fecha_completada = new Date().toISOString();
  guardarJSON();
  renderizarCriticasMovil();
  mostrarAlerta('✅ Tarea completada', 'success');
}

function eliminarTareaCritica(id) {
  console.log('📤 SUPABASE: Eliminando tarea crítica');
  window.appState.agenda.tareas_criticas = window.appState.agenda.tareas_criticas.filter(t => t.id !== id);
  guardarJSON();
  renderizarCriticasMovil();
  mostrarAlerta('🗑️ Tarea crítica eliminada', 'success');
}

function editarTareaCritica(id) {
  const tarea = window.appState.agenda.tareas_criticas.find(t => t.id === id);
  if (!tarea) return;

  // Crear modal dinámicamente
  const modalId = 'modal-editar-critica-movil';
  let modal = document.getElementById(modalId);

  if (modal) {
    modal.remove();
  }

  modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = modalId;
  modal.style.cssText = 'display: block; animation: fadeIn 0.2s ease-in-out;';

  // Obtener etiquetas disponibles
  const etiquetas = window.etiquetasData?.tareas || [];
  const opcionesEtiquetas = etiquetas.map(e =>
    `<option value="${e.nombre}" ${tarea.etiqueta === e.nombre ? 'selected' : ''}>${e.simbolo || '🏷️'} ${e.nombre}</option>`
  ).join('');

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white;">
        <h4 style="margin: 0; font-size: 20px; font-weight: 600;">✏️ Editar Tarea Crítica</h4>
      </div>
      
      <div style="padding: 24px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);">
        <div class="form-group" style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748; font-size: 14px;">📝 Título:</label>
          <input type="text" id="edit-critica-titulo" value="${tarea.titulo || ''}" 
            style="width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 15px; transition: all 0.3s ease; background: white;"
            onfocus="this.style.borderColor='#667eea'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
            onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'"
            placeholder="Describe la tarea crítica...">
        </div>
        
        <div class="form-group" style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748; font-size: 14px;">📅 Fecha límite (opcional):</label>
          <input type="date" id="edit-critica-fecha" value="${tarea.fecha_fin || ''}"
            style="width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 15px; transition: all 0.3s ease; background: white;"
            onfocus="this.style.borderColor='#667eea'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
            onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'"
            onkeydown="return false;" onclick="this.showPicker();">
        </div>
        
        <div class="form-group" style="margin-bottom: 24px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748; font-size: 14px;">🏷️ Etiqueta (opcional):</label>
          <select id="edit-critica-etiqueta" 
            style="width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 15px; transition: all 0.3s ease; background: white; cursor: pointer;"
            onfocus="this.style.borderColor='#667eea'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
            onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
            <option value="">Sin etiqueta</option>
            ${opcionesEtiquetas}
          </select>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button onclick="document.getElementById('${modalId}').remove()" 
            style="padding: 12px 24px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);"
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(245, 87, 108, 0.4)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(245, 87, 108, 0.3)'"
            onmousedown="this.style.transform='scale(0.95)'"
            onmouseup="this.style.transform='translateY(-2px)'">
            Cancelar
          </button>
          <button onclick="guardarEdicionCriticaMovil('${id}')" 
            style="padding: 12px 24px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; background: linear-gradient(135deg, #4ecdc4, #44a08d); color: white; box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);"
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(78, 205, 196, 0.4)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(78, 205, 196, 0.3)'"
            onmousedown="this.style.transform='scale(0.95)'"
            onmouseup="this.style.transform='translateY(-2px)'">
            💾 Guardar
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Auto-focus en el input de título
  setTimeout(() => {
    const input = document.getElementById('edit-critica-titulo');
    if (input) {
      input.focus();
      input.select();
    }
  }, 100);
}

function guardarEdicionCriticaMovil(id) {
  const titulo = document.getElementById('edit-critica-titulo').value.trim();
  const fecha = document.getElementById('edit-critica-fecha').value;
  const etiqueta = document.getElementById('edit-critica-etiqueta').value;

  if (!titulo) {
    alert('El título no puede estar vacío');
    return;
  }

  const tarea = window.appState.agenda.tareas_criticas.find(t => t.id === id);
  if (tarea) {
    tarea.titulo = titulo;
    tarea.fecha_fin = fecha || null;
    tarea.etiqueta = etiqueta || null;

    console.log('📤 SUPABASE: Editando tarea crítica');
    guardarJSON();
    renderizarCriticasMovil();

    const modal = document.getElementById('modal-editar-critica-movil');
    if (modal) modal.remove();

    mostrarAlerta('✏️ Tarea crítica actualizada', 'success');
  }
}

function abrirModalMigrarCritica(id) {
  window.tareaActualMigrar = { id, tipo: 'critica' };
  abrirModal('modal-migrar');
}

// ==================== FUNCIONES AUXILIARES PARA CITAS ====================

function eliminarCita(id) {
  console.log('📤 SUPABASE: Eliminando cita');
  window.appState.agenda.citas = window.appState.agenda.citas.filter(c => c.id != id);
  guardarJSON();
  renderizarCitasMovil();
  mostrarAlerta('🗑️ Cita eliminada', 'success');
}

function editarCita(id) {
  const cita = window.appState.agenda.citas.find(c => c.id == id);
  if (!cita) return;

  // Crear modal dinámicamente
  const modalId = 'modal-editar-cita-movil';
  let modal = document.getElementById(modalId);

  if (modal) {
    modal.remove();
  }

  modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = modalId;
  modal.style.cssText = 'display: block; animation: fadeIn 0.2s ease-in-out;';

  // Obtener etiquetas disponibles
  const etiquetas = window.etiquetasData?.citas || [];
  const opcionesEtiquetas = etiquetas.map(e =>
    `<option value="${e.nombre}" ${cita.etiqueta === e.nombre ? 'selected' : ''}>${e.simbolo || '🏷️'} ${e.nombre}</option>`
  ).join('');

  // Extraer hora y minutos de la cita existente
  let hora = '14';  // Valor por defecto
  let minutos = '00'; // Valor por defecto

  if (cita.hora) {
    const partes = cita.hora.split(':');
    if (partes.length >= 2) {
      hora = partes[0];
      minutos = partes[1];
    }
  }

  // Formatear fecha para el input
  let fechaValue = '';
  if (cita.fecha) {
    if (Array.isArray(cita.fecha)) {
      const [year, month, day] = cita.fecha;
      fechaValue = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else if (typeof cita.fecha === 'string') {
      if (cita.fecha.includes('-')) {
        fechaValue = cita.fecha;
      } else if (cita.fecha.includes('/')) {
        const parts = cita.fecha.split('/');
        if (parts[2]?.length === 4) {
          fechaValue = `${parts[2]}-${String(parts[1]).padStart(2, '0')}-${String(parts[0]).padStart(2, '0')}`;
        }
      }
    }
  }

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white;">
        <h4 style="margin: 0; font-size: 20px; font-weight: 600;">✏️ Editar Cita</h4>
      </div>
      
      <div style="padding: 24px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);">
        <div class="form-group" style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748; font-size: 14px;">📅 Fecha:</label>
          <input type="date" id="edit-cita-fecha" value="${fechaValue}"
            style="width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 15px; transition: all 0.3s ease; background: white;"
            onfocus="this.style.borderColor='#667eea'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
            onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'"
            onkeydown="return false;" onclick="this.showPicker();">
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748; font-size: 14px;">📝 Descripción:</label>
          <input type="text" id="edit-cita-nombre" value="${cita.nombre || ''}" 
            style="width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 15px; transition: all 0.3s ease; background: white;"
            onfocus="this.style.borderColor='#667eea'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
            onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'"
            placeholder="Describe la cita...">
        </div>
        
        <div class="form-group" style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748; font-size: 14px;">🏷️ Etiqueta (opcional):</label>
          <select id="edit-cita-etiqueta" 
            style="width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 15px; transition: all 0.3s ease; background: white; cursor: pointer;"
            onfocus="this.style.borderColor='#667eea'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
            onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
            <option value="">Sin etiqueta</option>
            ${opcionesEtiquetas}
          </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748; font-size: 14px;">⏰ Hora:</label>
            <select id="edit-cita-hora" style="width:100%;padding:12px 16px;border:2px solid #e2e8f0;border-radius:8px;font-size:15px;background:white;cursor:pointer;"
              onfocus="this.style.borderColor='#667eea';this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
              onblur="this.style.borderColor='#e2e8f0';this.style.boxShadow='none'">
              <option value="08" ${hora === '08' ? 'selected' : ''}>08</option>
              <option value="09" ${hora === '09' ? 'selected' : ''}>09</option>
              <option value="10" ${hora === '10' ? 'selected' : ''}>10</option>
              <option value="11" ${hora === '11' ? 'selected' : ''}>11</option>
              <option value="12" ${hora === '12' ? 'selected' : ''}>12</option>
              <option value="13" ${hora === '13' ? 'selected' : ''}>13</option>
              <option value="14" ${hora === '14' ? 'selected' : ''}>14</option>
              <option value="15" ${hora === '15' ? 'selected' : ''}>15</option>
              <option value="16" ${hora === '16' ? 'selected' : ''}>16</option>
              <option value="17" ${hora === '17' ? 'selected' : ''}>17</option>
              <option value="18" ${hora === '18' ? 'selected' : ''}>18</option>
              <option value="19" ${hora === '19' ? 'selected' : ''}>19</option>
              <option value="20" ${hora === '20' ? 'selected' : ''}>20</option>
              <option value="21" ${hora === '21' ? 'selected' : ''}>21</option>
              <option value="22" ${hora === '22' ? 'selected' : ''}>22</option>
            </select>
          </div>
          <div>
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748; font-size: 14px;">⏱️ Minutos:</label>
            <select id="edit-cita-minutos" style="width:100%;padding:12px 16px;border:2px solid #e2e8f0;border-radius:8px;font-size:15px;background:white;cursor:pointer;"
              onfocus="this.style.borderColor='#667eea';this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
              onblur="this.style.borderColor='#e2e8f0';this.style.boxShadow='none'">
              <option value="00" ${minutos === '00' ? 'selected' : ''}>00</option>
              <option value="05" ${minutos === '05' ? 'selected' : ''}>05</option>
              <option value="10" ${minutos === '10' ? 'selected' : ''}>10</option>
              <option value="15" ${minutos === '15' ? 'selected' : ''}>15</option>
              <option value="20" ${minutos === '20' ? 'selected' : ''}>20</option>
              <option value="25" ${minutos === '25' ? 'selected' : ''}>25</option>
              <option value="30" ${minutos === '30' ? 'selected' : ''}>30</option>
              <option value="35" ${minutos === '35' ? 'selected' : ''}>35</option>
              <option value="40" ${minutos === '40' ? 'selected' : ''}>40</option>
              <option value="45" ${minutos === '45' ? 'selected' : ''}>45</option>
              <option value="50" ${minutos === '50' ? 'selected' : ''}>50</option>
              <option value="55" ${minutos === '55' ? 'selected' : ''}>55</option>
            </select>
          </div>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button onclick="document.getElementById('${modalId}').remove()" 
            style="padding: 12px 24px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);"
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(245, 87, 108, 0.4)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(245, 87, 108, 0.3)'"
            onmousedown="this.style.transform='scale(0.95)'"
            onmouseup="this.style.transform='translateY(-2px)'">
            Cancelar
          </button>
          <button onclick="guardarEdicionCitaMovil('${id}')" 
            style="padding: 12px 24px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; background: linear-gradient(135deg, #4ecdc4, #44a08d); color: white; box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);"
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(78, 205, 196, 0.4)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(78, 205, 196, 0.3)'"
            onmousedown="this.style.transform='scale(0.95)'"
            onmouseup="this.style.transform='translateY(-2px)'">
            💾 Guardar
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Auto-focus en el input
  setTimeout(() => {
    const input = document.getElementById('edit-cita-nombre');
    if (input) {
      input.focus();
      input.select();
    }
  }, 100);
}


function guardarEdicionCitaMovil(id) {
  const fecha = document.getElementById('edit-cita-fecha').value;
  const nombre = document.getElementById('edit-cita-nombre').value.trim();
  const etiqueta = document.getElementById('edit-cita-etiqueta').value;
  const hora = document.getElementById('edit-cita-hora').value;
  const minutos = document.getElementById('edit-cita-minutos').value;

  if (!nombre) {
    alert('El nombre de la cita no puede estar vacío');
    return;
  }

  if (!fecha) {
    alert('La fecha es obligatoria');
    return;
  }

  const cita = window.appState.agenda.citas.find(c => c.id == id);
  if (cita) {
    cita.nombre = nombre;
    cita.etiqueta = etiqueta || null;

    // Guardar fecha como array [año, mes, día]
    const [year, month, day] = fecha.split('-').map(Number);
    cita.fecha = [year, month, day];

    // Guardar hora en formato HH:MM
    cita.hora = `${hora}:${minutos}`;

    console.log('📤 SUPABASE: Editando cita');
    guardarJSON();
    renderizarCitasMovil();

    const modal = document.getElementById('modal-editar-cita-movil');
    if (modal) modal.remove();

    mostrarAlerta('✏️ Cita actualizada', 'success');
  }
}



// ==================== FUNCIONES AUXILIARES PARA LISTAS PERSONALIZADAS ====================

function completarTareaLista(listaId, tareaId) {
  const lista = window.tareasData.listasPersonalizadas.find(l => l.id === listaId);
  if (!lista) return;

  const tarea = lista.tareas.find(t => t.id == tareaId);
  if (!tarea) return;

  tarea.completada = true;
  tarea.fecha_completada = new Date().toISOString();
  guardarJSON();
  renderizarListasMovil();
  mostrarAlerta('✅ Tarea completada', 'success');
}

function eliminarTareaLista(listaId, tareaId) {
  const lista = window.tareasData.listasPersonalizadas.find(l => l.id === listaId);
  if (!lista) return;

  console.log('📤 SUPABASE: Eliminando tarea de lista');
  lista.tareas = lista.tareas.filter(t => t.id != tareaId);
  guardarJSON();
  renderizarListasMovil();
  mostrarAlerta('🗑️ Tarea eliminada', 'success');
}

function editarTareaLista(listaId, tareaId) {
  const lista = window.tareasData.listasPersonalizadas.find(l => l.id === listaId);
  if (!lista) return;

  const tarea = lista.tareas.find(t => t.id == tareaId);
  if (!tarea) return;

  // Crear modal dinámicamente
  const modalId = 'modal-editar-lista-movil';
  let modal = document.getElementById(modalId);

  if (modal) {
    modal.remove();
  }

  modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = modalId;
  modal.style.cssText = 'display: block; animation: fadeIn 0.2s ease-in-out;';

  // Obtener fecha formateada
  let fechaValue = '';
  if (tarea.fecha) {
    if (Array.isArray(tarea.fecha)) {
      const [year, month, day] = tarea.fecha;
      fechaValue = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else if (typeof tarea.fecha === 'string') {
      fechaValue = tarea.fecha;
    }
  }

  // Obtener etiquetas disponibles
  const etiquetas = window.etiquetasData?.tareas || [];
  const opcionesEtiquetas = etiquetas.map(e =>
    `<option value="${e.nombre}" ${tarea.etiqueta === e.nombre ? 'selected' : ''}>${e.simbolo || '🏷️'} ${e.nombre}</option>`
  ).join('');

  // Obtener personas disponibles
  const personas = window.personasAsignadas || [];
  const opcionesPersonas = personas.map(p =>
    `<option value="${p}" ${tarea.persona === p ? 'selected' : ''}>${p}</option>`
  ).join('');

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white;">
        <h4 style="margin: 0; font-size: 20px; font-weight: 600;">✏️ Editar Tarea</h4>
        <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">${lista.emoji || '📝'} ${lista.nombre}</p>
      </div>
      
      <div style="padding: 24px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);">
        <div class="form-group" style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748; font-size: 14px;">📝 Descripción:</label>
          <input type="text" id="edit-lista-texto" value="${tarea.texto || ''}" 
            style="width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 15px; transition: all 0.3s ease; background: white;"
            onfocus="this.style.borderColor='#667eea'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
            onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'"
            placeholder="Describe la tarea...">
        </div>
        
        <div class="form-group" style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748; font-size: 14px;">📅 Fecha (opcional):</label>
          <input type="date" id="edit-lista-fecha" value="${fechaValue}"
            style="width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 15px; transition: all 0.3s ease; background: white;"
            onfocus="this.style.borderColor='#667eea'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
            onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'"
            onkeydown="return false;" onclick="this.showPicker();">
        </div>
        
        <div class="form-group" style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748; font-size: 14px;">👤 Persona (opcional):</label>
          <select id="edit-lista-persona" 
            style="width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 15px; transition: all 0.3s ease; background: white; cursor: pointer;"
            onfocus="this.style.borderColor='#667eea'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
            onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
            <option value="">No asignar</option>
            ${opcionesPersonas}
          </select>
        </div>
        
        <div class="form-group" style="margin-bottom: 24px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748; font-size: 14px;">🏷️ Etiqueta (opcional):</label>
          <select id="edit-lista-etiqueta" 
            style="width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 15px; transition: all 0.3s ease; background: white; cursor: pointer;"
            onfocus="this.style.borderColor='#667eea'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
            onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
            <option value="">Sin etiqueta</option>
            ${opcionesEtiquetas}
          </select>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button onclick="document.getElementById('${modalId}').remove()" 
            style="padding: 12px 24px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);"
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(245, 87, 108, 0.4)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(245, 87, 108, 0.3)'"
            onmousedown="this.style.transform='scale(0.95)'"
            onmouseup="this.style.transform='translateY(-2px)'">
            Cancelar
          </button>
          <button onclick="guardarEdicionListaMovil('${listaId}', ${tareaId})" 
            style="padding: 12px 24px; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; background: linear-gradient(135deg, #4ecdc4, #44a08d); color: white; box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);"
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(78, 205, 196, 0.4)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(78, 205, 196, 0.3)'"
            onmousedown="this.style.transform='scale(0.95)'"
            onmouseup="this.style.transform='translateY(-2px)'">
            💾 Guardar
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Auto-focus en el input de texto
  setTimeout(() => {
    const input = document.getElementById('edit-lista-texto');
    if (input) {
      input.focus();
      input.select();
    }
  }, 100);
}

function guardarEdicionListaMovil(listaId, tareaId) {
  const texto = document.getElementById('edit-lista-texto').value.trim();
  const fecha = document.getElementById('edit-lista-fecha').value;
  const persona = document.getElementById('edit-lista-persona').value;
  const etiqueta = document.getElementById('edit-lista-etiqueta').value;

  if (!texto) {
    alert('El texto de la tarea no puede estar vacío');
    return;
  }

  const lista = window.tareasData.listasPersonalizadas.find(l => l.id === listaId);
  if (!lista) return;

  const tarea = lista.tareas.find(t => t.id == tareaId);
  if (tarea) {
    tarea.texto = texto;

    // Manejar fecha (convertir a array si hay fecha)
    if (fecha) {
      const [year, month, day] = fecha.split('-').map(Number);
      tarea.fecha = [year, month, day];
    } else {
      tarea.fecha = null;
    }

    tarea.persona = persona || null;
    tarea.etiqueta = etiqueta || null;

    console.log('📤 SUPABASE: Editando tarea de lista');
    guardarJSON();
    renderizarListasMovil();

    const modal = document.getElementById('modal-editar-lista-movil');
    if (modal) modal.remove();

    mostrarAlerta('✏️ Tarea actualizada', 'success');
  }
}


function abrirModalMigrarLista(listaId, tareaId) {
  window.tareaActualMigrar = { listaId, tareaId, tipo: 'lista' };
  abrirModal('modal-migrar');
}

function abrirModalMigrarListaPersonalizada(listaId, tareaIndex) {
  window.tareaActualMigrar = { listaId, tareaIndex, tipo: 'lista-personalizada' };
  abrirModal('modal-migrar');
}

function abrirModalMigrarCita(id) {
  window.tareaActualMigrar = { id, tipo: 'cita' };
  abrirModal('modal-migrar');
}
