// ==================== BOTTOM NAVIGATION (VERSIÓN SIMPLE) ====================

console.log('🚀 bottom-nav.js CARGADO');

// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  console.log('📱 DOMContentLoaded - Iniciando bottom nav');

  // Configurar botones de navegación
  const navButtons = document.querySelectorAll('.nav-item');
  console.log('🔘 Botones encontrados:', navButtons.length);

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      console.log('👆 Click en tab:', tab);
      cambiarTab(tab);
    });
  });

  // Escuchar evento de Supabase
  window.addEventListener('supabaseDataLoaded', () => {
    console.log('🎉 Datos de Supabase cargados - Renderizando');
    renderizarTodo();
  });

  // Escuchar cuando se guardan datos nuevos (AUTO-PUSH)
  window.addEventListener('supabaseDataSaved', () => {
    console.log('💾 Datos guardados - Re-renderizando vista móvil');
    renderizarTodo();
  });

  // Timeout de seguridad
  setTimeout(() => {
    console.log('⏰ Timeout - Renderizando datos');
    console.log('📊 DATOS DISPONIBLES:');
    console.log('  - Críticas:', window.appState?.agenda?.tareas_criticas?.length || 0);
    console.log('  - Citas:', window.appState?.agenda?.citas?.length || 0);
    console.log('  - Listas:', window.configVisual?.listasPersonalizadas?.length || 0);
    renderizarTodo();
  }, 3000);

  // Activar tab de críticas por defecto
  setTimeout(() => {
    cambiarTab('criticas');
  }, 100);
});

function cambiarTab(tabName) {
  console.log('🔄 Cambiando a tab:', tabName);

  // Actualizar botones
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tabName);
  });

  // Actualizar contenido
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });

  // Actualizar header
  const icons = { criticas: '🚨', citas: '📅', listas: '📋', mas: '⚡' };
  const titles = { criticas: 'Tareas Críticas', citas: 'Citas', listas: 'Listas', mas: 'Más' };

  document.getElementById('current-tab-icon').textContent = icons[tabName];
  document.getElementById('current-tab-title').textContent = titles[tabName];

  renderizarTab(tabName);
}

function renderizarTab(tabName) {
  console.log('🎨 Renderizando tab:', tabName);
  if (!tabName) {
    console.warn('⚠️ renderizarTab llamado sin parámetro');
    return;
  }

  try {
    if (tabName === 'criticas') {
      console.log('👉 Llamando renderizarCriticasMovil()');
      renderizarCriticasMovil();
    }
    if (tabName === 'citas') renderizarCitasMovil();
    if (tabName === 'listas') renderizarListasMovil();
  } catch (error) {
    console.error('❌ Error en renderizarTab:', error);
  }
}

function renderizarTodo() {
  console.log('🔄 Renderizando todo');
  renderizarCriticasMovil();
  renderizarCitasMovil();
  renderizarListasMovil();
}

function renderizarCriticasMovil() {
  try {
    console.log('🚨 Renderizando críticas - INICIO');
    const container = document.getElementById('lista-criticas-movil');
    if (!container) {
      console.error('❌ Contenedor lista-criticas-movil NO encontrado');
      return;
    }

    const tareas = window.appState?.agenda?.tareas_criticas || [];
    const activas = tareas.filter(t => !t.completada);
    console.log('📊 Tareas críticas:', tareas.length, 'Activas:', activas.length);

    if (activas.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">🎉</div><div class="empty-text">No hay tareas críticas<br><small>Crea una nueva con el botón +</small></div></div>';
      return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    container.innerHTML = activas.map(t => {
      let alertaHtml = '';
      let cardStyle = ''; // Estilo para la tarjeta completa

      if (t.fecha_fin) {
        const [year, month, day] = t.fecha_fin.split('-').map(Number);
        const fechaTarea = new Date(year, month - 1, day);
        fechaTarea.setHours(0, 0, 0, 0);

        if (fechaTarea < hoy) {
          // FECHA PASADA - Toda la tarjeta en rojo
          cardStyle = 'background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%); border-left: 4px solid #f44336;';
          alertaHtml = '<div style="background:#f44336;color:white;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:bold;margin-top:8px;">⚠️⚠️⚠️ Fecha pasada</div>';
        } else if (fechaTarea.getTime() === hoy.getTime()) {
          // PARA HOY - Toda la tarjeta en amarillo
          cardStyle = 'background: linear-gradient(135deg, #fffde7 0%, #fff9c4 100%); border-left: 4px solid #fbc02d;';
          alertaHtml = '<div style="background:#fbc02d;color:#000;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:bold;margin-top:8px;">⚠️ Para hoy</div>';
        }
      }

      return `
      <div class="task-card" style="${cardStyle}">
        <div class="task-main">
          <span class="task-icon">🚨</span>
          <div class="task-content-area">
            <div class="task-title">${t.titulo || 'Sin título'}</div>
            <div class="task-meta">
              ${t.fecha_fin ? `<span class="task-meta-item">📅 ${t.fecha_fin}</span>` : ''}
              ${t.persona ? `<span class="task-meta-item">👤 ${t.persona}</span>` : ''}
              ${t.etiqueta ? `<span class="task-meta-item">🏷️ ${t.etiqueta}</span>` : ''}
            </div>
            ${alertaHtml}
          </div>
          <div class="task-buttons">
            <button class="task-btn btn-edit" data-id="${t.id}" title="Editar">✏️</button>
            <button class="task-btn btn-delete" data-id="${t.id}" title="Eliminar">🗑️</button>
          </div>
        </div>
        <div class="task-actions">
          <button class="action-btn btn-postpone" data-id="${t.id}" style="width:100%;">Posponer/Delegar</button>
        </div>
      </div>
    `;
    }).join('');

    // Agregar event listeners
    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => editarTareaCritica(btn.dataset.id));
    });
    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => eliminarTareaCritica(btn.dataset.id));
    });
    container.querySelectorAll('.btn-postpone').forEach(btn => {
      btn.addEventListener('click', () => abrirModalMigrarCritica(btn.dataset.id));
    });

    console.log('✅ Críticas renderizadas:', activas.length);
  } catch (error) {
    console.error('❌ ERROR en renderizarCriticas:', error);
  }
}

function renderizarCitasMovil() {
  console.log('📅 Renderizando citas');
  const container = document.getElementById('lista-citas-movil');
  if (!container) {
    console.error('❌ Contenedor lista-citas-movil NO encontrado');
    return;
  }

  const citas = window.appState?.agenda?.citas || [];
  console.log('📊 Citas:', citas.length);

  if (citas.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-text">No hay citas<br><small>Crea una nueva con el botón 📅</small></div></div>';
    return;
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  container.innerHTML = citas.map(c => {
    const fechaStr = Array.isArray(c.fecha) ? `${c.fecha[2]}/${c.fecha[1]}/${c.fecha[0]}` : c.fecha;
    let cardStyle = '';
    let alertaHtml = '';

    if (c.fecha) {
      let fechaCita;
      if (Array.isArray(c.fecha)) {
        fechaCita = new Date(c.fecha[0], c.fecha[1] - 1, c.fecha[2]);
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
          // FECHA PASADA - Toda la tarjeta en rojo
          cardStyle = 'background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%); border-left: 4px solid #f44336;';
          alertaHtml = '<div style="background:#f44336;color:white;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:bold;margin-top:8px;">⚠️⚠️⚠️ Fecha pasada</div>';
        } else if (fechaCita.getTime() === hoy.getTime()) {
          // PARA HOY - Toda la tarjeta en amarillo
          cardStyle = 'background: linear-gradient(135deg, #fffde7 0%, #fff9c4 100%); border-left: 4px solid #fbc02d;';
          alertaHtml = '<div style="background:#fbc02d;color:#000;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:bold;margin-top:8px;">⚠️ Para hoy</div>';
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
            ${alertaHtml}
          </div>
          <div class="task-buttons">
            <button class="task-btn btn-edit" onclick="editarCita('${c.id}')" title="Editar">✏️</button>
            <button class="task-btn btn-delete" onclick="eliminarCita('${c.id}')" title="Eliminar">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  console.log('✅ Citas renderizadas');
}

function renderizarListasMovil() {
  console.log('📋 Renderizando listas');
  const container = document.getElementById('listas-personalizadas-movil');
  if (!container) {
    console.error('❌ Contenedor listas-personalizadas-movil NO encontrado');
    return;
  }

  const listas = window.configVisual?.listasPersonalizadas || [];
  console.log('📊 Listas encontradas:', listas.length);

  if (listas.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">No hay listas personalizadas<br><small>Crea una en Configuración</small></div></div>';
    return;
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let html = '';
  let totalTareas = 0;

  listas.forEach(lista => {
    const tareas = lista.tareas || [];
    const activas = tareas.filter(t => !t.completada);
    totalTareas += activas.length;

    html += `
      <div style="background:${lista.color || '#667eea'};padding:16px;margin-bottom:12px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);color:white;">
        <div style="font-size:18px;font-weight:600;margin-bottom:8px;">${lista.emoji || '📝'} ${lista.nombre}</div>
        <div style="font-size:13px;opacity:0.9;">📊 ${activas.length} tareas activas</div>
      </div>
    `;

    activas.forEach(tarea => {
      let fechaStr = '';
      let alertaHtml = '';
      let cardStyle = `margin-left:20px;border-left:4px solid ${lista.color || '#667eea'};`; // Estilo base

      if (tarea.fecha) {
        let fechaTarea;

        if (Array.isArray(tarea.fecha)) {
          fechaStr = `${tarea.fecha[2]}/${tarea.fecha[1]}/${tarea.fecha[0]}`;
          fechaTarea = new Date(tarea.fecha[0], tarea.fecha[1] - 1, tarea.fecha[2]);
          fechaTarea.setHours(0, 0, 0, 0);
        } else if (typeof tarea.fecha === 'string') {
          fechaStr = tarea.fecha;
          // Intentar parsear diferentes formatos
          if (tarea.fecha.includes('-')) {
            const [year, month, day] = tarea.fecha.split('-').map(Number);
            fechaTarea = new Date(year, month - 1, day);
          } else if (tarea.fecha.includes('/')) {
            const parts = tarea.fecha.split('/');
            if (parts[2]?.length === 4) {
              fechaTarea = new Date(parts[2], parts[1] - 1, parts[0]);
            }
          }
        }

        if (fechaTarea) {
          fechaTarea.setHours(0, 0, 0, 0);
          if (fechaTarea < hoy) {
            // FECHA PASADA - Toda la tarjeta en rojo
            cardStyle = 'margin-left:20px;background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%); border-left: 4px solid #f44336;';
            alertaHtml = '<div style="background:#f44336;color:white;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:bold;margin-top:8px;">⚠️⚠️⚠️ Fecha pasada</div>';
          } else if (fechaTarea.getTime() === hoy.getTime()) {
            // PARA HOY - Toda la tarjeta en amarillo
            cardStyle = 'margin-left:20px;background: linear-gradient(135deg, #fffde7 0%, #fff9c4 100%); border-left: 4px solid #fbc02d;';
            alertaHtml = '<div style="background:#fbc02d;color:#000;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:bold;margin-top:8px;">⚠️ Para hoy</div>';
          }
        }
      }

      html += `
        <div class="task-card" style="${cardStyle}">
          <div class="task-main">
            <span class="task-icon">${lista.emoji || '📝'}</span>
            <div class="task-content-area">
              <div class="task-title">${tarea.texto || 'Sin título'}</div>
              <div class="task-meta">
                ${fechaStr ? `<span class="task-meta-item">📅 ${fechaStr}</span>` : ''}
                ${tarea.persona ? `<span class="task-meta-item">👤 ${tarea.persona}</span>` : ''}
                ${tarea.etiqueta ? `<span class="task-meta-item">🏷️ ${tarea.etiqueta}</span>` : ''}
              </div>
              ${alertaHtml}
            </div>
            <div class="task-buttons">
              <button class="task-btn btn-edit" onclick="editarTareaLista('${lista.id}', ${tarea.id})" title="Editar">✏️</button>
              <button class="task-btn btn-delete" onclick="eliminarTareaLista('${lista.id}', ${tarea.id})" title="Eliminar">🗑️</button>
            </div>
          </div>
          <div class="task-actions">
            <button class="action-btn btn-postpone" onclick="abrirModalMigrarLista('${lista.id}', ${tarea.id})" style="width:100%;">Posponer/Delegar</button>
          </div>
        </div>
      `;
    });
  });

  container.innerHTML = html;
  console.log('✅ Listas renderizadas:', listas.length, 'listas con', totalTareas, 'tareas');
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

  modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white;">
        <h4 style="margin: 0; font-size: 20px; font-weight: 600;">✏️ Editar Cita</h4>
      </div>
      
      <div style="padding: 24px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);">
        <div class="form-group" style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748; font-size: 14px;">📅 Nombre de la cita:</label>
          <input type="text" id="edit-cita-nombre" value="${cita.nombre || ''}" 
            style="width: 100%; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 15px; transition: all 0.3s ease; background: white;"
            onfocus="this.style.borderColor='#667eea'; this.style.boxShadow='0 0 0 3px rgba(102, 126, 234, 0.1)'"
            onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'"
            placeholder="Describe la cita...">
        </div>
        
        <div class="form-group" style="margin-bottom: 24px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748; font-size: 14px;">🏷️ Etiqueta (opcional):</label>
          <select id="edit-cita-etiqueta" 
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
  const nombre = document.getElementById('edit-cita-nombre').value.trim();
  const etiqueta = document.getElementById('edit-cita-etiqueta').value;

  if (!nombre) {
    alert('El nombre de la cita no puede estar vacío');
    return;
  }

  const cita = window.appState.agenda.citas.find(c => c.id == id);
  if (cita) {
    cita.nombre = nombre;
    cita.etiqueta = etiqueta || null;

    guardarJSON();
    renderizarCitasMovil();

    const modal = document.getElementById('modal-editar-cita-movil');
    if (modal) modal.remove();

    mostrarAlerta('✏️ Cita actualizada', 'success');
  }
}


// ==================== FUNCIONES AUXILIARES PARA LISTAS PERSONALIZADAS ====================

function completarTareaLista(listaId, tareaId) {
  const lista = window.configVisual.listasPersonalizadas.find(l => l.id === listaId);
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
  const lista = window.configVisual.listasPersonalizadas.find(l => l.id === listaId);
  if (!lista) return;

  lista.tareas = lista.tareas.filter(t => t.id != tareaId);
  guardarJSON();
  renderizarListasMovil();
  mostrarAlerta('🗑️ Tarea eliminada', 'success');
}

function editarTareaLista(listaId, tareaId) {
  const lista = window.configVisual.listasPersonalizadas.find(l => l.id === listaId);
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

  const lista = window.configVisual.listasPersonalizadas.find(l => l.id === listaId);
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

console.log('✅ bottom-nav.js COMPLETAMENTE CARGADO');
