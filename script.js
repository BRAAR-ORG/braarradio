const player = document.getElementById('audioPlayer');
const voice = document.getElementById('voicePlayer');
const vinheta = document.getElementById('vinhetaPlayer');
const startBtn = document.getElementById('startButton');
const playPrompt = document.getElementById('playPrompt');
const soundToggle = document.getElementById('soundToggle');
const eq = document.getElementById('equalizer');
const listenersCount = document.getElementById('listenersCount');
const banner = document.getElementById('banner');
const songTitle = document.getElementById('songTitle');

let currentIndex = 0;
let playlist = [];
let playing = false;
let permission = localStorage.getItem('audioPermission') || 'none';

function setPermission(value) {
  permission = value;
  localStorage.setItem('audioPermission', value);
}

function hidePrompt() {
  playPrompt.classList.add('hidden');
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function loadPlaylist() {
  playlist = [
    "https://braar.com.br/radio/musicas/m1.mp3",
    "https://braar.com.br/radio/musicas/m2.mp3",
    "https://braar.com.br/radio/musicas/m3.mp3",
    "https://braar.com.br/radio/musicas/m4.mp3",
    "https://braar.com.br/radio/musicas/m5.mp3",
    "https://braar.com.br/radio/musicas/m6.mp3",
    "https://braar.com.br/radio/musicas/m7.mp3",
    "https://braar.com.br/radio/musicas/m8.mp3"
  ];
  shuffleArray(playlist);
}

function playNext(auto = false) {
  if (!playlist.length) loadPlaylist();
  player.src = playlist[currentIndex];
  player.currentTime = 0;
  player.volume = 1;
  player.play().catch(err => console.warn('Autoplay bloqueado:', err));

  songTitle.textContent = playlist[currentIndex].split('/').pop();
  eq.classList.remove('paused');

  currentIndex = (currentIndex + 1) % playlist.length;
  playing = true;
}

function playVoice() {
  voice.src = "https://braar.com.br/radio/locucao.mp3";
  voice.volume = 1;
  voice.play().catch(err => console.warn('Erro locução:', err));
}

function playVinheta() {
  vinheta.src = "https://braar.com.br/radio/vinheta.mp3";
  vinheta.volume = 1;
  vinheta.play().catch(err => console.warn('Erro vinheta:', err));
}

// Simulação de ouvintes
function updateListeners() {
  const count = Math.floor(80 + Math.random() * 40);
  listenersCount.textContent = `${count} ouvintes`;
}
setInterval(updateListeners, 10000);

// Atualização de banner
function updateBanner() {
  const banners = [
    "🎧 BRAAR RÁDIO — A batida da inovação!",
    "🔥 100% Tecnologia. 100% Brasil.",
    "🚀 Braar — o som do futuro brasileiro.",
    "🌎 Conectando mentes criativas do Brasil todo."
  ];
  banner.textContent = banners[Math.floor(Math.random() * banners.length)];
}
setInterval(updateBanner, 15000);

// Inicialização manual (obrigatória para iPhone)
startBtn.addEventListener('click', async () => {
  setPermission('granted');
  hidePrompt();

  [player, voice, vinheta].forEach(a => {
    a.volume = 1;
    a.muted = false;
  });

  soundToggle.classList.remove('hidden');
  soundToggle.textContent = '🔊';

  loadPlaylist();
  playNext(true);
});

// Botão de som
soundToggle.addEventListener('click', () => {
  const muted = player.muted && voice.muted && vinheta.muted;
  [player, voice, vinheta].forEach(a => a.muted = muted ? false : true);
  setPermission(muted ? 'granted' : 'muted');
  soundToggle.textContent = muted ? '🔊' : '🔇';
});

// Sequência automática
player.addEventListener('ended', () => {
  const r = Math.random();
  if (r < 0.1) playVinheta();
  else if (r < 0.2) playVoice();
  playNext(true);
});

// Inicialização
window.addEventListener('load', () => {
  [player, voice, vinheta].forEach(a => {
    a.volume = 1;
    a.muted = permission === 'muted';
  });

  if (permission === 'granted') {
    hidePrompt();
    loadPlaylist();
    playNext(true);
    soundToggle.classList.remove('hidden');
    soundToggle.textContent = '🔊';
  } else {
    playPrompt.classList.remove('hidden');
  }
});

