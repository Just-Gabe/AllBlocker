// AllBlocker - esconder anuncios no DOM.
//
// Antes: a cada 3s rodava ~180 document.querySelectorAll, media offsetHeight e
// getComputedStyle de cada elemento casado e escrevia element.style.display,
// com um MutationObserver observando attributes + subtree do body inteiro e um
// console.log por anuncio removido. Isso e caro (layout thrashing + GC) e so
// pegava elementos que ja existiam no momento da varredura.
//
// Agora: injeta UMA folha de estilo. O proprio motor de renderizacao aplica o
// display:none nativamente a qualquer elemento presente ou futuro, sem rodar
// JS por elemento, sem observer e sem reflow forçado.
//
// Cada seletor vira uma regra propria de proposito: se um seletor for invalido
// para o CSS, so a regra dele e descartada (em vez de derrubar a folha inteira).
(() => {
    "use strict";

    const STYLE_ID = "__allblocker_css";

    const adSelectors = [
        // IDs e classes comuns
        "[id*='ad']",
        "[id*='Ad']",
        "[id*='AD']",
        "[class*='ad']",
        "[class*='Ad']",
        "[class*='AD']",
        "[class*='advertisement']",
        "[class*='advert']",
        "[class*='banner']",
        "[class*='sponsored']",
        // iframes e elementos especificos
        "iframe[src*='ad']",
        "iframe[src*='pagead']",
        "#companion",
        "ads-foda-fx",
        "ads-recentes-home",
        "ads-recentes-home-2",
        "article-bloco-ads-botton",
        "article-bloco-ads-top",
        "desk-bloco-ads-2",
        "desk-bloco-ads-3",
        "desk-bloco-ads-4",
        "desk-bloco-ads-footer",
        "publi-bottom",
        "publicidades-footer",
        "publicidades-topo",
        "taboola-below-article-thumbnails-recos-reel",
        "taboola-home-page",
        ".ad-container-m1",
        ".ad-rotate-anuncio",
        ".ad-teste",
        ".ad-titulo",
        ".ad-varejo-container",
        ".ads-colunistas-down-2",
        ".ads-eventos",
        ".ads-fixo",
        ".ads-minuto-content",
        ".ads-noticia-main",
        ".ads-oferecimento",
        ".ads-rodape",
        ".adsNoticiaRodape",
        ".ads__painel",
        ".ads_uol_300x250",
        ".ads_uol_728x90",
        ".ads_uol_970x250",
        ".advads-banner-conteudo",
        ".area_publicidade_container",
        ".bloco-publicidade",
        ".container-publicidade-mrec1",
        ".imagem-publicidade-header",
        ".mw-desk-bloco-ads-1",
        ".mw-desk-bloco-ads-2",
        ".mw-desk-bloco-ads-5",
        ".pos-ads-texto",
        ".publicidade-728",
        ".publicidade-ancorads",
        ".publicidade-cima-container",
        ".publicidade-info-mobile",
        ".publicidade-lateral",
        ".publicidade-mob2",
        ".publicidade-pequena",
        ".publicidade-rodape",
        ".publicidade-title",
        ".publicidade300x250",
        ".publicidade_artigo_mobile",
        ".publicidadefixa",
        ".textPublicidade",
        ".tgad-card",
        ".tgad-top",
        ".tgads-center",
        "Publicidade",
        "ad-video-inread--wrapper",
        "ad_mrec_destaque",
        "ad_mrec_esporte",
        "ads-square",
        "barraPublicidade",
        "bx-publ-capa",
        "liBannerDireita",
        "liPublicidadeAdsense",
        "pub-flutuante-1",
        "pub-flutuante-2",
        "pubCofinaFotogaleria",
        "pubMastHead",
        "publ-capa",
        "publ_super",
        "publat1",
        "publat_local",
        "publicidade-topo",
        "publicidadeIsland",
        "publicidade_not",
        "publicidades_top",
        "pubpc",
        "relAds",
        "topopublicidade",
        "vAds",
        "zaz-nb-plugin-ad",
        ".Publicidade",
        ".PublicidadeHorizontal",
        ".PublicidadeQuadrada",
        ".PublicidadeSidebarSuperior",
        ".ad-topstories",
        ".adCabecalho",
        ".ad_300_300",
        ".add_full",
        ".ads20",
        ".ads30",
        ".adsLateral",
        ".adstopo",
        ".anuncio-728",
        ".anuncio-sidebar",
        ".banner-dfp-retangulo",
        ".banner-publicitario-meio",
        ".banner_publicidade_hp",
        ".box-admotion",
        ".box-publicidade-topo",
        ".box_publ_not",
        ".br-grid-1-publicidade",
        ".c-publi",
        ".clic-advertising",
        ".contemPublicidade",
        ".detalheAds",
        ".dfp-section",
        ".div-publicidade",
        ".footer-adv",
        ".h_add",
        ".herald_adsense_widget",
        ".m-advertising",
        ".m-rec_pub",
        ".mod-publicity",
        ".nzn-ads-rectangle",
        ".pub-bloco",
        ".pubLabel",
        ".pub_first",
        ".pub_insert_content",
        ".pub_insert_content_titulo",
        ".pub_mrec",
        ".pubfield",
        ".publicidade-abre_padrao",
        ".publicidade-content",
        ".publicidade-newsletter",
        ".publicidade-wide",
        ".publicidade_superbanner",
        ".publicidades",
        ".publicity-leaderboard",
        ".section-pbl",
        ".sideBarAds",
        ".vip-section-advertising",
        "[class*='ad-']",
        "[class*='Ad-']",
        "[class*='AD-']",
        "[class*='advert-']",
        "[class*='Advert-']",
        "[class*='ADVERT-']",
        "[style*='display: block;'][class*='ad']",
        "[style*='display: block;'][class*='Ad']",
        "[style*='display: block;'][class*='AD']",
        "[class*='*ad*']",
        "[class*='yt-lockup-view-model_content-image'][href*='*://www.googleadservices.com/*']",
        ".video-ads",
        ".ad-simple-attributed-string",
        // YouTube
        "ytd-ad-slot-renderer",
        "ytd-in-feed-ad-layout-renderer",
        "ytd-rich-item-renderer.style-scope:nth-child(1) > div:nth-child(1)",
        "ytd-rich-item-renderer.style-scope:nth-child(1) > div:nth-child(1) > ytd-ad-slot-renderer:nth-child(1)"
    ];

    const css = adSelectors.map(s => s + "{display:none !important;}").join("\n");

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const parent = document.head || document.documentElement;
        if (!parent) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = css;
        parent.appendChild(style);
    }

    injectStyles();
})();
