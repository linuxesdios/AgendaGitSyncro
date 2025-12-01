// Modal de configuración adaptativo
(function() {
  'use strict';
  
  // Detectar si estamos en agendaphone.html
  const esMobile = window.location.pathname.includes('agendaphone.html');
  
  // Al cargar, ocultar pestañas innecesarias en móvil
  if (esMobile) {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        // Ocultar pestañas que no se usan en móvil
        const tabsAOcultar = ['#tab-visual', '#tab-funcional', '#tab-opciones'];
        tabsAOcultar.forEach(selector => {
          const tab = document.querySelector(selector);
          const btn = document.querySelector(`button[onclick*="${selector.replace('#tab-', '')}"]`);
          if (tab) tab.style.display = 'none';
          if (btn) btn.style.display = 'none';
        });
      }, 500);
    });
  }

  
  // Si estamos en móvil, ocultar pestañas innecesarias cuando se abre el modal
  if (esMobile) {
    const originalToggle = window.toggleConfigFloating;
    window.toggleConfigFloating = function() {
      const modal = document.getElementById('modal-config');
      if (modal) {
        modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
        
        if (modal.style.display === 'flex') {
          // Ocultar pestañas innecesarias
          setTimeout(() => {
            const btnsAOcultar = [
              document.querySelector('button[onclick*="cambiarTab(\'visual\')"'),
              document.querySelector('button[onclick*="cambiarTab(\'funcional\')"'),
              document.querySelector('button[onclick*="cambiarTab(\'opciones\')"')
            ];
            btnsAOcultar.forEach(btn => {
              if (btn) btn.style.display = 'none';
            });
          }, 50);
        }
      }
    };
  }
})();
