// ==================== CARRUSEL MÓVIL PARA TDAH ====================

let carruselState = {
  panelActual: 0,
  totalPaneles: 0,
  paneles: [],
  swipeStartX: 0,
  swipeEndX: 0,
  isDragging: false,
  startTranslateX: 0
};

// ==================== DETECCIÓN INTELIGENTE DE MÓVIL ====================

function esDispositivoMovil() {
  const tests = {
    // Test 1: User Agent
    userAgent: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),

    // Test 2: Touch Support
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,

    // Test 3: No hover support (típico de móviles)
    noHoverSupport: window.matchMedia('(hover: none)').matches,

    // Test 4: Pointer type
    touchPointer: window.matchMedia('(pointer: coarse)').matches,

    // Test 5: Orientation support
    orientationSupport: 'orientation' in window || 'onorientationchange' in window,

    // Test 6: Device pixel ratio alto (común en móviles)
    highDPI: window.devicePixelRatio > 1.5,

    // Test 7: Tamaño de pantalla pequeño
    smallScreen: window.innerWidth <= 768
  };

  // Algoritmo de scoring
  let score = 0;
  let totalTests = 0;

  for (const [test, result] of Object.entries(tests)) {
    totalTests++;
    if (result) score++;
    console.log(`📱 ${test}: ${result ? '✅' : '❌'}`);
  }

  const confidence = (score / totalTests) * 100;
  const isMovil = score >= 3; // Al menos 3 de 7 tests deben pasar

  console.log(`📊 Score móvil: ${score}/${totalTests} (${confidence.toFixed(1)}%)`);
  console.log(`🎯 Es móvil: ${isMovil ? '✅ SÍ' : '❌ NO'}`);

  return isMovil;
}

function forzarModoMovil() {
  // Función para testing - fuerza modo móvil
  window.FORZAR_MOVIL = true;
  aplicarModoMovil();
  console.log('🔧 Modo móvil FORZADO para testing');
}

function forzarModoDesktop() {
  // Función para testing - fuerza modo desktop
  window.FORZAR_MOVIL = false;
  aplicarModoDesktop();
  console.log('🖥️ Modo desktop FORZADO para testing');
}

function aplicarModoMovil() {
  const carruselMovil = document.getElementById('carrusel-movil');
  const contenedorDesktop = document.querySelector('.contenedor-dos-columnas');
  const headerDesktop = document.querySelector('.header');
  const container = document.querySelector('.container');

  // Mostrar carrusel móvil
  if (carruselMovil) {
    carruselMovil.style.display = 'flex';
    carruselMovil.classList.add('modo-movil-activo');
    console.log('📱 Vista móvil ACTIVADA');
  }

  // Ocultar completamente interfaz desktop
  if (contenedorDesktop) {
    contenedorDesktop.style.display = 'none';
    console.log('🖥️ Vista desktop OCULTA');
  }

  if (headerDesktop) {
    headerDesktop.style.display = 'none';
    console.log('📋 Header desktop OCULTO');
  }

  // Ajustar container para modo móvil
  if (container) {
    container.style.padding = '0';
    container.style.maxWidth = '100%';
  }

  // Mostrar indicadores de modo
  mostrarIndicadorModo('movil');

  // Actualizar título personalizado
  actualizarTituloCarrusel();

  // Inicializar funcionalidad del carrusel
  generarPanelesCarrusel();
  // configurarGestosTouch(); // DESHABILITADO: Solo botones, no gestos
  renderizarCarrusel();

  console.log('👆 Gestos de swipe DESHABILITADOS - Solo navegación con botones ‹ ›');
}

function aplicarModoDesktop() {
  const carruselMovil = document.getElementById('carrusel-movil');
  const contenedorDesktop = document.querySelector('.contenedor-dos-columnas');
  const headerDesktop = document.querySelector('.header');
  const container = document.querySelector('.container');

  // Ocultar carrusel móvil
  if (carruselMovil) {
    carruselMovil.style.display = 'none';
    carruselMovil.classList.remove('modo-movil-activo');
    console.log('📱 Vista móvil OCULTA');
  }

  // Mostrar interfaz desktop completa
  if (contenedorDesktop) {
    contenedorDesktop.style.display = 'flex';
    console.log('🖥️ Vista desktop ACTIVADA');
  }

  if (headerDesktop) {
    headerDesktop.style.display = 'flex';
    console.log('📋 Header desktop RESTAURADO');
  }

  // Restaurar container desktop
  if (container) {
    container.style.padding = '';
    container.style.maxWidth = '';
  }

  // Mostrar indicadores de modo
  mostrarIndicadorModo('desktop');
}

// ==================== INDICADORES DE MODO ====================

function mostrarIndicadorModo(modo) {
  // Remover indicador anterior si existe
  const indicadorAnterior = document.getElementById('indicador-modo');
  if (indicadorAnterior) {
    indicadorAnterior.remove();
  }

  let indicador;

  if (modo === 'movil') {
    // El indicador móvil ya está en el HTML del carrusel - siempre visible
    return;
  } else if (modo === 'desktop') {
    // Solo mostrar indicador desktop si está en modo forzado (testing)
    if (window.FORZAR_MOVIL !== false) return;

    // Crear indicador para desktop
    indicador = document.createElement('div');
    indicador.id = 'indicador-modo';
    indicador.style.cssText = `
      position: fixed;
      top: 15px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #2196F3, #1976D2);
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      z-index: 9998;
      box-shadow: 0 3px 12px rgba(33, 150, 243, 0.3);
      backdrop-filter: blur(10px);
    `;
    indicador.textContent = '🖥️ MODO DESKTOP (Forzado)';

    document.body.appendChild(indicador);

    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
      if (indicador && indicador.parentNode) {
        indicador.style.opacity = '0';
        indicador.style.transition = 'opacity 0.5s ease';
        setTimeout(() => indicador.remove(), 500);
      }
    }, 3000);
  }
}

// ==================== OBTENER TÍTULO PERSONALIZADO ====================

function obtenerTituloPersonalizado() {
  // Obtener de la configuración visual
  if (window.configVisual && window.configVisual.titulo) {
    return window.configVisual.titulo;
  }

  // Obtener del input si existe
  const tituloInput = document.getElementById('config-titulo-input');
  if (tituloInput && tituloInput.value) {
    return tituloInput.value;
  }

  // Fallback al título del HTML
  const htmlTitle = document.querySelector('title')?.textContent;
  if (htmlTitle) {
    return htmlTitle;
  }

  return '🧠 Agenda de Pablo 🚆';
}

function actualizarTituloCarrusel() {
  const tituloElement = document.getElementById('carrusel-titulo-personalizado');
  if (tituloElement) {
    const titulo = obtenerTituloPersonalizado();
    tituloElement.textContent = titulo;
    console.log('📱 Título del carrusel actualizado:', titulo);
  }
}

// ==================== INICIALIZACIÓN ====================

function inicializarCarruselMovil() {
  console.log('🚀 Inicializando detección inteligente de dispositivo...');

  // Verificar si hay forzado manual
  if (window.FORZAR_MOVIL === true) {
    aplicarModoMovil();
    return;
  }

  if (window.FORZAR_MOVIL === false) {
    aplicarModoDesktop();
    return;
  }

  // Detección inteligente automática
  if (esDispositivoMovil()) {
    aplicarModoMovil();
  } else {
    aplicarModoDesktop();
  }
}

// ==================== GENERACIÓN DE PANELES ====================

function generarPanelesCarrusel() {
  const track = document.getElementById('carrusel-track');
  const indicadores = document.getElementById('carrusel-indicadores');

  if (!track || !indicadores) return;

  // Limpiar estado
  carruselState.paneles = [];

  // Panel 1: Tareas Críticas (siempre presente)
  carruselState.paneles.push({
    id: 'criticas',
    nombre: 'Críticas',
    icono: '🚨',
    tipo: 'criticas',
    color: '#e74c3c'
  });

  // Panel 2: Citas
  carruselState.paneles.push({
    id: 'citas',
    nombre: 'Citas',
    icono: '📅',
    tipo: 'citas',
    color: '#3498db'
  });

  // Agregar listas personalizadas
  const configVisual = window.configVisual || {};
  const listasPersonalizadas = configVisual.listasPersonalizadas || [];

  listasPersonalizadas.forEach(lista => {
    if (lista && lista.tareas && lista.tareas.length > 0) {
      carruselState.paneles.push({
        id: lista.id,
        nombre: lista.nombre,
        icono: lista.emoji || '📝',
        tipo: 'personalizada',
        color: lista.color || '#667eea',
        lista: lista
      });
    }
  });

  carruselState.totalPaneles = carruselState.paneles.length;

  // Generar HTML de paneles adicionales (el panel críticas ya está en el HTML)
  let panelesHTML = '';
  for (let i = 1; i < carruselState.paneles.length; i++) {
    const panel = carruselState.paneles[i];
    panelesHTML += `
      <div class="carrusel-panel" data-panel="${panel.id}">
        <div class="panel-header">
          <span class="panel-icono">${panel.icono}</span>
          <span class="panel-nombre">${panel.nombre}</span>
          <span class="panel-contador" id="contador-${panel.id}">0</span>
        </div>
        <div class="panel-contenido" id="contenido-${panel.id}">
          <!-- Se renderiza dinámicamente -->
        </div>
      </div>
    `;
  }

  // Agregar paneles al track (después del panel críticas)
  const panelCriticas = track.querySelector('[data-panel="criticas"]');
  if (panelCriticas) {
    panelCriticas.insertAdjacentHTML('afterend', panelesHTML);
  }

  // Generar indicadores
  let indicadoresHTML = '';
  carruselState.paneles.forEach((panel, index) => {
    const activo = index === 0 ? 'activo' : '';
    indicadoresHTML += `<div class="indicador ${activo}" onclick="irAPanelCarrusel(${index})"></div>`;
  });
  indicadores.innerHTML = indicadoresHTML;

  console.log(`📋 Generados ${carruselState.totalPaneles} paneles del carrusel`);
}

// ==================== RENDERIZADO DE CONTENIDO ====================

function renderizarCarrusel() {
  console.log('🔄 Renderizando contenido del carrusel (LAZY LOADING)');
  // OPTIMIZACIÓN: Solo renderizar el panel actual (lazy loading)
  // Esto reduce drásticamente el tiempo de carga inicial de ~10s a <1s
  const panelActual = carruselState.paneles[carruselState.panelActual];

  if (panelActual) {
    if (panelActual.tipo === 'criticas') {
      renderizarPanelCriticas();
    } else if (panelActual.tipo === 'citas') {
      renderizarPanelCitas();
    } else if (panelActual.tipo === 'personalizada') {
      renderizarPanelPersonalizado(panelActual);
    }
    console.log(`✅ Panel "${panelActual.nombre}" renderizado`);
  }
  // Actualizar contadores (esto es rápido, no renderiza HTML completo)
  actualizarContadoresPaneles();
}
function renderizarPanelCitas() {
  const contenido = document.getElementById('contenido-citas');
  if (!contenido) return;

  const citas = window.appState?.agenda?.citas || [];
  console.log('🔍 DEBUG: Citas encontradas:', citas);

  // Función auxiliar para procesar fechas (puede ser array [año, mes, día] o string)
  function procesarFecha(fechaRaw) {
    if (!fechaRaw) return null;

    // Si es array [año, mes, día]
    if (Array.isArray(fechaRaw) && fechaRaw.length === 3) {
      const [año, mes, día] = fechaRaw;
      return new Date(año, mes - 1, día); // mes-1 porque Date usa 0-11 para meses
    }

    // Si es string
    if (typeof fechaRaw === 'string') {
      return new Date(fechaRaw);
    }

    return null;
  }

  // Función auxiliar para formatear fecha para mostrar
  function formatearFecha(fechaRaw) {
    if (!fechaRaw) return 'Sin fecha';

    // Si es array [año, mes, día]
    if (Array.isArray(fechaRaw) && fechaRaw.length === 3) {
      const [año, mes, día] = fechaRaw;
      return `${día.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${año}`;
    }

    // Si es string, devolverla tal como está
    if (typeof fechaRaw === 'string') {
      return fechaRaw;
    }

    return 'Sin fecha';
  }

  // Filtrar citas futuras y de hoy
  const citasActuales = citas.filter(cita => {
    if (!cita.fecha) return true;
    const fechaCita = procesarFecha(cita.fecha);
    if (!fechaCita) return true;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fechaCita >= hoy;
  });

  let html = '';

  if (citasActuales.length === 0) {
    html = `
      <div style="text-align: center; padding: 40px 20px; color: #666;">
        <div style="font-size: 60px; margin-bottom: 20px;">📅</div>
        <h3 style="color: #2d5a27; margin-bottom: 10px;">Sin citas</h3>
        <p>No tienes citas programadas</p>
      </div>
    `;
  } else {
    citasActuales
      .sort((a, b) => {
        const fechaA = procesarFecha(a.fecha);
        const fechaB = procesarFecha(b.fecha);
        if (!fechaA && !fechaB) return 0;
        if (!fechaA) return 1;
        if (!fechaB) return -1;
        return fechaA - fechaB;
      })
      .forEach((cita, index) => {
        const fechaCita = procesarFecha(cita.fecha);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const esHoy = fechaCita && fechaCita.toDateString() === hoy.toDateString();
        const esUrgente = fechaCita && (esHoy || fechaCita < hoy);
        const claseUrgente = esUrgente ? 'style="background: #e3f2fd; border-left: 4px solid #2196f3;"' : '';

        console.log('🔍 DEBUG: Procesando cita:', {
          nombre: cita.nombre,
          fechaOriginal: cita.fecha,
          fechaProcesada: fechaCita,
          esHoy,
          esUrgente
        });

        html += `
          <div class="tarea-carrusel" ${claseUrgente}>
            <div class="tarea-layout">
              <div class="tarea-contenido">
                <div class="tarea-header">
                  <span class="tarea-urgencia">${esUrgente ? '📅' : '🕐'}</span>
                  <span class="tarea-titulo">${cita.nombre || 'Cita sin título'}</span>
                </div>
                <div class="tarea-meta-grande">
                  <div class="meta-fecha">📅 ${formatearFecha(cita.fecha)}</div>
                  ${cita.hora ? `<div class="meta-persona">🕐 ${cita.hora}</div>` : ''}
                  ${cita.lugar ? `<div class="meta-etiqueta">📍 ${cita.lugar}</div>` : ''}
                </div>
              </div>
              <div class="tarea-botones" onclick="event.stopPropagation();">
                <button onclick="eliminarCita('${cita.id}')" class="btn-borrar-tarea" title="Eliminar cita">🗑️</button>
                <button onclick="iniciarPomodoroTarea('${cita.id}', 'cita')" class="btn-pomodoro-tarea" title="Preparación para cita">🍅</button>
                <button onclick="duplicarCita('${cita.id}')" class="btn-subtarea" title="Duplicar cita">📋</button>
              </div>
            </div>
          </div>
        `;
      });
  }

  contenido.innerHTML = html;
}

function renderizarPanelCriticas() {
  const contenido = document.getElementById('contenido-criticas');
  if (!contenido) return;

  const tareasCriticas = (window.appState?.agenda?.tareas_criticas || [])
    .filter(tarea => !tarea.completada);

  let html = '';

  if (tareasCriticas.length === 0) {
    html = `
      <div style="text-align: center; padding: 40px 20px; color: #666;">
        <div style="font-size: 60px; margin-bottom: 20px;">🎉</div>
        <h3 style="color: #2d5a27; margin-bottom: 10px;">¡Genial!</h3>
        <p>No tienes tareas críticas pendientes</p>
      </div>
    `;
  } else {
    tareasCriticas.forEach((tarea, index) => {
      const esUrgente = esFechaHoy(tarea.fecha_fin) || esFechaPasada(tarea.fecha_fin);
      const claseUrgente = esUrgente ? 'style="background: #ffebee; border-left: 4px solid #f44336;"' : '';

      html += `
        <div class="tarea-carrusel" ${claseUrgente} onclick="abrirModalReprogramarTarea('critica', '${tarea.id}', '${(tarea.titulo || 'Sin título').replace(/'/g, '&apos;')}')" style="cursor: pointer;">
          <div class="tarea-layout">
            <div class="tarea-contenido">
              <div class="tarea-header">
                <span class="tarea-urgencia">${esUrgente ? '🚨' : '⏳'}</span>
                <span class="tarea-titulo">${tarea.titulo || 'Sin título'}</span>
              </div>
              <div class="tarea-meta-grande">
                <div class="meta-fecha">📅 ${tarea.fecha_fin || 'Sin fecha'}</div>
                ${tarea.persona ? `<div class="meta-persona">👤 ${tarea.persona}</div>` : ''}
                ${tarea.etiqueta ? `<div class="meta-etiqueta">${tarea.etiqueta}</div>` : ''}
              </div>
              ${tarea.subtareas && tarea.subtareas.length > 0 ? `
                <div class="subtareas-preview">
                  <small>📝 ${tarea.subtareas.length} subtarea${tarea.subtareas.length > 1 ? 's' : ''}</small>
                </div>
              ` : ''}
            </div>
            <div class="tarea-botones" onclick="event.stopPropagation();">
              <button onclick="eliminarTareaCritica('${tarea.id}')" class="btn-borrar-tarea" title="Eliminar tarea">🗑️</button>
              <button onclick="iniciarPomodoroTarea('${tarea.id}', 'critica')" class="btn-pomodoro-tarea" title="Iniciar Pomodoro para esta tarea">🍅</button>
              <button onclick="añadirSubtarea('${tarea.id}', 'critica')" class="btn-subtarea" title="Añadir subtarea">📝</button>
            </div>
          </div>
        </div>
        ${renderizarSubtareas(tarea, tarea.id, 'critica')}
      `;
    });
  }

  contenido.innerHTML = html;
}

function renderizarPanelPersonalizado(panelInfo) {
  const contenido = document.getElementById(`contenido-${panelInfo.id}`);
  if (!contenido || !panelInfo.lista) return;

  const tareas = (panelInfo.lista.tareas || []).filter(tarea => !tarea.completada);

  let html = '';

  if (tareas.length === 0) {
    html = `
      <div style="text-align: center; padding: 40px 20px; color: #666;">
        <div style="font-size: 60px; margin-bottom: 20px;">${panelInfo.icono}</div>
        <h3 style="color: #2d5a27; margin-bottom: 10px;">Lista vacía</h3>
        <p>No hay tareas en "${panelInfo.nombre}"</p>
        <button onclick="abrirModalTareaUniversal()" class="btn-agregar-movil">
          ➕ Agregar tarea
        </button>
      </div>
    `;
  } else {
    tareas.forEach((tarea, index) => {
      const tieneFecha = tarea.fecha && tarea.fecha !== '';
      const esHoy = tieneFecha && esFechaHoy(tarea.fecha);
      const claseHoy = esHoy ? 'style="background: #fff3cd; border-left: 4px solid #ffc107;"' : '';

      html += `
        <div class="tarea-carrusel" ${claseHoy} onclick="abrirModalReprogramarTarea('personalizada', '${panelInfo.id}', '${(tarea.texto || 'Sin título').replace(/'/g, '&apos;')}', ${index})" style="cursor: pointer;">
          <div class="tarea-layout">
            <div class="tarea-contenido">
              <div class="tarea-header">
                <span class="tarea-urgencia">${esHoy ? '📅' : '📝'}</span>
                <span class="tarea-titulo">${tarea.texto || 'Sin título'}</span>
              </div>
              <div class="tarea-meta-grande">
                <div class="meta-fecha">📅 ${tarea.fecha || 'Sin fecha'}</div>
                ${tarea.persona ? `<div class="meta-persona">👤 ${tarea.persona}</div>` : ''}
              </div>
              ${tarea.subtareas && tarea.subtareas.length > 0 ? `
                <div class="subtareas-preview">
                  <small>📝 ${tarea.subtareas.length} subtarea${tarea.subtareas.length > 1 ? 's' : ''}</small>
                </div>
              ` : ''}
            </div>
            <div class="tarea-botones" onclick="event.stopPropagation();">
              <button onclick="eliminarTareaPersonalizada('${panelInfo.id}', ${index})" class="btn-borrar-tarea" title="Eliminar tarea">🗑️</button>
              <button onclick="iniciarPomodoroTarea('${tarea.id || index}', 'personalizada')" class="btn-pomodoro-tarea" title="Iniciar Pomodoro para esta tarea">🍅</button>
              <button onclick="añadirSubtarea('${tarea.id || index}', 'personalizada')" class="btn-subtarea" title="Añadir subtarea">📝</button>
            </div>
          </div>
        </div>
        ${renderizarSubtareas(tarea, tarea.id || index, 'personalizada')}
      `;
    });
  }

  contenido.innerHTML = html;
}

// ==================== NAVEGACIÓN DEL CARRUSEL ====================

function carruselSiguiente() {
  if (carruselState.panelActual < carruselState.totalPaneles - 1) {
    console.log('▶️ Navegando al siguiente panel');
    irAPanelCarrusel(carruselState.panelActual + 1);

    // Feedback visual del botón
    const btnNext = document.getElementById('carrusel-next');
    if (btnNext) {
      btnNext.style.transform = 'scale(0.9)';
      setTimeout(() => btnNext.style.transform = '', 150);
    }
  }
}

function carruselAnterior() {
  if (carruselState.panelActual > 0) {
    console.log('◀️ Navegando al panel anterior');
    irAPanelCarrusel(carruselState.panelActual - 1);

    // Feedback visual del botón
    const btnPrev = document.getElementById('carrusel-prev');
    if (btnPrev) {
      btnPrev.style.transform = 'scale(0.9)';
      setTimeout(() => btnPrev.style.transform = '', 150);
    }
  }
}

function irAPanelCarrusel(indice) {
  if (indice < 0 || indice >= carruselState.totalPaneles) return;

  carruselState.panelActual = indice;

  // Actualizar transform del carrusel
  const track = document.getElementById('carrusel-track');
  const translateX = -indice * 100;
  track.style.transform = `translateX(${translateX}%)`;

  // Actualizar paneles activos
  document.querySelectorAll('.carrusel-panel').forEach((panel, idx) => {
    panel.classList.toggle('activo', idx === indice);
  });

  // Actualizar indicadores
  document.querySelectorAll('.indicador').forEach((indicador, idx) => {
    indicador.classList.toggle('activo', idx === indice);
  });

  // Actualizar título
  const titulo = document.getElementById('carrusel-titulo');
  if (titulo && carruselState.paneles[indice]) {
    const panel = carruselState.paneles[indice];
    titulo.textContent = `${panel.icono} ${panel.nombre}`;
  }

  // Actualizar botones de navegación
  const btnPrev = document.getElementById('carrusel-prev');
  const btnNext = document.getElementById('carrusel-next');
  // OPTIMIZACIÓN: Renderizar el nuevo panel (lazy loading)
  renderizarCarrusel();
  if (btnPrev) btnPrev.disabled = indice === 0;
  if (btnNext) btnNext.disabled = indice === carruselState.totalPaneles - 1;

  console.log(`📱 Navegando a panel ${indice}: ${carruselState.paneles[indice]?.nombre}`);
}

// ==================== GESTOS TOUCH ====================

function configurarGestosTouch() {
  const track = document.getElementById('carrusel-track');
  if (!track) return;

  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let isDragging = false;
  let startTranslateX = 0;

  track.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isDragging = true;

    // Obtener posición actual del transform
    const transform = track.style.transform;
    const match = transform.match(/translateX\(([-\d.]+)%\)/);
    startTranslateX = match ? parseFloat(match[1]) : 0;

    track.style.transition = 'none';
  });

  track.addEventListener('touchmove', (e) => {
    if (!isDragging) return;

    currentX = e.touches[0].clientX;
    const deltaX = currentX - startX;
    const deltaY = Math.abs(e.touches[0].clientY - startY);

    // Solo hacer swipe horizontal si el movimiento es más horizontal que vertical
    if (Math.abs(deltaX) > deltaY) {
      e.preventDefault();

      const containerWidth = track.parentElement.offsetWidth;
      const deltaPercent = (deltaX / containerWidth) * 100;
      const newTranslateX = startTranslateX + deltaPercent;

      track.style.transform = `translateX(${newTranslateX}%)`;
    }
  });

  track.addEventListener('touchend', (e) => {
    if (!isDragging) return;

    isDragging = false;
    const deltaX = currentX - startX;
    const threshold = 50; // Mínimo de píxeles para considerar un swipe

    track.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        // Swipe derecha -> panel anterior
        carruselAnterior();
      } else {
        // Swipe izquierda -> panel siguiente
        carruselSiguiente();
      }
    } else {
      // Volver a la posición original
      irAPanelCarrusel(carruselState.panelActual);
    }
  });

  console.log('👆 Gestos touch configurados para el carrusel');
}

// ==================== MODAL REPROGRAMAR/DELEGAR ====================

let tareaEnProceso = null; // Variable global para guardar info de la tarea siendo editada

function abrirModalReprogramarTarea(tipo, tareaId, tareaTexto, tareaIndex = null) {
  console.log('📝 Abriendo modal para reprogramar/delegar:', { tipo, tareaId, tareaTexto, tareaIndex });

  // Guardar información de la tarea
  tareaEnProceso = {
    tipo: tipo,
    id: tareaId,
    texto: tareaTexto,
    index: tareaIndex
  };

  // Abrir el modal existente
  abrirModal('modal-migrar');

  // Pre-llenar campos si es necesario
  const fechaInput = document.getElementById('migrar-fecha');
  const personaSelect = document.getElementById('migrar-persona-select');

  if (fechaInput) {
    // Sugerir mañana como fecha por defecto
    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    fechaInput.value = mañana.toISOString().slice(0, 10);
  }

  if (personaSelect) {
    personaSelect.value = ''; // Resetear selección
  }

  console.log('✅ Modal de reprogramar/delegar abierto para tarea móvil');
}

function guardarMigracionMovil() {
  if (!tareaEnProceso) {
    console.error('❌ No hay tarea en proceso para guardar');
    return;
  }

  const fechaNueva = document.getElementById('migrar-fecha')?.value;
  const personaSeleccionada = document.getElementById('migrar-persona-select')?.value;
  const personaManual = document.getElementById('migrar-persona')?.value;

  const persona = personaSeleccionada === '__otra__' ? personaManual : personaSeleccionada;

  console.log('💾 Guardando migración móvil:', {
    tarea: tareaEnProceso,
    fechaNueva,
    persona
  });

  if (tareaEnProceso.tipo === 'critica') {
    // Manejar tarea crítica
    const tareas = window.appState?.agenda?.tareas_criticas || [];
    const tarea = tareas.find(t => t.id === tareaEnProceso.id);

    if (tarea) {
      if (fechaNueva) tarea.fecha_fin = fechaNueva;
      if (persona) tarea.persona = persona;

      // Guardar cambios
      if (typeof guardarJSON === 'function') {
        guardarJSON();
      }
    }
  } else if (tareaEnProceso.tipo === 'personalizada') {
    // Manejar tarea de lista personalizada
    const configVisual = window.configVisual || {};
    const listas = configVisual.listasPersonalizadas || [];
    const lista = listas.find(l => l.id === tareaEnProceso.id);

    if (lista && lista.tareas && lista.tareas[tareaEnProceso.index]) {
      const tarea = lista.tareas[tareaEnProceso.index];
      if (fechaNueva) tarea.fecha = fechaNueva;
      if (persona) tarea.persona = persona;

      // Guardar cambios
      if (typeof supabasePush === 'function') {
        supabasePush();
      }
    }
  }

  // Cerrar modal
  cerrarModal('modal-migrar');

  // Limpiar variable
  tareaEnProceso = null;

  // Re-renderizar carrusel
  renderizarCarrusel();

  // Mostrar confirmación
  if (fechaNueva && persona) {
    mostrarAlerta(`📅👤 Tarea reprogramada para ${fechaNueva} y delegada a ${persona}`, 'success');
  } else if (fechaNueva) {
    mostrarAlerta(`📅 Tarea reprogramada para ${fechaNueva}`, 'success');
  } else if (persona) {
    mostrarAlerta(`👤 Tarea delegada a ${persona}`, 'success');
  }

  console.log('✅ Migración móvil completada');
}

// ==================== ACCIONES DE TAREAS ====================

function completarTareaCritica(tareaId) {
  const tareas = window.appState?.agenda?.tareas_criticas || [];
  const tarea = tareas.find(t => t.id === tareaId);

  if (tarea) {
    tarea.completada = true;
    tarea.estado = 'completada';

    // Guardar cambios
    if (typeof guardarJSON === 'function') {
      guardarJSON();
    }

    mostrarAlerta('✅ Tarea crítica completada', 'success');
    renderizarPanelCriticas();
    actualizarContadoresPaneles();

    // Actualizar vista desktop si está visible
    if (typeof renderizar === 'function') {
      renderizar();
    }
  }
}

function completarTareaPersonalizada(listaId, tareaIndex) {
  const configVisual = window.configVisual || {};
  const listas = configVisual.listasPersonalizadas || [];
  const lista = listas.find(l => l.id === listaId);

  if (lista && lista.tareas && lista.tareas[tareaIndex]) {
    lista.tareas[tareaIndex].completada = true;

    // Guardar cambios
    if (typeof supabasePush === 'function') {
      supabasePush();
    }

    mostrarAlerta('✅ Tarea completada', 'success');

    // Re-renderizar panel
    const panelInfo = carruselState.paneles.find(p => p.id === listaId);
    if (panelInfo) {
      renderizarPanelPersonalizado(panelInfo);
    }

    actualizarContadoresPaneles();

    // Actualizar vista desktop si está visible
    if (typeof renderizarTodasLasListasPersonalizadas === 'function') {
      renderizarTodasLasListasPersonalizadas();
    }
  }
}

function posponerTarea(tareaId) {
  const tareas = window.appState?.agenda?.tareas_criticas || [];
  const tarea = tareas.find(t => t.id === tareaId);

  if (tarea) {
    // Posponer para mañana
    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    tarea.fecha_fin = mañana.toISOString().slice(0, 10);

    if (typeof guardarJSON === 'function') {
      guardarJSON();
    }

    mostrarAlerta('⏭️ Tarea pospuesta para mañana', 'info');
    renderizarPanelCriticas();
    actualizarContadoresPaneles();
  }
}

// ==================== UTILIDADES ====================

function actualizarContadoresPaneles() {
  carruselState.paneles.forEach(panel => {
    const contador = document.getElementById(`contador-${panel.id}`);
    if (!contador) return;

    let cantidad = 0;

    if (panel.tipo === 'criticas') {
      const tareasCriticas = window.appState?.agenda?.tareas_criticas || [];
      cantidad = tareasCriticas.filter(t => !t.completada).length;
    } else if (panel.tipo === 'citas') {
      const citas = window.appState?.agenda?.citas || [];
      cantidad = citas.filter(cita => {
        if (!cita.fecha) return true;
        // Usar la misma lógica de procesamiento de fechas
        const fechaCita = (() => {
          if (Array.isArray(cita.fecha) && cita.fecha.length === 3) {
            const [año, mes, día] = cita.fecha;
            return new Date(año, mes - 1, día);
          }
          if (typeof cita.fecha === 'string') {
            return new Date(cita.fecha);
          }
          return null;
        })();

        if (!fechaCita) return true;
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        return fechaCita >= hoy;
      }).length;
    } else if (panel.tipo === 'personalizada' && panel.lista) {
      const tareas = panel.lista.tareas || [];
      cantidad = tareas.filter(t => !t.completada).length;
    }

    contador.textContent = cantidad;
    contador.style.background = cantidad > 0 ? panel.color : '#ccc';
  });
}

function esFechaHoy(fechaStr) {
  if (!fechaStr) return false;
  const hoy = new Date().toISOString().slice(0, 10);
  return fechaStr === hoy;
}

function esFechaPasada(fechaStr) {
  if (!fechaStr) return false;
  const fecha = new Date(fechaStr);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return fecha < hoy;
}

// ==================== OVERRIDE FUNCIÓN GUARDAR MIGRACIÓN ====================

// Sobrescribir la función guardarMigracion para que funcione con el carrusel móvil
window.guardarMigracionOriginal = window.guardarMigracion; // Guardar original

window.guardarMigracion = function () {
  // Si estamos en modo móvil y hay tarea en proceso, usar función móvil
  if (window.FORZAR_MOVIL === true || (window.FORZAR_MOVIL === undefined && esDispositivoMovil())) {
    if (tareaEnProceso) {
      console.log('📱 Usando función de migración móvil');
      guardarMigracionMovil();
      return;
    }
  }

  // Si no, usar función original
  if (window.guardarMigracionOriginal) {
    console.log('🖥️ Usando función de migración original');
    window.guardarMigracionOriginal();
  }
};

// ==================== INICIALIZACIÓN AUTOMÁTICA ====================

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Esperar un poco para que se carguen otros scripts
  setTimeout(inicializarCarruselMovil, 10);
});

// Reinicializar en cambio de orientación (móviles)
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    console.log('🔄 Cambio de orientación detectado');
    inicializarCarruselMovil();
  }, 100);
});

// Reinicializar en cambio de tamaño (para debugging)
window.addEventListener('resize', () => {
  // Solo re-evaluar si no hay modo forzado
  if (window.FORZAR_MOVIL === undefined) {
    setTimeout(inicializarCarruselMovil, 10);
  }
});

// ==================== CONTROLES DE TESTING ====================

function crearControlesTesting() {
  // Solo crear controles si no existen
  if (document.getElementById('testing-controls')) return;

  const controls = document.createElement('div');
  controls.id = 'testing-controls';
  controls.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px;
    border-radius: 8px;
    z-index: 9999;
    font-size: 12px;
    display: flex;
    gap: 5px;
    flex-direction: column;
  `;

  controls.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">🧪 Testing</div>
    <button onclick="forzarModoMovil()" style="padding: 5px; font-size: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">📱 Forzar Móvil</button>
    <button onclick="forzarModoDesktop()" style="padding: 5px; font-size: 10px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">🖥️ Forzar Desktop</button>
    <button onclick="window.FORZAR_MOVIL = undefined; inicializarCarruselMovil()" style="padding: 5px; font-size: 10px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer;">🔄 Auto</button>
    <button onclick="document.getElementById('testing-controls').remove()" style="padding: 5px; font-size: 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">❌ Ocultar</button>
  `;

  document.body.appendChild(controls);
  console.log('🧪 Controles de testing agregados');
}

// Función global para mostrar controles de testing
window.mostrarControlesTesting = crearControlesTesting;

// Función global para actualizar título desde configuración
window.actualizarTituloCarruselMovil = actualizarTituloCarrusel;

// Listener para actualización de configuración
document.addEventListener('configVisualActualizada', actualizarTituloCarrusel);

// ==================== FUNCIONES DE SUBTAREAS ====================

function renderizarSubtarea(subtarea, subtareaIndex, tareaId, tipoTarea) {
  const completada = subtarea.completada ? 'style="opacity: 0.6; text-decoration: line-through;"' : '';
  const fechaCreacion = subtarea.fecha_creacion ? new Date(subtarea.fecha_creacion).toLocaleDateString() : '';

  return `
    <div class="subtarea-carrusel" ${completada} onclick="abrirModalEditarSubtarea('${tareaId}', ${subtareaIndex}, '${tipoTarea}')" style="cursor: pointer;">
      <div class="subtarea-layout">
        <div class="subtarea-contenido">
          <div class="subtarea-titulo">${subtarea.texto || 'Subtarea sin título'}</div>
          ${fechaCreacion ? `<div class="subtarea-meta">Creada: ${fechaCreacion}</div>` : ''}
        </div>
        <div class="subtarea-botones" onclick="event.stopPropagation();">
          ${!subtarea.completada ? `
            <button onclick="completarSubtarea('${tareaId}', ${subtareaIndex}, '${tipoTarea}')" class="btn-subtarea-accion btn-completar-subtarea" title="Completar subtarea">✓</button>
          ` : ''}
          <button onclick="eliminarSubtarea('${tareaId}', ${subtareaIndex}, '${tipoTarea}')" class="btn-subtarea-accion btn-eliminar-subtarea" title="Eliminar subtarea">✕</button>
        </div>
      </div>
    </div>
  `;
}

function renderizarSubtareas(tarea, tareaId, tipoTarea) {
  if (!tarea.subtareas || tarea.subtareas.length === 0) {
    return '';
  }

  let html = '';
  tarea.subtareas.forEach((subtarea, index) => {
    html += renderizarSubtarea(subtarea, index, tareaId, tipoTarea);
  });

  return html;
}

function completarSubtarea(tareaId, subtareaIndex, tipoTarea) {
  let tarea = null;
  let guardado = false;

  if (tipoTarea === 'critica') {
    const tareas = window.appState?.agenda?.tareas_criticas || [];
    tarea = tareas.find(t => t.id === tareaId);

    if (tarea && tarea.subtareas && tarea.subtareas[subtareaIndex]) {
      tarea.subtareas[subtareaIndex].completada = true;

      sincronizarTodo();
      guardado = true;

      renderizarPanelCriticas();
    }
  } else if (tipoTarea === 'personalizada') {
    const panelActual = carruselState.paneles[carruselState.panelActual];
    if (panelActual && panelActual.lista && panelActual.lista.tareas && panelActual.lista.tareas[tareaId]) {
      tarea = panelActual.lista.tareas[tareaId];

      if (tarea.subtareas && tarea.subtareas[subtareaIndex]) {
        tarea.subtareas[subtareaIndex].completada = true;

        sincronizarTodo();
        guardado = true;

        renderizarPanelPersonalizado(panelActual);
      }
    }
  }

  if (guardado) {
    mostrarAlerta('✅ Subtarea completada', 'success');
    actualizarContadoresPaneles();
  } else {
    mostrarAlerta('❌ No se pudo completar la subtarea', 'error');
  }
}

function eliminarSubtarea(tareaId, subtareaIndex, tipoTarea) {
  if (!confirm('¿Estás seguro de que quieres eliminar esta subtarea?')) {
    return;
  }

  let tarea = null;
  let guardado = false;

  if (tipoTarea === 'critica') {
    const tareas = window.appState?.agenda?.tareas_criticas || [];
    tarea = tareas.find(t => t.id === tareaId);

    if (tarea && tarea.subtareas && tarea.subtareas[subtareaIndex]) {
      tarea.subtareas.splice(subtareaIndex, 1);

      sincronizarTodo();
      guardado = true;

      renderizarPanelCriticas();
    }
  } else if (tipoTarea === 'personalizada') {
    const panelActual = carruselState.paneles[carruselState.panelActual];
    if (panelActual && panelActual.lista && panelActual.lista.tareas && panelActual.lista.tareas[tareaId]) {
      tarea = panelActual.lista.tareas[tareaId];

      if (tarea.subtareas && tarea.subtareas[subtareaIndex]) {
        tarea.subtareas.splice(subtareaIndex, 1);

        sincronizarTodo();
        guardado = true;

        renderizarPanelPersonalizado(panelActual);
      }
    }
  }

  if (guardado) {
    mostrarAlerta('🗑️ Subtarea eliminada', 'success');
    actualizarContadoresPaneles();
  } else {
    mostrarAlerta('❌ No se pudo eliminar la subtarea', 'error');
  }
}

function abrirModalEditarSubtarea(tareaId, subtareaIndex, tipoTarea) {
  // Para futuras mejoras - modal de edición de subtareas
  console.log(`📝 Editando subtarea ${subtareaIndex} de tarea ${tareaId} (tipo: ${tipoTarea})`);
}

// ==================== NUEVAS FUNCIONES DE BOTONES ====================

function eliminarTareaCritica(tareaId) {
  if (!confirm('¿Estás seguro de que quieres eliminar esta tarea crítica?')) {
    return;
  }

  const tareas = window.appState?.agenda?.tareas_criticas || [];
  const index = tareas.findIndex(t => t.id === tareaId);

  if (index !== -1) {
    tareas.splice(index, 1);

    // Sincronizar todo
    sincronizarTodo();

    mostrarAlerta('🗑️ Tarea crítica eliminada', 'success');

    // Re-renderizar panel
    renderizarPanelCriticas();
    actualizarContadoresPaneles();

    // Actualizar vista desktop si está visible
    if (typeof renderizarTareasCriticas === 'function') {
      renderizarTareasCriticas();
    }
  } else {
    mostrarAlerta('❌ No se pudo encontrar la tarea', 'error');
  }
}

function eliminarTareaPersonalizada(listaId, tareaIndex) {
  if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
    return;
  }

  const lista = configVisual.listasPersonalizadas?.find(l => l.id === listaId);
  if (!lista || !lista.tareas || !lista.tareas[tareaIndex]) {
    mostrarAlerta('❌ No se pudo encontrar la tarea', 'error');
    return;
  }

  // Eliminar tarea
  lista.tareas.splice(tareaIndex, 1);

  // Sincronizar todo
  sincronizarTodo();

  mostrarAlerta('🗑️ Tarea eliminada', 'success');

  // Re-renderizar panel
  const panelInfo = carruselState.paneles.find(p => p.id === listaId);
  if (panelInfo) {
    renderizarPanelPersonalizado(panelInfo);
  }

  actualizarContadoresPaneles();

  // Actualizar vista desktop si está visible
  if (typeof renderizarTodasLasListasPersonalizadas === 'function') {
    renderizarTodasLasListasPersonalizadas();
  }
}

function iniciarPomodoroTarea(tareaId, tipo) {
  console.log(`🍅 Iniciando Pomodoro para tarea ${tareaId} de tipo ${tipo}`);

  // Buscar la tarea según su tipo
  let tarea = null;
  if (tipo === 'critica') {
    const tareas = window.appState?.agenda?.tareas_criticas || [];
    tarea = tareas.find(t => t.id === tareaId);
  } else if (tipo === 'cita') {
    const citas = window.appState?.agenda?.citas || [];
    tarea = citas.find(c => c.id === tareaId);
  } else if (tipo === 'personalizada') {
    // Para tareas personalizadas, tareaId podría ser el índice
    const panelActual = carruselState.paneles[carruselState.panelActual];
    if (panelActual && panelActual.lista && panelActual.lista.tareas) {
      tarea = panelActual.lista.tareas[tareaId] || { texto: `Tarea ${tareaId}` };
    }
  }

  const tituloTarea = tarea ? (tarea.titulo || tarea.nombre || tarea.texto || 'Tarea sin título') : 'Tarea desconocida';

  // Si existe la función de Pomodoro global, úsala
  if (typeof iniciarPomodoro === 'function') {
    iniciarPomodoro();
    mostrarAlerta(`🍅 Pomodoro iniciado para: "${tituloTarea}"`, 'success');
  } else {
    // Fallback: temporizador simple
    const tiempoPomodoro = 25 * 60 * 1000; // 25 minutos
    const inicioPomodoro = Date.now();

    mostrarAlerta(`🍅 Pomodoro de 25 min iniciado para: "${tituloTarea}"`, 'info');

    setTimeout(() => {
      mostrarAlerta(`⏰ ¡Tiempo de descanso! Has trabajado en: "${tituloTarea}"`, 'success');
    }, tiempoPomodoro);
  }
}

function añadirSubtarea(tareaId, tipo) {
  const textoSubtarea = prompt('✍️ Escribe el texto de la nueva subtarea:');

  if (!textoSubtarea || textoSubtarea.trim() === '') {
    return;
  }

  let tarea = null;
  let guardado = false;

  if (tipo === 'critica') {
    const tareas = window.appState?.agenda?.tareas_criticas || [];
    tarea = tareas.find(t => t.id === tareaId);

    if (tarea) {
      if (!tarea.subtareas) {
        tarea.subtareas = [];
      }

      tarea.subtareas.push({
        id: Date.now().toString(),
        texto: textoSubtarea.trim(),
        completada: false,
        fecha_creacion: new Date().toISOString()
      });

      // Sincronizar todo
      sincronizarTodo();
      guardado = true;

      // Re-renderizar panel
      renderizarPanelCriticas();
    }
  } else if (tipo === 'personalizada') {
    const panelActual = carruselState.paneles[carruselState.panelActual];
    if (panelActual && panelActual.lista && panelActual.lista.tareas && panelActual.lista.tareas[tareaId]) {
      tarea = panelActual.lista.tareas[tareaId];

      if (!tarea.subtareas) {
        tarea.subtareas = [];
      }

      tarea.subtareas.push({
        id: Date.now().toString(),
        texto: textoSubtarea.trim(),
        completada: false,
        fecha_creacion: new Date().toISOString()
      });

      // Sincronizar todo
      sincronizarTodo();
      guardado = true;

      // Re-renderizar panel
      renderizarPanelPersonalizado(panelActual);
    }
  }

  if (guardado && tarea) {
    const tituloTarea = tarea.titulo || tarea.texto || 'Tarea';
    mostrarAlerta(`📝 Subtarea añadida a "${tituloTarea}"`, 'success');

    // Actualizar contadores
    actualizarContadoresPaneles();

    // Actualizar vista desktop si está visible
    if (tipo === 'critica' && typeof renderizarTareasCriticas === 'function') {
      renderizarTareasCriticas();
    } else if (tipo === 'personalizada' && typeof renderizarTodasLasListasPersonalizadas === 'function') {
      renderizarTodasLasListasPersonalizadas();
    }
  } else {
    mostrarAlerta('❌ No se pudo añadir la subtarea', 'error');
  }
}

// ==================== SINCRONIZACIÓN COMPLETA ====================

function sincronizarTodo() {
  console.log('📤 Sincronizando TODO...');

  // Sincronizar tareas (JSON)
  if (typeof guardarJSON === 'function') {
    guardarJSON();
    console.log('✅ JSON sincronizado');
  }

  // Sincronizar listas y citas (Supabase)
  if (typeof supabasePush === 'function') {
    supabasePush();
    console.log('✅ Supabase sincronizado');
  }

  console.log('📤 Sincronización completa finalizada');
}

// ==================== FUNCIONES DE CITAS ====================

function eliminarCita(citaId) {
  if (!confirm('¿Estás seguro de que quieres eliminar esta cita?')) {
    return;
  }

  const citas = window.appState?.agenda?.citas || [];
  const index = citas.findIndex(c => c.id === citaId);

  if (index !== -1) {
    citas.splice(index, 1);

    sincronizarTodo();

    mostrarAlerta('🗑️ Cita eliminada', 'success');
    renderizarPanelCitas();
    actualizarContadoresPaneles();
  }
}

function duplicarCita(citaId) {
  const citas = window.appState?.agenda?.citas || [];
  const citaOriginal = citas.find(c => c.id === citaId);

  if (citaOriginal) {
    const nuevaCita = {
      ...citaOriginal,
      id: Date.now().toString(),
      nombre: citaOriginal.nombre + ' (copia)'
    };

    citas.push(nuevaCita);

    sincronizarTodo();

    mostrarAlerta('📋 Cita duplicada', 'success');
    renderizarPanelCitas();
    actualizarContadoresPaneles();
  }
}

function abrirModalNuevaCita() {
  // Si existe función de modal de cita, usarla
  if (typeof abrirModalCita === 'function') {
    abrirModalCita();
    return;
  }

  // Fallback simple con prompt
  const titulo = prompt('📅 Título de la nueva cita:');
  if (!titulo || titulo.trim() === '') return;

  const fecha = prompt('📅 Fecha (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
  if (!fecha) return;

  const hora = prompt('🕐 Hora (HH:MM) [opcional]:');

  const nuevaCita = {
    id: Date.now().toString(),
    nombre: titulo.trim(),
    fecha: fecha,
    hora: hora || '',
    lugar: '',
    descripcion: ''
  };

  if (!window.appState.agenda.citas) {
    window.appState.agenda.citas = [];
  }

  window.appState.agenda.citas.push(nuevaCita);

  sincronizarTodo();

  mostrarAlerta(`📅 Cita "${titulo}" creada`, 'success');
  renderizarPanelCitas();
  actualizarContadoresPaneles();
}

console.log('📱 Carrusel móvil TDAH cargado');