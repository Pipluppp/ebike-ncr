/**
 * Sidebar toggle functionality for E-Bike NCR.
 * Controls the visibility of the sidebar panel.
 */

// Get reference to the toggle button
var toggleButton = document.getElementById('sidebarToggle');

// Initialize sidebar
var sidebar = L.control.sidebar('sidebar', {
    closeButton: true,
    position: 'left'
});

map.addControl(sidebar);

// Show sidebar after initial load
setTimeout(function() {
    sidebar.show();
}, 500);

// Update toggle button visibility based on sidebar state
function updateToggleButton() {
    if (sidebar.isVisible()) {
        toggleButton.style.opacity = '0';
        toggleButton.style.visibility = 'hidden';
    } else {
        toggleButton.style.opacity = '1';
        toggleButton.style.visibility = 'visible';
    }
}

// Toggle button click handler
toggleButton.addEventListener('click', function() {
    sidebar.toggle();
    updateToggleButton();
});

// Sync button state with sidebar events
sidebar.on('shown', updateToggleButton);
sidebar.on('hidden', updateToggleButton);

// Initial button state
updateToggleButton();

// Hide sidebar when clicking on map
map.on('click', function() {
    if (sidebar.isVisible()) {
        sidebar.hide();
        updateToggleButton();
    }
});