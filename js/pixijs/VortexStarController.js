import { TWO_PI, hslToHex } from './utils.js';

export class VortexStarController {
    constructor() {
        this.container = new PIXI.Container();
        this.stars = [];

        if (PIXI.BlurFilter) {
            this.container.filters = [new PIXI.BlurFilter({ strength: 0.5, quality: 2 })];
        }
    }

    regenerateProperties(count) {
        this.stars.forEach(s => s.graphics.destroy());
        this.stars = [];

        for (let i = 0; i < count; i++) {
            const hue = Math.random() * 360;
            const color = hslToHex(hue, 85 + Math.random() * 15, 60 + Math.random() * 25);

            const graphics = new PIXI.Graphics();
            graphics.blendMode = 'add';
            this.container.addChild(graphics);

            const sparks = [];
            for (let j = 0; j < 5 + Math.floor(Math.random() * 4); j++) {
                sparks.push({
                    orbitRadius: 30 + Math.random() * 50,
                    orbitSpeed: 0.015 + Math.random() * 0.025,
                    angle: Math.random() * TWO_PI,
                    size: 2 + Math.random() * 3,
                    color: hslToHex((hue + (Math.random() - 0.5) * 60 + 360) % 360, 80 + Math.random() * 20, 70 + Math.random() * 20),
                    alpha: 0.6 + Math.random() * 0.4,
                    wobbleSpeed: 0.02 + Math.random() * 0.03,
                    wobbleAmount: 5 + Math.random() * 10,
                    wobblePhase: Math.random() * TWO_PI
                });
            }

            this.stars.push({
                graphics,
                color,
                sizeMultiplier: 0.7 + Math.random() * 0.8,
                rotationSpeed: (Math.random() > 0.5 ? 1 : -1) * (0.002 + Math.random() * 0.004),
                rotation: 0,
                sparks
            });
        }
    }

    update(agents) {
        if (this.stars.length !== agents.length) {
            this.regenerateProperties(agents.length);
        }

        agents.forEach((agent, i) => {
            const star = this.stars[i];
            const g = star.graphics;

            star.rotation = (star.rotation + star.rotationSpeed) % TWO_PI;

            g.clear();
            g.x = agent.x;
            g.y = agent.y;
            g.rotation = star.rotation;

            const r = 20 * star.sizeMultiplier;
            g.circle(0, 0, r);
            g.fill({ color: star.color, alpha: 0.1 });
            g.circle(0, 0, r * 0.8);
            g.fill({ color: star.color, alpha: 0.3 });
            g.circle(0, 0, r * 0.5);
            g.fill({ color: star.color, alpha: 0.6 });
            g.circle(0, 0, r * 0.2);
            g.fill({ color: star.color, alpha: 1 });

            for (const spark of star.sparks) {
                spark.angle = (spark.angle - spark.orbitSpeed * agent.tangentialDir) % TWO_PI;
                spark.wobblePhase = (spark.wobblePhase + spark.wobbleSpeed) % TWO_PI;

                const wobble = Math.sin(spark.wobblePhase) * spark.wobbleAmount;
                const sx = Math.cos(spark.angle) * (spark.orbitRadius + wobble);
                const sy = Math.sin(spark.angle) * (spark.orbitRadius + wobble);

                g.circle(sx, sy, spark.size * 2);
                g.fill({ color: spark.color, alpha: spark.alpha * 0.3 });
                g.circle(sx, sy, spark.size);
                g.fill({ color: spark.color, alpha: spark.alpha });
            }
        });
    }

    destroy() {
        this.stars.forEach(s => s.graphics.destroy());
        this.container.destroy();
    }
}
