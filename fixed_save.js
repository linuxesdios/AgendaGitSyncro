// ========== GUARDAR JSON ==========
async function guardarJSON(silent = false) {
  try {
    // Actualizar notas y preparar JSON
    agendaData.notas = document.getElementById('notas-texto').value.split('\n').filter(nota => nota.trim());
    
    // Crear objeto JSON para guardar
    const jsonData = {
      fecha: agendaData.fecha,
      dia_semana: agendaData.dia_semana,
      tareas_criticas: agendaData.tareas_criticas.map(t => ({
        id: t.id,
        titulo: t.titulo,
        razon: t.razon,
        fecha_fin: t.fecha_fin || null,
        completada: t.completada,
        estado: t.estado
      })),
      tareas: agendaData.tareas.map(t => ({
        id: t.id,
        texto: t.texto,
        fecha_fin: t.fecha_fin || null,
        completada: t.completada,
        estado: t.estado,
        persona: t.persona || null,
        fecha_migrar: t.fecha_migrar || null
      })),
      notas: agendaData.notas
    };

    // Guardar en GitHub
    const { repo, path, branch, token } = getSyncConfig();
    if (!repo || !path || !token) {
      mostrarAlerta('⚠️ Configura GitHub primero (botón Sincronizar)', 'info');
      return;
    }

    const [repoOwner, repoName] = repo.split('/');
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${encodeURIComponent(path)}`;
    
    // Obtener metadatos del archivo (incluyendo SHA)
    console.log('Obteniendo metadatos del archivo...');
    const getR = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    let sha = null;
    if (getR.ok) {
      const fileData = await getR.json();
      console.log('Metadatos recibidos:', fileData);
      sha = fileData.sha;
      console.log('SHA obtenido:', sha);
    } else if (getR.status !== 404) {
      throw new Error(`Error al obtener metadatos: ${getR.status}`);
    }

    // Preparar contenido para GitHub
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(jsonData, null, 2))));
    const body = {
      message: 'Actualización desde agenda web',
      content: content,
      branch: branch
    };

    // Si el archivo existe, incluir SHA
    if (sha) {
      console.log('Incluyendo SHA en la petición:', sha);
      body.sha = sha;
    }

    // Guardar en GitHub
    console.log('Enviando actualización a GitHub...');
    const putR = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify(body)
    });

    if (!putR.ok) {
      const errorText = await putR.text();
      console.error('Error response:', errorText);
      throw new Error(`Error al guardar (${putR.status}): ${errorText}`);
    }

    const response = await putR.json();
    console.log('Respuesta de GitHub:', response);

    if (!silent) {
      mostrarAlerta('💾 Guardado en GitHub', 'success');
    }
  } catch (err) {
    console.error('Error al guardar en GitHub:', err);
    mostrarAlerta('❌ Error al guardar: ' + (err.message || 'Verifica tu configuración de GitHub'), 'info');
  }
}