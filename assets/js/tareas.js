// ========== GESTIÓN DE TAREAS ==========

// ========== RENDERIZAR TAREAS ==========
function renderizar() {
  requestAnimationFrame(() => {
    renderizarCriticas();
    renderizarTareas();
    renderCitasPanel();

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

function renderizarCriticas() {
  const lista = document.getElementById('lista-criticas');
  if (!lista) return;

  lista.innerHTML = '';

  if (!appState.agenda.tareas_criticas || appState.agenda.tareas_criticas.length === 0) {
    lista.innerHTML = '<div style="color:#777;padding:10px;text-align:center;">No hay tareas críticas</div>';
    return;
  }

  // Aplicar filtros
  const tareasFiltradas = filtrarTareas(appState.agenda.tareas_criticas, 'criticas');

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
    if (tarea.completada) div.classList.add('tarea-completada');

    // Verificar si es urgente (fecha límite es hoy o pasada)
    const esUrgente = esFechaHoy(tarea.fecha_fin) || esFechaPasada(tarea.fecha_fin);
    if (esUrgente && !tarea.completada) {
      div.classList.add('urgente');
    }

    // Aplicar colores según modo de visualización
    aplicarColorVisualizacion(div, tarea, 'critica');

    // Guardar información de urgencia para mostrar icono
    if (esUrgente && !tarea.completada) {
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
      contenido += ` <small style="background: ${esUrgente ? '#ffcdd2' : '#ffe5e5'}; color: ${colorFecha}; padding: 2px 6px; border-radius: 3px; font-weight: ${esUrgente ? 'bold' : 'normal'};">📅 ${tarea.fecha_fin}</small>`;
    }
    // Mostrar información de migración/delegación para tareas críticas
    if (tarea.persona || tarea.fecha_migrar) {
      contenido += ' <span style="font-size: 12px; color: #9c27b0; font-weight: bold;">→ ';
      if (tarea.persona) {
        contenido += `<span style="background: #e3f2fd; color: #1976d2; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; margin-right: 5px;">👤 ${escapeHtml(tarea.persona)}</span>`;
      }
      if (tarea.fecha_migrar) {
        const colorMigrar = esFechaHoy(tarea.fecha_migrar) ? '#ff1744' : '#666';
        contenido += `<span style="background: ${esFechaHoy(tarea.fecha_migrar) ? '#ffcdd2' : '#ffe5e5'}; color: ${colorMigrar}; padding: 3px 8px; border-radius: 4px; font-weight: ${esFechaHoy(tarea.fecha_migrar) ? 'bold' : 'normal'}; font-size: 12px;">📅 ${tarea.fecha_migrar}</span>`;
      }
      contenido += '</span>';
    }
    texto.innerHTML = contenido;
    texto.onclick = () => abrirEditorTarea(realIndex, 'critica');

    div.appendChild(simbolo);
    div.appendChild(texto);

    // Botón de subtareas para tareas críticas - PRIMERO
    const btnSubtareaCritica = document.createElement('button');
    btnSubtareaCritica.className = 'btn-subtarea';
    btnSubtareaCritica.textContent = '📝';
    btnSubtareaCritica.title = 'Añadir subtarea';
    btnSubtareaCritica.onclick = (e) => {
      e.stopPropagation();
      abrirModalSubtareaCritica(realIndex);
    };
    div.appendChild(btnSubtareaCritica);

    // Botón de borrar - SEGUNDO
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
    if (!tarea.completada) {
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
      if (typeof isMobile === 'function' && isMobile()) {
        div.addEventListener('touchstart', handleTouchStart, { passive: false });
        div.addEventListener('touchmove', handleTouchMove, { passive: false });
        div.addEventListener('touchend', handleTouchEnd, { passive: false });
      } else {
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
        if (subtarea.completada) subDiv.classList.add('subtarea-completada');

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
            contenidoSub += `<span style="background: #ffe5e5; color: #666; padding: 2px 6px; border-radius: 3px; font-size: 10px;">📅 ${subtarea.fecha_migrar}</span>`;
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
    if (tarea.completada) div.classList.add('tarea-completada');

    // Verificar si es urgente (fecha límite o migración es hoy o pasada)
    const esUrgente = esFechaHoy(tarea.fecha_fin) || esFechaHoy(tarea.fecha_migrar) || esFechaPasada(tarea.fecha_fin) || esFechaPasada(tarea.fecha_migrar);
    if (esUrgente && !tarea.completada) {
      div.classList.add('urgente');
    }

    // Aplicar colores según modo de visualización
    aplicarColorVisualizacion(div, tarea, 'tarea');

    // Guardar información de urgencia para mostrar icono
    if (esUrgente && !tarea.completada) {
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
      contenido += ` <small style="background: ${esFechaHoy(tarea.fecha_fin) ? '#ffcdd2' : '#ffe5e5'}; color: ${colorFecha}; padding: 2px 6px; border-radius: 3px; font-weight: ${esFechaHoy(tarea.fecha_fin) ? 'bold' : 'normal'}; font-size: 10px;">hacer antes de 📅 ${tarea.fecha_fin}</small>`;
    }
    // Mostrar información de migración/delegación
    if (tarea.persona || tarea.fecha_migrar) {
      contenido += ' <span style="font-size: 12px; color: #9c27b0; font-weight: bold;">→ ';
      if (tarea.persona) {
        contenido += `<span style="background: #e3f2fd; color: #1976d2; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; margin-right: 5px;">👤 ${escapeHtml(tarea.persona)}</span>`;
      }
      if (tarea.fecha_migrar) {
        const colorMigrar = esFechaHoy(tarea.fecha_migrar) ? '#ff1744' : '#666';
        contenido += `<span style="background: ${esFechaHoy(tarea.fecha_migrar) ? '#ffcdd2' : '#ffe5e5'}; color: ${colorMigrar}; padding: 3px 8px; border-radius: 4px; font-weight: ${esFechaHoy(tarea.fecha_migrar) ? 'bold' : 'normal'}; font-size: 12px;">📅 ${tarea.fecha_migrar}</span>`;
      }
      contenido += '</span>';
    }
    texto.innerHTML = contenido;
    texto.onclick = () => abrirEditorTarea(realIndex, 'tarea');

    div.appendChild(simbolo);
    div.appendChild(texto);

    // Botón de subtareas - solo para tareas normales - PRIMERO
    const btnSubtarea = document.createElement('button');
    btnSubtarea.className = 'btn-subtarea';
    btnSubtarea.textContent = '📝';
    btnSubtarea.title = 'Añadir subtarea';
    btnSubtarea.onclick = (e) => {
      e.stopPropagation();
      abrirModalSubtarea(realIndex);
    };
    div.appendChild(btnSubtarea);

    // Botón de borrar - SEGUNDO
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
    if (!tarea.completada) {
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
      if (typeof isMobile === 'function' && isMobile()) {
        div.addEventListener('touchstart', handleTouchStart, { passive: false });
        div.addEventListener('touchmove', handleTouchMove, { passive: false });
        div.addEventListener('touchend', handleTouchEnd, { passive: false });
      } else {
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
        if (subtarea.completada) subDiv.classList.add('subtarea-completada');

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
            contenidoSub += `<span style="background: #ffe5e5; color: #666; padding: 2px 6px; border-radius: 3px; font-size: 10px;">📅 ${subtarea.fecha_migrar}</span>`;
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

// ========== SÍMBOLOS ==========
function obtenerSimbolo(tarea) {
  if (tarea.estado === 'completada') return '✔';
  if (tarea.estado === 'migrada') return '→';
  if (tarea.estado === 'programada') return '<';
  return '●';
}

// ========== CAMBIAR ESTADO ==========
function cambiarEstadoCritica(index) {
  console.log('🎯 CLICK EN TAREA CRÍTICA:', { index });
  const tarea = appState.agenda.tareas_criticas[index];
  console.log('📊 Estado actual:', tarea.estado, '| Tarea:', tarea.titulo);

  const estadoAnterior = tarea.estado;

  if (tarea.estado === 'pendiente') {
    console.log('▶️ Pendiente → Migrada (abriendo modal migrar)');
    tarea.estado = 'migrada';
    tarea.completada = false;
    appState.ui.tareaSeleccionada = { tipo: 'critica', index };
    abrirModal('modal-migrar');
    return;
  } else if (tarea.estado === 'migrada') {
    // Si tiene persona asignada, mantener como migrada, sino pasar a programada
    if (tarea.persona) {
      console.log('▶️ Migrada (con persona) → Completada');
      tarea.estado = 'completada';
      tarea.completada = true;
      guardarTareaCompletada(tarea, true);
      mostrarCelebracion();
      registrarAccion('Completar tarea crítica', tarea.titulo);
    } else {
      console.log('▶️ Migrada (sin persona) → Programada');
      tarea.estado = 'programada';
      tarea.completada = false;
      registrarAccion('Programar tarea crítica', tarea.titulo);
    }
  } else if (tarea.estado === 'programada') {
    console.log('▶️ Programada → Completada');
    tarea.estado = 'completada';
    tarea.completada = true;
    guardarTareaCompletada(tarea, true);
    mostrarCelebracion();
    registrarAccion('Completar tarea crítica', tarea.titulo);
  } else {
    console.log('▶️ Completada → Pendiente (reiniciando)');
    tarea.estado = 'pendiente';
    tarea.completada = false;
    delete tarea.persona;
    delete tarea.fecha_migrar;
    registrarAccion('Reiniciar tarea crítica', tarea.titulo);
  }

  console.log('🔄 Renderizando y guardando...');
  renderizar();
  scheduleAutoSave();
}

function cambiarEstadoTarea(index) {
  console.log('🎯 CLICK EN TAREA NORMAL:', { index });
  const tarea = appState.agenda.tareas[index];
  console.log('📊 Estado actual:', tarea.estado, '| Tarea:', tarea.texto);

  if (tarea.estado === 'pendiente') {
    console.log('▶️ Pendiente → Migrada (abriendo modal migrar)');
    tarea.estado = 'migrada';
    tarea.completada = false;
    appState.ui.tareaSeleccionada = { tipo: 'tarea', index };
    abrirModal('modal-migrar');
    return;
  } else if (tarea.estado === 'migrada') {
    // Si tiene persona asignada, mantener como migrada, sino pasar a programada
    if (tarea.persona) {
      console.log('▶️ Migrada (con persona) → Completada');
      tarea.estado = 'completada';
      tarea.completada = true;
      guardarTareaCompletada(tarea, false);
      mostrarCelebracion();
      registrarAccion('Completar tarea', tarea.texto);
    } else {
      console.log('▶️ Migrada (sin persona) → Programada');
      tarea.estado = 'programada';
      tarea.completada = false;
      registrarAccion('Programar tarea', tarea.texto);
    }
  } else if (tarea.estado === 'programada') {
    console.log('▶️ Programada → Completada');
    tarea.estado = 'completada';
    tarea.completada = true;
    guardarTareaCompletada(tarea, false);
    mostrarCelebracion();
    registrarAccion('Completar tarea', tarea.texto);
  } else {
    console.log('▶️ Completada → Pendiente (reiniciando)');
    tarea.estado = 'pendiente';
    tarea.completada = false;
    delete tarea.persona;
    delete tarea.fecha_migrar;
    registrarAccion('Reiniciar tarea', tarea.texto);
  }

  console.log('🔄 Renderizando y guardando...');
  renderizar();
  guardarJSON(true);
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
  const etiqueta = document.getElementById('critica-etiqueta').value;

  if (!titulo) {
    alert('Por favor, ingresa un título');
    return;
  }

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
  const listasPersonalizadas = configVisual.listasPersonalizadas || [];
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
        if (typeof guardarConfigEnFirebase === 'function') {
          guardarConfigEnFirebase();
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
    registrarAccion('Crear tarea', `"${texto}" ${etiqueta ? `[${etiqueta}]` : ''} ${fechaFin ? `(vence: ${fechaFin})` : ''}`.trim());
  }

  cerrarModal('modal-tarea');
  renderizar();
  await guardarJSON(true);

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

function editarTareaCritica(index) {
  const tarea = appState.agenda.tareas_criticas[index];
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
        // Guardar DIRECTAMENTE en Firebase
        if (typeof guardarPersonasEnFirebase === 'function') {
          guardarPersonasEnFirebase();
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
      const listas = configVisual.listasPersonalizadas || [];
      const lista = listas.find(l => l.id === listaId);
      
      if (lista && lista.tareas[tareaIndex] && lista.tareas[tareaIndex].subtareas[subIndex]) {
        const subtarea = lista.tareas[tareaIndex].subtareas[subIndex];
        
        subtarea.fecha_migrar = fecha || null;
        subtarea.persona = persona || null;
        subtarea.estado = persona ? 'migrada' : (fecha ? 'programada' : 'pendiente');
        
        window.configVisual = { ...configVisual, listasPersonalizadas: listas };
        
        appState.ui.subtareaSeleccionada = null;
        cerrarModal('modal-migrar');
        
        if (typeof renderizarListaPersonalizada === 'function') {
          renderizarListaPersonalizada(listaId);
        }
        if (typeof guardarConfigEnFirebase === 'function') {
          guardarConfigEnFirebase();
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

    subtarea.fecha_migrar = fecha || null;
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
    const listasPersonalizadas = configVisual.listasPersonalizadas || [];
    const lista = listasPersonalizadas.find(l => l.id === listaId);

    if (lista && lista.tareas[tareaIndex]) {
      const tarea = lista.tareas[tareaIndex];

      tarea.fecha_migrar = fecha || null;
      tarea.persona = persona || null;
      tarea.estado = persona ? 'migrada' : (fecha ? 'programada' : 'pendiente');

      window.configVisual = { ...configVisual, listasPersonalizadas };
      if (typeof guardarConfigEnFirebase === 'function') {
        guardarConfigEnFirebase();
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

  tarea.fecha_migrar = fecha || null;
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
        <input type="date" id="editor-fecha" value="${tarea.fecha_fin || ''}">
      </div>
      <div class="form-group">
        <label>Persona delegada:</label>
        <input type="text" id="editor-persona" value="${tarea.persona || ''}">
      </div>
      <div class="form-group">
        <label>Fecha migración:</label>
        <input type="date" id="editor-fecha-migrar" value="${tarea.fecha_migrar || ''}">
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
  const persona = document.getElementById('editor-persona').value.trim();
  const fechaMigrar = document.getElementById('editor-fecha-migrar').value;

  if (!texto) {
    alert('El texto no puede estar vacío');
    return;
  }

  const esNuevaTarea = index === null || index === undefined;

  if (esNuevaTarea) {
    // CREAR nueva tarea
    const nuevaTarea = {
      id: Date.now().toString(),
      completada: false,
      fecha_creacion: new Date().toISOString(),
      estado: persona ? 'migrada' : (fechaMigrar ? 'programada' : 'pendiente'),
      etiqueta: '',
      fecha_fin: fecha || null,
      persona: persona || null,
      fecha_migrar: fechaMigrar || null
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

    tarea.fecha_fin = fecha || null;
    tarea.persona = persona || null;
    tarea.fecha_migrar = fechaMigrar || null;

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

function agregarSubtareaCritica(tareaIndex) {
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
  guardarJSON(true);
  mostrarAlerta('📝 Subtarea crítica añadida', 'success');
}

function toggleSubtareaCritica(tareaIndex, subIndex) {
  const subtarea = appState.agenda.tareas_criticas[tareaIndex].subtareas[subIndex];
  subtarea.completada = !subtarea.completada;

  renderizar();
  guardarJSON(true);

  if (subtarea.completada) {
    mostrarAlerta('✅ Subtarea crítica completada', 'success');
    mostrarCelebracion();
  }
}

function eliminarSubtareaCritica(tareaIndex, subIndex) {
  appState.agenda.tareas_criticas[tareaIndex].subtareas.splice(subIndex, 1);
  renderizar();
  guardarJSON(true);
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

function agregarSubtarea(tareaIndex) {
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
  guardarJSON(true);
  mostrarAlerta('📝 Subtarea añadida', 'success');
}

function toggleSubtarea(tareaIndex, subIndex) {
  const subtarea = appState.agenda.tareas[tareaIndex].subtareas[subIndex];
  subtarea.completada = !subtarea.completada;

  renderizar();
  guardarJSON(true);

  if (subtarea.completada) {
    mostrarAlerta('✅ Subtarea completada', 'success');
    mostrarCelebracion();
  }
}

function eliminarSubtarea(tareaIndex, subIndex) {
  appState.agenda.tareas[tareaIndex].subtareas.splice(subIndex, 1);
  renderizar();
  guardarJSON(true);
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
        <input type="date" id="editor-subtarea-fecha" value="${subtarea.fecha_fin || ''}">
      </div>
      <div class="form-group">
        <label>Persona asignada:</label>
        <input type="text" id="editor-subtarea-persona" value="${subtarea.persona || ''}">
      </div>
      <div class="form-group">
        <label>Fecha migración:</label>
        <input type="date" id="editor-subtarea-fecha-migrar" value="${subtarea.fecha_migrar || ''}">
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
  const persona = document.getElementById('editor-subtarea-persona').value.trim();
  const fechaMigrar = document.getElementById('editor-subtarea-fecha-migrar').value;

  if (!texto) {
    alert('El texto no puede estar vacío');
    return;
  }

  subtarea.texto = texto;
  subtarea.fecha_fin = fecha || null;
  subtarea.persona = persona || null;
  subtarea.fecha_migrar = fechaMigrar || null;

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
  let intervaloCuentaAtras = setInterval(() => {
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
window.eliminarSubtareaCritica = eliminarSubtareaCritica;
window.abrirEditorSubtarea = abrirEditorSubtarea;
window.guardarEdicionSubtarea = guardarEdicionSubtarea;
window.guardarSubtareaCompletada = guardarSubtareaCompletada;
window.manejarSeleccionPersona = manejarSeleccionPersona;
window.cargarPersonasEnSelect = cargarPersonasEnSelect;
window.aplicarColorVisualizacion = aplicarColorVisualizacion;
window.mostrarPopupCelebracion = mostrarPopupCelebracion;