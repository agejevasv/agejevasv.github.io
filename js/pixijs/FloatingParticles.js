import { TWO_PI } from './utils.js';

export class FloatingParticles {
    constructor(app) {
        this.app = app;
        this.farContainer = new PIXI.Container();
        this.midNearContainer = new PIXI.Container();
        this.particles = [];

        this.layers = {
            far:  { count: 45, size: [0.5, 1.5], alpha: [0.12, 0.15], speed: [0.05, 0.1] },
            mid:  { count: 25, size: [1.5, 2.5], alpha: [0.2, 0.25],  speed: [0.25, 0.4] },
            near: { count: 15, size: [2.5, 4],   alpha: [0.3, 0.35],  speed: [0.4, 0.6] }
        };

        this.init();
    }

    init() {
        for (const [depth, config] of Object.entries(this.layers)) {
            for (let i = 0; i < config.count; i++) {
                this.createParticle(config, depth);
            }
        }
    }

    createParticle(config, depth) {
        const p = new PIXI.Graphics();
        const size = config.size[0] + Math.random() * (config.size[1] - config.size[0]);
        const alpha = config.alpha[0] + Math.random() * (config.alpha[1] - config.alpha[0]);

        p.circle(0, 0, size);
        p.fill({ color: 0xffffff, alpha });

        p.x = Math.random() * this.app.screen.width;
        p.y = Math.random() * this.app.screen.height;

        const speed = config.speed[0] + Math.random() * (config.speed[1] - config.speed[0]);
        p.vx = (Math.random() - 0.5) * speed;
        p.vy = -speed * (0.5 + Math.random() * 0.5);

        const wobbleScale = depth === 'far' ? 0.5 : depth === 'mid' ? 0.75 : 1;
        p.wobbleSpeed = (0.01 + Math.random() * 0.02) * wobbleScale;
        p.wobbleAmount = (10 + Math.random() * 20) * wobbleScale;
        p.wobblePhase = Math.random() * TWO_PI;

        (depth === 'far' ? this.farContainer : this.midNearContainer).addChild(p);
        this.particles.push(p);
    }

    update() {
        const w = this.app.screen.width;
        const h = this.app.screen.height;

        for (const p of this.particles) {
            p.wobblePhase = (p.wobblePhase + p.wobbleSpeed) % TWO_PI;
            p.x += p.vx + Math.sin(p.wobblePhase) * 0.2;
            p.y += p.vy;

            if (p.y < -20) { p.y = h + 20; p.x = Math.random() * w; }
            if (p.x < -20) p.x = w + 20;
            if (p.x > w + 20) p.x = -20;
        }
    }

    resize() {
        const w = this.app.screen.width;
        const h = this.app.screen.height;
        for (const p of this.particles) {
            if (p.x > w) p.x = Math.random() * w;
            if (p.y > h) p.y = Math.random() * h;
        }
    }
}
