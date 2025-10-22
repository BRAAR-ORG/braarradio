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

  /* ---------- Persistence keys ---------- */
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
    setTimeout(() => { if (prompt && prompt.parentNode) prompt.parentNode.removeChild(prompt); }, 500);
  }

  /* ---------- Fetch tracks ---------- */
  async function fetchTracks() {
    try {
      const r = await fetch('https://api.github.com/repos/BRAAR-ORG/music/releases/tags/music');
      const data = await r.json();
      if (!data.assets) return { songs: [], locs: [], vinhetas: [] };
      const songs = [], locs = [], vinhetas = [];
      for (const a of data.assets) {
        if (!a.name || !a.browser_download_url) continue;
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

  /* ---------- Format filename ---------- */
  function formatName(filename) {
    return filename.replace('.mp3','').replace(/[-_.]+/g,' ').replace(/\b\w/g, c=>c.toUpperCase());
  }

  /* ---------- Fade volume helper ---------- */
  function fadeVolumeTo(target, duration = 1000) {
    const audioElems = [player, voice, vinheta];
    audioElems.forEach(a => {
      if (!a) return;
      const start = a.volume || 1;
      let end = target;
      if (a === player) end = Math.max(0.8, target); // música sempre alta
      const diff = end - start;
      const steps = Math.max(6, Math.round(duration / 100));
      let i = 0;
      const iv = setInterval(() => {
        i++;
        a.volume = Math.min(1, Math.max(0, start + diff * (i/steps)));
        if (i >= steps) clearInterval(iv);
      }, duration / steps);
    });
  }

  /* ---------- Main player logic ---------- */
  (async function main() {
    // volume inicial máximo
    [player, voice, vinheta].forEach(a => { a.volume = 1; a.muted = false; });

    const { songs, locs, vinhetas } = await fetchTracks();

    // shuffle
    const shuffle = arr => { for (let i = arr.length -1; i>0; i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i], arr[j]]=[arr[j], arr[i]];} };
    shuffle(songs); shuffle(locs); shuffle(vinhetas);

    if (!songs.length) trackNameEl.textContent = 'Nenhuma música encontrada.';

    // restore saved playback state
    const saved = getState();
    let index = 0;
    if (saved.song && songs.length){
      const idx = songs.indexOf(saved.song);
      if (idx>=0) index = idx;
    }

    let count = 0;
    let nextLoc = Math.floor(Math.random()*9)+2;
    let saveInterval = null;

    function persistProgress(songUrl){
      try { setState({ song: songUrl, pos: player.currentTime||0 }); } catch(e){}
    }
    function clearPersistInterval(){
      if(saveInterval){ clearInterval(saveInterval); saveInterval=null; }
    }

    async function playNext(resume=false){
      let isLoc = false;
      if (locs.length && count>=nextLoc){
        isLoc=true; count=0; nextLoc=Math.floor(Math.random()*9)+2;
      }

      if(isLoc){
        fadeVolumeTo(0.3,1200);
        const locUrl = locs[Math.floor(Math.random()*locs.length)];
        trackNameEl.textContent = 'AO VIVO com Sarah';
        banner.classList.add('show');
        voice.src = locUrl; voice.currentTime=0;
        voice.play().catch(()=>{});
        voice.onended=()=>{ banner.classList.remove('show'); playVinhetaOrNext(); };
      } else {
        if(!songs.length) return;
        const songUrl = songs[index]; index=(index+1)%songs.length; count++;
        trackNameEl.textContent = formatName(songUrl.split('/').pop());
        clearPersistInterval();
        player.src = songUrl;

        if(resume && saved.song===songUrl && saved.pos) player.currentTime=saved.pos;

        try{ await player.play(); } catch(err){
          console.warn('play() bloqueado:',err);
          player.muted=true; soundToggle.classList.remove('hidden'); soundToggle.textContent='🔇';
          setPermission('muted');
        }

        saveInterval=setInterval(()=>persistProgress(songUrl),5000);
        player.onended=()=>playNext(false);
      }
    }

    function playVinhetaOrNext(){
      if(!vinhetas.length) return playNext(false);
      const vinUrl=vinhetas[Math.floor(Math.random()*vinhetas.length)];
      vinheta.src=vinUrl; vinheta.currentTime=0;
      vinheta.play().catch(()=>{});
      vinheta.onended=()=>{ fadeVolumeTo(1,1200); playNext(false); };
    }

    /* ---------- Permission handling ---------- */
    const perm = getPermission();
    if(perm==='granted'){
      [player,voice,vinheta].forEach(a=>a.muted=false);
      soundToggle.classList.remove('hidden'); soundToggle.textContent='🔊';
      playNext(true);
    } else if(perm==='muted'){
      [player,voice,vinheta].forEach(a=>a.muted=true);
      soundToggle.classList.remove('hidden'); soundToggle.textContent='🔇';
      playNext(true);
    } else {
      showPrompt();
    }

    /* ---------- Modal buttons ---------- */
    startBtn?.addEventListener('click', async ()=>{
      setPermission('granted'); hidePrompt();
      [player,voice,vinheta].forEach(a=>a.muted=false);
      try{ await player.play(); } catch(e){ console.warn(e); }
      soundToggle.classList.remove('hidden'); soundToggle.textContent='🔊';
      playNext(true);
    });
    muteBtn?.addEventListener('click', ()=>{
      setPermission('muted'); hidePrompt();
      [player,voice,vinheta].forEach(a=>a.muted=true);
      soundToggle.classList.remove('hidden'); soundToggle.textContent='🔇';
      playNext(true);
    });

    /* ---------- Sound toggle ---------- */
    soundToggle.addEventListener('click', ()=>{
      const muted = player.muted && voice.muted && vinheta.muted;
      [player,voice,vinheta].forEach(a=>a.muted = muted ? false : true);
      setPermission(muted ? 'granted' : 'muted');
      soundToggle.textContent = muted ? '🔊' : '🔇';
      if(muted) player.play().catch(()=>{});
    });

    /* ---------- Simulate listeners ---------- */
    (function simulate(){
      let listeners = Number(localStorage.getItem(LISTENERS_KEY)) || Math.floor(Math.random()*40)+20;
      listenersEl.textContent = `👥 ${listeners} ouvintes online`;
      setInterval(()=>{
        const c=Math.floor(Math.random()*14)-7;
        listeners=Math.max(1,listeners+c);
        listenersEl.textContent = `👥 ${listeners} ouvintes online`;
        listenersEl.classList.add('updated');
        setTimeout(()=>listenersEl.classList.remove('updated'),400);
        localStorage.setItem(LISTENERS_KEY,listeners);
      },8000);
    })();

    /* ---------- Persist before unload ---------- */
    window.addEventListener('beforeunload', ()=>{
      try{ if(player.src) setState({ song:player.src,pos:player.currentTime||0 }); }catch(e){}
    });

  })(); // main
});
