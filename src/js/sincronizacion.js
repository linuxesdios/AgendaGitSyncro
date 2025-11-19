// ========== SINCRONIZACIÓN EXTENDSCLASS JSON STORAGE ==========

function getSyncConfig() {
  const cfg = JSON.parse(localStorage.getItem('extendsclass-sync-config') || '{}');
  const apiKey = sessionStorage.getItem('extendsclass-api-key') || localStorage.getItem('extendsclass-api-key');
  const securityKey = sessionStorage.getItem('extendsclass-security-key') || localStorage.getItem('extendsclass-security-key');

  return {
    binId: cfg.binId,
    apiKey: apiKey,
    securityKey: securityKey,
    private: cfg.private || true
  };
}

function extendsClassPull() {
  const { binId, securityKey } = getSyncConfig();

  if (!binId) {
    console.log('📝 No hay Bin ID - se creará automáticamente al guardar por primera vez');
    return;
  }

  console.log('=== CARGANDO DESDE EXTENDSCLASS ===');
  console.log('Bin ID:', binId);
  console.log('Security Key:', securityKey || 'No especificado');
  console.log('URL completa:', `https://json.extendsclass.com/bin/${binId}`);

  const request = new XMLHttpRequest();
  request.open('GET', `https://json.extendsclass.com/bin/${binId}`, true);
  if (securityKey) {
    request.setRequestHeader('Security-key', securityKey);
    console.log('Security-key header agregado');
  }
  
  request.onreadystatechange = () => {
    console.log(`CARGA - ReadyState: ${request.readyState}, Status: ${request.status}`);
    
    if (request.readyState === 4) {
      console.log('CARGA - Response Headers:', request.getAllResponseHeaders());
      console.log('CARGA - Status Text:', request.statusText);
      console.log('CARGA - Response Text (primeros 500 chars):', request.responseText.substring(0, 500));
      
      if (request.status === 200) {
        try {
          const data = JSON.parse(request.responseText);
          console.log('CARGA - JSON parseado exitosamente:', data);
          console.log('CARGA - Estructura de datos:', {
            tiene_tareas: !!data.tareas,
            tiene_criticas: !!data.tareas_criticas,
            tiene_notas: !!data.notas,
            tiene_citas: !!data.citas,
            fecha: data.fecha
          });
          
          procesarJSON(data);
          mostrarAlerta('✅ Datos cargados desde ExtendsClass', 'success');
        } catch (e) {
          console.error('CARGA - Error al parsear JSON:', e);
          console.log('CARGA - Texto completo de respuesta:', request.responseText);
          mostrarAlerta('Error al procesar datos: ' + e.message, 'error');
        }
      } else if (request.status === 404) {
        console.log('CARGA - Bin no encontrado, limpiando configuración');
        mostrarAlerta('Bin no encontrado - creando nuevo...', 'info');
        const config = JSON.parse(localStorage.getItem('extendsclass-sync-config') || '{}');
        delete config.binId;
        localStorage.setItem('extendsclass-sync-config', JSON.stringify(config));
      } else {
        console.error(`CARGA - Error HTTP ${request.status}: ${request.statusText}`);
        mostrarAlerta(`Error al cargar: ${request.status}`, 'error');
      }
    }
  };
  
  console.log('CARGA - Enviando request GET...');
  request.send();
}

function guardarJSON(silent = false) {
  const { binId, apiKey, securityKey, private: isPrivate } = getSyncConfig();

  if (!apiKey) {
    if (!silent) mostrarAlerta('⚠️ Configura tu API Key de ExtendsClass primero', 'info');
    return false;
  }

  if (appState.sync.isSaving) {
    console.log('🚫 Guardado cancelado - ya hay un guardado en progreso');
    return false;
  }

  console.log('=== GUARDANDO EN EXTENDSCLASS ===');
  console.log('Bin ID existente:', binId || 'Ninguno (crear nuevo)');
  console.log('API Key:', apiKey);
  console.log('Security Key:', securityKey || 'No especificado');
  console.log('Es privado:', isPrivate);

  appState.sync.isSaving = true;

  const dataToSave = {
    fecha: appState.agenda.fecha,
    dia_semana: appState.agenda.dia_semana,
    tareas_criticas: appState.agenda.tareas_criticas.map(t => ({
      id: t.id,
      titulo: t.titulo || t.texto,
      razon: t.razon || '',
      fecha_fin: t.fecha_fin || '',
      completada: t.completada,
      estado: t.estado
    })),
    tareas: appState.agenda.tareas.map(t => ({
      id: t.id,
      texto: t.texto,
      fecha_fin: t.fecha_fin || '',
      completada: t.completada,
      estado: t.estado,
      persona: t.persona || null,
      fecha_migrar: t.fecha_migrar || null
    })),
    notas: appState.agenda.notas,
    citas: appState.agenda.citas || []
  };

  console.log('GUARDADO - Datos a enviar:', {
    total_tareas: dataToSave.tareas.length,
    total_criticas: dataToSave.tareas_criticas.length,
    tiene_notas: !!dataToSave.notas,
    total_citas: dataToSave.citas.length,
    tamaño_json: JSON.stringify(dataToSave).length + ' bytes'
  });

  const request = new XMLHttpRequest();
  const url = binId ? `https://json.extendsclass.com/bin/${binId}` : 'https://json.extendsclass.com/bin';
  const method = binId ? 'PUT' : 'POST';
  
  console.log('GUARDADO - Método:', method);
  console.log('GUARDADO - URL:', url);
  
  request.open(method, url, true);
  request.setRequestHeader('Api-key', apiKey);
  console.log('GUARDADO - Header Api-key agregado');
  
  if (securityKey) {
    request.setRequestHeader('Security-key', securityKey);
    console.log('GUARDADO - Header Security-key agregado');
  }
  if (!binId && isPrivate) {
    request.setRequestHeader('Private', 'true');
    console.log('GUARDADO - Header Private agregado');
  }
  
  request.onreadystatechange = () => {
    console.log(`GUARDADO - ReadyState: ${request.readyState}, Status: ${request.status}`);
    
    if (request.readyState === 4) {
      console.log('GUARDADO - Response Headers:', request.getAllResponseHeaders());
      console.log('GUARDADO - Status Text:', request.statusText);
      console.log('GUARDADO - Response Text:', request.responseText);
      
      appState.sync.isSaving = false;
      
      if (request.status === 201 || request.status === 200) {
        console.log('GUARDADO - Éxito! Status:', request.status);
        
        if (!binId && request.status === 201) {
          try {
            const result = JSON.parse(request.responseText);
            console.log('GUARDADO - Nuevo bin creado:', result);
            const config = JSON.parse(localStorage.getItem('extendsclass-sync-config') || '{}');
            config.binId = result.id;
            localStorage.setItem('extendsclass-sync-config', JSON.stringify(config));
            console.log('GUARDADO - Bin ID guardado en localStorage:', result.id);
          } catch (e) {
            console.error('GUARDADO - Error al parsear respuesta de creación:', e);
          }
        }
        
        if (!silent) {
          console.log('✅ GUARDADO EXITOSO EN EXTENDSCLASS');
          mostrarAlerta('💾 Guardado en ExtendsClass', 'success');
        }
      } else {
        console.error(`GUARDADO - Error HTTP ${request.status}: ${request.statusText}`);
        if (!silent) mostrarAlerta(`❌ Error al guardar: ${request.status}`, 'error');
      }
    }
  };
  
  const jsonString = JSON.stringify(dataToSave);
  console.log('GUARDADO - Enviando datos (primeros 200 chars):', jsonString.substring(0, 200));
  request.send(jsonString);
  return true;
}

// ========== CONFIGURACIÓN ==========

function cargarConfiguracionesModal() {
  // Cargar config ExtendsClass
  const config = getSyncConfig();

  const elements = {
    apikey: document.getElementById('config-extendsclass-apikey'),
    security: document.getElementById('config-extendsclass-security'),
    binid: document.getElementById('config-extendsclass-binid'),
    private: document.getElementById('config-extendsclass-private')
  };

  if (elements.apikey) elements.apikey.value = config.apiKey || '';
  if (elements.security) elements.security.value = config.securityKey || '';
  if (elements.binid) elements.binid.value = config.binId || '';
  if (elements.private) elements.private.checked = config.private !== false;

  // Cargar config visual
  const visualConfig = JSON.parse(localStorage.getItem('config-visual') || '{}');
  const temaEl = document.getElementById('config-tema-select');
  const nombreEl = document.getElementById('config-nombre-input');

  if (temaEl) temaEl.value = visualConfig.tema || 'claro';
  if (nombreEl) nombreEl.value = visualConfig.nombre || 'Pablo';

  cargarConfigOpciones();
}

function guardarConfigExtendsClass() {
  const apiKey = document.getElementById('config-extendsclass-apikey')?.value.trim();
  const securityKey = document.getElementById('config-extendsclass-security')?.value.trim();
  const binId = document.getElementById('config-extendsclass-binid')?.value.trim();
  const isPrivate = document.getElementById('config-extendsclass-private')?.checked;

  if (!apiKey) {
    mostrarStatusExtendsClass('⚠️ API Key requerido', 'error');
    return;
  }

  // Guardar configuración
  const config = { private: isPrivate };
  if (binId) config.binId = binId;

  localStorage.setItem('extendsclass-sync-config', JSON.stringify(config));
  localStorage.setItem('extendsclass-api-key', apiKey);
  
  if (securityKey) {
    localStorage.setItem('extendsclass-security-key', securityKey);
  } else {
    localStorage.removeItem('extendsclass-security-key');
  }

  mostrarStatusExtendsClass('✅ Configuración guardada', 'success');
}

function probarConexionExtendsClass() {
  const apiKey = document.getElementById('config-extendsclass-apikey')?.value.trim();
  const securityKey = document.getElementById('config-extendsclass-security')?.value.trim();

  if (!apiKey) {
    mostrarStatusExtendsClass('⚠️ API Key requerido', 'error');
    return;
  }

  console.log('=== INICIANDO PRUEBA EXTENDSCLASS ===');
  console.log('API Key:', apiKey);
  console.log('Security Key:', securityKey || 'No especificado');
  
  mostrarStatusExtendsClass('🔄 Probando ExtendsClass...', 'info');

  // PRUEBA 1: XMLHttpRequest con headers mínimos
  console.log('--- PRUEBA 1: XMLHttpRequest básico ---');
  const request1 = new XMLHttpRequest();
  request1.open('POST', 'https://json.extendsclass.com/bin', true);
  request1.setRequestHeader('Api-key', apiKey);
  
  request1.onreadystatechange = () => {
    console.log(`PRUEBA 1 - ReadyState: ${request1.readyState}, Status: ${request1.status}`);
    if (request1.readyState === 4) {
      console.log('PRUEBA 1 - Response Headers:', request1.getAllResponseHeaders());
      console.log('PRUEBA 1 - Response Text:', request1.responseText);
      console.log('PRUEBA 1 - Status Text:', request1.statusText);
      
      if (request1.status === 201 || request1.status === 200) {
        try {
          const result = JSON.parse(request1.responseText);
          console.log('PRUEBA 1 - Parsed JSON:', result);
          mostrarStatusExtendsClass('✅ PRUEBA 1 OK: ' + result.id, 'success');
          return;
        } catch (e) {
          console.error('PRUEBA 1 - JSON Parse Error:', e);
        }
      }
      
      // PRUEBA 2: Con Content-Type
      console.log('--- PRUEBA 2: Con Content-Type ---');
      const request2 = new XMLHttpRequest();
      request2.open('POST', 'https://json.extendsclass.com/bin', true);
      request2.setRequestHeader('Api-key', apiKey);
      request2.setRequestHeader('Content-Type', 'application/json');
      
      request2.onreadystatechange = () => {
        console.log(`PRUEBA 2 - ReadyState: ${request2.readyState}, Status: ${request2.status}`);
        if (request2.readyState === 4) {
          console.log('PRUEBA 2 - Response:', request2.responseText);
          
          if (request2.status === 201 || request2.status === 200) {
            try {
              const result = JSON.parse(request2.responseText);
              console.log('PRUEBA 2 - Success:', result);
              mostrarStatusExtendsClass('✅ PRUEBA 2 OK: ' + result.id, 'success');
              return;
            } catch (e) {
              console.error('PRUEBA 2 - Parse Error:', e);
            }
          }
          
          // PRUEBA 3: Fetch con CORS
          console.log('--- PRUEBA 3: Fetch con CORS ---');
          fetch('https://json.extendsclass.com/bin', {
            method: 'POST',
            mode: 'cors',
            headers: {
              'Api-key': apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ test: 'fetch', timestamp: Date.now() })
          })
          .then(response => {
            console.log('PRUEBA 3 - Status:', response.status);
            console.log('PRUEBA 3 - Headers:', [...response.headers.entries()]);
            return response.text();
          })
          .then(text => {
            console.log('PRUEBA 3 - Response Text:', text);
            try {
              const json = JSON.parse(text);
              console.log('PRUEBA 3 - Parsed:', json);
              mostrarStatusExtendsClass('✅ PRUEBA 3 OK: ' + json.id, 'success');
            } catch (e) {
              console.error('PRUEBA 3 - Parse Error:', e);
              
              // PRUEBA 4: Sin JSON, solo texto
              console.log('--- PRUEBA 4: Datos simples ---');
              const request4 = new XMLHttpRequest();
              request4.open('POST', 'https://json.extendsclass.com/bin', true);
              request4.setRequestHeader('Api-key', apiKey);
              
              request4.onreadystatechange = () => {
                if (request4.readyState === 4) {
                  console.log('PRUEBA 4 - Status:', request4.status);
                  console.log('PRUEBA 4 - Response:', request4.responseText);
                  mostrarStatusExtendsClass(`Todas las pruebas completadas. Último status: ${request4.status}`, 'info');
                }
              };
              
              request4.send('test');
            }
          })
          .catch(error => {
            console.error('PRUEBA 3 - Fetch Error:', error);
            mostrarStatusExtendsClass('❌ Fetch falló: ' + error.message, 'error');
          });
        }
      };
      
      request2.send(JSON.stringify({ test: 'prueba2', timestamp: Date.now() }));
    }
  };
  
  request1.send(JSON.stringify({ test: 'prueba1', timestamp: Date.now() }));
}

function mostrarStatusExtendsClass(mensaje, tipo) {
  const status = document.getElementById('extendsclass-status');
  if (!status) return;

  status.textContent = mensaje;
  status.style.display = 'block';

  if (tipo === 'success') {
    status.style.background = '#d4edda';
    status.style.color = '#155724';
  } else if (tipo === 'error') {
    status.style.background = '#f8d7da';
    status.style.color = '#721c24';
  } else {
    status.style.background = '#d1ecf1';
    status.style.color = '#0c5460';
  }

  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

// Funciones vacías para historial/copia
function verHistorial() {
  mostrarAlerta('📜 Historial no disponible con ExtendsClass', 'info');
}

function hacerCopia() {
  mostrarAlerta('📋 Función de copia no disponible con ExtendsClass', 'info');
}

// ========== FUNCIONES ADICIONALES ==========

// Función para procesar JSON cargado
function procesarJSON(data) {
  if (!data) return;
  
  // Actualizar estado global
  appState.agenda.fecha = data.fecha || new Date().toISOString().slice(0, 10);
  appState.agenda.dia_semana = data.dia_semana || '';
  appState.agenda.tareas_criticas = data.tareas_criticas || [];
  appState.agenda.tareas = data.tareas || [];
  appState.agenda.notas = data.notas || '';
  appState.agenda.citas = data.citas || [];
  
  // Renderizar la interfaz
  if (typeof renderizar === 'function') {
    renderizar();
  }
}

// Función para configuración de opciones
function cargarConfigOpciones() {
  const config = JSON.parse(localStorage.getItem('config-opciones') || '{}');
  
  const elements = {
    forzarFecha: document.getElementById('config-forzar-fecha'),
    sinTactil: document.getElementById('config-sin-tactil'),
    mostrarTodo: document.getElementById('config-mostrar-todo'),
    botonesBorrar: document.getElementById('config-botones-borrar')
  };
  
  if (elements.forzarFecha) elements.forzarFecha.checked = config.forzarFecha || false;
  if (elements.sinTactil) elements.sinTactil.checked = config.sinTactil || false;
  if (elements.mostrarTodo) elements.mostrarTodo.checked = config.mostrarTodo || false;
  if (elements.botonesBorrar) elements.botonesBorrar.checked = config.botonesBorrar || false;
}

function guardarConfigOpciones() {
  const config = {
    forzarFecha: document.getElementById('config-forzar-fecha')?.checked || false,
    sinTactil: document.getElementById('config-sin-tactil')?.checked || false,
    mostrarTodo: document.getElementById('config-mostrar-todo')?.checked || false,
    botonesBorrar: document.getElementById('config-botones-borrar')?.checked || false
  };
  
  localStorage.setItem('config-opciones', JSON.stringify(config));
}

// Funciones para configuración visual
function cargarConfigVisual() {
  const config = JSON.parse(localStorage.getItem('config-visual') || '{}');
  
  if (config.tema === 'oscuro') {
    document.body.classList.add('tema-oscuro');
  }
  
  if (config.nombre) {
    const titulo = document.getElementById('titulo-agenda');
    if (titulo) {
      titulo.textContent = `🧠 Agenda de ${config.nombre} 🚆`;
    }
  }
}

function guardarConfigVisualPanel() {
  const tema = document.getElementById('config-tema-select')?.value || 'claro';
  const nombre = document.getElementById('config-nombre-input')?.value || 'Pablo';
  const frases = document.getElementById('config-frases')?.value || '';
  
  const config = { tema, nombre, frases };
  localStorage.setItem('config-visual', JSON.stringify(config));
  
  // Aplicar cambios inmediatamente
  document.body.classList.toggle('tema-oscuro', tema === 'oscuro');
  
  const titulo = document.getElementById('titulo-agenda');
  if (titulo) {
    titulo.textContent = `🧠 Agenda de ${nombre} 🚆`;
  }
  
  mostrarAlerta('✅ Configuración visual aplicada', 'success');
}

// Funciones para modales
function switchTab(tabName) {
  // Ocultar todas las pestañas
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.config-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Mostrar pestaña seleccionada
  document.getElementById(`tab-${tabName}`)?.classList.add('active');
  event.target.classList.add('active');
}

function toggleConfigFloating() {
  const modal = document.getElementById('modal-config');
  if (modal) {
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
    if (modal.style.display === 'block') {
      cargarConfiguracionesModal();
    }
  }
}

function cerrarModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
}

// Funciones placeholder para compatibilidad
function abrirHistoricoTareas() {
  mostrarAlerta('📊 Función de histórico no disponible', 'info');
}

function abrirGraficos() {
  mostrarAlerta('📈 Función de gráficos no disponible', 'info');
}

function crearBackupManual() {
  mostrarAlerta('💾 Función de backup no disponible', 'info');
}

function restaurarBackup() {
  mostrarAlerta('🔄 Función de restaurar no disponible', 'info');
}

// Función para cambiar frase motivacional
function cambiarFraseMotivacional() {
  const frases = [
    "El éxito es la suma de pequeños esfuerzos repetidos día tras día",
    "Cada día es una nueva oportunidad para mejorar",
    "La disciplina es el puente entre metas y logros",
    "No esperes el momento perfecto, toma el momento y hazlo perfecto",
    "El progreso, no la perfección"
  ];
  
  const fraseEl = document.getElementById('frase-motivacional');
  if (fraseEl) {
    const fraseActual = fraseEl.textContent.replace(/"/g, '');
    let nuevaFrase;
    do {
      nuevaFrase = frases[Math.floor(Math.random() * frases.length)];
    } while (nuevaFrase === fraseActual && frases.length > 1);
    
    fraseEl.textContent = `"${nuevaFrase}"`;
  }
}

// ========== EXPORTS GLOBALES ==========
window.extendsClassPull = extendsClassPull;
window.guardarJSON = guardarJSON;
window.getSyncConfig = getSyncConfig;
window.procesarJSON = procesarJSON;
window.cargarConfiguracionesModal = cargarConfiguracionesModal;
window.cargarConfigOpciones = cargarConfigOpciones;
window.guardarConfigOpciones = guardarConfigOpciones;
window.cargarConfigVisual = cargarConfigVisual;
window.guardarConfigVisualPanel = guardarConfigVisualPanel;
window.guardarConfigExtendsClass = guardarConfigExtendsClass;
window.probarConexionExtendsClass = probarConexionExtendsClass;
window.mostrarStatusExtendsClass = mostrarStatusExtendsClass;
window.switchTab = switchTab;
window.toggleConfigFloating = toggleConfigFloating;
window.cerrarModal = cerrarModal;
window.verHistorial = verHistorial;
window.hacerCopia = hacerCopia;
window.abrirHistoricoTareas = abrirHistoricoTareas;
window.abrirGraficos = abrirGraficos;
window.crearBackupManual = crearBackupManual;
window.restaurarBackup = restaurarBackup;
window.cambiarFraseMotivacional = cambiarFraseMotivacional;