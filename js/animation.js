let fallbackTriggered = false;
let appStarted = false;
let destroyPixiApp = null;
let backgroundMusic = null;

function createAnimationElements() {
    // Loader
    const loader = document.createElement('div');
    loader.id = 'loader';
    loader.innerHTML = '<div class="loader-orb"><div class="loader-ring"></div></div>';
    document.body.appendChild(loader);

    // Pixi container
    const pixiContainer = document.createElement('div');
    pixiContainer.id = 'pixi-container';
    document.body.appendChild(pixiContainer);

    // Back button
    const backButton = document.createElement('button');
    backButton.id = 'back-button';
    backButton.className = 'overlay-btn';
    backButton.textContent = 'BACK';
    document.body.appendChild(backButton);

    // Reset button
    const resetButton = document.createElement('button');
    resetButton.id = 'reset-button';
    resetButton.className = 'overlay-btn';
    resetButton.textContent = 'RESET';
    document.body.appendChild(resetButton);

    // FPS counter
    const fpsCounter = document.createElement('div');
    fpsCounter.id = 'fps-counter';
    fpsCounter.className = 'overlay-btn';
    document.body.appendChild(fpsCounter);

    // Audio
    backgroundMusic = document.createElement('audio');
    backgroundMusic.id = 'background-music';
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.5;
    backgroundMusic.addEventListener('error', tryFallbackStream);
    backgroundMusic.addEventListener('ended', tryFallbackStream);
    document.body.appendChild(backgroundMusic);

    return loader;
}

function removeAnimationElements() {
    ['loader', 'pixi-container', 'back-button', 'reset-button', 'fps-counter', 'background-music']
        .forEach(id => document.getElementById(id)?.remove());
    backgroundMusic = null;
}

function tryFallbackStream() {
    if (fallbackTriggered || !backgroundMusic) return;
    fallbackTriggered = true;
    console.log('Primary stream failed, trying fallback...');
    backgroundMusic.src = 'https://stream-mixtape-geo.ntslive.net/mixtape';
    backgroundMusic.play().catch(err => console.log('Fallback audio failed:', err));
}

function requestFullscreen() {
    const elem = document.documentElement;
    (elem.requestFullscreen || elem.webkitRequestFullscreen || elem.msRequestFullscreen)
        ?.call(elem)
        .catch(err => console.log('Fullscreen request failed:', err));
}

function exitFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log('Exit fullscreen failed:', err));
    } else if (document.webkitFullscreenElement) {
        document.webkitExitFullscreen();
    }
}

async function loadMainModule() {
    try {
        const module = await import('./pixijs/app.js');
        destroyPixiApp = module.destroyPixiApp;
        await module.initPixiApp();
    } catch (err) {
        console.error('Failed to load main module:', err);
    }
}

function startAnimation() {
    if (appStarted) return;
    appStarted = true;

    const introScreen = document.getElementById('intro-screen');
    const loader = createAnimationElements();

    document.title = 'Both In And Out';
    introScreen.classList.add('hidden');
    loader.classList.add('visible');

    backgroundMusic.src = 'https://radio.stereoscenic.com/asp-s';
    backgroundMusic.play().catch(err => console.log('Audio play failed:', err));

    requestFullscreen();

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.js';
    script.onload = () => {
        const filtersScript = document.createElement('script');
        filtersScript.src = 'https://cdn.jsdelivr.net/npm/pixi-filters@6/dist/pixi-filters.min.js';
        filtersScript.onload = loadMainModule;
        filtersScript.onerror = () => {
            console.warn('pixi-filters failed to load, continuing without bloom');
            loadMainModule();
        };
        document.head.appendChild(filtersScript);
    };
    document.head.appendChild(script);
}

function stopAnimation() {
    const introScreen = document.getElementById('intro-screen');

    exitFullscreen();
    backgroundMusic?.pause();

    if (destroyPixiApp) {
        destroyPixiApp();
        destroyPixiApp = null;
    }

    removeAnimationElements();
    introScreen.classList.remove('hidden');
    document.title = 'Viktoras Agejevas – Software Engineer';
    appStarted = false;
    fallbackTriggered = false;
}

document.addEventListener('click', (e) => {
    if (e.target.closest('#start-button')) {
        startAnimation();
    } else if (e.target.closest('#back-button')) {
        stopAnimation();
    } else if (e.target.closest('#reset-button')) {
        window.triggerAnimationReset?.();
    }
});

function handleFullscreenChange() {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    if (!isFullscreen && appStarted) {
        stopAnimation();
    }
}

document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
