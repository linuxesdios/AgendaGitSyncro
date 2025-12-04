// ========== SUPABASE SYNC ==========
// Sistema de sincronizaci�n en la nube sin l�mites de peticiones

// ========== CONFIGURACI�N GLOBAL ==========
window.supabaseClient = null;
window.currentSyncMethod = localStorage.getItem('syncMethod') || 'supabase';
window.supabaseRealtimeChannel = null;

// ========== CONFIGURACI�N DE SUPABASE ==========
function getSupabaseConfig() {
  return {
    url: localStorage.getItem('supabase_url') || '',
    key: localStorage.getItem('supabase_key') || '',
    serviceKey: localStorage.getItem('supabase_service_key') || ''
  };
}

function saveSupabaseConfig(url, key, serviceKey = '') {
  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_key', key);
  if (serviceKey) {
    localStorage.setItem('supabase_service_key', serviceKey);
  }

}

// ========== INICIALIZACI�N DE SUPABASE ==========
async function initSupabase() {
  // Si ya est� inicializado, no reinicializar
  if (window.supabaseClient) {
    return true;
  }

  const config = getSupabaseConfig();

  if (!config.url || !config.key) {
    console.warn('?? Configuraci�n de Supabase incompleta');
    return false;
  }

  try {
    // Usar la librer�a Supabase cargada desde CDN
    const { createClient } = supabase;
    window.supabaseClient = createClient(config.url, config.key);

    console.log('? Supabase inicializado correctamente (nueva instancia)');
    return true;
  } catch (error) {
    console.error('? Error inicializando Supabase:', error);
    return false;
  }
}

// ========== FUNCIONES DE INTERFAZ ==========
function guardarConfigSupabase() {
  const urlElement = document.getElementById('supabase-url');
  const keyElement = document.getElementById('supabase-key');
  const serviceKeyElement = document.getElementById('supabase-service-key');

  if (!urlElement || !keyElement) {
    alert('?? Error: Formulario de Supabase no encontrado');
    return;
  }

  const url = urlElement.value;
  const key = keyElement.value;
  const serviceKey = serviceKeyElement ? serviceKeyElement.value : '';

  if (!url || !key) {
    alert('?? URL y Anon Key son obligatorios');
    return;
  }

  saveSupabaseConfig(url, key, serviceKey);

  showSupabaseStatus('? Configuraci�n guardada correctamente', 'success');
}

// ========== FUNCIONES DE INTERFAZ AUXILIARES ==========
function toggleSupabaseKeyVisibility() {
  const keyInput = document.getElementById('supabase-key');
  const toggleButton = document.getElementById('toggle-supabase-key');

  if (!keyInput || !toggleButton) return;

  if (keyInput.type === 'password') {
    keyInput.type = 'text';
    toggleButton.textContent = '??';
    toggleButton.title = 'Ocultar contrase�a';

    setTimeout(() => {
      if (keyInput.type === 'text') {
        keyInput.type = 'password';
        toggleButton.textContent = '???';
        toggleButton.title = 'Mostrar contrase�a';
      }
    }, 3000);
  } else {
    keyInput.type = 'password';
    toggleButton.textContent = '???';
    toggleButton.title = 'Mostrar contrase�a';
  }
}

async function probarConexionSupabase() {
  showSupabaseStatus('?? Probando conexi�n...', 'info');

  const connected = await initSupabase();

  if (connected) {
    try {
      // Probar conexi�n b�sica primero
      const { data, error } = await window.supabaseClient
        .from('agenda_data')
        .select('*')
        .limit(1);

      if (error) {
        // Si error es porque la tabla no existe (primera vez)
        if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
          showSupabaseStatus('?? Primera vez detectada - Las tablas no existen todav�a', 'info');

          // Preguntar autom�ticamente si quiere crear las tablas
          const shouldCreate = confirm(
            '?? �Primera vez usando Supabase!\n\n' +
            'Las tablas de la base de datos no existen todav�a.\n' +
            '�Quieres que las cree autom�ticamente?\n\n' +
            '? S� - Crear tablas y configurar todo\n' +
            '? No - Solo verificar conexi�n'
          );

          if (shouldCreate) {
            showSupabaseStatus('??? Creando tablas autom�ticamente...', 'info');
            await crearTablasSupabase();
          } else {
            showSupabaseStatus('? Conexi�n b�sica exitosa - Click "??? Crear Tablas" cuando est�s listo', 'success');
          }
          return true; // Conexi�n exitosa aunque las tablas no existan
        } else {
          throw error;
        }
      } else {
        showSupabaseStatus('? Conexi�n exitosa - Las tablas ya existen y funcionan', 'success');
        return true; // Conexi�n exitosa
      }
    } catch (error) {
      console.error('? Error probando conexi�n:', error);
      showSupabaseStatus('? Error de conexi�n: ' + error.message, 'error');
      return false; // Error de conexi�n
    }
  } else {
    showSupabaseStatus('? No se pudo inicializar Supabase - Verifica URL y Anon Key', 'error');
    return false; // No se pudo inicializar
  }
}

async function crearTablasSupabase() {
  const connected = await initSupabase();
  if (!connected) {
    showSupabaseStatus('? Primero configura Supabase', 'error');
    return;
  }

  showSupabaseStatus('??? Creando estructura de datos...', 'info');

  try {
    // Approach m�s simple: crear registros directamente
    // Supabase crear� la tabla autom�ticamente con el primer insert si usamos el SQL editor

    // Datos iniciales para todas las colecciones
    const initialData = [
      {
        id: 'tareas',
        data: {
          tareas_criticas: [],
          tareas: [],
          listasPersonalizadas: []
        }
      },
      {
        id: 'citas',
        data: { citas: [] }
      },
      {
        id: 'config',
        data: {
          visual: {},
          funcionales: {},
          opciones: {}
        }
      },
      {
        id: 'notas',
        data: { notas: '' }
      },
      {
        id: 'sentimientos',
        data: { sentimientos: '' }
      },
      {
        id: 'contrasenas',
        data: { lista: [] }
      },
      {
        id: 'historial_eliminados',
        data: { items: [] }
      },
      {
        id: 'historial_tareas',
        data: { items: [] }
      },
      {
        id: 'personas',
        data: { lista: [] }
      },
      {
        id: 'etiquetas',
        data: {
          tareas: [
            { nombre: 'trabajo', simbolo: '??', color: '#3498db' },
            { nombre: 'ocio', simbolo: '??', color: '#9b59b6' },
            { nombre: 'm�dicos', simbolo: '??', color: '#e74c3c' }
          ],
          citas: [
            { nombre: 'trabajo', simbolo: '??', color: '#3498db' },
            { nombre: 'ocio', simbolo: '??', color: '#9b59b6' },
            { nombre: 'm�dicos', simbolo: '??', color: '#e74c3c' }
          ]
        }
      },
      {
        id: 'log',
        data: { acciones: [] }
      },
      {
        id: 'salvados',
        data: {}
      }
    ];

    // Insertar cada registro
    for (const record of initialData) {
      try {
        const { error } = await window.supabaseClient
          .from('agenda_data')
          .upsert(record, { onConflict: 'id' });

        if (error && !error.message.includes('does not exist')) {
          console.warn(`?? Error insertando ${record.id}:`, error);
        }
      } catch (itemError) {
        console.warn(`?? Error con ${record.id}:`, itemError);
      }
    }

    // Verificar que al menos uno se insert� correctamente
    const { data: testData, error: testError } = await window.supabaseClient
      .from('agenda_data')
      .select('id')
      .limit(1);

    if (testError) {
      // Si a�n hay error, mostrar instrucciones para crear tabla manualmente
      showSupabaseStatus(
        '?? No se puede crear autom�ticamente. Crea la tabla manualmente: Ve al SQL Editor de Supabase y ejecuta: CREATE TABLE agenda_data (id text PRIMARY KEY, data jsonb, last_updated timestamp DEFAULT now());',
        'error'
      );

      // Tambi�n mostrar el popup con instrucciones
      alert(
        '??? INSTRUCCIONES PARA CREAR TABLA MANUALMENTE:\n\n' +
        '1. Ve a tu dashboard de Supabase\n' +
        '2. Click en "SQL Editor" en el men� izquierdo\n' +
        '3. Copia y pega este comando:\n\n' +
        'CREATE TABLE agenda_data (\n' +
        '  id text PRIMARY KEY,\n' +
        '  data jsonb,\n' +
        '  last_updated timestamp DEFAULT now()\n' +
        ');\n\n' +
        '4. Click "Run"\n' +
        '5. Vuelve aqu� y prueba la conexi�n de nuevo'
      );
    } else {
      showSupabaseStatus('? �Estructura creada! Supabase est� listo para usar', 'success');
    }
  } catch (error) {
    console.error('? Error creando estructura:', error);

    // Instrucciones claras para el usuario
    showSupabaseStatus('?? Crear manualmente - Ver instrucciones en popup', 'error');

    alert(
      '??? CREAR TABLA MANUALMENTE:\n\n' +
      '1. Ve a supabase.com ? tu proyecto\n' +
      '2. Click "SQL Editor" (men� izquierdo)\n' +
      '3. Nueva query y pega:\n\n' +
      'CREATE TABLE agenda_data (\n' +
      '  id text PRIMARY KEY,\n' +
      '  data jsonb,\n' +
      '  last_updated timestamp DEFAULT now()\n' +
      ');\n\n' +
      '4. Click "Run"\n' +
      '5. Vuelve aqu� y haz click "Probar" de nuevo'
    );
  }
}

// ========== FUNCIONES DE SINCRONIZACI�N ==========

// Funci�n para sincronizar datos desde la nube
async function supabasePull() {
  if (window.currentSyncMethod !== 'supabase') return;

  const connected = await initSupabase();
  if (!connected) {
    console.warn('?? Supabase no est� configurado');
    return;
  }

  try {

    const collections = [
      'tareas', 'citas', 'config', 'notas', 'sentimientos',
      'contrasenas', 'historial_eliminados', 'historial_tareas',
      'personas', 'etiquetas', 'log', 'salvados'
    ];

    const promises = collections.map(async (collection) => {
      const { data, error } = await window.supabaseClient
        .from('agenda_data')
        .select('data')
        .eq('id', collection)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn(`?? Error cargando ${collection}:`, error);
        return { collection, data: null };
      }

      return { collection, data: data?.data || {} };
    });

    const results = await Promise.all(promises);

    // Aplicar datos a las variables globales
    results.forEach(({ collection, data }) => {
      switch (collection) {
        case 'tareas':

          // Inicializar tareasData si no existe
          if (!window.tareasData) window.tareasData = {};

          // Actualizar tareasData PRIMERO
          window.tareasData = {
            ...window.tareasData,
            tareas_criticas: data.tareas_criticas || [],
            tareas: data.tareas || [],
            listasPersonalizadas: data.listasPersonalizadas || []
          };

          // Luego actualizar appState
          if (!window.appState.agenda) window.appState.agenda = {};
          window.appState.agenda.tareas_criticas = data.tareas_criticas || [];
          window.appState.agenda.tareas = data.tareas || [];
          window.appState.agenda.listasPersonalizadas = data.listasPersonalizadas || [];


          if (data.listasPersonalizadas) {
            data.listasPersonalizadas.forEach((lista, idx) => {

            });
          }
          break;
        case 'citas':
          if (data.citas) {
            if (!window.appState.agenda) window.appState.agenda = {};
            window.appState.agenda.citas = data.citas;
          }
          break;
        case 'config':
          if (data.visual) {
            window.configVisual = { ...window.configVisual, ...data.visual };
            // Actualizar t�tulo de la pesta�a
            if (data.visual.titulo) {
              document.title = data.visual.titulo;
            }
          }
          if (data.funcionales) {
            window.configFuncionales = data.funcionales;
          }
          if (data.opciones) window.configOpciones = data.opciones;
          break;
        case 'notas':
          if (data.notas !== undefined) window.appState.notas = data.notas;
          break;
        case 'sentimientos':
          if (data.sentimientos !== undefined) window.appState.sentimientos = data.sentimientos;
          break;
        case 'contrasenas':
          if (data.lista) window.appState.contrasenas = data.lista;
          break;
        case 'historial_eliminados':
          if (data.items) window.historialEliminados = data.items;
          break;
        case 'historial_tareas':
          if (data.items) window.historialTareas = data.items;
          break;
        case 'personas':
          if (data.lista) {
            window.personasAsignadas = data.lista;
            if (!window.tareasData) window.tareasData = {};
            window.tareasData.personas = [...data.lista];
          }
          break;
        case 'etiquetas':
          window.etiquetasData = data;
          if (!window.tareasData) window.tareasData = {};
          if (!window.tareasData.etiquetas) window.tareasData.etiquetas = {};
          window.tareasData.etiquetas = data;
          break;
        case 'log':
          if (data.acciones) {
            window.logAcciones = data.acciones;
          }
          break;
        case 'salvados':
          window.salvadosData = data;
          break;
      }
    });

    if (typeof window.sincronizarEstructurasEtiquetas === 'function') {
      window.sincronizarEstructurasEtiquetas();
    }

    if (typeof window.cargarConfigVisual === 'function') {
      window.cargarConfigVisual();
    }

    if (typeof window.cargarConfigFuncionalesEnFormulario === 'function') {
      window.cargarConfigFuncionalesEnFormulario();
    }

    if (typeof window.aplicarVisibilidadSecciones === 'function') {
      window.aplicarVisibilidadSecciones();
    }

    // Luego renderizar contenido
    if (typeof window.renderizar === 'function') {
      window.renderizar();
    }
    if (typeof window.renderizarPanelCitas === 'function') {
      window.renderizarPanelCitas();
    }
    if (typeof window.renderizarTareas === 'function') {
      window.renderizarTareas();
    }
    if (typeof window.renderizarCriticas === 'function') {
      window.renderizarCriticas();
    }

    // IMPORTANTE: Renderizar listas personalizadas DESPU�S de actualizar tareasData

    // Regenerar secciones HTML primero
    if (typeof window.regenerarSeccionesListasPersonalizadas === 'function') {
      setTimeout(() => {

        window.regenerarSeccionesListasPersonalizadas();

        // Luego renderizar el contenido
        if (typeof window.renderizarTodasLasListasPersonalizadas === 'function') {
          setTimeout(() => {

            window.renderizarTodasLasListasPersonalizadas();
          }, 100);
        }
      }, 100);
    }

    if (typeof window.cargarLog === 'function') {
      window.cargarLog();
    }

    return true;
  } catch (error) {
    console.error('? Error en PULL:', error);
    return false;
  }
}

// Funci�n para guardar datos en la nube (CON DETECCI�N DE CONFLICTOS)
async function supabasePush(isAutomatic = false, skipPullBefore = false, skipConflictCheck = false) {
  if (window.currentSyncMethod !== 'supabase') return;

  const connected = await initSupabase();
  if (!connected) {
    console.warn('?? Supabase no est� configurado');
    return;
  }

  // ========== DETECCI�N DE CONFLICTOS ==========
  if (!skipConflictCheck && typeof getDeviceId === 'function' && typeof showConflictModal === 'function') {
    try {

      // Obtener metadata actual de Supabase
      const { data: metadataRecord, error: metadataError } = await window.supabaseClient
        .from('agenda_data')
        .select('data')
        .eq('id', '_metadata')
        .single();

      const currentDeviceId = getDeviceId();
      const remoteDeviceId = metadataRecord?.data?._deviceId;


      // Si hay un deviceId remoto y es diferente al actual, mostrar modal
      if (remoteDeviceId && remoteDeviceId !== currentDeviceId) {

        // Obtener datos remotos actuales para comparar
        const { data: remoteTareas } = await window.supabaseClient.from('agenda_data').select('data').eq('id', 'tareas').single();
        const { data: remoteCitas } = await window.supabaseClient.from('agenda_data').select('data').eq('id', 'citas').single();
        const { data: remoteNotas } = await window.supabaseClient.from('agenda_data').select('data').eq('id', 'notas').single();
        const { data: remoteSentimientos } = await window.supabaseClient.from('agenda_data').select('data').eq('id', 'sentimientos').single();

        const remoteData = {
          tareas_criticas: remoteTareas?.data?.tareas_criticas || [],
          tareas: remoteTareas?.data?.tareas || [],
          listasPersonalizadas: remoteTareas?.data?.listasPersonalizadas || [],
          citas: remoteCitas?.data?.citas || [],
          notas: remoteNotas?.data?.notas || '',
          sentimientos: remoteSentimientos?.data?.sentimientos || '',
          _metadata: metadataRecord?.data || {}
        };

        const localData = {
          tareas_criticas: window.appState?.agenda?.tareas_criticas || [],
          tareas: window.appState?.agenda?.tareas || [],
          listasPersonalizadas: window.configVisual?.listasPersonalizadas || [],
          citas: window.appState?.agenda?.citas || [],
          notas: window.appState.notas || '',
          sentimientos: window.appState.sentimientos || ''
        };

        // Mostrar modal y esperar decisi�n del usuario
        const resolution = await showConflictModal(localData, remoteData);

        if (resolution === 'cancel') {

          return false;
        } else if (resolution === 'remote') {

          // Hacer pull para obtener la versi�n remota
          await supabasePull();
          return true; // No guardar, solo actualizar local
        }
        // Si resolution === 'local', continuar guardando

      }
    } catch (conflictError) {
      console.warn('?? Error verificando conflictos:', conflictError);
      // Continuar con el guardado normal si hay error
    }
  }

  // ========== PULL ANTES DE PUSH (Opcional) ==========
  if (!skipPullBefore && skipConflictCheck) {
    // Solo hacer pull si no se hizo verificaci�n de conflictos

    try {
      await supabasePull();

    } catch (error) {
      console.warn('?? Error en Pull antes de Push:', error);
    }
  }

  try {

    // Obtener metadata del dispositivo
    let deviceMetadata = {};
    if (typeof getDeviceMetadata === 'function') {
      deviceMetadata = getDeviceMetadata();
    } else if (typeof getDeviceId === 'function' && typeof getDeviceName === 'function') {
      deviceMetadata = {
        _deviceId: getDeviceId(),
        _deviceName: getDeviceName(),
        _timestamp: new Date().toISOString()
      };
    }

    const updates = [
      {
        id: 'tareas',
        data: {
          tareas_criticas: window.appState?.agenda?.tareas_criticas || window.appState?.tareasCriticas || [],
          tareas: window.appState?.agenda?.tareas || window.appState?.tareas || [],
          listasPersonalizadas: window.tareasData?.listasPersonalizadas || window.appState?.agenda?.listasPersonalizadas || []
        }
      },
      {
        id: 'citas',
        data: { citas: window.appState?.agenda?.citas || [] }
      },
      {
        id: 'config',
        data: {
          visual: window.configVisual || {},
          funcionales: window.configFuncionales || {},
          opciones: window.configOpciones || {}
        }
      },
      {
        id: 'log',
        data: { acciones: window.logAcciones || [] }
      },
      {
        id: 'notas',
        data: { notas: window.appState.notas || '' }
      },
      {
        id: 'sentimientos',
        data: { sentimientos: window.appState.sentimientos || '' }
      },
      {
        id: 'contrasenas',
        data: { lista: window.appState.contrasenas || [] }
      },
      {
        id: 'historial_eliminados',
        data: { items: window.historialEliminados || [] }
      },
      {
        id: 'historial_tareas',
        data: { items: window.historialTareas || [] }
      },
      {
        id: 'personas',
        data: { lista: window.personasAsignadas || [] }
      },
      {
        id: 'etiquetas',
        data: window.etiquetasData || {}
      },
      {
        id: '_metadata',
        data: deviceMetadata
      }
    ];

    const promises = updates.map(async ({ id, data }) => {
      const result = await window.supabaseClient
        .from('agenda_data')
        .upsert({ id, data }, { onConflict: 'id' });

      if (result.error) {
        console.error(`  ? Error guardando ${id}:`, result.error);
      }
      return result;
    });

    const results = await Promise.all(promises);

    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('? Errores al guardar:', errors);
      return false;
    }

    // Disparar evento para que la interfaz m�vil se actualice
    const evento = new CustomEvent('supabaseDataSaved', {
      detail: { timestamp: Date.now(), isAutomatic }
    });
    window.dispatchEvent(evento);

    return true;
  } catch (error) {
    console.error('? Error en PUSH:', error);
    return false;
  }
}

// ========== FUNCIONES DE CAMBIO DE M�TODO ==========
function cambiarMetodoSync(metodo) {

  window.currentSyncMethod = metodo;
  localStorage.setItem('syncMethod', metodo);
  localStorage.setItem('lastSyncMethod', metodo); // Backup adicional

  // Actualizar interfaz
  actualizarInterfazMetodo(metodo);

  // Verificar que el m�todo seleccionado funcione
  setTimeout(() => {
    verificarMetodoSync(metodo);
  }, 1000);

  console.log(`? M�todo guardado en localStorage: ${localStorage.getItem('syncMethod')}`);
}

function actualizarInterfazMetodo(metodo) {
  const statusCurrent = document.getElementById('sync-current');
  const realtimeStatus = document.getElementById('realtime-status');

  if (statusCurrent && realtimeStatus) {
    statusCurrent.textContent = '? Usando Supabase';
    realtimeStatus.textContent = '? Activado';
    if (metodo === 'supabase') {
      startSupabaseRealtime();
    }
  }

  // Asegurar que el radio button est� marcado correctamente
  const radioButton = document.querySelector(`input[name="sync-method"][value="${metodo}"]`);
  if (radioButton) {
    radioButton.checked = true;
  }
}

// ========== VERIFICACI�N DE CONEXI�N ==========
async function verificarMetodoSync(metodo) {

  let funcionaConexion = false;

  try {
    // Verificar Supabase (no reinicializar si ya existe)
    if (window.supabaseClient || await initSupabase()) {
      const { error } = await window.supabaseClient
        .from('agenda_data')
        .select('id')
        .limit(1);
      funcionaConexion = !error;
    }
  } catch (error) {
    console.warn(`?? Error verificando conexi�n:`, error);
    funcionaConexion = false;
  }

  if (!funcionaConexion) {
    console.warn(`?? No hay conexi�n disponible`);
    actualizarEstadoSincronizacion(`? Sin conexi�n - Configurar Supabase`);
    if (typeof showSupabaseStatus === 'function') {
      showSupabaseStatus('? Sin conexi�n - Verifica configuraci�n de Supabase', 'error');
    }
  } else {

    actualizarEstadoSincronizacion(`? Conectado con Supabase`);
  }
}

// Funci�n legacy para compatibilidad
async function intentarFallback(metodoFallido) {

  actualizarEstadoSincronizacion(`? Sin conexi�n - Configurar Supabase`);

  if (typeof showSupabaseStatus === 'function') {
    showSupabaseStatus('? Sin conexi�n - Verifica configuraci�n de Supabase', 'error');
  }
}

function actualizarEstadoSincronizacion(mensaje) {
  const statusCurrent = document.getElementById('sync-current');
  if (statusCurrent) {
    statusCurrent.textContent = mensaje;
  }
}

// ========== REAL-TIME CON SUPABASE ==========
async function startSupabaseRealtime() {
  const connected = await initSupabase();
  if (!connected || window.currentSyncMethod !== 'supabase') return;

  try {
    // Crear canal de real-time
    window.supabaseRealtimeChannel = window.supabaseClient
      .channel('agenda-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agenda_data'
        },
        (payload) => {

          // Actualizar datos autom�ticamente
          setTimeout(() => supabasePull(), 100);
        }
      )
      .subscribe();

  } catch (error) {
    console.error('? Error activando real-time:', error);
  }
}

function stopSupabaseRealtime() {
  if (window.supabaseRealtimeChannel) {
    window.supabaseClient.removeChannel(window.supabaseRealtimeChannel);
    window.supabaseRealtimeChannel = null;

  }
}

// ========== UTILIDADES ==========
function showSupabaseStatus(message, type) {
  const statusDiv = document.getElementById('supabase-status');
  if (!statusDiv) return;

  const colors = {
    success: '#28a745',
    error: '#dc3545',
    info: '#007bff'
  };

  statusDiv.style.display = 'block';
  statusDiv.style.color = colors[type] || '#333';
  statusDiv.textContent = message;

  // Auto-ocultar despu�s de 5 segundos si es �xito
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
}

// ========== INTEGRACI�N CON EL SISTEMA EXISTENTE ==========

// Funciones globales de sincronizaci�n
window.guardarJSON = async function (isAutomatic = false) {
  return await supabasePush(isAutomatic);
};

window.extendsClassPull = async function () {
  return await supabasePull();
};

// ========== CARGAR CONFIGURACI�N EN FORMULARIOS ==========
function cargarConfigSupabaseEnFormulario() {
  const config = getSupabaseConfig();
  const urlField = document.getElementById('supabase-url');
  const keyField = document.getElementById('supabase-key');
  const serviceKeyField = document.getElementById('supabase-service-key');

  if (urlField && config.url) urlField.value = config.url;
  if (keyField && config.key) keyField.value = config.key;
  if (serviceKeyField && config.serviceKey) serviceKeyField.value = config.serviceKey;

  // Detectar si es primera vez usando Supabase
  detectarPrimeraVezSupabase();
}

// Bandera para evitar mostrar el popup m�ltiples veces
let ayudaSupabaseMostrada = false;

function detectarPrimeraVezSupabase() {
  const config = getSupabaseConfig();

  // Si no tiene configuraci�n de Supabase (URL o Key), mostrar ayuda SIEMPRE
  if (!config.url || !config.key) {
    // ? PREVENIR DUPLICADOS: Solo mostrar una vez por sesi�n
    if (ayudaSupabaseMostrada) {

      return;
    }

    ayudaSupabaseMostrada = true; // Marcar como mostrada

    // Mostrar ayuda despu�s de un delay mayor para que cargue la interfaz
    setTimeout(() => {
      console.log('?? Ejecutando mostrarAyudaPrimeraVez()');
      mostrarAyudaPrimeraVez();
    }, 2000); // Aumentado de 500ms a 2000ms
  }
}


// Variable global para almacenar la configuración temporal (no persistente)
window.configTemporal = null;

function mostrarAyudaPrimeraVez() {
  // Mostrar el nuevo modal de configuración inicial
  const modal = document.getElementById('modal-config-inicial');
  if (modal) {
    modal.style.display = 'flex';
  } else {
    console.error('❌ No se encontró el modal de configuración inicial');
    // Fallback a la guía antigua si el modal no existe
    const shouldShow = confirm(
      '☁️ ¡Bienvenido a la sincronización en la nube!\n\n' +
      'Puedes cargar un archivo JSON con tu configuración o configurar manualmente.\n\n' +
      '¿Quieres configurar ahora?'
    );
    if (shouldShow) {
      toggleConfigFloating();
    }
  }
}

function cerrarModalConfigInicial() {
  const modal = document.getElementById('modal-config-inicial');
  if (modal) {
    modal.style.display = 'none';
    // Limpiar el preview
    const preview = document.getElementById('config-json-preview');
    if (preview) preview.style.display = 'none';
    // Resetear input
    const input = document.getElementById('config-json-input');
    if (input) input.value = '';
    // Limpiar configuración temporal si no se aplicó
    window.configTemporal = null;
  }
}

// Procesar archivo JSON de configuración
function procesarConfigJSON(file) {
  if (!file) {
    alert('❌ No se seleccionó ningún archivo');
    return;
  }

  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const config = JSON.parse(e.target.result);

      // Validar que tenga las propiedades requeridas
      const requeridos = ['supabaseUrl', 'supabaseKey', 'googleClientId', 'googleClientSecret'];
      const faltantes = requeridos.filter(key => !config[key]);

      if (faltantes.length > 0) {
        alert(`❌ El JSON no contiene los siguientes campos requeridos:\n\n${faltantes.join('\n')}`);
        return;
      }

      // Guardar en variable temporal
      window.configTemporal = config;

      // Mostrar preview
      const preview = document.getElementById('config-json-preview');
      const details = document.getElementById('config-json-details');

      if (preview && details) {
        details.innerHTML = `
          <strong>🌐 Supabase URL:</strong> ${config.supabaseUrl.substring(0, 30)}...<br>
          <strong>🔑 Supabase Key:</strong> ${config.supabaseKey.substring(0, 20)}...${config.supabaseKey.substring(config.supabaseKey.length - 10)}<br>
          <strong>📅 Google Client ID:</strong> ${config.googleClientId.substring(0, 30)}...<br>
          <strong>🔐 Google Client Secret:</strong> ${config.googleClientSecret.substring(0, 20)}...
        `;
        preview.style.display = 'block';
      }

      // Habilitar botones
      const btnTemporal = document.getElementById('btn-config-temporal');
      const btnFijar = document.getElementById('btn-config-fijar');

      if (btnTemporal) {
        btnTemporal.disabled = false;
        btnTemporal.style.opacity = '1';
        btnTemporal.style.cursor = 'pointer';
      }

      if (btnFijar) {
        btnFijar.disabled = false;
        btnFijar.style.opacity = '1';
        btnFijar.style.cursor = 'pointer';
      }

      console.log('✅ Configuración JSON cargada correctamente');

    } catch (error) {
      console.error('❌ Error al procesar JSON:', error);
      alert('❌ Error al leer el archivo JSON. Verifica que sea un archivo JSON válido.');
      window.configTemporal = null;
    }
  };

  reader.onerror = function() {
    alert('❌ Error al leer el archivo');
    window.configTemporal = null;
  };

  reader.readAsText(file);
}

// Aplicar configuración JSON (temporal o permanente)
function aplicarConfigJSON(guardarPermanente) {
  if (!window.configTemporal) {
    alert('❌ No hay configuración cargada. Por favor, selecciona un archivo JSON primero.');
    return;
  }

  const config = window.configTemporal;

  try {
    // Aplicar configuración de Supabase
    const supabaseUrlInput = document.getElementById('supabase-url');
    const supabaseKeyInput = document.getElementById('supabase-key');

    if (supabaseUrlInput) supabaseUrlInput.value = config.supabaseUrl;
    if (supabaseKeyInput) supabaseKeyInput.value = config.supabaseKey;

    // Aplicar configuración de Google Calendar
    const googleClientIdInput = document.getElementById('google-client-id');
    const googleClientSecretInput = document.getElementById('google-client-secret');

    if (googleClientIdInput) googleClientIdInput.value = config.googleClientId;
    if (googleClientSecretInput) googleClientSecretInput.value = config.googleClientSecret;

    // Si es permanente, guardar en localStorage (solo credenciales)
    if (guardarPermanente) {
      try {
        // Guardar Supabase
        localStorage.setItem('supabaseUrl', config.supabaseUrl);
        localStorage.setItem('supabaseKey', config.supabaseKey);

        // Guardar Google Calendar
        localStorage.setItem('googleClientId', config.googleClientId);
        localStorage.setItem('googleClientSecret', config.googleClientSecret);

        console.log('✅ Credenciales guardadas en localStorage');
        alert('✅ Configuración aplicada y guardada permanentemente en tu navegador');
      } catch (error) {
        console.error('❌ Error al guardar en localStorage:', error);
        alert('⚠️ La configuración se aplicó pero no se pudo guardar en localStorage');
      }
    } else {
      // Solo temporal, no guardar en localStorage
      console.log('⏱️ Configuración aplicada temporalmente (no se guardó en localStorage)');
      alert('⏱️ Configuración aplicada temporalmente.\n\nSe usará solo durante esta sesión. Al cerrar el navegador se perderá.');
    }

    // Cerrar modal
    cerrarModalConfigInicial();

    // Inicializar conexiones
    setTimeout(() => {
      // Reiniciar Supabase si la función existe
      if (typeof testSupabaseConnection === 'function') {
        testSupabaseConnection();
      }

      // Mostrar mensaje de éxito
      console.log('🚀 Configuración aplicada exitosamente');
    }, 500);

  } catch (error) {
    console.error('❌ Error al aplicar configuración:', error);
    alert('❌ Error al aplicar la configuración. Por favor, intenta de nuevo.');
  }
}

// Generar y descargar JSON de credenciales
function generarYDescargarCredenciales() {
  try {
    // Obtener credenciales desde los inputs o localStorage
    let supabaseUrl = document.getElementById('supabase-url')?.value || localStorage.getItem('supabaseUrl') || '';
    let supabaseKey = document.getElementById('supabase-key')?.value || localStorage.getItem('supabaseKey') || '';
    let googleClientId = document.getElementById('google-client-id')?.value || localStorage.getItem('googleClientId') || '';
    let googleClientSecret = document.getElementById('google-client-secret')?.value || localStorage.getItem('googleClientSecret') || '';

    // Verificar que al menos haya alguna credencial
    if (!supabaseUrl && !supabaseKey && !googleClientId && !googleClientSecret) {
      alert('⚠️ No hay credenciales configuradas para exportar.\n\nPor favor, configura primero Supabase o Google Calendar.');
      return;
    }

    // Crear objeto con las credenciales
    const credenciales = {
      supabaseUrl: supabaseUrl,
      supabaseKey: supabaseKey,
      googleClientId: googleClientId,
      googleClientSecret: googleClientSecret,
      fechaExportacion: new Date().toISOString(),
      version: '1.0'
    };

    // Convertir a JSON
    const jsonStr = JSON.stringify(credenciales, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });

    // Crear enlace de descarga
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `agenda-credenciales-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    console.log('📥 Credenciales exportadas correctamente');
    alert('✅ Archivo JSON de credenciales generado y descargado.\n\n⚠️ Recuerda guardarlo en un lugar seguro.');

  } catch (error) {
    console.error('❌ Error al generar JSON de credenciales:', error);
    alert('❌ Error al generar el archivo de credenciales. Por favor, intenta de nuevo.');
  }
}

// Hacer funciones globales accesibles
window.procesarConfigJSON = procesarConfigJSON;
window.aplicarConfigJSON = aplicarConfigJSON;
window.generarYDescargarCredenciales = generarYDescargarCredenciales;
window.cerrarModalConfigInicial = cerrarModalConfigInicial;

function mostrarGuiaRapidaSupabase() {
  alert(
    '?? GU�A R�PIDA SUPABASE (2 minutos):\n\n' +
    '1?? Ve a supabase.com ? "Start your project"\n' +
    '2?? Registrarte (GitHub recomendado)\n' +
    '3?? "New project":\n' +
    '   � Name: agenda-pablo\n' +
    '   � Password: (genera una segura)\n' +
    '   � Region: (la m�s cercana)\n' +
    '4?? Espera ~2 min que se cree\n' +
    '5?? Settings ? API ? Copia URL y anon key\n' +
    '6?? Vuelve aqu� y pega los datos\n' +
    '7?? Click "Probar" (te preguntar� si crear tablas)\n\n' +
    '�Y listo! Real-time sin l�mites ??'
  );
}

function mostrarEstadoSincronizacion() {
  const configSupabase = getSupabaseConfig();

  if (window.currentSyncMethod === 'supabase' && configSupabase.url) {
    showSupabaseStatus(
      '? Usando Supabase - Sin l�mites de peticiones, real-time activado',
      'success'
    );
  }
}

// ========== INICIALIZACI�N ==========
document.addEventListener('DOMContentLoaded', async () => {

  // Asegurar que las variables globales existan
  if (!window.appState) {
    window.appState = {
      tareas: [],
      tareas_criticas: [],
      citas: [],
      notas: '',
      sentimientos: '',
      contrasenas: []
    };
  }

  if (!window.configVisual) {
    window.configVisual = {
      listasPersonalizadas: []
    };
  }

  cargarConfigSupabaseEnFormulario();

  const savedMethod = localStorage.getItem('syncMethod') || localStorage.getItem('lastSyncMethod') || 'supabase';
  window.currentSyncMethod = savedMethod;

  const configSupabase = getSupabaseConfig();
  if (configSupabase.url && configSupabase.key && !window.supabaseClient) {
    await initSupabase();

    try {
      await supabasePull();

      const evento = new CustomEvent('supabaseConfigLoaded', {
        detail: {
          config: window.configVisual,
          timestamp: Date.now()
        }
      });
      document.dispatchEvent(evento);

      await limpiarBackupsAntiguos(true);
      await verificarBackupDiario();

    } catch (error) {
      console.warn('?? Error al cargar datos:', error);
    }
  } else {
    detectarPrimeraVezSupabase();

    setTimeout(() => {
      const evento = new CustomEvent('supabaseConfigLoaded', {
        detail: {
          config: window.configVisual || { tema: 'verde' },
          timestamp: Date.now(),
          fallback: true
        }
      });
      document.dispatchEvent(evento);
    }, 100);
  }

  setTimeout(() => {
    const radioButton = document.querySelector(`input[name="sync-method"][value="${savedMethod}"]`);
    if (radioButton) {
      radioButton.checked = true;
    }

    // Actualizar interfaz
    actualizarInterfazMetodo(savedMethod);

    // Verificar que el m�todo funcione
    setTimeout(() => {
      verificarMetodoSync(savedMethod);

      // Mostrar estado de conexi�n
      setTimeout(() => {
        mostrarEstadoSincronizacion();
      }, 3000);
    }, 2000);
  }, 500);

  // ========== SINCRONIZACI�N PERI�DICA CADA MINUTO ==========
  iniciarSincronizacionPeriodica();
});

// ========== PERSISTENCIA ADICIONAL ==========
// Guardar m�todo cada vez que cambie
window.addEventListener('beforeunload', () => {
  if (window.currentSyncMethod) {
    localStorage.setItem('syncMethod', window.currentSyncMethod);
    localStorage.setItem('lastSyncMethod', window.currentSyncMethod);
  }
});

// ========== EXPORTS GLOBALES ==========
window.guardarConfigSupabase = guardarConfigSupabase;
window.probarConexionSupabase = probarConexionSupabase;
window.crearTablasSupabase = crearTablasSupabase;
window.cambiarMetodoSync = cambiarMetodoSync;
window.supabasePull = supabasePull;
window.supabasePush = supabasePush;
window.guardarEnSupabaseWrapper = guardarEnSupabaseWrapper;

// Funci�n alias para guardar configuraci�n (llamada desde app.js)
function guardarConfigEnSupabase() {
  console.log('?? guardarConfigEnSupabase() - Guardando configuraci�n...');
  return supabasePush();
}

// Funci�n wrapper para guardar en Supabase (llamada desde sincronizacion-simple.js)
function guardarEnSupabaseWrapper() {
  // Sincronizar personas antes de guardar
  if (window.tareasData && window.tareasData.personas) {
    window.personasAsignadas = [...window.tareasData.personas];
  }

  return supabasePush();
}

// Funci�n para asegurar que la configuraci�n est� cargada desde Supabase
async function asegurarConfiguracionCargada() {

  const maxIntentos = 5;
  const delayMs = 300;

  for (let i = 0; i < maxIntentos; i++) {
    // Verificar si ya tenemos configuraci�n cargada
    if (window.configVisual && Object.keys(window.configVisual).length > 0) {

      return true;
    }

    // Si no est� cargada y tenemos Supabase configurado, intentar Pull
    if (window.supabaseClient) {
      try {

        await supabasePull();

        // Verificar de nuevo si se carg�
        if (window.configVisual && Object.keys(window.configVisual).length > 0) {

          return true;
        }
      } catch (error) {
        console.warn(`?? Error en Pull intento ${i + 1}:`, error);
      }
    }

    // Esperar antes del siguiente intento
    if (i < maxIntentos - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // Si despu�s de todos los intentos no hay configuraci�n, usar valores por defecto
  console.warn('?? No se pudo cargar configuraci�n desde Supabase, usando valores por defecto');
  if (!window.configVisual) {
    window.configVisual = {
      tema: 'verde',
      titulo: 'Agenda',
      listasPersonalizadas: [],
      popupCelebracion: true,
      mostrarNotas: false,
      mostrarSentimientos: false,
      mostrarContrasenas: false
    };
  }

  return false;
}

// ========== SISTEMA DE BACKUPS AUTOM�TICOS ==========

// Generar nombre de backup con fecha y hora
function generarNombreBackup() {
  const ahora = new Date();
  const ano = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  const hora = String(ahora.getHours()).padStart(2, '0');
  const minuto = String(ahora.getMinutes()).padStart(2, '0');
  const segundo = String(ahora.getSeconds()).padStart(2, '0');

  return `backup_${ano}-${mes}-${dia}_${hora}-${minuto}-${segundo}`;
}

// Guardar backup completo en Supabase
async function guardarBackupAutomatico(esManual = false) {
  const connected = await initSupabase();
  if (!connected) {
    if (esManual) {
      alert('? Error: No hay conexinn con Supabase.\n\nConfigura Supabase primero.');
    }
    console.warn('?? No se puede crear backup: Supabase no configurado');
    return false;
  }

  try {
    const logPrefix = esManual ? '?? BACKUP MANUAL' : '?? BACKUP AUTOMnTICO';

    const collections = [
      'tareas', 'citas', 'config', 'notas', 'sentimientos',
      'contrasenas', 'historial_eliminados', 'historial_tareas',
      'personas', 'etiquetas', 'log', 'salvados'
    ];

    const backupData = {};

    for (const collection of collections) {
      try {
        const { data, error } = await window.supabaseClient
          .from('agenda_data')
          .select('data')
          .eq('id', collection)
          .single();

        if (!error && data) {
          backupData[collection] = data.data;
        } else {
          backupData[collection] = {};
        }
      } catch (err) {
        backupData[collection] = {};
      }
    }

    // Generar nombre de backup con fecha y hora
    const backupId = generarNombreBackup();
    const ahora = new Date().toISOString();

    // Guardar backup en tabla agenda_backups
    const { error: insertError } = await window.supabaseClient
      .from('agenda_backups')
      .insert({
        id: backupId,
        created_at: ahora,
        data: backupData
      });

    if (insertError) {
      if (insertError.code === 'PGRST116' || insertError.message.includes('does not exist')) {
        if (esManual) {
          const shouldCreate = confirm(
            '?? Tabla de Backups No Existe\n\n' +
            'La tabla "agenda_backups" no existe en tu base de datos.\n\n' +
            'nQuieres crear la tabla automnticamente?'
          );

          if (shouldCreate) {
            await crearTablaBackups();
            return await guardarBackupAutomatico(esManual);
          }
        }
        return false;
      }

      throw insertError;
    }

    if (esManual) {
      alert(`? Backup Creado\n\n${backupId}\n\nTodos los datos han sido respaldados correctamente.`);
      if (typeof cargarListaBackups === 'function') {
        cargarListaBackups();
      }
    }

    return true;
  } catch (error) {
    console.error('? Error creando backup:', error);
    if (esManual) {
      alert('? Error al crear backup:\n\n' + error.message);
    }
    return false;
  }
}

// Crear tabla de backups en Supabase
async function crearTablaBackups() {
  const connected = await initSupabase();
  if (!connected) {
    alert('? Error: No hay conexinn con Supabase.');
    return;
  }

  // Intentar crear tabla usando SQL directo
  try {
    const { error } = await window.supabaseClient.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS agenda_backups (
          id text PRIMARY KEY,
          created_at timestamp DEFAULT now(),
          data jsonb
        );
      `
    });

    if (error) {
      throw error;
    }

    alert('? Tabla de Backups Creada\n\nLa tabla se ha creado correctamente. Ahora puedes crear backups.');
    return true;

  } catch (error) {
    console.warn('?? No se pudo crear automnticamente:', error);

    // Mostrar instrucciones manuales
    const sqlQuery = `CREATE TABLE agenda_backups (
  id text PRIMARY KEY,
  created_at timestamp DEFAULT now(),
  data jsonb
);`;

    // Crear un modal mns visual con el SQL
    const shouldCopy = confirm(
      '??? CREAR TABLA DE BACKUPS MANUALMENTE:\n\n' +
      '1. Ve a supabase.com ? tu proyecto\n' +
      '2. Click "SQL Editor" (menn izquierdo)\n' +
      '3. Click "New query"\n' +
      '4. Pega el c�digo SQL (se copiar� al portapapeles)\n' +
      '5. Click "Run"\n' +
      '6. Vuelve aqu� y crea tu backup\n\n' +
      '�Quieres copiar el c�digo SQL al portapapeles?'
    );

    if (shouldCopy) {
      try {
        await navigator.clipboard.writeText(sqlQuery);
        alert('? SQL Copiado al Portapapeles\n\nAhora ve a Supabase SQL Editor y p�galo.');
      } catch (err) {
        // Si falla el portapapeles, mostrar el SQL en un alert
        alert(
          '?? C�DIGO SQL:\n\n' +
          sqlQuery +
          '\n\n' +
          'Copia este c�digo y ejec�talo en el SQL Editor de Supabase.'
        );
      }
    } else {
      alert(
        '?? C�DIGO SQL:\n\n' +
        sqlQuery +
        '\n\n' +
        'Copia este c�digo y ejec�talo en el SQL Editor de Supabase.'
      );
    }

    return false;
  }
}

// Cargar lista de backups disponibles
async function cargarListaBackups() {
  const connected = await initSupabase();
  if (!connected) {
    console.warn('?? No se puede cargar lista de backups: Supabase no configurado');
    return;
  }

  const container = document.getElementById('backups-container');
  if (!container) return;

  try {
    // Obtener todos los backups ordenados por fecha (m�s recientes primero)
    const { data: backups, error } = await window.supabaseClient
      .from('agenda_backups')
      .select('id, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        container.innerHTML = `
          <div style="text-align:center;padding:40px;">
            <div style="font-size:48px;margin-bottom:10px;">??</div>
            <div style="color:#666;margin-bottom:15px;">La tabla de backups no existe todav�a</div>
            <button onclick="crearTablaBackups()" class="btn-primario" style="padding:10px 20px;background:#11998e;color:white;border:none;border-radius:6px;cursor:pointer;">
              ??? Crear Tabla de Backups
            </button>
          </div>
        `;
        return;
      }
      throw error;
    }

    if (!backups || backups.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;color:#666;padding:40px;font-style:italic;">
          <div style="font-size:48px;margin-bottom:10px;">??</div>
          <div>No hay backups disponibles</div>
          <div style="font-size:12px;margin-top:10px;">Crea tu primer backup haciendo click en "?? Crear Backup Ahora"</div>
        </div>
      `;
      return;
    }

    // Renderizar lista de backups
    let html = '';
    backups.forEach(backup => {
      const fecha = new Date(backup.created_at);
      const fechaFormateada = fecha.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Calcular d�as desde creaci�n
      const ahora = new Date();
      const diasDesdeCreacion = Math.floor((ahora - fecha) / (1000 * 60 * 60 * 24));
      const colorAntiguedad = diasDesdeCreacion > 7 ? '#e74c3c' : diasDesdeCreacion > 3 ? '#f39c12' : '#27ae60';

      html += `
        <div style="background:white;padding:12px;border-radius:6px;margin-bottom:10px;border-left:4px solid ${colorAntiguedad};display:flex;justify-content:space-between;align-items:center;">
          <div style="flex:1;">
            <div style="font-weight:bold;color:#2d3748;margin-bottom:4px;">?? ${backup.id}</div>
            <div style="font-size:12px;color:#666;">
              ?? ${fechaFormateada}
              ${diasDesdeCreacion > 0 ? `<span style="margin-left:10px;color:${colorAntiguedad};">� ${diasDesdeCreacion} d�a${diasDesdeCreacion !== 1 ? 's' : ''}</span>` : '<span style="margin-left:10px;color:#27ae60;">� Hoy</span>'}
            </div>
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="restaurarBackupDesdeSupabase('${backup.id}')" class="btn-secundario" style="padding:6px 12px;background:#3498db;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">
              ?? Restaurar
            </button>
            <button onclick="eliminarBackup('${backup.id}')" class="btn-secundario" style="padding:6px 12px;background:#e74c3c;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">
              ???
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

  } catch (error) {
    console.error('? Error cargando lista de backups:', error);
    container.innerHTML = `
      <div style="text-align:center;color:#e74c3c;padding:40px;">
        <div style="font-size:48px;margin-bottom:10px;">?</div>
        <div>Error al cargar backups</div>
        <div style="font-size:12px;margin-top:10px;">${error.message}</div>
      </div>
    `;
  }
}

// Restaurar backup desde Supabase
async function restaurarBackupDesdeSupabase(backupId) {
  const confirmacion = confirm(
    `?? RESTAURAR BACKUP\n\n` +
    `Backup: ${backupId}\n\n` +
    `Esto reemplazar� TODOS tus datos actuales con los del backup.\n\n` +
    `�Est�s seguro de que quieres continuar?`
  );

  if (!confirmacion) {

    return;
  }

  const connected = await initSupabase();
  if (!connected) {
    alert('? Error: No hay conexi�n con Supabase.');
    return;
  }

  try {

    // Obtener datos del backup
    const { data: backup, error } = await window.supabaseClient
      .from('agenda_backups')
      .select('data')
      .eq('id', backupId)
      .single();

    if (error) {
      throw new Error('No se pudo obtener el backup: ' + error.message);
    }

    if (!backup || !backup.data) {
      throw new Error('El backup est� vac�o o corrupto');
    }

    // Restaurar cada colecci�n
    const collections = Object.keys(backup.data);
    let restaurados = 0;

    for (const collection of collections) {
      try {
        const { error: upsertError } = await window.supabaseClient
          .from('agenda_data')
          .upsert({
            id: collection,
            data: backup.data[collection]
          }, { onConflict: 'id' });

        if (upsertError) {
          console.warn(`?? Error restaurando ${collection}:`, upsertError);
        } else {

          restaurados++;
        }
      } catch (err) {
        console.warn(`?? Error con ${collection}:`, err);
      }
    }

    alert(
      `? Backup Restaurado\n\n` +
      `Se han restaurado ${restaurados} colecciones.\n\n` +
      `La p�gina se recargar� para aplicar los cambios.`
    );

    // Recargar datos y p�gina
    setTimeout(async () => {
      await supabasePull();
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }, 1000);

  } catch (error) {
    console.error('? Error restaurando backup:', error);
    alert('? Error al restaurar backup:\n\n' + error.message);
  }
}

// Eliminar backup espec�fico
async function eliminarBackup(backupId) {
  const confirmacion = confirm(
    `??? ELIMINAR BACKUP\n\n` +
    `Backup: ${backupId}\n\n` +
    `�Est�s seguro de que quieres eliminar este backup?`
  );

  if (!confirmacion) return;

  const connected = await initSupabase();
  if (!connected) {
    alert('? Error: No hay conexi�n con Supabase.');
    return;
  }

  try {
    const { error } = await window.supabaseClient
      .from('agenda_backups')
      .delete()
      .eq('id', backupId);

    if (error) throw error;

    alert(`? Backup eliminado correctamente`);

    // Actualizar lista
    cargarListaBackups();

  } catch (error) {
    console.error('? Error eliminando backup:', error);
    alert('? Error al eliminar backup:\n\n' + error.message);
  }
}

// Limpiar backups antiguos (m�s de 10 d�as)
async function limpiarBackupsAntiguos(esAutomatico = false) {
  const connected = await initSupabase();
  if (!connected) {
    if (!esAutomatico) {
      alert('? Error: No hay conexi�n con Supabase.');
    }
    return;
  }

  try {
    console.log('?? Limpiando backups antiguos (>10 d�as)...');

    // Calcular fecha l�mite (hace 10 d�as)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 10);
    const fechaLimiteISO = fechaLimite.toISOString();

    // Obtener backups antiguos
    const { data: backupsAntiguos, error: selectError } = await window.supabaseClient
      .from('agenda_backups')
      .select('id, created_at')
      .lt('created_at', fechaLimiteISO);

    if (selectError) {
      // Si la tabla no existe, no hacer nada
      if (selectError.code === 'PGRST116' || selectError.message.includes('does not exist')) {

        return;
      }
      throw selectError;
    }

    if (!backupsAntiguos || backupsAntiguos.length === 0) {

      if (!esAutomatico) {
        alert('? No hay backups antiguos\n\nTodos los backups son recientes (menos de 10 d�as).');
      }
      return;
    }

    // Eliminar backups antiguos
    const { error: deleteError } = await window.supabaseClient
      .from('agenda_backups')
      .delete()
      .lt('created_at', fechaLimiteISO);

    if (deleteError) throw deleteError;

    console.log(`? ${backupsAntiguos.length} backup(s) antiguo(s) eliminado(s)`);

    if (!esAutomatico) {
      alert(`? Limpieza Completada\n\n${backupsAntiguos.length} backup(s) antiguo(s) eliminado(s).`);
      // Actualizar lista
      cargarListaBackups();
    }

  } catch (error) {
    console.error('? Error limpiando backups antiguos:', error);
    if (!esAutomatico) {
      alert('? Error al limpiar backups:\n\n' + error.message);
    }
  }
}

// Verificar y crear backup diario autom�tico
async function verificarBackupDiario() {
  const connected = await initSupabase();
  if (!connected) {

    return;
  }

  try {
    const hoy = new Date();
    const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    // Verificar �ltimo backup en localStorage
    const ultimoBackup = localStorage.getItem('ultimoBackupDiario');

    if (ultimoBackup === fechaHoy) {

      return;
    }

    const exito = await guardarBackupAutomatico(false);

    if (exito) {
      localStorage.setItem('ultimoBackupDiario', fechaHoy);

    }

  } catch (error) {
    console.error('? Error en backup diario autom�tico:', error);
  }
}

// ========== FUNCIONES DE BORRADO DE DATOS ==========

// Borrar todos los datos locales (localStorage)
async function borrarDatosLocales() {
  const confirmacion1 = confirm(
    '?? ADVERTENCIA: Borrar Datos Locales\n\n' +
    'Esto eliminar� TODOS los datos guardados en tu navegador:\n' +
    '� Tareas y citas\n' +
    '� Notas y sentimientos\n' +
    '� Contrase�as guardadas\n' +
    '� Configuraci�n visual\n' +
    '� Historial\n\n' +
    'Los datos en la nube (Supabase) NO se ver�n afectados.\n\n' +
    '�Est�s seguro de que quieres continuar?'
  );

  if (!confirmacion1) {
    console.log('? Borrado de datos locales cancelado por el usuario (1ra confirmaci�n)');
    return;
  }

  const confirmacion2 = confirm(
    '?? �LTIMA CONFIRMACI�N\n\n' +
    'Esta acci�n NO se puede deshacer.\n\n' +
    'Todos tus datos locales ser�n eliminados permanentemente.\n\n' +
    '�Confirmas que quieres BORRAR TODOS LOS DATOS LOCALES?'
  );

  if (!confirmacion2) {
    console.log('? Borrado de datos locales cancelado por el usuario (2da confirmaci�n)');
    return;
  }

  try {

    // Borrar todas las claves relacionadas con la agenda
    const keysToRemove = [
      'agenda',
      'configVisual',
      'configFuncionales',
      'configOpciones',
      'tareasData',
      'historialEliminados',
      'historialTareas',
      'personasAsignadas',
      'etiquetasData',
      'logAcciones',
      'salvadosData',
      'contrasenasMaestra',
      'contrasenasSesion'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);

    });

    // Reiniciar variables globales
    if (window.appState) {
      window.appState = {
        agenda: { tareas: [], tareas_criticas: [], citas: [] },
        notas: '',
        sentimientos: '',
        contrasenas: []
      };
    }

    if (window.configVisual) {
      window.configVisual = { listasPersonalizadas: [] };
    }

    window.historialEliminados = [];
    window.historialTareas = [];
    window.personasAsignadas = [];
    window.etiquetasData = { tareas: [], citas: [] };
    window.logAcciones = [];

    alert(
      '? Datos Locales Borrados\n\n' +
      'Todos los datos locales han sido eliminados.\n\n' +
      'La p�gina se recargar� para aplicar los cambios.'
    );

    // Recargar la p�gina para aplicar cambios
    setTimeout(() => {
      window.location.reload();
    }, 1000);

  } catch (error) {
    console.error('? Error borrando datos locales:', error);
    alert('? Error al borrar datos locales: ' + error.message);
  }
}

// Borrar todos los datos en la nube (Supabase)
async function borrarDatosNube() {
  const connected = await initSupabase();
  if (!connected) {
    alert('? Error: No hay conexi�n con Supabase.\n\nConfigura Supabase primero.');
    return;
  }

  const confirmacion1 = confirm(
    '?? ADVERTENCIA: Borrar Datos en la Nube\n\n' +
    'Esto eliminar� TODOS los datos de tu cuenta de Supabase:\n' +
    '� Tareas y citas\n' +
    '� Notas y sentimientos\n' +
    '� Contrase�as guardadas\n' +
    '� Configuraci�n visual\n' +
    '� Historial\n\n' +
    'Los datos locales en tu navegador NO se ver�n afectados.\n\n' +
    '�Est�s seguro de que quieres continuar?'
  );

  if (!confirmacion1) {
    console.log('? Borrado de datos en nube cancelado por el usuario (1ra confirmaci�n)');
    return;
  }

  const confirmacion2 = confirm(
    '?? �LTIMA CONFIRMACI�N\n\n' +
    'Esta acci�n NO se puede deshacer.\n\n' +
    'Todos tus datos en Supabase ser�n eliminados permanentemente.\n\n' +
    '�Confirmas que quieres BORRAR TODOS LOS DATOS EN LA NUBE?'
  );

  if (!confirmacion2) {
    console.log('? Borrado de datos en nube cancelado por el usuario (2da confirmaci�n)');
    return;
  }

  try {

    // Eliminar todas las filas de la tabla agenda_data
    const { error } = await window.supabaseClient
      .from('agenda_data')
      .delete()
      .neq('id', 'IMPOSIBLE_VALOR_PARA_BORRAR_TODO'); // Truco: condici�n siempre verdadera para borrar todo

    if (error) {
      console.error('? Error borrando datos en nube:', error);
      alert('? Error al borrar datos en la nube:\n\n' + error.message);
      return;
    }

    alert(
      '? Datos en la Nube Borrados\n\n' +
      'Todos los datos en Supabase han sido eliminados.\n\n' +
      'Tus datos locales permanecen intactos.'
    );

  } catch (error) {
    console.error('? Error borrando datos en nube:', error);
    alert('? Error al borrar datos en la nube: ' + error.message);
  }
}

window.guardarConfigEnSupabase = guardarConfigEnSupabase;
window.asegurarConfiguracionCargada = asegurarConfiguracionCargada;
window.initSupabase = initSupabase;
window.cargarConfigSupabaseEnFormulario = cargarConfigSupabaseEnFormulario;
window.verificarMetodoSync = verificarMetodoSync;
window.intentarFallback = intentarFallback;
window.actualizarInterfazMetodo = actualizarInterfazMetodo;
window.mostrarEstadoSincronizacion = mostrarEstadoSincronizacion;
window.borrarDatosLocales = borrarDatosLocales;
window.borrarDatosNube = borrarDatosNube;
window.guardarBackupAutomatico = guardarBackupAutomatico;
window.cargarListaBackups = cargarListaBackups;
window.restaurarBackupDesdeSupabase = restaurarBackupDesdeSupabase;
window.eliminarBackup = eliminarBackup;
window.limpiarBackupsAntiguos = limpiarBackupsAntiguos;
window.crearTablaBackups = crearTablaBackups;

// ========== SINCRONIZACI�N PERI�DICA ==========
let intervaloSincronizacion = null;
let ultimoTimestampVerificado = null;

// Iniciar sincronizaci�n peri�dica (cada minuto)
function iniciarSincronizacionPeriodica() {
  // Limpiar intervalo previo si existe
  if (intervaloSincronizacion) {
    clearInterval(intervaloSincronizacion);
  }

  console.log('?? Iniciando sincronizaci�n peri�dica (cada 60 segundos)...');

  // Verificar cambios cada minuto
  intervaloSincronizacion = window.intervaloSincronizacion = setInterval(async () => {
    if (window.currentSyncMethod !== 'supabase') {

      return;
    }

    const connected = await initSupabase();
    if (!connected) {

      return;
    }

    try {

      // Verificar si hay cambios comparando last_updated
      const hayCambios = await verificarCambiosEnSupabase();

      if (hayCambios) {

        await supabasePull();

      } else {

      }
    } catch (error) {
      console.warn('?? Error en sincronizaci�n peri�dica:', error);
    }
  }, 60000); // 60 segundos = 1 minuto

}

// Verificar si hay cambios en Supabase
async function verificarCambiosEnSupabase() {
  try {
    // Obtener timestamp m�s reciente de cualquier registro
    const { data, error } = await window.supabaseClient
      .from('agenda_data')
      .select('id, last_updated')
      .order('last_updated', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('?? Error al verificar cambios:', error);
      return true; // Asumir que hay cambios si hay error
    }

    if (!data || data.length === 0) {

      return false;
    }

    const ultimoTimestampRemoto = data[0].last_updated;

    // Si es la primera verificaci�n, guardar timestamp y no sincronizar
    if (!ultimoTimestampVerificado) {
      ultimoTimestampVerificado = ultimoTimestampRemoto;

      return false;
    }

    // Comparar timestamps
    if (ultimoTimestampRemoto !== ultimoTimestampVerificado) {

      ultimoTimestampVerificado = ultimoTimestampRemoto;
      return true;
    }

    return false;
  } catch (error) {
    console.error('? Error verificando cambios:', error);
    return true; // Asumir que hay cambios por seguridad
  }
}

// Detener sincronizaci�n peri�dica
function detenerSincronizacionPeriodica() {
  if (intervaloSincronizacion) {
    clearInterval(intervaloSincronizacion);
    intervaloSincronizacion = null;

  }
}

window.iniciarSincronizacionPeriodica = iniciarSincronizacionPeriodica;
window.detenerSincronizacionPeriodica = detenerSincronizacionPeriodica;
window.verificarCambiosEnSupabase = verificarCambiosEnSupabase;
