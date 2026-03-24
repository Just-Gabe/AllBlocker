let blockedDomainsSet = new Set();

const cache = new Map();
const MAX_CACHE = 5000;

const DEBUG = true;

async function loadBlocklist() {
    try {
        if (DEBUG) console.log("Carregando blocklist...");

        const url = browser.runtime.getURL('domains.txt');
        const response = await fetch(url);
        const text = await response.text();

        blockedDomainsSet = new Set(
            text
                .split('\n')
                .map(line => line.trim().toLowerCase())
                .filter(line => line && !line.startsWith('#'))
        );

        if (DEBUG) {
            console.log(`Blocklist carregada: ${blockedDomainsSet.size} domínios`);
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

    return url.substring(start, end).toLowerCase();
}

function isBlocked(hostname) {
    let dotIndex = 0;

    while (true) {
        if (blockedDomainsSet.has(hostname.substring(dotIndex))) {
            return true;
        }

        dotIndex = hostname.indexOf('.', dotIndex);
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
    const result = isBlocked(hostname) ? { cancel: true } : {};
    if (result.cancel) {
        console.log("Bloqueado: ", hostname)
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