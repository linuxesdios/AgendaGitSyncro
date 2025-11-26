/**
 * Conflict Resolution - Sistema de detección y resolución de conflictos
 * Gestiona la comparación de versiones y la UI de resolución
 */

// Variable global para el callback de resolución
let _conflictResolveCallback = null;

/**
 * Mostrar modal de resolución de conflictos
 * @param {Object} localData - Datos locales actuales
 * @param {Object} remoteData - Datos del servidor
 * @returns {Promise<string>} - 'local', 'remote' o 'cancel'
 */
async function showConflictModal(localData, remoteData) {
    return new Promise((resolve) => {
        try {
            // Guardar información del último dispositivo
            const lastDevice = remoteData._metadata?.deviceName || 'Dispositivo desconocido';
            const lastTimestamp = remoteData._metadata?.timestamp;

            document.getElementById('conflict-last-device').textContent = lastDevice;
            document.getElementById('conflict-time-ago').textContent = getTimeAgo(lastTimestamp);

            // Calcular y mostrar diferencias
            const diff = calculateDifferences(localData, remoteData);
            renderConflictPreview('conflict-local-preview', localData, diff.local);
            renderConflictPreview('conflict-remote-preview', remoteData, diff.remote);
            renderDifferences('conflict-diff', diff);

            // Abrir modal
            document.getElementById('modal-conflicto').style.display = 'flex';

            // Guardar callback
            _conflictResolveCallback = resolve;

        } catch (error) {
            console.error('Error mostrando modal de conflictos:', error);
            resolve('cancel');
        }
    });
}

/**
 * Resolver conflicto con la opción elegida
 * @param {string} choice - 'local', 'remote' o 'cancel'
 */
function resolveConflict(choice) {
    cerrarModal('modal-conflicto');

    if (_conflictResolveCallback) {
        _conflictResolveCallback(choice);
        _conflictResolveCallback = null;
    }
}

/**
 * Calcular diferencias entre versión local y remota
 */
function calculateDifferences(localData, remoteData) {
    const diff = {
        local: {
            changes: []
        },
        remote: {
            changes: []
        },
        summary: {
            hasConflicts: false,
            totalChanges: 0
        }
    };

    // Comparar tareas normales
    const localTareas = localData.tareas || [];
    const remoteTareas = remoteData.tareas || [];
    compareLists('tareas', localTareas, remoteTareas, diff);

    // Comparar tareas críticas
    const localCriticas = localData.criticas || [];
    const remoteCriticas = remoteData.criticas || [];
    compareLists('críticas', localCriticas, remoteCriticas, diff);

    // Comparar citas
    const localCitas = localData.citas || [];
    const remoteCitas = remoteData.citas || [];
    compareLists('citas', localCitas, remoteCitas, diff);

    // Comparar notas
    if (localData.notas !== remoteData.notas) {
        diff.summary.hasConflicts = true;
        diff.summary.totalChanges++;
    }

    // Comparar sentimientos
    if (localData.sentimientos !== remoteData.sentimientos) {
        diff.summary.hasConflicts = true;
        diff.summary.totalChanges++;
    }

    return diff;
}

/**
 * Comparar dos listas de elementos
 */
function compareLists(name, localList, remoteList, diff) {
    // Elementos solo en local (nuevos locales o eliminados en remoto)
    localList.forEach(item => {
        const foundInRemote = remoteList.find(r => r.id === item.id);
        if (!foundInRemote) {
            diff.local.changes.push({
                type: 'added',
                category: name,
                item: item,
                text: item.texto || item.titulo || item.descripcion || 'Sin texto'
            });
            diff.summary.totalChanges++;
        }
    });

    // Elementos solo en remoto (nuevos remotos o eliminados en local)
    remoteList.forEach(item => {
        const foundInLocal = localList.find(l => l.id === item.id);
        if (!foundInLocal) {
            diff.remote.changes.push({
                type: 'added',
                category: name,
                item: item,
                text: item.texto || item.titulo || item.descripcion || 'Sin texto'
            });
            diff.summary.totalChanges++;
        }
    });

    // Elementos modificados (presentes en ambos pero diferentes)
    localList.forEach(localItem => {
        const remoteItem = remoteList.find(r => r.id === localItem.id);
        if (remoteItem && JSON.stringify(localItem) !== JSON.stringify(remoteItem)) {
            diff.summary.hasConflicts = true;
            diff.summary.totalChanges++;
        }
    });
}

/**
 * Renderizar preview de una versión
 */
function renderConflictPreview(containerId, data, changes) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '<div style="font-size: 11px; line-height: 1.4;">';

    // Mostrar conteo general
    html += `<div style="margin-bottom: 8px; padding: 6px; background: #e3f2fd; border-radius: 4px;">`;
    html += `<strong>📊 Resumen:</strong><br>`;
    html += `Tareas: ${(data.tareas || []).length} | `;
    html += `Críticas: ${(data.criticas || []).length} | `;
    html += `Citas: ${(data.citas || []).length}`;
    html += `</div>`;

    // Mostrar cambios si hay
    if (changes && changes.changes.length > 0) {
        html += `<div style="margin-top: 8px;"><strong>Cambios:</strong></div>`;
        changes.changes.slice(0, 5).forEach(change => {
            const icon = change.type === 'added' ? '➕' : '❌';
            html += `<div style="padding: 4px; margin: 2px 0; background: ${change.type === 'added' ? '#d4edda' : '#f8d7da'}; border-radius: 3px;">`;
            html += `${icon} ${change.category}: ${change.text}`;
            html += `</div>`;
        });
        if (changes.changes.length > 5) {
            html += `<div style="padding: 4px; color: #666; font-style: italic;">... y ${changes.changes.length - 5} más</div>`;
        }
    }

    html += '</div>';
    container.innerHTML = html;
}

/**
 * Renderizar diferencias detalladas
 */
function renderDifferences(containerId, diff) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!diff.summary.hasConflicts && diff.summary.totalChanges === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">✅ No hay diferencias detectadas</p>';
        return;
    }

    let html = `<h5 style="margin: 0 0 10px 0;">📋 Diferencias Detectadas (${diff.summary.totalChanges} cambios)</h5>`;
    html += '<div style="font-size: 12px;">';

    if (diff.local.changes.length > 0) {
        html += `<div style="margin-bottom: 10px;"><strong>Cambios en tu versión local:</strong></div>`;
        diff.local.changes.forEach(change => {
            html += `<div class="diff-added">➕ ${change.category}: ${change.text}</div>`;
        });
    }

    if (diff.remote.changes.length > 0) {
        html += `<div style="margin: 10px 0;"><strong>Cambios en la versión del servidor:</strong></div>`;
        diff.remote.changes.forEach(change => {
            html += `<div class="diff-removed">➕ ${change.category}: ${change.text}</div>`;
        });
    }

    html += '</div>';
    container.innerHTML = html;
}

/**
 * Calcular hace cuánto tiempo
 */
function getTimeAgo(timestamp) {
    if (!timestamp) return 'Desconocido';

    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Hace menos de un minuto';
    if (diffMins === 1) return 'Hace 1 minuto';
    if (diffMins < 60) return `Hace ${diffMins} minutos`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'Hace 1 hora';
    if (diffHours < 24) return `Hace ${diffHours} horas`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Hace 1 día';
    return `Hace ${diffDays} días`;
}

console.log('⚡ Conflict Resolution cargado');
