/* BRAAR Rádio — Modal de permissão única + player persistente */

async function fetchTracks() {
  const r = await fetch('https://api.github.com/repos/BRAAR-ORG/braarradio/releases/tags/musica');
  const d = await r.json();
  if (!d.assets) return { songs: [], locs: [], vinhetas: [] };

  const songs = [], locs = [], vinhetas = [];
  for (const a of d.assets) {
    if (a.name.endsWith('.mp3')) {
      if (a.name.startsWith('LOC_Sarah')) locs.push(a.browser_download_url);
      else if (a.name.startsWith('VIN_BRAAR')) vinhetas.push(a.browser_download_url);
      else songs.push(a.browser_download_url);
    }
  }
  return { songs, locs, vinhetas };
}

function formatTrackName(f) {
  return f.replace('.mp3', '').replace(/[-_.]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fadeAudio(a, v, d = 2000) {
  const s = (v - a.volume) / (d / 100);
  const i = setInterval(() => {
    a.volume = Math.min(Math.max(a.volume + s, 0), 1);
    if ((s > 0 && a.volume >= v) || (s < 0 && a.volume <= v)) clearInterval(i);
  }, 100);
}

async function initPlayer() {
  const p = document.getElementById('audioPlayer'),
        v = document.getElementById('voicePlayer'),
        vin = document.getElementById('vinhetaPlayer'),
        n = document.getElementById('trackName'),
        b = document.getElementById('liveBanner'),
        prompt = document.getElementById('playPrompt'),
        start = document.getElementById('startBtn'),
        mute = document.getElementById('muteBtn'),
        toggle = document.getElementById('soundToggle');

  const { songs, locs, vinhetas } = await fetchTracks();
  if (!songs.length) {
    n.textContent = 'Nenhuma música encontrada.';
    return;
  }

  const shuf = a => a.sort(() => Math.random() - 0.5);
  shuf(songs); shuf(locs); shuf(vinhetas);

  let idx = 0, c = 0, next = Math.floor(Math.random() * 9) + 2;
  const saved = JSON.parse(localStorage.getItem('braar_state') || '{}');
  if (saved.song && songs.includes(saved.song)) idx = songs.indexOf(saved.song);

  function persist(song, pos) {
    localStorage.setItem('braar_state', JSON.stringify({ song, pos }));
  }

  function playNext(resume = false) {
    let isLoc = false;
    if (locs.length && c >= next) {
      isLoc = true;
      c = 0;
      next = Math.floor(Math.random() * 9) + 2;
    }

    if (isLoc) {
      fadeAudio(p, 0.2, 1500);
      const loc = locs[Math.floor(Math.random() * locs.length)];
      n.textContent = 'AO VIVO com Sarah';
      b.classList.add('show');
      v.src = loc;
      v.volume = 1;
      v.play().catch(() => {});
      v.onended = () => {
        b.classList.remove('show');
        playVinheta();
      };
    } else {
      const s = songs[idx];
      idx = (idx + 1) % songs.length;
      c++;
      n.textContent = formatTrackName(s.split('/').pop());
      p.src = s;
      if (resume && saved.song === s && saved.pos) {
        try { p.currentTime = saved.pos; } catch {}
      }
      p.play().catch(() => showPrompt());
      p.onended = playNext;
      clearInterval(p._sv);
      p._sv = setInterval(() => persist(s, p.currentTime), 4000);
    }
  }

  function playVinheta() {
    if (!vinhetas.length) return playNext();
    const vinUrl = vinhetas[Math.floor(Math.random() * vinhetas.length)];
    vin.src = vinUrl;
    vin.volume = 1;
    vin.play().catch(() => {});
    vin.onended = () => {
      fadeAudio(p, 1, 1500);
      playNext();
    };
  }

  function startPlayback(muted = false, resume = true) {
    p.muted = v.muted = vin.muted = muted;
    playNext(resume);
    toggle.classList.remove('hidden');
    toggle.textContent = muted ? '🔇' : '🔊';
  }

  // Toggle som
  toggle.onclick = () => {
    const muted = !p.muted;
    p.muted = v.muted = vin.muted = muted;
    toggle.textContent = muted ? '🔇' : '🔊';
  };

  const interacted = localStorage.getItem('braar_interacted') === '1';

  if (interacted) {
    // ✅ Usuário já aceitou ou recusou → nunca mais mostra o modal
    prompt.remove();
    startPlayback(false, true);
  } else {
    // 🔔 Primeira visita → mostrar o aviso
    showPrompt();
    start.onclick = () => {
      localStorage.setItem('braar_interacted', '1');
      hidePrompt();
      startPlayback(false, true);
    };
    mute.onclick = () => {
      localStorage.setItem('braar_interacted', '1');
      hidePrompt();
      startPlayback(true, true);
    };
  }

  function showPrompt() {
    prompt.classList.remove('hidden');
    prompt.style.display = 'flex';
  }
  function hidePrompt() {
    prompt.classList.add('hidden');
    setTimeout(() => prompt.remove(), 500); // 🔥 remove do DOM depois
  }
}

function simulateListeners() {
  const e = document.getElementById('listenersCount');
  let l = Number(localStorage.getItem('braar_listeners')) || Math.floor(Math.random() * 40) + 20;
  e.textContent = `👥 ${l} ouvintes online`;
  setInterval(() => {
    const c = Math.floor(Math.random() * 5) - 2;
    l = Math.max(1, l + c);
    e.textContent = `👥 ${l} ouvintes online`;
    e.classList.add('updated');
    setTimeout(() => e.classList.remove('updated'), 500);
    localStorage.setItem('braar_listeners', l);
  }, 8000);
}

initPlayer();
simulateListeners();
