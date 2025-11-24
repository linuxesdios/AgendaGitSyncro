// ========== VISOR DE HISTORIAL ==========

function abrirVisorHistorial() {

  // Crear modal de historial
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-historial';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 800px; max-height: 80vh;">
      <h4>📊 Historial de Tareas Completadas</h4>
      <div id="historial-filtros" style="margin-bottom: 20px;">
        <select id="historial-periodo" onchange="filtrarHistorial()" style="padding: 8px; margin-right: 10px;">
          <option value="7">Últimos 7 días</option>
          <option value="30" selected>Últimos 30 días</option>
          <option value="90">Últimos 90 días</option>
          <option value="365">Último año</option>
        </select>
        <select id="historial-tipo" onchange="filtrarHistorial()" style="padding: 8px;">
          <option value="todas">Todas las tareas</option>
          <option value="criticas">Solo críticas</option>
          <option value="normales">Solo normales</option>
        </select>
      </div>
      <div id="historial-stats" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;"></div>
      <div id="historial-contenido" style="max-height: 400px; overflow-y: auto;"></div>
      <div class="modal-botones">
        <button class="btn-secundario" onclick="cerrarModal('modal-historial')">Cerrar</button>
        <button class="btn-primario" onclick="exportarHistorial()">Exportar CSV</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  const historial = window.historialCompleto || [];

  // Filtrar por período
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - periodo);

  let historialFiltrado = historial.filter(tarea => {
    const fechaTarea = new Date(tarea.timestamp || tarea.fecha + 'T00:00:00');
    return fechaTarea >= fechaLimite;
  });

  // Filtrar por tipo
  if (tipo === 'criticas') {
    historialFiltrado = historialFiltrado.filter(t => t.esCritica);
  } else if (tipo === 'normales') {
    historialFiltrado = historialFiltrado.filter(t => !t.esCritica);
  }

  // Mostrar estadísticas
  mostrarEstadisticasHistorial(historialFiltrado, periodo);

  // Mostrar lista
  mostrarListaHistorial(historialFiltrado);
}

function mostrarEstadisticasHistorial(historial, periodo) {
  const stats = document.getElementById('historial-stats');
  if (!stats) return;

  const total = historial.length;
  const criticas = historial.filter(t => t.esCritica).length;
  const normales = total - criticas;
  const promedioDiario = Math.round((total / periodo) * 10) / 10;

  // Agrupar por día
  const porDia = {};
  historial.forEach(tarea => {
    const fecha = tarea.fecha;
    porDia[fecha] = (porDia[fecha] || 0) + 1;
  });

  const mejorDia = Object.entries(porDia).reduce((max, [fecha, count]) =>
    count > max.count ? { fecha, count } : max, { fecha: '', count: 0 });

  stats.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; text-align: center;">
      <div>
        <div style="font-size: 24px; font-weight: bold; color: #4ecdc4;">${total}</div>
        <div style="font-size: 12px; color: #666;">Total completadas</div>
      </div>
      <div>
        <div style="font-size: 24px; font-weight: bold; color: #f44336;">${criticas}</div>
        <div style="font-size: 12px; color: #666;">Críticas</div>
      </div>
      <div>
        <div style="font-size: 24px; font-weight: bold; color: #2196f3;">${normales}</div>
        <div style="font-size: 12px; color: #666;">Normales</div>
      </div>
      <div>
        <div style="font-size: 24px; font-weight: bold; color: #ff9800;">${promedioDiario}</div>
        <div style="font-size: 12px; color: #666;">Por día</div>
      </div>
      ${mejorDia.count > 0 ? `
      <div>
        <div style="font-size: 18px; font-weight: bold; color: #4caf50;">${mejorDia.count}</div>
        <div style="font-size: 12px; color: #666;">Mejor día (${mejorDia.fecha})</div>
      </div>
      ` : ''}
    </div>
  `;
}

function mostrarListaHistorial(historial) {
  const contenido = document.getElementById('historial-contenido');
  if (!contenido) return;

  if (historial.length === 0) {
    contenido.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">📝 No hay tareas en este período</div>';
    return;
  }

  // Ordenar por fecha/hora más reciente
  historial.sort((a, b) => {
    const fechaA = new Date(a.timestamp || a.fecha + 'T' + (a.hora || '00:00') + ':00');
    const fechaB = new Date(b.timestamp || b.fecha + 'T' + (b.hora || '00:00') + ':00');
    return fechaB - fechaA;
  });

  // Agrupar por fecha
  const porFecha = {};
  historial.forEach(tarea => {
    const fecha = tarea.fecha;
    if (!porFecha[fecha]) porFecha[fecha] = [];
    porFecha[fecha].push(tarea);
  });

  let html = '';
  Object.entries(porFecha).forEach(([fecha, tareas]) => {
    const fechaObj = new Date(fecha + 'T00:00:00');
    const fechaFormateada = fechaObj.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    html += `
      <div style="margin-bottom: 20px;">
        <h5 style="background: #4ecdc4; color: white; padding: 8px 12px; border-radius: 6px; margin: 0 0 10px 0; font-size: 14px;">
          📅 ${fechaFormateada} (${tareas.length} tareas)
        </h5>
        <div style="margin-left: 15px;">
    `;

    tareas.forEach(tarea => {
      const icono = tarea.esCritica ? '🚨' : '✅';
      const color = tarea.esCritica ? '#f44336' : '#4caf50';

      html += `
        <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: #f8f9fa; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid ${color};">
          <span style="font-size: 16px;">${icono}</span>
          <div style="flex: 1;">
            <div style="font-weight: 500; color: #2c3e50;">${escapeHtml(tarea.texto)}</div>
            ${tarea.fechaLimite ? `<div style="font-size: 11px; color: #666;">📅 Límite: ${tarea.fechaLimite}</div>` : ''}
          </div>
          <div style="font-size: 12px; color: #666; text-align: right;">
            ${tarea.hora || 'Sin hora'}
          </div>
        </div>
      `;
    });

    html += '</div></div>';
  });

  contenido.innerHTML = html;
}

function exportarHistorial() {
  const historial = window.historialCompleto || [];
  if (historial.length === 0) {
    mostrarAlerta('❌ No hay datos para exportar', 'error');
    return;
  }

  // Crear CSV
  let csv = 'Fecha,Hora,Tarea,Tipo,Fecha Límite\n';
  historial.forEach(tarea => {
    const tipo = tarea.esCritica ? 'Crítica' : 'Normal';
    const fechaLimite = tarea.fechaLimite || '';
    const texto = (tarea.texto || '').replace(/"/g, '""'); // Escapar comillas

    csv += `"${tarea.fecha}","${tarea.hora || ''}","${texto}","${tipo}","${fechaLimite}"\n`;
  });

  // Descargar archivo
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `historial-tareas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  mostrarAlerta('📊 Historial exportado', 'success');
}

// Hacer funciones disponibles globalmente
window.abrirVisorHistorial = abrirVisorHistorial;
// window.cargarHistorialCompleto = cargarHistorialCompleto; // Función no implementada
window.filtrarHistorial = filtrarHistorial;
window.mostrarEstadisticasHistorial = mostrarEstadisticasHistorial;
window.mostrarListaHistorial = mostrarListaHistorial;
window.exportarHistorial = exportarHistorial;