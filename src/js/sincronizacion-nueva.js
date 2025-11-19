// ========== SINCRONIZACIÓN EXTENDSCLASS ==========

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

async function extendsClassPull() {
  const { binId, securityKey } = getSyncConfig();

  if (!binId) {
    console.log('No hay Bin ID - la primera vez que guardes se creará automáticamente');
    return;
  }

  try {
    console.log('📥 Cargando desde ExtendsClass:', binId);

    const headers = {};
    if (securityKey) {
      headers['Security-key'] = securityKey;
    }

    const response = await fetch(`https://json.extendsclass.com/bin/${binId}`, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('Bin no encontrado - se creará uno nuevo al guardar');
        return;
      }
      throw new Error(`Error ExtendsClass (${response.status}): ${await response.text()}`);
    }

    const data = await response.json();
    console.log('📥 DATOS CARGADOS DE EXTENDSCLASS:', {
      total_tareas_cargadas: data.tareas ? data.tareas.length : 0,
      total_criticas_cargadas: data.tareas_criticas ? data.tareas_criticas.length : 0,
      fecha: data.fecha
    });

    // Procesar datos recibidos
    procesarJSON(data);
    mostrarAlerta('✅ Datos cargados desde ExtendsClass', 'success');

  } catch (err) {
    console.error('❌ Error al cargar desde ExtendsClass:', err);
    mostrarAlerta('Error al cargar: ' + err.message, 'error');
  }
}

async function guardarJSON(silent = false) {
  const { binId, apiKey, securityKey, private: isPrivate } = getSyncConfig();

  if (!apiKey) {
    if (!silent) mostrarAlerta('⚠️ Configura ExtendsClass primero', 'info');
    return false;
  }

  // Si está guardando, evitar guardados concurrentes
  if (appState.sync.isSaving) {
    console.log('🚫 Guardado cancelado - ya hay un guardado en progreso');
    return false;
  }

  appState.sync.isSaving = true;

  try {
    // Preparar datos
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

    if (!silent) {
      console.log('📤 DATOS QUE SE VAN A ENVIAR A EXTENDSCLASS:', {
        total_tareas: dataToSave.tareas.length,
        total_criticas: dataToSave.tareas_criticas.length,
        ultimas_3_tareas: dataToSave.tareas.slice(-3).map(t => ({id: t.id, texto: t.texto}))
      });
    }

    let url, method;
    const headers = {
      'Content-Type': 'application/json',
      'Api-key': apiKey
    };

    if (!binId) {
      // Crear nuevo bin
      url = 'https://json.extendsclass.com/bin';
      method = 'POST';

      if (securityKey) {
        headers['Security-key'] = securityKey;
      }
      if (isPrivate) {
        headers['Private'] = 'true';
      }
    } else {
      // Actualizar bin existente
      url = `https://json.extendsclass.com/bin/${binId}`;
      method = 'PUT';

      if (securityKey) {
        headers['Security-key'] = securityKey;
      }
    }

    const response = await fetch(url, {
      method: method,
      headers: headers,
      body: JSON.stringify(dataToSave)
    });

    if (!response.ok) {
      throw new Error(`Error ExtendsClass (${response.status}): ${await response.text()}`);
    }

    if (!binId) {
      // Guardar nuevo binId
      const result = await response.json();
      const config = JSON.parse(localStorage.getItem('extendsclass-sync-config') || '{}');
      config.binId = result.id;
      localStorage.setItem('extendsclass-sync-config', JSON.stringify(config));
      console.log('📝 Nuevo bin creado:', result.id);
    }

    if (!silent) {
      console.log('✅ GUARDADO EXITOSO EN EXTENDSCLASS');
      console.log('📤 CONFIRMACION - Tareas guardadas:', dataToSave.tareas.length);
      mostrarAlerta('💾 Guardado en ExtendsClass', 'success');
    }

    return true;

  } catch (err) {
    console.error('❌ Error al guardar en ExtendsClass:', err);
    if (!silent) mostrarAlerta('❌ Error al sincronizar: ' + err.message, 'error');
    return false;
  } finally {
    appState.sync.isSaving = false;

    // Procesar siguiente elemento de la cola si existe
    if (appState.sync.saveQueue.length > 0) {
      const next = appState.sync.saveQueue.shift();
      setTimeout(() => guardarJSON(false), 100);
    }
  }
}

// ========== CONFIGURACIÓN ==========

function cargarConfiguracionesModal() {
  // Cargar config ExtendsClass
  const extendsConfig = getSyncConfig();

  const apiKeyEl = document.getElementById('config-extendsclass-apikey');
  const securityKeyEl = document.getElementById('config-extendsclass-securitykey');
  const binIdEl = document.getElementById('config-extendsclass-binid');
  const privateEl = document.getElementById('config-extendsclass-private');

  if (apiKeyEl) apiKeyEl.value = extendsConfig.apiKey || '';
  if (securityKeyEl) securityKeyEl.value = extendsConfig.securityKey || '';
  if (binIdEl) binIdEl.value = extendsConfig.binId || '';
  if (privateEl) privateEl.checked = extendsConfig.private !== false;

  // Cargar config visual
  const visualConfig = JSON.parse(localStorage.getItem('config-visual') || '{}');
  const temaEl = document.getElementById('config-tema-select');
  const nombreEl = document.getElementById('config-nombre-input');

  if (temaEl) temaEl.value = visualConfig.tema || 'claro';
  if (nombreEl) nombreEl.value = visualConfig.nombre || 'Pablo';

  // Cargar config opciones
  cargarConfigOpciones();
}

function guardarConfigExtendsClass() {
  const apiKey = document.getElementById('config-extendsclass-apikey').value.trim();
  const securityKey = document.getElementById('config-extendsclass-securitykey').value.trim();
  const binId = document.getElementById('config-extendsclass-binid').value.trim();
  const isPrivate = document.getElementById('config-extendsclass-private').checked;

  if (!apiKey) {
    mostrarStatusExtendsClass('⚠️ API Key requerido', 'error');
    return;
  }

  // Guardar configuración
  const config = {
    private: isPrivate
  };

  if (binId) {
    config.binId = binId;
  }

  localStorage.setItem('extendsclass-sync-config', JSON.stringify(config));
  localStorage.setItem('extendsclass-api-key', apiKey);

  if (securityKey) {
    localStorage.setItem('extendsclass-security-key', securityKey);
  } else {
    localStorage.removeItem('extendsclass-security-key');
  }

  mostrarStatusExtendsClass('✅ Configuración guardada', 'success');
}

async function probarConexionExtendsClass() {
  const apiKey = document.getElementById('config-extendsclass-apikey').value.trim();
  const securityKey = document.getElementById('config-extendsclass-securitykey').value.trim();
  const binId = document.getElementById('config-extendsclass-binid').value.trim();

  if (!apiKey) {
    mostrarStatusExtendsClass('⚠️ API Key requerido', 'error');
    return;
  }

  mostrarStatusExtendsClass('🔄 Probando conexión...', 'info');

  try {
    if (binId) {
      // Probar acceso a bin existente
      const headers = {};
      if (securityKey) {
        headers['Security-key'] = securityKey;
      }

      const response = await fetch(`https://json.extendsclass.com/bin/${binId}`, {
        headers: headers
      });

      if (response.ok) {
        mostrarStatusExtendsClass('✅ Conexión exitosa', 'success');
      } else if (response.status === 401) {
        mostrarStatusExtendsClass('❌ Security Key inválido', 'error');
      } else if (response.status === 404) {
        mostrarStatusExtendsClass('⚠️ Bin no encontrado, se creará uno nuevo', 'info');
      } else {
        mostrarStatusExtendsClass(`❌ Error: ${response.status}`, 'error');
      }
    } else {
      // Crear bin de prueba para validar API key
      const testData = { test: true, timestamp: Date.now() };
      const headers = {
        'Content-Type': 'application/json',
        'Api-key': apiKey
      };

      if (securityKey) {
        headers['Security-key'] = securityKey;
      }

      const response = await fetch('https://json.extendsclass.com/bin', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(testData)
      });

      if (response.ok) {
        const result = await response.json();
        mostrarStatusExtendsClass('✅ API Key válido - conexión exitosa', 'success');

        // Eliminar bin de prueba
        try {
          const deleteHeaders = {};
          if (securityKey) {
            deleteHeaders['Security-key'] = securityKey;
          }
          await fetch(`https://json.extendsclass.com/bin/${result.id}`, {
            method: 'DELETE',
            headers: deleteHeaders
          });
        } catch (e) {
          // Ignorar errores al eliminar bin de prueba
        }
      } else if (response.status === 401) {
        mostrarStatusExtendsClass('❌ API Key inválido', 'error');
      } else {
        mostrarStatusExtendsClass(`❌ Error: ${response.status}`, 'error');
      }
    }
  } catch (error) {
    mostrarStatusExtendsClass('❌ Error de conexión', 'error');
  }
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

// Funciones vacías para historial/copia (opcional - puede reemplazarse por ExtendsClass en el futuro)
function verHistorial() {
  mostrarAlerta('📜 Historial no disponible con ExtendsClass', 'info');
}

function hacerCopia() {
  mostrarAlerta('📋 Función de copia no disponible con ExtendsClass', 'info');
}

// ========== EXPORTS GLOBALES ==========
window.extendsClassPull = extendsClassPull;
window.guardarJSON = guardarJSON;
window.getSyncConfig = getSyncConfig;
window.cargarConfiguracionesModal = cargarConfiguracionesModal;
window.guardarConfigExtendsClass = guardarConfigExtendsClass;
window.probarConexionExtendsClass = probarConexionExtendsClass;
window.mostrarStatusExtendsClass = mostrarStatusExtendsClass;
window.verHistorial = verHistorial;
window.hacerCopia = hacerCopia;