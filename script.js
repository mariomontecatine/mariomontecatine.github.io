document.addEventListener("DOMContentLoaded", () => {
  // Elementos del DOM
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("nav-menu");
  const navLinks = document.querySelectorAll(".nav-link");

  // Función para alternar el menú
  const toggleMenu = () => {
    hamburger.classList.toggle("active");
    navMenu.classList.toggle("active");

    // Bloquear scroll del body cuando el menú está abierto
    if (navMenu.classList.contains("active")) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  };

  // Event Listener para el botón hamburguesa
  hamburger.addEventListener("click", toggleMenu);

  // Cerrar menú al hacer clic en un enlace
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      // Solo cerrar si está abierto (útil para móvil)
      if (navMenu.classList.contains("active")) {
        toggleMenu();
      }
    });
  });

  // Cerrar menú al hacer clic fuera (Opcional, mejora UX)
  document.addEventListener("click", (e) => {
    if (
      !hamburger.contains(e.target) &&
      !navMenu.contains(e.target) &&
      navMenu.classList.contains("active")
    ) {
      toggleMenu();
    }
  });

  // Scroll Header Styling (Opcional)
  // Añade una sombra extra al bajar si se desea más contraste
  window.addEventListener("scroll", () => {
    const header = document.getElementById("header");
    if (window.scrollY > 50) {
      header.style.boxShadow = "0 2px 10px rgba(0,0,0,0.05)";
    } else {
      header.style.boxShadow = "none";
    }
  });
});
