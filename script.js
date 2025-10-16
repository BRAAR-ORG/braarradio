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

/* ------------------ Modal de permissão ------------------ */
function showAudioPrompt(startCallback, muteCallback) {
  if (localStorage.getItem('braar_permission') === 'granted') {
    startCallback();
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'audio-permission';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>🎧 BRAAR Rádio</h2>
      <p>Para começar, permita o áudio. Assim você escuta a transmissão completa com Sarah e as músicas ao vivo.</p>
      <div class="buttons">
        <button id="allowAudio">Permitir e Ouvir</button>
        <button id="muteAudio">Entrar sem Som</button>
      </div>
    </div>
  `;
  Object.assign(modal.style, {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.9)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 9999
  });
  modal.querySelector('.modal-content').style.cssText = `
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.2);
    padding: 25px 35px;
    border-radius: 15px;
    text-align: center;
    color: #fff;
    max-width: 400px;
    box-shadow: 0 0 20px rgba(230,201,77,0.4);
  `;
  modal.querySelector('h2').style.cssText = `color:#e6c94d;margin-bottom:10px;`;
  modal.querySelector('p').style.cssText = `color:#ccc;margin-bottom:20px;line-height:1.5;`;
  modal.querySelector('.buttons').style.cssText = `display:flex;gap:10px;justify-content:center;`;
  modal.querySelectorAll('button').forEach(btn => {
    btn.style.cssText = `
      background:linear-gradient(90deg,#e6c94d,#fff34d);
      color:#000;padding:10px 18px;border:none;border-radius:10px;
      font-weight:bold;cursor:pointer;transition:all 0.2s;
    `;
    btn.onmouseenter = () => btn.style.transform = 'scale(1.05)';
    btn.onmouseleave = () => btn.style.transform = 'scale(1)';
  });

  document.body.appendChild(modal);

  document.getElementById('allowAudio').onclick = () => {
    localStorage.setItem('braar_permission', 'granted');
    modal.remove();
    startCallback();
  };
  document.getElementById('muteAudio').onclick = () => {
    localStorage.setItem('braar_permission', 'granted');
    modal.remove();
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

  function startWithSound() {
    player.muted = voice.muted = vinheta.muted = false;
    playNext(true);
  }

  function startMuted() {
    player.muted = voice.muted = vinheta.muted = true;
    playNext(true);
  }

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
