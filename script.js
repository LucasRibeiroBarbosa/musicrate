// As 12 notas cromáticas, em ordem. Escalas são calculadas a partir daqui,
// então não precisamos mais escrever cada escala manualmente.
const CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Nomes em português só pra exibição na tela (o Tone.js continua usando C, D, E...).
const PT_NOTE_NAMES = {
  C: "Dó", "C#": "Dó#", D: "Ré", "D#": "Ré#", E: "Mi", F: "Fá",
  "F#": "Fá#", G: "Sol", "G#": "Sol#", A: "Lá", "A#": "Lá#", B: "Si",
};

// Cada escala é uma lista de intervalos em semitons a partir da tônica (grau 1 = 0).
// Maior: tom-tom-semitom-tom-tom-tom-semitom. Menor natural: tom-semitom-tom-tom-semitom-tom-tom.
const SCALE_TYPES = {
  MAJOR: { label: "Maior", intervals: [0, 2, 4, 5, 7, 9, 11, 12] },
  MINOR: { label: "Menor", intervals: [0, 2, 3, 5, 7, 8, 10, 12] },
};

// Monta a escala como notas do Tone.js (ex: "C4"), cuidando da troca de oitava
// sempre que os semitons ultrapassam o Si (índice 11) e "viram a volta" pro Dó.
function buildScaleNotes(root, typeKey, baseOctave = 4) {
  const rootIndex = CHROMATIC.indexOf(root);
  return SCALE_TYPES[typeKey].intervals.map((interval) => {
    const chromaticIndex = rootIndex + interval;
    const noteName = CHROMATIC[chromaticIndex % 12];
    const octave = baseOctave + Math.floor(chromaticIndex / 12);
    return `${noteName}${octave}`;
  });
}

// Referências aos elementos da página, buscadas uma única vez.
const screens = {
  type: document.getElementById("screen-type"),
  root: document.getElementById("screen-root"),
  player: document.getElementById("screen-player"),
};
const rootGrid = document.getElementById("root-grid");
const rootScreenTitle = document.getElementById("root-screen-title");
const playerTitle = document.getElementById("player-title");
const noteTilesContainer = document.getElementById("note-tiles");
const playBtn = document.getElementById("play-btn");
const bpmSlider = document.getElementById("bpm-slider");
const bpmValueLabel = document.getElementById("bpm-value");
const volumeSlider = document.getElementById("volume-slider");
const volumeValueLabel = document.getElementById("volume-value");

let selectedType = null;
let selectedRoot = null;
let sequence = null;
let isPlaying = false;

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

// Sampler com as amostras de piano embutidas em base64 (ver piano-samples.js).
// Sendo data URIs, o carregamento não depende de rede/servidor — funciona abrindo o HTML direto.
playBtn.disabled = true;
playBtn.textContent = "Carregando piano...";

const sampler = new Tone.Sampler({
  urls: PIANO_SAMPLES,
  release: 0.8,
  onload: () => {
    playBtn.disabled = false;
    playBtn.textContent = "▶ Play";
  },
}).toDestination();

// sampler.volume é em decibéis (0dB = volume original, -Infinity = mudo), não em porcentagem.
// Tone.gainToDb converte a escala "linear" do slider (0-100%) pra essa escala logarítmica,
// que é como o ouvido humano percebe volume de verdade.
function applyVolume(percent) {
  sampler.volume.value = percent === 0 ? -Infinity : Tone.gainToDb(percent / 100);
}
applyVolume(Number(volumeSlider.value));

// Desenha os quadradinhos de nota da escala atual (só o nome da nota, sem a oitava).
function renderNoteTiles(notes) {
  noteTilesContainer.innerHTML = "";
  notes.forEach((note) => {
    const tile = document.createElement("div");
    tile.className = "note-tile";
    tile.dataset.note = note;
    tile.textContent = note.replace(/\d/, "");
    noteTilesContainer.appendChild(tile);
  });
}

// Acende o quadradinho da nota que está tocando agora e apaga os demais.
function highlightTile(note) {
  document.querySelectorAll(".note-tile").forEach((tile) => {
    tile.classList.toggle("playing", tile.dataset.note === note);
  });
}

function buildSequence() {
  const notes = buildScaleNotes(selectedRoot, selectedType);
  renderNoteTiles(notes);

  if (sequence) {
    sequence.dispose();
  }

  sequence = new Tone.Sequence(
    (time, note) => {
      sampler.triggerAttackRelease(note, "8n", time);
      Tone.Draw.schedule(() => highlightTile(note), time);
    },
    notes,
    "4n"
  );

  // Inicia a sequência já ao criá-la — mesmo que o Transport ainda não esteja
  // rodando, isso só a deixa "agendada" esperando; não faz nada tocar sozinho.
  sequence.start(0);
}

function stopPlayback() {
  Tone.Transport.stop();
  isPlaying = false;
  playBtn.textContent = "▶ Play";
  playBtn.classList.remove("playing");
  document.querySelectorAll(".note-tile").forEach((t) => t.classList.remove("playing"));
}

// Tela 1 -> Tela 2: guarda o tipo escolhido e mostra a grade de tons.
document.querySelectorAll(".type-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedType = btn.dataset.type;
    rootScreenTitle.textContent = `Escolha o tom (${SCALE_TYPES[selectedType].label})`;
    showScreen("root");
  });
});

// Monta a grade 4x3 com as 12 tônicas, uma vez, na ordem da escala cromática.
CHROMATIC.forEach((note) => {
  const tile = document.createElement("button");
  tile.className = "root-tile";
  tile.textContent = PT_NOTE_NAMES[note];
  tile.addEventListener("click", () => {
    selectedRoot = note;
    playerTitle.textContent = `${PT_NOTE_NAMES[note]} ${SCALE_TYPES[selectedType].label}`;
    buildSequence();
    showScreen("player");
  });
  rootGrid.appendChild(tile);
});

// Botões de voltar: qualquer reprodução em andamento para antes de trocar de tela.
document.querySelectorAll(".back-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    stopPlayback();
    showScreen(btn.dataset.backTo === "screen-type" ? "type" : "root");
  });
});

bpmSlider.addEventListener("input", () => {
  const bpm = Number(bpmSlider.value);
  Tone.Transport.bpm.value = bpm;
  bpmValueLabel.textContent = bpm;
});

volumeSlider.addEventListener("input", () => {
  const percent = Number(volumeSlider.value);
  applyVolume(percent);
  volumeValueLabel.textContent = percent;
});

playBtn.addEventListener("click", async () => {
  await Tone.start();

  if (!isPlaying) {
    Tone.Transport.bpm.value = Number(bpmSlider.value);
    buildSequence();
    Tone.Transport.start();
    isPlaying = true;
    playBtn.textContent = "⏸ Pause";
    playBtn.classList.add("playing");
  } else {
    stopPlayback();
  }
});
