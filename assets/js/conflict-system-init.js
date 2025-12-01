/**
 * Conflict System Init - Inicialización del sistema de conflictos
 * Inyecta el modal y configura los scripts dinámicamente
 */

(function () {
    'use strict';

    // Inyectar modal de conflictos en el DOM
    function inyectarModalConflictos() {
        const modalHTML = `
      <!-- Modal de Conflictos Multi-Dispositivo -->
      <div id="modal-conflicto" class="modal">
        <div class="modal-content" style="max-width:900px;width:95%;">
          <h4>⚠️ Conflicto Detectado</h4>
          
          <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:15px;margin-bottom:20px;">
            <p style="margin:5px 0;"><strong>⚡ Los datos fueron modificados desde otro dispositivo</strong></p>
            <p style="margin:5px 0;font-size:13px;">Último guardado desde: <strong><span id="conflict-last-device">Cargando...</span></strong></p>
            <p style="margin:5px 0;font-size:13px;">Hace: <strong><span id="conflict-time-ago">Calculando...</span></strong></p>
          </div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:20px 0;">
            <!-- Versión Local -->
            <div style="border:2px solid #4ecdc4;border-radius:8px;padding:15px;">
              <h5 style="margin:0 0 10px 0;color:#2d5a27;">📱 Tu Versión (Local)</h5>
              <div id="conflict-local-preview" style="background:#f8f9fa;border-radius:6px;padding:10px;max-height:300px;overflow-y:auto;font-size:12px;"></div>
            </div>
            
            <!-- Versión Remota -->
            <div style="border:2px solid #ff9800;border-radius:8px;padding:15px;">
              <h5 style="margin:0 0 10px 0;color:#2d5a27;">☁️ Versión del Servidor</h5>
              <div id="conflict-remote-preview" style="background:#f8f9fa;border-radius:6px;padding:10px;max-height:300px;overflow-y:auto;font-size:12px;"></div>
            </div>
          </div>
          
          <!-- Diferencias -->
          <div id="conflict-diff" style="background:#f8f9fa;border-radius:8px;padding:15px;margin:20px 0;"></div>
          
          <div class="modal-botones">
            <button class="btn-primario" onclick="resolveConflict('local')" style="background:#4ecdc4;">
              📱 Mantener Mi Versión
            </button>
            <button class="btn-primario" onclick="resolveConflict('remote')" style="background:#ff9800;">
              ☁️ Usar Versión del Servidor
            </button>
            <button class="btn-secundario" onclick="resolveConflict('cancel')">
              ❌ Cancelar
            </button>
          </div>
        </div>
      </div>
    `;

        // Insertar modal antes del cierre del body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

    }

    // Cargar scripts de conflictos
    function cargarScripts() {
        const scripts = [
            'assets/js/device-manager.js',
            'assets/js/conflict-resolution.js'
        ];

        scripts.forEach((src, index) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = false; // Cargar en orden
            script.onload = () => {

            };
            script.onerror = () => {
                console.error(`❌ Error cargando: ${src}`);
            };

            // Insertar antes del primer script existente
            const firstScript = document.getElementsByTagName('script')[0];
            firstScript.parentNode.insertBefore(script, firstScript);
        });
    }

    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            inyectarModalConflictos();
            cargarScripts();
        });
    } else {
        inyectarModalConflictos();
        cargarScripts();
    }

})();
