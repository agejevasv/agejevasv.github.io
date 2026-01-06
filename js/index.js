import { initMusicPlayer, stopMusicPlayer } from './music-player.js';
import './animation.js';

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

async function navigateTo(url) {
    stopMusicPlayer();
    const html = pageCache[url] || await fetch(url).then(r => r.text());
    const doc = new DOMParser().parseFromString(html, 'text/html');
    document.querySelector('.tab-content-wrapper').replaceWith(doc.querySelector('.tab-content-wrapper'));
    document.querySelector('.tab-nav').replaceWith(doc.querySelector('.tab-nav'));
    document.title = doc.title;
    initMusicPlayer();
}

document.addEventListener('click', async e => {
    const link = e.target.closest('.tab-nav a');
    if (!link) return;
    e.preventDefault();
    const href = link.getAttribute('href');
    const url = href === '/' ? '/index.html' : href + '.html';
    try {
        await navigateTo(url);
        history.pushState({}, '', href);
    } catch {
        window.location.href = href;
    }
});

window.addEventListener('popstate', async () => {
    const path = window.location.pathname;
    const url = path === '/' || path === '' ? '/index.html' : path + '.html';
    try {
        await navigateTo(url);
    } catch {
        window.location.reload();
    }
});

initMusicPlayer();
