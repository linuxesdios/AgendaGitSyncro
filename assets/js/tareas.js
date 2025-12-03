// ========== GESTIÓN DE TAREAS ==========

// ========== FUNCIONES AUXILIARES PARA FECHAS ==========
/**
 * Separa una fecha en sus componentes de fecha y hora
 * @param {string|null|undefined} fecha - Fecha en formato ISO o YYYY-MM-DD
 * @returns {{fecha: string, hora: string}} Objeto con fecha (YYYY-MM-DD) y hora (HH:MM)
 */
function separarFechaHora(fecha) {
  if (!fecha) return { fecha: '', hora: '' };

  if (typeof fecha === 'string') {
    // Si ya tiene formato datetime (contiene 'T')
    if (fecha.includes('T')) {
      const [fechaParte, horaParte] = fecha.split('T');
      return {
        fecha: fechaParte,
        hora: horaParte ? horaParte.slice(0, 5) : '' // HH:MM
      };
    }

    // Si solo tiene fecha (YYYY-MM-DD)
    if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return { fecha: fecha, hora: '' };
    }
  }

  if (Array.isArray(fecha)) {
    const [year, month, day] = fecha;
    return {
      fecha: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      hora: ''
    };
  }

  return { fecha: '', hora: '' };
}

/**
 * Extrae solo la parte de fecha de un datetime
 * @param {string|null|undefined} fecha - Fecha en cualquier formato
 * @returns {string|null} Fecha en formato YYYY-MM-DD o null
 */
function extraerSoloFecha(fecha) {
  if (!fecha) return null;

  if (typeof fecha === 'string') {
    // Si tiene 'T', extraer solo la fecha
    if (fecha.includes('T')) {
      return fecha.split('T')[0];
    }
    // Si ya es formato YYYY-MM-DD
    if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return fecha;
    }
    // Si es formato DD-MM-YYYY, convertir a YYYY-MM-DD
    if (fecha.match(/^\d{2}-\d{2}-\d{4}$/)) {
      const [dia, mes, anio] = fecha.split('-');
      return `${anio}-${mes}-${dia}`;
    }
    // Si es formato DD/MM/YYYY, convertir a YYYY-MM-DD
    if (fecha.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [dia, mes, anio] = fecha.split('/');
      return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
  }

  if (Array.isArray(fecha)) {
    const [year, month, day] = fecha;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

/**
 * Combina fecha y hora en formato ISO (YYYY-MM-DDTHH:MM)
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @param {string} hora - Hora en formato HH:MM (opcional)
 * @returns {string|null} Fecha combinada o solo fecha si no hay hora
 */
function combinarFechaHora(fecha, hora) {
  if (!fecha) return null;

  // Si hay hora, combinar
  if (hora && hora.trim()) {
    return `${fecha}T${hora}`;
  }

  // Si no hay hora, devolver solo la fecha
  return fecha;
}

/**
 * Formatea una fecha para mostrar en formato legible (dd/mm/yyyy hh:mm)
 * @param {string|null|undefined} fecha - Fecha en cualquier formato
 * @returns {string} Fecha formateada para mostrar
 */
function formatearFechaParaMostrar(fecha) {
  if (!fecha) return '';

  if (typeof fecha === 'string') {
    let fechaParte, horaParte;

    // Si tiene hora (formato YYYY-MM-DDTHH:MM o ISO)
    if (fecha.includes('T')) {
      [fechaParte, horaParte] = fecha.split('T');
    } else {
      fechaParte = fecha;
    }

    // Convertir fecha a DD/MM/YYYY
    const partes = fechaParte.split('-');
    if (partes.length === 3) {
      let day, month, year;

      // Detectar si es YYYY-MM-DD o DD-MM-YYYY
      if (partes[0].length === 4) {
        // YYYY-MM-DD
        [year, month, day] = partes;
      } else {
        // DD-MM-YYYY
        [day, month, year] = partes;
      }

      let resultado = `${day}/${month}/${year}`;

      // Agregar hora si existe
      if (horaParte) {
        const hora = horaParte.slice(0, 5); // HH:MM
        resultado += ` ${hora}`;
      }

      return resultado;
    }

    return fecha;
  }

  if (Array.isArray(fecha)) {
    const [year, month, day] = fecha;
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }

  return '';
}

// ========== RENDERIZAR TAREAS ==========
function renderizar() {
  requestAnimationFrame(() => {
    renderizarCriticas();
    renderizarTareas();
    if (typeof renderCitasPanel === 'function') {
      renderCitasPanel();
    }

    // Renderizar listas personalizadas
    if (typeof renderizarTodasLasListasPersonalizadas === 'function') {
      renderizarTodasLasListasPersonalizadas();
    }

    // Actualizar filtros para mantener opciones actualizadas
    if (typeof actualizarFiltrosPersonas === 'function') {
      actualizarFiltrosPersonas();
    }
    if (typeof actualizarFiltrosEtiquetas === 'function') {
      actualizarFiltrosEtiquetas();
    }

    // Solo renderizar calendario si el modal está abierto
    const calendarModal = document.getElementById('modal-calendar');
    if (calendarModal && calendarModal.style.display === 'flex') {
      renderCalendar();
      renderAllAppointmentsList();
      renderAppointmentsList();
    }
  });
}

// ========== OBTENER SÍMBOLO DE TAREA ==========
function obtenerSimbolo(tarea) {
  if (!tarea.estado) tarea.estado = 'pendiente';
  if (tarea.estado === 'migrada') return '→';
  if (tarea.estado === 'programada') return '<';
  return '●';
}

// ========== FUNCIONES COMPARTIDAS PARA TAREAS ==========
/**
 * Genera el HTML para mostrar una fecha con indicadores de urgencia
 * @param {string} fecha - Fecha en formato string
 * @param {boolean} esUrgente - Si la fecha es hoy o pasada
 * @returns {string} HTML formateado para la fecha
 */
function renderizarFechaConUrgencia(fecha, esUrgente) {
  if (!fecha) return '';

  const esPasada = esFechaPasada(fecha);
  const esHoy = esFechaHoy(fecha);
  const colorFecha = (esHoy || esPasada) ? '#ff1744' : '#666';
  const bgColor = esUrgente ? '#ffcdd2' : '#ffe5e5';
  const fontWeight = esUrgente ? 'bold' : 'normal';

  let textoFecha = '📅 ';
  if (esPasada) {
    textoFecha += '⚠️ VENCIDO - ';
  } else if (esHoy) {
    textoFecha += '⚠️ VENCE HOY - ';
  }
  textoFecha += fecha;

  return `<small style="background: ${bgColor}; color: ${colorFecha}; padding: 2px 6px; border-radius: 3px; font-weight: ${fontWeight};">${textoFecha}</small>`;
}

/**
 * Configura drag & drop en un elemento de tarea
 * @param {HTMLElement} div - Elemento div de la tarea
 * @param {string} tipo - Tipo de tarea ('critica', 'tarea', 'lista-personalizada')
 * @param {number} index - Índice de la tarea
 * @param {string} listaId - ID de la lista personalizada (opcional)
 */
function configurarDragAndDrop(div, tipo, index, listaId = null) {
  const configOpciones = window.configOpciones || {};
  const sinTactil = configOpciones.sinTactil || false;

  if (sinTactil) return; // No configurar si está deshabilitado

  div.draggable = !(typeof isMobile === 'function' && isMobile());
  div.dataset.tipo = tipo;
  div.dataset.index = index;

  if (listaId) {
    div.dataset.listaId = listaId;
  }

  // Eventos touch desactivados para evitar interferencia con scroll
  // Solo drag en desktop
  if (!(typeof isMobile === 'function' && isMobile())) {
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragend', handleDragEnd);
  }
}

/**
 * Crea un elemento de alerta de urgencia si es necesario
 * @param {boolean} esPasada - Si la fecha ya pasó
 * @param {boolean} esHoy - Si la fecha es hoy
 * @param {boolean} completada - Si la tarea está completada
 * @returns {HTMLElement|null} Elemento de alerta o null
 */
function crearAlertaUrgencia(esPasada, esHoy, completada) {
  if (completada) return null;

  const alerta = document.createElement('span');
  alerta.className = 'alerta-urgente';

  if (esPasada) {
    alerta.textContent = '⚠️⚠️⚠️ Fecha pasada';
    alerta.title = '¡Fecha pasada!';
    return alerta;
  } else if (esHoy) {
    alerta.textContent = '⚠️ Vence hoy';
    alerta.title = '¡Vence hoy!';
    return alerta;
  }

  return null;
}

function renderizarCriticas() {
  const lista = document.getElementById('lista-criticas');
  if (!lista) return;

  lista.innerHTML = '';

  if (!appState.agenda.tareas_criticas || appState.agenda.tareas_criticas.length === 0) {
    lista.innerHTML = '<div style="color:#777;padding:10px;text-align:center;">No hay tareas críticas</div>';
    return;
  }

  // Aplicar filtros
  let tareasFiltradas = filtrarTareas(appState.agenda.tareas_criticas, 'criticas');

  // Aplicar filtro de período
  if (typeof debeMotrarTareaPorPeriodo === 'function') {
    tareasFiltradas = tareasFiltradas.filter(tarea => debeMotrarTareaPorPeriodo(tarea, 'criticas'));
  }

  if (tareasFiltradas.length === 0) {
    lista.innerHTML = '<div style="color:#777;padding:10px;text-align:center;">No hay tareas que coincidan con los filtros</div>';
    return;
  }

  // Verificar configuración de opciones
  const configOpciones = window.configOpciones || {};
  const sinTactil = configOpciones.sinTactil || false;
  const mostrarBotonesBorrar = configOpciones.botonesBorrar || false;

  tareasFiltradas.forEach((tarea, index) => {
    // Encontrar el índice real en el array original
    const realIndex = appState.agenda.tareas_criticas.findIndex(t => t.id === tarea.id);
    const div = document.createElement('div');
    div.className = 'tarea-item';

    // Verificar si es urgente (fecha límite es hoy o pasada)
    const esUrgente = esFechaHoy(tarea.fecha_fin) || esFechaPasada(tarea.fecha_fin);
    if (esUrgente) {
      div.classList.add('urgente');
    }

    // Aplicar colores según modo de visualización
    aplicarColorVisualizacion(div, tarea, 'critica');

    // Guardar información de urgencia para mostrar icono
    if (esUrgente) {
      div.dataset.urgente = 'true';
    }

    const simbolo = document.createElement('span');
    simbolo.className = 'tarea-simbolo';
    simbolo.textContent = obtenerSimbolo(tarea);
    simbolo.onclick = () => cambiarEstadoCritica(realIndex);

    const texto = document.createElement('div');
    texto.className = 'tarea-texto';
    texto.style.cursor = 'pointer';
    let contenido = `<strong>${escapeHtml(tarea.titulo)}</strong>`;
    if (tarea.etiqueta) {
      const etiquetaInfo = obtenerEtiquetaInfo(tarea.etiqueta, 'tareas');
      if (etiquetaInfo) {
        contenido += ` <span style="background: rgba(78, 205, 196, 0.1); color: #2d5a27; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-left: 5px;">${etiquetaInfo.simbolo} ${etiquetaInfo.nombre}</span>`;
      }
    }
    if (tarea.fecha_fin) {
      const colorFecha = (esFechaHoy(tarea.fecha_fin) || esFechaPasada(tarea.fecha_fin)) ? '#ff1744' : '#666';
      contenido += ` <small style="background: ${esUrgente ? '#ffcdd2' : '#ffe5e5'}; color: ${colorFecha}; padding: 2px 6px; border-radius: 3px; font-weight: ${esUrgente ? 'bold' : 'normal'};">📅 ${formatearFechaParaMostrar(tarea.fecha_fin)}</small>`;
    }
    // Mostrar información de migración/delegación para tareas críticas
    if (tarea.persona || tarea.fecha_migrar) {
      contenido += ' <span style="font-size: 12px; color: #9c27b0; font-weight: bold;">→ ';
      if (tarea.persona) {
        contenido += `<span style="background: #e3f2fd; color: #1976d2; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; margin-right: 5px;">👤 ${escapeHtml(tarea.persona)}</span>`;
      }
      if (tarea.fecha_migrar) {
        const colorMigrar = esFechaHoy(tarea.fecha_migrar) ? '#ff1744' : '#666';
        contenido += `<span style="background: ${esFechaHoy(tarea.fecha_migrar) ? '#ffcdd2' : '#ffe5e5'}; color: ${colorMigrar}; padding: 3px 8px; border-radius: 4px; font-weight: ${esFechaHoy(tarea.fecha_migrar) ? 'bold' : 'normal'}; font-size: 12px;">📅 ${formatearFechaParaMostrar(tarea.fecha_migrar)}</span>`;
      }
      contenido += '</span>';
    }
    texto.innerHTML = contenido;
    texto.onclick = () => abrirEditorTarea(realIndex, 'critica');

    div.appendChild(simbolo);
    div.appendChild(texto);

    // Botón de subtareas para tareas críticas
    const btnSubtareaCritica = document.createElement('button');
    btnSubtareaCritica.className = 'btn-subtarea';
    btnSubtareaCritica.textContent = '📝';
    btnSubtareaCritica.title = 'Añadir subtarea';
    btnSubtareaCritica.onclick = (e) => {
      e.stopPropagation();
      abrirModalSubtareaCritica(realIndex);
    };
    div.appendChild(btnSubtareaCritica);

    // Botón de Pomodoro
    const btnPomodoro = document.createElement('button');
    btnPomodoro.className = 'btn-pomodoro-tarea';
    btnPomodoro.textContent = '🍅';
    btnPomodoro.title = 'Iniciar Pomodoro para esta tarea';
    btnPomodoro.onclick = (e) => {
      e.stopPropagation();
      iniciarPomodoroConTarea(tarea.titulo);
    };
    div.appendChild(btnPomodoro);

    // Botón de sincronizar con Google
    const btnSync = document.createElement('button');
    btnSync.className = 'btn-borrar-tarea';
    btnSync.textContent = '📅';
    btnSync.title = 'Sincronizar con Google Calendar';
    btnSync.style.background = '#4285F4';
    btnSync.onclick = (e) => {
      e.stopPropagation();
      if (typeof syncSingleEventToGoogle === 'function') {
        syncSingleEventToGoogle(tarea.id, 'tarea');
      }
    };
    div.appendChild(btnSync);

    // Botón de Reprogramar/Delegar
    const btnReprogramar = document.createElement('button');
    btnReprogramar.className = 'btn-reprogramar-tarea';
    btnReprogramar.textContent = '🔄';
    btnReprogramar.title = 'Reprogramar o Delegar';
    btnReprogramar.onclick = (e) => {
      e.stopPropagation();
      // Abrir modal para reprogramar o delegar la tarea
      if (typeof abrirModalReprogramar === 'function') {
        abrirModalReprogramar(tarea, 'critica', realIndex);
      } else {
        // Fallback: editar la tarea
        abrirEditorTarea(realIndex, 'critica');
      }
    };
    div.appendChild(btnReprogramar);

    // Botón de borrar
    const btnBorrar = document.createElement('button');
    btnBorrar.className = 'btn-borrar-tarea';
    btnBorrar.textContent = '🗑️';
    btnBorrar.title = 'Eliminar tarea crítica';
    btnBorrar.onclick = (e) => {
      e.stopPropagation();
      mostrarCuentaRegresiva(() => {
        moverAHistorial(tarea, 'tarea_critica');
        registrarAccion('Eliminar tarea crítica', tarea.titulo);
        appState.agenda.tareas_criticas.splice(realIndex, 1);
        renderizar();
        guardarJSON(true);
      });
    };
    div.appendChild(btnBorrar);

    // Agregar alerta si es urgente o pasada
    {
      if (esFechaPasada(tarea.fecha_fin)) {
        const alerta = document.createElement('span');
        alerta.className = 'alerta-urgente';
        alerta.textContent = '⚠️⚠️⚠️ Fecha pasada';
        alerta.title = '¡Fecha pasada!';
        div.appendChild(alerta);
      } else if (esUrgente) {
        const alerta = document.createElement('span');
        alerta.className = 'alerta-urgente';
        alerta.textContent = '⚠️ Vence hoy';
        alerta.title = '¡Vence hoy!';
        div.appendChild(alerta);
      }
    }

    // Drag & Drop / Touch - solo si NO está deshabilitado
    if (!sinTactil) {
      div.draggable = !(typeof isMobile === 'function' && isMobile());
      div.dataset.tipo = 'critica';
      div.dataset.index = realIndex;

      // Eventos touch para móvil
      // Eventos touch desactivados para evitar interferencia con scroll
      if (!(typeof isMobile === 'function' && isMobile())) {
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragend', handleDragEnd);
      }
    }

    lista.appendChild(div);

    // Renderizar subtareas si existen
    if (tarea.subtareas && tarea.subtareas.length > 0) {
      tarea.subtareas.forEach((subtarea, subIndex) => {
        const subDiv = document.createElement('div');
        subDiv.className = 'subtarea-item';

        const subSimbolo = document.createElement('span');
        subSimbolo.className = 'subtarea-simbolo';
        subSimbolo.textContent = obtenerSimboloSubtarea(subtarea);
        subSimbolo.onclick = () => cambiarEstadoSubtareaCritica(realIndex, subIndex);

        const subTexto = document.createElement('div');
        subTexto.className = 'subtarea-texto';
        subTexto.style.cursor = 'pointer';
        let contenidoSub = subtarea.texto;
        if (subtarea.persona || subtarea.fecha_migrar) {
          contenidoSub += ' <span style="font-size: 11px; color: #9c27b0;">→ ';
          if (subtarea.persona) {
            contenidoSub += `<span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 3px; font-size: 10px;">👤 ${escapeHtml(subtarea.persona)}</span>`;
          }
          if (subtarea.fecha_migrar) {
            contenidoSub += `<span style="background: #ffe5e5; color: #666; padding: 2px 6px; border-radius: 3px; font-size: 10px;">📅 ${formatearFechaParaMostrar(subtarea.fecha_migrar)}</span>`;
          }
          contenidoSub += '</span>';
        }
        subTexto.innerHTML = contenidoSub;
        subTexto.onclick = () => abrirEditorSubtarea(realIndex, subIndex, 'critica');

        const btnBorrarSub = document.createElement('button');
        btnBorrarSub.className = 'btn-borrar-subtarea';
        btnBorrarSub.textContent = '🗑️';
        btnBorrarSub.onclick = (e) => {
          e.stopPropagation();
          eliminarSubtareaCritica(realIndex, subIndex);
        };

        subDiv.appendChild(subSimbolo);
        subDiv.appendChild(subTexto);
        subDiv.appendChild(btnBorrarSub);
        lista.appendChild(subDiv);
      });
    }
  });
}

function renderizarTareas() {
  const lista = document.getElementById('lista-metodo');
  // Esta función ya no es necesaria ya que las tareas se manejan a través de listas personalizadas
  if (!lista) return;

  lista.innerHTML = '';

  if (!appState.agenda.tareas || appState.agenda.tareas.length === 0) {
    lista.innerHTML = '<div style="color:#777;padding:10px;text-align:center;">No hay tareas</div>';
    return;
  }

  // Verificar configuración de opciones
  const configOpciones = window.configOpciones || {};
  const mostrarTodo = configOpciones.mostrarTodo || false;
  const sinTactil = configOpciones.sinTactil || false;
  const mostrarBotonesBorrar = configOpciones.botonesBorrar || false;

  // Mostrar todas las tareas siempre
  let tareasFiltradas = appState.agenda.tareas;

  // Aplicar filtros adicionales
  tareasFiltradas = filtrarTareas(tareasFiltradas, 'tareas');

  if (tareasFiltradas.length === 0) {
    const mensaje = appState.filtros.tareas.estado || appState.filtros.tareas.fecha || appState.filtros.tareas.prioridad ?
      'No hay tareas que coincidan con los filtros' :
      'No hay tareas';
    lista.innerHTML = `<div style="color:#777;padding:10px;text-align:center;">${mensaje}</div>`;
    return;
  }

  tareasFiltradas.forEach((tarea, index) => {
    // Encontrar el índice real en el array original
    const realIndex = appState.agenda.tareas.findIndex(t => t.id === tarea.id);
    const div = document.createElement('div');
    div.className = 'tarea-item';

    // Verificar si es urgente (fecha límite o migración es hoy o pasada)
    const esUrgente = esFechaHoy(tarea.fecha_fin) || esFechaHoy(tarea.fecha_migrar) || esFechaPasada(tarea.fecha_fin) || esFechaPasada(tarea.fecha_migrar);
    if (esUrgente) {
      div.classList.add('urgente');
    }

    // Aplicar colores según modo de visualización
    aplicarColorVisualizacion(div, tarea, 'tarea');

    // Guardar información de urgencia para mostrar icono
    if (esUrgente) {
      div.dataset.urgente = 'true';
    }

    const simbolo = document.createElement('span');
    simbolo.className = 'tarea-simbolo';
    simbolo.textContent = obtenerSimbolo(tarea);
    simbolo.onclick = () => cambiarEstadoTarea(realIndex);

    const texto = document.createElement('div');
    texto.className = 'tarea-texto';
    texto.style.cursor = 'pointer';
    let contenido = escapeHtml(tarea.texto);
    if (tarea.etiqueta) {
      const etiquetaInfo = obtenerEtiquetaInfo(tarea.etiqueta, 'tareas');
      if (etiquetaInfo) {
        contenido += ` <span style="background: rgba(78, 205, 196, 0.1); color: #2d5a27; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-left: 5px;">${etiquetaInfo.simbolo} ${etiquetaInfo.nombre}</span>`;
      }
    }
    if (tarea.fecha_fin) {
      const colorFecha = (esFechaHoy(tarea.fecha_fin) || esFechaPasada(tarea.fecha_fin)) ? '#ff1744' : '#666';
      contenido += ` <small style="background: ${esFechaHoy(tarea.fecha_fin) ? '#ffcdd2' : '#ffe5e5'}; color: ${colorFecha}; padding: 2px 6px; border-radius: 3px; font-weight: ${esFechaHoy(tarea.fecha_fin) ? 'bold' : 'normal'}; font-size: 10px;">hacer antes de 📅 ${formatearFechaParaMostrar(tarea.fecha_fin)}</small>`;
    }
    // Mostrar información de migración/delegación
    if (tarea.persona || tarea.fecha_migrar) {
      contenido += ' <span style="font-size: 12px; color: #9c27b0; font-weight: bold;">→ ';
      if (tarea.persona) {
        contenido += `<span style="background: #e3f2fd; color: #1976d2; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; margin-right: 5px;">👤 ${escapeHtml(tarea.persona)}</span>`;
      }
      if (tarea.fecha_migrar) {
        const colorMigrar = esFechaHoy(tarea.fecha_migrar) ? '#ff1744' : '#666';
        contenido += `<span style="background: ${esFechaHoy(tarea.fecha_migrar) ? '#ffcdd2' : '#ffe5e5'}; color: ${colorMigrar}; padding: 3px 8px; border-radius: 4px; font-weight: ${esFechaHoy(tarea.fecha_migrar) ? 'bold' : 'normal'}; font-size: 12px;">📅 ${formatearFechaParaMostrar(tarea.fecha_migrar)}</span>`;
      }
      contenido += '</span>';
    }
    texto.innerHTML = contenido;
    texto.onclick = () => abrirEditorTarea(realIndex, 'tarea');

    div.appendChild(simbolo);
    div.appendChild(texto);

    // Botón de subtareas - solo para tareas normales
    const btnSubtarea = document.createElement('button');
    btnSubtarea.className = 'btn-subtarea';
    btnSubtarea.textContent = '📝';
    btnSubtarea.title = 'Añadir subtarea';
    btnSubtarea.onclick = (e) => {
      e.stopPropagation();
      abrirModalSubtarea(realIndex);
    };
    div.appendChild(btnSubtarea);

    // Botón de Pomodoro
    const btnPomodoroNormal = document.createElement('button');
    btnPomodoroNormal.className = 'btn-pomodoro-tarea';
    btnPomodoroNormal.textContent = '🍅';
    btnPomodoroNormal.title = 'Iniciar Pomodoro para esta tarea';
    btnPomodoroNormal.onclick = (e) => {
      e.stopPropagation();
      iniciarPomodoroConTarea(tarea.texto);
    };
    div.appendChild(btnPomodoroNormal);

    // Botón de sincronizar con Google
    const btnSyncNormal = document.createElement('button');
    btnSyncNormal.className = 'btn-borrar-tarea';
    btnSyncNormal.textContent = '📅';
    btnSyncNormal.title = 'Sincronizar con Google Calendar';
    btnSyncNormal.style.background = '#4285F4';
    btnSyncNormal.onclick = (e) => {
      e.stopPropagation();
      if (typeof syncSingleEventToGoogle === 'function') {
        syncSingleEventToGoogle(tarea.id, 'tarea');
      }
    };
    div.appendChild(btnSyncNormal);

    // Botón de Reprogramar/Delegar
    const btnReprogramarNormal = document.createElement('button');
    btnReprogramarNormal.className = 'btn-reprogramar-tarea';
    btnReprogramarNormal.textContent = '🔄';
    btnReprogramarNormal.title = 'Reprogramar o Delegar';
    btnReprogramarNormal.onclick = (e) => {
      e.stopPropagation();
      // Abrir modal para reprogramar o delegar la tarea
      if (typeof abrirModalReprogramar === 'function') {
        abrirModalReprogramar(tarea, 'normal', realIndex);
      } else {
        // Fallback: editar la tarea
        abrirEditorTarea(realIndex, 'normal');
      }
    };
    div.appendChild(btnReprogramarNormal);

    // Botón de borrar
    const btnBorrar = document.createElement('button');
    btnBorrar.className = 'btn-borrar-tarea';
    btnBorrar.textContent = '🗑️';
    btnBorrar.title = 'Eliminar tarea';
    btnBorrar.onclick = (e) => {
      e.stopPropagation();
      mostrarCuentaRegresiva(() => {
        moverAHistorial(tarea, 'tarea');
        registrarAccion('Eliminar tarea', tarea.texto);
        appState.agenda.tareas.splice(realIndex, 1);
        renderizar();
        guardarJSON(true);
      });
    };
    div.appendChild(btnBorrar);

    // Agregar alerta si es urgente o pasada
    {
      if (esFechaPasada(tarea.fecha_fin) || esFechaPasada(tarea.fecha_migrar)) {
        const alerta = document.createElement('span');
        alerta.className = 'alerta-urgente';
        alerta.textContent = '⚠️⚠️⚠️ Fecha pasada';
        alerta.title = '¡Fecha pasada!';
        div.appendChild(alerta);
      } else if (esUrgente) {
        const alerta = document.createElement('span');
        alerta.className = 'alerta-urgente';
        alerta.textContent = esFechaHoy(tarea.fecha_fin) ? '⚠️ Vence hoy' : '⚠️ Programada para hoy';
        alerta.title = esFechaHoy(tarea.fecha_fin) ? '¡Vence hoy!' : '¡Programada para hoy!';
        div.appendChild(alerta);
      }
    }

    // Drag & Drop / Touch - solo si NO está deshabilitado
    if (!sinTactil) {
      div.draggable = !(typeof isMobile === 'function' && isMobile());
      div.dataset.tipo = 'tarea';
      div.dataset.index = realIndex;

      // Eventos touch para móvil
      // Eventos touch desactivados para evitar interferencia con scroll
      if (!(typeof isMobile === 'function' && isMobile())) {
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragend', handleDragEnd);
      }
    }

    lista.appendChild(div);

    // Renderizar subtareas si existen
    if (tarea.subtareas && tarea.subtareas.length > 0) {
      tarea.subtareas.forEach((subtarea, subIndex) => {
        const subDiv = document.createElement('div');
        subDiv.className = 'subtarea-item';

        const subSimbolo = document.createElement('span');
        subSimbolo.className = 'subtarea-simbolo';
        subSimbolo.textContent = obtenerSimboloSubtarea(subtarea);
        subSimbolo.onclick = () => cambiarEstadoSubtarea(realIndex, subIndex);

        const subTexto = document.createElement('div');
        subTexto.className = 'subtarea-texto';
        subTexto.style.cursor = 'pointer';
        let contenidoSub = subtarea.texto;
        if (subtarea.persona || subtarea.fecha_migrar) {
          contenidoSub += ' <span style="font-size: 11px; color: #9c27b0;">→ ';
          if (subtarea.persona) {
            contenidoSub += `<span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 3px; font-size: 10px;">👤 ${escapeHtml(subtarea.persona)}</span>`;
          }
          if (subtarea.fecha_migrar) {
            contenidoSub += `<span style="background: #ffe5e5; color: #666; padding: 2px 6px; border-radius: 3px; font-size: 10px;">📅 ${formatearFechaParaMostrar(subtarea.fecha_migrar)}</span>`;
          }
          contenidoSub += '</span>';
        }
        subTexto.innerHTML = contenidoSub;
        subTexto.onclick = () => abrirEditorSubtarea(realIndex, subIndex, 'tarea');

        const btnBorrarSub = document.createElement('button');
        btnBorrarSub.className = 'btn-borrar-subtarea';
        btnBorrarSub.textContent = '🗑️';
        btnBorrarSub.onclick = (e) => {
          e.stopPropagation();
          eliminarSubtarea(realIndex, subIndex);
        };

        subDiv.appendChild(subSimbolo);
        subDiv.appendChild(subTexto);
        subDiv.appendChild(btnBorrarSub);
        lista.appendChild(subDiv);
      });
    }
  });
}

// ========== CAMBIAR ESTADO DE TAREAS ==========
async function cambiarEstadoCritica(index) {
  console.log('🎯 CLICK EN TAREA CRÍTICA:', { index });
  const tarea = appState.agenda.tareas_criticas[index];
  console.log('📊 Estado actual:', tarea.estado, '| Tarea:', tarea.titulo);

  if (tarea.estado === 'pendiente') {
    console.log('▶️ Pendiente → Migrada (abriendo modal migrar)');
    tarea.estado = 'migrada';
    appState.ui.tareaSeleccionada = { tipo: 'critica', index };
    abrirModal('modal-migrar');
    return;
  } else if (tarea.estado === 'migrada') {
    // Si tiene persona asignada, borrar tarea (ya está delegada)
    if (tarea.persona) {
      console.log('▶️ Migrada (con persona) → Eliminada (delegada)');
      mostrarCelebracion();
      moverAHistorial(tarea, 'tarea_critica');
      registrarAccion('Eliminar tarea crítica delegada', tarea.titulo);
      appState.agenda.tareas_criticas.splice(index, 1);
      renderizar();
      await guardarJSON(true);
      return;
    } else {
      console.log('▶️ Migrada (sin persona) → Programada');
      tarea.estado = 'programada';
      registrarAccion('Programar tarea crítica', tarea.titulo);
    }
  } else if (tarea.estado === 'programada') {
    console.log('▶️ Programada → Eliminada');
    mostrarCelebracion();
    moverAHistorial(tarea, 'tarea_critica');
    registrarAccion('Eliminar tarea crítica', tarea.titulo);
    appState.agenda.tareas_criticas.splice(index, 1);
    renderizar();
    await guardarJSON(true);
    return;
  }

  console.log('🔄 Renderizando y guardando...');
  renderizar();
  await guardarJSON(true); // Guardado inmediato
}

async function cambiarEstadoTarea(index) {
  console.log('🎯 CLICK EN TAREA NORMAL:', { index });
  const tarea = appState.agenda.tareas[index];
  console.log('📊 Estado actual:', tarea.estado, '| Tarea:', tarea.texto);

  if (tarea.estado === 'pendiente') {
    console.log('▶️ Pendiente → Migrada (abriendo modal migrar)');
    tarea.estado = 'migrada';
    appState.ui.tareaSeleccionada = { tipo: 'tarea', index };
    abrirModal('modal-migrar');
    return;
  } else if (tarea.estado === 'migrada') {
    // Si tiene persona asignada, borrar tarea (ya está delegada)
    if (tarea.persona) {
      console.log('▶️ Migrada (con persona) → Eliminada (delegada)');
      mostrarCelebracion();
      moverAHistorial(tarea, 'tarea');
      registrarAccion('Eliminar tarea delegada', tarea.texto);
      appState.agenda.tareas.splice(index, 1);
      renderizar();
      await guardarJSON(true);
      return;
    } else {
      console.log('▶️ Migrada (sin persona) → Programada');
      tarea.estado = 'programada';
      registrarAccion('Programar tarea', tarea.texto);
    }
  } else if (tarea.estado === 'programada') {
    console.log('▶️ Programada → Eliminada');
    mostrarCelebracion();
    moverAHistorial(tarea, 'tarea');
    registrarAccion('Eliminar tarea', tarea.texto);
    appState.agenda.tareas.splice(index, 1);
    renderizar();
    await guardarJSON(true);
    return;
  }

  console.log('🔄 Renderizando y guardando...');
  renderizar();
  await guardarJSON(true); // Guardado inmediato
}

// ========== MODALES ==========
function abrirModal(id) {
  document.getElementById(id).style.display = 'block';
  // Poner foco en el primer input del modal
  setTimeout(() => {
    const modal = document.getElementById(id);
    const firstInput = modal.querySelector('input[type="text"], textarea');
    if (firstInput) {
      firstInput.focus();
      // Configurar auto-capitalización para inputs del modal
      setupAutoCapitalize();
    }
    // Configurar selector de personas
    if (id === 'modal-migrar') {
      setupPersonasAutocomplete();
    }
    // Cargar etiquetas en selects
    if (id === 'modal-critica') {
      cargarEtiquetasEnSelect('critica-etiqueta', 'tareas');
    } else if (id === 'modal-tarea') {
      cargarEtiquetasEnSelect('tarea-etiqueta', 'tareas');
    } else if (id === 'modal-nueva-cita') {
      cargarEtiquetasEnSelect('nueva-cita-etiqueta', 'citas');
    }
  }, 100);
}

function cerrarModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'none';
    // Ocultar dropdown de personas
    const dropdown = document.getElementById('personas-dropdown');
    if (dropdown) dropdown.style.display = 'none';
    // Limpiar campos
    modal.querySelectorAll('input, textarea').forEach(el => {
      if (el.type === 'color') {
        el.value = '#4ecdc4'; // Color por defecto para inputs de color
      } else {
        el.value = '';
      }
    });
  }
}

// ========== NUEVAS TAREAS ==========
function nuevaTareaCritica() {
  abrirModal('modal-critica');
  setTimeout(() => document.getElementById('critica-titulo').focus(), 100);
}

async function agregarTareaCritica() {
  const titulo = document.getElementById('critica-titulo').value.trim();
  const fecha = document.getElementById('critica-fecha').value;
  const incluirHora = document.getElementById('critica-incluir-hora')?.checked || false;
  const hora = incluirHora ? (document.getElementById('critica-hora')?.value || '') : '';
  const etiqueta = document.getElementById('critica-etiqueta').value;

  if (!titulo) {
    alert('Por favor, ingresa un título');
    return;
  }

  // Combinar fecha y hora
  const fechaFinal = combinarFechaHora(fecha, hora);

  // Verificar si se debe forzar fecha (nueva configuración funcional)
  const configFuncionales = window.configFuncionales || {};
  if (configFuncionales.fechaObligatoria && !fecha) {
    alert('Debes seleccionar una fecha límite para crear la tarea');
    return;
  }

  if (appState.ui.criticaEditando !== null) {
    // Editando tarea crítica existente
    const tarea = appState.agenda.tareas_criticas[appState.ui.criticaEditando];
    tarea.titulo = titulo;
    tarea.fecha_fin = fecha;
    tarea.etiqueta = etiqueta || null;
    appState.ui.criticaEditando = null;
    registrarAccion('Editar tarea crítica', titulo);
  } else {
    // Nueva tarea crítica
    const nuevaTarea = {
      id: Date.now().toString(),
      titulo,
      razon: '',
      fecha_fin: fecha,
      etiqueta: etiqueta || null,
      completada: false,
      estado: 'pendiente',
      fecha_creacion: new Date().toISOString()
    };
    appState.agenda.tareas_criticas.push(nuevaTarea);
    registrarAccion('Crear tarea crítica', `"${titulo}" ${etiqueta ? `[${etiqueta}]` : ''} ${fecha ? `(vence: ${fecha})` : ''}`.trim());
  }

  cerrarModal('modal-critica');
  renderizar();
  await guardarJSON(true);
}

function nuevaTarea() {
  abrirModal('modal-tarea');
  setTimeout(() => document.getElementById('tarea-texto').focus(), 100);
}

async function agregarTarea() {
  const texto = document.getElementById('tarea-texto').value.trim();
  const fecha = document.getElementById('tarea-fecha').value;
  const etiqueta = document.getElementById('tarea-etiqueta').value;

  if (!texto) {
    alert('Por favor, ingresa una descripción');
    return;
  }

  // Verificar si se debe forzar fecha (nueva configuración funcional)
  const configFuncionales = window.configFuncionales || {};
  if (configFuncionales.fechaObligatoria && !fecha) {
    alert('Debes seleccionar una fecha límite para crear la tarea');
    return;
  }

  // VERIFICAR SI ES UNA TAREA PARA LISTA PERSONALIZADA
  const modal = document.getElementById('modal-tarea');
  const listaPersonalizadaId = modal ? modal.getAttribute('data-lista-personalizada') : null;

  if (listaPersonalizadaId) {
    console.log('🎯 Agregando tarea a lista personalizada:', listaPersonalizadaId);

    // Agregar a lista personalizada
    if (typeof agregarTareaAListaPersonalizada === 'function') {
      agregarTareaAListaPersonalizada(listaPersonalizadaId, texto, fecha);

      // Limpiar modal y cerrar
      document.getElementById('tarea-texto').value = '';
      document.getElementById('tarea-fecha').value = '';
      document.getElementById('tarea-etiqueta').value = '';
      modal.removeAttribute('data-lista-personalizada');

      // Restaurar título original
      const titulo = modal.querySelector('h4');
      if (titulo) {
        titulo.textContent = 'Nueva Tarea';
      }

      cerrarModal('modal-tarea');
      mostrarAlerta(`✅ Tarea agregada a la lista personalizada`, 'success');
      return;
    }
  }

  // VERIFICAR SI EXISTE UNA LISTA POR HACER PERSONALIZADA
  const configVisual = window.configVisual || {};
  const listasPersonalizadas = tareasData.listasPersonalizadas || [];
  const listaPorHacerPersonalizada = listasPersonalizadas.find(lista => lista.esListaPorDefecto === true);

  if (listaPorHacerPersonalizada) {
    console.log('🎯 Redirigiendo tarea a lista personalizada predeterminada:', listaPorHacerPersonalizada.nombre);

    // Si estamos editando, buscar la tarea en la lista personalizada
    if (appState.ui.tareaEditando !== null) {
      // Editar en lista personalizada
      const tareas = listaPorHacerPersonalizada.tareas || [];
      if (tareas[appState.ui.tareaEditando]) {
        tareas[appState.ui.tareaEditando].texto = texto;
        tareas[appState.ui.tareaEditando].fecha = fecha;
        tareas[appState.ui.tareaEditando].etiqueta = etiqueta || null;
        appState.ui.tareaEditando = null;

        // Guardar configuración actualizada
        if (typeof supabasePush === 'function') {
          supabasePush();
        }

        // Re-renderizar
        if (typeof renderizarListaPersonalizada === 'function') {
          renderizarListaPersonalizada(listaPorHacerPersonalizada.id);
        }

        console.log('✅ Tarea editada en lista personalizada');
        cerrarModal('modal-tarea');
        mostrarAlerta('✅ Tarea editada', 'success');
        return;
      }
    } else {
      // Agregar nueva tarea a lista personalizada
      if (typeof agregarTareaAListaPersonalizada === 'function') {
        agregarTareaAListaPersonalizada(listaPorHacerPersonalizada.id, texto, fecha);

        // Limpiar modal y cerrar
        document.getElementById('tarea-texto').value = '';
        document.getElementById('tarea-fecha').value = '';
        document.getElementById('tarea-etiqueta').value = '';

        cerrarModal('modal-tarea');
        mostrarAlerta('✅ Tarea agregada a lista personalizada', 'success');
        return;
      }
    }
  }

  if (appState.ui.tareaEditando !== null) {
    // Editando tarea existente (sistema tradicional)
    const tarea = appState.agenda.tareas[appState.ui.tareaEditando];
    tarea.texto = texto;
    tarea.fecha_fin = fecha;
    tarea.etiqueta = etiqueta || null;
    appState.ui.tareaEditando = null;
    registrarAccion('Editar tarea', texto);
  } else {
    // Nueva tarea (sistema tradicional)
    const nuevaTarea = {
      id: Date.now().toString(),
      texto,
      fecha_fin: fecha,
      etiqueta: etiqueta || null,
      completada: false,
      estado: 'pendiente',
      fecha_creacion: new Date().toISOString()
    };
    appState.agenda.tareas.push(nuevaTarea);
    registrarAccion('Crear tarea', `"${texto}" ${etiqueta ? `[${etiqueta}]` : ''} ${fecha ? `(vence: ${fecha})` : ''}`.trim());
  }

  cerrarModal('modal-tarea');
  renderizar();
  await guardarJSON(true);

  // Sincronizar con Google Tasks si está conectado
  if (typeof createGoogleTask === 'function' && appState.ui.tareaEditando === null) {
    const tareaRecienCreada = appState.agenda.tareas[appState.agenda.tareas.length - 1];
    if (tareaRecienCreada && !tareaRecienCreada.googleTaskId) {
      // Verificar si la sincronización de tareas está habilitada
      const syncOptions = JSON.parse(localStorage.getItem('googleCalendarSyncOptions') || '{"syncEvents":true,"syncTasks":false,"autoSync":true}');
      if (syncOptions.syncTasks && syncOptions.autoSync) {
        const tareaParaGoogle = {
          id: tareaRecienCreada.id,
          titulo: texto,
          nombre: texto,
          texto: texto,
          fecha: fecha || new Date().toISOString().split('T')[0],
          descripcion: texto,
          notas: texto,
          estado: tareaRecienCreada.estado
        };

        createGoogleTask(tareaParaGoogle).then(createdTask => {
          if (createdTask && createdTask.id) {
            // Guardar ID de Google Task
            const index = appState.agenda.tareas.findIndex(t => t.id === tareaRecienCreada.id);
            if (index !== -1) {
              appState.agenda.tareas[index].googleTaskId = createdTask.id;
              guardarJSON(false);
            }
            console.log('✅ Tarea sincronizada automáticamente con Google Tasks');
          }
        }).catch(error => {
          console.error('Error sincronizando tarea automáticamente:', error);
        });
      }
    }
  }

  // Cancelar auto-save programado después de guardado manual exitoso
  if (appState.sync.autoSaveTimer) {
    clearTimeout(appState.sync.autoSaveTimer);
    appState.sync.autoSaveTimer = null;
    console.log('✅ Auto-save cancelado después de guardado manual');
  }
}

function editarTarea(index) {
  const tarea = appState.agenda.tareas[index];
  appState.ui.tareaEditando = index;

  document.getElementById('tarea-texto').value = tarea.texto;
  document.getElementById('tarea-fecha').value = tarea.fecha_fin || '';

  abrirModal('modal-tarea');
}

function editarTareaCritica(indexOrId) {
  // Encontrar la tarea por  índice o por ID
  let index = indexOrId;
  let tarea;

  if (typeof indexOrId === 'string') {
    // Es un ID, buscar el índice
    index = appState.agenda.tareas_criticas.findIndex(t => t.id == indexOrId);
    if (index === -1) {
      console.warn('⚠️ Tarea crítica no encontrada (posiblemente eliminada)');
      return;
    }
  }

  tarea = appState.agenda.tareas_criticas[index];
  if (!tarea) {
    console.warn('⚠️ Tarea crítica no encontrada (posiblemente eliminada)');
    return;
  }
  appState.ui.criticaEditando = index;

  document.getElementById('critica-titulo').value = tarea.titulo;
  document.getElementById('critica-fecha').value = tarea.fecha_fin || '';

  abrirModal('modal-critica');
}

function guardarMigracion() {
  const fecha = document.getElementById('migrar-fecha').value;
  const selectPersona = document.getElementById('migrar-persona-select').value;
  let persona = '';

  if (selectPersona === '__otra__') {
    // Nueva persona desde input
    const inputPersona = document.getElementById('migrar-persona').value.trim();
    if (inputPersona) {
      persona = inputPersona;

      // Actualizar lista global si no existe
      if (!window.personasAsignadas) {
        window.personasAsignadas = [];
      }
      if (!window.personasAsignadas.includes(persona)) {
        window.personasAsignadas.push(persona);
        // Guardar DIRECTAMENTE en Supabase
        if (typeof supabasePush === 'function') {
          supabasePush();
        }
        registrarAccion('Añadir persona (desde tarea)', persona);
      }
    }
  } else if (selectPersona) {
    // Persona existente seleccionada
    persona = selectPersona;
  }

  // Verificar si es una subtarea
  if (appState.ui.subtareaSeleccionada) {
    const { tipo, tareaIndex, subIndex, listaId } = appState.ui.subtareaSeleccionada;

    // Subtarea de lista personalizada
    if (tipo === 'lista_personalizada') {
      const configVisual = window.configVisual || {};
      const listas = tareasData.listasPersonalizadas || [];
      const lista = listas.find(l => l.id === listaId);

      if (lista && lista.tareas[tareaIndex] && lista.tareas[tareaIndex].subtareas[subIndex]) {
        const subtarea = lista.tareas[tareaIndex].subtareas[subIndex];

        subtarea.fecha_fin = fecha || null;
        subtarea.persona = persona || null;
        subtarea.estado = persona ? 'migrada' : (fecha ? 'programada' : 'pendiente');

        window.configVisual = { ...configVisual, listasPersonalizadas: listas };

        appState.ui.subtareaSeleccionada = null;
        cerrarModal('modal-migrar');

        if (typeof renderizarListaPersonalizada === 'function') {
          renderizarListaPersonalizada(listaId);
        }
        if (typeof supabasePush === 'function') {
          supabasePush();
        }

        if (persona) {
          mostrarAlerta(`→ Subtarea asignada a ${persona}`, 'success');
        } else if (fecha) {
          mostrarAlerta(`→ Subtarea pospuesta para ${fecha}`, 'success');
        }
        return;
      }
    }

    // Subtarea de tarea crítica o normal
    const tarea = tipo === 'critica' ? appState.agenda.tareas_criticas[tareaIndex] : appState.agenda.tareas[tareaIndex];
    const subtarea = tarea.subtareas[subIndex];

    subtarea.fecha_fin = fecha || null;
    subtarea.persona = persona || null;
    subtarea.estado = persona ? 'migrada' : (fecha ? 'programada' : 'pendiente');

    appState.ui.subtareaSeleccionada = null;
    cerrarModal('modal-migrar');
    renderizar();
    guardarJSON(true);

    if (persona) {
      mostrarAlerta(`→ Subtarea asignada a ${persona}`, 'success');
    } else if (fecha) {
      mostrarAlerta(`→ Subtarea pospuesta para ${fecha}`, 'success');
    }
    return;
  }

  if (!appState.ui.tareaSeleccionada) {
    cerrarModal('modal-migrar');
    return;
  }

  const seleccion = appState.ui.tareaSeleccionada;
  const { tipo, index, listaId, tareaIndex } = seleccion;

  console.log('💾 GUARDANDO MIGRACIÓN:', { tipo, index, listaId, tareaIndex, persona, fecha });

  // ========== MANEJAR LISTAS PERSONALIZADAS ==========
  if (tipo === 'lista_personalizada') {
    const configVisual = window.configVisual || {};
    const listasPersonalizadas = tareasData.listasPersonalizadas || [];
    const lista = listasPersonalizadas.find(l => l.id === listaId);

    if (lista && lista.tareas[tareaIndex]) {
      const tarea = lista.tareas[tareaIndex];

      tarea.fecha_fin = fecha || null;
      tarea.persona = persona || null;
      tarea.estado = persona ? 'migrada' : (fecha ? 'programada' : 'pendiente');

      window.configVisual = { ...configVisual, listasPersonalizadas };
      if (typeof supabasePush === 'function') {
        supabasePush();
      }

      console.log('✅ Tarea de lista personalizada migrada:', tarea);

      appState.ui.tareaSeleccionada = null;
      cerrarModal('modal-migrar');

      setTimeout(() => {
        if (typeof renderizarListaPersonalizada === 'function') {
          renderizarListaPersonalizada(listaId);
        }
      }, 100);

      if (persona) {
        registrarAccion('Delegar tarea (lista personalizada)', `a ${persona}`);
        mostrarAlerta(`→ Tarea delegada a ${persona}`, 'success');
      } else if (fecha) {
        registrarAccion('Reprogramar tarea (lista personalizada)', `para ${fecha}`);
        mostrarAlerta(`→ Tarea reprogramada para ${fecha}`, 'success');
      }
      return;
    }
  }

  // ========== MANEJAR TAREAS NORMALES Y CRÍTICAS ==========
  const tarea = tipo === 'critica' ? appState.agenda.tareas_criticas[index] : appState.agenda.tareas[index];

  tarea.fecha_fin = fecha || null;
  tarea.persona = persona || null;
  // Si hay persona, mantener como migrada, si solo hay fecha, programada
  tarea.estado = persona ? 'migrada' : (fecha ? 'programada' : 'pendiente');

  appState.ui.tareaSeleccionada = null;
  cerrarModal('modal-migrar');

  // Forzar re-renderizado inmediato
  setTimeout(() => {
    renderizar();
  }, 100);

  guardarJSON(true);

  // Mostrar confirmación y registrar acción
  if (persona) {
    registrarAccion('Delegar tarea', `a ${persona}`);
    mostrarAlerta(`→ Tarea delegada a ${persona}`, 'success');
  } else if (fecha) {
    registrarAccion('Reprogramar tarea', `para ${fecha}`);
    mostrarAlerta(`→ Tarea reprogramada para ${fecha}`, 'success');
  }
}

// ========== FILTROS ==========
function filtrarTareas(tareas, tipo) {
  const filtros = appState.filtros[tipo];

  return tareas.filter(tarea => {
    // Filtro por estado
    if (filtros.estado && tarea.estado !== filtros.estado) {
      return false;
    }

    // Filtro por fecha
    if (filtros.fecha) {
      const fechaTarea = tarea.fecha_fin || tarea.fecha_migrar;

      switch (filtros.fecha) {
        case 'hoy':
          if (!esFechaHoy(fechaTarea)) return false;
          break;
        case 'pasadas':
          if (!esFechaPasada(fechaTarea)) return false;
          break;
        case 'proximas':
          if (!fechaTarea || esFechaHoy(fechaTarea) || esFechaPasada(fechaTarea)) return false;
          break;
        case 'sin-fecha':
          if (fechaTarea) return false;
          break;
      }
    }

    // Filtro por persona
    if (filtros.persona && tarea.persona !== filtros.persona) {
      return false;
    }

    // Filtro por etiqueta
    if (filtros.etiqueta && tarea.etiqueta !== filtros.etiqueta) {
      return false;
    }

    return true;
  });
}

function aplicarFiltros() {
  // Obtener valores de filtros para críticas
  appState.filtros.criticas.estado = document.getElementById('filtro-estado-criticas')?.value || '';
  appState.filtros.criticas.fecha = document.getElementById('filtro-fecha-criticas')?.value || '';
  appState.filtros.criticas.persona = document.getElementById('filtro-persona-criticas')?.value || '';
  appState.filtros.criticas.etiqueta = document.getElementById('filtro-etiqueta-criticas')?.value || '';

  // Obtener valores de filtros para tareas
  appState.filtros.tareas.estado = document.getElementById('filtro-estado-tareas')?.value || '';
  appState.filtros.tareas.fecha = document.getElementById('filtro-fecha-tareas')?.value || '';
  appState.filtros.tareas.persona = document.getElementById('filtro-persona-tareas')?.value || '';
  appState.filtros.tareas.etiqueta = document.getElementById('filtro-etiqueta-tareas')?.value || '';

  // Actualizar estilos visuales de filtros activos
  actualizarEstilosFiltros();

  // Re-renderizar
  renderizar();
}

function actualizarEstilosFiltros() {
  // Filtros de críticas
  const filtrosCriticas = ['filtro-estado-criticas', 'filtro-fecha-criticas', 'filtro-persona-criticas', 'filtro-etiqueta-criticas'];
  filtrosCriticas.forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      if (select.value) {
        select.classList.add('filtro-activo');
      } else {
        select.classList.remove('filtro-activo');
      }
    }
  });

  // Filtros de tareas
  const filtrosTareas = ['filtro-estado-tareas', 'filtro-fecha-tareas', 'filtro-persona-tareas', 'filtro-etiqueta-tareas'];
  filtrosTareas.forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      if (select.value) {
        select.classList.add('filtro-activo');
      } else {
        select.classList.remove('filtro-activo');
      }
    }
  });
}

function limpiarFiltros(tipo) {
  // Limpiar filtros del estado
  appState.filtros[tipo] = {
    estado: '',
    fecha: '',
    persona: '',
    etiqueta: ''
  };

  // Limpiar selects del DOM
  const filtros = [
    `filtro-estado-${tipo}`,
    `filtro-fecha-${tipo}`,
    `filtro-persona-${tipo}`,
    `filtro-etiqueta-${tipo}`
  ];

  filtros.forEach(id => {
    const select = document.getElementById(id);
    if (select) {
      select.value = '';
      select.classList.remove('filtro-activo');
    }
  });

  // Re-renderizar
  renderizar();

  mostrarAlerta(`🔄 Filtros de ${tipo} limpiados`, 'info');
}

function toggleFiltros(tipo) {
  const content = document.getElementById(`filtros-content-${tipo}`);
  const icon = document.getElementById(`filtros-icon-${tipo}`);

  // Verificar que los elementos existan antes de usarlos
  if (!content || !icon) return;

  if (content.classList.contains('visible')) {
    content.classList.remove('visible');
    icon.textContent = '▼';
  } else {
    content.classList.add('visible');
    icon.textContent = '▲';
  }
}

function scrollToTop() {
  const lista = document.getElementById('lista-metodo');
  if (lista) {
    lista.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function scrollToBottom() {
  const lista = document.getElementById('lista-metodo');
  if (lista && lista.lastElementChild) {
    lista.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}

function toggleLargoPlazo() {
  appState.ui.mostrarLargoPlazo = !appState.ui.mostrarLargoPlazo;
  renderizar();
}

// ========== AUTOCOMPLETADO DE PERSONAS ==========
function manejarSeleccionPersona() {
  const select = document.getElementById('migrar-persona-select');
  const inputDiv = document.getElementById('migrar-persona-input');
  const input = document.getElementById('migrar-persona');

  if (select.value === '__otra__') {
    inputDiv.style.display = 'block';
    input.focus();
  } else {
    inputDiv.style.display = 'none';
    input.value = '';
  }
}

function cargarPersonasEnSelect() {
  const personas = window.personasAsignadas || [];
  const select = document.getElementById('migrar-persona-select');
  if (!select) return;

  // Limpiar opciones existentes excepto las fijas
  select.innerHTML = `
    <option value="">No asignar</option>
    <option value="__otra__">➕ Otra persona...</option>
  `;

  // Añadir personas existentes
  personas.forEach(persona => {
    const option = document.createElement('option');
    option.value = persona;
    option.textContent = `👤 ${persona}`;
    select.appendChild(option);
  });
}

function setupPersonasAutocomplete() {
  // Cargar personas en el select
  cargarPersonasEnSelect();
}

// ========== CELEBRACIÓN ==========
function mostrarCelebracion() {
  // Obtener frases motivacionales personalizadas
  const configVisual = window.configVisual || {};
  const frasesPersonalizadas = configVisual.frases || [];

  const mensajesDefault = [
    '🎉 ¡Muy bien!',
    '✨ ¡Tarea completada!',
    '🚀 ¡Excelente trabajo!',
    '⭐ ¡Fantástico!',
    '🎯 ¡Objetivo cumplido!',
    '💪 ¡Sigue así!',
    '🏆 ¡Genial!',
    '🌟 ¡Increíble!'
  ];

  // Usar frases personalizadas si existen, sino usar las por defecto
  const mensajes = frasesPersonalizadas.length > 0 ? frasesPersonalizadas : mensajesDefault;
  const mensaje = mensajes[Math.floor(Math.random() * mensajes.length)];

  const popup = document.createElement('div');
  popup.className = 'celebration-popup';
  popup.textContent = mensaje;

  document.body.appendChild(popup);

  // Feedback háptico si está disponible
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }

  // Quitar el popup después de 1 segundo
  setTimeout(() => {
    popup.remove();
  }, 1000);
}

// ========== EDITOR UNIFICADO ==========
function abrirEditorTarea(index, tipo) {
  // Si index es null, estamos creando una NUEVA tarea
  const esNuevaTarea = index === null || index === undefined;
  const tarea = esNuevaTarea
    ? { titulo: '', texto: '', fecha_fin: '', persona: '', fecha_migrar: '' }  // Tarea vacía
    : (tipo === 'critica' ? appState.agenda.tareas_criticas[index] : appState.agenda.tareas[index]);

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-editor';
  modal.innerHTML = `
    <div class="modal-content">
      <h4>✏️ ${esNuevaTarea ? 'Nueva' : 'Editar'} ${tipo === 'critica' ? 'Tarea Crítica' : 'Tarea'}</h4>
      <div class="form-group">
        <label>${tipo === 'critica' ? 'Título' : 'Descripción'}:</label>
        <input type="text" id="editor-texto" value="${escapeHtml(tipo === 'critica' ? tarea.titulo : tarea.texto)}">
      </div>
      <div class="form-group">
        <label>Fecha límite:</label>
        <input type="date" id="editor-fecha" value="${separarFechaHora(tarea.fecha_fin).fecha}">
        <label style="margin-top: 8px; display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="editor-incluir-hora" ${separarFechaHora(tarea.fecha_fin).hora ? 'checked' : ''} onchange="document.getElementById('editor-hora').style.display = this.checked ? 'block' : 'none'" style="margin-right: 6px;">
          <span>Incluir hora</span>
        </label>
        <input type="time" id="editor-hora" value="${separarFechaHora(tarea.fecha_fin).hora}" style="display: ${separarFechaHora(tarea.fecha_fin).hora ? 'block' : 'none'}; margin-top: 8px;">
      </div>
      <div class="form-group">
        <label>Persona delegada:</label>
        <input type="text" id="editor-persona" value="${tarea.persona || ''}">
      </div>
      <div class="form-group">
        <label>Fecha migración:</label>
        <input type="date" id="editor-fecha-migrar" value="${separarFechaHora(tarea.fecha_migrar).fecha}">
        <label style="margin-top: 8px; display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="editor-incluir-hora-migrar" ${separarFechaHora(tarea.fecha_migrar).hora ? 'checked' : ''} onchange="document.getElementById('editor-hora-migrar').style.display = this.checked ? 'block' : 'none'" style="margin-right: 6px;">
          <span>Incluir hora</span>
        </label>
        <input type="time" id="editor-hora-migrar" value="${separarFechaHora(tarea.fecha_migrar).hora}" style="display: ${separarFechaHora(tarea.fecha_migrar).hora ? 'block' : 'none'}; margin-top: 8px;">
      </div>
      <div class="modal-botones">
        <button class="btn-primario" onclick="guardarEdicion(${index}, '${tipo}')">Guardar</button>
        <button class="btn-secundario" onclick="cerrarModal('modal-editor')">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = 'block';
  setTimeout(() => document.getElementById('editor-texto').focus(), 100);
}

function guardarEdicion(index, tipo) {
  const texto = document.getElementById('editor-texto').value.trim();
  const fecha = document.getElementById('editor-fecha').value;
  const incluirHora = document.getElementById('editor-incluir-hora')?.checked || false;
  const hora = incluirHora ? (document.getElementById('editor-hora')?.value || '') : '';
  const persona = document.getElementById('editor-persona').value.trim();
  const fechaMigrar = document.getElementById('editor-fecha-migrar').value;
  const incluirHoraMigrar = document.getElementById('editor-incluir-hora-migrar')?.checked || false;
  const horaMigrar = incluirHoraMigrar ? (document.getElementById('editor-hora-migrar')?.value || '') : '';

  if (!texto) {
    alert('El texto no puede estar vacío');
    return;
  }

  // Combinar fecha y hora
  const fechaFinal = combinarFechaHora(fecha, hora);
  const fechaMigrarFinal = combinarFechaHora(fechaMigrar, horaMigrar);

  const esNuevaTarea = index === null || index === undefined;

  if (esNuevaTarea) {
    // CREAR nueva tarea
    const nuevaTarea = {
      id: Date.now().toString(),
      completada: false,
      fecha_creacion: new Date().toISOString(),
      estado: persona ? 'migrada' : (fechaMigrarFinal ? 'programada' : 'pendiente'),
      etiqueta: '',
      fecha_fin: fechaFinal || null,
      persona: persona || null,
      fecha_migrar: fechaMigrarFinal || null
    };

    if (tipo === 'critica') {
      nuevaTarea.titulo = texto;
      nuevaTarea.razon = '';
      appState.agenda.tareas_criticas.push(nuevaTarea);
    } else {
      nuevaTarea.texto = texto;
      appState.agenda.tareas.push(nuevaTarea);
    }

    mostrarAlerta('✅ Tarea creada', 'success');
  } else {
    // EDITAR tarea existente
    const tarea = tipo === 'critica' ? appState.agenda.tareas_criticas[index] : appState.agenda.tareas[index];

    if (tipo === 'critica') {
      tarea.titulo = texto;
    } else {
      tarea.texto = texto;
    }

    tarea.fecha_fin = fechaFinal || null;
    tarea.persona = persona || null;
    tarea.fecha_migrar = fechaMigrarFinal || null;

    // Actualizar estado según datos
    if (persona) {
      tarea.estado = 'migrada';
    } else if (fechaMigrar) {
      tarea.estado = 'programada';
    } else {
      tarea.estado = 'pendiente';
    }

    mostrarAlerta('✅ Tarea actualizada', 'success');
  }

  cerrarModal('modal-editor');
  renderizar();
  guardarJSON(true);
}

// ========== SUBTAREAS ==========
function abrirModalSubtareaCritica(tareaIndex) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-subtarea-critica';
  modal.innerHTML = `
    <div class="modal-content">
      <h4>📝 Nueva Subtarea Crítica</h4>
      <div class="form-group">
        <label>Descripción:</label>
        <input type="text" id="subtarea-critica-texto" placeholder="Ej: Revisar documentos">
      </div>
      <div class="modal-botones">
        <button class="btn-primario" onclick="agregarSubtareaCritica(${tareaIndex})">Añadir</button>
        <button class="btn-secundario" onclick="cerrarModal('modal-subtarea-critica')">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = 'block';
  setTimeout(() => document.getElementById('subtarea-critica-texto').focus(), 100);
}

async function agregarSubtareaCritica(tareaIndex) {
  const texto = document.getElementById('subtarea-critica-texto').value.trim();
  if (!texto) {
    alert('Ingresa una descripción para la subtarea');
    return;
  }

  const tarea = appState.agenda.tareas_criticas[tareaIndex];
  if (!tarea.subtareas) tarea.subtareas = [];

  tarea.subtareas.push({
    id: Date.now().toString(),
    texto: texto,
    completada: false
  });

  cerrarModal('modal-subtarea-critica');
  renderizar();
  await guardarJSON(true);
  mostrarAlerta('📝 Subtarea crítica añadida', 'success');
}

async function toggleSubtareaCritica(tareaIndex, subIndex) {
  const subtarea = appState.agenda.tareas_criticas[tareaIndex].subtareas[subIndex];
  subtarea.completada = !subtarea.completada;

  renderizar();
  await guardarJSON(true);

  if (subtarea.completada) {
    mostrarAlerta('✅ Subtarea crítica completada', 'success');
    mostrarCelebracion();
  }
}

async function eliminarSubtareaCritica(tareaIndex, subIndex) {
  appState.agenda.tareas_criticas[tareaIndex].subtareas.splice(subIndex, 1);
  renderizar();
  await guardarJSON(true);
  mostrarAlerta('🗑️ Subtarea crítica eliminada', 'info');
}

function abrirModalSubtarea(tareaIndex) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-subtarea';
  modal.innerHTML = `
    <div class="modal-content">
      <h4>📝 Nueva Subtarea</h4>
      <div class="form-group">
        <label>Descripción:</label>
        <input type="text" id="subtarea-texto" placeholder="Ej: Revisar documentos">
      </div>
      <div class="modal-botones">
        <button class="btn-primario" onclick="agregarSubtarea(${tareaIndex})">Añadir</button>
        <button class="btn-secundario" onclick="cerrarModal('modal-subtarea')">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = 'block';
  setTimeout(() => document.getElementById('subtarea-texto').focus(), 100);
}

async function agregarSubtarea(tareaIndex) {
  const texto = document.getElementById('subtarea-texto').value.trim();
  if (!texto) {
    alert('Ingresa una descripción para la subtarea');
    return;
  }

  const tarea = appState.agenda.tareas[tareaIndex];
  if (!tarea.subtareas) tarea.subtareas = [];

  tarea.subtareas.push({
    id: Date.now().toString(),
    texto: texto,
    completada: false
  });

  cerrarModal('modal-subtarea');
  renderizar();
  await guardarJSON(true);
  mostrarAlerta('📝 Subtarea añadida', 'success');
}

async function toggleSubtarea(tareaIndex, subIndex) {
  const subtarea = appState.agenda.tareas[tareaIndex].subtareas[subIndex];
  subtarea.completada = !subtarea.completada;

  renderizar();
  await guardarJSON(true);

  if (subtarea.completada) {
    mostrarAlerta('✅ Subtarea completada', 'success');
    mostrarCelebracion();
  }
}

async function eliminarSubtarea(tareaIndex, subIndex) {
  appState.agenda.tareas[tareaIndex].subtareas.splice(subIndex, 1);
  renderizar();
  await guardarJSON(true);
  mostrarAlerta('🗑️ Subtarea eliminada', 'info');
}

// ========== CUENTA REGRESIVA PARA ELIMINAR ==========
function mostrarCuentaRegresiva(callback) {
  const frases = [
    '🤔 ¿Estás seguro?',
    '✨ Piensa bien...',
    '💭 Reflexiona un momento se va a borrar',
    '🚀 ¿Realmente quieres eliminarla?'
  ];

  const frase = frases[Math.floor(Math.random() * frases.length)];

  const overlay = document.createElement('div');
  overlay.className = 'dashboard-overlay countdown-overlay';
  overlay.innerHTML = `
    <div class="dashboard-content countdown-content">
      <div class="countdown-message">${frase}</div>
      <div class="countdown-number" id="countdown-number">3</div>
      <div class="countdown-actions">
        <button class="btn-primario" onclick="confirmarEliminacion()" style="margin-right:10px;">Sí, eliminar</button>
        <button class="btn-cancelar" onclick="cancelarEliminacion()">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.classList.add('show');

  let contador = 3;
  const numeroEl = document.getElementById('countdown-number');

  const intervalo = setInterval(() => {
    contador--;
    if (numeroEl) numeroEl.textContent = contador;

    if (contador <= 0) {
      clearInterval(intervalo);
      overlay.remove();
      callback();
      mostrarPopupCelebracion();
    }
  }, 1000);

  window.currentCountdown = { overlay, intervalo, callback };
}

function confirmarEliminacion() {
  if (window.currentCountdown) {
    clearInterval(window.currentCountdown.intervalo);
    window.currentCountdown.overlay.remove();
    const callback = window.currentCountdown.callback;
    window.currentCountdown = null;
    callback();
    mostrarPopupCelebracion();
  }
}

function cancelarEliminacion() {
  if (window.currentCountdown) {
    clearInterval(window.currentCountdown.intervalo);
    window.currentCountdown.overlay.remove();
    window.currentCountdown = null;
    mostrarAlerta('❌ Eliminación cancelada', 'info');
  }
}

function mostrarPopupCelebracion() {
  const configVisual = window.configVisual || {};
  const frasesPersonalizadas = configVisual.frases || [];

  const mensajesDefault = [
    '🎉 ¡Muy bien!',
    '✨ ¡Tarea eliminada!',
    '🚀 ¡Excelente!',
    '⭐ ¡Fantástico!',
    '🎯 ¡Listo!',
    '💪 ¡Sigue así!',
    '🏆 ¡Genial!',
    '🌟 ¡Increíble!'
  ];

  const mensajes = frasesPersonalizadas.length > 0 ? frasesPersonalizadas : mensajesDefault;
  const mensaje = mensajes[Math.floor(Math.random() * mensajes.length)];

  const popup = document.createElement('div');
  popup.className = 'celebration-popup';
  popup.textContent = mensaje;

  document.body.appendChild(popup);

  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }

  setTimeout(() => {
    popup.remove();
  }, 1000);
}

// ========== EDITOR Y MIGRACIÓN DE SUBTAREAS ==========
function abrirEditorSubtarea(tareaIndex, subIndex, tipo) {
  const tarea = tipo === 'critica' ? appState.agenda.tareas_criticas[tareaIndex] : appState.agenda.tareas[tareaIndex];
  const subtarea = tarea.subtareas[subIndex];

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-editor-subtarea';
  modal.innerHTML = `
    <div class="modal-content">
      <h4>✏️ Editar Subtarea</h4>
      <div class="form-group">
        <label>Descripción:</label>
        <input type="text" id="editor-subtarea-texto" value="${escapeHtml(subtarea.texto)}">
      </div>
      <div class="form-group">
        <label>Fecha límite:</label>
        <input type="date" id="editor-subtarea-fecha" value="${separarFechaHora(subtarea.fecha_fin).fecha}">
        <label style="margin-top: 8px; display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="editor-subtarea-incluir-hora" ${separarFechaHora(subtarea.fecha_fin).hora ? 'checked' : ''} onchange="document.getElementById('editor-subtarea-hora').style.display = this.checked ? 'block' : 'none'" style="margin-right: 6px;">
          <span>Incluir hora</span>
        </label>
        <input type="time" id="editor-subtarea-hora" value="${separarFechaHora(subtarea.fecha_fin).hora}" style="display: ${separarFechaHora(subtarea.fecha_fin).hora ? 'block' : 'none'}; margin-top: 8px;">
      </div>
      <div class="form-group">
        <label>Persona asignada:</label>
        <input type="text" id="editor-subtarea-persona" value="${subtarea.persona || ''}">
      </div>
      <div class="form-group">
        <label>Fecha migración:</label>
        <input type="date" id="editor-subtarea-fecha-migrar" value="${separarFechaHora(subtarea.fecha_migrar).fecha}">
        <label style="margin-top: 8px; display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="editor-subtarea-incluir-hora-migrar" ${separarFechaHora(subtarea.fecha_migrar).hora ? 'checked' : ''} onchange="document.getElementById('editor-subtarea-hora-migrar').style.display = this.checked ? 'block' : 'none'" style="margin-right: 6px;">
          <span>Incluir hora</span>
        </label>
        <input type="time" id="editor-subtarea-hora-migrar" value="${separarFechaHora(subtarea.fecha_migrar).hora}" style="display: ${separarFechaHora(subtarea.fecha_migrar).hora ? 'block' : 'none'}; margin-top: 8px;">
      </div>
      <div class="modal-botones">
        <button class="btn-primario" onclick="guardarEdicionSubtarea(${tareaIndex}, ${subIndex}, '${tipo}')">Guardar</button>
        <button class="btn-secundario" onclick="cerrarModal('modal-editor-subtarea')">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = 'block';
}

function guardarEdicionSubtarea(tareaIndex, subIndex, tipo) {
  const tarea = tipo === 'critica' ? appState.agenda.tareas_criticas[tareaIndex] : appState.agenda.tareas[tareaIndex];
  const subtarea = tarea.subtareas[subIndex];
  const texto = document.getElementById('editor-subtarea-texto').value.trim();
  const fecha = document.getElementById('editor-subtarea-fecha').value;
  const incluirHora = document.getElementById('editor-subtarea-incluir-hora')?.checked || false;
  const hora = incluirHora ? (document.getElementById('editor-subtarea-hora')?.value || '') : '';
  const persona = document.getElementById('editor-subtarea-persona').value.trim();
  const fechaMigrar = document.getElementById('editor-subtarea-fecha-migrar').value;
  const incluirHoraMigrar = document.getElementById('editor-subtarea-incluir-hora-migrar')?.checked || false;
  const horaMigrar = incluirHoraMigrar ? (document.getElementById('editor-subtarea-hora-migrar')?.value || '') : '';

  if (!texto) {
    alert('El texto no puede estar vacío');
    return;
  }

  // Combinar fecha y hora
  const fechaFinal = combinarFechaHora(fecha, hora);
  const fechaMigrarFinal = combinarFechaHora(fechaMigrar, horaMigrar);

  subtarea.texto = texto;
  subtarea.fecha_fin = fechaFinal || null;
  subtarea.persona = persona || null;
  subtarea.fecha_migrar = fechaMigrarFinal || null;

  cerrarModal('modal-editor-subtarea');
  renderizar();
  guardarJSON(true);
  mostrarAlerta('✅ Subtarea actualizada', 'success');
}

function abrirMigracionSubtarea(tareaIndex, subIndex, tipo) {
  window.subtareaSeleccionada = { tareaIndex, subIndex, tipo };
  abrirModal('modal-migrar');
}

function guardarMigracionSubtarea() {
  const fecha = document.getElementById('migrar-fecha').value;
  const persona = document.getElementById('migrar-persona').value.trim();

  if (!window.subtareaSeleccionada) return;

  const { tareaIndex, subIndex, tipo } = window.subtareaSeleccionada;
  const tarea = tipo === 'critica' ? appState.agenda.tareas_criticas[tareaIndex] : appState.agenda.tareas[tareaIndex];
  const subtarea = tarea.subtareas[subIndex];

  subtarea.fecha_migrar = fecha || null;
  subtarea.persona = persona || null;

  window.subtareaSeleccionada = null;
  cerrarModal('modal-migrar');
  renderizar();
  guardarJSON(true);

  if (persona) {
    mostrarAlerta(`→ Subtarea asignada a ${persona}`, 'success');
  } else if (fecha) {
    mostrarAlerta(`→ Subtarea pospuesta para ${fecha}`, 'success');
  }
}

// ========== SÍMBOLOS Y ESTADOS DE SUBTAREAS ==========
function obtenerSimboloSubtarea(subtarea) {
  if (!subtarea.estado) subtarea.estado = 'pendiente';
  if (subtarea.estado === 'completada') return '✔';
  if (subtarea.estado === 'migrada') return '→';
  if (subtarea.estado === 'programada') return '<';
  return '●';
}

function cambiarEstadoSubtareaCritica(tareaIndex, subIndex) {
  const subtarea = appState.agenda.tareas_criticas[tareaIndex].subtareas[subIndex];
  if (!subtarea.estado) subtarea.estado = 'pendiente';

  if (subtarea.estado === 'pendiente') {
    subtarea.estado = 'migrada';
    subtarea.completada = false;
    appState.ui.subtareaSeleccionada = { tipo: 'critica', tareaIndex, subIndex };
    abrirModal('modal-migrar');
    return;
  } else if (subtarea.estado === 'migrada') {
    if (subtarea.persona) {
      subtarea.estado = 'completada';
      subtarea.completada = true;
      guardarSubtareaCompletada(subtarea, true);
      mostrarCelebracion();
    } else {
      subtarea.estado = 'programada';
      subtarea.completada = false;
    }
  } else if (subtarea.estado === 'programada') {
    subtarea.estado = 'completada';
    subtarea.completada = true;
    guardarSubtareaCompletada(subtarea, true);
    mostrarCelebracion();
  } else {
    subtarea.estado = 'pendiente';
    subtarea.completada = false;
    delete subtarea.persona;
    delete subtarea.fecha_migrar;
  }

  renderizar();
  guardarJSON(true);
}

function cambiarEstadoSubtarea(tareaIndex, subIndex) {
  const subtarea = appState.agenda.tareas[tareaIndex].subtareas[subIndex];
  if (!subtarea.estado) subtarea.estado = 'pendiente';

  if (subtarea.estado === 'pendiente') {
    subtarea.estado = 'migrada';
    subtarea.completada = false;
    appState.ui.subtareaSeleccionada = { tipo: 'tarea', tareaIndex, subIndex };
    abrirModal('modal-migrar');
    return;
  } else if (subtarea.estado === 'migrada') {
    if (subtarea.persona) {
      subtarea.estado = 'completada';
      subtarea.completada = true;
      guardarSubtareaCompletada(subtarea, false);
      mostrarCelebracion();
    } else {
      subtarea.estado = 'programada';
      subtarea.completada = false;
    }
  } else if (subtarea.estado === 'programada') {
    subtarea.estado = 'completada';
    subtarea.completada = true;
    guardarSubtareaCompletada(subtarea, false);
    mostrarCelebracion();
  } else {
    subtarea.estado = 'pendiente';
    subtarea.completada = false;
    delete subtarea.persona;
    delete subtarea.fecha_migrar;
  }

  renderizar();
  guardarJSON(true);
}

// ========== VISUALIZACIÓN POR COLORES ==========
function aplicarColorVisualizacion(elemento, tarea, tipo) {
  const configVisual = window.configVisual || {};
  const modoVisualizacion = configVisual.modoVisualizacion || 'estado';

  if (modoVisualizacion === 'etiqueta') {
    // Limpiar clases de estado y urgente para evitar conflictos
    elemento.classList.remove('completada', 'migrada', 'programada', 'urgente');

    if (tarea.etiqueta) {
      // Modo etiqueta: usar color de la etiqueta
      const etiquetaInfo = obtenerEtiquetaInfo(tarea.etiqueta, 'tareas');
      if (etiquetaInfo && etiquetaInfo.color) {
        elemento.style.borderLeft = `4px solid ${etiquetaInfo.color}`;
        elemento.style.backgroundColor = `${etiquetaInfo.color}15`; // Color con transparencia
      }
    } else {
      // Sin etiqueta: fondo blanco
      elemento.style.borderLeft = '4px solid #e0e0e0';
      elemento.style.backgroundColor = '#ffffff';
    }
  } else {
    // Modo estado: limpiar estilos inline y usar clases CSS por estado
    elemento.style.borderLeft = '';
    elemento.style.backgroundColor = '';

    if (tarea.estado === 'completada') {
      elemento.classList.add('completada');
    } else if (tarea.estado === 'migrada') {
      elemento.classList.add('migrada');
    } else if (tarea.estado === 'programada') {
      elemento.classList.add('programada');
    }
  }
}

// ========== GUARDAR SUBTAREAS EN HISTORIAL ==========
function guardarSubtareaCompletada(subtarea, esCritica) {
  if (typeof guardarEnHistorial === 'function') {
    const entrada = {
      id: Date.now().toString(),
      tipo: esCritica ? 'subtarea_critica' : 'subtarea',
      texto: subtarea.texto,
      fecha_completada: new Date().toISOString(),
      fecha_original: subtarea.fecha_fin || null,
      persona: subtarea.persona || null
    };
    guardarEnHistorial(entrada);
  }
}

// ========== GUARDAR TAREAS COMPLETADAS EN HISTORIAL ==========
function guardarTareaCompletada(tarea, esCritica) {
  if (typeof guardarEnHistorial === 'function') {
    const entrada = {
      id: Date.now().toString(),
      tipo: esCritica ? 'tarea_critica' : 'tarea',
      texto: esCritica ? tarea.titulo : tarea.texto,
      fecha_completada: new Date().toISOString(),
      fecha_original: tarea.fecha_fin || null,
      persona: tarea.persona || null
    };
    guardarEnHistorial(entrada);
  }
}

// ========== POPUP MOTIVACIONAL CON CUENTA ATRÁS ==========
function mostrarPopupCompletarTarea(callback) {
  // Obtener frase motivadora
  const configVisual = window.configVisual || {};
  const frases = configVisual.frases || ['¡Excelente trabajo!', '¡Una menos!', '¡A por la siguiente!'];
  const fraseMotivadora = frases[Math.floor(Math.random() * frases.length)];

  // Crear modal
  const modal = document.createElement('div');
  modal.id = 'modal-completar-tarea';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
  `;

  // Crear contenido del modal
  let segundosRestantes = 3;
  const contenido = document.createElement('div');
  contenido.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 12px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    max-width: 400px;
    margin: 20px;
    animation: slideIn 0.3s ease;
  `;

  let intervaloCuentaAtras = null;

  function actualizarContenido() {
    contenido.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 20px; color: #4CAF50;">
        ✨ ${fraseMotivadora} ✨
      </div>
      <div style="font-size: 18px; margin-bottom: 25px; color: #333;">
        ¿Estás seguro de que quieres completar esta tarea?
      </div>
      <div style="font-size: 16px; margin-bottom: 20px; color: #666;">
        Auto-confirmación en <span style="color: #f44336; font-weight: bold;">${segundosRestantes}</span> segundos
      </div>
      <div style="display: flex; gap: 15px; justify-content: center;">
        <button id="btn-confirmar-completar" style="
          background: #4CAF50;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
        ">✅ Sí, completar</button>
        <button id="btn-cancelar-completar" style="
          background: #f44336;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
        ">❌ No, cancelar</button>
      </div>
    `;

    // Agregar eventos a los botones
    document.getElementById('btn-confirmar-completar').onclick = confirmar;
    document.getElementById('btn-cancelar-completar').onclick = cancelar;
  }

  function confirmar() {
    limpiarModal();
    callback(true);
  }

  function cancelar() {
    limpiarModal();
    callback(false);
  }

  function limpiarModal() {
    if (intervaloCuentaAtras) clearInterval(intervaloCuentaAtras);
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
  }

  // Cuenta atrás
  intervaloCuentaAtras = setInterval(() => {
    segundosRestantes--;
    if (segundosRestantes <= 0) {
      confirmar(); // Auto-confirmar después de 3 segundos
    } else {
      actualizarContenido();
    }
  }, 1000);

  // Mostrar modal
  modal.appendChild(contenido);
  document.body.appendChild(modal);
  actualizarContenido();

  // CSS para animaciones
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from { transform: translateY(-50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  if (!document.querySelector('style[data-popup-completar]')) {
    style.setAttribute('data-popup-completar', 'true');
    document.head.appendChild(style);
  }
}

// Hacer funciones disponibles globalmente
window.renderizar = renderizar;
window.mostrarPopupCompletarTarea = mostrarPopupCompletarTarea;
window.renderizarCriticas = renderizarCriticas;
window.renderizarTareas = renderizarTareas;
window.obtenerSimbolo = obtenerSimbolo;
window.cambiarEstadoCritica = cambiarEstadoCritica;
window.cambiarEstadoTarea = cambiarEstadoTarea;
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;
window.nuevaTareaCritica = nuevaTareaCritica;
window.agregarTareaCritica = agregarTareaCritica;
window.nuevaTarea = nuevaTarea;
window.agregarTarea = agregarTarea;
window.editarTarea = editarTarea;
window.editarTareaCritica = editarTareaCritica;
window.guardarMigracion = guardarMigracion;
window.filtrarTareas = filtrarTareas;
window.aplicarFiltros = aplicarFiltros;
window.actualizarEstilosFiltros = actualizarEstilosFiltros;
window.limpiarFiltros = limpiarFiltros;
window.toggleFiltros = toggleFiltros;
window.toggleLargoPlazo = toggleLargoPlazo;
window.scrollToTop = scrollToTop;
window.scrollToBottom = scrollToBottom;
window.setupPersonasAutocomplete = setupPersonasAutocomplete;
window.mostrarCelebracion = mostrarCelebracion;
window.mostrarCuentaRegresiva = mostrarCuentaRegresiva;
window.confirmarEliminacion = confirmarEliminacion;
window.cancelarEliminacion = cancelarEliminacion;
window.abrirEditorTarea = abrirEditorTarea;
window.guardarEdicion = guardarEdicion;
window.abrirModalSubtarea = abrirModalSubtarea;
window.agregarSubtarea = agregarSubtarea;
window.obtenerSimboloSubtarea = obtenerSimboloSubtarea;
window.cambiarEstadoSubtareaCritica = cambiarEstadoSubtareaCritica;
window.cambiarEstadoSubtarea = cambiarEstadoSubtarea;
window.eliminarSubtarea = eliminarSubtarea;
window.abrirModalSubtareaCritica = abrirModalSubtareaCritica;
window.agregarSubtareaCritica = agregarSubtareaCritica;
window.toggleSubtareaCritica = toggleSubtareaCritica;
window.toggleSubtarea = toggleSubtarea;
window.eliminarSubtareaCritica = eliminarSubtareaCritica;
window.abrirEditorSubtarea = abrirEditorSubtarea;
window.guardarEdicionSubtarea = guardarEdicionSubtarea;
window.abrirMigracionSubtarea = abrirMigracionSubtarea;
window.guardarMigracionSubtarea = guardarMigracionSubtarea;
window.guardarSubtareaCompletada = guardarSubtareaCompletada;
window.guardarTareaCompletada = guardarTareaCompletada;
window.manejarSeleccionPersona = manejarSeleccionPersona;
window.cargarPersonasEnSelect = cargarPersonasEnSelect;
window.aplicarColorVisualizacion = aplicarColorVisualizacion;
window.mostrarPopupCelebracion = mostrarPopupCelebracion;
// Funciones compartidas
window.renderizarFechaConUrgencia = renderizarFechaConUrgencia;
window.configurarDragAndDrop = configurarDragAndDrop;
window.crearAlertaUrgencia = crearAlertaUrgencia;

// Función para cambiar la vista de período (semana, quincena, mes, todo)
function cambiarVistaPeriodo(listaId, periodo) {
  console.log('🔵 cambiarVistaPeriodo llamado:', { listaId, periodo });

  // Guardar el período seleccionado en configVisual
  if (!window.configVisual) window.configVisual = {};
  if (!window.configVisual.vistaPeriodo) window.configVisual.vistaPeriodo = {};
  window.configVisual.vistaPeriodo[listaId] = periodo;
  localStorage.setItem('configVisual', JSON.stringify(window.configVisual));

  // Actualizar estilos de los botones
  const contenedor = document.querySelector(`[data-target="${listaId}"] .vista-periodo-container`);
  if (contenedor) {
    contenedor.querySelectorAll('.btn-periodo').forEach(btn => {
      btn.classList.remove('active');
      const color = btn.style.borderColor;
      btn.style.background = 'white';
      btn.style.color = color;
    });
    const btnActivo = contenedor.querySelector(`[data-periodo="${periodo}"]`);
    if (btnActivo) {
      btnActivo.classList.add('active');
      const color = btnActivo.style.borderColor;
      btnActivo.style.background = color;
      btnActivo.style.color = 'white';
    }
  }

  // Filtrar y renderizar las tareas según el período
  filtrarTareasPorPeriodo(listaId, periodo);
}

function filtrarTareasPorPeriodo(listaId, periodo) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  let fechaLimite;

  switch (periodo) {
    case 'hoy':
      // Modo especial: solo mostrar tareas de hoy y retrasadas
      fechaLimite = new Date(hoy);
      break;
    case 'semana':
      fechaLimite = new Date(hoy);
      fechaLimite.setDate(hoy.getDate() + 7);
      break;
    case 'quincena':
      fechaLimite = new Date(hoy);
      fechaLimite.setDate(hoy.getDate() + 15);
      break;
    case 'mes':
      fechaLimite = new Date(hoy);
      fechaLimite.setMonth(hoy.getMonth() + 1);
      break;
    case 'todo':
    default:
      fechaLimite = null; // Mostrar todas
      break;
  }

  // Guardar el filtro activo en el estado
  if (!window.appState.filtrosPeriodo) window.appState.filtrosPeriodo = {};
  window.appState.filtrosPeriodo[listaId] = { periodo, fechaLimite };

  console.log('🟢 Filtro guardado:', {
    listaId,
    periodo,
    fechaLimite: fechaLimite ? fechaLimite.toISOString().slice(0, 10) : 'null',
    todosLosFiltros: window.appState.filtrosPeriodo
  });

  // Re-renderizar la lista correspondiente
  if (listaId === 'criticas') {
    renderizarTareas();
  } else {
    // Intentar renderizar solo la lista específica si la función está disponible
    if (typeof renderizarListaPersonalizada === 'function') {
      renderizarListaPersonalizada(listaId);
    } else if (typeof renderizarTodasLasListasPersonalizadas === 'function') {
      renderizarTodasLasListasPersonalizadas();
    } else if (typeof renderizarListasPersonalizadas === 'function') {
      // Fallback (aunque esta función suele ser para el gestor de listas, no para las tareas)
      renderizarListasPersonalizadas();
    }
  }
}

// Función auxiliar para verificar si una tarea debe mostrarse según el período
function debeMotrarTareaPorPeriodo(tarea, listaId) {
  // Intentar obtener el filtro con el ID proporcionado
  let filtro = window.appState.filtrosPeriodo?.[listaId];

  // Si no se encuentra y el ID no tiene prefijo 'lista-', intentar con el prefijo
  if (!filtro && !listaId.startsWith('lista-')) {
    filtro = window.appState.filtrosPeriodo?.[`lista-${listaId}`];
  }

  // Si no se encuentra y el ID TIENE prefijo 'lista-', intentar SIN el prefijo (por si acaso)
  if (!filtro && listaId.startsWith('lista-')) {
    filtro = window.appState.filtrosPeriodo?.[listaId.substring(6)];
  }

  if (!filtro) {
    // Si no hay filtro, mostrar todo
    return true;
  }

  // Si el período es 'todo', mostrar siempre
  if (filtro.periodo === 'todo') {
    return true;
  }

  // Si hay filtro pero fechaLimite es falsy (y no es 'todo'), algo está mal
  // Intentar recuperar fechaLimite si es posible o mostrar todo como fallback
  if (!filtro.fechaLimite) {
    console.warn('⚠️ Filtro con período diferente a "todo" pero sin fecha límite:', filtro);
    return true;
  }

  // Normalizar fecha límite (manejar strings y objetos Date)
  let fechaLimite = filtro.fechaLimite;
  if (typeof fechaLimite === 'string') {
    // Intentar convertir string a Date
    const partes = fechaLimite.split('T')[0].split('-');
    if (partes.length === 3) {
      fechaLimite = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    } else {
      fechaLimite = new Date(fechaLimite);
    }
  }

  if (!fechaLimite || isNaN(fechaLimite.getTime())) {
    return true; // Fallback
  }

  // Normalizar a inicio del día para comparación correcta
  fechaLimite.setHours(0, 0, 0, 0);

  // Obtener fecha de la tarea
  let fechaTarea = null;
  if (tarea.fecha_fin) {
    if (typeof tarea.fecha_fin === 'string') {
      const soloFecha = extraerSoloFecha(tarea.fecha_fin);
      if (soloFecha) {
        const [año, mes, dia] = soloFecha.split('-');
        fechaTarea = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
      }
    } else if (Array.isArray(tarea.fecha_fin)) {
      fechaTarea = new Date(tarea.fecha_fin[0], tarea.fecha_fin[1] - 1, tarea.fecha_fin[2]);
    }
  }

  // Si no tiene fecha, mostrarla siempre (las tareas sin fecha no se filtran por período)
  if (!fechaTarea || isNaN(fechaTarea.getTime())) {
    return true;
  }

  fechaTarea.setHours(0, 0, 0, 0);

  // Caso especial "hoy": mostrar solo tareas de hoy y retrasadas (fechas pasadas)
  if (filtro.periodo === 'hoy') {
    return fechaTarea <= fechaLimite;
  }

  // Otros períodos: mostrar solo si la fecha está dentro del límite
  return fechaTarea <= fechaLimite;
}

window.debeMotrarTareaPorPeriodo = debeMotrarTareaPorPeriodo;

window.cambiarVistaPeriodo = cambiarVistaPeriodo;
window.filtrarTareasPorPeriodo = filtrarTareasPorPeriodo;
window.separarFechaHora = separarFechaHora;
window.extraerSoloFecha = extraerSoloFecha;
window.formatearFechaParaMostrar = formatearFechaParaMostrar;
window.combinarFechaHora = combinarFechaHora;
