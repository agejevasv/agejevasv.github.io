export class BubbleTrails {
    constructor(app) {
        this.app = app;
        this.container = new PIXI.Container();
        this.bubbles = [];
    }

    emit(x, y, color) {
        const count = Math.random() < 0.8 ? 1 : 2;
        for (let i = 0; i < count; i++) {
            this.createBubble(x + (Math.random() - 0.5) * 20, y, color);
        }
    }

    createBubble(x, y, color) {
        const b = new PIXI.Graphics();
        const size = 2 + Math.random() * 4;

        b.circle(0, 0, size);
        b.fill({ color: color?.hex || 0xffffff, alpha: 0.2 });
        b.stroke({ width: 1, color: 0xffffff, alpha: 0.6 });
        b.circle(-size * 0.3, -size * 0.3, size * 0.3);
        b.fill({ color: 0xffffff, alpha: 0.5 });

        b.x = x;
        b.y = y;
        b.vy = -0.5 - Math.random();
        b.vx = (Math.random() - 0.5) * 0.3;
        b.wobbleSpeed = 0.05 + Math.random() * 0.05;
        b.wobblePhase = Math.random() * Math.PI * 2;
        b.life = 1;
        b.decay = 0.002 + Math.random() * 0.003;

        this.container.addChild(b);
        this.bubbles.push(b);
    }

    clear() {
        for (const b of this.bubbles) {
            this.container.removeChild(b);
            b.destroy();
        }
        this.bubbles = [];
    }

    update() {
        for (let i = this.bubbles.length - 1; i >= 0; i--) {
            const b = this.bubbles[i];

            b.wobblePhase += b.wobbleSpeed;
            b.x += b.vx + Math.sin(b.wobblePhase) * 0.5;
            b.y += b.vy;
            b.vy *= 0.995;
            b.life -= b.decay;
            b.alpha = b.life;
            b.scale.set(1 + (1 - b.life) * 0.5);

            if (b.life <= 0 || b.y < -20) {
                this.container.removeChild(b);
                b.destroy();
                this.bubbles.splice(i, 1);
            }
        }
    }
}
