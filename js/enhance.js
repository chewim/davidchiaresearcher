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
   * Scroll reveal — global motion system.
   * HTML carries the intent (.reveal / .reveal-title / .reveal-visual /
   * .reveal-group > .stagger-item); this only wires up the mask-title
   * line split and the IntersectionObserver activation. Content is never
   * permanently hidden: if JS or IO is unavailable, everything is shown.
   * ------------------------------------------------------------------- */
  function splitTitleLines(el) {
    if (el.dataset.split === "1") return;
    const words = el.textContent.trim().split(/\s+/).filter(Boolean);
    if (words.length < 2) return; // nothing meaningful to split

    // Measure with plain inline spans + sibling space text nodes so the
    // browser wraps exactly as it would for normal text.
    el.textContent = "";
    const wordSpans = words.map((word) => {
      const span = document.createElement("span");
      span.textContent = word;
      el.appendChild(span);
      el.appendChild(document.createTextNode(" "));
      return span;
    });

    const lines = [];
    let lastTop = null;
    wordSpans.forEach((span) => {
      const top = span.offsetTop;
      if (top !== lastTop) {
        lines.push([]);
        lastTop = top;
      }
      lines[lines.length - 1].push(span.textContent);
    });

    el.textContent = "";
    lines.forEach((lineWords, i) => {
      const mask = document.createElement("span");
      mask.className = "reveal-line-mask";
      const inner = document.createElement("span");
      inner.className = "reveal-line-inner";
      inner.style.transitionDelay = `${i * 70}ms`;
      inner.textContent = lineWords.join(" ");
      mask.appendChild(inner);
      el.appendChild(mask);
    });

    el.dataset.split = "1";
    el.classList.add("is-split");
  }

  /* Structural groups: rather than hand-tagging every paragraph, card and
   * figure across every page with .stagger-item, we recognize the site's
   * existing containers and reveal their direct children in sequence.
   * Adding a new case study or section automatically inherits the same
   * rhythm — nothing to remember to tag by hand. */
  const AUTO_GROUPS = [
    { container: ".case-section", items: "h2, h3, p, ul, ol, figure, blockquote, table, .callout", step: 90 },
    { container: ".evidence-flow", items: ".evidence-flow__step, .evidence-flow__arrow", step: 100 },
    { container: ".card-grid", items: ".project-card", step: 90 },
    { container: ".capability-grid", items: ".capability-card", step: 70 },
    { container: ".cv-section", items: ".cv-item, .tag-list", step: 70 },
  ];

  function directChildren(el, selector) {
    return Array.from(el.children).filter((child) => child.matches(selector));
  }

  function revealFamilyFor(el) {
    if (el.tagName === "FIGURE" || el.classList.contains("case-figure")) return "reveal-visual";
    return "reveal";
  }

  function prepareAutoGroups() {
    const groups = [];
    AUTO_GROUPS.forEach(({ container, items, step }) => {
      document.querySelectorAll(container).forEach((group) => {
        const children = directChildren(group, items);
        if (!children.length) return;
        children.forEach((child) => {
          if (!child.classList.contains("reveal") && !child.classList.contains("reveal-visual")) {
            child.classList.add(revealFamilyFor(child));
          }
        });
        group.classList.add("reveal-group");
        groups.push({ el: group, children, step });
      });
    });
    return groups;
  }

  function showAllRevealTargets() {
    document
      .querySelectorAll(".reveal, .reveal-title, .reveal-visual")
      .forEach((el) => el.classList.add("is-visible"));
  }

  function initReveal() {
    const titles = document.querySelectorAll(".reveal-title");
    titles.forEach(splitTitleLines);

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      // Still group + split for correct static layout; the reduced-motion
      // CSS block neutralizes the transitions themselves.
      prepareAutoGroups();
      showAllRevealTargets();
      return;
    }

    const groups = prepareAutoGroups();

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0, rootMargin: "0px 0px -20% 0px" }
    );
    // Individually-marked elements outside any auto-group (hero, page intros).
    document
      .querySelectorAll(".reveal, .reveal-title, .reveal-visual")
      .forEach((el) => {
        if (!el.closest(".reveal-group") || el.classList.contains("reveal-title")) io.observe(el);
      });

    const maxSpread = 560;
    const groupIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const match = groups.find((g) => g.el === entry.target);
          if (match) {
            match.children.forEach((item, i) => {
              item.style.transitionDelay = `${Math.min(i * match.step, maxSpread)}ms`;
              item.classList.add("is-visible");
            });
          }
          groupIo.unobserve(entry.target);
        });
      },
      { threshold: 0, rootMargin: "0px 0px -20% 0px" }
    );
    document.querySelectorAll(".reveal-group").forEach((el) => groupIo.observe(el));
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
   * Header scroll state — the navbar itself is always present (CSS
   * handles its entrance animation on load); this only toggles a
   * lighter, shrunk state once the page has scrolled past the top.
   * ------------------------------------------------------------------- */
  function initHeaderScrollState() {
    const header = document.getElementById("site-header");
    if (!header) return;

    let ticking = false;
    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();
  }

  initReveal();
  initScrollspy();
  initFloatingActions();
  initReadingTime();
  initCaseTocSpy();
  initCopyButtons();
  initHeaderScrollState();
})();
