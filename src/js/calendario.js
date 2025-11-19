// ========== GESTIÓN DEL CALENDARIO ==========

// ========== INICIALIZACIÓN DEL CALENDARIO ==========
function initializeCalendar() {
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      appState.calendar.currentDate.setMonth(appState.calendar.currentDate.getMonth() - 1);
      renderCalendar();
    });
  }
  
  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
      appState.calendar.currentDate.setMonth(appState.calendar.currentDate.getMonth() + 1);
      renderCalendar();
    });
  }
}

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;
  
  grid.innerHTML = '';
  const monthYearEl = document.getElementById('monthYear');
  if (monthYearEl) {
    monthYearEl.textContent = appState.calendar.currentDate.toLocaleString('es-ES', {month:'long', year:'numeric'});
  }
  
  const year = appState.calendar.currentDate.getFullYear();
  const month = appState.calendar.currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Crear exactamente 42 celdas (6 semanas x 7 días)
  for (let i = 0; i < 42; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    
    // Calcular qué día corresponde a esta celda (empezando en lunes)
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // Convertir domingo=0 a lunes=0
    const dayOffset = i - firstDayOfWeek;
    const dayNumber = dayOffset + 1;
    
    if (dayOffset >= 0 && dayOffset < lastDay.getDate()) {
      // Día del mes actual
      const dayNum = document.createElement('div');
      dayNum.className = 'day-num';
      dayNum.textContent = dayNumber;
      cell.appendChild(dayNum);
      
      // Crear fecha correcta usando el año, mes y día específicos
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
      
      // Verificar si es hoy
      const hoy = new Date().toISOString().slice(0, 10);
      const esHoy = dateStr === hoy;
      
      // Add events preview for appointments on this day
      const appointments = appState.agenda.citas.filter(cita => cita.fecha === dateStr);
      const tieneCitas = appointments.length > 0;
      
      // Aplicar clases CSS especiales
      if (esHoy && tieneCitas) {
        cell.classList.add('today', 'has-events');
      } else if (esHoy) {
        cell.classList.add('today');
      } else if (tieneCitas) {
        cell.classList.add('has-events');
      }
      
      if (tieneCitas) {
        const eventsDiv = document.createElement('div');
        eventsDiv.className = 'day-events';
        
        appointments.slice(0, 3).forEach(cita => {
          const eventDiv = document.createElement('div');
          eventDiv.className = 'day-event';
          // Extraer solo la descripción después de la hora
          const descripcion = cita.nombre.includes(' - ') ? cita.nombre.split(' - ')[1] : cita.nombre;
          eventDiv.textContent = descripcion.length > 12 ? descripcion.substring(0, 12) + '...' : descripcion;
          eventsDiv.appendChild(eventDiv);
        });
        
        if (appointments.length > 3) {
          const moreDiv = document.createElement('div');
          moreDiv.className = 'day-event';
          moreDiv.textContent = `+${appointments.length - 3} más`;
          moreDiv.style.fontStyle = 'italic';
          eventsDiv.appendChild(moreDiv);
        }
        
        cell.appendChild(eventsDiv);
      }
      
      cell.addEventListener('click', () => {
        appState.calendar.selectedDate = dateStr;
        promptAddAppointmentForDay(dateStr);
        showAppointments(dateStr);
      });
      
      cell.dataset.date = dateStr;
    } else {
      // Celda vacía (días de otros meses)
      cell.style.opacity = '0.3';
    }
    
    grid.appendChild(cell);
  }
}

function showAppointments(date) {
  const appointments = appState.agenda.citas.filter(cita => cita.fecha === date);
  const list = document.getElementById('appointmentsList');
  if (!list) return;
  
  list.innerHTML = '';
  
  if (appointments.length === 0) {
    list.innerHTML = '<div style="color:#777;padding:6px">No hay citas para este día</div>';
    return;
  }
  
  appointments.forEach(cita => {
    const appt = document.createElement('div');
    appt.className = 'cita-item';
    appt.innerHTML = `
      <span>${cita.nombre}</span>
      <button onclick="deleteCita('${date}', '${cita.nombre}')" class="boton-eliminar">🗑️</button>
    `;
    list.appendChild(appt);
  });
}

function renderAllAppointmentsList() {
  const list = document.getElementById('allAppointmentsList');
  if (!list) return;
  
  list.innerHTML = '';
  
  if(!appState.agenda.citas || appState.agenda.citas.length === 0) {
    list.innerHTML = '<div style="color:#777;padding:6px;font-size:12px;">No hay citas</div>';
    return;
  }
  
  const sortedCitas = appState.agenda.citas
    .slice()
    .sort((a,b) => a.fecha.localeCompare(b.fecha));
    
  sortedCitas.forEach(c => {
    const div = document.createElement('div');
    div.className = 'cita-item';
    div.style.fontSize = '12px';
    div.style.cursor = 'pointer';
    
    // Obtener día de la semana
    const fecha = new Date(c.fecha + 'T00:00:00');
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const diaSemana = diasSemana[fecha.getDay()];
    
    div.innerHTML = `
      <span>${diaSemana}, ${c.fecha}<br><small>${c.nombre}</small></span>
      <button onclick="deleteCita('${c.fecha}', '${c.nombre}')" class="boton-eliminar" style="font-size:10px;padding:2px 4px;">🗑️</button>
    `;
    div.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        focusCalendarOn(c.fecha);
        appState.calendar.selectedDate = c.fecha;
        showAppointments(c.fecha);
      }
    });
    list.appendChild(div);
  });
}

function renderAppointmentsList() {
  const list = document.getElementById('appointmentsList');
  if (!list) return;
  
  // Si hay una fecha seleccionada, mostrar solo las citas de ese día
  if (appState.calendar.selectedDate) {
    showAppointments(appState.calendar.selectedDate);
    return;
  }
  
  list.innerHTML = '';
}

function promptAddAppointmentForDay(dateStr) {
  appState.calendar.tempDate = dateStr;
  abrirModal('modal-hora');
  document.getElementById('cita-descripcion').focus();
}

function confirmarCita() {
  const hora = document.getElementById('hora-select').value;
  const minuto = document.getElementById('minuto-select').value;
  const descripcion = document.getElementById('cita-descripcion').value.trim();
  
  if (!descripcion) {
    alert('Por favor, ingresa una descripción');
    return;
  }
  
  const citaCompleta = `${hora}:${minuto} - ${descripcion}`;
  appState.agenda.citas.push({ fecha: appState.calendar.tempDate, nombre: citaCompleta });
  
  // Limpiar modal
  document.getElementById('cita-descripcion').value = '';
  document.getElementById('hora-select').value = '14';
  document.getElementById('minuto-select').value = '00';
  
  cerrarModal('modal-hora');
  renderCalendar();
  renderAllAppointmentsList();
  showAppointments(appState.calendar.tempDate);
  renderCitasPanel();
  guardarJSON(true);
}

async function deleteCita(fecha, nombre) {
  const index = appState.agenda.citas.findIndex(c => c.fecha === fecha && c.nombre === nombre);
  if (index > -1) {
    console.log('Usuario eliminó cita manualmente');
    const citaEliminada = appState.agenda.citas[index];
    
    // Eliminar la cita del array
    appState.agenda.citas.splice(index, 1);
    
    // Actualizar todas las vistas
    renderCalendar();
    renderAllAppointmentsList();
    showAppointments(fecha);
    renderCitasPanel();
    
    // Guardar cambios inmediatamente
    await guardarJSON(true);
  }
}

function focusCalendarOn(dateStr) {
  const parts = dateStr.split('-');
  if(parts.length === 3) {
    appState.calendar.currentDate = new Date(parseInt(parts[0]), parseInt(parts[1])-1, 1);
    renderCalendar();
    highlightDate(dateStr);
  }
}

function highlightDate(dateStr) {
  const cell = document.querySelector(`.calendar-day[data-date="${dateStr}"]`);
  if(cell) {
    cell.classList.add('selected');
    setTimeout(() => cell.classList.remove('selected'), 1200);
  }
}

// ========== PANEL DE CITAS ==========
let mostrarTodasLasCitas = true;

function cambiarFiltroCitas() {
  const filtro = document.getElementById('filtro-citas').value;
  mostrarTodasLasCitas = filtro === 'todas';
  renderCitasPanel();
}

function renderCitasPanel() {
  const panel = document.getElementById('citas-panel');
  if (!panel) return;
  
  panel.innerHTML = '';
  
  if(!appState.agenda.citas || appState.agenda.citas.length === 0) {
    panel.innerHTML = '<div style="color:#777;padding:10px;text-align:center;">No hay citas</div>';
    return;
  }
  
  // Verificar configuración de mostrar todo
  const configOpciones = JSON.parse(localStorage.getItem('config-opciones') || '{}');
  const mostrarTodoConfig = configOpciones.mostrarTodo || false;
  
  let citasFiltradas = appState.agenda.citas.slice();
  
  // Filtrar por próximas 30 días si no se muestran todas y no está configurado mostrar todo
  if (!mostrarTodasLasCitas && !mostrarTodoConfig) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hace15Dias = new Date();
    hace15Dias.setDate(hoy.getDate() - 15);
    hace15Dias.setHours(0, 0, 0, 0);
    const en30Dias = new Date();
    en30Dias.setDate(hoy.getDate() + 30);
    en30Dias.setHours(23, 59, 59, 999);
    
    citasFiltradas = citasFiltradas.filter(cita => {
      const fechaCita = new Date(cita.fecha + 'T00:00:00');
      return fechaCita >= hace15Dias && fechaCita <= en30Dias;
    });
  }
  
  if (citasFiltradas.length === 0) {
    const mensaje = (mostrarTodasLasCitas || mostrarTodoConfig) ? 'No hay citas' : 'No hay citas en los próximos 30 días';
    panel.innerHTML = `<div style="color:#777;padding:10px;text-align:center;">${mensaje}</div>`;
    return;
  }
  
  const sortedCitas = citasFiltradas.sort((a,b) => a.fecha.localeCompare(b.fecha));
    
  sortedCitas.forEach(c => {
    const div = document.createElement('div');
    div.className = 'cita-item';
    div.style.fontSize = '12px';
    div.style.cursor = 'pointer';
    
    // Obtener día de la semana
    const fecha = new Date(c.fecha + 'T00:00:00');
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const diaSemana = diasSemana[fecha.getDay()];
    
    // Verificar si la cita es hoy o pasada
    const esHoy = esFechaHoy(c.fecha);
    const esPasada = esFechaPasada(c.fecha);
    
    if (esPasada || esHoy) {
      div.style.background = '#ffebee';
      div.style.border = '2px solid #f44336';
      div.style.boxShadow = '0 2px 8px rgba(244, 67, 54, 0.3)';
    }
    
    let alertaHtml = '';
    if (esPasada) {
      alertaHtml = '<span class="alerta-urgente" title="¡Cita pasada!">⚠️⚠️⚠️ Fecha pasada</span>';
    } else if (esHoy) {
      alertaHtml = '<span class="alerta-urgente" title="¡Cita hoy!">⚠️ Vence hoy</span>';
    }
    
    div.innerHTML = `
      <span style="${(esHoy || esPasada) ? 'color: #d32f2f; font-weight: bold;' : ''}">${diaSemana}, ${c.fecha}<br><small>${c.nombre}</small></span>
      ${alertaHtml}
      <button onclick="deleteCita('${c.fecha}', '${c.nombre}')" class="boton-eliminar" style="font-size:10px;padding:2px 4px;">🗑️</button>
    `;
    
    div.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON') {
        abrirModal('modal-calendar');
        focusCalendarOn(c.fecha);
        appState.calendar.selectedDate = c.fecha;
        renderCalendar();
        renderAllAppointmentsList();
        showAppointments(c.fecha);
      }
    });
    panel.appendChild(div);
  });
}

// ========== NUEVAS CITAS ==========
function abrirModalNuevaCita() {
  // Establecer fecha de hoy por defecto
  const hoy = new Date().toISOString().slice(0, 10);
  document.getElementById('nueva-cita-fecha').value = hoy;
  
  // Limpiar campos
  document.getElementById('nueva-cita-desc').value = '';
  document.getElementById('nueva-cita-hora').value = '14';
  document.getElementById('nueva-cita-minutos').value = '00';
  
  abrirModal('modal-nueva-cita');
  setTimeout(() => document.getElementById('nueva-cita-desc').focus(), 100);
}

function guardarNuevaCita() {
  const fecha = document.getElementById('nueva-cita-fecha').value;
  const descripcion = document.getElementById('nueva-cita-desc').value.trim();
  const hora = document.getElementById('nueva-cita-hora').value;
  const minutos = document.getElementById('nueva-cita-minutos').value;
  const addToGoogle = document.getElementById('nueva-cita-google')?.checked || false;
  
  if (!fecha) {
    alert('Por favor, selecciona una fecha');
    return;
  }
  
  if (!descripcion) {
    alert('Por favor, ingresa una descripción');
    return;
  }
  
  const citaCompleta = `${hora}:${minutos} - ${descripcion}`;
  appState.agenda.citas.push({ fecha, nombre: citaCompleta });
  
  // Crear evento en Google Calendar si está marcado
  if (addToGoogle) {
    crearEventoGoogleCalendar(descripcion, fecha + 'T' + hora + ':' + minutos + ':00');
  }
  
  cerrarModal('modal-nueva-cita');
  renderCalendar();
  renderAllAppointmentsList();
  renderCitasPanel();
  guardarJSON(true);
  
  mostrarAlerta('📅 Cita añadida correctamente', 'success');
}

function abrirCalendario() {
  abrirModal('modal-calendar');
  renderCalendar();
  renderAllAppointmentsList();
  renderAppointmentsList();
}

function abrirCalendarioTareas() {
  abrirModal('modal-calendar-tareas');
  renderCalendarTareas();
  renderAllTasksList();
}

function renderCalendarTareas() {
  // Similar a renderCalendar pero para tareas
  const grid = document.getElementById('calendarGridTareas');
  if (!grid) return;
  
  grid.innerHTML = '';
  const monthYearEl = document.getElementById('monthYearTareas');
  if (monthYearEl) {
    monthYearEl.textContent = appState.calendar.currentDate.toLocaleString('es-ES', {month:'long', year:'numeric'});
  }
  
  // Implementación similar a renderCalendar pero mostrando tareas en lugar de citas
  const year = appState.calendar.currentDate.getFullYear();
  const month = appState.calendar.currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  for (let i = 0; i < 42; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
    const dayOffset = i - firstDayOfWeek;
    const dayNumber = dayOffset + 1;
    
    if (dayOffset >= 0 && dayOffset < lastDay.getDate()) {
      const dayNum = document.createElement('div');
      dayNum.className = 'day-num';
      dayNum.textContent = dayNumber;
      cell.appendChild(dayNum);
      
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
      
      // Buscar tareas para este día
      const tareasDelDia = [...appState.agenda.tareas_criticas, ...appState.agenda.tareas]
        .filter(t => t.fecha_fin === dateStr || t.fecha_migrar === dateStr);
      
      if (tareasDelDia.length > 0) {
        cell.classList.add('has-events');
        const eventsDiv = document.createElement('div');
        eventsDiv.className = 'day-events';
        
        tareasDelDia.slice(0, 2).forEach(tarea => {
          const eventDiv = document.createElement('div');
          eventDiv.className = 'day-event';
          const texto = tarea.titulo || tarea.texto;
          eventDiv.textContent = texto.length > 10 ? texto.substring(0, 10) + '...' : texto;
          eventsDiv.appendChild(eventDiv);
        });
        
        cell.appendChild(eventsDiv);
      }
      
      cell.dataset.date = dateStr;
    } else {
      cell.style.opacity = '0.3';
    }
    
    grid.appendChild(cell);
  }
}

function renderAllTasksList() {
  const list = document.getElementById('allTasksList');
  if (!list) return;
  
  list.innerHTML = '';
  
  const todasLasTareas = [...appState.agenda.tareas_criticas, ...appState.agenda.tareas]
    .filter(t => t.fecha_fin || t.fecha_migrar)
    .sort((a, b) => {
      const fechaA = a.fecha_fin || a.fecha_migrar;
      const fechaB = b.fecha_fin || b.fecha_migrar;
      return fechaA.localeCompare(fechaB);
    });
    
  if (todasLasTareas.length === 0) {
    list.innerHTML = '<div style="color:#777;padding:6px;font-size:12px;">No hay tareas con fecha</div>';
    return;
  }
  
  todasLasTareas.forEach(tarea => {
    const div = document.createElement('div');
    div.className = 'cita-item';
    div.style.fontSize = '12px';
    
    const fecha = tarea.fecha_fin || tarea.fecha_migrar;
    const fechaObj = new Date(fecha + 'T00:00:00');
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const diaSemana = diasSemana[fechaObj.getDay()];
    
    const texto = tarea.titulo || tarea.texto;
    div.innerHTML = `
      <span>${diaSemana}, ${fecha}<br><small>${texto}</small></span>
    `;
    
    list.appendChild(div);
  });
}

// ========== CITAS PERIÓDICAS ==========
function abrirModalCitaPeriodica() {
  const hoy = new Date().toISOString().slice(0, 10);
  document.getElementById('periodica-fecha-inicio').value = hoy;
  
  const fechaFin = new Date();
  fechaFin.setMonth(fechaFin.getMonth() + 3);
  document.getElementById('periodica-fecha-fin').value = fechaFin.toISOString().slice(0, 10);
  
  document.getElementById('periodica-descripcion').value = '';
  document.getElementById('periodica-hora').value = '14';
  document.getElementById('periodica-minutos').value = '00';
  document.getElementById('periodica-frecuencia').value = 'semanal';
  
  abrirModal('modal-cita-periodica');
  setTimeout(() => document.getElementById('periodica-descripcion').focus(), 100);
}

function crearCitaPeriodica() {
  const descripcion = document.getElementById('periodica-descripcion').value.trim();
  const fechaInicio = document.getElementById('periodica-fecha-inicio').value;
  const fechaFin = document.getElementById('periodica-fecha-fin').value;
  const hora = document.getElementById('periodica-hora').value;
  const minutos = document.getElementById('periodica-minutos').value;
  const frecuencia = document.getElementById('periodica-frecuencia').value;
  
  if (!descripcion || !fechaInicio || !fechaFin) {
    alert('Por favor, completa todos los campos');
    return;
  }
  
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  const citasCreadas = [];
  
  let fechaActual = new Date(inicio);
  
  while (fechaActual <= fin) {
    const fechaStr = fechaActual.toISOString().slice(0, 10);
    const citaCompleta = `${hora}:${minutos} - ${descripcion}`;
    
    appState.agenda.citas.push({ fecha: fechaStr, nombre: citaCompleta });
    citasCreadas.push(fechaStr);
    
    // Calcular siguiente fecha según frecuencia
    switch (frecuencia) {
      case 'semanal':
        fechaActual.setDate(fechaActual.getDate() + 7);
        break;
      case 'quincenal':
        fechaActual.setDate(fechaActual.getDate() + 15);
        break;
      case 'mensual':
        fechaActual.setMonth(fechaActual.getMonth() + 1);
        break;
      case 'semestral':
        fechaActual.setMonth(fechaActual.getMonth() + 6);
        break;
      case 'anual':
        fechaActual.setFullYear(fechaActual.getFullYear() + 1);
        break;
    }
  }
  
  cerrarModal('modal-cita-periodica');
  renderCalendar();
  renderAllAppointmentsList();
  renderCitasPanel();
  guardarJSON(true);
  
  mostrarAlerta(`📅 ${citasCreadas.length} citas periódicas creadas`, 'success');
}

// ========== CITAS RELATIVAS ==========
let citasRelativasTemp = [];

function abrirModalCitasRelativas() {
  citasRelativasTemp = [];
  const hoy = new Date().toISOString().slice(0, 10);
  document.getElementById('fecha-base-citas').value = hoy;
  document.getElementById('nueva-cita-descripcion').value = '';
  document.getElementById('dias-offset').value = '0';
  document.getElementById('meses-offset').value = '0';
  document.getElementById('anos-offset').value = '0';
  document.getElementById('lista-citas-relativas').innerHTML = '';
  
  abrirModal('modal-citas-relativas');
  setTimeout(() => document.getElementById('nueva-cita-descripcion').focus(), 100);
}

function actualizarPreviewFecha() {
  const fechaBase = document.getElementById('fecha-base-citas').value;
  const dias = parseInt(document.getElementById('dias-offset').value) || 0;
  const meses = parseInt(document.getElementById('meses-offset').value) || 0;
  const anos = parseInt(document.getElementById('anos-offset').value) || 0;
  
  if (!fechaBase) {
    document.getElementById('preview-fecha').textContent = 'Fecha resultante: --';
    return;
  }
  
  const fecha = new Date(fechaBase);
  fecha.setDate(fecha.getDate() + dias);
  fecha.setMonth(fecha.getMonth() + meses);
  fecha.setFullYear(fecha.getFullYear() + anos);
  
  const fechaResultante = fecha.toISOString().slice(0, 10);
  document.getElementById('preview-fecha').textContent = `Fecha resultante: ${fechaResultante}`;
}

function agregarCitaRelativa() {
  const descripcion = document.getElementById('nueva-cita-descripcion').value.trim();
  const fechaBase = document.getElementById('fecha-base-citas').value;
  const dias = parseInt(document.getElementById('dias-offset').value) || 0;
  const meses = parseInt(document.getElementById('meses-offset').value) || 0;
  const anos = parseInt(document.getElementById('anos-offset').value) || 0;
  const hora = document.getElementById('hora-cita-relativa').value;
  const minutos = document.getElementById('minutos-cita-relativa').value;
  
  if (!descripcion || !fechaBase) {
    alert('Por favor, completa la descripción y fecha base');
    return;
  }
  
  const fecha = new Date(fechaBase);
  fecha.setDate(fecha.getDate() + dias);
  fecha.setMonth(fecha.getMonth() + meses);
  fecha.setFullYear(fecha.getFullYear() + anos);
  
  const fechaResultante = fecha.toISOString().slice(0, 10);
  const citaCompleta = `${hora}:${minutos} - ${descripcion}`;
  
  citasRelativasTemp.push({ fecha: fechaResultante, nombre: citaCompleta });
  
  // Actualizar lista visual
  const lista = document.getElementById('lista-citas-relativas');
  const div = document.createElement('div');
  div.className = 'cita-relativa-item';
  div.innerHTML = `
    <span class="fecha-calculada">${fechaResultante}</span>
    <span class="descripcion">${citaCompleta}</span>
    <button class="btn-eliminar" onclick="eliminarCitaRelativa(${citasRelativasTemp.length - 1})">🗑️</button>
  `;
  lista.appendChild(div);
  
  // Limpiar formulario
  document.getElementById('nueva-cita-descripcion').value = '';
  document.getElementById('dias-offset').value = '0';
  document.getElementById('meses-offset').value = '0';
  document.getElementById('anos-offset').value = '0';
  actualizarPreviewFecha();
}

function eliminarCitaRelativa(index) {
  citasRelativasTemp.splice(index, 1);
  
  // Re-renderizar lista
  const lista = document.getElementById('lista-citas-relativas');
  lista.innerHTML = '';
  citasRelativasTemp.forEach((cita, i) => {
    const div = document.createElement('div');
    div.className = 'cita-relativa-item';
    div.innerHTML = `
      <span class="fecha-calculada">${cita.fecha}</span>
      <span class="descripcion">${cita.nombre}</span>
      <button class="btn-eliminar" onclick="eliminarCitaRelativa(${i})">🗑️</button>
    `;
    lista.appendChild(div);
  });
}

function guardarCitasRelativas() {
  if (citasRelativasTemp.length === 0) {
    alert('No hay citas para guardar');
    return;
  }
  
  citasRelativasTemp.forEach(cita => {
    appState.agenda.citas.push(cita);
  });
  
  cerrarModal('modal-citas-relativas');
  renderCalendar();
  renderAllAppointmentsList();
  renderCitasPanel();
  guardarJSON(true);
  
  mostrarAlerta(`📅 ${citasRelativasTemp.length} citas guardadas`, 'success');
  citasRelativasTemp = [];
}

// Hacer funciones disponibles globalmente
window.initializeCalendar = initializeCalendar;
window.renderCalendar = renderCalendar;
window.showAppointments = showAppointments;
window.renderAllAppointmentsList = renderAllAppointmentsList;
window.renderAppointmentsList = renderAppointmentsList;
window.promptAddAppointmentForDay = promptAddAppointmentForDay;
window.confirmarCita = confirmarCita;
window.deleteCita = deleteCita;
window.focusCalendarOn = focusCalendarOn;
window.highlightDate = highlightDate;
window.cambiarFiltroCitas = cambiarFiltroCitas;
window.renderCitasPanel = renderCitasPanel;
window.abrirModalNuevaCita = abrirModalNuevaCita;
window.guardarNuevaCita = guardarNuevaCita;
window.abrirCalendario = abrirCalendario;
window.abrirCalendarioTareas = abrirCalendarioTareas;
window.renderCalendarTareas = renderCalendarTareas;
window.renderAllTasksList = renderAllTasksList;
window.abrirModalCitaPeriodica = abrirModalCitaPeriodica;
window.crearCitaPeriodica = crearCitaPeriodica;
window.abrirModalCitasRelativas = abrirModalCitasRelativas;
window.actualizarPreviewFecha = actualizarPreviewFecha;
window.agregarCitaRelativa = agregarCitaRelativa;
window.eliminarCitaRelativa = eliminarCitaRelativa;
window.guardarCitasRelativas = guardarCitasRelativas;