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
  // FIXED: Leer desde window.configVisual en lugar de window.tareasData
  const listas = window.configVisual?.listasPersonalizadas || [];
  console.log('🔍 obtenerListasPersonalizadas() llamado desde sincronizacion-simple.js. Total listas:', listas.length);

  // Log subtasks for debugging
  listas.forEach((lista, idx) => {
    const totalTareas = lista.tareas?.length || 0;
    const tareasConSubtareas = lista.tareas?.filter(t => t.subtareas && t.subtareas.length > 0).length || 0;
    console.log(`  📋 Lista ${idx} "${lista.nombre}": ${totalTareas} tareas, ${tareasConSubtareas} con subtareas`);

    lista.tareas?.forEach((tarea, tidx) => {
      if (tarea.subtareas && tarea.subtareas.length > 0) {
        console.log(`    ✓ Tarea ${tidx} "${tarea.texto}": ${tarea.subtareas.length} subtareas`);
      }
    });
  });

  return listas;
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

async function cargarConfiguracionesModal() {
  console.log('📋 Cargando modal de configuración...');

  // Actualizar datos desde Supabase antes de cargar la interfaz
  if (window.currentSyncMethod === 'supabase' && typeof window.supabasePull === 'function') {
    console.log('🔄 Actualizando datos desde Supabase...');
    try {
      await window.supabasePull();
      console.log('✅ Datos actualizados desde Supabase');
    } catch (error) {
      console.warn('⚠️ Error actualizando desde Supabase:', error);
    }
  }

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

  console.log('✅ Modal de configuración cargado completamente');
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

// Funciones de configuración funcional movidas a app.js para evitar conflictos
// guardarConfigFuncionales() -> app.js
// cargarConfigFuncionales() -> app.js
// mostrarResumenDiario() -> app.js

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

  const etiquetas = window.etiquetasData?.[tipo] || [];
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

  const etiquetas = window.etiquetasData?.[tipo] || [];
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

  // Inicializar estructura de etiquetas
  if (!window.etiquetasData) {
    window.etiquetasData = { tareas: [], citas: [] };
  }
  if (!window.etiquetasData.tareas) {
    window.etiquetasData.tareas = [];
  }
  if (!window.etiquetasData.citas) {
    window.etiquetasData.citas = [];
  }

  const etiqueta = {
    id: Date.now().toString(),
    nombre: nombre,
    simbolo: simbolo
  };

  // Solo agregar a etiquetasData que es la estructura que se persiste
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

  // Inicializar estructura de etiquetas
  if (!window.etiquetasData) {
    window.etiquetasData = { tareas: [], citas: [] };
  }
  if (!window.etiquetasData.tareas) {
    window.etiquetasData.tareas = [];
  }
  if (!window.etiquetasData.citas) {
    window.etiquetasData.citas = [];
  }

  const etiqueta = {
    id: Date.now().toString(),
    nombre: nombre,
    simbolo: simbolo
  };

  // Solo agregar a etiquetasData que es la estructura que se persiste
  window.etiquetasData.citas.push(etiqueta);

  guardarEnSupabase();
  renderizarListaEtiquetas('etiquetas-citas-lista', 'citas');
  document.getElementById('nueva-etiqueta-cita').value = '';
  mostrarAlerta('✅ Etiqueta agregada', 'success');
}

function eliminarEtiqueta(id) {
  // Solo trabajar con etiquetasData que es la estructura que se persiste
  const etiquetasDataTareas = window.etiquetasData?.tareas || [];
  const etiquetasDataCitas = window.etiquetasData?.citas || [];

  const indexTareas = etiquetasDataTareas.findIndex(e => e.id === id);
  const indexCitas = etiquetasDataCitas.findIndex(e => e.id === id);

  if (indexTareas !== -1) {
    window.etiquetasData.tareas.splice(indexTareas, 1);
    renderizarListaEtiquetas('etiquetas-tareas-lista', 'tareas');
  } else if (indexCitas !== -1) {
    window.etiquetasData.citas.splice(indexCitas, 1);
    renderizarListaEtiquetas('etiquetas-citas-lista', 'citas');
  }

  guardarEnSupabase();
  mostrarAlerta('✅ Etiqueta eliminada', 'success');
}

function obtenerEtiquetaInfo(nombre, tipo) {
  const etiquetas = window.etiquetasData?.[tipo] || [];
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

  // Sincronizar con window.personasAsignadas (estructura que usa Supabase)
  if (window.personasAsignadas && window.personasAsignadas.length > 0) {
    // Si hay personas en Supabase, sincronizar con la estructura local
    window.personasAsignadas.forEach(persona => {
      if (!window.tareasData.personas.includes(persona)) {
        window.tareasData.personas.push(persona);
      }
    });
  } else if (window.tareasData.personas.length > 0 && !window.personasAsignadas) {
    // Si hay personas locales pero no en Supabase, sincronizar hacia Supabase
    window.personasAsignadas = [...window.tareasData.personas];
  }
}

function cargarListaPersonas() {
  const container = document.getElementById('personas-lista');
  if (!container) return;

  // Sincronizar datos de personas desde todas las fuentes
  sincronizarPersonasDesdeTodasLasFuentes();

  const personas = window.tareasData?.personas || [];
  container.innerHTML = '';

  if (personas.length === 0) {
    container.innerHTML = '<div style="color: #666; font-style: italic; padding: 10px;">No hay personas agregadas</div>';
    return;
  }

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

// Nueva función para sincronizar personas desde todas las fuentes
function sincronizarPersonasDesdeTodasLasFuentes() {
  console.log('🔄 Sincronizando personas desde todas las fuentes...');

  // Inicializar estructuras si no existen
  if (!window.tareasData) window.tareasData = {};
  if (!window.tareasData.personas) window.tareasData.personas = [];
  if (!window.personasAsignadas) window.personasAsignadas = [];

  // Crear conjunto único de personas desde todas las fuentes
  const personasUnicas = new Set();

  // Agregar desde tareasData.personas
  window.tareasData.personas.forEach(p => personasUnicas.add(p));

  // Agregar desde personasAsignadas (que viene de Supabase)
  window.personasAsignadas.forEach(p => personasUnicas.add(p));

  // Convertir de vuelta a array y actualizar ambas estructuras
  const personasArray = Array.from(personasUnicas).sort();
  window.tareasData.personas = personasArray;
  window.personasAsignadas = [...personasArray];

  console.log('👥 Personas sincronizadas:', personasArray);
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

  // Sincronizar con la estructura que se guarda en Supabase
  if (!window.personasAsignadas) {
    window.personasAsignadas = [];
  }
  if (!window.personasAsignadas.includes(nombre)) {
    window.personasAsignadas.push(nombre);
  }

  // Guardar inmediatamente en Supabase
  console.log('👥 Guardando nueva persona en Supabase:', nombre);
  guardarEnSupabase();

  mostrarAlerta(`✅ Persona "${nombre}" agregada y guardada`, 'success');
  cargarListaPersonas();

  // Limpiar input
  input.value = '';
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

    // También eliminar de la estructura que se sincroniza con Supabase
    if (window.personasAsignadas) {
      const indexSupabase = window.personasAsignadas.indexOf(persona);
      if (indexSupabase !== -1) {
        window.personasAsignadas.splice(indexSupabase, 1);
      }
    }

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
window.sincronizarPersonasDesdeTodasLasFuentes = sincronizarPersonasDesdeTodasLasFuentes;
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

// Función para limpiar etiquetas duplicadas
function limpiarEtiquetasDuplicadas() {
  if (!window.etiquetasData) {
    console.log('❌ No hay etiquetasData para limpiar');
    return { eliminados: 0 };
  }

  let eliminados = 0;

  // Limpiar duplicados en tareas
  if (window.etiquetasData.tareas) {
    const idsVistos = new Set();
    const tareasLimpias = [];

    window.etiquetasData.tareas.forEach(etiqueta => {
      if (!idsVistos.has(etiqueta.id)) {
        idsVistos.add(etiqueta.id);
        tareasLimpias.push(etiqueta);
      } else {
        eliminados++;
        console.log(`🧹 Eliminando etiqueta duplicada (tareas): ${etiqueta.nombre} (ID: ${etiqueta.id})`);
      }
    });

    window.etiquetasData.tareas = tareasLimpias;
  }

  // Limpiar duplicados en citas
  if (window.etiquetasData.citas) {
    const idsVistos = new Set();
    const citasLimpias = [];

    window.etiquetasData.citas.forEach(etiqueta => {
      if (!idsVistos.has(etiqueta.id)) {
        idsVistos.add(etiqueta.id);
        citasLimpias.push(etiqueta);
      } else {
        eliminados++;
        console.log(`🧹 Eliminando etiqueta duplicada (citas): ${etiqueta.nombre} (ID: ${etiqueta.id})`);
      }
    });

    window.etiquetasData.citas = citasLimpias;
  }

  if (eliminados > 0) {
    console.log(`✅ Limpieza completada: ${eliminados} etiquetas duplicadas eliminadas`);
    guardarEnSupabase();

    // Re-renderizar listas para reflejar cambios
    if (typeof renderizarListaEtiquetas === 'function') {
      renderizarListaEtiquetas('etiquetas-tareas-lista', 'tareas');
      renderizarListaEtiquetas('etiquetas-citas-lista', 'citas');
    }

    mostrarAlerta(`🧹 Eliminadas ${eliminados} etiquetas duplicadas`, 'success');
  } else {
    console.log('✅ No se encontraron etiquetas duplicadas');
    mostrarAlerta('✅ No se encontraron etiquetas duplicadas', 'info');
  }

  return { eliminados };
}

// Función de alias para compatibilidad con el HTML
function crearSalvadoManual() {
  return crearBackupManual();
}

// Función para mostrar dashboard motivacional (botón "Mi Progreso")
function mostrarDashboardMotivacional() {
  if (!window.supabaseClient) {
    mostrarAlerta('⚠️ Supabase no disponible', 'warning');
    return;
  }

  // Eliminar modal existente si existe (para evitar duplicados)
  const modalExistente = document.getElementById('modal-dashboard-motivacional');
  if (modalExistente) {
    modalExistente.remove();
  }

  // Crear modal de dashboard
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-dashboard-motivacional';
  modal.innerHTML = `
    <div class="modal-content dashboard-content" style="max-width: 900px; max-height: 85vh;">
      <h4>📊 Mi Progreso y Motivación</h4>
      <div id="dashboard-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
        <div style="text-align: center; padding: 20px;">🔄 Cargando estadísticas...</div>
      </div>
      <div id="dashboard-grafico" style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h5>📈 Progreso de los últimos 7 días</h5>
        <div id="progreso-semanal">Cargando...</div>
      </div>
      <div class="modal-botones">
        <button class="btn-secundario" onclick="cerrarModal('modal-dashboard-motivacional')">Cerrar</button>
        <button class="btn-primario" onclick="abrirVisorHistorial()">Ver Historial Completo</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = 'flex';

  // Cargar estadísticas
  cargarEstadisticasMotivacionales();
}

// Función para mostrar resumen diario manual (botón "Resumen del Día")
function mostrarResumenDiarioManual() {
  if (!window.supabaseClient) {
    mostrarAlerta('⚠️ Supabase no disponible', 'warning');
    return;
  }

  // Eliminar modal existente si existe (para evitar duplicados)
  const modalExistente = document.getElementById('modal-resumen-diario');
  if (modalExistente) {
    modalExistente.remove();
  }

  // Crear modal de resumen diario
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-resumen-diario';
  modal.innerHTML = `
    <div class="modal-content dashboard-content" style="max-width: 700px; max-height: 80vh;">
      <h4>🌅 Resumen del Día - ${new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}</h4>
      <div id="resumen-contenido" style="max-height: 500px; overflow-y: auto;">
        <div style="text-align: center; padding: 20px;">🔄 Cargando resumen del día...</div>
      </div>
      <div class="modal-botones">
        <button class="btn-secundario" onclick="cerrarModal('modal-resumen-diario')">Cerrar</button>
        <button class="btn-primario" onclick="exportarResumenDiario()">📄 Exportar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.style.display = 'flex';

  // Cargar resumen del día
  cargarResumenDelDia();
}

// Función auxiliar para cargar estadísticas motivacionales
function cargarEstadisticasMotivacionales() {
  try {
    // Cargar datos del historial
    const historialTareas = JSON.parse(localStorage.getItem('historial-tareas') || '[]');
    const historialEliminados = JSON.parse(localStorage.getItem('historial-eliminados') || '[]');

    // Calcular estadísticas de los últimos 7 días
    const hace7Dias = new Date();
    hace7Dias.setDate(hace7Dias.getDate() - 7);

    const tareasUltimos7Dias = historialTareas.filter(tarea => {
      const fechaTarea = new Date(tarea.fechaCompletada || tarea.fecha);
      return fechaTarea >= hace7Dias;
    });

    const tareasHoy = historialTareas.filter(tarea => {
      const fechaTarea = new Date(tarea.fechaCompletada || tarea.fecha);
      const hoy = new Date();
      return fechaTarea.toDateString() === hoy.toDateString();
    });

    // Estadísticas generales
    const statsContainer = document.getElementById('dashboard-stats');
    statsContainer.innerHTML = `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
        <div style="font-size: 2.5em; font-weight: bold; margin-bottom: 8px;">${tareasHoy.length}</div>
        <div style="font-size: 0.9em; opacity: 0.9;">Tareas completadas hoy</div>
      </div>
      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
        <div style="font-size: 2.5em; font-weight: bold; margin-bottom: 8px;">${tareasUltimos7Dias.length}</div>
        <div style="font-size: 0.9em; opacity: 0.9;">Últimos 7 días</div>
      </div>
      <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
        <div style="font-size: 2.5em; font-weight: bold; margin-bottom: 8px;">${historialTareas.length}</div>
        <div style="font-size: 0.9em; opacity: 0.9;">Total completadas</div>
      </div>
      <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 20px; border-radius: 12px; text-align: center;">
        <div style="font-size: 2.5em; font-weight: bold; margin-bottom: 8px;">${Math.round((tareasUltimos7Dias.length / 7) * 10) / 10}</div>
        <div style="font-size: 0.9em; opacity: 0.9;">Promedio diario</div>
      </div>
    `;

    // Progreso semanal
    const progresoContainer = document.getElementById('progreso-semanal');
    let progresoHtml = '<div style="display: flex; gap: 10px; align-items: end; height: 150px; margin: 20px 0;">';

    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);

      const tareasDelDia = historialTareas.filter(tarea => {
        const fechaTarea = new Date(tarea.fechaCompletada || tarea.fecha);
        return fechaTarea.toDateString() === fecha.toDateString();
      }).length;

      const altura = Math.max(10, (tareasDelDia / Math.max(1, Math.max(...Array.from({ length: 7 }, (_, j) => {
        const f = new Date();
        f.setDate(f.getDate() - j);
        return historialTareas.filter(t => {
          const ft = new Date(t.fechaCompletada || t.fecha);
          return ft.toDateString() === f.toDateString();
        }).length;
      })))) * 100);

      progresoHtml += `
        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
          <div style="background: linear-gradient(to top, #4facfe, #00f2fe); width: 100%; height: ${altura}%; border-radius: 4px 4px 0 0; display: flex; align-items: end; justify-content: center; color: white; font-weight: bold; font-size: 12px; padding-bottom: 5px;">${tareasDelDia > 0 ? tareasDelDia : ''}</div>
          <div style="font-size: 10px; margin-top: 8px; color: #666;">${fecha.toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 3)}</div>
        </div>
      `;
    }
    progresoHtml += '</div>';

    if (tareasUltimos7Dias.length > 0) {
      const mensaje = tareasUltimos7Dias.length >= 7 ?
        '🎉 ¡Excelente progreso esta semana!' :
        tareasUltimos7Dias.length >= 3 ?
          '👍 Buen ritmo, ¡sigue así!' :
          '💪 ¡Cada paso cuenta, continúa!';
      progresoHtml += `<div style="text-align: center; margin-top: 15px; color: #4facfe; font-weight: bold;">${mensaje}</div>`;
    }

    progresoContainer.innerHTML = progresoHtml;

  } catch (error) {
    console.error('Error cargando estadísticas:', error);
    document.getElementById('dashboard-stats').innerHTML = '<div style="color: #f44336; text-align: center;">❌ Error cargando estadísticas</div>';
  }
}

// Función auxiliar para cargar resumen del día
function cargarResumenDelDia() {
  try {
    const hoy = new Date();
    const hoyStr = hoy.toDateString();

    // Obtener datos de la agenda
    const tareas = window.appState?.agenda?.tareas || [];
    const tareasCriticas = window.appState?.agenda?.tareas_criticas || [];
    const citas = window.appState?.agenda?.citas || [];
    const listasPersonalizadas = window.configVisual?.listasPersonalizadas || [];

    // Recopilar todas las tareas de listas personalizadas
    let todasLasTareas = [...tareas, ...tareasCriticas];
    listasPersonalizadas.forEach(lista => {
      if (lista.tareas) {
        todasLasTareas.push(...lista.tareas.map(t => ({ ...t, lista: lista.nombre })));
      }
    });

    // Clasificar tareas
    const tareasAtrasadas = [];
    const tareasHoy = [];
    const tareasProximos7Dias = [];
    const citasHoy = [];
    const citasProximos7Dias = [];

    // Procesar tareas
    todasLasTareas.forEach(tarea => {
      if (tarea.estado === 'completada') return; // Saltar tareas completadas

      const fechaTarea = tarea.fecha ? new Date(tarea.fecha) : null;
      if (!fechaTarea) return;

      const fechaStr = fechaTarea.toDateString();
      const diasDiferencia = Math.ceil((fechaTarea - hoy) / (1000 * 60 * 60 * 24));

      if (diasDiferencia < 0) {
        tareasAtrasadas.push({ ...tarea, diasAtrasada: Math.abs(diasDiferencia) });
      } else if (fechaStr === hoyStr) {
        tareasHoy.push(tarea);
      } else if (diasDiferencia <= 7) {
        tareasProximos7Dias.push({ ...tarea, diasRestantes: diasDiferencia });
      }
    });

    // Procesar citas
    citas.forEach(cita => {
      const fechaCita = new Date(cita.fecha[0], cita.fecha[1] - 1, cita.fecha[2]);
      const fechaStr = fechaCita.toDateString();
      const diasDiferencia = Math.ceil((fechaCita - hoy) / (1000 * 60 * 60 * 24));

      if (fechaStr === hoyStr) {
        citasHoy.push(cita);
      } else if (diasDiferencia > 0 && diasDiferencia <= 7) {
        citasProximos7Dias.push({ ...cita, diasRestantes: diasDiferencia, fechaCita });
      }
    });

    const contenido = document.getElementById('resumen-contenido');
    let html = '';

    // Estadísticas principales
    const totalPendiente = tareasAtrasadas.length + tareasHoy.length;
    html += `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; text-align: center;">
        <h3 style="margin: 0 0 15px 0;">📋 Resumen de Tu Día</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 15px;">
          <div>
            <div style="font-size: 2.2em; font-weight: bold; color: ${tareasAtrasadas.length > 0 ? '#ff6b6b' : '#fff'};">${tareasAtrasadas.length}</div>
            <div style="font-size: 0.8em; opacity: 0.9;">Atrasadas</div>
          </div>
          <div>
            <div style="font-size: 2.2em; font-weight: bold;">${tareasHoy.length}</div>
            <div style="font-size: 0.8em; opacity: 0.9;">Para hoy</div>
          </div>
          <div>
            <div style="font-size: 2.2em; font-weight: bold;">${citasHoy.length}</div>
            <div style="font-size: 0.8em; opacity: 0.9;">Citas hoy</div>
          </div>
        </div>
      </div>
    `;

    // TAREAS ATRASADAS (MÁS IMPORTANTES)
    if (tareasAtrasadas.length > 0) {
      html += `
        <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 2px solid #ff4757;">
          <h4 style="margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
            ⚠️ <strong>TAREAS ATRASADAS - PRIORIDAD MÁXIMA</strong>
          </h4>
          <div style="max-height: 300px; overflow-y: auto;">
      `;

      tareasAtrasadas.sort((a, b) => b.diasAtrasada - a.diasAtrasada).forEach(tarea => {
        html += `
          <div style="background: rgba(255,255,255,0.1); padding: 12px; margin-bottom: 8px; border-radius: 8px; border-left: 4px solid #fff;">
            <div style="display: flex; justify-content: between; align-items: start; gap: 10px;">
              <div style="flex: 1;">
                <div style="font-weight: bold; font-size: 1.1em;">${tarea.esCritica ? '🔥 ' : ''}${tarea.titulo || tarea.texto}</div>
                ${tarea.persona ? `<div style="font-size: 0.9em; opacity: 0.9;">👤 ${tarea.persona}</div>` : ''}
                ${tarea.lista ? `<div style="font-size: 0.8em; opacity: 0.8;">📋 ${tarea.lista}</div>` : ''}
              </div>
              <div style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 6px; font-size: 0.8em; font-weight: bold;">
                ${tarea.diasAtrasada} día${tarea.diasAtrasada > 1 ? 's' : ''} atrás
              </div>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    }

    // TAREAS Y CITAS DE HOY
    if (tareasHoy.length > 0 || citasHoy.length > 0) {
      html += `
        <div style="background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <h4 style="margin: 0 0 15px 0;">📅 PARA HOY - ${hoy.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
      `;

      // Citas de hoy
      if (citasHoy.length > 0) {
        html += `<div style="margin-bottom: 15px;"><h5 style="margin: 0 0 10px 0; opacity: 0.9;">🗓️ Citas:</h5>`;
        citasHoy.forEach(cita => {
          // Extraer hora y descripción del nombre (formato: "HH:MM - Descripción")
          let hora = '';
          let descripcion = cita.nombre;

          if (cita.nombre && cita.nombre.includes(' - ')) {
            const partes = cita.nombre.split(' - ');
            hora = partes[0];
            descripcion = partes.slice(1).join(' - ');
          }

          html += `
            <div style="background: rgba(255,255,255,0.1); padding: 10px; margin-bottom: 6px; border-radius: 6px;">
              <div style="font-weight: bold;">${descripcion}</div>
              ${cita.lugar ? `<div style="font-size: 0.9em; opacity: 0.9;">📍 ${cita.lugar}</div>` : ''}
              ${hora ? `<div style="font-size: 0.9em; opacity: 0.9;">⏰ ${hora}</div>` : ''}
            </div>
          `;
        });
        html += `</div>`;
      }

      // Tareas de hoy
      if (tareasHoy.length > 0) {
        html += `<div><h5 style="margin: 0 0 10px 0; opacity: 0.9;">✅ Tareas:</h5>`;
        tareasHoy.forEach(tarea => {
          html += `
            <div style="background: rgba(255,255,255,0.1); padding: 10px; margin-bottom: 6px; border-radius: 6px;">
              <div style="font-weight: bold;">${tarea.esCritica ? '🔥 ' : ''}${tarea.titulo || tarea.texto}</div>
              ${tarea.persona ? `<div style="font-size: 0.9em; opacity: 0.9;">👤 ${tarea.persona}</div>` : ''}
              ${tarea.lista ? `<div style="font-size: 0.8em; opacity: 0.8;">📋 ${tarea.lista}</div>` : ''}
            </div>
          `;
        });
        html += `</div>`;
      }

      html += `</div>`;
    }

    // PRÓXIMOS 7 DÍAS (menos vistoso)
    if (tareasProximos7Dias.length > 0 || citasProximos7Dias.length > 0) {
      html += `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #6c757d;">
          <h5 style="margin: 0 0 15px 0; color: #495057;">📆 Próximos 7 días</h5>
          <div style="max-height: 200px; overflow-y: auto; font-size: 0.9em;">
      `;

      // Combinar y ordenar por fecha
      const proximosItems = [
        ...citasProximos7Dias.map(c => ({ ...c, tipo: 'cita', fecha: c.fechaCita })),
        ...tareasProximos7Dias.map(t => ({ ...t, tipo: 'tarea', fecha: new Date(t.fecha) }))
      ].sort((a, b) => a.fecha - b.fecha);

      proximosItems.forEach(item => {
        const fechaStr = item.fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
        html += `
          <div style="padding: 8px; margin-bottom: 4px; background: white; border-radius: 4px; display: flex; justify-content: between; align-items: center;">
            <div style="flex: 1;">
              <span style="color: #6c757d; font-size: 0.8em;">${fechaStr}</span>
              <span style="margin-left: 8px;">${item.tipo === 'cita' ? '📅' : '📝'} ${item.nombre || item.titulo || item.texto}</span>
            </div>
            <span style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 0.8em;">
              ${item.diasRestantes} día${item.diasRestantes > 1 ? 's' : ''}
            </span>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    }

    // Mensaje si no hay nada pendiente
    if (totalPendiente === 0 && citasHoy.length === 0) {
      html += `
        <div style="text-align: center; padding: 40px; color: #666;">
          <div style="font-size: 3em; margin-bottom: 10px;">🎉</div>
          <h3 style="margin: 0; color: #4a5568;">¡Día despejado!</h3>
          <p style="margin: 10px 0 0 0;">No tienes tareas pendientes para hoy. ¡Perfecto momento para planificar o relajarte!</p>
        </div>
      `;
    }

    contenido.innerHTML = html;

  } catch (error) {
    console.error('Error cargando resumen del día:', error);
    document.getElementById('resumen-contenido').innerHTML = '<div style="color: #f44336; text-align: center; padding: 20px;">❌ Error cargando resumen</div>';
  }
}

// Función para exportar resumen diario
function exportarResumenDiario() {
  try {
    const hoy = new Date();
    const fecha = hoy.toISOString().slice(0, 10);
    const historialTareas = JSON.parse(localStorage.getItem('historial-tareas') || '[]');

    const tareasHoy = historialTareas.filter(tarea => {
      const fechaTarea = new Date(tarea.fechaCompletada || tarea.fecha);
      return fechaTarea.toDateString() === hoy.toDateString();
    });

    let contenido = `Resumen del Día - ${fecha}\n`;
    contenido += `=================================\n\n`;
    contenido += `📊 Estadísticas:\n`;
    contenido += `- Tareas completadas: ${tareasHoy.length}\n`;
    contenido += `- Tareas críticas: ${tareasHoy.filter(t => t.esCritica).length}\n`;
    contenido += `- Tareas regulares: ${tareasHoy.filter(t => !t.esCritica).length}\n\n`;

    if (tareasHoy.length > 0) {
      contenido += `✅ Tareas Completadas:\n`;
      contenido += `-----------------------\n`;
      tareasHoy.forEach(tarea => {
        const hora = new Date(tarea.fechaCompletada || tarea.fecha).toLocaleTimeString('es-ES');
        contenido += `${hora} - ${tarea.esCritica ? '[CRÍTICA] ' : ''}${tarea.titulo || tarea.texto}\n`;
        if (tarea.persona) contenido += `  👤 Persona: ${tarea.persona}\n`;
      });
    }

    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumen-diario-${fecha}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    mostrarAlerta('📄 Resumen exportado', 'success');
  } catch (error) {
    console.error('Error exportando:', error);
    mostrarAlerta('❌ Error al exportar', 'error');
  }
}

// Exportar globalmente
window.guardarEtiquetas = guardarEtiquetas;
window.sincronizarEstructurasEtiquetas = sincronizarEstructurasEtiquetas;
window.limpiarEtiquetasDuplicadas = limpiarEtiquetasDuplicadas;
window.renderizarListaEtiquetas = renderizarListaEtiquetas;
window.crearSalvadoManual = crearSalvadoManual;
window.verificarSalvadoDiario = verificarSalvadoDiario;
window.mostrarDashboardMotivacional = mostrarDashboardMotivacional;
window.mostrarResumenDiarioManual = mostrarResumenDiarioManual;
window.cargarEstadisticasMotivacionales = cargarEstadisticasMotivacionales;
window.cargarResumenDelDia = cargarResumenDelDia;
window.exportarResumenDiario = exportarResumenDiario;

console.log('✅ Sincronización simplificada cargada (Supabase only)');
