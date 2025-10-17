/* ============================================================
   BRAAR RÁDIO — Sistema oficial
   Compatível com GitHub Pages (autoplay, persistência, locuções)
   ============================================================ */

async function fetchTracks() {
  const response = await fetch('https://api.github.com/repos/BRAAR-ORG/braarradio/releases/tags/musica');
  const data = await response.json();
  if (!data.assets) return { songs: [], locs: [], vinhetas: [] };

  const songs = [], locs = [], vinhetas = [];
  for (const a of data.assets) {
    if (a.name.endsWith('.mp3')) {
      if (a.name.startsWith('LOC_Sarah')) locs.push(a.browser_download_url);
      else if (a.name.startsWith('VIN_BRAAR')) vinhetas.push(a.browser_download_url);
      else songs.push(a.browser_download_url);
    }
  }
  return { songs, locs, vinhetas };
}

function formatTrackName(file) {
  return file.replace('.mp3', '').replace(/[-_.]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function fadeAudio(audio, target, duration = 1500) {
  const step = (target - audio.volume) / (duration / 100);
  const interval = setInterval(() => {
    audio.volume = Math.min(Math.max(audio.volume + step, 0), 1);
    if ((step > 0 && audio.volume >= target) || (step < 0 && audio.volume <= target))
      clearInterval(interval);
  }, 100);
}

/* ------------------ Permissão e controle ------------------ */
function getPermissionState() {
  return localStorage.getItem('braar_permission');
}

function setPermissionState(state) {
  localStorage.setItem('braar_permission', state);
}

function showAudioPrompt(startCallback, muteCallback) {
  // Se já foi concedido ou negado, não mostra novamente
  const state = getPermissionState();
  if (state === 'granted') return startCallback();
  if (state === 'muted') return muteCallback();

  const prompt = document.getElementById('playPrompt');
  prompt.classList.remove('hidden');

  const startBtn = document.getElementById('startBtn');
  const muteBtn = document.getElementById('muteBtn');

  startBtn.onclick = () => {
    setPermissionState('granted');
    prompt.classList.add('hidden');
    startCallback();
  };

  muteBtn.onclick = () => {
    setPermissionState('muted');
    prompt.classList.add('hidden');
    muteCallback();
  };
}

/* ------------------ Player principal ------------------ */
async function initPlayer() {
  const player = document.getElementById('audioPlayer');
  const voice = document.getElementById('voicePlayer');
  const vinheta = document.getElementById('vinhetaPlayer');
  const trackName = document.getElementById('trackName');
  const banner = document.getElementById('liveBanner');
  const soundToggle = document.getElementById('soundToggle');

  const { songs, locs, vinhetas } = await fetchTracks();
  if (!songs.length) {
    trackName.textContent = 'Nenhuma música encontrada.';
    return;
  }

  const shuffle = arr => arr.sort(() => Math.random() - 0.5);
  shuffle(songs); shuffle(locs); shuffle(vinhetas);

  let index = 0, count = 0, nextLoc = Math.floor(Math.random() * 9) + 2;
  const saved = JSON.parse(localStorage.getItem('braar_state') || '{}');

  if (saved.song && songs.includes(saved.song)) index = songs.indexOf(saved.song);

  function persist(song, pos) {
    localStorage.setItem('braar_state', JSON.stringify({ song, pos }));
  }

  function playNext(resume = false) {
    let isLoc = false;
    if (locs.length && count >= nextLoc) {
      isLoc = true;
      count = 0;
      nextLoc = Math.floor(Math.random() * 9) + 2;
    }

    if (isLoc) {
      fadeAudio(player, 0.2, 1500);
      const locUrl = locs[Math.floor(Math.random() * locs.length)];
      trackName.textContent = 'AO VIVO com Sarah';
      banner.classList.add('show');
      voice.src = locUrl;
      voice.volume = 1;
      voice.play().catch(() => {});
      voice.onended = () => {
        banner.classList.remove('show');
        playVinheta();
      };
    } else {
      const songUrl = songs[index];
      index = (index + 1) % songs.length;
      count++;
      trackName.textContent = formatTrackName(songUrl.split('/').pop());
      player.src = songUrl;
      if (resume && saved.song === songUrl && saved.pos) {
        try { player.currentTime = saved.pos; } catch {}
      }
      player.play().catch(() => {});
      player.onended = playNext;
      clearInterval(player._save);
      player._save = setInterval(() => persist(songUrl, player.currentTime), 4000);
    }
  }

  function playVinheta() {
    if (!vinhetas.length) return playNext();
    const vinUrl = vinhetas[Math.floor(Math.random() * vinhetas.length)];
    vinheta.src = vinUrl;
    vinheta.volume = 1;
    vinheta.play().catch(() => {});
    vinheta.onended = () => {
      fadeAudio(player, 1, 1500);
      playNext();
    };
  }

  /* --- Estado inicial --- */
  function startWithSound() {
    player.muted = voice.muted = vinheta.muted = false;
    soundToggle.textContent = '🔊';
    soundToggle.classList.remove('hidden');
    playNext(true);
  }

  function startMuted() {
    player.muted = voice.muted = vinheta.muted = true;
    soundToggle.textContent = '🔇';
    soundToggle.classList.remove('hidden');
    playNext(true);
  }

  /* --- Controle manual de som --- */
  soundToggle.addEventListener('click', () => {
    const isMuted = player.muted && voice.muted && vinheta.muted;
    if (isMuted) {
      player.muted = voice.muted = vinheta.muted = false;
      setPermissionState('granted');
      soundToggle.textContent = '🔊';
    } else {
      player.muted = voice.muted = vinheta.muted = true;
      setPermissionState('muted');
      soundToggle.textContent = '🔇';
    }
  });

  showAudioPrompt(startWithSound, startMuted);
}

/* ------------------ Simulação de ouvintes ------------------ */
function simulateListeners() {
  const el = document.getElementById('listenersCount');
  let listeners = Number(localStorage.getItem('braar_listeners')) || Math.floor(Math.random() * 50) + 30;
  el.textContent = `👥 ${listeners} ouvintes online`;
  setInterval(() => {
    const change = Math.floor(Math.random() * 5) - 2;
    listeners = Math.max(1, listeners + change);
    el.textContent = `👥 ${listeners} ouvintes online`;
    el.classList.add('updated');
    setTimeout(() => el.classList.remove('updated'), 500);
    localStorage.setItem('braar_listeners', listeners);
  }, 8000);
}

/* ------------------ Inicialização ------------------ */
initPlayer();
simulateListeners();
