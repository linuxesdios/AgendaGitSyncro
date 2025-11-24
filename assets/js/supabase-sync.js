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
  const url = document.getElementById('supabase-url').value;
  const key = document.getElementById('supabase-key').value;
  const serviceKey = document.getElementById('supabase-service-key').value;

  if (!url || !key) {
    alert('⚠️ URL y Anon Key son obligatorios');
    return;
  }

  saveSupabaseConfig(url, key, serviceKey);
  showSupabaseStatus('✅ Configuración guardada correctamente', 'success');
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
        } else {
          throw error;
        }
      } else {
        showSupabaseStatus('✅ Conexión exitosa - Las tablas ya existen y funcionan', 'success');
      }
    } catch (error) {
      console.error('❌ Error probando conexión:', error);
      showSupabaseStatus('❌ Error de conexión: ' + error.message, 'error');
    }
  } else {
    showSupabaseStatus('❌ No se pudo inicializar Supabase - Verifica URL y Anon Key', 'error');
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
        data: {}
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
    console.log('⚡ ========== SUPABASE PULL ==========');

    // Obtener todas las colecciones en paralelo
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
    console.log('📥 Aplicando datos cargados de Supabase:');
    results.forEach(({ collection, data }) => {
      console.log(`  - ${collection}:`, data);

      switch (collection) {
        case 'tareas':
          window.tareasData = data;
          if (data.tareas_criticas) {
            if (!window.appState.agenda) window.appState.agenda = {}; window.appState.agenda.tareas_criticas = data.tareas_criticas;
            console.log(`    ✅ Tareas críticas cargadas: ${data.tareas_criticas.length}`);
          }
          if (data.tareas) {
            if (!window.appState.agenda) window.appState.agenda = {}; window.appState.agenda.tareas = data.tareas;
            console.log(`    ✅ Tareas normales cargadas: ${data.tareas.length}`);
          }
          if (data.listasPersonalizadas) {
            window.configVisual.listasPersonalizadas = data.listasPersonalizadas;
            console.log(`    ✅ Listas personalizadas cargadas: ${data.listasPersonalizadas.length}`);
          }
          break;
        case 'citas':
          if (data.citas) { if (!window.appState.agenda) window.appState.agenda = {}; window.appState.agenda.citas = data.citas; }
          break;
        case 'config':
          if (data.visual) window.configVisual = { ...window.configVisual, ...data.visual };
          if (data.funcionales) window.configFuncionales = data.funcionales;
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
          if (data.lista) window.personasAsignadas = data.lista;
          break;
        case 'etiquetas':
          window.etiquetasData = data;
          break;
        case 'log':
          if (data.acciones) window.logAcciones = data.acciones;
          break;
        case 'salvados':
          window.salvadosData = data;
          break;
      }
    });

    console.log('✅ Pull de Supabase completado');

    // ✅ FORZAR RENDERIZADO después de que los datos estén cargados
    setTimeout(() => {
      console.log('🎨 Forzando renderizado DESPUÉS del pull...');

      // Recargar datos en la interfaz
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

      // Aplicar configuración visual cargada
      if (typeof window.cargarConfigVisual === 'function') {
        console.log('🎨 Aplicando configuración visual desde Supabase...');
        window.cargarConfigVisual();
      }

      if (typeof window.aplicarVisibilidadSecciones === 'function') {
        window.aplicarVisibilidadSecciones();
      }

      // Actualizar log si está visible
      if (typeof window.cargarLog === 'function') {
        window.cargarLog();
      }

      console.log('✅ Renderizado forzado completado');
    }, 100);

    return true;
  } catch (error) {
    console.error('❌ Error en supabasePull:', error);
    return false;
  }
}

// Función para guardar datos en la nube
async function supabasePush(isAutomatic = false) {
  if (window.currentSyncMethod !== 'supabase') return;

  const connected = await initSupabase();
  if (!connected) {
    console.warn('⚠️ Supabase no está configurado');
    return;
  }

  try {
    const logPrefix = isAutomatic ? '🔄 [AUTO-SYNC SUPABASE]' : '💾 [MANUAL SYNC SUPABASE]';
    console.log(`${logPrefix} Iniciando...`);

    // Preparar datos para sincronización
    console.log('💾 Preparando datos para Supabase:');
    console.log('  - Tareas críticas:', window.appState?.agenda?.tareas_criticas?.length || 0);
    console.log('  - Tareas normales:', window.appState?.agenda?.tareas?.length || 0);
    console.log('  - Listas personalizadas:', window.configVisual?.listasPersonalizadas?.length || 0);

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
        id: 'log',
        data: { acciones: window.logAcciones || [] }
      }
    ];

    // Hacer upserts (insert o update)
    const promises = updates.map(async ({ id, data }) => {
      console.log(`  - Guardando ${id}:`, data);
      const result = await window.supabaseClient
        .from('agenda_data')
        .upsert({ id, data }, { onConflict: 'id' });

      if (result.error) {
        console.error(`    ❌ Error guardando ${id}:`, result.error);
      } else {
        console.log(`    ✅ ${id} guardado correctamente`);
      }
      return result;
    });

    const results = await Promise.all(promises);

    // Verificar que no haya errores
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('❌ Errores al guardar:', errors);
      return false;
    }

    console.log(`${logPrefix} ✅ Completado - ${updates.length} colecciones guardadas`);

    // Verificar que los datos se guardaron correctamente (solo para tareas)
    if (!isAutomatic) {
      setTimeout(async () => {
        try {
          const { data: verificacion, error } = await window.supabaseClient
            .from('agenda_data')
            .select('*')
            .eq('id', 'tareas')
            .single();

          if (!error && verificacion) {
            console.log('🔍 Verificación post-guardado:', verificacion.data);
          }
        } catch (e) {
          console.warn('⚠️ Error en verificación post-guardado:', e);
        }
      }, 1000);
    }

    return true;
  } catch (error) {
    console.error('❌ Error en supabasePush:', error);
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

function detectarPrimeraVezSupabase() {
  const config = getSupabaseConfig();
  const hasSeenSupabaseHelp = localStorage.getItem('supabase_help_shown');

  // Si no tiene configuración Y nunca ha visto la ayuda
  if (!config.url && !hasSeenSupabaseHelp) {
    // Marcar que ya vio la ayuda
    localStorage.setItem('supabase_help_shown', 'true');

    // Mostrar ayuda después de un pequeño delay para que cargue la interfaz
    setTimeout(() => {
      mostrarAyudaPrimeraVez();
    }, 500);
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
    console.log('📝 Variables globales de appState inicializadas');
  }

  if (!window.configVisual) {
    window.configVisual = {
      listasPersonalizadas: []
    };
    console.log('📝 Variables globales de configVisual inicializadas');
  }

  // Cargar configuración guardada
  cargarConfigSupabaseEnFormulario();

  // Cargar método de sincronización guardado
  const savedMethod = localStorage.getItem('syncMethod') || localStorage.getItem('lastSyncMethod') || 'supabase';
  console.log(`📥 Método guardado en localStorage: ${savedMethod}`);

  // Establecer método actual
  window.currentSyncMethod = savedMethod;

  // Inicializar configuraciones si existen (sin duplicar)
  const configSupabase = getSupabaseConfig();
  if (configSupabase.url && configSupabase.key && !window.supabaseClient) {
    await initSupabase();
    console.log('⚡ Supabase inicializado en startup');

    // 🔄 PULL AUTOMÁTICO: Cargar datos desde Supabase
    console.log('📥 Cargando datos desde Supabase...');
    try {
      await supabasePull();
      console.log('✅ Datos cargados automáticamente desde Supabase');
    } catch (error) {
      console.warn('⚠️ Error al cargar datos:', error);
    }
  }

  // Esperar un poco para que se cargue la interfaz
  setTimeout(() => {
    // Activar método seleccionado en la interfaz
    const radioButton = document.querySelector(`input[name="sync-method"][value="${savedMethod}"]`);
    if (radioButton) {
      radioButton.checked = true;
      console.log(`✅ Radio button marcado: ${savedMethod}`);
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
window.initSupabase = initSupabase;
window.cargarConfigSupabaseEnFormulario = cargarConfigSupabaseEnFormulario;
window.verificarMetodoSync = verificarMetodoSync;
window.intentarFallback = intentarFallback;
window.actualizarInterfazMetodo = actualizarInterfazMetodo;
window.mostrarEstadoSincronizacion = mostrarEstadoSincronizacion;



