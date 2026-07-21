/**
 * Progressive-enhancement layer: scroll reveal, scrollspy, floating actions,
 * reading time + TOC spy (case pages), copy-to-clipboard.
 * Runs after components.js has injected the header/footer.
 * Everything here is additive — if a piece fails, the page still works.
 */
(function () {
  const page = document.body.dataset.page;
  const lang = document.documentElement.lang === "en" ? "en" : "es";
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const strings =
    lang === "en"
      ? {
          backToTop: "Back to top",
          contact: "Contact",
          talk: "Let's talk",
          reading: "Reading",
          copied: "Copied",
        }
      : {
          backToTop: "Volver arriba",
          contact: "Contactar",
          talk: "Hablemos",
          reading: "Lectura",
          copied: "Copiado",
        };

  const homePage = lang === "es" ? "index-es.html" : "index.html";
  const contactHref = page === "home" ? "#contacto" : `${homePage}#contacto`;

  /* ---------------------------------------------------------------------
   * Scroll reveal
   * ------------------------------------------------------------------- */
  function initReveal() {
    if (!("IntersectionObserver" in window) || prefersReducedMotion) return;

    const selectors = [
      ".project-card",
      ".capability-card",
      ".case-section",
      ".section-head",
      ".evidence-flow",
      ".contact-box",
      ".cv-item",
      ".case-cta",
    ];
    const els = document.querySelectorAll(selectors.join(","));
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
    );

    els.forEach((el, i) => {
      el.classList.add("reveal");
      el.style.transitionDelay = `${Math.min(i % 3, 2) * 60}ms`;
      io.observe(el);
    });
  }

  /* ---------------------------------------------------------------------
   * Scrollspy (home page nav)
   * ------------------------------------------------------------------- */
  function initScrollspy() {
    if (page !== "home" || !("IntersectionObserver" in window)) return;

    const sections = ["inicio", "investigaciones", "sobre-mi", "contacto"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length) return;

    const links = Array.from(document.querySelectorAll(".nav__link"));

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          links.forEach((link) => {
            const isMatch = link.getAttribute("href") === `#${id}`;
            if (isMatch) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach((section) => io.observe(section));
  }

  /* ---------------------------------------------------------------------
   * Floating actions: persistent contact CTA + back-to-top
   * ------------------------------------------------------------------- */
  function initFloatingActions() {
    const wrap = document.createElement("div");
    wrap.className = "floating-actions no-print";

    const backToTop = document.createElement("button");
    backToTop.type = "button";
    backToTop.className = "back-to-top";
    backToTop.setAttribute("aria-label", strings.backToTop);
    backToTop.innerHTML = "&uarr;";
    backToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    });

    const cta = document.createElement("a");
    cta.className = "floating-cta";
    cta.href = contactHref;
    cta.setAttribute("aria-label", strings.contact);
    cta.innerHTML = `
      <svg class="floating-cta__icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      <span class="floating-cta__label" aria-hidden="true">${strings.talk}</span>
    `;

    wrap.appendChild(backToTop);
    wrap.appendChild(cta);
    document.body.appendChild(wrap);

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        backToTop.classList.toggle("is-visible", window.scrollY > 500);
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Hide the CTA while a contact block is already on screen (avoid redundancy)
    const contactBlocks = document.querySelectorAll("#contacto, .case-cta");
    if (contactBlocks.length && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          const anyVisible = entries.some((e) => e.isIntersecting);
          cta.style.display = anyVisible ? "none" : "";
        },
        { threshold: 0.3 }
      );
      contactBlocks.forEach((el) => io.observe(el));
    }

    // Hide the whole floating cluster once the footer is in view, so it never
    // overlaps and covers the footer's own links (email, nav, copyright).
    const footer = document.getElementById("site-footer");
    if (footer && "IntersectionObserver" in window) {
      const footerIo = new IntersectionObserver(
        (entries) => {
          wrap.classList.toggle("is-hidden", entries[0].isIntersecting);
        },
        { threshold: 0.01 }
      );
      footerIo.observe(footer);
    }
  }

  /* ---------------------------------------------------------------------
   * Reading time badge (case study pages)
   * ------------------------------------------------------------------- */
  function initReadingTime() {
    if (page !== "case") return;
    const content = document.querySelector(".case-content");
    const meta = document.querySelector(".case-meta");
    if (!content || !meta) return;

    const words = content.textContent.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.round(words / 200));
    const item = document.createElement("div");
    item.innerHTML = `<dt>${strings.reading}</dt><dd class="reading-time">${minutes} min</dd>`;
    meta.appendChild(item);
  }

  /* ---------------------------------------------------------------------
   * Case table-of-contents spy: highlights the section currently in view
   * instead of a fixed progress bar, so nothing overlaps the content.
   * ------------------------------------------------------------------- */
  function initCaseTocSpy() {
    if (page !== "case" || !("IntersectionObserver" in window)) return;

    const sections = Array.from(document.querySelectorAll(".case-section[id]"));
    const tocLinks = Array.from(document.querySelectorAll(".case-toc a"));
    if (!sections.length || !tocLinks.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          tocLinks.forEach((link) => {
            link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
          });
        });
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );

    sections.forEach((section) => io.observe(section));
  }

  /* ---------------------------------------------------------------------
   * Copy to clipboard
   * ------------------------------------------------------------------- */
  function initCopyButtons() {
    document.querySelectorAll(".copy-btn[data-copy]").forEach((btn) => {
      const original = btn.textContent;
      btn.addEventListener("click", async () => {
        const value = btn.getAttribute("data-copy");
        try {
          await navigator.clipboard.writeText(value);
          btn.innerHTML = `<span class="copy-btn__check" aria-hidden="true">&#10003;</span> ${strings.copied}`;
        } catch (err) {
          btn.textContent = value;
        }
        setTimeout(() => {
          btn.textContent = original;
        }, 1800);
      });
    });
  }

  /* ---------------------------------------------------------------------
   * Header fade-in on scroll
   * ------------------------------------------------------------------- */
  function initHeaderFadeIn() {
    const header = document.getElementById("site-header");
    if (!header || prefersReducedMotion) return;
    header.classList.add("header-fade-init");

    let revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      header.classList.add("is-visible");
      window.removeEventListener("scroll", reveal);
    }

    if (window.scrollY > 4) {
      reveal();
    } else {
      window.addEventListener("scroll", reveal, { passive: true });
      setTimeout(reveal, 1200);
    }
  }

  initReveal();
  initScrollspy();
  initFloatingActions();
  initReadingTime();
  initCaseTocSpy();
  initCopyButtons();
  initHeaderFadeIn();
})();
