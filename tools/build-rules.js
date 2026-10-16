#!/usr/bin/env node
// Gera `rules.json` (declarativeNetRequest) a partir de `domains.txt`.
//
// O motor do navegador avalia as regras nativamente, sem JS por requisicao.
// Em vez de uma regra por dominio (nao caberia no limite de regras), cada
// regra carrega um lote de dominios em `requestDomains`. O proprio navegador
// casa o dominio e todos os seus subdominios, entao subdominios redundantes
// sao removidos da lista.
//
// Uso:
//   node tools/build-rules.js                 -> escreve rules.json
//   node tools/build-rules.js --dedup-domains -> tambem reescreve domains.txt (minimo + ordenado)

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DOMAINS_FILE = path.join(ROOT, "domains.txt");
const RULES_FILE = path.join(ROOT, "rules.json");

// Dominios por regra. Mantem as regras poucas e pequenas.
const CHUNK = 1000;

// Um dominio canonico valido (ASCII, rotulos com hifen/alnum). Entradas que
// nao passam aqui (ex.: "is_ad=1", "publi-bottom", "[as15224]...") nunca
// casaram um hostname no antigo matcher; no DNR elas invalidariam a regra
// inteira, entao sao descartadas.
const LABEL = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
const DOMAIN_RE = new RegExp(`^(?:${LABEL}\\.)+${LABEL}$`);

function isCanonicalDomain(domain) {
  return domain.length <= 253 && DOMAIN_RE.test(domain);
}

// Tipos comuns a Chrome e Firefox. Incluimos main_frame de proposito: por
// padrao o DNR nao casa main_frame, mas queremos bloquear a navegacao para
// dominios da lista (comportamento do antigo webRequest).
const RESOURCE_TYPES = [
  "main_frame",
  "sub_frame",
  "stylesheet",
  "script",
  "image",
  "font",
  "object",
  "xmlhttprequest",
  "ping",
  "csp_report",
  "media",
  "websocket",
  "other",
];

function parse(text) {
  const comments = [];
  const commentSeen = new Set();
  const domains = new Set();
  const patterns = [];
  const dropped = [];
  const patternSeen = new Set();

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "") continue;

    if (line[0] === "#") {
      if (!commentSeen.has(line)) {
        commentSeen.add(line);
        comments.push(line);
      }
      continue;
    }

    const lower = line.toLowerCase();
    if (lower.includes("/")) {
      if (!patternSeen.has(lower)) {
        patternSeen.add(lower);
        patterns.push(lower);
      }
    } else if (isCanonicalDomain(lower)) {
      domains.add(lower);
    } else {
      dropped.push(lower);
    }
  }

  return { comments, domains: [...domains], patterns, dropped };
}

// Remove dominios ja cobertos por um dominio-pai presente na lista
// (ex.: "a.b.example.com" quando "example.com" tambem esta na lista).
function minimize(domains) {
  const set = new Set(domains);
  const keep = [];

  for (const domain of domains) {
    let idx = domain.indexOf(".");
    let covered = false;

    while (idx !== -1) {
      if (set.has(domain.slice(idx + 1))) {
        covered = true;
        break;
      }
      idx = domain.indexOf(".", idx + 1);
    }

    if (!covered) keep.push(domain);
  }

  return keep;
}

function buildRules(domains, patterns) {
  const rules = [];
  let id = 0;

  for (let i = 0; i < domains.length; i += CHUNK) {
    rules.push({
      id: ++id,
      action: { type: "block" },
      condition: {
        requestDomains: domains.slice(i, i + CHUNK),
        resourceTypes: RESOURCE_TYPES,
      },
    });
  }

  for (const pattern of patterns) {
    rules.push({
      id: ++id,
      action: { type: "block" },
      condition: {
        urlFilter: pattern,
        isUrlFilterCaseSensitive: false,
        resourceTypes: RESOURCE_TYPES,
      },
    });
  }

  return rules;
}

function main() {
  const text = fs.readFileSync(DOMAINS_FILE, "utf8");
  const { comments, domains, patterns, dropped } = parse(text);

  const minimal = minimize(domains).sort();

  if (process.argv.includes("--dedup-domains")) {
    const generatedNote =
      "# --- Lista minimizada: subdominios redundantes removidos e entradas ordenadas ---";
    const lines = [...comments, generatedNote, "", ...minimal, "", ...patterns];
    fs.writeFileSync(DOMAINS_FILE, lines.join("\n") + "\n");
    console.log(`domains.txt: ${domains.length} -> ${minimal.length} dominios`);
  }

  const rules = buildRules(minimal, patterns);
  fs.writeFileSync(RULES_FILE, JSON.stringify(rules));

  const kb = (fs.statSync(RULES_FILE).size / 1024).toFixed(0);
  console.log(
    `rules.json: ${rules.length} regras, ${minimal.length} dominios, ${patterns.length} padroes, ${kb} KB`
  );
  if (dropped.length) {
    console.log(`descartados (nao sao dominios validos): ${dropped.length}`);
  }
}

main();
