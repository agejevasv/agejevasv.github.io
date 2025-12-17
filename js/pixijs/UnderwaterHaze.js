export class UnderwaterHaze {
    constructor(app) {
        this.app = app;
        this.container = new PIXI.Container();
        this.container.blendMode = 'add';
        this.container.alpha = 0.06;
        this.patches = [];
        this.init();
    }

    createPatchTexture(size) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        const half = size / 2;

        const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
        gradient.addColorStop(0, 'rgba(200,230,255,0.8)');
        gradient.addColorStop(0.3, 'rgba(180,220,255,0.4)');
        gradient.addColorStop(0.7, 'rgba(150,200,255,0.1)');
        gradient.addColorStop(1, 'rgba(150,200,255,0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        return PIXI.Texture.from(canvas);
    }

    init() {
        const { width: w, height: h } = this.app.screen;

        for (let i = 0; i < 6; i++) {
            const size = 300 + Math.random() * 400;
            const sprite = new PIXI.Sprite(this.createPatchTexture(size));
            sprite.anchor.set(0.5);
            sprite.x = sprite.baseX = Math.random() * w;
            sprite.y = sprite.baseY = Math.random() * h;

            sprite.driftSpeedX = 0.00005 + Math.random() * 0.0001;
            sprite.driftSpeedY = 0.00003 + Math.random() * 0.00007;
            sprite.driftAmountX = 100 + Math.random() * 150;
            sprite.driftAmountY = 80 + Math.random() * 120;
            sprite.phaseX = Math.random() * Math.PI * 2;
            sprite.phaseY = Math.random() * Math.PI * 2;

            sprite.baseScale = 0.8 + Math.random() * 0.4;
            sprite.scaleSpeed = 0.0002 + Math.random() * 0.0002;
            sprite.scalePhase = Math.random() * Math.PI * 2;
            sprite.scaleAmount = 0.2;

            sprite.baseAlpha = 0.5 + Math.random() * 0.5;
            sprite.alphaSpeed = 0.0003 + Math.random() * 0.0002;
            sprite.alphaPhase = Math.random() * Math.PI * 2;

            this.patches.push(sprite);
            this.container.addChild(sprite);
        }
    }

    get sprite() {
        return this.container;
    }

    update() {
        for (const p of this.patches) {
            p.phaseX = (p.phaseX + p.driftSpeedX) % 6.283;
            p.phaseY = (p.phaseY + p.driftSpeedY) % 6.283;
            p.scalePhase = (p.scalePhase + p.scaleSpeed) % 6.283;
            p.alphaPhase = (p.alphaPhase + p.alphaSpeed) % 6.283;

            p.x = p.baseX + Math.sin(p.phaseX) * p.driftAmountX;
            p.y = p.baseY + Math.sin(p.phaseY) * p.driftAmountY;
            p.scale.set(p.baseScale + Math.sin(p.scalePhase) * p.scaleAmount);
            p.alpha = p.baseAlpha * (0.6 + Math.sin(p.alphaPhase) * 0.4);
        }
    }

    resize() {
        const { innerWidth: w, innerHeight: h } = window;
        for (const p of this.patches) {
            p.baseX = Math.random() * w;
            p.baseY = Math.random() * h;
        }
    }

    destroy() {
        this.patches.forEach(p => p.destroy({ texture: true }));
        this.container.destroy({ children: true });
    }
}
