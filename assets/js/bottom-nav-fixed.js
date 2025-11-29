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