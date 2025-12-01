// Ocultar pestañas según la página y cargar contenido al abrir modal
(function() {
  const esMobile = window.location.pathname.includes('agendaphone.html');
  
  if (esMobile) {
    // Esperar a que el DOM esté listo
    const ocultarTabs = () => {
      // Ocultar pestañas de Visual y Funcional
      const tabsAOcultar = ['.config-tab[onclick*="visual"]', '.config-tab[onclick*="funcionales"]'];
      tabsAOcultar.forEach(selector => {
        const btn = document.querySelector(selector);
        if (btn) btn.style.display = 'none';
      });
      
      // Ocultar contenido de esas pestañas
      ['#tab-visual', '#tab-funcionales'].forEach(id => {
        const tab = document.querySelector(id);
        if (tab) tab.style.display = 'none';
      });
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ocultarTabs);
    } else {
      ocultarTabs();
    }
    
    // Interceptar apertura del modal para forzar carga de pestaña activa
    const originalToggle = window.toggleConfigFloating;
    window.toggleConfigFloating = function() {
      if (originalToggle) originalToggle();
      
      // Esperar a que el modal esté visible
      setTimeout(() => {
        const modal = document.getElementById('modal-config');
        if (modal && modal.style.display === 'flex') {
          // Forzar clic en la pestaña activa para cargar su contenido
          const tabActiva = document.querySelector('.config-tab.active');
          if (tabActiva) {
            console.log('🔄 Forzando carga de pestaña activa');
            tabActiva.click();
          }
        }
      }, 150);
    };
  }
})();
