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
  console.log('🔄 Renderizando contenido del carrusel');

  carruselState.paneles.forEach((panel, index) => {
    if (panel.tipo === 'criticas') {
      renderizarPanelCriticas();
    } else if (panel.tipo === 'personalizada') {
      renderizarPanelPersonalizado(panel);
    }
  });

  actualizarContadoresPaneles();
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
        <div class="tarea-carrusel" ${claseUrgente}>
          <div class="tarea-header">
            <span class="tarea-urgencia">${esUrgente ? '🚨' : '⏳'}</span>
            <span class="tarea-titulo">${tarea.titulo || 'Sin título'}</span>
          </div>
          <div class="tarea-meta">
            <small>📅 ${tarea.fecha_fin || 'Sin fecha'}</small>
            ${tarea.etiqueta ? `<span class="tarea-etiqueta">${tarea.etiqueta}</span>` : ''}
          </div>
          <div class="tarea-acciones">
            <button onclick="completarTareaCritica('${tarea.id}')" class="btn-completar">
              ✅ Completar
            </button>
            <button onclick="posponerTarea('${tarea.id}')" class="btn-posponer">
              ⏭️ Mañana
            </button>
          </div>
        </div>
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
        <div class="tarea-carrusel" ${claseHoy}>
          <div class="tarea-header">
            <span class="tarea-urgencia">${esHoy ? '📅' : '📝'}</span>
            <span class="tarea-titulo">${tarea.texto || 'Sin título'}</span>
          </div>
          ${tieneFecha ? `
            <div class="tarea-meta">
              <small>📅 ${tarea.fecha}</small>
              ${tarea.persona ? `<small>👤 ${tarea.persona}</small>` : ''}
            </div>
          ` : ''}
          <div class="tarea-acciones">
            <button onclick="completarTareaPersonalizada('${panelInfo.id}', ${index})" class="btn-completar">
              ✅ Completar
            </button>
            <button onclick="editarTareaPersonalizada('${panelInfo.id}', ${index})" class="btn-editar">
              ✏️ Editar
            </button>
          </div>
        </div>
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

// ==================== INICIALIZACIÓN AUTOMÁTICA ====================

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Esperar un poco para que se carguen otros scripts
  setTimeout(inicializarCarruselMovil, 100);
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
    setTimeout(inicializarCarruselMovil, 200);
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

console.log('📱 Carrusel móvil TDAH cargado');