// ========== SINCRONIZACIÓN GITHUB ==========

function getSyncConfig() {
  const cfg = JSON.parse(localStorage.getItem('github-sync-config') || '{}');
  const token = sessionStorage.getItem('github-sync-token') || localStorage.getItem('github-sync-token');
  return { repo: cfg.repo, path: cfg.path || 'agenda.xml', history: cfg.history || 'historial.json', branch: cfg.branch || 'main', token };
}

async function githubPull() {
  const { repo, path, history, branch, token } = getSyncConfig();
  if (!repo || !path || !token) {
    mostrarAlerta('Configura repo/path/token primero', 'info');
    return;
  }
  
  // Función de pull con reintentos
  const pullConReintentos = async (maxReintentos = 5) => {
    let ultimoError = null;
    
    for (let intento = 1; intento <= maxReintentos; intento++) {
      try {
        console.log(`⏳ Intento ${intento}/${maxReintentos} - Verificando GitHub...`);
        
        const [ghOwner, ghRepo] = repo.split('/');
        if (!ghOwner || !ghRepo) {
          throw new Error('Formato de repositorio inválido. Debe ser "usuario/repositorio"');
        }
        
        const url = `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}&_t=${Date.now()}`;
        
        // Obtener el archivo con metadatos
        const metaR = await fetch(url, {
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (metaR.status === 404) {
          console.log(`⏳ Intento ${intento}/${maxReintentos} - Creando archivo...`);
          
          // Crear JSON inicial
          const jsonInicial = {
            fecha: new Date().toISOString().slice(0, 10),
            dia_semana: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date().getDay()],
            tareas_criticas: [],
            tareas: [],
            notas: [],
            citas: []
          };
          
          const createR = await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
              message: `Creación inicial de agenda (intento ${intento})`,
              content: btoa(JSON.stringify(jsonInicial, null, 2)),
              branch: branch
            })
          });
          
          if (createR.ok) {
            procesarJSON(jsonInicial);
            const mensaje = intento === 1 ? 
              '✅ Nueva agenda creada en GitHub' : 
              `✅ Nueva agenda creada (tras ${intento} intentos)`;
            mostrarAlerta('✨ Nueva agenda creada y sincronizada', 'success');
            return;
          } else {
            throw new Error('Error al crear archivo: HTTP ' + createR.status);
          }
        }

        if (!metaR.ok) {
          throw new Error('HTTP ' + metaR.status);
        }

        // Obtener los metadatos y contenido
        const response = await metaR.json();
        console.log(`SHA del archivo (intento ${intento}):`, response.sha);
        
        // Decodificar correctamente UTF-8 desde base64
        let content;
        if (response.content && response.encoding === 'base64') {
          const base64Content = response.content.replace(/\n/g, '');
          const binaryString = atob(base64Content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          content = new TextDecoder('utf-8').decode(bytes);
        } else {
          throw new Error('No se pudo obtener el contenido del archivo');
        }
        
        console.log(`Contenido recibido (intento ${intento}):`, content.substring(0, 200) + '...');
        
        let data;
        // Detectar si es XML o JSON
        if (content.trim().startsWith('<?xml') || content.trim().startsWith('<agenda')) {
          // Es XML, convertir a JSON
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, 'text/xml');
          data = convertXMLtoJSON(xmlDoc);
          console.log('XML convertido a JSON:', data);
        } else {
          // Es JSON
          try {
            data = JSON.parse(content);
          } catch (parseError) {
            console.error('Error al parsear JSON:', parseError, 'Contenido recibido:', content);
            throw new Error('El archivo no contiene JSON válido: ' + parseError.message);
          }
        }
        
        // Almacenar el SHA actual del archivo
        if (response && response.sha) {
          window.currentSHA = response.sha;
          console.log(`SHA actualizado (intento ${intento}):`, window.currentSHA);
        }
        
        procesarJSON(data);
        const mensaje = intento === 1 ? 
          '✅ Agenda sincronizada desde GitHub' : 
          `✅ Agenda sincronizada (tras ${intento} intentos)`;
        mostrarAlerta('🔄 Datos cargados desde GitHub', 'success');
        return;
        
      } catch (error) {
        ultimoError = error;
        console.error(`❌ Error en intento ${intento}:`, error);
        
        // Si no es el último intento, esperar y continuar
        if (intento < maxReintentos) {
          const tiempoEspera = Math.min(1000 * Math.pow(2, intento - 1), 5000);
          console.log(`⏳ Esperando ${tiempoEspera}ms antes del siguiente intento...`);
          await new Promise(resolve => setTimeout(resolve, tiempoEspera));
          continue;
        }
      }
    }
    
    // Si llegamos aquí, todos los intentos fallaron
    throw ultimoError;
  };
  
  try {
    await pullConReintentos();
  } catch (e) {
    console.error('❌ Error final en githubPull:', e);
    mostrarAlerta('⚠️ Error al sincronizar con GitHub tras múltiples intentos', 'error');
  }
}

async function guardarJSON(silent = false) {
  // Si ya hay un guardado en proceso, agregar a la cola
  if (appState.sync.isSaving) {
    appState.sync.saveQueue.push({ silent });
    return;
  }
  
  appState.sync.isSaving = true;
  
  try {
    // Actualizar notas y preparar JSON
    appState.agenda.notas = document
      .getElementById('notas-texto')
      .value.split('\n')
      .filter(nota => nota.trim());

    // Crear objeto JSON para guardar
    const jsonData = {
      fecha: appState.agenda.fecha,
      dia_semana: appState.agenda.dia_semana,
      tareas_criticas: appState.agenda.tareas_criticas.map(t => ({
        id: t.id,
        titulo: t.titulo,
        razon: t.razon,
        fecha_fin: t.fecha_fin || null,
        completada: t.completada,
        estado: t.estado,
        persona: t.persona || null,
        fecha_migrar: t.fecha_migrar || null,
        subtareas: t.subtareas || [],
        subtareasCollapsed: t.subtareasCollapsed || false
      })),
      tareas: appState.agenda.tareas.map(t => ({
        id: t.id,
        texto: t.texto,
        fecha_fin: t.fecha_fin || null,
        completada: t.completada,
        estado: t.estado,
        persona: t.persona || null,
        fecha_migrar: t.fecha_migrar || null,
        subtareas: t.subtareas || [],
        subtareasCollapsed: t.subtareasCollapsed || false
      })),
      notas: appState.agenda.notas,
      citas: appState.agenda.citas,
      personas: appState.agenda.personas || []
    };

    // Obtener configuración de sincronización
    const { repo, path, history, branch, token } = getSyncConfig();
    if (!repo || !path || !token) {
      mostrarAlerta('⚠️ Configura GitHub primero (botón Configuración)', 'info');
      return;
    }

    const [repoOwner, repoName] = repo.split('/');
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${encodeURIComponent(path)}`;

    // Función principal de guardado con reintentos automáticos
    const guardarConReintentos = async (maxReintentos = 5) => {
      let ultimoError = null;
      
      for (let intento = 1; intento <= maxReintentos; intento++) {
        try {
          console.log(`🔄 Intento ${intento}/${maxReintentos} de sincronización con GitHub`);
          console.log('📤 DATOS QUE SE VAN A ENVIAR:', {
            total_tareas: jsonData.tareas.length,
            total_criticas: jsonData.tareas_criticas.length,
            ultimas_3_tareas: jsonData.tareas.slice(-3).map(t => ({id: t.id, texto: t.texto}))
          });
          
          // Obtener SHA más reciente antes de cada intento
          let sha = null;
          try {
            const getR = await fetch(apiUrl + `?_t=${Date.now()}`, {
              cache: 'no-store',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
              }
            });
            
            if (getR.ok) {
              const meta = await getR.json();
              sha = meta.sha;
              console.log(`SHA obtenido en intento ${intento}:`, sha);
            } else if (getR.status !== 404) {
              throw new Error(`Error al obtener metadatos: ${getR.status}`);
            }
          } catch (metaError) {
            console.warn(`Error al obtener metadatos en intento ${intento}:`, metaError);
            if (intento === maxReintentos) throw metaError;
            continue;
          }
          
          // Determinar formato según la extensión del archivo
          let contentString;
          if (path.toLowerCase().endsWith('.xml')) {
            contentString = convertJSONtoXML(jsonData);
            console.log('📄 XML GENERADO - Últimas 3 tareas en XML:');
            const xmlLines = contentString.split('\n').filter(line => line.includes('<tarea id='));
            xmlLines.slice(-3).forEach(line => console.log('   ', line.trim()));
          } else {
            contentString = JSON.stringify(jsonData, null, 2);
          }
          
          // Codificar correctamente UTF-8 para caracteres españoles
          const utf8Bytes = new TextEncoder().encode(contentString);
          const base64Content = btoa(String.fromCharCode(...utf8Bytes));
          
          const body = {
            message: `Actualización desde agenda web (intento ${intento}/${maxReintentos})`,
            content: base64Content,
            branch: branch
          };
          
          if (sha) {
            body.sha = sha;
          }

          // Intentar guardar
          const putR = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(body)
          });

          if (putR.ok) {
            // ¡Éxito! Actualizar SHA global
            const result = await putR.json();
            if (result.content && result.content.sha) {
              window.currentSHA = result.content.sha;
              console.log(`✅ GUARDADO EXITOSO en intento ${intento}`);
              console.log(`📤 SHA ENVIADO A GITHUB:`, window.currentSHA);
              console.log(`📤 CONFIRMACION - Tareas guardadas:`, jsonData.tareas.length);

              // Delay adicional después de guardado exitoso para asegurar propagación GitHub CDN
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            if (!silent) {
              const mensaje = intento === 1 ? 
                '💾 Guardado en GitHub' : 
                `💾 Guardado en GitHub (tras ${intento} intentos)`;
              mostrarAlerta(mensaje, 'success');
            }
            
            return; // Salir exitosamente
          } else {
            const errorText = await putR.text();
            const error = new Error(`Error ${putR.status}: ${errorText}`);
            ultimoError = error;
            
            // Si es un conflicto 409 o error de red, reintentar
            if (putR.status === 409 || putR.status >= 500) {
              console.warn(`⚠️ Error ${putR.status} en intento ${intento}, reintentando...`);
              
              // Esperar un poco antes del siguiente intento (backoff exponencial)
              const tiempoEspera = Math.min(1000 * Math.pow(2, intento - 1), 5000);
              await new Promise(resolve => setTimeout(resolve, tiempoEspera));
              
              continue; // Reintentar
            } else {
              // Error no recuperable
              throw error;
            }
          }
        } catch (error) {
          ultimoError = error;
          console.error(`❌ Error en intento ${intento}:`, error);
          
          // Si no es el último intento, esperar y continuar
          if (intento < maxReintentos) {
            const tiempoEspera = Math.min(1000 * Math.pow(2, intento - 1), 5000);
            console.log(`⏳ Esperando ${tiempoEspera}ms antes del siguiente intento...`);
            await new Promise(resolve => setTimeout(resolve, tiempoEspera));
            continue;
          }
        }
      }
      
      // Si llegamos aquí, todos los intentos fallaron
      throw new Error(`Falló la sincronización tras ${maxReintentos} intentos. Último error: ${ultimoError?.message || 'Error desconocido'}`);
    };

    // Ejecutar guardado con reintentos
    await guardarConReintentos();

  } catch (err) {
    console.error('❌ Error final al guardar en GitHub:', err);
    mostrarAlerta(
      '❌ Error al sincronizar: ' + (err.message || 'Verifica tu configuración de GitHub'),
      'error'
    );
    
    // Mostrar información adicional sobre reintentos
    console.log('💡 La aplicación reintentará automáticamente la sincronización en las próximas operaciones');
  } finally {
    appState.sync.isSaving = false;
    
    // Procesar siguiente elemento de la cola si existe
    if (appState.sync.saveQueue.length > 0) {
      const nextSave = appState.sync.saveQueue.shift();
      guardarJSON(nextSave.silent);
    }
  }
}

// ========== PROCESAR JSON ==========
function procesarJSON(data) {
  // Solo procesar si hay datos válidos
  if (!data || Object.keys(data).length === 0) {
    console.log('No hay datos para procesar, manteniendo estado actual');
    return;
  }
  
  console.log('Procesando datos recibidos:', data);
  

  
  // Actualizar datos básicos
  if (data.fecha) appState.agenda.fecha = data.fecha;
  if (data.dia_semana) appState.agenda.dia_semana = data.dia_semana;
  
  // Actualizar citas del calendario
  if (data.citas !== undefined) {
    appState.agenda.citas = Array.isArray(data.citas) ? data.citas.map(c => ({
      fecha: c.fecha,
      nombre: c.nombre || ''
    })) : [];
  }
  
  // Actualizar personas
  if (data.personas !== undefined) {
    appState.agenda.personas = Array.isArray(data.personas) ? data.personas : [];
  }
  
  // Actualizar tareas críticas
  if (data.tareas_criticas !== undefined) {
    appState.agenda.tareas_criticas = Array.isArray(data.tareas_criticas) ? data.tareas_criticas.map(t => ({
      id: t.id || Date.now().toString(),
      titulo: t.titulo || '',
      razon: t.razon || '',
      fecha_fin: t.fecha_fin || '',
      completada: Boolean(t.completada),
      estado: t.estado || (t.completada ? 'completada' : 'pendiente'),
      persona: t.persona || null,
      fecha_migrar: t.fecha_migrar || null,
      subtareas: t.subtareas || [],
      subtareasCollapsed: t.subtareasCollapsed || false
    })) : [];
  }

  // Actualizar tareas normales
  if (data.tareas !== undefined) {
    appState.agenda.tareas = Array.isArray(data.tareas) ? data.tareas.map(t => ({
      id: t.id || Date.now().toString() + Math.random(),
      texto: t.texto || '',
      fecha_fin: t.fecha_fin || '',
      completada: Boolean(t.completada),
      estado: t.estado || (t.completada ? 'completada' : 'pendiente'),
      persona: t.persona || null,
      fecha_migrar: t.fecha_migrar || null,
      subtareas: t.subtareas || [],
      subtareasCollapsed: t.subtareasCollapsed || false
    })) : [];
  }

  // Actualizar notas (incluso si está vacío para limpiar)
  if (data.notas !== undefined) {
    const notasTexto = Array.isArray(data.notas) ? data.notas.join('\n') : (data.notas || '');
    appState.agenda.notas = notasTexto;
    const notasEl = document.getElementById('notas-texto');
    if (notasEl) {
      notasEl.value = appState.agenda.notas;
      autoResizeTextarea(notasEl);
    }
  }

  console.log('Estado actualizado:', appState.agenda);
  renderizar();
}

// ========== CONVERTIR JSON A XML ==========
function convertJSONtoXML(data) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<agenda fecha="${data.fecha}" dia_semana="${data.dia_semana}">\n`;
  
  // Tareas críticas (MIT)
  xml += '  <mit>\n';
  if (data.tareas_criticas && data.tareas_criticas.length > 0) {
    data.tareas_criticas.forEach(tarea => {
      xml += `    <tarea id="${tarea.id}" fecha_fin="${tarea.fecha_fin || ''}" completada="${tarea.completada}">`;
      xml += `\n      <titulo>${escapeXml(tarea.titulo)}</titulo>`;
      xml += `\n      <razon>${escapeXml(tarea.razon || '')}</razon>`;
      if (tarea.persona) xml += `\n      <persona>${escapeXml(tarea.persona)}</persona>`;
      if (tarea.fecha_migrar) xml += `\n      <fecha_migrar>${tarea.fecha_migrar}</fecha_migrar>`;
      xml += '\n    </tarea>\n';
    });
  }
  xml += '  </mit>\n';
  
  // Tareas normales (medianas)
  xml += '  <medianas>\n';
  if (data.tareas && data.tareas.length > 0) {
    data.tareas.forEach(tarea => {
      xml += `    <tarea id="${tarea.id}" fecha_fin="${tarea.fecha_fin || ''}" completada="${tarea.completada}"`;
      if (tarea.persona) xml += ` persona="${escapeXml(tarea.persona)}"`;
      if (tarea.fecha_migrar) xml += ` fecha="${tarea.fecha_migrar}"`;
      xml += `>${escapeXml(tarea.texto)}</tarea>\n`;
    });
  }
  xml += '  </medianas>\n';
  
  // Notas
  xml += '  <notas>\n';
  if (data.notas && Array.isArray(data.notas)) {
    data.notas.forEach(nota => {
      xml += `    <nota>${escapeXml(nota)}</nota>\n`;
    });
  } else if (data.notas && typeof data.notas === 'string') {
    data.notas.split('\n').filter(n => n.trim()).forEach(nota => {
      xml += `    <nota>${escapeXml(nota)}</nota>\n`;
    });
  }
  xml += '  </notas>\n';
  
  // Citas
  xml += '  <citas>\n';
  if (data.citas && data.citas.length > 0) {
    data.citas.forEach(cita => {
      xml += `    <cita fecha="${cita.fecha}" nombre="${escapeXml(cita.nombre)}"></cita>\n`;
    });
  }
  xml += '  </citas>\n';
  
  xml += '</agenda>';
  return xml;
}

// ========== CONVERTIR XML A JSON ==========
function convertXMLtoJSON(xmlDoc) {
  const data = {
    fecha: new Date().toISOString().slice(0, 10),
    dia_semana: '',
    tareas_criticas: [],
    tareas: [],
    notas: '',
    citas: []
  };
  
  // Obtener fecha del día
  const dia = xmlDoc.querySelector('dia');
  if (dia) {
    data.fecha = dia.getAttribute('fecha') || data.fecha;
    data.dia_semana = dia.getAttribute('dia_semana') || '';
  }
  
  // Obtener tareas críticas (MIT)
  const mitTareas = xmlDoc.querySelectorAll('mit > tarea');
  data.tareas_criticas = Array.from(mitTareas).map(t => ({
    id: t.getAttribute('id') || Date.now().toString(),
    titulo: t.querySelector('titulo')?.textContent || '',
    razon: t.querySelector('razon')?.textContent || '',
    fecha_fin: t.getAttribute('fecha_fin') || '',
    completada: t.getAttribute('completada') === 'true',
    estado: t.getAttribute('completada') === 'true' ? 'completada' : 'pendiente'
  }));
  
  // Obtener tareas normales (medianas)
  const medianas = xmlDoc.querySelectorAll('medianas > tarea');
  data.tareas = Array.from(medianas).map(t => ({
    id: t.getAttribute('id') || Date.now().toString(),  // ✅ Usar ID existente del XML
    texto: t.textContent.trim(),
    fecha_fin: t.getAttribute('fecha_fin') || '',
    completada: t.getAttribute('completada') === 'true',
    estado: t.getAttribute('completada') === 'true' ? 'completada' : 'pendiente',
    persona: t.getAttribute('persona') || null,
    fecha_migrar: t.getAttribute('fecha') || null
  }));
  
  // Obtener notas
  const notas = xmlDoc.querySelectorAll('notas > nota');
  data.notas = Array.from(notas).map(n => n.textContent).join('\n');
  
  // Obtener citas
  const citas = xmlDoc.querySelectorAll('citas > cita');
  data.citas = Array.from(citas).map(c => ({
    fecha: c.getAttribute('fecha'),
    nombre: c.getAttribute('nombre') || c.textContent || ''
  }));
  
  return data;
}

// ========== CONFIGURACIÓN ==========
function toggleConfigFloating() {
  cargarConfiguracionesModal();
  abrirModal('modal-config');
}

function cargarConfiguracionesModal() {
  // Cargar config GitHub
  const githubConfig = JSON.parse(localStorage.getItem('github-sync-config') || '{}');
  const token = sessionStorage.getItem('github-sync-token') || localStorage.getItem('github-sync-token');
  
  document.getElementById('config-repo').value = githubConfig.repo || '';
  document.getElementById('config-agenda-file').value = githubConfig.path || 'agenda.xml';
  document.getElementById('config-token').value = token || '';
  
  // Cargar configuración de opciones
  const configOpciones = JSON.parse(localStorage.getItem('config-opciones') || '{}');
  document.getElementById('config-forzar-fecha').checked = configOpciones.forzarFecha || false;
  document.getElementById('config-sin-tactil').checked = configOpciones.sinTactil || false;
  document.getElementById('config-mostrar-todo').checked = configOpciones.mostrarTodo || false;
  document.getElementById('config-botones-borrar').checked = configOpciones.botonesBorrar || false;
  
  // Cargar configuración visual
  const configVisual = JSON.parse(localStorage.getItem('config-visual') || '{}');
  document.getElementById('config-tema-select').value = configVisual.tema || 'claro';
  document.getElementById('config-nombre-input').value = configVisual.nombre || 'Pablo';
  if (configVisual.frases) {
    document.getElementById('config-frases').value = configVisual.frases.join('\n');
  }
}

function guardarConfigGitHub() {
  const repo = document.getElementById('config-repo').value.trim();
  const agendaFile = document.getElementById('config-agenda-file').value.trim() || 'agenda.xml';
  const token = document.getElementById('config-token').value.trim();
  
  if (!repo || !repo.includes('/')) {
    mostrarStatusGitHub('⚠️ Formato: usuario/repo', 'error');
    return;
  }
  
  if (!token || !token.startsWith('ghp_')) {
    mostrarStatusGitHub('⚠️ Token inválido', 'error');
    return;
  }
  
  // Guardar configuración
  localStorage.setItem('github-sync-config', JSON.stringify({ 
    repo, 
    path: agendaFile, 
    history: 'historial.json', 
    branch: 'main' 
  }));
  localStorage.setItem('github-sync-token', token);
  
  mostrarStatusGitHub('✅ Guardado', 'success');
}

async function probarConexionGitHub() {
  const repo = document.getElementById('config-repo').value.trim();
  const token = document.getElementById('config-token').value.trim();
  
  if (!repo || !token) {
    mostrarStatusGitHub('⚠️ Completa repo y token', 'error');
    return;
  }
  
  mostrarStatusGitHub('🔍 Probando conexión...', 'info');
  
  try {
    const [owner, repoName] = repo.split('/');
    const testUrl = `https://api.github.com/repos/${owner}/${repoName}`;
    const response = await fetch(testUrl + `?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (response.ok) {
      mostrarStatusGitHub('✅ Conexión exitosa', 'success');
    } else if (response.status === 404) {
      mostrarStatusGitHub('❌ Repositorio no encontrado', 'error');
    } else if (response.status === 401) {
      mostrarStatusGitHub('❌ Token inválido', 'error');
    } else {
      mostrarStatusGitHub(`❌ Error: ${response.status}`, 'error');
    }
  } catch (error) {
    mostrarStatusGitHub('❌ Error de conexión', 'error');
  }
}

function mostrarStatusGitHub(mensaje, tipo) {
  const status = document.getElementById('github-status');
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

// ========== CONFIGURACIÓN VISUAL ==========
function cargarConfigVisual() {
  const config = JSON.parse(localStorage.getItem('config-visual') || '{}');
  const frasesDefault = [
    'El éxito es la suma de pequeños esfuerzos repetidos día tras día',
    'Cada día es una nueva oportunidad para mejorar',
    'La disciplina es el puente entre metas y logros',
    'No esperes el momento perfecto, toma el momento y hazlo perfecto',
    'El progreso, no la perfección, es lo que debemos buscar'
  ];
  
  const configDefault = {
    tema: config.tema || 'claro',
    nombre: config.nombre || 'Pablo',
    frases: config.frases || frasesDefault
  };
  aplicarConfigVisual(configDefault);
}

function aplicarConfigVisual(config) {
  // Aplicar tema
  if (config.tema === 'oscuro') {
    document.body.classList.add('modo-oscuro');
  } else {
    document.body.classList.remove('modo-oscuro');
  }
  
  // Aplicar nombre
  document.getElementById('titulo-agenda').textContent = `🧠 ${config.nombre} 🚆`;
  
  // Aplicar frase motivacional aleatoria
  if (config.frases && config.frases.length > 0) {
    const fraseAleatoria = config.frases[Math.floor(Math.random() * config.frases.length)];
    document.getElementById('frase-motivacional').textContent = `"${fraseAleatoria}"`;
  }
}

function cambiarFraseMotivacional() {
  const config = JSON.parse(localStorage.getItem('config-visual') || '{}');
  const frasesDefault = [
    'El éxito es la suma de pequeños esfuerzos repetidos día tras día',
    'Cada día es una nueva oportunidad para mejorar',
    'La disciplina es el puente entre metas y logros',
    'No esperes el momento perfecto, toma el momento y hazlo perfecto',
    'El progreso, no la perfección, es lo que debemos buscar'
  ];
  
  const frases = config.frases || frasesDefault;
  if (frases.length > 0) {
    const fraseAleatoria = frases[Math.floor(Math.random() * frases.length)];
    document.getElementById('frase-motivacional').textContent = `"${fraseAleatoria}"`;
  }
}

// ========== FUNCIONES DE PESTAÑAS ==========
function switchTab(tabName) {
  // Ocultar todas las pestañas
  document.querySelectorAll('.config-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  // Mostrar la pestaña seleccionada
  document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

function guardarConfigVisualPanel() {
  const tema = document.getElementById('config-tema-select').value;
  const nombre = document.getElementById('config-nombre-input').value.trim() || 'Pablo';
  const frasesTexto = document.getElementById('config-frases').value.trim();
  const frases = frasesTexto ? frasesTexto.split('\n').filter(f => f.trim()) : [];
  
  const config = { tema, nombre, frases };
  localStorage.setItem('config-visual', JSON.stringify(config));
  
  aplicarConfigVisual(config);
  mostrarAlerta('✨ Configuración aplicada', 'success');
}

function guardarConfigOpciones() {
  const config = {
    forzarFecha: document.getElementById('config-forzar-fecha').checked,
    sinTactil: document.getElementById('config-sin-tactil').checked,
    mostrarTodo: document.getElementById('config-mostrar-todo').checked,
    botonesBorrar: document.getElementById('config-botones-borrar').checked
  };
  localStorage.setItem('config-opciones', JSON.stringify(config));
  mostrarAlerta('⚙️ Opciones guardadas', 'success');
}

// ========== FUNCIONES DE HISTORIAL ==========
async function verHistorial() {
  const { repo, history, branch, token } = getSyncConfig();
  if (!repo || !history || !token) {
    mostrarAlerta('⚠️ Configura GitHub primero para ver el historial', 'info');
    return;
  }
  
  try {
    const [repoOwner, repoName] = repo.split('/');
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${encodeURIComponent(history)}`;
    
    const getR = await fetch(apiUrl + `?ref=${encodeURIComponent(branch)}&_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3.raw'
      }
    });
    
    if (getR.status === 404) {
      document.getElementById('historial-contenido').innerHTML = '<div style="text-align:center;color:#777;padding:20px;">No hay elementos eliminados en el historial</div>';
    } else if (getR.ok) {
      const content = await getR.text();
      const historial = JSON.parse(content);
      
      let html = '';
      if (historial.length === 0) {
        html = '<div style="text-align:center;color:#777;padding:20px;">No hay elementos eliminados en el historial</div>';
      } else {
        html += `<div style="text-align:center;color:#666;margin-bottom:15px;font-size:14px;">Total de elementos eliminados: ${historial.length}</div>`;
        historial.reverse().forEach((item, index) => {
          const fecha = new Date(item.fecha_borrado).toLocaleString('es-ES');
          const numero = historial.length - index;
          html += `
            <div style="background:#f8f9fa;border-radius:8px;padding:12px;margin-bottom:8px;border-left:4px solid #4ecdc4;position:relative;">
              <div style="position:absolute;top:8px;right:12px;background:#4ecdc4;color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;">${numero}</div>
              <div style="font-weight:bold;color:#2d5a27;margin-bottom:4px;padding-right:30px;">${item.tipo.toUpperCase()}</div>
              <div style="color:#666;font-size:12px;margin-bottom:8px;">Eliminado: ${fecha}</div>
              <div style="background:white;padding:8px;border-radius:4px;font-size:13px;">
                ${item.tipo === 'tarea_critica' ? `<strong>${escapeHtml(item.contenido.titulo)}</strong>` : 
                  item.tipo === 'tarea' ? escapeHtml(item.contenido.texto) : 
                  item.tipo === 'cita' ? `${item.contenido.fecha} - ${escapeHtml(item.contenido.nombre)}` : 
                  JSON.stringify(item.contenido)}
              </div>
            </div>
          `;
        });
      }
      
      document.getElementById('historial-contenido').innerHTML = html;
    } else {
      throw new Error('Error al obtener historial: ' + getR.status);
    }
    
    abrirModal('modal-historial');
  } catch (error) {
    console.error('Error al cargar historial:', error);
    mostrarAlerta('⚠️ Error al cargar el historial', 'info');
  }
}

async function hacerCopia() {
  const { repo, path, branch, token } = getSyncConfig();
  if (!repo || !path || !token) {
    mostrarAlerta('⚠️ Configura GitHub primero para hacer copia', 'info');
    return;
  }
  
  try {
    const hoy = new Date();
    const fechaStr = `${String(hoy.getDate()).padStart(2, '0')}_${String(hoy.getMonth() + 1).padStart(2, '0')}_${String(hoy.getFullYear()).slice(-2)}`;
    const nombreCopia = path.replace('.json', `_${fechaStr}.json`);
    
    // Obtener contenido actual
    const [repoOwner, repoName] = repo.split('/');
    const apiUrlOriginal = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${encodeURIComponent(path)}`;
    
    const getR = await fetch(apiUrlOriginal + `?ref=${encodeURIComponent(branch)}&_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!getR.ok) {
      throw new Error('No se pudo obtener el archivo original');
    }
    
    const originalData = await getR.json();
    
    // Crear copia
    const apiUrlCopia = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${encodeURIComponent(nombreCopia)}`;
    
    const body = {
      message: `Copia de seguridad - ${fechaStr}`,
      content: originalData.content,
      branch: branch
    };
    
    const putR = await fetch(apiUrlCopia, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (putR.ok) {
      mostrarAlerta(`📋 Copia creada: ${nombreCopia}`, 'success');
    } else {
      throw new Error('Error al crear la copia: ' + putR.status);
    }
  } catch (error) {
    console.error('Error al hacer copia:', error);
    mostrarAlerta('⚠️ Error al crear la copia', 'info');
  }
}

function abrirHistoricoTareas() {
  window.open('../historico.html', '_blank');
}

function abrirGraficos() {
  window.open('../graficos.html', '_blank');
}

// ========== FUNCIONES DE BACKUP ==========
function restaurarBackup() {
  const backup = localStorage.getItem('agenda-backup-pre-sync');
  if (!backup) {
    mostrarAlerta('⚠️ No hay backup disponible', 'info');
    return;
  }
  
  const confirmar = confirm(
    '🔄 ¿Restaurar el backup anterior a la última sincronización?\n\n' +
    'Esto sobrescribirá los datos actuales con el backup.'
  );
  
  if (confirmar) {
    try {
      const datosBackup = JSON.parse(backup);
      procesarJSON(datosBackup);
      mostrarAlerta('✅ Backup restaurado correctamente', 'success');
    } catch (error) {
      mostrarAlerta('❌ Error al restaurar backup', 'error');
    }
  }
}

function crearBackupManual() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = JSON.stringify(appState.agenda, null, 2);
  localStorage.setItem(`agenda-backup-manual-${timestamp}`, backup);
  mostrarAlerta('💾 Backup manual creado', 'success');
}

// Hacer funciones disponibles globalmente
window.getSyncConfig = getSyncConfig;
window.githubPull = githubPull;
window.guardarJSON = guardarJSON;
window.procesarJSON = procesarJSON;
window.convertJSONtoXML = convertJSONtoXML;
window.convertXMLtoJSON = convertXMLtoJSON;
window.toggleConfigFloating = toggleConfigFloating;
window.cargarConfiguracionesModal = cargarConfiguracionesModal;
window.guardarConfigGitHub = guardarConfigGitHub;
window.probarConexionGitHub = probarConexionGitHub;
window.mostrarStatusGitHub = mostrarStatusGitHub;
window.cargarConfigVisual = cargarConfigVisual;
window.aplicarConfigVisual = aplicarConfigVisual;
window.cambiarFraseMotivacional = cambiarFraseMotivacional;
window.switchTab = switchTab;
window.guardarConfigVisualPanel = guardarConfigVisualPanel;
window.guardarConfigOpciones = guardarConfigOpciones;
window.verHistorial = verHistorial;
window.hacerCopia = hacerCopia;
window.abrirHistoricoTareas = abrirHistoricoTareas;
window.abrirGraficos = abrirGraficos;
window.restaurarBackup = restaurarBackup;
window.crearBackupManual = crearBackupManual;