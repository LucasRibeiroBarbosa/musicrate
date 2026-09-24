// Roda uma vez (ou de novo se você trocar as amostras em sounds/piano/) com: node scripts/build-piano-samples.js
// Lê os .m4a e gera piano-samples.js com o áudio embutido em base64 (data URI).
// Isso existe só pra evitar precisar de servidor: um data URI é lido pelo navegador
// sem nenhuma requisição de rede, então funciona abrindo o index.html direto (file://).
const fs = require("fs");
const path = require("path");

const SAMPLES_DIR = path.join(__dirname, "..", "sounds", "piano");
const OUTPUT_FILE = path.join(__dirname, "..", "piano-samples.js");

const files = fs.readdirSync(SAMPLES_DIR).filter((f) => f.endsWith(".m4a"));

const entries = files.map((file) => {
  const note = path.basename(file, ".m4a");
  const base64 = fs.readFileSync(path.join(SAMPLES_DIR, file)).toString("base64");
  return `  "${note}": "data:audio/mp4;base64,${base64}"`;
});

const output = `// ARQUIVO GERADO — não edite à mão. Para regenerar: node scripts/build-piano-samples.js
// Mapa de nota -> áudio do piano em base64 (fonte: sounds/piano/, ver LICENSE.txt lá dentro).
const PIANO_SAMPLES = {
${entries.join(",\n")}
};
`;

fs.writeFileSync(OUTPUT_FILE, output);
console.log(`Gerado ${OUTPUT_FILE} com ${files.length} amostras.`);
