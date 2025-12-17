export class GodRays {
    constructor(app) {
        this.app = app;
        this.container = new PIXI.Container();
        this.container.blendMode = 'add';
        this.container.alpha = 0.08;
        this.rays = [];
        this.init();
    }

    createRayTexture(width, height, color) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.1, color);
        gradient.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.beginPath();
        ctx.moveTo(width * 0.4, 0);
        ctx.lineTo(width * 0.6, 0);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        return PIXI.Texture.from(canvas);
    }

    init() {
        const { width: w, height: h } = this.app.screen;
        const colors = [
            'rgba(255,255,255,0.4)',
            'rgba(255,250,240,0.35)',
            'rgba(240,248,255,0.35)',
            'rgba(230,240,255,0.3)'
        ];

        for (let i = 0; i < 8; i++) {
            const rayW = 150 + Math.random() * 200;
            const rayH = h * (1.0 + Math.random() * 0.3);
            const sprite = new PIXI.Sprite(this.createRayTexture(rayW, rayH, colors[Math.floor(Math.random() * colors.length)]));

            sprite.anchor.set(0.5, 0);
            sprite.x = sprite.baseX = Math.random() * w;
            sprite.y = 0;
            sprite.swaySpeed = 0.0002 + Math.random() * 0.0002;
            sprite.swayAmount = 40 + Math.random() * 60;
            sprite.swayPhase = Math.random() * Math.PI * 2;
            sprite.pulseSpeed = 0.0003 + Math.random() * 0.0003;
            sprite.pulsePhase = Math.random() * Math.PI * 2;
            sprite.baseAlpha = 0.4 + Math.random() * 0.4;

            this.rays.push(sprite);
            this.container.addChild(sprite);
        }
    }

    update() {
        for (const ray of this.rays) {
            ray.swayPhase = (ray.swayPhase + ray.swaySpeed) % 6283.185;
            ray.pulsePhase = (ray.pulsePhase + ray.pulseSpeed) % 6283.185;
            ray.x = ray.baseX + Math.sin(ray.swayPhase) * ray.swayAmount;
            ray.alpha = ray.baseAlpha * (0.7 + Math.sin(ray.pulsePhase) * 0.3);
        }
    }

    resize() {
        this.regenerate();
    }

    regenerate() {
        this.rays.forEach(r => r.destroy({ texture: true }));
        this.rays = [];
        this.container.removeChildren();
        this.init();
    }

    destroy() {
        this.rays.forEach(r => r.destroy({ texture: true }));
        this.container.destroy({ children: true });
    }
}
