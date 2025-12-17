import { TWO_PI } from './utils.js';

export class SupernovaParticle {
    constructor(x, y, color, momentumX = 0, momentumY = 0, sizeScale = 1, layer) {
        const angle = Math.random() * TWO_PI;
        const speed = (2.5 + Math.random() * 3) * 0.7;

        this.velocityX = Math.cos(angle) * speed + momentumX * 0.1;
        this.velocityY = Math.sin(angle) * speed + momentumY * 0.1;
        this.size = (3 + Math.random() * 5) * (0.7 + sizeScale * 0.3);
        this.life = 1;
        this.decay = 0.02 + Math.random() * 0.015;
        this.color = color;

        this.graphics = new PIXI.Graphics();
        this.graphics.x = x;
        this.graphics.y = y;
        this.graphics.circle(0, 0, this.size);
        this.graphics.fill({ color: color.hex });
        this.graphics.blendMode = 'add';

        layer.addChild(this.graphics);
    }

    update() {
        this.graphics.x += this.velocityX;
        this.graphics.y += this.velocityY;
        this.life -= this.decay;
        this.velocityX *= 0.95;
        this.velocityY *= 0.95;
        this.graphics.alpha = this.life * this.color.a;
        return this.life > 0;
    }

    destroy() {
        this.graphics.destroy();
    }
}
