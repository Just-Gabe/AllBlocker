// Seletores otimizados e generalizados (muito mais rápido)
const adSelectors = [
    // IDs comuns
    "[id*='ad']",
    "[id*='Ad']",
    "[id*='AD']",
    // Classes comuns
    "[class*='ad']",
    "[class*='Ad']",
    "[class*='AD']",
    "[class*='advertisement']",
    "[class*='advert']",
    "[class*='banner']",
    "[class*='sponsored']",
    // iframes e elementos específicos
    "iframe[src*='ad']",
    "iframe[src*='pagead']",
    "#companion",
    "ytd-rich-item-renderer.style-scope:nth-child(1) > div:nth-child(1)",
    "ytd-rich-item-renderer.style-scope:nth-child(1) > div:nth-child(1) > ytd-ad-slot-renderer:nth-child(1)",
    "html body ytd-app div#content.style-scope.ytd-app ytd-page-manager#page-manager.style-scope.ytd-app ytd-browse.style-scope.ytd-page-manager ytd-two-column-browse-results-renderer.style-scope.ytd-browse.grid.grid-disabled div#primary.style-scope.ytd-two-column-browse-results-renderer ytd-rich-grid-renderer.style-scope.ytd-two-column-browse-results-renderer div#contents.style-scope.ytd-rich-grid-renderer ytd-rich-item-renderer.style-scope.ytd-rich-grid-renderer div#content.style-scope.ytd-rich-item-renderer ytd-ad-slot-renderer.style-scope.ytd-rich-item-renderer",
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
    "ytd-rich-item-renderer.style-scope:nth-child(1) > div:nth-child(1) > ytd-ad-slot-renderer:nth-child(1) > div:nth-child(1) > ytd-in-feed-ad-layout-renderer:nth-child(1) > div:nth-child(1)",
    "ytd-in-feed-ad-layout-renderer",
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
];

let throttleTimeout = null;
const THROTTLE_DELAY = 1000; // 1 segundo

function removeAds() {
    let removed = 0;

    adSelectors.forEach(selector => {
        try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // Verificar se é realmente um ad e não um elemento importante
                if (element && element.offsetHeight > 0) {
                    const style = window.getComputedStyle(element);
                    if (style.display !== 'none') {
                        console.log(`Removendo anúncio: ${selector}`);
                        element.style.display = 'none';
                        removed++;
                    }
                }
            });
        } catch (e) {
            console.warn(`Erro ao processar seletor "${selector}":`, e);
            // Alguns seletores podem ser inválidos
        }
    });
}

// Rodar ao carregar a página
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', removeAds);
} else {
    removeAds();
}

// Usar MutationObserver com throttling (mais eficiente que polling)
const observer = new MutationObserver(() => {
    clearTimeout(throttleTimeout);
    throttleTimeout = setTimeout(removeAds, THROTTLE_DELAY);
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'id', 'style']
});
