document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav');

    if (toggleBtn && navMenu) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Stops the click from reaching the document
            navMenu.classList.toggle('show');
        });

        // Close menu if user clicks anywhere else on the page
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
                navMenu.classList.remove('show');
            }
        });
    }
});