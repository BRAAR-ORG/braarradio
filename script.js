const player = document.getElementById("player");
const btnPlay = document.getElementById("btnPlay");
const status = document.getElementById("status");

// Música padrão da rádio (substitua pelo seu link)
const musicaPadrao = "https://example.com/musicas/braar_theme.mp3";

// Recuperar dados salvos
const musicaSalva = localStorage.getItem("musicaAtual") || musicaPadrao;
const tempoSalvo = parseFloat(localStorage.getItem("tempoMusica")) || 0;
const tocandoAntes = localStorage.getItem("tocandoAntes") === "true";

// Define música inicial
player.src = musicaSalva;

// Ao sair, salvar estado
window.addEventListener("beforeunload", () => {
  localStorage.setItem("musicaAtual", player.src);
  localStorage.setItem("tempoMusica", player.currentTime);
  localStorage.setItem("tocandoAntes", !player.paused);
});

// Botão de ativar som
btnPlay.addEventListener("click", () => {
  player.currentTime = tempoSalvo;
  player.play().then(() => {
    status.textContent = "🎶 Tocando Rádio BRAAR...";
    btnPlay.classList.add("hidden");
    localStorage.setItem("tocandoAntes", true);
  }).catch(err => {
    console.error("Erro ao tentar tocar:", err);
    status.textContent = "⚠️ O navegador bloqueou o som. Clique novamente.";
  });
});

// Tenta retomar automaticamente se o usuário já tinha autorizado antes
window.addEventListener("load", () => {
  player.currentTime = tempoSalvo;
  if (tocandoAntes) {
    player.play().then(() => {
      status.textContent = "🎶 Tocando Rádio BRAAR...";
      btnPlay.classList.add("hidden");
    }).catch(() => {
      status.textContent = "🔈 Clique para ativar o som";
      btnPlay.classList.remove("hidden");
    });
  } else {
    status.textContent = "🔈 Clique para ouvir a Rádio BRAAR";
    btnPlay.classList.remove("hidden");
  }
});

// Atualiza status
player.addEventListener("play", () => {
  status.textContent = "🎶 Tocando Rádio BRAAR...";
});

player.addEventListener("pause", () => {
  status.textContent = "⏸ Rádio pausada";
});

player.addEventListener("ended", () => {
  status.textContent = "🔁 Fim da música — reiniciando...";
  player.currentTime = 0;
  player.play();
});
