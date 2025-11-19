// ========== SINCRONIZACIÓN JSONBIN.IO ==========

function getJsonBinConfig() {
  const cfg = JSON.parse(localStorage.getItem('jsonbin-sync-config') || '{}');
  const token = sessionStorage.getItem('jsonbin-sync-token') || localStorage.getItem('jsonbin-sync-token');
  return {
    binId: cfg.binId,
    token: token,
    binName: cfg.binName || 'agenda-data'
  };
}

async function jsonbinPull() {
  const { binId, token } = getJsonBinConfig();

  if (!token) {
    mostrarAlerta('Configura tu token de JSONBin primero', 'info');
    return;
  }

  if (!binId) {
    // Crear nuevo bin si no existe
    console.log('📝 Creando nuevo bin en JSONBin...');
    const jsonInicial = {
      fecha: new Date().toISOString().slice(0, 10),
      dia_semana: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date().getDay()],
      tareas_criticas: [],
      tareas: [],
      notas: '',
      citas: []
    };

    await jsonbinPush(jsonInicial, true); // true = crear nuevo bin
    return;
  }

  try {
    console.log('📥 Cargando desde JSONBin:', binId);

    const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      method: 'GET',
      headers: {
        'X-Master-Key': token,
        'X-Bin-Meta': false // Solo queremos los datos, no metadata
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        mostrarAlerta('Bin no encontrado - creando nuevo...', 'info');
        await jsonbinPull(); // Recursivo para crear nuevo
        return;
      }
      throw new Error(`Error JSONBin (${response.status}): ${await response.text()}`);
    }

    const data = await response.json();
    console.log('📥 DATOS CARGADOS DE JSONBIN:', {
      total_tareas_cargadas: data.tareas ? data.tareas.length : 0,
      total_criticas_cargadas: data.tareas_criticas ? data.tareas_criticas.length : 0,
      fecha: data.fecha
    });

    // Procesar datos recibidos
    procesarJSON(data);
    mostrarAlerta('✅ Datos cargados desde JSONBin', 'success');

  } catch (err) {
    console.error('❌ Error al cargar desde JSONBin:', err);
    mostrarAlerta('Error al cargar: ' + err.message, 'error');
  }
}

async function jsonbinPush(jsonData = null, crearNuevo = false) {
  const { binId, token, binName } = getJsonBinConfig();

  if (!token) {
    mostrarAlerta('⚠️ Configura tu token JSONBin primero', 'info');
    return;
  }

  // Si está guardando, evitar guardados concurrentes
  if (appState.sync.isSaving) {
    console.log('🚫 Guardado cancelado - ya hay un guardado en progreso');
    return;
  }

  appState.sync.isSaving = true;

  try {
    // Preparar datos
    const dataToSave = jsonData || {
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

    console.log('📤 DATOS QUE SE VAN A ENVIAR A JSONBIN:', {
      total_tareas: dataToSave.tareas.length,
      total_criticas: dataToSave.tareas_criticas.length,
      ultimas_3_tareas: dataToSave.tareas.slice(-3).map(t => ({id: t.id, texto: t.texto}))
    });

    let url, method;

    if (crearNuevo || !binId) {
      // Crear nuevo bin
      url = 'https://api.jsonbin.io/v3/b';
      method = 'POST';
    } else {
      // Actualizar bin existente
      url = `https://api.jsonbin.io/v3/b/${binId}`;
      method = 'PUT';
    }

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': token,
        'X-Bin-Name': binName,
        'X-Bin-Private': true
      },
      body: JSON.stringify(dataToSave)
    });

    if (!response.ok) {
      throw new Error(`Error JSONBin (${response.status}): ${await response.text()}`);
    }

    const result = await response.json();

    if (crearNuevo || !binId) {
      // Guardar nuevo binId
      const config = JSON.parse(localStorage.getItem('jsonbin-sync-config') || '{}');
      config.binId = result.metadata.id;
      localStorage.setItem('jsonbin-sync-config', JSON.stringify(config));
      console.log('📝 Nuevo bin creado:', result.metadata.id);
    }

    console.log('✅ GUARDADO EXITOSO EN JSONBIN');
    console.log('📤 BIN ID:', result.metadata.id);
    console.log('📤 CONFIRMACION - Tareas guardadas:', dataToSave.tareas.length);

    mostrarAlerta('💾 Guardado en JSONBin', 'success');

  } catch (err) {
    console.error('❌ Error al guardar en JSONBin:', err);
    mostrarAlerta('❌ Error al sincronizar: ' + err.message, 'error');
  } finally {
    appState.sync.isSaving = false;

    // Procesar siguiente elemento de la cola si existe
    if (appState.sync.saveQueue.length > 0) {
      const next = appState.sync.saveQueue.shift();
      setTimeout(() => jsonbinPush(null, false), 100);
    }
  }
}

// Función de compatibilidad para mantener la interfaz existente
window.guardarJSON = async function(silent = false) {
  await jsonbinPush();
};

// Exportar funciones
window.jsonbinPull = jsonbinPull;
window.jsonbinPush = jsonbinPush;
window.getJsonBinConfig = getJsonBinConfig;