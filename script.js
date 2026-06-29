/* ============================================================
   ZIKS WEBSITE — script.js
   Handles: page navigation, cursor, swipe gestures, click sound
============================================================ */

(function () {
  'use strict';

  // ============================================================
  //  Click Sound — Web Audio API (no external file needed)
  // ============================================================
  let audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playClick(type = 'ui') {
    try {
      const ctx = getAudioCtx();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      filter.type = 'bandpass';

      if (type === 'dock') {
        // Dock tap — punchy mid click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(820, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.08);
        filter.frequency.value = 1200;
        filter.Q.value = 1.5;
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'card') {
        // Card open — deeper, satisfying thud
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.12);
        filter.frequency.value = 600;
        filter.Q.value = 1;
        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.14);
      } else {
        // Generic UI click — short bright tick
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
        filter.frequency.value = 2000;
        filter.Q.value = 2;
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.06);
      }
    } catch (e) {
      // Silently fail if audio not supported
    }
  }

  // Page order (left → right)
  const PAGE_ORDER = ['projects', 'profile', 'socials'];

  // ---- State ----
  let currentPage = 'profile';

  // ---- DOM refs ----
  const pages    = {};
  const tabBtns  = {};
  const dotBtns  = {};

  PAGE_ORDER.forEach(id => {
    pages[id]   = document.getElementById(`page-${id}`);
    tabBtns[id] = document.querySelector(`.dock-item[data-page="${id}"]`);
    dotBtns[id] = null;
  });

  // ============================================================
  //  Page navigation
  // ============================================================
  function goTo(targetId) {
    if (targetId === currentPage) return;

    const fromIdx = PAGE_ORDER.indexOf(currentPage);
    const toIdx   = PAGE_ORDER.indexOf(targetId);
    const goRight = toIdx > fromIdx;

    const outPage = pages[currentPage];
    const inPage  = pages[targetId];

    outPage.classList.remove('active');
    outPage.style.transform = goRight ? 'translateX(-60px)' : 'translateX(60px)';
    outPage.style.opacity   = '0';
    outPage.style.pointerEvents = 'none';

    inPage.style.transition = 'none';
    inPage.style.transform  = goRight ? 'translateX(60px)' : 'translateX(-60px)';
    inPage.style.opacity    = '0';

    void inPage.offsetWidth;

    inPage.style.transition = '';
    inPage.style.transform  = 'translateX(0)';
    inPage.style.opacity    = '1';
    inPage.style.pointerEvents = 'auto';
    inPage.classList.add('active');

    inPage.scrollTop = 0;
    updateControls(targetId);
    currentPage = targetId;
  }

  function updateControls(activeId) {
    PAGE_ORDER.forEach(id => {
      if (tabBtns[id]) {
        tabBtns[id].classList.toggle('active', id === activeId);
        tabBtns[id].setAttribute('aria-current', id === activeId ? 'page' : 'false');
      }
    });
  }

  // ---- Bind dock buttons + ripple + sound ----
  function triggerDockBounce(btnElement) {
    if (!btnElement) return;
    btnElement.classList.remove('bounce-active');
    void btnElement.offsetWidth; // Hack CSS Reflow untuk me-restart animasi instant
    btnElement.classList.add('bounce-active');
    
    btnElement.addEventListener('animationend', () => {
      btnElement.classList.remove('bounce-active');
    }, { once: true });
  }

  document.querySelectorAll('.dock-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      playClick('dock');

      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());

      // JALANKAN ANIMASI BOUNCE SAAT DIKLIK
      triggerDockBounce(btn);

      goTo(btn.dataset.page);
    });
  });

  // ---- Project cards — clickable + sound ----
  document.querySelectorAll('.project-card[data-href]').forEach(card => {
    card.addEventListener('click', () => {
      playClick('card');
      const url = card.dataset.href;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });
  });

  // ---- Generic click sound on interactive elements ----
  const clickableSelectors = 'a[href], .role-tag, .social-row';
  document.querySelectorAll(clickableSelectors).forEach(el => {
    el.addEventListener('click', () => playClick('ui'));
  });

  // ---- Initial state ----
  updateControls(currentPage);

  // ============================================================
  //  Swipe gesture (touch)
  // ============================================================
  let touchStartX = 0;
  let touchStartY = 0;
  const SWIPE_THRESHOLD = 50;

  document.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > Math.abs(dx)) return;

    const currentIdx = PAGE_ORDER.indexOf(currentPage);

    if (dx < 0 && currentIdx < PAGE_ORDER.length - 1) {
      goTo(PAGE_ORDER[currentIdx + 1]);
    } else if (dx > 0 && currentIdx > 0) {
      goTo(PAGE_ORDER[currentIdx - 1]);
    }
  }, { passive: true });

  // ============================================================
  //  Keyboard navigation
  // ============================================================
  document.addEventListener('keydown', e => {
    const currentIdx = PAGE_ORDER.indexOf(currentPage);
    if (e.key === 'ArrowRight' && currentIdx < PAGE_ORDER.length - 1) {
      goTo(PAGE_ORDER[currentIdx + 1]);
    }
    if (e.key === 'ArrowLeft' && currentIdx > 0) {
      goTo(PAGE_ORDER[currentIdx - 1]);
    }
  });

  // ============================================================
  //  Custom cursor (desktop only)
  // ============================================================
  const cursor = document.getElementById('cursor');

  if (cursor && window.matchMedia('(pointer: fine)').matches) {
    let mouseX = 0, mouseY = 0;
    let curX = 0, curY = 0;

    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }, { passive: true });

    function tick() {
      curX += (mouseX - curX) * 0.16;
      curY += (mouseY - curY) * 0.16;
      cursor.style.left = curX + 'px';
      cursor.style.top  = curY + 'px';
      requestAnimationFrame(tick);
    }
    tick();

    const interactiveSelectors = 'a, button, .stat, .project-card, .social-row, .role-tag, .dock-item';
    document.querySelectorAll(interactiveSelectors).forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('expand'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('expand'));
    });

    document.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { cursor.style.opacity = '1'; });
  } else if (cursor) {
    cursor.style.display = 'none';
    document.body.style.cursor = 'auto';
  }

})();

// ============================================================
//  PASTE KODE DISCORD PROFILE & STATUS DI SINI (Paling Bawah)
// ============================================================
  const discordID = '1127233313740955729'; 
  const lanyardAPI = `https://api.lanyard.rest/v1/users/${discordID}`;

  fetch(lanyardAPI)
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        const user = data.data.discord_user;
        
        // 1. Atur Foto Utama
        const avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
        const imgEl = document.getElementById('discord-pfp');
        const fallbackEl = document.getElementById('avatar-fallback');
        
        imgEl.src = avatarUrl;
        imgEl.style.display = 'block';
        fallbackEl.style.display = 'none';

        // 2. Atur Avatar Decoration
        const decoEl = document.getElementById('discord-deco');
        if (user.avatar_decoration_data && user.avatar_decoration_data.asset) {
          const decoUrl = `https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=128`;
          decoEl.src = decoUrl;
          decoEl.style.display = 'block';
        } else {
          decoEl.style.display = 'none';
        }

        // 3. Atur Titik Status
        const statusEl = document.getElementById('discord-status');
        const currentStatus = data.data.discord_status;
        
        // KITA TAMBAHKAN BARIS INI UNTUK MELACAK DATA ASLI:
        console.log("Status asli dari Lanyard:", currentStatus); 
        
        statusEl.className = 'status-dot'; 
        statusEl.classList.add(currentStatus); 
        statusEl.style.display = 'flex';
        
      } else {
        console.warn('Gagal memuat profil Discord.');
      }
    })
    .catch(error => {
      console.error('Terjadi kesalahan Lanyard API:', error);
    });
  // ============================================================
;