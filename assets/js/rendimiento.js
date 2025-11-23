// ========== OPTIMIZACIONES DE RENDIMIENTO ==========

// ========== OPTIMIZACIONES PARA TABLET ==========
// Prevenir bloqueos y mejorar rendimiento
const performanceOptimizer = {
  // Debounce para evitar múltiples ejecuciones
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  // Throttle para limitar frecuencia de ejecución
  throttle: (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  },
  
  // Ejecutar tareas pesadas en chunks para no bloquear UI
  processInChunks: async (items, processor, chunkSize = 10) => {
    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      await new Promise(resolve => {
        chunk.forEach(processor);
        setTimeout(resolve, 0); // Yield control back to browser
      });
    }
  },
  
  // Limpiar memoria y optimizar
  cleanup: () => {
    // Limpiar timers no utilizados
    if (window.gcTimer) clearInterval(window.gcTimer);
    
    // Forzar garbage collection si está disponible
    if (window.gc) {
      try { window.gc(); } catch(e) {}
    }
    
    // Limpiar event listeners huérfanos
    document.querySelectorAll('[data-cleanup]').forEach(el => {
      el.remove();
    });
  }
};

// Optimizar renderizado con debounce
const renderizarOptimizado = performanceOptimizer.debounce(() => {
  requestAnimationFrame(() => {
    renderizar();
  });
}, 100);

// Optimizar guardado con throttle
const guardarOptimizado = performanceOptimizer.throttle((silent) => {
  guardarJSON(silent);
}, 2000);

// Monitor de memoria y rendimiento
const performanceMonitor = {
  start: () => {
    // Limpiar memoria cada 5 minutos
    window.gcTimer = setInterval(() => {
      performanceOptimizer.cleanup();
    }, 300000);
    
    // Detectar si la tablet está bajo estrés
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        const usedPercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        if (usedPercent > 80) {
          console.warn('⚠️ Memoria alta, ejecutando limpieza');
          performanceOptimizer.cleanup();
          mostrarAlerta('🔧 Optimizando rendimiento...', 'info');
        }
      }, 30000);
    }
  },
  
  stop: () => {
    if (window.gcTimer) clearInterval(window.gcTimer);
  }
};

// Prevenir zoom accidental en tablet
if (typeof isMobile === 'function' && isMobile()) {
  // Disable tactile feedback globally
  document.body.style.WebkitTapHighlightColor = 'transparent';

  // Prevent default touch behaviors
  document.addEventListener('touchstart', (e) => {
    // Prevent multi-touch zoom
    if (e.touches.length > 1) {
      e.preventDefault();
    }

    // Optional: add a subtle vibration for task interactions
    if ('vibrate' in navigator && document.getElementById('config-vibration')?.checked) {
      navigator.vibrate(10);
    }
  }, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
}

// ========== DRAG & DROP / TOUCH ==========
let draggedElement = null;
let touchStartX = 0;
let touchStartY = 0;
let touchCurrentX = 0;
let touchCurrentY = 0;
let isDragging = false;
let longPressTimer = null;

function handleDragStart(e) {
  draggedElement = e.target;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', e.target.outerHTML);
  
  // Mostrar zonas de borrado y migración
  const deleteZone = document.getElementById('delete-zone');
  const migrateZone = document.getElementById('migrate-zone');
  deleteZone.classList.add('active');
  migrateZone.classList.add('active');
  
  // Feedback háptico en móvil
  if (isMobile() && navigator.vibrate) {
    navigator.vibrate(50);
  }
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedElement = null;
  
  // Ocultar zonas de borrado y migración
  const deleteZone = document.getElementById('delete-zone');
  const migrateZone = document.getElementById('migrate-zone');
  deleteZone.classList.remove('active');
  migrateZone.classList.remove('active');
}

// Configurar drop zones
document.addEventListener('DOMContentLoaded', () => {
  const dropZones = document.querySelectorAll('.drop-zone');
  const deleteZone = document.getElementById('delete-zone');
  const migrateZone = document.getElementById('migrate-zone');
  
  dropZones.forEach(zone => {
    zone.addEventListener('dragover', handleDragOver);
    zone.addEventListener('drop', handleDrop);
    zone.addEventListener('dragenter', handleDragEnter);
    zone.addEventListener('dragleave', handleDragLeave);
  });
  
  // Configurar zona de borrado
  deleteZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });
  deleteZone.addEventListener('drop', handleDeleteDrop);
  deleteZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    deleteZone.style.background = 'rgba(244, 67, 54, 0.5)';
  });
  deleteZone.addEventListener('dragleave', (e) => {
    deleteZone.style.background = 'rgba(244, 67, 54, 0.3)';
  });
  
  // Configurar zona de migración
  migrateZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });
  migrateZone.addEventListener('drop', handleMigrateDrop);
  migrateZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    migrateZone.style.background = 'rgba(156, 39, 176, 0.5)';
  });
  migrateZone.addEventListener('dragleave', (e) => {
    migrateZone.style.background = 'rgba(156, 39, 176, 0.3)';
  });
});

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    e.currentTarget.classList.remove('drag-over');
  }
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  
  if (!draggedElement) return;
  
  const sourceType = draggedElement.dataset.tipo;
  const sourceIndex = parseInt(draggedElement.dataset.index);
  const targetType = e.currentTarget.dataset.target;
  
  // No hacer nada si se suelta en la misma zona
  if ((sourceType === 'critica' && targetType === 'criticas') || 
      (sourceType === 'tarea' && targetType === 'tareas')) {
    return;
  }
  
  // Mover tarea entre arrays
  if (sourceType === 'critica' && targetType === 'tareas') {
    // De crítica a normal
    const tarea = appState.agenda.tareas_criticas[sourceIndex];
    const nuevaTarea = {
      id: tarea.id,
      texto: tarea.titulo,
      fecha_fin: tarea.fecha_fin,
      completada: tarea.completada,
      estado: tarea.estado,
      persona: null,
      fecha_migrar: null
    };
    appState.agenda.tareas.push(nuevaTarea);
    appState.agenda.tareas_criticas.splice(sourceIndex, 1);
  } else if (sourceType === 'tarea' && targetType === 'criticas') {
    // De normal a crítica
    const tarea = appState.agenda.tareas[sourceIndex];
    const nuevaCritica = {
      id: tarea.id,
      titulo: tarea.texto,
      razon: '',
      fecha_fin: tarea.fecha_fin,
      completada: tarea.completada,
      estado: tarea.estado
    };
    appState.agenda.tareas_criticas.push(nuevaCritica);
    appState.agenda.tareas.splice(sourceIndex, 1);
  }
  
  renderizar();
  guardarJSON(true);
  mostrarAlerta('✨ Tarea movida correctamente', 'success');
  
  // Feedback háptico en móvil
  if (isMobile() && navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }
}

function handleDeleteDrop(e) {
  e.preventDefault();
  const deleteZone = document.getElementById('delete-zone');
  deleteZone.classList.remove('active');
  
  if (!draggedElement) return;
  
  const sourceType = draggedElement.dataset.tipo;
  const sourceIndex = parseInt(draggedElement.dataset.index);
  
  // Obtener el elemento a borrar
  let elementoABorrar;
  if (sourceType === 'critica') {
    elementoABorrar = appState.agenda.tareas_criticas[sourceIndex];
  } else {
    elementoABorrar = appState.agenda.tareas[sourceIndex];
  }
  showDeleteCountdown(sourceType, sourceIndex, elementoABorrar);
}

function showDeleteCountdown(tipo, index, elemento) {
  // Crear popup de cuenta atrás
  const popup = document.createElement('div');
  popup.className = 'countdown-popup';
  popup.innerHTML = `
    <h3>🗑️ Se va a borrar</h3>
    <p><strong>${tipo === 'critica' ? elemento.titulo : elemento.texto}</strong></p>
    <div class="countdown-number" id="countdown">3</div>
    <div style="display:flex;gap:10px;justify-content:center;">
      <button onclick="cancelDelete()" class="btn-secundario">NO</button>
      <button onclick="confirmDelete('${tipo}', ${index})" class="btn-primario" style="background:#f44336;">OK</button>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // Cuenta atrás
  let countdown = 3;
  const countdownEl = document.getElementById('countdown');
  
  const timer = setInterval(() => {
    countdown--;
    if (countdownEl) countdownEl.textContent = countdown;
    
    if (countdown <= 0) {
      clearInterval(timer);
      confirmDelete(tipo, index);
    }
  }, 1000);
  
  // Guardar timer para poder cancelarlo
  popup.dataset.timer = timer;
}

function cancelDelete() {
  const popup = document.querySelector('.countdown-popup');
  if (popup) {
    clearInterval(popup.dataset.timer);
    popup.remove();
  }
}

async function confirmDelete(tipo, index) {
  const popup = document.querySelector('.countdown-popup');
  if (popup) {
    clearInterval(popup.dataset.timer);
    popup.remove();
  }
  
  // Borrar elemento
  if (tipo === 'critica') {
    appState.agenda.tareas_criticas.splice(index, 1);
  } else {
    appState.agenda.tareas.splice(index, 1);
  }
  
  renderizar();
  guardarJSON(true);
  mostrarAlerta('🗑️ Tarea eliminada', 'info');
  
  // Feedback háptico en móvil
  if (isMobile() && navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }
}

function handleMigrateDrop(e) {
  e.preventDefault();
  const migrateZone = document.getElementById('migrate-zone');
  migrateZone.classList.remove('active');
  
  if (!draggedElement) return;
  
  const sourceType = draggedElement.dataset.tipo;
  const sourceIndex = parseInt(draggedElement.dataset.index);
  
  // Configurar tarea seleccionada para migración
  appState.ui.tareaSeleccionada = { tipo: sourceType, index: sourceIndex };
  
  // Abrir modal de migración
  abrirModal('modal-migrar');
}

// ========== EVENTOS TOUCH PARA MÓVIL ==========
function handleTouchStart(e) {
  if (!isMobile()) return;
  
  e.preventDefault();
  draggedElement = e.currentTarget;
  
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchCurrentX = touch.clientX;
  touchCurrentY = touch.clientY;
  
  // Timer para long press
  longPressTimer = setTimeout(() => {
    isDragging = true;
    draggedElement.classList.add('dragging');
    
    // Mostrar zonas
    const deleteZone = document.getElementById('delete-zone');
    const migrateZone = document.getElementById('migrate-zone');
    deleteZone.classList.add('active');
    migrateZone.classList.add('active');
    
    // Feedback háptico
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  }, 500); // 500ms para activar drag
}

function handleTouchMove(e) {
  if (!isMobile() || !isDragging) {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    return;
  }
  
  e.preventDefault();
  const touch = e.touches[0];
  touchCurrentX = touch.clientX;
  touchCurrentY = touch.clientY;
  
  // Actualizar posición visual del elemento
  const deltaX = touchCurrentX - touchStartX;
  const deltaY = touchCurrentY - touchStartY;
  
  draggedElement.style.transform = `translate(${deltaX}px, ${deltaY}px) rotate(5deg) scale(1.05)`;
  
  // Detectar zonas
  const deleteZone = document.getElementById('delete-zone');
  const migrateZone = document.getElementById('migrate-zone');
  
  // Zona de borrado (derecha) - más sensible
  if (touchCurrentX > window.innerWidth - 150) {
    deleteZone.style.background = 'rgba(244, 67, 54, 0.8)';
    deleteZone.style.transform = 'scale(1.1)';
    migrateZone.style.background = 'rgba(156, 39, 176, 0.3)';
    migrateZone.style.transform = 'scale(1)';
    
    // Feedback háptico
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }
  // Zona de migración (arriba)
  else if (touchCurrentY < 100) {
    migrateZone.style.background = 'rgba(156, 39, 176, 0.8)';
    migrateZone.style.transform = 'scale(1.1)';
    deleteZone.style.background = 'rgba(244, 67, 54, 0.3)';
    deleteZone.style.transform = 'scale(1)';
    
    // Feedback háptico
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }
  // Zona normal
  else {
    deleteZone.style.background = 'rgba(244, 67, 54, 0.3)';
    deleteZone.style.transform = 'scale(1)';
    migrateZone.style.background = 'rgba(156, 39, 176, 0.3)';
    migrateZone.style.transform = 'scale(1)';
  }
}

function handleTouchEnd(e) {
  if (!isMobile()) return;
  
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  
  if (!isDragging) return;
  
  e.preventDefault();
  
  // Ocultar zonas
  const deleteZone = document.getElementById('delete-zone');
  const migrateZone = document.getElementById('migrate-zone');
  deleteZone.classList.remove('active');
  migrateZone.classList.remove('active');
  
  // Resetear estilos
  draggedElement.classList.remove('dragging');
  draggedElement.style.transform = '';
  
  const sourceType = draggedElement.dataset.tipo;
  const sourceIndex = parseInt(draggedElement.dataset.index);
  
  // Determinar acción según posición final
  if (touchCurrentX > window.innerWidth - 150) {
    // Borrar
    let elementoABorrar;
    if (sourceType === 'critica') {
      elementoABorrar = appState.agenda.tareas_criticas[sourceIndex];
    } else {
      elementoABorrar = appState.agenda.tareas[sourceIndex];
    }
    showDeleteCountdown(sourceType, sourceIndex, elementoABorrar);
  } else if (touchCurrentY < 100) {
    // Migrar
    appState.ui.tareaSeleccionada = { tipo: sourceType, index: sourceIndex };
    abrirModal('modal-migrar');
  } else {
    // Verificar si se movió entre columnas
    const targetElement = document.elementFromPoint(touchCurrentX, touchCurrentY);
    const targetZone = targetElement?.closest('.drop-zone');
    
    if (targetZone) {
      const targetType = targetZone.dataset.target;
      
      if ((sourceType === 'critica' && targetType === 'tareas') || 
          (sourceType === 'tarea' && targetType === 'criticas')) {
        // Mover entre columnas
        if (sourceType === 'critica' && targetType === 'tareas') {
          const tarea = appState.agenda.tareas_criticas[sourceIndex];
          const nuevaTarea = {
            id: tarea.id,
            texto: tarea.titulo,
            fecha_fin: tarea.fecha_fin,
            completada: tarea.completada,
            estado: tarea.estado,
            persona: null,
            fecha_migrar: null
          };
          appState.agenda.tareas.push(nuevaTarea);
          appState.agenda.tareas_criticas.splice(sourceIndex, 1);
        } else if (sourceType === 'tarea' && targetType === 'criticas') {
          const tarea = appState.agenda.tareas[sourceIndex];
          const nuevaCritica = {
            id: tarea.id,
            titulo: tarea.texto,
            razon: '',
            fecha_fin: tarea.fecha_fin,
            completada: tarea.completada,
            estado: tarea.estado
          };
          appState.agenda.tareas_criticas.push(nuevaCritica);
          appState.agenda.tareas.splice(sourceIndex, 1);
        }
        
        renderizar();
        guardarJSON(true);
        mostrarAlerta('✨ Tarea movida correctamente', 'success');
        
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
      }
    }
  }
  
  // Reset
  isDragging = false;
  draggedElement = null;
  touchStartX = 0;
  touchStartY = 0;
  touchCurrentX = 0;
  touchCurrentY = 0;
}

// Hacer funciones disponibles globalmente
window.performanceOptimizer = performanceOptimizer;
window.renderizarOptimizado = renderizarOptimizado;
window.guardarOptimizado = guardarOptimizado;
window.performanceMonitor = performanceMonitor;
window.handleDragStart = handleDragStart;
window.handleDragEnd = handleDragEnd;
window.handleDragOver = handleDragOver;
window.handleDragEnter = handleDragEnter;
window.handleDragLeave = handleDragLeave;
window.handleDrop = handleDrop;
window.handleDeleteDrop = handleDeleteDrop;
window.handleMigrateDrop = handleMigrateDrop;
window.handleTouchStart = handleTouchStart;
window.handleTouchMove = handleTouchMove;
window.handleTouchEnd = handleTouchEnd;
window.showDeleteCountdown = showDeleteCountdown;
window.cancelDelete = cancelDelete;
window.confirmDelete = confirmDelete;