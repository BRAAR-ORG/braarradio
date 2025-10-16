// === CONFIGURAÇÃO DE MÚSICAS ===
const musicas = [
  "musicas/musica1.mp3",
  "musicas/musica2.mp3",
  "musicas/musica3.mp3",
];

const player = document.getElementById("player");
const playPauseBtn = document.getElementById("playPause");
const trocarBtn = document.getElementById("trocarMusica");

// === FUNÇÃO DE PERMISSÃO DE ÁUDIO ===
function pedirPermissaoAudio() {
  const permitido = localStorage.getItem("audio_permitido");
  if (permitido === "true") return;

  const botao = document.createElement("button");
  botao.id = "botaoPermissao";
  botao.innerText = "Clique para permitir áudio 🔊";
  document.body.appendChild(botao);

  botao.onclick = async () => {
    try {
      const testAudio = new Audio();
      testAudio.src = musicas[0];
      testAudio.volume = 0.05;
      await testAudio.play();
      testAudio.pause();
      localStorage.setItem("audio_permitido", "true");
      botao.remove();
    } catch {
      alert("Por favor, permita o áudio nas configurações do navegador.");
    }
  };
}

// === CARREGAR ESTADO ANTERIOR ===
window.addEventListener("DOMContentLoaded", () => {
  pedirPermissaoAudio();

  const musicaSalva = localStorage.getItem("musica_atual");
  const tempoSalvo = parseFloat(localStorage.getItem("tempo_atual"));
  const estavaTocando = localStorage.getItem("esta_tocando") === "true";

  if (musicaSalva) {
    player.src = musicaSalva;
    player.addEventListener("loadedmetadata", () => {
      if (!isNaN(tempoSalvo)) player.currentTime = tempoSalvo;
      if (estavaTocando) player.play().catch(() => {});
    });
  } else {
    player.src = musicas[0];
  }
});

// === SALVAR ESTADO QUANDO SAIR ===
window.addEventListener("beforeunload", () => {
  localStorage.setItem("musica_atual", player.src);
  localStorage.setItem("tempo_atual", player.currentTime);
  localStorage.setItem("esta_tocando", !player.paused);
});

// === CONTROLES ===
playPauseBtn.onclick = () => {
  if (player.paused) {
    player.play();
  } else {
    player.pause();
  }
};

trocarBtn.onclick = () => {
  let atual = musicas.indexOf(player.src.split("/").pop());
  let proxima = (atual + 1) % musicas.length;
  player.src = musicas[proxima];
  player.play();
};
