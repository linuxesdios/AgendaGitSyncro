// ========== SUPABASE SYNC ==========
// Sistema de sincronización en la nube sin límites de peticiones

// ========== CONFIGURACIÓN GLOBAL ==========
window.supabaseClient = null;
window.currentSyncMethod = localStorage.getItem('syncMethod') || 'supabase';
window.supabaseRealtimeChannel = null;

// ========== CONFIGURACIÓN DE SUPABASE ==========
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
  console.log('⚡ Configuración de Supabase guardada');
}

// ========== INICIALIZACIÓN DE SUPABASE ==========
async function initSupabase() {
  // Si ya está inicializado, no reinicializar
  if (window.supabaseClient) {
    return true;
  }

  const config = getSupabaseConfig();

  if (!config.url || !config.key) {
    console.warn('⚠️ Configuración de Supabase incompleta');
    return false;
  }

  try {
    // Usar la librería Supabase cargada desde CDN
    const { createClient } = supabase;
    window.supabaseClient = createClient(config.url, config.key);

    console.log('⚡ Supabase inicializado correctamente (nueva instancia)');
    return true;
  } catch (error) {
    console.error('❌ Error inicializando Supabase:', error);
    return false;
  }
}

// ========== FUNCIONES DE INTERFAZ ==========
function guardarConfigSupabase() {
  const urlElement = document.getElementById('supabase-url');
  const keyElement = document.getElementById('supabase-key');
  const serviceKeyElement = document.getElementById('supabase-service-key');

  if (!urlElement || !keyElement) {
    alert('⚠️ Error: Formulario de Supabase no encontrado');
    return;
  }

  const url = urlElement.value;
  const key = keyElement.value;
  const serviceKey = serviceKeyElement ? serviceKeyElement.value : '';

  if (!url || !key) {
    alert('⚠️ URL y Anon Key son obligatorios');
    return;
  }

  saveSupabaseConfig(url, key, serviceKey);
  console.log('✅ Configuración de Supabase guardada');
  showSupabaseStatus('✅ Configuración guardada correctamente', 'success');
}

// ========== FUNCIONES DE INTERFAZ AUXILIARES ==========
function toggleSupabaseKeyVisibility() {
  const keyInput = document.getElementById('supabase-key');
  const toggleButton = document.getElementById('toggle-supabase-key');

  if (!keyInput || !toggleButton) return;

  if (keyInput.type === 'password') {
    keyInput.type = 'text';
    toggleButton.textContent = '🙈';
    toggleButton.title = 'Ocultar contraseña';

    setTimeout(() => {
      if (keyInput.type === 'text') {
        keyInput.type = 'password';
        toggleButton.textContent = '👁️';
        toggleButton.title = 'Mostrar contraseña';
      }
    }, 3000);
  } else {
    keyInput.type = 'password';
    toggleButton.textContent = '👁️';
    toggleButton.title = 'Mostrar contraseña';
  }
}

async function probarConexionSupabase() {
  showSupabaseStatus('🔄 Probando conexión...', 'info');

  const connected = await initSupabase();

  if (connected) {
    try {
      // Probar conexión básica primero
      const { data, error } = await window.supabaseClient
        .from('agenda_data')
        .select('*')
        .limit(1);

      if (error) {
        // Si error es porque la tabla no existe (primera vez)
        if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
          showSupabaseStatus('🆕 Primera vez detectada - Las tablas no existen todavía', 'info');

          // Preguntar automáticamente si quiere crear las tablas
          const shouldCreate = confirm(
            '🆕 ¡Primera vez usando Supabase!\n\n' +
            'Las tablas de la base de datos no existen todavía.\n' +
            '¿Quieres que las cree automáticamente?\n\n' +
            '✅ Sí - Crear tablas y configurar todo\n' +
            '❌ No - Solo verificar conexión'
          );

          if (shouldCreate) {
            showSupabaseStatus('🛠️ Creando tablas automáticamente...', 'info');
            await crearTablasSupabase();
          } else {
            showSupabaseStatus('✅ Conexión básica exitosa - Click "🛠️ Crear Tablas" cuando estés listo', 'success');
          }
          return true; // Conexión exitosa aunque las tablas no existan
        } else {
          throw error;
        }
      } else {
        showSupabaseStatus('✅ Conexión exitosa - Las tablas ya existen y funcionan', 'success');
        return true; // Conexión exitosa
      }
    } catch (error) {
      console.error('❌ Error probando conexión:', error);
      showSupabaseStatus('❌ Error de conexión: ' + error.message, 'error');
      return false; // Error de conexión
    }
  } else {
    showSupabaseStatus('❌ No se pudo inicializar Supabase - Verifica URL y Anon Key', 'error');
    return false; // No se pudo inicializar
  }
}

async function crearTablasSupabase() {
  const connected = await initSupabase();
  if (!connected) {
    showSupabaseStatus('❌ Primero configura Supabase', 'error');
    return;
  }

  showSupabaseStatus('🛠️ Creando estructura de datos...', 'info');

  try {
    // Approach más simple: crear registros directamente
    // Supabase creará la tabla automáticamente con el primer insert si usamos el SQL editor

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
            { nombre: 'trabajo', simbolo: '💼', color: '#3498db' },
            { nombre: 'ocio', simbolo: '🎮', color: '#9b59b6' },
            { nombre: 'médicos', simbolo: '🏥', color: '#e74c3c' }
          ],
          citas: [
            { nombre: 'trabajo', simbolo: '💼', color: '#3498db' },
            { nombre: 'ocio', simbolo: '🎮', color: '#9b59b6' },
            { nombre: 'médicos', simbolo: '🏥', color: '#e74c3c' }
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
          console.warn(`⚠️ Error insertando ${record.id}:`, error);
        }
      } catch (itemError) {
        console.warn(`⚠️ Error con ${record.id}:`, itemError);
      }
    }

    // Verificar que al menos uno se insertó correctamente
    const { data: testData, error: testError } = await window.supabaseClient
      .from('agenda_data')
      .select('id')
      .limit(1);

    if (testError) {
      // Si aún hay error, mostrar instrucciones para crear tabla manualmente
      showSupabaseStatus(
        '⚠️ No se puede crear automáticamente. Crea la tabla manualmente: Ve al SQL Editor de Supabase y ejecuta: CREATE TABLE agenda_data (id text PRIMARY KEY, data jsonb, last_updated timestamp DEFAULT now());',
        'error'
      );

      // También mostrar el popup con instrucciones
      alert(
        '🛠️ INSTRUCCIONES PARA CREAR TABLA MANUALMENTE:\n\n' +
        '1. Ve a tu dashboard de Supabase\n' +
        '2. Click en "SQL Editor" en el menú izquierdo\n' +
        '3. Copia y pega este comando:\n\n' +
        'CREATE TABLE agenda_data (\n' +
        '  id text PRIMARY KEY,\n' +
        '  data jsonb,\n' +
        '  last_updated timestamp DEFAULT now()\n' +
        ');\n\n' +
        '4. Click "Run"\n' +
        '5. Vuelve aquí y prueba la conexión de nuevo'
      );
    } else {
      showSupabaseStatus('✅ ¡Estructura creada! Supabase está listo para usar', 'success');
    }
  } catch (error) {
    console.error('❌ Error creando estructura:', error);

    // Instrucciones claras para el usuario
    showSupabaseStatus('⚠️ Crear manualmente - Ver instrucciones en popup', 'error');

    alert(
      '🛠️ CREAR TABLA MANUALMENTE:\n\n' +
      '1. Ve a supabase.com → tu proyecto\n' +
      '2. Click "SQL Editor" (menú izquierdo)\n' +
      '3. Nueva query y pega:\n\n' +
      'CREATE TABLE agenda_data (\n' +
      '  id text PRIMARY KEY,\n' +
      '  data jsonb,\n' +
      '  last_updated timestamp DEFAULT now()\n' +
      ');\n\n' +
      '4. Click "Run"\n' +
      '5. Vuelve aquí y haz click "Probar" de nuevo'
    );
  }
}

// ========== FUNCIONES DE SINCRONIZACIÓN ==========

// Función para sincronizar datos desde la nube
async function supabasePull() {
  if (window.currentSyncMethod !== 'supabase') return;

  const connected = await initSupabase();
  if (!connected) {
    console.warn('⚠️ Supabase no está configurado');
    return;
  }

  try {
    console.log('📥 PULL: Descargando datos de Supabase...');

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
        console.warn(`⚠️ Error cargando ${collection}:`, error);
        return { collection, data: null };
      }

      return { collection, data: data?.data || {} };
    });

    const results = await Promise.all(promises);

    // Aplicar datos a las variables globales
    results.forEach(({ collection, data }) => {
      switch (collection) {
        case 'tareas':
          window.tareasData = data;
          if (data.tareas_criticas) {
            if (!window.appState.agenda) window.appState.agenda = {}; window.appState.agenda.tareas_criticas = data.tareas_criticas;
            console.log(`  ✅ CARGADO: ${data.tareas_criticas.length} tareas críticas`);
          }
          if (data.tareas) {
            if (!window.appState.agenda) window.appState.agenda = {}; window.appState.agenda.tareas = data.tareas;
            console.log(`  ✅ CARGADO: ${data.tareas.length} tareas normales`);
          }
          if (data.listasPersonalizadas) {
            window.configVisual.listasPersonalizadas = data.listasPersonalizadas;
            console.log(`  ✅ CARGADO: ${data.listasPersonalizadas.length} listas personalizadas`);
          }
          break;
        case 'citas':
          if (data.citas) {
            if (!window.appState.agenda) window.appState.agenda = {};
            window.appState.agenda.citas = data.citas;
            console.log(`  ✅ CARGADO: ${data.citas.length} citas`);
          }
          break;
        case 'config':
          if (data.visual) {
            window.configVisual = { ...window.configVisual, ...data.visual };
            console.log('  ✅ CARGADO: Configuración visual');
          }
          if (data.funcionales) {
            window.configFuncionales = data.funcionales;
            console.log('  ✅ CARGADO: Configuración funcional');
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
            console.log(`  ✅ CARGADO: ${data.lista.length} personas`);
          }
          break;
        case 'etiquetas':
          window.etiquetasData = data;
          if (!window.tareasData) window.tareasData = {};
          if (!window.tareasData.etiquetas) window.tareasData.etiquetas = {};
          window.tareasData.etiquetas = data;
          const totalEtiquetas = (data.tareas?.length || 0) + (data.citas?.length || 0);
          console.log(`  ✅ CARGADO: ${totalEtiquetas} etiquetas`);
          break;
        case 'log':
          if (data.acciones) {
            window.logAcciones = data.acciones;
            console.log(`  ✅ CARGADO: ${data.acciones.length} acciones en log`);
          }
          break;
        case 'salvados':
          window.salvadosData = data;
          break;
      }
    });

    console.log('✅ PULL completado - Datos sincronizados correctamente');

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
    if (typeof window.renderizarPanelCitas === 'function') {
      window.renderizarPanelCitas();
    }
    if (typeof window.renderizarTareas === 'function') {
      window.renderizarTareas();
    }
    if (typeof window.renderizarCriticas === 'function') {
      window.renderizarCriticas();
    }
    if (typeof window.renderizar === 'function') {
      window.renderizar();
    }

    if (typeof window.cargarLog === 'function') {
      window.cargarLog();
    }

    return true;
  } catch (error) {
    console.error('❌ Error en PULL:', error);
    return false;
  }
}

// Función para guardar datos en la nube (CON DETECCIÓN DE CONFLICTOS)
async function supabasePush(isAutomatic = false, skipPullBefore = false, skipConflictCheck = false) {
  if (window.currentSyncMethod !== 'supabase') return;

  const connected = await initSupabase();
  if (!connected) {
    console.warn('⚠️ Supabase no está configurado');
    return;
  }

  // ========== DETECCIÓN DE CONFLICTOS ==========
  if (!skipConflictCheck && typeof getDeviceId === 'function' && typeof showConflictModal === 'function') {
    try {
      console.log('🔍 Verificando deviceId para conflictos...');

      // Obtener metadata actual de Supabase
      const { data: metadataRecord, error: metadataError } = await window.supabaseClient
        .from('agenda_data')
        .select('data')
        .eq('id', '_metadata')
        .single();

      const currentDeviceId = getDeviceId();
      const remoteDeviceId = metadataRecord?.data?._deviceId;

      console.log(`  📱 Device actual: ${currentDeviceId}`);
      console.log(`  ☁️  Device remoto: ${remoteDeviceId || 'ninguno'}`);

      // Si hay un deviceId remoto y es diferente al actual, mostrar modal
      if (remoteDeviceId && remoteDeviceId !== currentDeviceId) {
        console.log('⚠️ ¡CONFLICTO! Último guardado fue desde otro dispositivo');

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

        // Mostrar modal y esperar decisión del usuario
        const resolution = await showConflictModal(localData, remoteData);

        console.log(`  👤 Usuario eligió: ${resolution}`);

        if (resolution === 'cancel') {
          console.log('❌ Push cancelado por el usuario');
          return false;
        } else if (resolution === 'remote') {
          console.log('📥 Usando versión del servidor, descartando cambios locales');
          // Hacer pull para obtener la versión remota
          await supabasePull();
          return true; // No guardar, solo actualizar local
        }
        // Si resolution === 'local', continuar guardando
        console.log('📤 Usando versión local, sobrescribiendo servidor');
      }
    } catch (conflictError) {
      console.warn('⚠️ Error verificando conflictos:', conflictError);
      // Continuar con el guardado normal si hay error
    }
  }

  // ========== PULL ANTES DE PUSH (Opcional) ==========
  if (!skipPullBefore && skipConflictCheck) {
    // Solo hacer pull si no se hizo verificación de conflictos
    console.log('📥 Pull automático antes de guardar...');
    try {
      await supabasePull();
      console.log('✅ Pull completado, procediendo a guardar');
    } catch (error) {
      console.warn('⚠️ Error en Pull antes de Push:', error);
    }
  }

  try {
    const logPrefix = isAutomatic ? '🔄 AUTO-PUSH' : '💾 PUSH';
    console.log(`${logPrefix}: Guardando datos en Supabase...`);

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
          listasPersonalizadas: window.configVisual?.listasPersonalizadas || []
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
        console.error(`  ❌ Error guardando ${id}:`, result.error);
      } else {
        // Log específico por tipo de dato
        let detalle = '';
        if (id === 'tareas') {
          const criticas = data.tareas_criticas?.length || 0;
          const normales = data.tareas?.length || 0;
          const listas = data.listasPersonalizadas?.length || 0;
          detalle = `(${criticas} críticas, ${normales} normales, ${listas} listas)`;
        } else if (id === 'citas') {
          detalle = `(${data.citas?.length || 0} citas)`;
        } else if (id === 'config') {
          detalle = '(visual, funcional, opciones)';
        } else if (id === 'personas') {
          detalle = `(${data.lista?.length || 0} personas)`;
        } else if (id === 'etiquetas') {
          const total = (data.tareas?.length || 0) + (data.citas?.length || 0);
          detalle = `(${total} etiquetas)`;
        } else if (id === 'log') {
          detalle = `(${data.acciones?.length || 0} acciones)`;
        } else if (id === '_metadata') {
          detalle = `(${data._deviceName || 'device info'})`;
        }
        if (detalle) console.log(`  ✅ GUARDADO: ${id} ${detalle}`);
      }
      return result;
    });

    const results = await Promise.all(promises);

    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('❌ Errores al guardar:', errors);
      return false;
    }

    console.log(`✅ ${logPrefix} completado - ${updates.length} colecciones sincronizadas`);

    return true;
  } catch (error) {
    console.error('❌ Error en PUSH:', error);
    return false;
  }
}

// ========== FUNCIONES DE CAMBIO DE MÉTODO ==========
function cambiarMetodoSync(metodo) {
  console.log(`🔄 Cambiando método de sync a: ${metodo}`);

  window.currentSyncMethod = metodo;
  localStorage.setItem('syncMethod', metodo);
  localStorage.setItem('lastSyncMethod', metodo); // Backup adicional

  // Actualizar interfaz
  actualizarInterfazMetodo(metodo);

  // Verificar que el método seleccionado funcione
  setTimeout(() => {
    verificarMetodoSync(metodo);
  }, 1000);

  console.log(`✅ Método guardado en localStorage: ${localStorage.getItem('syncMethod')}`);
}

function actualizarInterfazMetodo(metodo) {
  const statusCurrent = document.getElementById('sync-current');
  const realtimeStatus = document.getElementById('realtime-status');

  if (statusCurrent && realtimeStatus) {
    statusCurrent.textContent = '⚡ Usando Supabase';
    realtimeStatus.textContent = '✅ Activado';
    if (metodo === 'supabase') {
      startSupabaseRealtime();
    }
  }

  // Asegurar que el radio button esté marcado correctamente
  const radioButton = document.querySelector(`input[name="sync-method"][value="${metodo}"]`);
  if (radioButton) {
    radioButton.checked = true;
  }
}

// ========== VERIFICACIÓN DE CONEXIÓN ==========
async function verificarMetodoSync(metodo) {
  console.log(`🔍 Verificando conexión...`);

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
    console.warn(`⚠️ Error verificando conexión:`, error);
    funcionaConexion = false;
  }

  if (!funcionaConexion) {
    console.warn(`⚠️ No hay conexión disponible`);
    actualizarEstadoSincronizacion(`❌ Sin conexión - Configurar Supabase`);
    if (typeof showSupabaseStatus === 'function') {
      showSupabaseStatus('❌ Sin conexión - Verifica configuración de Supabase', 'error');
    }
  } else {
    console.log(`✅ Conexión funcionando correctamente`);
    actualizarEstadoSincronizacion(`✅ Conectado con Supabase`);
  }
}

// Función legacy para compatibilidad
async function intentarFallback(metodoFallido) {
  console.log(`⚠️ Sistema de sincronización no disponible`);
  actualizarEstadoSincronizacion(`❌ Sin conexión - Configurar Supabase`);

  if (typeof showSupabaseStatus === 'function') {
    showSupabaseStatus('❌ Sin conexión - Verifica configuración de Supabase', 'error');
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
          console.log('🔄 Cambio real-time detectado:', payload);
          // Actualizar datos automáticamente
          setTimeout(() => supabasePull(), 100);
        }
      )
      .subscribe();

    console.log('✅ Real-time de Supabase activado');
  } catch (error) {
    console.error('❌ Error activando real-time:', error);
  }
}

function stopSupabaseRealtime() {
  if (window.supabaseRealtimeChannel) {
    window.supabaseClient.removeChannel(window.supabaseRealtimeChannel);
    window.supabaseRealtimeChannel = null;
    console.log('🔇 Real-time de Supabase desactivado');
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

  // Auto-ocultar después de 5 segundos si es éxito
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
}

// ========== INTEGRACIÓN CON EL SISTEMA EXISTENTE ==========

// Funciones globales de sincronización
window.guardarJSON = async function (isAutomatic = false) {
  return await supabasePush(isAutomatic);
};

window.extendsClassPull = async function () {
  return await supabasePull();
};

// ========== CARGAR CONFIGURACIÓN EN FORMULARIOS ==========
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

// Bandera para evitar mostrar el popup múltiples veces
let ayudaSupabaseMostrada = false;

function detectarPrimeraVezSupabase() {
  const config = getSupabaseConfig();

  // Si no tiene configuración de Supabase (URL o Key), mostrar ayuda SIEMPRE
  if (!config.url || !config.key) {
    // ✅ PREVENIR DUPLICADOS: Solo mostrar una vez por sesión
    if (ayudaSupabaseMostrada) {
      console.log('🔔 Ayuda ya mostrada en esta sesión, omitiendo...');
      return;
    }

    console.log('🔔 Supabase no configurado - Mostrando ayuda en 2 segundos...');
    ayudaSupabaseMostrada = true; // Marcar como mostrada

    // Mostrar ayuda después de un delay mayor para que cargue la interfaz
    setTimeout(() => {
      console.log('🔔 Ejecutando mostrarAyudaPrimeraVez()');
      mostrarAyudaPrimeraVez();
    }, 2000); // Aumentado de 500ms a 2000ms
  }
}


function mostrarAyudaPrimeraVez() {
  const shouldShow = confirm(
    '🎉 ¡Bienvenido a la sincronización en la nube!\n\n' +
    'Características de Supabase:\n' +
    '✅ Peticiones ilimitadas\n' +
    '✅ Real-time automático\n' +
    '✅ Rápido y con buen dashboard\n\n' +
    '¿Quieres una guía rápida de 2 minutos para configurarlo?\n\n' +
    'Click "Aceptar" para ver los pasos\n' +
    'Click "Cancelar" para configurar después'
  );

  if (shouldShow) {
    mostrarGuiaRapidaSupabase();
  }
}

function mostrarGuiaRapidaSupabase() {
  alert(
    '🚀 GUÍA RÁPIDA SUPABASE (2 minutos):\n\n' +
    '1️⃣ Ve a supabase.com → "Start your project"\n' +
    '2️⃣ Registrarte (GitHub recomendado)\n' +
    '3️⃣ "New project":\n' +
    '   • Name: agenda-pablo\n' +
    '   • Password: (genera una segura)\n' +
    '   • Region: (la más cercana)\n' +
    '4️⃣ Espera ~2 min que se cree\n' +
    '5️⃣ Settings → API → Copia URL y anon key\n' +
    '6️⃣ Vuelve aquí y pega los datos\n' +
    '7️⃣ Click "Probar" (te preguntará si crear tablas)\n\n' +
    '¡Y listo! Real-time sin límites 🎉'
  );
}

function mostrarEstadoSincronizacion() {
  const configSupabase = getSupabaseConfig();

  if (window.currentSyncMethod === 'supabase' && configSupabase.url) {
    showSupabaseStatus(
      '✅ Usando Supabase - Sin límites de peticiones, real-time activado',
      'success'
    );
  }
}

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Inicializando sistema de sincronización...');

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
    console.log('⚡ Supabase inicializado - Cargando datos...');

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
      console.warn('⚠️ Error al cargar datos:', error);
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

    // Verificar que el método funcione
    setTimeout(() => {
      verificarMetodoSync(savedMethod);

      // Mostrar estado de conexión
      setTimeout(() => {
        mostrarEstadoSincronizacion();
      }, 3000);
    }, 2000);
  }, 500);

  console.log('⚡ Sistema de sincronización inicializado');

  // ========== SINCRONIZACIÓN PERIÓDICA CADA MINUTO ==========
  iniciarSincronizacionPeriodica();
});

// ========== PERSISTENCIA ADICIONAL ==========
// Guardar método cada vez que cambie
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

// Función alias para guardar configuración (llamada desde app.js)
function guardarConfigEnSupabase() {
  console.log('💾 guardarConfigEnSupabase() - Guardando configuración...');
  return supabasePush();
}

// Función wrapper para guardar en Supabase (llamada desde sincronizacion-simple.js)
function guardarEnSupabaseWrapper() {
  console.log('🔄 guardarEnSupabaseWrapper() - Sincronizando datos con Supabase...');

  // Sincronizar personas antes de guardar
  if (window.tareasData && window.tareasData.personas) {
    window.personasAsignadas = [...window.tareasData.personas];
    console.log('👥 Personas sincronizadas:', window.personasAsignadas);
  }

  return supabasePush();
}

// Función para asegurar que la configuración esté cargada desde Supabase
async function asegurarConfiguracionCargada() {
  console.log('⏳ Asegurando que configuración esté cargada desde Supabase...');

  const maxIntentos = 5;
  const delayMs = 300;

  for (let i = 0; i < maxIntentos; i++) {
    // Verificar si ya tenemos configuración cargada
    if (window.configVisual && Object.keys(window.configVisual).length > 0) {
      console.log(`✅ Configuración encontrada en intento ${i + 1}:`, window.configVisual);
      return true;
    }

    console.log(`⏳ Intento ${i + 1}/${maxIntentos}: Configuración no cargada, esperando...`);

    // Si no está cargada y tenemos Supabase configurado, intentar Pull
    if (window.supabaseClient) {
      try {
        console.log('📥 Intentando Pull desde Supabase...');
        await supabasePull();

        // Verificar de nuevo si se cargó
        if (window.configVisual && Object.keys(window.configVisual).length > 0) {
          console.log('✅ Configuración cargada exitosamente después de Pull');
          return true;
        }
      } catch (error) {
        console.warn(`⚠️ Error en Pull intento ${i + 1}:`, error);
      }
    }

    // Esperar antes del siguiente intento
    if (i < maxIntentos - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // Si después de todos los intentos no hay configuración, usar valores por defecto
  console.warn('⚠️ No se pudo cargar configuración desde Supabase, usando valores por defecto');
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

// ========== SISTEMA DE BACKUPS AUTOMÁTICOS ==========

// Generar nombre de backup con fecha y hora
function generarNombreBackup() {
  const ahora = new Date();
  const año = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  const hora = String(ahora.getHours()).padStart(2, '0');
  const minuto = String(ahora.getMinutes()).padStart(2, '0');
  const segundo = String(ahora.getSeconds()).padStart(2, '0');

  return `backup_${año}-${mes}-${dia}_${hora}-${minuto}-${segundo}`;
}

// Guardar backup completo en Supabase
async function guardarBackupAutomatico(esManual = false) {
  const connected = await initSupabase();
  if (!connected) {
    if (esManual) {
      alert('❌ Error: No hay conexión con Supabase.\n\nConfigura Supabase primero.');
    }
    console.warn('⚠️ No se puede crear backup: Supabase no configurado');
    return false;
  }

  try {
    const logPrefix = esManual ? '💾 BACKUP MANUAL' : '🔄 BACKUP AUTOMÁTICO';
    console.log(`${logPrefix}: Creando backup...`);

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
            '⚠️ Tabla de Backups No Existe\n\n' +
            'La tabla "agenda_backups" no existe en tu base de datos.\n\n' +
            '¿Quieres crear la tabla automáticamente?'
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

    console.log(`✅ ${logPrefix} creado: ${backupId}`);

    if (esManual) {
      alert(`✅ Backup Creado\n\n${backupId}\n\nTodos los datos han sido respaldados correctamente.`);
      if (typeof cargarListaBackups === 'function') {
        cargarListaBackups();
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error creando backup:', error);
    if (esManual) {
      alert('❌ Error al crear backup:\n\n' + error.message);
    }
    return false;
  }
}

// Crear tabla de backups en Supabase
async function crearTablaBackups() {
  const connected = await initSupabase();
  if (!connected) {
    alert('❌ Error: No hay conexión con Supabase.');
    return;
  }

  console.log('🛠️ Intentando crear tabla agenda_backups...');

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

    console.log('✅ Tabla agenda_backups creada exitosamente');
    alert('✅ Tabla de Backups Creada\n\nLa tabla se ha creado correctamente. Ahora puedes crear backups.');
    return true;

  } catch (error) {
    console.warn('⚠️ No se pudo crear automáticamente:', error);

    // Mostrar instrucciones manuales
    const sqlQuery = `CREATE TABLE agenda_backups (
  id text PRIMARY KEY,
  created_at timestamp DEFAULT now(),
  data jsonb
);`;

    // Crear un modal más visual con el SQL
    const shouldCopy = confirm(
      '🛠️ CREAR TABLA DE BACKUPS MANUALMENTE:\n\n' +
      '1. Ve a supabase.com → tu proyecto\n' +
      '2. Click "SQL Editor" (menú izquierdo)\n' +
      '3. Click "New query"\n' +
      '4. Pega el código SQL (se copiará al portapapeles)\n' +
      '5. Click "Run"\n' +
      '6. Vuelve aquí y crea tu backup\n\n' +
      '¿Quieres copiar el código SQL al portapapeles?'
    );

    if (shouldCopy) {
      try {
        await navigator.clipboard.writeText(sqlQuery);
        alert('✅ SQL Copiado al Portapapeles\n\nAhora ve a Supabase SQL Editor y pégalo.');
      } catch (err) {
        // Si falla el portapapeles, mostrar el SQL en un alert
        alert(
          '📋 CÓDIGO SQL:\n\n' +
          sqlQuery +
          '\n\n' +
          'Copia este código y ejecútalo en el SQL Editor de Supabase.'
        );
      }
    } else {
      alert(
        '📋 CÓDIGO SQL:\n\n' +
        sqlQuery +
        '\n\n' +
        'Copia este código y ejecútalo en el SQL Editor de Supabase.'
      );
    }

    return false;
  }
}

// Cargar lista de backups disponibles
async function cargarListaBackups() {
  const connected = await initSupabase();
  if (!connected) {
    console.warn('⚠️ No se puede cargar lista de backups: Supabase no configurado');
    return;
  }

  const container = document.getElementById('backups-container');
  if (!container) return;

  try {
    // Obtener todos los backups ordenados por fecha (más recientes primero)
    const { data: backups, error } = await window.supabaseClient
      .from('agenda_backups')
      .select('id, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        container.innerHTML = `
          <div style="text-align:center;padding:40px;">
            <div style="font-size:48px;margin-bottom:10px;">⚠️</div>
            <div style="color:#666;margin-bottom:15px;">La tabla de backups no existe todavía</div>
            <button onclick="crearTablaBackups()" class="btn-primario" style="padding:10px 20px;background:#11998e;color:white;border:none;border-radius:6px;cursor:pointer;">
              🛠️ Crear Tabla de Backups
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
          <div style="font-size:48px;margin-bottom:10px;">📦</div>
          <div>No hay backups disponibles</div>
          <div style="font-size:12px;margin-top:10px;">Crea tu primer backup haciendo click en "💾 Crear Backup Ahora"</div>
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

      // Calcular días desde creación
      const ahora = new Date();
      const diasDesdeCreacion = Math.floor((ahora - fecha) / (1000 * 60 * 60 * 24));
      const colorAntiguedad = diasDesdeCreacion > 7 ? '#e74c3c' : diasDesdeCreacion > 3 ? '#f39c12' : '#27ae60';

      html += `
        <div style="background:white;padding:12px;border-radius:6px;margin-bottom:10px;border-left:4px solid ${colorAntiguedad};display:flex;justify-content:space-between;align-items:center;">
          <div style="flex:1;">
            <div style="font-weight:bold;color:#2d3748;margin-bottom:4px;">📦 ${backup.id}</div>
            <div style="font-size:12px;color:#666;">
              📅 ${fechaFormateada}
              ${diasDesdeCreacion > 0 ? `<span style="margin-left:10px;color:${colorAntiguedad};">• ${diasDesdeCreacion} día${diasDesdeCreacion !== 1 ? 's' : ''}</span>` : '<span style="margin-left:10px;color:#27ae60;">• Hoy</span>'}
            </div>
          </div>
          <div style="display:flex;gap:8px;">
            <button onclick="restaurarBackupDesdeSupabase('${backup.id}')" class="btn-secundario" style="padding:6px 12px;background:#3498db;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">
              ♻️ Restaurar
            </button>
            <button onclick="eliminarBackup('${backup.id}')" class="btn-secundario" style="padding:6px 12px;background:#e74c3c;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;">
              🗑️
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
    console.log(`✅ Lista de backups cargada: ${backups.length} disponibles`);

  } catch (error) {
    console.error('❌ Error cargando lista de backups:', error);
    container.innerHTML = `
      <div style="text-align:center;color:#e74c3c;padding:40px;">
        <div style="font-size:48px;margin-bottom:10px;">❌</div>
        <div>Error al cargar backups</div>
        <div style="font-size:12px;margin-top:10px;">${error.message}</div>
      </div>
    `;
  }
}

// Restaurar backup desde Supabase
async function restaurarBackupDesdeSupabase(backupId) {
  const confirmacion = confirm(
    `⚠️ RESTAURAR BACKUP\n\n` +
    `Backup: ${backupId}\n\n` +
    `Esto reemplazará TODOS tus datos actuales con los del backup.\n\n` +
    `¿Estás seguro de que quieres continuar?`
  );

  if (!confirmacion) {
    console.log('❌ Restauración cancelada por el usuario');
    return;
  }

  const connected = await initSupabase();
  if (!connected) {
    alert('❌ Error: No hay conexión con Supabase.');
    return;
  }

  try {
    console.log(`♻️ Restaurando backup: ${backupId}`);

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
      throw new Error('El backup está vacío o corrupto');
    }

    console.log('📥 Datos del backup obtenidos, restaurando...');

    // Restaurar cada colección
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
          console.warn(`⚠️ Error restaurando ${collection}:`, upsertError);
        } else {
          console.log(`  ✅ ${collection} restaurado`);
          restaurados++;
        }
      } catch (err) {
        console.warn(`⚠️ Error con ${collection}:`, err);
      }
    }

    console.log(`✅ Backup restaurado: ${restaurados}/${collections.length} colecciones`);

    alert(
      `✅ Backup Restaurado\n\n` +
      `Se han restaurado ${restaurados} colecciones.\n\n` +
      `La página se recargará para aplicar los cambios.`
    );

    // Recargar datos y página
    setTimeout(async () => {
      await supabasePull();
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }, 1000);

  } catch (error) {
    console.error('❌ Error restaurando backup:', error);
    alert('❌ Error al restaurar backup:\n\n' + error.message);
  }
}

// Eliminar backup específico
async function eliminarBackup(backupId) {
  const confirmacion = confirm(
    `🗑️ ELIMINAR BACKUP\n\n` +
    `Backup: ${backupId}\n\n` +
    `¿Estás seguro de que quieres eliminar este backup?`
  );

  if (!confirmacion) return;

  const connected = await initSupabase();
  if (!connected) {
    alert('❌ Error: No hay conexión con Supabase.');
    return;
  }

  try {
    const { error } = await window.supabaseClient
      .from('agenda_backups')
      .delete()
      .eq('id', backupId);

    if (error) throw error;

    console.log(`✅ Backup eliminado: ${backupId}`);
    alert(`✅ Backup eliminado correctamente`);

    // Actualizar lista
    cargarListaBackups();

  } catch (error) {
    console.error('❌ Error eliminando backup:', error);
    alert('❌ Error al eliminar backup:\n\n' + error.message);
  }
}

// Limpiar backups antiguos (más de 10 días)
async function limpiarBackupsAntiguos(esAutomatico = false) {
  const connected = await initSupabase();
  if (!connected) {
    if (!esAutomatico) {
      alert('❌ Error: No hay conexión con Supabase.');
    }
    return;
  }

  try {
    console.log('🧹 Limpiando backups antiguos (>10 días)...');

    // Calcular fecha límite (hace 10 días)
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
        console.log('⚠️ Tabla de backups no existe todavía');
        return;
      }
      throw selectError;
    }

    if (!backupsAntiguos || backupsAntiguos.length === 0) {
      console.log('✅ No hay backups antiguos para eliminar');
      if (!esAutomatico) {
        alert('✅ No hay backups antiguos\n\nTodos los backups son recientes (menos de 10 días).');
      }
      return;
    }

    // Eliminar backups antiguos
    const { error: deleteError } = await window.supabaseClient
      .from('agenda_backups')
      .delete()
      .lt('created_at', fechaLimiteISO);

    if (deleteError) throw deleteError;

    console.log(`✅ ${backupsAntiguos.length} backup(s) antiguo(s) eliminado(s)`);

    if (!esAutomatico) {
      alert(`✅ Limpieza Completada\n\n${backupsAntiguos.length} backup(s) antiguo(s) eliminado(s).`);
      // Actualizar lista
      cargarListaBackups();
    }

  } catch (error) {
    console.error('❌ Error limpiando backups antiguos:', error);
    if (!esAutomatico) {
      alert('❌ Error al limpiar backups:\n\n' + error.message);
    }
  }
}

// Verificar y crear backup diario automático
async function verificarBackupDiario() {
  const connected = await initSupabase();
  if (!connected) {
    console.log('⚠️ Backup diario omitido: Supabase no configurado');
    return;
  }

  try {
    const hoy = new Date();
    const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    // Verificar último backup en localStorage
    const ultimoBackup = localStorage.getItem('ultimoBackupDiario');

    if (ultimoBackup === fechaHoy) {
      console.log('✅ Ya existe backup diario para hoy');
      return;
    }

    console.log('🔄 Creando backup diario automático...');
    const exito = await guardarBackupAutomatico(false);

    if (exito) {
      localStorage.setItem('ultimoBackupDiario', fechaHoy);
      console.log('✅ Backup diario creado automáticamente');
    }

  } catch (error) {
    console.error('❌ Error en backup diario automático:', error);
  }
}

// ========== FUNCIONES DE BORRADO DE DATOS ==========

// Borrar todos los datos locales (localStorage)
async function borrarDatosLocales() {
  const confirmacion1 = confirm(
    '⚠️ ADVERTENCIA: Borrar Datos Locales\n\n' +
    'Esto eliminará TODOS los datos guardados en tu navegador:\n' +
    '• Tareas y citas\n' +
    '• Notas y sentimientos\n' +
    '• Contraseñas guardadas\n' +
    '• Configuración visual\n' +
    '• Historial\n\n' +
    'Los datos en la nube (Supabase) NO se verán afectados.\n\n' +
    '¿Estás seguro de que quieres continuar?'
  );

  if (!confirmacion1) {
    console.log('❌ Borrado de datos locales cancelado por el usuario (1ra confirmación)');
    return;
  }

  const confirmacion2 = confirm(
    '🚨 ÚLTIMA CONFIRMACIÓN\n\n' +
    'Esta acción NO se puede deshacer.\n\n' +
    'Todos tus datos locales serán eliminados permanentemente.\n\n' +
    '¿Confirmas que quieres BORRAR TODOS LOS DATOS LOCALES?'
  );

  if (!confirmacion2) {
    console.log('❌ Borrado de datos locales cancelado por el usuario (2da confirmación)');
    return;
  }

  try {
    console.log('🗑️ Iniciando borrado de datos locales...');

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
      console.log(`  ✅ Eliminado: ${key}`);
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

    console.log('✅ Datos locales eliminados completamente');

    alert(
      '✅ Datos Locales Borrados\n\n' +
      'Todos los datos locales han sido eliminados.\n\n' +
      'La página se recargará para aplicar los cambios.'
    );

    // Recargar la página para aplicar cambios
    setTimeout(() => {
      window.location.reload();
    }, 1000);

  } catch (error) {
    console.error('❌ Error borrando datos locales:', error);
    alert('❌ Error al borrar datos locales: ' + error.message);
  }
}

// Borrar todos los datos en la nube (Supabase)
async function borrarDatosNube() {
  const connected = await initSupabase();
  if (!connected) {
    alert('❌ Error: No hay conexión con Supabase.\n\nConfigura Supabase primero.');
    return;
  }

  const confirmacion1 = confirm(
    '⚠️ ADVERTENCIA: Borrar Datos en la Nube\n\n' +
    'Esto eliminará TODOS los datos de tu cuenta de Supabase:\n' +
    '• Tareas y citas\n' +
    '• Notas y sentimientos\n' +
    '• Contraseñas guardadas\n' +
    '• Configuración visual\n' +
    '• Historial\n\n' +
    'Los datos locales en tu navegador NO se verán afectados.\n\n' +
    '¿Estás seguro de que quieres continuar?'
  );

  if (!confirmacion1) {
    console.log('❌ Borrado de datos en nube cancelado por el usuario (1ra confirmación)');
    return;
  }

  const confirmacion2 = confirm(
    '🚨 ÚLTIMA CONFIRMACIÓN\n\n' +
    'Esta acción NO se puede deshacer.\n\n' +
    'Todos tus datos en Supabase serán eliminados permanentemente.\n\n' +
    '¿Confirmas que quieres BORRAR TODOS LOS DATOS EN LA NUBE?'
  );

  if (!confirmacion2) {
    console.log('❌ Borrado de datos en nube cancelado por el usuario (2da confirmación)');
    return;
  }

  try {
    console.log('🗑️ Iniciando borrado de datos en la nube...');

    // Eliminar todas las filas de la tabla agenda_data
    const { error } = await window.supabaseClient
      .from('agenda_data')
      .delete()
      .neq('id', 'IMPOSIBLE_VALOR_PARA_BORRAR_TODO'); // Truco: condición siempre verdadera para borrar todo

    if (error) {
      console.error('❌ Error borrando datos en nube:', error);
      alert('❌ Error al borrar datos en la nube:\n\n' + error.message);
      return;
    }

    console.log('✅ Datos en la nube eliminados completamente');

    alert(
      '✅ Datos en la Nube Borrados\n\n' +
      'Todos los datos en Supabase han sido eliminados.\n\n' +
      'Tus datos locales permanecen intactos.'
    );

  } catch (error) {
    console.error('❌ Error borrando datos en nube:', error);
    alert('❌ Error al borrar datos en la nube: ' + error.message);
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

// ========== SINCRONIZACIÓN PERIÓDICA ==========
let intervaloSincronizacion = null;
let ultimoTimestampVerificado = null;

// Iniciar sincronización periódica (cada minuto)
function iniciarSincronizacionPeriodica() {
  // Limpiar intervalo previo si existe
  if (intervaloSincronizacion) {
    clearInterval(intervaloSincronizacion);
  }

  console.log('🔄 Iniciando sincronización periódica (cada 60 segundos)...');

  // Verificar cambios cada minuto
  intervaloSincronizacion = window.intervaloSincronizacion = setInterval(async () => {
    if (window.currentSyncMethod !== 'supabase') {
      console.log('⏭️ Sincronización periódica omitida: método no es Supabase');
      return;
    }

    const connected = await initSupabase();
    if (!connected) {
      console.log('⏭️ Sincronización periódica omitida: Supabase no conectado');
      return;
    }

    try {
      console.log('🔍 Verificando cambios en Supabase...');

      // Verificar si hay cambios comparando last_updated
      const hayCambios = await verificarCambiosEnSupabase();

      if (hayCambios) {
        console.log('📥 Cambios detectados, descargando datos...');
        await supabasePull();
        console.log('✅ Sincronización periódica completada');
      } else {
        console.log('✅ No hay cambios nuevos');
      }
    } catch (error) {
      console.warn('⚠️ Error en sincronización periódica:', error);
    }
  }, 60000); // 60 segundos = 1 minuto

  console.log('✅ Sincronización periódica activada');
}

// Verificar si hay cambios en Supabase
async function verificarCambiosEnSupabase() {
  try {
    // Obtener timestamp más reciente de cualquier registro
    const { data, error } = await window.supabaseClient
      .from('agenda_data')
      .select('id, last_updated')
      .order('last_updated', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('⚠️ Error al verificar cambios:', error);
      return true; // Asumir que hay cambios si hay error
    }

    if (!data || data.length === 0) {
      console.log('ℹ️ No hay datos en Supabase');
      return false;
    }

    const ultimoTimestampRemoto = data[0].last_updated;

    // Si es la primera verificación, guardar timestamp y no sincronizar
    if (!ultimoTimestampVerificado) {
      ultimoTimestampVerificado = ultimoTimestampRemoto;
      console.log('📝 Timestamp inicial guardado:', ultimoTimestampRemoto);
      return false;
    }

    // Comparar timestamps
    if (ultimoTimestampRemoto !== ultimoTimestampVerificado) {
      console.log('🔄 Cambio detectado:', {
        anterior: ultimoTimestampVerificado,
        nuevo: ultimoTimestampRemoto
      });
      ultimoTimestampVerificado = ultimoTimestampRemoto;
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error verificando cambios:', error);
    return true; // Asumir que hay cambios por seguridad
  }
}

// Detener sincronización periódica
function detenerSincronizacionPeriodica() {
  if (intervaloSincronizacion) {
    clearInterval(intervaloSincronizacion);
    intervaloSincronizacion = null;
    console.log('🛑 Sincronización periódica detenida');
  }
}

window.iniciarSincronizacionPeriodica = iniciarSincronizacionPeriodica;
window.detenerSincronizacionPeriodica = detenerSincronizacionPeriodica;
window.verificarCambiosEnSupabase = verificarCambiosEnSupabase;
