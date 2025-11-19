// ========== GESTIÓN DE TAREAS ==========

// ========== RENDERIZAR TAREAS ==========
function renderizar() {
  requestAnimationFrame(() => {
    renderizarCriticas();
    renderizarTareas();
    renderCitasPanel();
    
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
  const configOpciones = JSON.parse(localStorage.getItem('config-opciones') || '{}');
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
    } else if (tarea.estado === 'completada') {
      div.classList.add('completada');
    } else if (tarea.estado === 'migrada') {
      div.classList.add('migrada');
    } else if (tarea.estado === 'programada') {
      div.classList.add('programada');
    }
    
    const simbolo = document.createElement('span');
    simbolo.className = 'tarea-simbolo';
    simbolo.textContent = obtenerSimbolo(tarea);
    simbolo.onclick = () => cambiarEstadoCritica(realIndex);
    
    const texto = document.createElement('div');
    texto.className = 'tarea-texto';
    texto.style.cursor = 'pointer';
    let contenido = `<strong>${escapeHtml(tarea.titulo)}</strong>`;
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
    
    // Botón de borrar - siempre visible
    const btnBorrar = document.createElement('button');
    btnBorrar.className = 'btn-borrar-tarea';
    btnBorrar.textContent = '🗑️';
    btnBorrar.title = 'Eliminar tarea crítica';
    btnBorrar.onclick = async (e) => {
      e.stopPropagation();
      
      // Verificar configuración de confirmación
      const configFuncionales = JSON.parse(localStorage.getItem('config-funcionales') || '{}');
      const necesitaConfirmacion = configFuncionales.confirmacionBorrar !== false; // Por defecto true
      
      if (necesitaConfirmacion) {
        mostrarCuentaRegresiva(() => {
          appState.agenda.tareas_criticas.splice(realIndex, 1);
          renderizar();
          guardarJSON(true);
          mostrarAlerta('🗑️ Tarea crítica eliminada', 'info');
        });
      } else {
        appState.agenda.tareas_criticas.splice(realIndex, 1);
        renderizar();
        await guardarJSON(true);
        mostrarAlerta('🗑️ Tarea crítica eliminada', 'info');
      }
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
      div.draggable = !isMobile();
      div.dataset.tipo = 'critica';
      div.dataset.index = realIndex;
      
      // Eventos touch para móvil
      if (isMobile()) {
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
        subSimbolo.textContent = subtarea.completada ? '✓' : '○';
        subSimbolo.onclick = () => toggleSubtareaCritica(realIndex, subIndex);
        
        const subTexto = document.createElement('div');
        subTexto.className = 'subtarea-texto';
        subTexto.style.cursor = 'pointer';
        subTexto.textContent = subtarea.texto;
        subTexto.onclick = () => abrirEditorSubtarea(realIndex, subIndex, 'critica');
        
        const btnMigrarSub = document.createElement('button');
        btnMigrarSub.className = 'btn-migrar-subtarea';
        btnMigrarSub.textContent = '→';
        btnMigrarSub.title = 'Posponer/Asignar subtarea';
        btnMigrarSub.onclick = (e) => {
          e.stopPropagation();
          abrirMigracionSubtarea(realIndex, subIndex, 'critica');
        };
        
        const btnBorrarSub = document.createElement('button');
        btnBorrarSub.className = 'btn-borrar-subtarea';
        btnBorrarSub.textContent = '🗑️';
        btnBorrarSub.onclick = (e) => {
          e.stopPropagation();
          eliminarSubtareaCritica(realIndex, subIndex);
        };
        
        subDiv.appendChild(subSimbolo);
        subDiv.appendChild(subTexto);
        subDiv.appendChild(btnMigrarSub);
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
  const configOpciones = JSON.parse(localStorage.getItem('config-opciones') || '{}');
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
    } else if (tarea.estado === 'completada') {
      div.classList.add('completada');
    } else if (tarea.estado === 'migrada') {
      div.classList.add('migrada');
    } else if (tarea.estado === 'programada') {
      div.classList.add('programada');
    }
    
    const simbolo = document.createElement('span');
    simbolo.className = 'tarea-simbolo';
    simbolo.textContent = obtenerSimbolo(tarea);
    simbolo.onclick = () => cambiarEstadoTarea(realIndex);
    
    const texto = document.createElement('div');
    texto.className = 'tarea-texto';
    texto.style.cursor = 'pointer';
    let contenido = escapeHtml(tarea.texto);
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
    
    // Botón de borrar - siempre visible
    const btnBorrar = document.createElement('button');
    btnBorrar.className = 'btn-borrar-tarea';
    btnBorrar.textContent = '🗑️';
    btnBorrar.title = 'Eliminar tarea';
    btnBorrar.onclick = async (e) => {
      e.stopPropagation();
      
      // Verificar configuración de confirmación
      const configFuncionales = JSON.parse(localStorage.getItem('config-funcionales') || '{}');
      const necesitaConfirmacion = configFuncionales.confirmacionBorrar !== false; // Por defecto true
      
      if (necesitaConfirmacion) {
        mostrarCuentaRegresiva(() => {
          appState.agenda.tareas.splice(realIndex, 1);
          renderizar();
          guardarJSON(true);
          mostrarAlerta('🗑️ Tarea eliminada', 'info');
        });
      } else {
        appState.agenda.tareas.splice(realIndex, 1);
        renderizar();
        await guardarJSON(true);
        mostrarAlerta('🗑️ Tarea eliminada', 'info');
      }
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
      div.draggable = !isMobile();
      div.dataset.tipo = 'tarea';
      div.dataset.index = realIndex;
      
      // Eventos touch para móvil
      if (isMobile()) {
        div.addEventListener('touchstart', handleTouchStart, { passive: false });
        div.addEventListener('touchmove', handleTouchMove, { passive: false });
        div.addEventListener('touchend', handleTouchEnd, { passive: false });
      } else {
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragend', handleDragEnd);
      }
    }
    
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
    
    lista.appendChild(div);
    
    // Renderizar subtareas si existen
    if (tarea.subtareas && tarea.subtareas.length > 0) {
      tarea.subtareas.forEach((subtarea, subIndex) => {
        const subDiv = document.createElement('div');
        subDiv.className = 'subtarea-item';
        if (subtarea.completada) subDiv.classList.add('subtarea-completada');
        
        const subSimbolo = document.createElement('span');
        subSimbolo.className = 'subtarea-simbolo';
        subSimbolo.textContent = subtarea.completada ? '✓' : '○';
        subSimbolo.onclick = () => toggleSubtarea(realIndex, subIndex);
        
        const subTexto = document.createElement('div');
        subTexto.className = 'subtarea-texto';
        subTexto.style.cursor = 'pointer';
        subTexto.textContent = subtarea.texto;
        subTexto.onclick = () => abrirEditorSubtarea(realIndex, subIndex, 'tarea');
        
        const btnMigrarSub = document.createElement('button');
        btnMigrarSub.className = 'btn-migrar-subtarea';
        btnMigrarSub.textContent = '→';
        btnMigrarSub.title = 'Posponer/Asignar subtarea';
        btnMigrarSub.onclick = (e) => {
          e.stopPropagation();
          abrirMigracionSubtarea(realIndex, subIndex, 'tarea');
        };
        
        const btnBorrarSub = document.createElement('button');
        btnBorrarSub.className = 'btn-borrar-subtarea';
        btnBorrarSub.textContent = '🗑️';
        btnBorrarSub.onclick = (e) => {
          e.stopPropagation();
          eliminarSubtarea(realIndex, subIndex);
        };
        
        subDiv.appendChild(subSimbolo);
        subDiv.appendChild(subTexto);
        subDiv.appendChild(btnMigrarSub);
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
  const tarea = appState.agenda.tareas_criticas[index];
  
  if (tarea.estado === 'pendiente') {
    tarea.estado = 'migrada';
    tarea.completada = false;
    appState.ui.tareaSeleccionada = { tipo: 'critica', index };
    abrirModal('modal-migrar');
    return;
  } else if (tarea.estado === 'migrada') {
    // Si tiene persona asignada, mantener como migrada, sino pasar a programada
    if (tarea.persona) {
      tarea.estado = 'completada';
      tarea.completada = true;
      guardarTareaCompletada(tarea, true);
      mostrarCelebracion();
    } else {
      tarea.estado = 'programada';
      tarea.completada = false;
    }
  } else if (tarea.estado === 'programada') {
    tarea.estado = 'completada';
    tarea.completada = true;
    guardarTareaCompletada(tarea, true);
    mostrarCelebracion();
  } else {
    tarea.estado = 'pendiente';
    tarea.completada = false;
    delete tarea.persona;
    delete tarea.fecha_migrar;
  }
  
  renderizar();
  scheduleAutoSave();
}

function cambiarEstadoTarea(index) {
  const tarea = appState.agenda.tareas[index];
  
  if (tarea.estado === 'pendiente') {
    tarea.estado = 'migrada';
    tarea.completada = false;
    appState.ui.tareaSeleccionada = { tipo: 'tarea', index };
    abrirModal('modal-migrar');
    return;
  } else if (tarea.estado === 'migrada') {
    // Si tiene persona asignada, mantener como migrada, sino pasar a programada
    if (tarea.persona) {
      tarea.estado = 'completada';
      tarea.completada = true;
      guardarTareaCompletada(tarea, false);
      mostrarCelebracion();
    } else {
      tarea.estado = 'programada';
      tarea.completada = false;
    }
  } else if (tarea.estado === 'programada') {
    tarea.estado = 'completada';
    tarea.completada = true;
    guardarTareaCompletada(tarea, false);
    mostrarCelebracion();
  } else {
    tarea.estado = 'pendiente';
    tarea.completada = false;
    delete tarea.persona;
    delete tarea.fecha_migrar;
  }
  
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
    // Configurar autocompletado para el campo de persona
    if (id === 'modal-migrar') {
      setupPersonasAutocomplete();
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
    modal.querySelectorAll('input, textarea').forEach(el => el.value = '');
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
  
  if (!titulo) {
    alert('Por favor, ingresa un título');
    return;
  }
  
  // Verificar si se debe forzar fecha (nueva configuración funcional)
  const configFuncionales = JSON.parse(localStorage.getItem('config-funcionales') || '{}');
  if (configFuncionales.fechaObligatoria && !fecha) {
    alert('Debes seleccionar una fecha límite para crear la tarea');
    return;
  }
  
  if (appState.ui.criticaEditando !== null) {
    // Editando tarea crítica existente
    const tarea = appState.agenda.tareas_criticas[appState.ui.criticaEditando];
    tarea.titulo = titulo;
    tarea.fecha_fin = fecha;
    appState.ui.criticaEditando = null;
  } else {
    // Nueva tarea crítica
    const nuevaTarea = {
      id: Date.now().toString(),
      titulo,
      razon: '',
      fecha_fin: fecha,
      completada: false,
      estado: 'pendiente',
      fecha_creacion: new Date().toISOString()
    };
    appState.agenda.tareas_criticas.push(nuevaTarea);
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
  
  if (!texto) {
    alert('Por favor, ingresa una descripción');
    return;
  }
  
  // Verificar si se debe forzar fecha (nueva configuración funcional)
  const configFuncionales = JSON.parse(localStorage.getItem('config-funcionales') || '{}');
  if (configFuncionales.fechaObligatoria && !fecha) {
    alert('Debes seleccionar una fecha límite para crear la tarea');
    return;
  }
  
  if (appState.ui.tareaEditando !== null) {
    // Editando tarea existente
    const tarea = appState.agenda.tareas[appState.ui.tareaEditando];
    tarea.texto = texto;
    tarea.fecha_fin = fecha;
    appState.ui.tareaEditando = null;
  } else {
    // Nueva tarea
    const nuevaTarea = {
      id: Date.now().toString(),
      texto,
      fecha_fin: fecha,
      completada: false,
      estado: 'pendiente',
      fecha_creacion: new Date().toISOString()
    };
    appState.agenda.tareas.push(nuevaTarea);
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
  const persona = document.getElementById('migrar-persona').value.trim();
  
  // Guardar nueva persona si no existe
  if (persona && !appState.agenda.personas.includes(persona)) {
    appState.agenda.personas.push(persona);
  }
  
  // Verificar si es una subtarea
  if (window.subtareaSeleccionada) {
    guardarMigracionSubtarea();
    return;
  }
  
  if (!appState.ui.tareaSeleccionada) {
    cerrarModal('modal-migrar');
    return;
  }
  
  const seleccion = appState.ui.tareaSeleccionada;
  const { tipo, index } = seleccion;
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
  
  // Mostrar confirmación
  if (persona) {
    mostrarAlerta(`→ Tarea delegada a ${persona}`, 'success');
  } else if (fecha) {
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
    
    // Filtro por prioridad
    if (filtros.prioridad) {
      const esUrgente = esFechaHoy(tarea.fecha_fin) || esFechaHoy(tarea.fecha_migrar) || esFechaPasada(tarea.fecha_fin) || esFechaPasada(tarea.fecha_migrar);
      
      switch (filtros.prioridad) {
        case 'urgente':
          if (!esUrgente || tarea.completada) return false;
          break;
        case 'normal':
          if (esUrgente && !tarea.completada) return false;
          break;
      }
    }
    
    return true;
  });
}

function aplicarFiltros() {
  // Obtener valores de filtros para críticas
  appState.filtros.criticas.estado = document.getElementById('filtro-estado-criticas')?.value || '';
  appState.filtros.criticas.fecha = document.getElementById('filtro-fecha-criticas')?.value || '';
  appState.filtros.criticas.prioridad = document.getElementById('filtro-prioridad-criticas')?.value || '';
  
  // Obtener valores de filtros para tareas
  appState.filtros.tareas.estado = document.getElementById('filtro-estado-tareas')?.value || '';
  appState.filtros.tareas.fecha = document.getElementById('filtro-fecha-tareas')?.value || '';
  appState.filtros.tareas.prioridad = document.getElementById('filtro-prioridad-tareas')?.value || '';
  
  // Actualizar estilos visuales de filtros activos
  actualizarEstilosFiltros();
  
  // Re-renderizar
  renderizar();
}

function actualizarEstilosFiltros() {
  // Filtros de críticas
  const filtrosCriticas = ['filtro-estado-criticas', 'filtro-fecha-criticas', 'filtro-prioridad-criticas'];
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
  const filtrosTareas = ['filtro-estado-tareas', 'filtro-fecha-tareas', 'filtro-prioridad-tareas'];
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
    prioridad: ''
  };
  
  // Limpiar selects del DOM
  const filtros = [
    `filtro-estado-${tipo}`,
    `filtro-fecha-${tipo}`,
    `filtro-prioridad-${tipo}`
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
function setupPersonasAutocomplete() {
  const input = document.getElementById('migrar-persona');
  const dropdown = document.getElementById('personas-dropdown');
  
  if (!input || !dropdown) return;
  
  input.addEventListener('input', () => {
    const value = input.value.trim().toLowerCase();
    
    if (value.length === 0) {
      dropdown.style.display = 'none';
      return;
    }
    
    const matches = appState.agenda.personas.filter(persona => 
      persona.toLowerCase().includes(value)
    );
    
    if (matches.length === 0) {
      dropdown.style.display = 'none';
      return;
    }
    
    dropdown.innerHTML = '';
    matches.forEach(persona => {
      const item = document.createElement('div');
      item.style.cssText = 'padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;';
      item.textContent = persona;
      item.addEventListener('mouseenter', () => {
        item.style.background = '#f0f8ff';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'white';
      });
      item.addEventListener('click', () => {
        input.value = persona;
        dropdown.style.display = 'none';
        input.focus();
      });
      dropdown.appendChild(item);
    });
    
    dropdown.style.display = 'block';
  });
  
  // Ocultar dropdown al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

// ========== CELEBRACIÓN ==========
function mostrarCelebracion() {
  // Obtener frases motivacionales personalizadas
  const configVisual = JSON.parse(localStorage.getItem('config-visual') || '{}');
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
  const tarea = tipo === 'critica' ? appState.agenda.tareas_criticas[index] : appState.agenda.tareas[index];
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-editor';
  modal.innerHTML = `
    <div class="modal-content">
      <h4>✏️ Editar ${tipo === 'critica' ? 'Tarea Crítica' : 'Tarea'}</h4>
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
}

function guardarEdicion(index, tipo) {
  const tarea = tipo === 'critica' ? appState.agenda.tareas_criticas[index] : appState.agenda.tareas[index];
  const texto = document.getElementById('editor-texto').value.trim();
  const fecha = document.getElementById('editor-fecha').value;
  const persona = document.getElementById('editor-persona').value.trim();
  const fechaMigrar = document.getElementById('editor-fecha-migrar').value;
  
  if (!texto) {
    alert('El texto no puede estar vacío');
    return;
  }
  
  if (tipo === 'critica') {
    tarea.titulo = texto;
  } else {
    tarea.texto = texto;
  }
  
  tarea.fecha_fin = fecha;
  tarea.persona = persona;
  tarea.fecha_migrar = fechaMigrar;
  
  // Actualizar estado según datos
  if (persona) {
    tarea.estado = 'migrada';
  } else if (fechaMigrar) {
    tarea.estado = 'programada';
  } else {
    tarea.estado = 'pendiente';
  }
  
  cerrarModal('modal-editor');
  renderizar();
  guardarJSON(true);
  mostrarAlerta('✅ Tarea actualizada', 'success');
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
  }
}

function eliminarSubtareaCritica(tareaIndex, subIndex) {
  const configFuncionales = JSON.parse(localStorage.getItem('config-funcionales') || '{}');
  const necesitaConfirmacion = configFuncionales.confirmacionBorrar !== false;
  
  if (necesitaConfirmacion) {
    mostrarCuentaRegresiva(() => {
      appState.agenda.tareas_criticas[tareaIndex].subtareas.splice(subIndex, 1);
      renderizar();
      guardarJSON(true);
      mostrarAlerta('🗑️ Subtarea crítica eliminada', 'info');
    });
  } else {
    appState.agenda.tareas_criticas[tareaIndex].subtareas.splice(subIndex, 1);
    renderizar();
    guardarJSON(true);
    mostrarAlerta('🗑️ Subtarea crítica eliminada', 'info');
  }
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
  }
}

function eliminarSubtarea(tareaIndex, subIndex) {
  const configFuncionales = JSON.parse(localStorage.getItem('config-funcionales') || '{}');
  const necesitaConfirmacion = configFuncionales.confirmacionBorrar !== false;
  
  if (necesitaConfirmacion) {
    mostrarCuentaRegresiva(() => {
      appState.agenda.tareas[tareaIndex].subtareas.splice(subIndex, 1);
      renderizar();
      guardarJSON(true);
      mostrarAlerta('🗑️ Subtarea eliminada', 'info');
    });
  } else {
    appState.agenda.tareas[tareaIndex].subtareas.splice(subIndex, 1);
    renderizar();
    guardarJSON(true);
    mostrarAlerta('🗑️ Subtarea eliminada', 'info');
  }
}

// ========== CUENTA REGRESIVA PARA ELIMINAR ==========
function mostrarCuentaRegresiva(callback) {
  const frases = [
    '🤔 ¿Estás seguro?',
    '✨ Piensa bien...',
    '💭 Reflexiona un momento',
    '🚀 ¿Realmente quieres eliminarla?',
    '🌱 Quizás puedas completarla',
    '💪 ¿Y si la intentas una vez más?'
  ];
  
  const frase = frases[Math.floor(Math.random() * frases.length)];
  
  const overlay = document.createElement('div');
  overlay.className = 'dashboard-overlay countdown-overlay';
  overlay.innerHTML = `
    <div class="dashboard-content countdown-content">
      <div class="countdown-message">${frase}</div>
      <div class="countdown-number" id="countdown-number">3</div>
      <div class="countdown-actions">
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
    }
  }, 1000);
  
  window.currentCountdown = { overlay, intervalo };
}

function cancelarEliminacion() {
  if (window.currentCountdown) {
    clearInterval(window.currentCountdown.intervalo);
    window.currentCountdown.overlay.remove();
    window.currentCountdown = null;
    mostrarAlerta('❌ Eliminación cancelada', 'info');
  }
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
  subtarea.fecha_fin = fecha;
  subtarea.persona = persona;
  subtarea.fecha_migrar = fechaMigrar;
  
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

// Hacer funciones disponibles globalmente
window.renderizar = renderizar;
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
window.toggleSubtarea = toggleSubtarea;
window.eliminarSubtarea = eliminarSubtarea;
window.abrirModalSubtareaCritica = abrirModalSubtareaCritica;
window.agregarSubtareaCritica = agregarSubtareaCritica;
window.toggleSubtareaCritica = toggleSubtareaCritica;
window.eliminarSubtareaCritica = eliminarSubtareaCritica;
window.abrirEditorSubtarea = abrirEditorSubtarea;
window.guardarEdicionSubtarea = guardarEdicionSubtarea;
window.abrirMigracionSubtarea = abrirMigracionSubtarea;
window.guardarMigracionSubtarea = guardarMigracionSubtarea;