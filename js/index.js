// Preload cache for SPA navigation
const pageCache = {};
const pagesToPreload = ['/index.html', '/projects.html', '/music.html', '/writing.html'];

function preloadPages() {
    pagesToPreload.forEach(url => {
        if (pageCache[url]) return;
        fetch(url)
            .then(res => res.text())
            .then(html => { pageCache[url] = html; })
            .catch(() => {});
    });
}

if ('requestIdleCallback' in window) {
    requestIdleCallback(preloadPages);
} else {
    setTimeout(preloadPages, 200);
}

// SPA-like navigation
document.addEventListener('click', async (e) => {
    const link = e.target.closest('.tab-nav a');
    if (!link) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    const url = href === '/' ? '/index.html' : href + '.html';

    try {
        const html = pageCache[url] || await fetch(url).then(r => r.text());
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const newContent = doc.querySelector('.tab-content-wrapper');
        const newNav = doc.querySelector('.tab-nav');

        document.querySelector('.tab-content-wrapper').replaceWith(newContent);
        document.querySelector('.tab-nav').replaceWith(newNav);
        document.title = doc.title;

        history.pushState({}, '', href);
    } catch (err) {
        window.location.href = href;
    }
});

window.addEventListener('popstate', async () => {
    const href = window.location.pathname;
    const url = href === '/' || href === '' ? '/index.html' : href + '.html';

    try {
        const html = pageCache[url] || await fetch(url).then(r => r.text());
        const doc = new DOMParser().parseFromString(html, 'text/html');
        document.querySelector('.tab-content-wrapper').replaceWith(doc.querySelector('.tab-content-wrapper'));
        document.querySelector('.tab-nav').replaceWith(doc.querySelector('.tab-nav'));
        document.title = doc.title;
    } catch {
        window.location.reload();
    }
});
