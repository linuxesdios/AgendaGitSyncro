// ========== GOOGLE CALENDAR INTEGRATION ==========

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
].join(' ');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// ========== CONFIGURACIÓN ==========

function saveGoogleCalendarConfig() {
  const clientId = document.getElementById('google-client-id').value.trim();
  const clientSecret = document.getElementById('google-client-secret').value.trim();

  if (!clientId || !clientSecret) {
    mostrarAlerta('⚠️ Por favor completa Client ID y Client Secret', 'warning');
    return;
  }

  const config = {
    clientId,
    clientSecret,
    redirectUri: window.location.origin + '/AgendaGitSyncro/auth/callback.html'
  };

  localStorage.setItem('googleCalendarConfig', JSON.stringify(config));

  // Guardar opciones de sincronización
  const syncOptions = {
    syncEvents: document.getElementById('google-sync-events').checked,
    syncTasks: document.getElementById('google-sync-tasks').checked,
    autoSync: document.getElementById('google-auto-sync').checked
  };
  localStorage.setItem('googleCalendarSyncOptions', JSON.stringify(syncOptions));

  mostrarAlerta('✅ Configuración de Google Calendar guardada', 'success');
  updateGoogleCalendarUI();
}

function loadGoogleCalendarConfig() {
  const config = JSON.parse(localStorage.getItem('googleCalendarConfig') || '{}');
  const syncOptions = JSON.parse(localStorage.getItem('googleCalendarSyncOptions') || '{"syncEvents":true,"syncTasks":false,"autoSync":true}');

  if (config.clientId) {
    document.getElementById('google-client-id').value = config.clientId;
  }
  if (config.clientSecret) {
    document.getElementById('google-client-secret').value = config.clientSecret;
  }

  document.getElementById('google-sync-events').checked = syncOptions.syncEvents;
  document.getElementById('google-sync-tasks').checked = syncOptions.syncTasks;
  document.getElementById('google-auto-sync').checked = syncOptions.autoSync;

  updateGoogleCalendarUI();
}

// ========== UI HELPERS ==========

function toggleGoogleSecretVisibility() {
  const input = document.getElementById('google-client-secret');
  input.type = input.type === 'password' ? 'text' : 'password';
}

function updateGoogleCalendarUI() {
  const auth = JSON.parse(localStorage.getItem('googleCalendarAuth') || '{}');
  const statusPanel = document.getElementById('google-calendar-status-panel');
  const btnConnect = document.getElementById('btn-connect-google');

  if (auth.access_token && auth.expires_at > Date.now()) {
    // Conectado
    statusPanel.style.display = 'block';
    btnConnect.textContent = '✅ Reconectar';
    btnConnect.style.background = '#10b981';

    // Obtener email de la cuenta
    fetchGoogleUserInfo().then(userInfo => {
      if (userInfo && userInfo.email) {
        document.getElementById('google-calendar-email').textContent = userInfo.email;
      }
    });

    // Cargar calendarios disponibles
    setTimeout(() => {
      loadAndDisplayCalendars();
    }, 500);
  } else {
    // No conectado
    statusPanel.style.display = 'none';
    btnConnect.textContent = '🔗 Conectar con Google';
    btnConnect.style.background = '#34A853';

    const container = document.getElementById('calendar-list-container');
    if (container) {
      container.innerHTML = '<p style="color: #666; text-align: center;">Conecta primero con Google Calendar</p>';
    }
  }
}

// ========== OAUTH FLOW ==========

async function connectGoogleCalendar() {
  const config = JSON.parse(localStorage.getItem('googleCalendarConfig') || '{}');

  if (!config.clientId || !config.clientSecret) {
    mostrarAlerta('⚠️ Por favor guarda primero tu Client ID y Client Secret', 'warning');
    return;
  }

  const redirectUri = window.location.origin + '/AgendaGitSyncro/auth/callback.html';

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.append('client_id', config.clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', GOOGLE_SCOPES);
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('prompt', 'consent');

  // Redirigir a Google OAuth
  window.location.href = authUrl.toString();
}

async function disconnectGoogleCalendar() {
  if (confirm('¿Desconectar Google Calendar? Tendrás que volver a autorizar la aplicación.')) {
    localStorage.removeItem('googleCalendarAuth');
    updateGoogleCalendarUI();
    mostrarAlerta('✅ Desconectado de Google Calendar', 'success');
  }
}

async function refreshGoogleAccessToken() {
  const config = JSON.parse(localStorage.getItem('googleCalendarConfig') || '{}');
  const auth = JSON.parse(localStorage.getItem('googleCalendarAuth') || '{}');

  if (!auth.refresh_token) {
    console.error('No refresh token available');
    return null;
  }

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: auth.refresh_token,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      throw new Error('Error al refrescar token');
    }

    const tokens = await response.json();

    // Actualizar tokens
    auth.access_token = tokens.access_token;
    auth.expires_at = Date.now() + (tokens.expires_in * 1000);
    localStorage.setItem('googleCalendarAuth', JSON.stringify(auth));

    return auth.access_token;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

async function getValidAccessToken() {
  const auth = JSON.parse(localStorage.getItem('googleCalendarAuth') || '{}');

  if (!auth.access_token) {
    return null;
  }

  // Si el token expira en menos de 5 minutos, refrescarlo
  if (auth.expires_at < Date.now() + 300000) {
    return await refreshGoogleAccessToken();
  }

  return auth.access_token;
}

// ========== API HELPERS ==========

async function fetchGoogleUserInfo() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
  }
}

async function createGoogleCalendarEvent(event) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    console.error('No access token available');
    return null;
  }

  try {
    const googleEvent = {
      summary: event.titulo || event.nombre || 'Sin título',
      description: event.descripcion || event.notas || '',
      start: {
        dateTime: event.inicio || event.fecha,
        timeZone: 'Europe/Madrid'
      },
      end: {
        dateTime: event.fin || event.fecha,
        timeZone: 'Europe/Madrid'
      }
    };

    // Si es una tarea sin hora específica, usar fecha completa
    if (event.tipo === 'tarea' && !event.hora) {
      const fecha = event.fecha.split('T')[0];
      googleEvent.start = { date: fecha };
      googleEvent.end = { date: fecha };
    }

    const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(googleEvent)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    const createdEvent = await response.json();
    return createdEvent;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    return null;
  }
}

async function updateGoogleCalendarEvent(googleEventId, event) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  try {
    const googleEvent = {
      summary: event.titulo || event.nombre || 'Sin título',
      description: event.descripcion || event.notas || '',
      start: {
        dateTime: event.inicio || event.fecha,
        timeZone: 'Europe/Madrid'
      },
      end: {
        dateTime: event.fin || event.fecha,
        timeZone: 'Europe/Madrid'
      }
    };

    if (event.tipo === 'tarea' && !event.hora) {
      const fecha = event.fecha.split('T')[0];
      googleEvent.start = { date: fecha };
      googleEvent.end = { date: fecha };
    }

    const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events/${googleEventId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(googleEvent)
    });

    if (!response.ok) {
      throw new Error('Error updating event');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
    return null;
  }
}

async function deleteGoogleCalendarEvent(googleEventId) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return false;

  try {
    const response = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events/${googleEventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting Google Calendar event:', error);
    return false;
  }
}

// ========== LISTAR CALENDARIOS ==========

async function listGoogleCalendars() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return [];

  try {
    const response = await fetch(`${GOOGLE_CALENDAR_API}/users/me/calendarList`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener calendarios');
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error listando calendarios:', error);
    return [];
  }
}

async function getGoogleCalendarEvents(calendarId = 'primary', timeMin = null, timeMax = null) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return [];

  try {
    const now = new Date();
    const defaultTimeMin = timeMin || new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const defaultTimeMax = timeMax || new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

    const url = new URL(`${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events`);
    url.searchParams.append('timeMin', defaultTimeMin);
    url.searchParams.append('timeMax', defaultTimeMax);
    url.searchParams.append('singleEvents', 'true');
    url.searchParams.append('orderBy', 'startTime');
    url.searchParams.append('maxResults', '250');

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener eventos');
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error obteniendo eventos de Google Calendar:', error);
    return [];
  }
}

// ========== SINCRONIZACIÓN ==========

async function syncEventToGoogleCalendar(event) {
  const syncOptions = JSON.parse(localStorage.getItem('googleCalendarSyncOptions') || '{"syncEvents":true,"syncTasks":false,"autoSync":true}');
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    console.log('Google Calendar no conectado, saltando sincronización');
    return;
  }

  if (!syncOptions.autoSync) {
    console.log('Sincronización automática desactivada');
    return;
  }

  // Verificar si el tipo de evento debe sincronizarse
  if (event.tipo === 'tarea' && !syncOptions.syncTasks) {
    return;
  }
  if (event.tipo === 'cita' && !syncOptions.syncEvents) {
    return;
  }

  try {
    // Verificar si ya tiene ID de Google Calendar
    if (event.googleCalendarId) {
      // Actualizar evento existente
      await updateGoogleCalendarEvent(event.googleCalendarId, event);
      console.log('✅ Evento actualizado en Google Calendar:', event.titulo || event.nombre);
    } else {
      // Crear nuevo evento
      const googleEvent = await createGoogleCalendarEvent(event);
      if (googleEvent && googleEvent.id) {
        // Guardar ID de Google Calendar en el evento local
        event.googleCalendarId = googleEvent.id;

        // Actualizar en appState
        if (event.tipo === 'cita' && window.appState && window.appState.agenda && window.appState.agenda.citas) {
          const eventos = window.appState.agenda.citas;
          const index = eventos.findIndex(e => e.id === event.id);
          if (index !== -1) {
            eventos[index].googleCalendarId = googleEvent.id;
            // Guardar cambios
            if (typeof guardarJSON === 'function') {
              guardarJSON(false);
            }
          }
        } else if (event.tipo === 'tarea' && window.appState && window.appState.agenda && window.appState.agenda.tareas) {
          const tareas = window.appState.agenda.tareas;
          const index = tareas.findIndex(t => t.id === event.id);
          if (index !== -1) {
            tareas[index].googleCalendarId = googleEvent.id;
            // Guardar cambios
            if (typeof guardarJSON === 'function') {
              guardarJSON(false);
            }
          }
        }

        console.log('✅ Evento creado en Google Calendar:', event.titulo || event.nombre);
      }
    }
  } catch (error) {
    console.error('Error sincronizando con Google Calendar:', error);
  }
}

async function manualSyncGoogleCalendar() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    mostrarAlerta('⚠️ Por favor conecta primero con Google Calendar', 'warning');
    return;
  }

  const syncOptions = JSON.parse(localStorage.getItem('googleCalendarSyncOptions') || '{"syncEvents":true,"syncTasks":false,"autoSync":true}');

  mostrarAlerta('🔄 Sincronizando con Google Calendar...', 'info');

  let syncCount = 0;

  try {
    // Sincronizar eventos (citas)
    if (syncOptions.syncEvents && window.appState && window.appState.agenda && window.appState.agenda.citas) {
      const eventos = window.appState.agenda.citas;
      for (const evento of eventos) {
        await syncEventToGoogleCalendar(evento);
        syncCount++;
      }
    }

    // Sincronizar tareas
    if (syncOptions.syncTasks && window.appState && window.appState.agenda && window.appState.agenda.tareas) {
      const tareas = window.appState.agenda.tareas;
      for (const tarea of tareas) {
        if (tarea.estado !== 'completada') {
          await syncEventToGoogleCalendar(tarea);
          syncCount++;
        }
      }
    }

    mostrarAlerta(`✅ ${syncCount} eventos sincronizados con Google Calendar`, 'success');
  } catch (error) {
    console.error('Error en sincronización manual:', error);
    mostrarAlerta('❌ Error al sincronizar con Google Calendar', 'error');
  }
}

// ========== SINCRONIZACIÓN BIDIRECCIONAL ==========

async function pullEventsFromGoogleCalendar() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    console.log('📅 Google Calendar no conectado, saltando pull');
    return [];
  }

  const selectedCalendars = JSON.parse(localStorage.getItem('googleSelectedCalendars') || '["primary"]');
  let allEvents = [];

  try {
    for (const calendarId of selectedCalendars) {
      const events = await getGoogleCalendarEvents(calendarId);
      allEvents = allEvents.concat(events);
    }

    console.log(`📥 Obtenidos ${allEvents.length} eventos desde Google Calendar`);

    // Guardar eventos en cache para mostrarlos en el calendario
    localStorage.setItem('googleCalendarEvents', JSON.stringify(allEvents));

    return allEvents;
  } catch (error) {
    console.error('Error en pull desde Google Calendar:', error);
    return [];
  }
}

async function loadAndDisplayCalendars() {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    document.getElementById('calendar-list-container').innerHTML = '<p style="color: #666;">Conecta primero con Google Calendar</p>';
    return;
  }

  const calendars = await listGoogleCalendars();
  if (calendars.length === 0) {
    document.getElementById('calendar-list-container').innerHTML = '<p style="color: #666;">No se encontraron calendarios</p>';
    return;
  }

  const selectedCalendars = JSON.parse(localStorage.getItem('googleSelectedCalendars') || '["primary"]');

  let html = '<div style="max-height: 300px; overflow-y: auto;">';

  calendars.forEach(calendar => {
    const isChecked = selectedCalendars.includes(calendar.id);
    const color = calendar.backgroundColor || '#4285F4';

    html += `
      <label style="display: flex; align-items: center; gap: 10px; padding: 8px; cursor: pointer; border-radius: 6px; margin-bottom: 5px; background: ${isChecked ? '#f0f9ff' : 'white'}; border: 1px solid ${isChecked ? '#3b82f6' : '#e5e7eb'};">
        <input type="checkbox"
               value="${calendar.id}"
               ${isChecked ? 'checked' : ''}
               onchange="toggleCalendarSelection('${calendar.id}')"
               style="cursor: pointer;">
        <div style="width: 16px; height: 16px; border-radius: 50%; background: ${color};"></div>
        <div style="flex: 1;">
          <div style="font-weight: 500;">${calendar.summary}</div>
          <div style="font-size: 11px; color: #666;">${calendar.id === 'primary' ? 'Principal' : calendar.id.split('@')[0]}</div>
        </div>
      </label>
    `;
  });

  html += '</div>';

  document.getElementById('calendar-list-container').innerHTML = html;
}

function toggleCalendarSelection(calendarId) {
  let selectedCalendars = JSON.parse(localStorage.getItem('googleSelectedCalendars') || '["primary"]');

  const index = selectedCalendars.indexOf(calendarId);
  if (index > -1) {
    selectedCalendars.splice(index, 1);
  } else {
    selectedCalendars.push(calendarId);
  }

  // Asegurar que al menos uno esté seleccionado
  if (selectedCalendars.length === 0) {
    selectedCalendars = ['primary'];
  }

  localStorage.setItem('googleSelectedCalendars', JSON.stringify(selectedCalendars));
  console.log('📅 Calendarios seleccionados:', selectedCalendars);

  // Recargar eventos
  pullEventsFromGoogleCalendar().then(() => {
    // Re-renderizar calendario si está visible
    if (typeof renderCalendar === 'function') {
      renderCalendar();
    }
  });
}

async function syncBidirectionalGoogleCalendar() {
  mostrarAlerta('🔄 Sincronización bidireccional iniciada...', 'info');

  try {
    // 1. Traer eventos desde Google
    await pullEventsFromGoogleCalendar();

    // 2. Enviar eventos locales a Google
    await manualSyncGoogleCalendar();

    // 3. Actualizar calendario
    if (typeof renderCalendar === 'function') {
      renderCalendar();
    }

    mostrarAlerta('✅ Sincronización bidireccional completada', 'success');
  } catch (error) {
    console.error('Error en sincronización bidireccional:', error);
    mostrarAlerta('❌ Error en sincronización bidireccional', 'error');
  }
}

// ========== INICIALIZACIÓN ==========

document.addEventListener('DOMContentLoaded', () => {
  // Cargar configuración al abrir modal
  const modalConfig = document.getElementById('modal-config');
  if (modalConfig) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'style' && modalConfig.style.display !== 'none') {
          loadGoogleCalendarConfig();
        }
      });
    });
    observer.observe(modalConfig, { attributes: true });
  }

  // Cargar configuración inicial
  setTimeout(() => {
    loadGoogleCalendarConfig();

    // Cargar eventos de Google Calendar si está conectado
    const auth = JSON.parse(localStorage.getItem('googleCalendarAuth') || '{}');
    if (auth.access_token && auth.expires_at > Date.now()) {
      console.log('📅 Cargando eventos desde Google Calendar...');
      pullEventsFromGoogleCalendar().then(() => {
        console.log('✅ Eventos de Google Calendar cargados');
        // Re-renderizar calendario para mostrar eventos de Google
        if (typeof renderCalendar === 'function') {
          renderCalendar();
        }
      });

      // Actualizar eventos periódicamente cada 5 minutos
      setInterval(() => {
        pullEventsFromGoogleCalendar().then(() => {
          if (typeof renderCalendar === 'function') {
            renderCalendar();
          }
        });
      }, 5 * 60 * 1000);
    }
  }, 1000);
});
