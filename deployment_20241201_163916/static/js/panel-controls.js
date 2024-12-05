// Panel collapse/expand functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all panels
    const panels = document.querySelectorAll('.panel');
    panels.forEach(panel => {
        const collapseToggle = panel.querySelector('.collapse-toggle');
        const collapseContent = panel.querySelector('.collapse');
        
        // Add collapse event listener
        if (collapseContent) {
            collapseContent.addEventListener('show.bs.collapse', function() {
                panel.classList.remove('collapsed');
                updatePanelSizes();
            });
            
            collapseContent.addEventListener('hide.bs.collapse', function() {
                panel.classList.add('collapsed');
                updatePanelSizes();
            });
        }
    });

    // Function to update panel sizes when collapsing/expanding
    function updatePanelSizes() {
        const visiblePanels = Array.from(panels).filter(panel => !panel.classList.contains('collapsed'));
        const totalCols = 12; // Bootstrap's grid system
        const colsPerPanel = Math.floor(totalCols / visiblePanels.length);
        
        panels.forEach(panel => {
            if (panel.classList.contains('collapsed')) {
                panel.style.flex = '0 0 auto';
                panel.style.width = 'auto';
            } else {
                panel.style.flex = `0 0 ${(colsPerPanel / totalCols) * 100}%`;
                panel.style.width = `${(colsPerPanel / totalCols) * 100}%`;
            }
        });
    }

    // Double-click panel header to toggle collapse
    panels.forEach(panel => {
        const header = panel.querySelector('.card-header');
        if (header) {
            header.addEventListener('dblclick', function(e) {
                // Prevent double-click from affecting inner elements
                if (e.target === header || e.target === header.querySelector('h5')) {
                    const collapseToggle = panel.querySelector('.collapse-toggle');
                    if (collapseToggle) {
                        collapseToggle.click();
                    }
                }
            });
        }
    });

    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(updatePanelSizes, 250);
    });
});
