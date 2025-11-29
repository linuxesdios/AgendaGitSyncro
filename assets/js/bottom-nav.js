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
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">✨ No hay tareas críticas</div>';
    return;
  }
  
  container.innerHTML = activas.map(t => `
    <div style="background:white;padding:16px;margin-bottom:12px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      <div style="font-size:16px;font-weight:600;color:#2d5a27;margin-bottom:8px;">🚨 ${t.titulo || 'Sin título'}</div>
      <div style="font-size:13px;color:#666;">📅 ${t.fecha_fin || 'Sin fecha'}</div>
      ${t.persona ? `<div style="font-size:13px;color:#666;margin-top:4px;">👤 ${t.persona}</div>` : ''}
      ${t.etiqueta ? `<div style="font-size:13px;color:#666;margin-top:4px;">#${t.etiqueta}</div>` : ''}
    </div>
  `).join('');
  
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
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">No hay citas</div>';
    return;
  }
  
  container.innerHTML = citas.map(c => `
    <div style="background:white;padding:16px;margin-bottom:12px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      <div style="font-size:16px;font-weight:600;color:#2d5a27;margin-bottom:8px;">📅 ${c.nombre || 'Sin título'}</div>
      ${c.hora ? `<div style="font-size:13px;color:#666;">⏰ ${c.hora}</div>` : ''}
      ${c.lugar ? `<div style="font-size:13px;color:#666;">📍 ${c.lugar}</div>` : ''}
    </div>
  `).join('');
  
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
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">📋 No hay listas personalizadas</div>';
    return;
  }
  
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
      html += `
        <div style="background:white;padding:14px;margin-bottom:8px;margin-left:20px;border-radius:8px;border-left:4px solid ${lista.color || '#667eea'};box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <div style="font-size:14px;font-weight:500;color:#2d5a27;margin-bottom:4px;">${tarea.texto || 'Sin título'}</div>
          ${tarea.fecha ? `<div style="font-size:12px;color:#666;">📅 ${tarea.fecha}</div>` : ''}
          ${tarea.persona ? `<div style="font-size:12px;color:#666;margin-top:2px;">👤 ${tarea.persona}</div>` : ''}
        </div>
      `;
    });
  });
  
  container.innerHTML = html;
  console.log('✅ Listas renderizadas:', listas.length, 'listas con', totalTareas, 'tareas');
}

console.log('✅ bottom-nav.js COMPLETAMENTE CARGADO');
