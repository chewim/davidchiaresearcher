/**
 * Reusable header/footer injected on every page.
 * Each page sets `document.body.dataset.page` to one of:
 * "home" | "cv" | "case", and `document.documentElement.lang` to "es" or "en".
 * English (default) pages: index.html, caso-*.html, cv.html
 * Spanish pages: index-es.html, caso-*-es.html, cv-es.html
 */
(function () {
  const SITE_NAME = "David Chia";
  const LANG = document.documentElement.lang === "es" ? "es" : "en";

  const HOME_PAGE = LANG === "es" ? "index-es.html" : "index.html";
  const CV_PAGE = LANG === "es" ? "cv-es.html" : "cv.html";
  const CV_PDF = LANG === "es" ? "David-Chia-CV-ES.pdf" : "David-Chia-CV.pdf";

  const STRINGS = {
    es: {
      nav: {
        inicio: "Inicio",
        investigaciones: "Investigaciones",
        sobreMi: "Sobre mí",
        cv: "CV",
        contacto: "Contacto",
      },
      openMenu: "Abrir menú de navegación",
      mainNav: "Navegación principal",
      downloadCta: "Descargar CV",
      footerNav: "Navegación del pie de página",
      langLabel: "Idioma",
      role: "UX Researcher",
    },
    en: {
      nav: {
        inicio: "Home",
        investigaciones: "Research",
        sobreMi: "About",
        cv: "CV",
        contacto: "Contact",
      },
      openMenu: "Open navigation menu",
      mainNav: "Main navigation",
      downloadCta: "Download CV",
      footerNav: "Footer navigation",
      langLabel: "Language",
      role: "UX Researcher",
    },
  };
  const t = STRINGS[LANG];

  const NAV_ITEMS = [
    { key: "inicio", hash: "inicio", match: ["home"] },
    { key: "investigaciones", hash: "investigaciones", match: ["home", "case"] },
    { key: "sobreMi", hash: "sobre-mi", match: ["home"] },
    { key: "cv", page: CV_PAGE, match: ["cv"] },
    { key: "contacto", hash: "contacto", match: ["home"] },
  ];

  function buildHref(item) {
    if (item.page) return item.page;
    const currentPage = document.body.dataset.page;
    return currentPage === "home" ? `#${item.hash}` : `${HOME_PAGE}#${item.hash}`;
  }

  // Maps the current file to its counterpart in the other language.
  // en (default): name.html <-> es: name-es.html (index.html <-> index-es.html, etc.)
  function counterpartFile() {
    const file = location.pathname.split("/").pop() || HOME_PAGE;
    return LANG === "es" ? file.replace(/-es\.html$/, ".html") : file.replace(/\.html$/, "-es.html");
  }

  function renderLangSwitch() {
    const hash = location.hash || "";
    const currentFile = location.pathname.split("/").pop() || HOME_PAGE;
    const counterpart = counterpartFile();
    const esHref = (LANG === "es" ? currentFile : counterpart) + hash;
    const enHref = (LANG === "en" ? currentFile : counterpart) + hash;

    return `
      <div class="lang-switch" aria-label="${t.langLabel}">
        <a href="${esHref}"${LANG === "es" ? ' aria-current="page"' : ""}>ES</a>
        <span aria-hidden="true">·</span>
        <a href="${enHref}"${LANG === "en" ? ' aria-current="page"' : ""}>EN</a>
      </div>
    `;
  }

  function renderHeader() {
    const mount = document.getElementById("site-header");
    if (!mount) return;
    const currentPage = document.body.dataset.page;

    const links = NAV_ITEMS.map((item) => {
      const isActive = item.match.includes(currentPage);
      const href = buildHref(item);
      return `<li><a class="nav__link" href="${href}"${isActive ? ' aria-current="page"' : ""}>${t.nav[item.key]}</a></li>`;
    }).join("");

    mount.innerHTML = `
      <div class="site-header__inner">
        <a class="logo" href="${HOME_PAGE}">${SITE_NAME}<span>.</span></a>
        <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="${t.openMenu}">
          <span class="nav__toggle-icon"></span>
        </button>
        <nav class="nav" id="primary-nav" aria-label="${t.mainNav}">
          <ul class="nav__list">${links}</ul>
          <a class="btn btn-primary nav__cta" href="${CV_PDF}" download>${t.downloadCta}</a>
          ${renderLangSwitch()}
        </nav>
      </div>
    `;

    const toggle = mount.querySelector(".nav__toggle");
    const nav = mount.querySelector(".nav");
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      nav.classList.toggle("is-open");
      document.body.classList.toggle("nav-open", !expanded);
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
        document.body.classList.remove("nav-open");
      });
    });
  }

  function renderFooter() {
    const mount = document.getElementById("site-footer");
    if (!mount) return;
    const currentPage = document.body.dataset.page;
    const prefix = currentPage === "home" ? "" : HOME_PAGE;

    const navLinks = NAV_ITEMS.map((item) => {
      const href = item.page ? item.page : `${prefix}#${item.hash}`;
      return `<a href="${href}">${t.nav[item.key]}</a>`;
    }).join("");

    mount.innerHTML = `
      <div class="site-footer__inner">
        <div class="site-footer__row">
          <a class="site-footer__logo" href="${HOME_PAGE}">${SITE_NAME}<span>.</span></a>
          <nav class="footer-nav" aria-label="${t.footerNav}">${navLinks}</nav>
        </div>
        <div class="site-footer__bottom">
          <p>&copy; ${new Date().getFullYear()} ${SITE_NAME}. ${t.role}.</p>
        </div>
      </div>
    `;
  }

  renderHeader();
  renderFooter();
})();
