/* ============================================================
   BRAAR RÁDIO — script.js
   - Permissão aparece 1x (localStorage: braar_permission)
   - Persistência de faixa + posição (localStorage: braar_state)
   - Compatível com GitHub Pages (100% client-side)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const player = document.getElementById('audioPlayer');
  const voice = document.getElementById('voicePlayer');
  const vinheta = document.getElementById('vinhetaPlayer');
  const trackNameEl = document.getElementById('trackName');
  const banner = document.getElementById('liveBanner');
  const prompt = document.getElementById('playPrompt');
  const startBtn = document.getElementById('startBtn');
  const muteBtn = document.getElementById('muteBtn');
  const soundToggle = document.getElementById('soundToggle');
  const listenersEl = document.getElementById('listenersCount');

  /* ---------- Persistence helpers ---------- */
  const PERM_KEY = 'braar_permission'; // 'granted' | 'muted' | null
  const STATE_KEY = 'braar_state';     // { song, pos }
  const LISTENERS_KEY = 'braar_listeners';

  const getPermission = () => localStorage.getItem(PERM_KEY);
  const setPermission = s => localStorage.setItem(PERM_KEY, s);
  const getState = () => JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
  const setState = obj => localStorage.setItem(STATE_KEY, JSON.stringify(obj));

  /* ---------- UI helpers ---------- */
  function hidePromptPermanently() {
    if (prompt && prompt.parentNode) prompt.parentNode.removeChild(prompt);
  }
  function showPrompt() {
    if (!prompt) return;
    prompt.classList.remove('hidden');
  }
  function hidePrompt() {
    if (!prompt) return;
    prompt.classList.add('hidden');
    // remove after animation to avoid reflow showing later
    setTimeout(() => { if (prompt && prompt.parentNode) prompt.parentNode.removeChild(prompt); }, 500);
  }

  /* ---------- Fetch tracks from GitHub release assets ---------- */
  async function fetchTracks() {
    try {
      const r = await fetch('https://api.github.com/repos/BRAAR-ORG/braarradio/releases/tags/musica');
      const data = await r.json();
      if (!data.assets) return { songs: [], locs: [], vinhetas: [] };
      const songs = [], locs = [], vinhetas = [];
      for (const a of data.assets) {
        if (!a.name) continue;
        if (!a.name.endsWith('.mp3')) continue;
        if (a.name.startsWith('LOC_Sarah')) locs.push(a.browser_download_url);
        else if (a.name.startsWith('VIN_BRAAR')) vinhetas.push(a.browser_download_url);
        else songs.push(a.browser_download_url);
      }
      return { songs, locs, vinhetas };
    } catch (err) {
      console.warn('Erro ao buscar faixas:', err);
      return { songs: [], locs: [], vinhetas: [] };
    }
  }

  /* ---------- Format helpers ---------- */
  function formatName(filename) {
    return filename.replace('.mp3', '').replace(/[-_.]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /* ---------- Player logic ---------- */
  (async function main() {
    const { songs, locs, vinhetas } = await fetchTracks();

    // shuffle arrays (non-cryptographic, fine for UI)
    const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } };
    shuffle(songs); shuffle(locs); shuffle(vinhetas);

    if (!songs.length) {
      trackNameEl.textContent = 'Nenhuma música encontrada.';
    }

    // restore saved playback state if exists
    const saved = getState();
    let index = 0;
    if (saved.song && songs.length) {
      const idx = songs.indexOf(saved.song);
      if (idx >= 0) index = idx;
    }

    let count = 0;
    let nextLoc = Math.floor(Math.random() * 9) + 2;
    let saveInterval = null;

    function persistProgress(songUrl) {
      try {
        const pos = player.currentTime || 0;
        setState({ song: songUrl, pos });
      } catch (e) { /* ignore */ }
    }

    function clearPersistInterval() {
      if (saveInterval) { clearInterval(saveInterval); saveInterval = null; }
    }

    async function playNext(resume = false) {
      // choose whether to play a locução
      let isLoc = false;
      if (locs.length && count >= nextLoc) {
        isLoc = true; count = 0; nextLoc = Math.floor(Math.random() * 9) + 2;
      }

      if (isLoc) {
        // play locução (voice)
        fadeVolumeTo(0.2, 1200);
        const locUrl = locs[Math.floor(Math.random() * locs.length)];
        trackNameEl.textContent = 'AO VIVO com Sarah';
        banner.classList.add('show');
        voice.src = locUrl;
        voice.currentTime = 0;
        voice.play().catch(() => {});
        voice.onended = () => { banner.classList.remove('show'); playVinhetaOrNext(); };
      } else {
        // play music
        if (!songs.length) return;
        const songUrl = songs[index];
        index = (index + 1) % songs.length;
        count++;
        trackNameEl.textContent = formatName(songUrl.split('/').pop());
        clearPersistInterval();
        player.src = songUrl;

        // resume position if requested and matching saved.song
        if (resume && saved.song === songUrl && saved.pos) {
          try { player.currentTime = saved.pos; } catch (e) { /* ignore */ }
        }

        // play and handle autoplay blocked on first try
        try {
          await player.play();
        } catch (err) {
          // If play() rejected and user already granted permission previously, fail silently (do not re-show prompt)
          // Put player muted so user doesn't get noise; show toggle so they can unmute manually.
          console.warn('play() rejected:', err);
          player.muted = true;
          soundToggle.classList.remove('hidden');
          soundToggle.textContent = '🔇';
          setPermission('muted'); // ensure state consistent
        }

        // save progress periodically
        saveInterval = setInterval(() => persistProgress(songUrl), 5000);
        player.onended = () => playNext(false);
      }
    }

    function playVinhetaOrNext() {
      if (!vinhetas.length) return playNext(false);
      const vinUrl = vinhetas[Math.floor(Math.random() * vinhetas.length)];
      vinheta.src = vinUrl; vinheta.currentTime = 0;
      vinheta.play().catch(() => {});
      vinheta.onended = () => { fadeVolumeTo(1, 1200); playNext(false); };
    }

    function fadeVolumeTo(target, duration = 1000) {
      const audioElems = [player, voice, vinheta];
      audioElems.forEach(a => {
        if (!a) return;
        const start = a.volume || 0;
        const diff = target - start;
        const steps = Math.max(6, Math.round(duration / 100));
        let i = 0;
        const iv = setInterval(() => {
          i++;
          a.volume = Math.min(1, Math.max(0, start + diff * (i / steps)));
          if (i >= steps) clearInterval(iv);
        }, duration / steps);
      });
    }

    /* ---------- Permission & prompt behavior ---------- */
    const perm = getPermission();

    // If user already decided (granted/muted) => DON'T show prompt again.
    if (perm === 'granted') {
      // Start playback with sound preference. Attempt to play; if browser blocks, fallback to muted but do not re-show prompt.
      player.muted = false; voice.muted = false; vinheta.muted = false;
      soundToggle.classList.remove('hidden'); soundToggle.textContent = '🔊';
      // Start the flow (resume true so saved.pos is used)
      playNext(true);
    } else if (perm === 'muted') {
      player.muted = true; voice.muted = true; vinheta.muted = true;
      soundToggle.classList.remove('hidden'); soundToggle.textContent = '🔇';
      playNext(true);
    } else {
      // Show the prompt and wait for user action (first visit)
      showPrompt();
    }

    /* ---------- Prompt buttons ---------- */
    startBtn && startBtn.addEventListener('click', () => {
      setPermission('granted');
      hidePrompt();
      // try to unmute and play; if browser still blocks (very unlikely after user gesture), we'll leave unmuted but show toggle
      player.muted = false; voice.muted = false; vinheta.muted = false;
      soundToggle.classList.remove('hidden'); soundToggle.textContent = '🔊';
      playNext(true);
    });

    muteBtn && muteBtn.addEventListener('click', () => {
      setPermission('muted');
      hidePrompt();
      player.muted = true; voice.muted = true; vinheta.muted = true;
      soundToggle.classList.remove('hidden'); soundToggle.textContent = '🔇';
      playNext(true);
    });

    /* ---------- Sound toggle behavior ---------- */
    soundToggle.addEventListener('click', () => {
      const currentlyMuted = player.muted && voice.muted && vinheta.muted;
      if (currentlyMuted) {
        player.muted = voice.muted = vinheta.muted = false;
        setPermission('granted');
        soundToggle.textContent = '🔊';
        // try to play if was never played
        player.play().catch(()=>{});
      } else {
        player.muted = voice.muted = vinheta.muted = true;
        setPermission('muted');
        soundToggle.textContent = '🔇';
      }
    });

    /* ---------- Listeners simulation (persisted) ---------- */
    (function simulate() {
      let listeners = Number(localStorage.getItem(LISTENERS_KEY)) || Math.floor(Math.random() * 40) + 20;
      listenersEl.textContent = `👥 ${listeners} ouvintes online`;
      setInterval(() => {
        const c = Math.floor(Math.random() * 5) - 2;
        listeners = Math.max(1, listeners + c);
        listenersEl.textContent = `👥 ${listeners} ouvintes online`;
        listenersEl.classList.add('updated');
        setTimeout(() => listenersEl.classList.remove('updated'), 400);
        localStorage.setItem(LISTENERS_KEY, listeners);
      }, 8000);
    })();

    /* Clean up when user navigates away */
    window.addEventListener('beforeunload', () => {
      // persist current song + position
      try {
        if (player.src) setState({ song: player.src, pos: player.currentTime || 0 });
      } catch (e) {}
    });

  })(); // end main()
}); // end DOMContentLoaded
