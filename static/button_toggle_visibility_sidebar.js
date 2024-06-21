 // Get reference to the toggle button
 var toggleButton = document.getElementById('sidebarToggle');

 // Add click event listener to the button
 toggleButton.addEventListener('click', function() {
     sidebar.toggle();
     updateToggleButton();
 });

 var sidebar = L.control.sidebar('sidebar', {
     closeButton: true,
     position: 'left'
 });
 map.addControl(sidebar);

 setTimeout(function () {
     sidebar.show();
 }, 500);

 var marker = L.marker([51.2, 7]).addTo(map).on('click', function () {
     sidebar.toggle();
 });

 map.on('click', function () {
     sidebar.hide();
 })

 sidebar.on('show', function () {
     console.log('Sidebar will be visible.');
 });

 sidebar.on('shown', function () {
     console.log('Sidebar is visible.');
 });

 sidebar.on('hide', function () {
     console.log('Sidebar will be hidden.');
 });

 sidebar.on('hidden', function () {
     console.log('Sidebar is hidden.');
 });

 L.DomEvent.on(sidebar.getCloseButton(), 'click', function () {
     console.log('Close button clicked.');
 });

 // 

 var sidebar = L.control.sidebar('sidebar', {
     closeButton: true,
     position: 'left'
 });

 map.addControl(sidebar);

 var toggleButton = document.getElementById('sidebarToggle');
 
 function updateToggleButton() {
     if (sidebar.isVisible()) {
         toggleButton.style.opacity = '0';
         toggleButton.style.visibility = 'hidden';
     } else {
         toggleButton.style.opacity = '1';
         toggleButton.style.visibility = 'visible';
     }
 }

 sidebar.on('shown', updateToggleButton);
 sidebar.on('hidden', updateToggleButton);

 // Initial button state
 updateToggleButton();

 var marker = L.marker([51.2, 7]).addTo(map);

 map.on('click', function () {
     if (sidebar.isVisible()) {
         sidebar.hide();
         updateToggleButton();
     }
 });