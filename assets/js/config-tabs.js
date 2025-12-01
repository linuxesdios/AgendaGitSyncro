// Ocultar pestañas según la página y cargar contenido al abrir modal
(function() {
  const esMobile = window.location.pathname.includes('agendaphone.html');
  
  if (esMobile) {
    // Ocultar pestañas de Visual y Funcional
    const ocultarTabs = () => {
      ['.config-tab[onclick*="visual"]', '.config-tab[onclick*="funcionales"]'].forEach(selector => {
        const btn = document.querySelector(selector);
        if (btn) btn.style.display = 'none';
      });
      
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
    
    // Interceptar apertura del modal
    const originalToggle = window.toggleConfigFloating;
    
    window.toggleConfigFloating = function() {
      if (originalToggle) originalToggle();
      
      setTimeout(() => {
        const modal = document.getElementById('modal-config');
        
        if (modal && (modal.style.display === 'flex' || modal.style.display === 'block')) {
          // Forzar carga de la pestaña activa llamando a switchTab directamente
          if (typeof switchTab === 'function') {
            switchTab('supabase');
          }
        }
      }, 200);
    };
  }
})();
