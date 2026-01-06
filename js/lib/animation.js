class AnimationController {
    constructor() {
        this.started = false;
        this.fallbackTriggered = false;
        this.destroyPixiApp = null;
        this.backgroundMusic = null;
    }

    bindEvents() {
        document.addEventListener('click', e => {
            if (e.target.closest('#start-button')) this.start();
            else if (e.target.closest('#back-button')) this.stop();
            else if (e.target.closest('#reset-button')) window.triggerAnimationReset?.();
        });

        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
    }

    handleFullscreenChange() {
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
        if (!isFullscreen && this.started) this.stop();
    }

    createElements() {
        const loader = document.createElement('div');
        loader.id = 'loader';
        loader.innerHTML = '<div class="loader-orb"><div class="loader-ring"></div></div>';
        document.body.appendChild(loader);

        const pixiContainer = document.createElement('div');
        pixiContainer.id = 'pixi-container';
        document.body.appendChild(pixiContainer);

        const backButton = document.createElement('button');
        backButton.id = 'back-button';
        backButton.className = 'overlay-btn';
        backButton.textContent = 'BACK';
        document.body.appendChild(backButton);

        const resetButton = document.createElement('button');
        resetButton.id = 'reset-button';
        resetButton.className = 'overlay-btn';
        resetButton.textContent = 'RESET';
        document.body.appendChild(resetButton);

        const fpsCounter = document.createElement('div');
        fpsCounter.id = 'fps-counter';
        fpsCounter.className = 'overlay-btn';
        document.body.appendChild(fpsCounter);

        this.backgroundMusic = document.createElement('audio');
        this.backgroundMusic.id = 'background-music';
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.5;
        this.backgroundMusic.addEventListener('error', () => this.tryFallbackStream());
        this.backgroundMusic.addEventListener('ended', () => this.tryFallbackStream());
        document.body.appendChild(this.backgroundMusic);

        return loader;
    }

    removeElements() {
        ['loader', 'pixi-container', 'back-button', 'reset-button', 'fps-counter', 'background-music']
            .forEach(id => document.getElementById(id)?.remove());
        this.backgroundMusic = null;
    }

    tryFallbackStream() {
        if (this.fallbackTriggered || !this.backgroundMusic) return;
        this.fallbackTriggered = true;
        console.log('Primary stream failed, trying fallback...');
        this.backgroundMusic.src = 'https://stream-mixtape-geo.ntslive.net/mixtape';
        this.backgroundMusic.play().catch(err => console.log('Fallback audio failed:', err));
    }

    requestFullscreen() {
        const elem = document.documentElement;
        (elem.requestFullscreen || elem.webkitRequestFullscreen || elem.msRequestFullscreen)
            ?.call(elem)
            .catch(err => console.log('Fullscreen request failed:', err));
    }

    exitFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.log('Exit fullscreen failed:', err));
        } else if (document.webkitFullscreenElement) {
            document.webkitExitFullscreen();
        }
    }

    async loadPixi() {
        try {
            const module = await import('./pixijs/app.js');
            this.destroyPixiApp = module.destroyPixiApp;
            await module.initPixiApp();
        } catch (err) {
            console.error('Failed to load pixi module:', err);
        }
    }

    start() {
        if (this.started) return;
        this.started = true;

        const introScreen = document.getElementById('intro-screen');
        const loader = this.createElements();

        document.title = 'Both In And Out';
        introScreen.classList.add('hidden');
        loader.classList.add('visible');

        this.backgroundMusic.src = 'https://radio.stereoscenic.com/asp-s';
        this.backgroundMusic.play().catch(err => console.log('Audio play failed:', err));

        this.requestFullscreen();

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.min.js';
        script.onload = () => {
            const filtersScript = document.createElement('script');
            filtersScript.src = 'https://cdn.jsdelivr.net/npm/pixi-filters@6/dist/pixi-filters.min.js';
            filtersScript.onload = () => this.loadPixi();
            filtersScript.onerror = () => {
                console.warn('pixi-filters failed to load, continuing without bloom');
                this.loadPixi();
            };
            document.head.appendChild(filtersScript);
        };
        document.head.appendChild(script);
    }

    stop() {
        const introScreen = document.getElementById('intro-screen');

        this.exitFullscreen();
        this.backgroundMusic?.pause();

        if (this.destroyPixiApp) {
            this.destroyPixiApp();
            this.destroyPixiApp = null;
        }

        this.removeElements();
        introScreen.classList.remove('hidden');
        document.title = 'Viktoras Agejevas – Software Engineer';
        this.started = false;
        this.fallbackTriggered = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('start-button')) {
        new AnimationController().bindEvents();
    }
});
