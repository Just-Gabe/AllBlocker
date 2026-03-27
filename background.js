
let blockedDomainsSet = new Set();
let blockedPatterns = [];
let blockedPatternRegex = null;

const cache = new Map();
const MAX_CACHE = 5000;

const DEBUG = true; // Ativar logs detalhados para desenvolvimento

async function loadBlocklist() {
    try {
        if (DEBUG) console.log("Carregando blocklist...");

        const url = browser.runtime.getURL('domains.txt');
        const response = await fetch(url);
        const text = await response.text();

        blockedDomainsSet.clear();
        blockedPatterns = [];

        text
            .split('\n')
            .map(line => line.trim().toLowerCase())
            .filter(line => line && !line.startsWith('#'))
            .forEach(line => {
                if (line.includes('/')) {
                    blockedPatterns.push(line);
                } else {
                    blockedDomainsSet.add(line);
                }
            });

        // Compilar regex uma única vez ao carregar
        if (blockedPatterns.length > 0) {
            const escapedPatterns = blockedPatterns.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            blockedPatternRegex = new RegExp(escapedPatterns.join('|'));
        }

        if (DEBUG) {
            console.log(`Blocklist carregada: ${blockedDomainsSet.size} domínios, ${blockedPatterns.length} padrões de URL`);
        }

    } catch (err) {
        console.error("Erro ao carregar blocklist:", err);
    }
}

loadBlocklist();

function extractHostname(url) {
    let start = url.indexOf("://");
    if (start === -1) return null;
    start += 3;

    let end = url.indexOf("/", start);
    if (end === -1) end = url.length;

    return url.substring(start, end);
}

function isBlocked(hostname, fullUrl) {
    // Verificar padrões de URL com regex compilado (muito mais rápido)
    if (blockedPatternRegex && blockedPatternRegex.test(fullUrl)) {
        return true;
    }

    const hostnameLower = hostname.toLowerCase();
    // if (hostnameLower.startsWith('rr2') || hostnameLower.startsWith('rr3') || hostnameLower.startsWith('rr4') || hostnameLower.startsWith('rr5') || hostnameLower.startsWith('rr6') || hostnameLower.startsWith('rr7') || hostnameLower.startsWith('rr8') || hostnameLower.startsWith('rr1')) {
    //     return true;
    // }

    // Depois verificar domínios
    let dotIndex = 0;

    while (true) {
        if (blockedDomainsSet.has(hostnameLower.substring(dotIndex))) {
            return true;
        }

        dotIndex = hostnameLower.indexOf('.', dotIndex);
        if (dotIndex === -1) break;

        dotIndex++;
    }

    return false;
}

function checkUrl(url) {
    if (cache.has(url)) {
        return cache.get(url);
    }

    const hostname = extractHostname(url);

    if (!hostname) return;
    
    const result = isBlocked(hostname, url) ? { cancel: true } : {};
    if (DEBUG) {
        if (result.cancel) {
            console.log("Bloqueado: ", url)
        } else {
            // console.log("Permitido: ", url)
        }
    }

    cache.set(url, result);

    if (cache.size > MAX_CACHE) {
        cache.clear();
    }

    return result;
}

browser.webRequest.onBeforeRequest.addListener(
    function (details) {
        if (blockedDomainsSet.size === 0) return;

        try {
            return checkUrl(details.url);
        } catch (e) {
            if (DEBUG) console.log("Erro:", e);
        }
    },
    { urls: ["<all_urls>"] },
    ["blocking"]
);