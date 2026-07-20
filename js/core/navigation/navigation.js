export function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const panels = document.querySelectorAll('.panel');

    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault(); 
            const targetId = link.dataset.panel; 

            panels.forEach(panel => panel.classList.remove('active'));
            
            const targetPanel = document.getElementById(targetId);
            if (targetPanel) targetPanel.classList.add('active');

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}