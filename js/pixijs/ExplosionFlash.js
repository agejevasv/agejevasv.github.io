export class ExplosionFlash {
    constructor(x, y, parentSize, layer) {
        this.size = 5;
        this.maxSize = parentSize * (0.8 + Math.random() * 0.6);
        this.life = 1;
        this.expandSpeed = 5.6;
        this.decay = 0.08;

        this.graphics = new PIXI.Graphics();
        this.graphics.x = x;
        this.graphics.y = y;
        this.graphics.blendMode = 'add';

        layer.addChild(this.graphics);
    }

    update() {
        this.size += this.expandSpeed;
        this.life -= this.decay;
        this.expandSpeed *= 0.9;

        this.graphics.clear();
        this.graphics.circle(0, 0, this.size);
        this.graphics.fill({ color: 0xFFFFFF, alpha: this.life });
        this.graphics.circle(0, 0, this.size * 1.5);
        this.graphics.fill({ color: 0xFFFFFF, alpha: this.life * 0.5 });

        return this.life > 0;
    }

    destroy() {
        this.graphics.destroy();
    }
}
