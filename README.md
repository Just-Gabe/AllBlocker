# AllBlocker

Extensão de bloqueio para Firefox. Bloqueia anúncios e rastreadores **sem
carregar o navegador**: não há JavaScript rodando por requisição.

## Como funciona

O bloqueio é 100% declarativo, via
[`declarativeNetRequest`](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest)
(Manifest V3). O próprio navegador avalia as regras em código nativo — a
extensão não tem background script nem listener de `webRequest`, então não
acorda a cada requisição nem faz match em JavaScript.

As regras ficam em `rules.json`, gerado a partir de `domains.txt`:

- **Domínios** (`requestDomains`) — um lote de até 1.000 domínios por regra.
  O navegador casa o domínio e todos os seus subdomínios, então um domínio-pai
  já cobre os filhos.
- **Padrões de URL** (`urlFilter`) — trechos que casam em qualquer URL
  (ex.: `/pagead/`, `/api/stats/`).

`rules.json` tem ~45 regras para ~34 mil domínios, e o bloqueio de
`main_frame` é explícito (o padrão do DNR deixa a navegação de topo de fora).

## Desenvolvimento

Requisitos: Node.js (só para regerar a lista/regras).

```sh
# regera rules.json a partir de domains.txt
node tools/build-rules.js

# além disso, reescreve domains.txt (minimizado e ordenado)
node tools/build-rules.js --dedup-domains
```

O build valida cada entrada: linhas que não são domínios canônicos
(classes CSS, tags `[as...]`, query strings) são descartadas, pois
invalidariam a regra inteira no DNR.

### Testar no Firefox

1. `about:debugging#/runtime/this-firefox`
2. *Carregar extensão temporária…* → selecione `manifest.json`
3. Confira em `about:debugging` → *Inspecionar* ou na aba de rede se os
   domínios da lista são bloqueados.

### Empacotar

```sh
npx web-ext build
```

O empacotamento ignora `domains.txt`, `tools/`, `README.md` e `adblock.js`
(veja `.webextignore`); o pacote final contém só `manifest.json`,
`rules.json` e `icons/`.

## Arquivos

| Arquivo              | Descrição                                              |
| -------------------- | ------------------------------------------------------ |
| `manifest.json`      | Manifest V3, permissão `declarativeNetRequest`         |
| `rules.json`         | Regras de bloqueio (gerado)                            |
| `domains.txt`        | Lista-fonte de domínios e padrões (não vai no pacote)  |
| `tools/build-rules.js` | Gera `rules.json` a partir de `domains.txt`          |
| `adblock.js`         | Filtro cosmético (CSS injetado), **não ativado hoje**  |
| `icons/`             | Ícones                                                 |

## Notas

- `adblock.js` esconde elementos por CSS, mas não está referenciado no
  manifest (o filtro cosmético ainda não foi reativado).
- Tipos de recurso cobertos: os comuns a Chrome e Firefox, incluindo
  `main_frame`. Tipos exclusivos do Firefox (`beacon`, `speculative`, …)
  não estão listados.
- Alvo: **Firefox 113+**. A lista de `resourceTypes` também é válida no
  Chrome, mas o pacote não foi testado nele.
