export class TrailController {
    constructor(app) {
        this.app = app;

        this.renderTexture = PIXI.RenderTexture.create({
            width: app.screen.width,
            height: app.screen.height,
            antialias: true,
            resolution: window.devicePixelRatio || 1
        });

        this.sprite = new PIXI.Sprite(this.renderTexture);
        this.blurFilter = new PIXI.BlurFilter({ strength: 0.5, quality: 2 });
        this.sprite.filters = [this.blurFilter];
        this.darkOverlay = new PIXI.Graphics();
        this.trailContainer = new PIXI.Container();
        this.fadeOverlay = new PIXI.Graphics();
        this.fadeOverlay.alpha = 1;
        this.clearContainer = new PIXI.Container();

        this.graphicsPool = [];
        this.poolIndex = 0;

        this.currentOverlayColor = 0;
        this.currentOverlayAlpha = 0;

        // Shadow color mode: 'match' = same as shape, 'offset' = different hue
        this.shadowColorMode = 'offset';

        this.randomizeBlendMode();
    }

    getPooledGraphics() {
        if (this.poolIndex < this.graphicsPool.length) {
            const g = this.graphicsPool[this.poolIndex];
            g.clear();
            g.visible = true;
            this.poolIndex++;
            return g;
        }
        const g = new PIXI.Graphics();
        this.graphicsPool.push(g);
        this.trailContainer.addChild(g);
        this.poolIndex++;
        return g;
    }

    resetPool() {
        for (let i = this.poolIndex; i < this.graphicsPool.length; i++) {
            this.graphicsPool[i].visible = false;
            this.graphicsPool[i].x = -9999;
        }
        this.poolIndex = 0;
    }

    resize(w, h) {
        this.renderTexture.destroy(true);
        this.renderTexture = PIXI.RenderTexture.create({
            width: w, height: h, antialias: true, resolution: window.devicePixelRatio || 1
        });
        this.sprite.texture = this.renderTexture;

        this.fadeOverlay.clear();
        this.fadeOverlay.rect(0, 0, w, h);
        this.fadeOverlay.fill({ color: 0xFFFFFF, alpha: 0.005 });

        this.updateDarkOverlay();

        for (const g of this.graphicsPool) {
            g.clear();
            g.visible = false;
            g.x = -9999;
        }
        this.poolIndex = 0;
    }

    randomizeBlendMode() {
        const presets = [
            { blend: 'normal', maskColor: 0x000000, maskAlpha: 0.005, spriteAlpha: 0.5, fadeBlend: 'dst-out', overlayAlpha: 0, shadowColor: 'match' },
            { blend: 'normal', maskColor: 0x000000, maskAlpha: 0.004, spriteAlpha: 0.9, fadeBlend: 'dst-out', overlayAlpha: 0, shadowColor: 'offset' },
            { blend: 'normal', maskColor: 0xFFFFFF, maskAlpha: 0.0014, spriteAlpha: 0.6, fadeBlend: 'dst-out', overlayAlpha: 0, shadowColor: 'offset' },
            { blend: 'normal', maskColor: 0x000000, maskAlpha: 0.0005, spriteAlpha: 0.7, fadeBlend: 'dst-out', overlayAlpha: 0.3, shadowColor: 'offset' },
            { blend: 'multiply', maskColor: 0xFFFFFF, maskAlpha: 0.0005, spriteAlpha: 0.7, fadeBlend: 'dst-out', overlayAlpha: 0, shadowColor: 'offset' },
            { blend: 'normal', maskColor: 0x000000, maskAlpha: 0.000114, spriteAlpha: 0.7, fadeBlend: 'multiply', overlayAlpha: 0, shadowColor: 'offset' },
            { blend: 'difference', maskColor: 0x0024DD, maskAlpha: 0.0161, spriteAlpha: 0.7, fadeBlend: 'src-atop', overlayAlpha: 0.1, shadowColor: 'match' },
        ];
        const presetIndex = Math.floor(Math.random() * presets.length);
        const p = presets[presetIndex];
        console.log('Trail preset #' + presetIndex + ':', JSON.stringify(p));

        this.sprite.blendMode = p.blend;
        this.sprite.alpha = p.spriteAlpha;

        this.fadeOverlay.clear();
        this.fadeOverlay.rect(0, 0, this.app.screen.width, this.app.screen.height);
        this.fadeOverlay.fill({ color: p.maskColor, alpha: p.maskAlpha });
        this.fadeOverlay.blendMode = p.fadeBlend;

        this.currentOverlayColor = 0x000000;
        this.currentOverlayAlpha = p.overlayAlpha;
        this.updateDarkOverlay();

        // Shadow color mode
        this.shadowColorMode = p.shadowColor || 'offset';
    }

    updateDarkOverlay() {
        this.darkOverlay.clear();
        if (this.currentOverlayAlpha > 0) {
            this.darkOverlay.rect(0, 0, this.app.screen.width, this.app.screen.height);
            this.darkOverlay.fill({ color: this.currentOverlayColor, alpha: this.currentOverlayAlpha });
        }
    }

    clear() {
        for (const g of this.graphicsPool) {
            g.clear();
            g.visible = false;
            g.x = -9999;
        }
        this.poolIndex = 0;
        this.app.renderer.render({ container: this.clearContainer, target: this.renderTexture, clear: true });
    }

    fade() {
        this.app.renderer.render({ container: this.fadeOverlay, target: this.renderTexture, clear: false });
    }

    renderShapes(shapes, drawFn) {
        this.resetPool();

        for (const shape of shapes) {
            const pos = shape.cachedPos;
            const depthScale = shape.startScale + (shape.endScale - shape.startScale) * shape.progress;
            const opacity = shape.graphics.alpha;
            const color = shape.color.hex;

            if (shape.hasShadow) {
                const g = this.getPooledGraphics();
                g.x = pos.x + shape.offsetX;
                g.y = pos.y + shape.offsetY;
                g.rotation = shape.rotation;
                g.scale.set(depthScale);
                g.alpha = opacity * 0.35 * shape.shadowColor.a * 0.8;
                g.blendMode = 'normal';
                g.setStrokeStyle({ width: shape.lineWidth + shape.shadowBlur / 5, color: shape.shadowColor.hex });
                drawFn(shape, g, shape.size, shape.size / 2);
                if (!shape.strokeOnly) g.fill({ color: shape.shadowColor.hex });
                if (shape.hasStroke || shape.strokeOnly) g.stroke();
            }

            const g = this.getPooledGraphics();
            g.x = pos.x + shape.offsetX;
            g.y = pos.y + shape.offsetY;
            g.rotation = shape.rotation;
            g.scale.set(depthScale);
            g.alpha = opacity * 0.35;
            g.blendMode = 'normal';
            g.setStrokeStyle({ width: shape.lineWidth, color });
            drawFn(shape, g, shape.size, shape.size / 2);
            if (!shape.strokeOnly) g.fill({ color });
            if (shape.hasStroke || shape.strokeOnly) g.stroke();
        }
    }

    renderParticles(particles, skip) {
        if (skip) return;
        for (const p of particles) {
            const g = this.getPooledGraphics();
            g.x = p.graphics.x;
            g.y = p.graphics.y;
            g.blendMode = 'add';
            g.alpha = p.graphics.alpha * 0.4;
            g.circle(0, 0, p.size);
            g.fill({ color: p.color.hex });
        }
    }

    update() {
        this.app.renderer.render({ container: this.trailContainer, target: this.renderTexture, clear: false });
    }

    destroy() {
        this.sprite.destroy();
        this.renderTexture.destroy(true);
        this.graphicsPool.forEach(g => g.destroy());
        this.trailContainer.destroy({ children: true });
        this.fadeOverlay.destroy();
        this.clearContainer.destroy();
    }
}
