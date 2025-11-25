// ========== FUNCIONES HELPER PARA FECHAS ==========
function fechaArrayToString(fechaArray) {
  if (!Array.isArray(fechaArray) || fechaArray.length !== 3) return '';
  const [año, mes, dia] = fechaArray;
  return `${año}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
}

function fechaStringToArray(fechaString) {
  if (!fechaString) return [0, 0, 0];
  return fechaString.split('-').map(n => parseInt(n));
}

function compararFechaConString(fechaArray, fechaString) {
  return fechaArrayToString(fechaArray) === fechaString;
}

// ========== FUNCIONES HELPER PARA TAREAS Y LISTAS ==========
function obtenerListasPersonalizadas() {
  return window.tareasData?.listasPersonalizadas || [];
}

function obtenerTodasLasListas() {
  const obligatorias = window.tareasData?.listasObligatorias || [];
  const personalizadas = window.tareasData?.listasPersonalizadas || [];
  return [...obligatorias, ...personalizadas];
}

function actualizarListasPersonalizadas(nuevasListas) {
  if (!window.tareasData) {
    window.tareasData = { listasObligatorias: [], listasPersonalizadas: [] };
  }
  window.tareasData.listasPersonalizadas = nuevasListas;
}

let conectividadModal = null;

// ========== SISTEMA DE DETECTAR CONECTIVIDAD ==========
function mostrarAlertaConectividad(mensaje, tipo = 'warning', persistente = false) {
  if (!conectividadModal) {
    conectividadModal = document.createElement('div');
    conectividadModal.id = 'modal-conectividad';
    conectividadModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: none;
      justify-content: center;
      align-items: center;
    `;
    document.body.appendChild(conectividadModal);
  }

  const color = tipo === 'error' ? '#f44336' : tipo === 'success' ? '#4caf50' : '#ff9800';
  const icono = tipo === 'error' ? '❌' : tipo === 'success' ? '✅' : '⚠️';

  conectividadModal.innerHTML = `
    <div style="
      background: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 500px;
      width: 90%;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      border: 3px solid ${color};
    ">
      <div style="font-size: 48px; margin-bottom: 20px;">${icono}</div>
      <h3 style="margin: 0 0 15px 0; color: ${color};">ESTADO DE CONECTIVIDAD</h3>
      <p style="font-size: 18px; margin: 15px 0; color: #333;">${mensaje}</p>
      ${!persistente ? `<button onclick="cerrarModalConectividad()" style="
        background: ${color};
        color: white;
        border: none;
        padding: 12px 25px;
        border-radius: 5px;
        font-size: 16px;
        cursor: pointer;
        margin-top: 15px;
      ">Entendido</button>` : ''}
    </div>
  `;

  conectividadModal.style.display = 'flex';

  if (!persistente) {
    setTimeout(() => {
      cerrarModalConectividad();
    }, 5000);
  }
}

function cerrarModalConectividad() {
  if (conectividadModal) {
    conectividadModal.style.display = 'none';
  }
}

function procesarJSON(data) {
  console.log('🔄 procesarJSON cargando datos:', data);

  // Preservar listas personalizadas existentes si no vienen en el JSON
  const listasPersonalizadasActuales = appState.agenda?.tareasData?.listasPersonalizadas || [];

  if (data.tareasData) {
    // Preservar listasPersonalizadas si no vienen en el JSON
    if (!data.tareasData.listasPersonalizadas && listasPersonalizadasActuales.length > 0) {
      data.tareasData.listasPersonalizadas = listasPersonalizadasActuales;
    }
  }

  // Actualizar appState
  if (typeof window.appState !== 'undefined' && data.agenda) {
    window.appState.agenda = data.agenda;
  }

  // Actualizar tareasData
  if (data.tareasData) {
    window.tareasData = data.tareasData;
  }

  // Actualizar configuraciones
  if (data.configVisual) {
    window.configVisual = data.configVisual;
  }
  if (data.configFuncionales) {
    window.configFuncionales = data.configFuncionales;
  }
  if (data.configOpciones) {
    window.configOpciones = data.configOpciones;
  }

  // Aplicar configuración sincronizada
  if (typeof aplicarConfiguracionSincronizada === 'function') {
    aplicarConfiguracionSincronizada();
  }

  if (typeof renderizar === 'function') {
    renderizar();
  }
}

function cargarConfiguracionesModal() {
  const visualConfig = window.configVisual || {};

  const temaEl = document.getElementById('config-tema-select');
  const nombreEl = document.getElementById('config-nombre-input');
  const frasesEl = document.getElementById('config-frases-motivacionales');
  const popupCelebracionEl = document.getElementById('config-popup-celebracion');
  const mostrarNotasEl = document.getElementById('config-mostrar-notas');
  const mostrarSentimientosEl = document.getElementById('config-mostrar-sentimientos');
  const modoVisualizacionEl = document.getElementById('config-modo-visualizacion');

  if (temaEl) temaEl.value = visualConfig.tema || 'verde';
  if (nombreEl) nombreEl.value = visualConfig.nombre || 'Pablo';
  if (frasesEl) frasesEl.value = (visualConfig.frases || []).join('\n');
  if (popupCelebracionEl) popupCelebracionEl.checked = visualConfig.popupCelebracion !== false;
  if (mostrarNotasEl) mostrarNotasEl.checked = visualConfig.mostrarNotas !== false;
  if (mostrarSentimientosEl) mostrarSentimientosEl.checked = visualConfig.mostrarSentimientos !== false;
  if (modoVisualizacionEl) modoVisualizacionEl.value = visualConfig.modoVisualizacion || 'estado';

  cargarConfigFuncionales();

  // Sincronizar estructuras de etiquetas antes de renderizar
  sincronizarEstructurasEtiquetas();

  renderizarListaEtiquetas('etiquetas-tareas-lista', 'tareas');
  renderizarListaEtiquetas('etiquetas-citas-lista', 'citas');
  cargarLog();
  cargarListaSalvados();
  cargarListaPersonas();
  actualizarFiltrosPersonas();
  actualizarFiltrosEtiquetas();
}

function cambiarFraseMotivacional() {
  const configVisual = window.configVisual || {};
  let frases = configVisual.frases || [];

  if (frases.length === 0) {
    frases = [
      "El éxito es la suma de pequeños esfuerzos repetidos día tras día",
      "Cada día es una nueva oportunidad para mejorar",
      "La disciplina es el puente entre metas y logros"
    ];
  }

  const fraseEl = document.getElementById('frase-motivacional');
  if (fraseEl) {
    const nuevaFrase = frases[Math.floor(Math.random() * frases.length)];
    fraseEl.textContent = '"' + nuevaFrase + '"';
  }
}

// REMOVIDO: toggleConfigFloating ahora está en app.js
// Esta versión vieja usaba 'configuracion-floating' que ya no existe
/*
function toggleConfigFloating() {
  const config = document.getElementById('configuracion-floating');
  if (!config) return;

  if (config.style.display === 'none' || !config.style.display) {
    config.style.display = 'block';
  } else {
    config.style.display = 'none';
  }
}
*/

function switchTab(tabName) {
  const tabs = document.querySelectorAll('.config-tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => tab.classList.remove('active'));
  contents.forEach(content => content.classList.remove('active'));

  const activeTab = Array.from(tabs).find(tab =>
    tab.onclick?.toString().includes(`'${tabName}'`)
  );
  if (activeTab) activeTab.classList.add('active');

  const activeContent = document.getElementById(`tab-${tabName}`);
  if (activeContent) activeContent.classList.add('active');

  if (tabName === 'log') {
    cargarLog();
  } else if (tabName === 'backups') {
    cargarListaSalvados();
  } else if (tabName === 'personas') {
    cargarListaPersonas();
  }
}

function guardarConfigFuncionales() {
  const config = {
    mostrarResumenDiario: document.getElementById('config-resumen-diario')?.checked || false,
    horaResumen: document.getElementById('config-hora-resumen')?.value || '08:00',
    salvadoAutomatico: document.getElementById('config-salvado-automatico')?.checked || false,
    intervaloGuardado: parseInt(document.getElementById('config-intervalo-guardado')?.value || 5)
  };

  window.configFuncionales = config;
  guardarEnSupabase();
  mostrarAlerta('✅ Configuración funcional guardada', 'success');
}

function cargarConfigFuncionales() {
  const config = window.configFuncionales || {};

  const resumenDiarioEl = document.getElementById('config-resumen-diario');
  const horaResumenEl = document.getElementById('config-hora-resumen');
  const salvadoAutomaticoEl = document.getElementById('config-salvado-automatico');
  const intervaloGuardadoEl = document.getElementById('config-intervalo-guardado');

  if (resumenDiarioEl) resumenDiarioEl.checked = config.mostrarResumenDiario || false;
  if (horaResumenEl) horaResumenEl.value = config.horaResumen || '08:00';
  if (salvadoAutomaticoEl) salvadoAutomaticoEl.checked = config.salvadoAutomatico || false;
  if (intervaloGuardadoEl) intervaloGuardadoEl.value = config.intervaloGuardado || 5;
}

function mostrarResumenDiario() {
  const config = window.configFuncionales || {};
  if (!config.mostrarResumenDiario) return;

  const horaActual = new Date().toTimeString().slice(0, 5);
  if (horaActual === config.horaResumen) {
    console.log('⏰ Mostrando resumen diario');
  }
}

function cerrarResumenDiario() {
  const modal = document.getElementById('modal-resumen-diario');
  if (modal) modal.style.display = 'none';
}

function verHistorial() {
  console.log('📜 Ver historial');
}

function hacerCopia() {
  crearBackupManual();
}

function abrirHistoricoTareas() {
  console.log('📊 Abrir histórico de tareas');
}

function abrirGraficos() {
  console.log('📈 Abrir gráficos');
}

function restaurarBackup() {
  const select = document.getElementById('select-salvado');
  if (!select || !select.value) {
    mostrarAlerta('⚠️ Selecciona un backup para restaurar', 'warning');
    return;
  }
  restaurarSalvado(select.value);
}

function crearBackupManual() {
  const nombre = prompt('Nombre del backup:');
  if (!nombre) return;

  const backup = {
    nombre: nombre,
    fecha: new Date().toISOString(),
    datos: {
      agenda: window.appState?.agenda || {},
      tareasData: window.tareasData || {},
      configVisual: window.configVisual || {},
      configFuncionales: window.configFuncionales || {},
      configOpciones: window.configOpciones || {}
    }
  };

  // Inicializar salvadosData si no existe
  if (!window.salvadosData) window.salvadosData = { salvados: [] };
  if (!window.salvadosData.salvados) window.salvadosData.salvados = [];

  window.salvadosData.salvados.push(backup);

  // Guardar cambios en Supabase
  if (typeof guardarConfigEnSupabase === 'function') {
    guardarConfigEnSupabase();
  }

  mostrarAlerta('✅ Backup creado: ' + nombre, 'success');
  if (typeof cargarListaSalvados === 'function') {
    cargarListaSalvados();
  }
}

function guardarSentimiento(texto) {
  if (!window.appState?.agenda) return;

  const hoy = new Date().toISOString().slice(0, 10);
  const sentimiento = {
    fecha: hoy,
    texto: texto,
    timestamp: Date.now()
  };

  if (!window.appState.agenda.sentimientos) {
    window.appState.agenda.sentimientos = [];
  }

  window.appState.agenda.sentimientos.push(sentimiento);
  guardarEnSupabase();
  mostrarAlerta('✅ Sentimiento guardado', 'success');
}

function inicializarEtiquetas() {
  if (!window.tareasData) {
    window.tareasData = {
      listasObligatorias: [],
      listasPersonalizadas: [],
      etiquetas: {
        tareas: [],
        citas: []
      }
    };
  }

  if (!window.tareasData.etiquetas) {
    window.tareasData.etiquetas = {
      tareas: [],
      citas: []
    };
  }
}

function cargarEtiquetasEnSelect(selectId, tipo) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const etiquetas = window.tareasData?.etiquetas?.[tipo] || [];
  select.innerHTML = '<option value="">Sin etiqueta</option>';

  etiquetas.forEach(etiqueta => {
    const option = document.createElement('option');
    option.value = etiqueta.nombre;
    option.textContent = `${etiqueta.simbolo} ${etiqueta.nombre}`;
    select.appendChild(option);
  });
}

function renderizarListaEtiquetas(containerId, tipo) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const etiquetas = window.tareasData?.etiquetas?.[tipo] || [];
  container.innerHTML = '';

  etiquetas.forEach(etiqueta => {
    const div = document.createElement('div');
    div.className = 'etiqueta-item';
    div.innerHTML = `
      <span>${etiqueta.simbolo} ${etiqueta.nombre}</span>
      <button onclick="eliminarEtiqueta('${etiqueta.id}')" class="btn-secundario">🗑️</button>
    `;
    container.appendChild(div);
  });
}

function agregarEtiquetaTarea() {
  const nombre = document.getElementById('nueva-etiqueta-tarea')?.value;
  const simbolo = document.getElementById('simbolo-etiqueta-tarea')?.value || '🏷️';

  if (!nombre) {
    mostrarAlerta('⚠️ Ingresa un nombre para la etiqueta', 'warning');
    return;
  }

  // Inicializar ambas estructuras de datos
  if (!window.tareasData.etiquetas) {
    window.tareasData.etiquetas = { tareas: [], citas: [] };
  }
  if (!window.etiquetasData) {
    window.etiquetasData = { tareas: [], citas: [] };
  }

  const etiqueta = {
    id: Date.now().toString(),
    nombre: nombre,
    simbolo: simbolo
  };

  // Agregar a ambas estructuras para mantener sincronización
  window.tareasData.etiquetas.tareas.push(etiqueta);
  window.etiquetasData.tareas.push(etiqueta);

  guardarEnSupabase();
  renderizarListaEtiquetas('etiquetas-tareas-lista', 'tareas');
  document.getElementById('nueva-etiqueta-tarea').value = '';
  mostrarAlerta('✅ Etiqueta agregada', 'success');
}

function agregarEtiquetaCita() {
  const nombre = document.getElementById('nueva-etiqueta-cita')?.value;
  const simbolo = document.getElementById('simbolo-etiqueta-cita')?.value || '🏷️';

  if (!nombre) {
    mostrarAlerta('⚠️ Ingresa un nombre para la etiqueta', 'warning');
    return;
  }

  // Inicializar ambas estructuras de datos
  if (!window.tareasData.etiquetas) {
    window.tareasData.etiquetas = { tareas: [], citas: [] };
  }
  if (!window.etiquetasData) {
    window.etiquetasData = { tareas: [], citas: [] };
  }

  const etiqueta = {
    id: Date.now().toString(),
    nombre: nombre,
    simbolo: simbolo
  };

  // Agregar a ambas estructuras para mantener sincronización
  window.tareasData.etiquetas.citas.push(etiqueta);
  window.etiquetasData.citas.push(etiqueta);

  guardarEnSupabase();
  renderizarListaEtiquetas('etiquetas-citas-lista', 'citas');
  document.getElementById('nueva-etiqueta-cita').value = '';
  mostrarAlerta('✅ Etiqueta agregada', 'success');
}

function eliminarEtiqueta(id) {
  const tareas = window.tareasData?.etiquetas?.tareas || [];
  const citas = window.tareasData?.etiquetas?.citas || [];
  const etiquetasDataTareas = window.etiquetasData?.tareas || [];
  const etiquetasDataCitas = window.etiquetasData?.citas || [];

  const indexTareas = tareas.findIndex(e => e.id === id);
  const indexCitas = citas.findIndex(e => e.id === id);
  const indexEtiquetasDataTareas = etiquetasDataTareas.findIndex(e => e.id === id);
  const indexEtiquetasDataCitas = etiquetasDataCitas.findIndex(e => e.id === id);

  if (indexTareas !== -1) {
    window.tareasData.etiquetas.tareas.splice(indexTareas, 1);
    if (indexEtiquetasDataTareas !== -1) {
      window.etiquetasData.tareas.splice(indexEtiquetasDataTareas, 1);
    }
    renderizarListaEtiquetas('etiquetas-tareas-lista', 'tareas');
  } else if (indexCitas !== -1) {
    window.tareasData.etiquetas.citas.splice(indexCitas, 1);
    if (indexEtiquetasDataCitas !== -1) {
      window.etiquetasData.citas.splice(indexEtiquetasDataCitas, 1);
    }
    renderizarListaEtiquetas('etiquetas-citas-lista', 'citas');
  }

  guardarEnSupabase();
  mostrarAlerta('✅ Etiqueta eliminada', 'success');
}

function obtenerEtiquetaInfo(nombre, tipo) {
  const etiquetas = window.tareasData?.etiquetas?.[tipo] || [];
  return etiquetas.find(e => e.nombre === nombre);
}

function moverAHistorial(item, tipo) {
  if (!window.appState?.agenda?.historial) {
    window.appState.agenda.historial = [];
  }

  const entrada = {
    tipo: tipo,
    item: item,
    fechaEliminacion: new Date().toISOString(),
    timestamp: Date.now()
  };

  window.appState.agenda.historial.push(entrada);
  guardarEnSupabase();
}

function registrarAccion(accion, detalles = '') {
  // Inicializar si no existe
  if (!window.logAcciones) window.logAcciones = [];

  // Agregar nueva acción
  window.logAcciones.push({
    accion: accion,
    detalles: detalles,
    fecha: new Date().toISOString(),
    timestamp: Date.now()
  });

  // Limitar el log a las últimas 1000 acciones para no saturar
  if (window.logAcciones.length > 1000) {
    window.logAcciones = window.logAcciones.slice(-1000);
  }

  // Actualizar UI si es posible
  if (typeof cargarLog === 'function') {
    cargarLog();
  }

  // Guardar en Supabase (debounced si es posible, o directo)
  if (typeof guardarConfigEnSupabase === 'function') {
    guardarConfigEnSupabase();
  }
}

function verificarSalvadoDiario() {
  const config = window.configFuncionales || {};
  if (!config.salvadoAutomatico) return;

  // Inicializar salvadosData si no existe
  if (!window.salvadosData) window.salvadosData = { salvados: [] };

  const ultimoSalvado = window.salvadosData.ultimoSalvadoDiario;
  const hoy = new Date().toISOString().slice(0, 10);

  if (ultimoSalvado !== hoy) {
    crearSalvadoDiario(`Automático ${hoy}`);
    window.salvadosData.ultimoSalvadoDiario = hoy;

    // Guardar cambios
    if (typeof guardarConfigEnSupabase === 'function') {
      guardarConfigEnSupabase();
    }
  }
}

function crearSalvadoDiario(nombre) {
  const salvado = {
    nombre: nombre,
    fecha: new Date().toISOString(),
    datos: {
      agenda: window.appState?.agenda || {},
      tareasData: window.tareasData || {},
      configVisual: window.configVisual || {},
      configFuncionales: window.configFuncionales || {},
      configOpciones: window.configOpciones || {}
    }
  };

  // Inicializar salvadosData si no existe
  if (!window.salvadosData) window.salvadosData = { salvados: [] };
  if (!window.salvadosData.salvados) window.salvadosData.salvados = [];

  window.salvadosData.salvados.push(salvado);

  // Guardar cambios
  if (typeof guardarConfigEnSupabase === 'function') {
    guardarConfigEnSupabase();
  }

  limpiarSalvadosAntiguos();
}

function limpiarSalvadosAntiguos() {
  if (!window.salvadosData?.salvados) return;

  const hace30Dias = Date.now() - (30 * 24 * 60 * 60 * 1000);

  window.salvadosData.salvados = window.salvadosData.salvados.filter(s => {
    const fechaSalvado = new Date(s.fecha).getTime();
    return fechaSalvado > hace30Dias;
  });

  // Guardar cambios
  if (typeof guardarConfigEnSupabase === 'function') {
    guardarConfigEnSupabase();
  }
}

function cargarListaSalvados() {
  const select = document.getElementById('select-salvado');
  if (!select) return;

  const salvados = window.salvadosData?.salvados || [];
  select.innerHTML = '<option value="">Selecciona un backup</option>';

  salvados.forEach((salvado, index) => {
    const option = document.createElement('option');
    option.value = index;
    const fecha = new Date(salvado.fecha).toLocaleString('es-ES');
    option.textContent = `${salvado.nombre} - ${fecha}`;
    select.appendChild(option);
  });
}

function restaurarSalvado(index) {
  const salvados = window.salvadosData?.salvados || [];
  const salvado = salvados[index];

  if (!salvado) {
    mostrarAlerta('⚠️ Backup no encontrado', 'warning');
    return;
  }

  if (confirm('¿Estás seguro de que quieres restaurar este backup? Se perderán los datos actuales.')) {
    if (salvado.datos.agenda) window.appState.agenda = salvado.datos.agenda;
    if (salvado.datos.tareasData) window.tareasData = salvado.datos.tareasData;
    if (salvado.datos.configVisual) window.configVisual = salvado.datos.configVisual;
    if (salvado.datos.configFuncionales) window.configFuncionales = salvado.datos.configFuncionales;
    if (salvado.datos.configOpciones) window.configOpciones = salvado.datos.configOpciones;

    guardarConfigEnSupabase(); // Usar la función correcta
    if (typeof renderizar === 'function') renderizar();
    mostrarAlerta('✅ Backup restaurado', 'success');
  }
}

function cargarLog() {
  // Corregido ID: log-container en lugar de log-acciones-lista
  const container = document.getElementById('log-container');
  if (!container) return;

  // Usar variable global window.logAcciones
  const log = window.logAcciones || [];

  if (log.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;color:#666;padding:50px;font-style:italic;">
        <div style="font-size:48px;margin-bottom:15px;">📋</div>
        <div style="font-size:14px;">No hay actividad registrada</div>
      </div>
    `;
    return;
  }

  container.innerHTML = '';

  // Mostrar las últimas 50 acciones, ordenadas de más reciente a más antigua
  // Hacemos una copia con [...log] para no invertir el array original
  [...log].reverse().slice(0, 50).forEach(entrada => {
    const div = document.createElement('div');
    div.className = 'log-item';
    div.style.cssText = 'padding:8px;border-bottom:1px solid #eee;font-size:12px;';

    const fecha = new Date(entrada.fecha).toLocaleString('es-ES');

    // Icono según la acción
    let icono = '🔹';
    if (entrada.accion.includes('Eliminar')) icono = '🗑️';
    else if (entrada.accion.includes('Crear')) icono = '✨';
    else if (entrada.accion.includes('Editar')) icono = '✏️';
    else if (entrada.accion.includes('Completar')) icono = '✅';
    else if (entrada.accion.includes('Configuración')) icono = '⚙️';
    else if (entrada.accion.includes('Sincronización')) icono = '🔄';
    else if (entrada.accion.includes('Backup')) icono = '💾';

    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;color:#666;margin-bottom:2px;font-size:10px;">
        <span>${fecha}</span>
      </div>
      <div style="color:#333;">
        <strong>${icono} ${entrada.accion}</strong>
        ${entrada.detalles ? `<br><span style="color:#555;font-style:italic;">${entrada.detalles}</span>` : ''}
      </div>
    `;
    container.appendChild(div);
  });
}

function limpiarLog() {
  if (confirm('¿Estás seguro de que quieres limpiar el log?')) {
    window.logAcciones = [];

    if (typeof guardarConfigEnSupabase === 'function') {
      guardarConfigEnSupabase();
    }

    cargarLog();
    mostrarAlerta('✅ Log limpiado', 'success');
  }
}

function exportarLog() {
  const log = window.logAcciones || [];
  const texto = log.map(e => {
    const fecha = new Date(e.fecha).toLocaleString('es-ES');
    return `[${fecha}] ${e.accion}${e.detalles ? ' - ' + e.detalles : ''}`;
  }).join('\n');

  const blob = new Blob([texto], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'log-acciones.txt';
  a.click();
  URL.revokeObjectURL(url);
  mostrarAlerta('✅ Log exportado', 'success');
}

function inicializarPersonas() {
  if (!window.tareasData) {
    window.tareasData = {
      listasObligatorias: [],
      listasPersonalizadas: [],
      personas: []
    };
  }

  if (!window.tareasData.personas) {
    window.tareasData.personas = [];
  }
}

function cargarListaPersonas() {
  const container = document.getElementById('personas-lista');
  if (!container) return;

  const personas = window.tareasData?.personas || [];
  container.innerHTML = '';

  personas.forEach((persona, index) => {
    const div = document.createElement('div');
    div.className = 'persona-item';
    div.innerHTML = `
      <span>👤 ${persona}</span>
      <button onclick="eliminarPersona(${index})" class="btn-secundario">🗑️</button>
    `;
    container.appendChild(div);
  });
}

function agregarPersona() {
  const input = document.getElementById('nueva-persona');
  const nombre = input?.value?.trim();

  if (!nombre) {
    mostrarAlerta('⚠️ Ingresa un nombre', 'warning');
    return;
  }

  if (!window.tareasData.personas) {
    window.tareasData.personas = [];
  }

  if (window.tareasData.personas.includes(nombre)) {
    mostrarAlerta('⚠️ Esa persona ya existe', 'warning');
    return;
  }

  window.tareasData.personas.push(nombre);
  guardarEnSupabase();
  cargarListaPersonas();
}

// ========== FUNCIONES DE CONFIGURACIÓN ==========
async function guardarConfigOpciones() {
  const config = {
    forzarFecha: document.getElementById('config-forzar-fecha')?.checked || false,
    sinTactil: document.getElementById('config-sin-tactil')?.checked || false,
    mostrarTodo: document.getElementById('config-mostrar-todo')?.checked || false,
    botonesBorrar: document.getElementById('config-botones-borrar')?.checked || false
  };

  console.log('💾 Guardando configuración de opciones:', config);
  window.configOpciones = config;

  // Intentar guardar en Supabase si está configurado
  if (typeof guardarConfigEnSupabase === 'function') {
    await guardarConfigEnSupabase();
  }

  mostrarAlerta('✅ Opciones guardadas', 'success');
}

async function guardarConfigEnNube() {
  console.log('💾 Guardando configuración en la nube');

  // Intentar guardar en Supabase
  if (typeof guardarConfigEnSupabase === 'function') {
    await guardarConfigEnSupabase();
  }

  return true;
}

async function probarConexionNube() {
  console.log('🔍 Probando conexión con la nube');

  // Verificar si Supabase está configurado (usando variables globales de supabase-sync.js)
  // Como no podemos acceder fácilmente a las variables privadas de otro módulo,
  // asumimos que si window.currentSyncMethod es 'supabase', está configurado.
  // Una mejor verificación sería llamar a una función de prueba en supabase-sync.js

  if (window.currentSyncMethod !== 'supabase') {
    mostrarAlerta('⚠️ Supabase no está seleccionado como método de sincronización.', 'warning');
    return false;
  }

  mostrarAlerta('✅ Configuración de Supabase activa', 'success');
  return true;
}

// Crear aliases para compatibilidad
window.guardarConfigExtendsClass = guardarConfigEnNube;
window.probarConexionExtendsClass = probarConexionNube;
window.guardarConfigOpciones = guardarConfigOpciones;

function eliminarPersona(index) {
  if (!window.tareasData?.personas) return;

  const persona = window.tareasData.personas[index];
  if (confirm(`¿Eliminar a ${persona}?`)) {
    window.tareasData.personas.splice(index, 1);
    guardarEnSupabase();
    cargarListaPersonas();
    actualizarFiltrosPersonas();
    mostrarAlerta('✅ Persona eliminada', 'success');
  }
}

function actualizarFiltrosPersonas() {
  const personas = window.tareasData?.personas || [];
  const container = document.getElementById('filtros-personas');
  if (!container) return;

  container.innerHTML = '';
  personas.forEach(persona => {
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="checkbox" value="${persona}" checked onchange="aplicarFiltros()">
      👤 ${persona}
    `;
    container.appendChild(label);
  });
}

function actualizarFiltrosEtiquetas() {
  const etiquetasTareas = window.tareasData?.etiquetas?.tareas || [];
  const container = document.getElementById('filtros-etiquetas');
  if (!container) return;

  container.innerHTML = '';
  etiquetasTareas.forEach(etiqueta => {
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="checkbox" value="${etiqueta.nombre}" checked onchange="aplicarFiltros()">
      ${etiqueta.simbolo} ${etiqueta.nombre}
    `;
    container.appendChild(label);
  });
}

function aplicarVisibilidadSecciones() {
  console.log('🔧 Aplicando visibilidad de secciones');

  const config = window.configVisual || {};
  console.log('📋 Configuración actual:', config);

  // Panel de Notas
  const seccionNotas = document.getElementById('seccion-notas');
  if (seccionNotas) {
    seccionNotas.style.display = config.mostrarNotas ? 'block' : 'none';
    console.log('📝 Panel de Notas:', config.mostrarNotas ? 'visible' : 'oculto');
  }

  // Panel de Sentimientos
  const seccionSentimientos = document.getElementById('seccion-sentimientos');
  if (seccionSentimientos) {
    seccionSentimientos.style.display = config.mostrarSentimientos ? 'block' : 'none';
    console.log('😊 Panel de Sentimientos:', config.mostrarSentimientos ? 'visible' : 'oculto');
  }

  // Panel de Contraseñas
  const seccionContrasenas = document.getElementById('seccion-contrasenas');
  if (seccionContrasenas) {
    seccionContrasenas.style.display = config.mostrarContrasenas ? 'block' : 'none';
    console.log('🔐 Panel de Contraseñas:', config.mostrarContrasenas ? 'visible' : 'oculto');
  }

  // Botón Pomodoro
  const btnPomodoro = document.getElementById('btn-pomodoro');
  if (btnPomodoro) {
    btnPomodoro.style.display = config.mostrarPomodoro ? 'inline-block' : 'none';
    console.log('🍅 Botón Pomodoro:', config.mostrarPomodoro ? 'visible' : 'oculto');
  }

  // Botón Progreso
  const btnProgreso = document.getElementById('btn-progreso');
  if (btnProgreso) {
    btnProgreso.style.display = config.mostrarProgreso ? 'inline-block' : 'none';
    console.log('📊 Botón Progreso:', config.mostrarProgreso ? 'visible' : 'oculto');
  }

  // Botón Resumen
  const btnResumen = document.getElementById('btn-resumen');
  if (btnResumen) {
    btnResumen.style.display = config.mostrarResumen ? 'inline-block' : 'none';
    console.log('🌅 Botón Resumen:', config.mostrarResumen ? 'visible' : 'oculto');
  }

  // Botón Tarea Universal
  const btnTareaUniversal = document.getElementById('btn-tarea-crear');
  if (btnTareaUniversal) {
    btnTareaUniversal.style.display = config.mostrarTareaUniversal ? 'inline-block' : 'none';
    console.log('📝 Botón Tarea Universal:', config.mostrarTareaUniversal ? 'visible' : 'oculto');
  }

  console.log('✅ Visibilidad de secciones aplicada correctamente');
}

function aplicarConfiguracionSincronizada() {
  const config = window.configVisual || {};

  // Aplicar tema
  if (config.tema) {
    const body = document.body;
    body.className = body.className.replace(/tema-\w+/g, '');
    body.classList.add(`tema-${config.tema}`);
  }

  // Aplicar nombre
  const nombreEl = document.getElementById('nombre-usuario');
  if (nombreEl && config.nombre) {
    nombreEl.textContent = config.nombre;
  }

  // Aplicar otras configuraciones visuales
  if (typeof aplicarVisibilidadSecciones === 'function') {
    aplicarVisibilidadSecciones();
  }
}

// Función de ayuda para guardar en Supabase
function guardarEnSupabase() {
  if (typeof window.guardarEnSupabaseWrapper === 'function') {
    window.guardarEnSupabaseWrapper();
  }
}

// ========== EXPORTACIONES GLOBALES ==========
window.procesarJSON = procesarJSON;
// window.toggleConfigFloating = toggleConfigFloating; // REMOVIDO: Ya está exportada en app.js
window.switchTab = switchTab;
window.cargarConfiguracionesModal = cargarConfiguracionesModal;
window.cambiarFraseMotivacional = cambiarFraseMotivacional;
window.guardarConfigFuncionales = guardarConfigFuncionales;
window.cargarConfigFuncionales = cargarConfigFuncionales;
window.verHistorial = verHistorial;
window.hacerCopia = hacerCopia;
window.abrirHistoricoTareas = abrirHistoricoTareas;
window.abrirGraficos = abrirGraficos;
window.restaurarBackup = restaurarBackup;
window.crearBackupManual = crearBackupManual;
window.guardarSentimiento = guardarSentimiento;
window.aplicarVisibilidadSecciones = aplicarVisibilidadSecciones;
window.inicializarEtiquetas = inicializarEtiquetas;
window.cargarEtiquetasEnSelect = cargarEtiquetasEnSelect;
window.cargarListaSalvados = cargarListaSalvados;
window.restaurarSalvado = restaurarSalvado;
window.aplicarConfiguracionSincronizada = aplicarConfiguracionSincronizada;
window.inicializarPersonas = inicializarPersonas;
window.cargarListaPersonas = cargarListaPersonas;
window.agregarPersona = agregarPersona;
window.eliminarPersona = eliminarPersona;
window.actualizarFiltrosPersonas = actualizarFiltrosPersonas;
window.actualizarFiltrosEtiquetas = actualizarFiltrosEtiquetas;
window.mostrarResumenDiario = mostrarResumenDiario;
window.cerrarResumenDiario = cerrarResumenDiario;
window.mostrarAlertaConectividad = mostrarAlertaConectividad;
window.cerrarModalConectividad = cerrarModalConectividad;

// ========== GUARDAR ETIQUETAS ==========
async function guardarEtiquetas() {
  console.log('🏷️ Guardando etiquetas en Supabase...');

  // Las etiquetas están en window.etiquetasData
  const etiquetas = window.etiquetasData || {
    tareas: [],
    citas: []
  };

  try {
    // Guardar usando supabasePush
    if (typeof supabasePush === 'function') {
      await supabasePush();
      mostrarAlerta('✅ Etiquetas guardadas correctamente', 'success');
      console.log('✅ Etiquetas guardadas:', etiquetas);
    } else {
      console.warn('⚠️ supabasePush no disponible');
      mostrarAlerta('⚠️ No se pudo guardar - Supabase no disponible', 'error');
    }
  } catch (error) {
    console.error('❌ Error guardando etiquetas:', error);
    mostrarAlerta('❌ Error al guardar etiquetas: ' + error.message, 'error');
  }
}

// ========== SINCRONIZACIÓN DE ESTRUCTURAS DE ETIQUETAS ==========
function sincronizarEstructurasEtiquetas() {
  // Asegurar que ambas estructuras estén sincronizadas
  if (window.etiquetasData && !window.tareasData?.etiquetas) {
    if (!window.tareasData) window.tareasData = {};
    window.tareasData.etiquetas = window.etiquetasData;
    console.log('✅ Sincronizado etiquetas: etiquetasData → tareasData.etiquetas');
  } else if (window.tareasData?.etiquetas && !window.etiquetasData) {
    window.etiquetasData = window.tareasData.etiquetas;
    console.log('✅ Sincronizado etiquetas: tareasData.etiquetas → etiquetasData');
  }

  // Si ninguna existe, inicializar ambas
  if (!window.etiquetasData && !window.tareasData?.etiquetas) {
    const estructuraInicial = { tareas: [], citas: [] };
    window.etiquetasData = estructuraInicial;
    if (!window.tareasData) window.tareasData = {};
    window.tareasData.etiquetas = estructuraInicial;
    console.log('✅ Estructuras de etiquetas inicializadas');
  }
}

// Exportar globalmente
window.guardarEtiquetas = guardarEtiquetas;
window.sincronizarEstructurasEtiquetas = sincronizarEstructurasEtiquetas;

console.log('✅ Sincronización simplificada cargada (Supabase only)');
