(function () {
  "use strict";

  let data = null;
  let allPhotos = [];
  let lbIndex = 0;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const PASS = "321";
  const UNLOCK_KEY = "isabela-unlock";

  function setupLock() {
    return new Promise((resolve) => {
      if (sessionStorage.getItem(UNLOCK_KEY) === "1") {
        $("#lock-screen")?.classList.add("unlocked");
        $("#album")?.classList.remove("locked");
        resolve();
        return;
      }

      const screen = $("#lock-screen");
      const input = $("#lock-input");
      const btn = $("#lock-btn");
      const err = $("#lock-error");

      const tryUnlock = () => {
        if (input.value.trim() === PASS) {
          sessionStorage.setItem(UNLOCK_KEY, "1");
          err.classList.add("hidden");
          screen.classList.add("unlocked");
          $("#album")?.classList.remove("locked");
          setTimeout(resolve, 400);
        } else {
          err.classList.remove("hidden");
          input.value = "";
          input.focus();
          screen.style.animation = "shake 0.45s ease";
          setTimeout(() => { screen.style.animation = ""; }, 500);
        }
      };

      btn.addEventListener("click", tryUnlock);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") tryUnlock();
      });
      input.focus();
    });
  }

  async function loadManifest() {
    const res = await fetch("data/manifest.json");
    if (!res.ok) throw new Error("manifest");
    data = await res.json();
  }

  function registerPhoto(src, caption) {
    const idx = allPhotos.length;
    allPhotos.push({ src, caption: caption || "" });
    return idx;
  }

  function daysSince(iso) {
    if (!iso) return null;
    const start = new Date(iso + "T12:00:00");
    const now = new Date();
    return Math.floor((now - start) / 86400000);
  }

  function typewriter(el, text, speed, cb) {
    if (!el || !text) return;
    el.textContent = "";
    let i = 0;
    const tick = () => {
      if (i < text.length) {
        el.textContent += text[i++];
        setTimeout(tick, speed);
      } else if (cb) cb();
    };
    tick();
  }

  function runIntro() {
    const screen = $("#intro-screen");
    const firstName = (data.bride || "Isabela").split(" ")[0];
    const key = "isabela-album-v3";

    if (localStorage.getItem(key)) {
      screen.classList.add("done");
      return;
    }

    screen.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    typewriter($("#intro-name"), firstName + "...", 120, () => {
      setTimeout(() => {
        screen.classList.add("done");
        document.body.style.overflow = "";
        localStorage.setItem(key, "1");
      }, 2200);
    });
  }

  function setupDaysCounter() {
    const el = $("#hero-days");
    if (!el) return;
    const days = daysSince(data.weddingDateISO);
    if (days != null && days >= 0) {
      el.textContent = days === 0 ? "Hoje é nosso dia" : `${days} dias de casados`;
    }
  }

  function buildAlbum() {
    $("#hero-name").textContent = data.bride;
    setupDaysCounter();

    const openingEl = $("#hero-opening");
    if (openingEl && data.opening) {
      setTimeout(() => typewriter(openingEl, data.opening, 28), 800);
    }

    $("#wedding-date").textContent = data.weddingDate;
    if (data.finale) {
      $("#finale-text").textContent = data.finale;
    } else {
      $("#finale-text")?.remove();
    }

    const hero = data.heroImage || (data.preEnsaio[0] && data.preEnsaio[0].src);
    const heroImg = $("#hero-img");
    if (hero && heroImg) {
      heroImg.src = hero;
      heroImg.alt = `${data.bride} e ${data.groom || "Luan"}`;
    }

    buildStory();
    buildPre();
    buildCasamento();
    setupScroll();
    setupNav();
    setupLightbox();
    setupEnvelope();
    runIntro();
  }

  function buildStory() {
    const track = $("#story-track");
    track.innerHTML = "";
    const total = data.memorias.length;

    data.memorias.forEach((item, i) => {
      const idx = registerPhoto(item.src, `${item.title}. ${item.caption}`);
      if (i > 0) {
        const line = document.createElement("div");
        line.className = "story-line";
        track.appendChild(line);
      }
      const num = String(i + 1).padStart(2, "0");
      const card = document.createElement("article");
      card.className = "story-card";
      card.innerHTML = `
        <div class="story-text">
          <span class="story-num">${num} / ${String(total).padStart(2, "0")}</span>
          <span class="story-era">${item.era || ""}</span>
          <h3>${item.title}</h3>
          <p>${item.caption}</p>
        </div>
        <div class="story-photo">
          <img src="${item.src}" alt="${item.title}" loading="lazy" data-lb="${idx}">
        </div>`;
      track.appendChild(card);
    });
  }

  function buildPre() {
    const el = $("#gallery-pre");
    el.innerHTML = "";
    data.preEnsaio.forEach((item) => {
      const idx = registerPhoto(item.src, item.caption);
      const div = document.createElement("div");
      div.className = "masonry-item";
      div.innerHTML = `
        <figure>
          <img src="${item.src}" alt="Pré-ensaio" loading="lazy" data-lb="${idx}">
          ${item.caption ? `<figcaption>${item.caption}</figcaption>` : ""}
        </figure>`;
      el.appendChild(div);
    });
  }

  function buildCasamento() {
    const el = $("#gallery-casamento");
    el.innerHTML = "";
    const caps = [
      "Esse beijo eu lembro como se fosse ontem",
      "Você linda demais nesse vestido",
      "O sim que a gente esperou tanto",
      "Família, amor e gratidão",
      "Minha noiva, minha esposa",
      "Cada detalhe desse dia importa",
      "Rindo e chorando ao mesmo tempo",
      "Nosso dia, do jeito que a gente sonhou",
      "Olha que foto perfeita",
      "Celebrando com quem a gente ama",
      "Esse olhar diz tudo",
      "Dança, festa e muito amor",
    ];
    data.casamento.forEach((item, i) => {
      const cap = caps[i % caps.length];
      const idx = registerPhoto(item.src, cap);
      const div = document.createElement("div");
      div.className = "showcase-item";
      div.innerHTML = `<img src="${item.src}" alt="Casamento" loading="lazy" data-lb="${idx}">`;
      el.appendChild(div);
    });
  }

  function setupEnvelope() {
    const btn = $("#envelope-btn");
    const letter = $("#secret-letter");
    const body = $("#secret-body");
    if (!btn || !letter || !body) return;

    if (data.secretLetter) body.textContent = data.secretLetter;

    btn.addEventListener("click", () => {
      btn.classList.add("opening");
      setTimeout(() => {
        btn.classList.add("opened");
        letter.classList.remove("hidden");
        launchConfetti();
        letter.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 600);
    });
  }

  function launchConfetti() {
    const canvas = $("#confetti-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#b8954a", "#dcc07a", "#faf6ef", "#c9a962", "#e8d5a3"];
    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * -0.5,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: 2 + Math.random() * 4,
      vx: -2 + Math.random() * 4,
      rot: Math.random() * 360,
      vr: -6 + Math.random() * 12,
    }));

    let frame = 0;
    const maxFrames = 180;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      frame++;
      if (frame < maxFrames) requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    draw();
  }

  function setupScroll() {
    const bar = $("#progress-bar");
    const sections = [
      { id: "chapter-hero", key: "hero" },
      { id: "chapter-memorias", key: "memorias" },
      { id: "chapter-pre", key: "pre" },
      { id: "chapter-casamento", key: "cas" },
      { id: "chapter-finale", key: "finale" },
    ];

    const reveal = () => {
      const st = window.scrollY;
      const dh = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = dh > 0 ? `${(st / dh) * 100}%` : "0%";

      $$(".story-card, .masonry-item, .showcase-item").forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.88) {
          el.classList.add("visible");
        }
      });

      sections.forEach(({ id, key }) => {
        const sec = document.getElementById(id);
        if (!sec) return;
        const r = sec.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.5 && r.bottom > 0) {
          $$(".album-nav button").forEach((b) => {
            b.classList.toggle("active", b.dataset.ch === key);
          });
        }
      });
    };

    window.addEventListener("scroll", reveal, { passive: true });
    reveal();
  }

  function setupNav() {
    $$(".album-nav button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const map = {
          hero: "chapter-hero",
          memorias: "chapter-memorias",
          pre: "chapter-pre",
          cas: "chapter-casamento",
          finale: "chapter-finale",
        };
        const target = document.getElementById(map[btn.dataset.ch]);
        if (target) target.scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  function setupLightbox() {
    document.body.addEventListener("click", (e) => {
      const img = e.target.closest("[data-lb]");
      if (!img) return;
      lbIndex = parseInt(img.dataset.lb, 10);
      showLightbox();
    });

    $("#lb-close").addEventListener("click", hideLightbox);
    $("#lb-prev").addEventListener("click", () => navigate(-1));
    $("#lb-next").addEventListener("click", () => navigate(1));
    $("#lightbox").addEventListener("click", (e) => {
      if (e.target.id === "lightbox") hideLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if ($("#lightbox").classList.contains("hidden")) return;
      if (e.key === "Escape") hideLightbox();
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
    });
  }

  function showLightbox() {
    const p = allPhotos[lbIndex];
    if (!p) return;
    $("#lb-img").src = p.src;
    $("#lb-caption").textContent = p.caption;
    $("#lightbox").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function hideLightbox() {
    $("#lightbox").classList.add("hidden");
    document.body.style.overflow = "";
  }

  function navigate(d) {
    lbIndex = (lbIndex + d + allPhotos.length) % allPhotos.length;
    showLightbox();
  }

  async function init() {
    try {
      await setupLock();
      await loadManifest();
      buildAlbum();
    } catch {
      alert("Não foi possível carregar o álbum.");
    }
  }

  init();
})();
