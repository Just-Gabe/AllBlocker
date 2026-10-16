"use strict";

// Logs detalhados. MANTER DESLIGADO EM PRODUCAO: cada console.log no listener
// de webRequest acontece em TODA requisicao da pagina e trava a main thread.
const DEBUG = false;

let blockedDomainsSet = new Set();
let blockedPatterns = [];
let blockedPatternRegex = null;

// Cache por HOSTNAME (nao por URL). Uma pagina faz centenas de requests para
// poucos hosts, entao o hit rate e muito maior e a memoria muito menor.
// Eviccao FIFO: remove a entrada mais antiga em vez de dar cache.clear(),
// que zerava tudo de uma vez e causava picos de recomputo.
const hostCache = new Map();
const MAX_HOST_CACHE = 4096;

function cacheHostResult(host, blocked) {
    if (hostCache.size >= MAX_HOST_CACHE) {
        hostCache.delete(hostCache.keys().next().value);
    }
    hostCache.set(host, blocked);
}

console.log("Iniciando AllBlocker...");

async function loadBlocklist() {
    try {
        if (DEBUG) console.log("Carregando blocklist...");

        const url = browser.runtime.getURL("domains.txt");
        const response = await fetch(url);
        const text = await response.text();

        const domains = new Set();
        const patterns = [];

        // Parse em passada unica, sem split/map/filter (evitava ~4 arrays de
        // 72k+ strings e toneladas de alocacoes no startup).
        const len = text.length;
        let pos = 0;
        while (pos < len) {
            let nl = text.indexOf("\n", pos);
            if (nl === -1) nl = len;

            let line = text.substring(pos, nl).trim();
            pos = nl + 1;

            if (line.length === 0 || line.charCodeAt(0) === 35 /* # */) continue;

            line = line.toLowerCase();
            if (line.indexOf("/") !== -1) {
                patterns.push(line);
            } else {
                domains.add(line);
            }
        }

        blockedDomainsSet = domains;
        blockedPatterns = patterns;

        // Compila a regex uma unica vez ao carregar.
        blockedPatternRegex = patterns.length
            ? new RegExp(patterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"))
            : null;

        // A blocklist mudou: o cache antigo pode conter decisoes erradas.
        hostCache.clear();

        if (DEBUG) {
            console.log(`Blocklist carregada: ${domains.size} dominios, ${patterns.length} padroes de URL`);
        }
    } catch (err) {
        console.error("Erro ao carregar blocklist:", err);
    }
}

loadBlocklist();

// Extrai o hostname sem alocacoes desnecessarias e tratando porta/credenciais.
// Retorna null para esquemas sem "://" (data:, blob:, about:, etc).
function extractHostname(url) {
    const schemeEnd = url.indexOf("://");
    if (schemeEnd === -1) return null;

    const start = schemeEnd + 3;
    let end = url.length;
    for (let i = start; i < end; i++) {
        const c = url.charCodeAt(i);
        if (c === 47 /* / */ || c === 63 /* ? */ || c === 35 /* # */) {
            end = i;
            break;
        }
    }

    let host = url.substring(start, end);

    // Remove credenciais (user:pass@host)
    const at = host.lastIndexOf("@");
    if (at !== -1) host = host.substring(at + 1);

    // Remove porta, exceto em IPv6 literal ([::1])
    if (host.charCodeAt(0) !== 91 /* [ */) {
        const colon = host.indexOf(":");
        if (colon !== -1) host = host.substring(0, colon);
    }

    return host.toLowerCase();
}

// Procura o host e cada dominio-pai no Set (a.b.example.com -> b.example.com
// -> example.com -> com).
function isBlockedHost(host) {
    let idx = 0;
    while (true) {
        if (blockedDomainsSet.has(host.substring(idx))) return true;

        idx = host.indexOf(".", idx);
        if (idx === -1) return false;
        idx++;
    }
}

function isBlocked(url, hostname) {
    // Padroes de URL (poucos) sao testados contra a URL completa.
    if (blockedPatternRegex !== null && blockedPatternRegex.test(url)) return true;

    const cached = hostCache.get(hostname);
    if (cached !== undefined) return cached;

    const blocked = isBlockedHost(hostname);
    cacheHostResult(hostname, blocked);
    return blocked;
}

browser.webRequest.onBeforeRequest.addListener(
    function (details) {
        if (blockedDomainsSet.size === 0) return;

        const url = details.url;
        const hostname = extractHostname(url);
        if (hostname === null || hostname.length === 0) return;

        try {
            if (isBlocked(url, hostname)) {
                if (DEBUG) console.log("Bloqueado: ", url);
                return { cancel: true };
            }
        } catch (e) {
            if (DEBUG) console.warn("Erro:", e);
        }

        // Retorna undefined (em vez de {}) para nao alocar objeto a cada request permitido.
    },
    { urls: ["<all_urls>"] },
    ["blocking"]
);
