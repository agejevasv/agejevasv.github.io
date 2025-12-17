import { TWO_PI } from './utils.js';
import { VortexStarController } from './VortexStarController.js';
import { VignetteControllerGPU } from './VignetteControllerGPU.js';
import { FloatingParticles } from './FloatingParticles.js';
import { BubbleTrails } from './BubbleTrails.js';
import { GodRays } from './GodRays.js';
import { CausticsEffect } from './CausticsEffect.js';
import { UnderwaterHaze } from './UnderwaterHaze.js';
import { GradientControllerGPU } from './GradientControllerGPU.js';
import { TrailController } from './TrailController.js';
import { Shape, ShapePool } from './Shape.js';
import { SupernovaParticle } from './SupernovaParticle.js';
import { ExplosionFlash } from './ExplosionFlash.js';

let pixiApp = null;

export function destroyPixiApp() {
    if (!pixiApp) return;

    // Stop the ticker
    pixiApp.ticker.stop();

    // Destroy the app and all its resources
    pixiApp.destroy(true, {
        children: true,
        texture: true,
        textureSource: true
    });

    pixiApp = null;

    // Clean up global reference
    window.triggerAnimationReset = null;
}

export async function initPixiApp() {
    // Create PixiJS Application at native resolution (v8 async init)
    const app = new PIXI.Application();
    await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x000000,
        antialias: true
    });
    pixiApp = app;

    // Cap FPS at 60 for consistent animation speed across devices
    app.ticker.maxFPS = 60;
    document.getElementById('pixi-container').appendChild(app.canvas);

    // Error logging for debugging black screen issues
    const canvas = app.canvas;
    canvas.addEventListener('webglcontextlost', (e) => {
        console.error('[PIXI] WebGL context lost', e);
    });
    canvas.addEventListener('webglcontextrestored', (e) => {
        console.log('[PIXI] WebGL context restored', e);
    });

    // Layers
    const backgroundLayer = new PIXI.Container();
    const causticsLayer = new PIXI.Container();
    const godRaysLayer = new PIXI.Container();
    const trailLayer = new PIXI.Container();
    const shapesLayer = new PIXI.Container();
    const particlesLayer = new PIXI.Container();
    const floatingParticlesFarLayer = new PIXI.Container();
    const floatingParticlesMidNearLayer = new PIXI.Container();
    const vignetteLayer = new PIXI.Container();

    // Content container - underwater effects applied here
    const contentContainer = new PIXI.Container();
    contentContainer.addChild(backgroundLayer);
    contentContainer.addChild(floatingParticlesFarLayer);
    contentContainer.addChild(trailLayer);
    contentContainer.addChild(causticsLayer);
    contentContainer.addChild(godRaysLayer);
    contentContainer.addChild(particlesLayer);
    contentContainer.addChild(shapesLayer);
    contentContainer.addChild(floatingParticlesMidNearLayer);

    // Add content container to stage
    app.stage.addChild(contentContainer);
    app.stage.addChild(vignetteLayer);

    // Animation state
    const gradientController = new GradientControllerGPU(app, backgroundLayer);
    const vortexStarController = new VortexStarController();
    const vignetteController = new VignetteControllerGPU(app, vignetteLayer);

    // Underwater effects
    const floatingParticles = new FloatingParticles(app);
    const godRays = new GodRays(app);
    const caustics = new CausticsEffect(app);
    const bubbleTrails = new BubbleTrails(app);
    const underwaterHaze = new UnderwaterHaze(app);

    // Add vortex stars to particles layer
    particlesLayer.addChild(vortexStarController.container);


    // Add underwater effects to their layers
    floatingParticlesFarLayer.addChild(floatingParticles.farContainer);
    floatingParticlesMidNearLayer.addChild(floatingParticles.midNearContainer);
    floatingParticlesMidNearLayer.addChild(bubbleTrails.container);
    godRaysLayer.addChild(godRays.container);
    causticsLayer.addChild(caustics.sprite);
    floatingParticlesMidNearLayer.addChild(underwaterHaze.sprite);

    let sizeScale = 1;
    const shapePool = new ShapePool(app, shapesLayer, sizeScale);

    let shapes = [];
    let supernovaParticles = [];
    let explosionFlashes = [];
    let lastSpawnTime = 0;
    let collisionCheckFrame = 0;

    const calculateMaxShapes = () => 11;
    let MAX_SHAPES = calculateMaxShapes();

    // Mouse tracking
    let mouseX = -1000;
    let mouseY = -1000;
    const REPULSION_RADIUS = 100;
    const REPULSION_STRENGTH = 2;

    // Invisible spinning agents - spiral paths
    const generateInvisibleSpinningAgents = () => {
        const isSmallScreen = app.screen.width < 600;
        const count = isSmallScreen ? 0 : 1 + Math.floor(Math.random() * 2);
        const agents = [];
        const maxRadius = Math.min(app.screen.width, app.screen.height) / 2;

        for (let i = 0; i < count; i++) {
            const spiralDir = Math.random() > 0.5 ? 1 : -1;
            const startAngle = Math.random() * TWO_PI;
            const startRadialPhase = Math.random() * TWO_PI;
            const minR = maxRadius * 0.25;
            const maxR = maxRadius * 1.0;
            const startRadialT = (Math.sin(startRadialPhase) + 1) / 2;
            const startRadius = minR + startRadialT * (maxR - minR);
            const centerX = app.screen.width / 2;
            const centerY = app.screen.height / 2;

            agents.push({
                x: centerX + Math.cos(startAngle) * startRadius,
                y: centerY + Math.sin(startAngle) * startRadius,
                angle: startAngle,
                radialPhase: startRadialPhase,
                spiralSpeed: 0.001 + Math.random() * 0.0004,
                spiralDir: spiralDir,
                minRadius: minR,
                maxRadius: maxR,
                radius: 300 + Math.random() * 200,
                strength: 0.8 + Math.random() * 0.6,
                tangentialDir: Math.random() > 0.5 ? 1 : -1
            });
        }
        return agents;
    };

    const updateVortexPositions = (agents) => {
        const centerX = app.screen.width / 2;
        const centerY = app.screen.height / 2;

        agents.forEach(agent => {
            agent.angle += agent.spiralSpeed * agent.spiralDir;
            if (agent.angle > TWO_PI) agent.angle -= TWO_PI;
            if (agent.angle < -TWO_PI) agent.angle += TWO_PI;

            agent.radialPhase += agent.spiralSpeed * 0.3;
            if (agent.radialPhase > TWO_PI) agent.radialPhase -= TWO_PI;

            const radialT = (Math.sin(agent.radialPhase) + 1) / 2;
            const currentRadius = agent.minRadius + radialT * (agent.maxRadius - agent.minRadius);

            agent.x = centerX + Math.cos(agent.angle) * currentRadius;
            agent.y = centerY + Math.sin(agent.angle) * currentRadius;
        });
    };

    let invisibleSpinningAgents = generateInvisibleSpinningAgents();

    // Mouse events (v8: app.canvas instead of app.view)
    app.canvas.addEventListener('mousemove', (e) => {
        const rect = app.canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    app.canvas.addEventListener('mouseleave', () => {
        mouseX = -1000;
        mouseY = -1000;
    });

    // Touch support
    app.canvas.addEventListener('touchstart', (e) => {
        const rect = app.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        mouseX = touch.clientX - rect.left;
        mouseY = touch.clientY - rect.top;
    }, { passive: true });

    app.canvas.addEventListener('touchmove', (e) => {
        const rect = app.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        mouseX = touch.clientX - rect.left;
        mouseY = touch.clientY - rect.top;
    }, { passive: true });

    app.canvas.addEventListener('touchend', () => {
        mouseX = -1000;
        mouseY = -1000;
    }, { passive: true });

    // Click to explode
    app.canvas.addEventListener('click', (e) => {
        const rect = app.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        let closestShape = null;
        let closestDistance = Infinity;
        let closestIndex = -1;

        for (let i = 0; i < shapes.length; i++) {
            const shape = shapes[i];
            const shapeX = shape.cachedPos.x + shape.offsetX;
            const shapeY = shape.cachedPos.y + shape.offsetY;

            const dx = clickX - shapeX;
            const dy = clickY - shapeY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const depthScale = shape.startScale + (shape.endScale - shape.startScale) * shape.progress;
            const effectiveSize = shape.size * depthScale;

            if (distance < effectiveSize * 0.75 && distance < closestDistance) {
                closestShape = shape;
                closestDistance = distance;
                closestIndex = i;
            }
        }

        if (closestShape) {
            const shapeX = closestShape.cachedPos.x + closestShape.offsetX;
            const shapeY = closestShape.cachedPos.y + closestShape.offsetY;
            closestShape.triggerSupernovaAt(shapeX, shapeY);
            shapePool.release(closestShape);
            shapes.splice(closestIndex, 1);
        }
    });

    // Trail controller
    const trailController = new TrailController(app);
    app.trailController = trailController;

    // Explosion timing
    let nextExplosionTime = 90000 + Math.random() * 90000;
    let lastTimestamp = performance.now();
    let isResettingExplosion = false;
    let trailFrameCounter = 0;

    trailLayer.addChild(trailController.sprite);
    trailLayer.addChild(trailController.darkOverlay);


    // Helper to create particles (passed to shapes)
    const createSupernovaParticle = (x, y, color, velX, velY, scale) => {
        const particle = new SupernovaParticle(x, y, color, velX, velY, scale, particlesLayer);
        supernovaParticles.push(particle);
    };

    const createExplosionFlash = (x, y, size) => {
        const flash = new ExplosionFlash(x, y, size, particlesLayer);
        explosionFlashes.push(flash);
    };

    // Helper function for trail controller
    const drawShapeToGraphicsFn = (shape, graphics, size, halfSize) => {
        shape.drawShapeToGraphics(graphics, size, halfSize);
    };

    // Handle window resize
    window.addEventListener('resize', () => {
        if (!pixiApp) return;
        pixiApp.renderer.resize(window.innerWidth, window.innerHeight);

        MAX_SHAPES = calculateMaxShapes();

        // Resize GPU-based controllers
        gradientController.resize(window.innerWidth, window.innerHeight);
        trailController.resize(window.innerWidth, window.innerHeight);
        vignetteController.resize(window.innerWidth, window.innerHeight);

        caustics.resize();
        godRays.resize();
        floatingParticles.resize();
        underwaterHaze.resize();

        shapes.forEach(shape => shapePool.release(shape));
        shapes = [];

        invisibleSpinningAgents = generateInvisibleSpinningAgents();
    });

    // Reset function - can be triggered by timer or manually
    function triggerReset() {
        isResettingExplosion = true;

        vignetteController.triggerBlackout(() => {
            trailController.clear();
            bubbleTrails.clear();
            gradientController.regenerate();
            godRays.regenerate();
            trailController.randomizeBlendMode();

            supernovaParticles.forEach(p => p.destroy());
            supernovaParticles = [];
            explosionFlashes.forEach(f => f.destroy());
            explosionFlashes = [];

            shapes.forEach(shape => shapePool.release(shape));
            shapes = [];
            for (let i = 0; i < 3; i++) {
                const newShape = shapePool.get();
                newShape.onSupernova = createSupernovaParticle;
                newShape.onExplosionFlash = createExplosionFlash;
                shapes.push(newShape);
            }

            invisibleSpinningAgents = generateInvisibleSpinningAgents();
            vortexStarController.regenerateProperties(invisibleSpinningAgents.length);

            setTimeout(() => {
                isResettingExplosion = false;
            }, 200);
        });

        shapes.forEach(shape => {
            shape.explode();
        });

        nextExplosionTime = 90000 + Math.random() * 90000;
    }

    // Expose reset function globally for the reset button
    window.triggerAnimationReset = triggerReset;

    // Animation loop
    function animate(timestamp) {
        const deltaTime = timestamp - lastTimestamp;
        lastTimestamp = timestamp;

        gradientController.update();

        updateVortexPositions(invisibleSpinningAgents);
        vortexStarController.update(invisibleSpinningAgents);

        floatingParticles.update(timestamp);
        godRays.update(timestamp);
        caustics.update(timestamp);
        bubbleTrails.update(timestamp);
        underwaterHaze.update(timestamp);

        // Spawn shapes
        if (shapes.length < MAX_SHAPES && timestamp - lastSpawnTime > 600 + Math.random() * 1000) {
            const newShape = shapePool.get();
            newShape.onSupernova = createSupernovaParticle;
            newShape.onExplosionFlash = createExplosionFlash;
            shapes.push(newShape);
            lastSpawnTime = timestamp;
        }

        collisionCheckFrame++;
        const shouldCheckCollisions = collisionCheckFrame % 3 === 0;

        const newBirthPoints = [];
        shapes = shapes.filter(shape => {
            const alive = shape.update(mouseX, mouseY, REPULSION_RADIUS, REPULSION_STRENGTH, shapes, invisibleSpinningAgents, shouldCheckCollisions, timestamp);

            if (alive && timestamp - shape.lastBubbleTime > shape.bubbleInterval) {
                shape.lastBubbleTime = timestamp;
                shape.bubbleInterval = 15000 + Math.random() * 25000;
                bubbleTrails.emit(
                    shape.cachedPos.x + shape.offsetX + shape.swayX,
                    shape.cachedPos.y + shape.offsetY + shape.swayY,
                    shape.color
                );
            }

            if (alive) {
                shape.draw();
            } else {
                if (shape.collisionBirthPoint) {
                    newBirthPoints.push(shape.collisionBirthPoint);
                }
                shapePool.release(shape);
            }
            return alive;
        });

        const uniqueBirthPoints = [];
        newBirthPoints.forEach(point => {
            const exists = uniqueBirthPoints.some(p =>
                Math.abs(p.x - point.x) < 1 && Math.abs(p.y - point.y) < 1
            );
            if (!exists) {
                uniqueBirthPoints.push(point);
            }
        });

        uniqueBirthPoints.forEach(point => {
            const spawnCount = point.spawn2 ? 2 : 1;
            const isSelfExplosion = point.spawn2 !== undefined;
            for (let i = 0; i < spawnCount; i++) {
                if (!isSelfExplosion && shapes.length >= MAX_SHAPES) break;
                const newShape = shapePool.get();
                newShape.onSupernova = createSupernovaParticle;
                newShape.onExplosionFlash = createExplosionFlash;
                newShape.waypoints[0] = { x: point.x, y: point.y };
                newShape.progress = 0;
                shapes.push(newShape);
            }
        });

        trailFrameCounter++;
        if (trailFrameCounter >= 2) {
            trailController.fade();
            trailController.renderShapes(shapes, drawShapeToGraphicsFn);
            trailController.renderParticles(supernovaParticles, isResettingExplosion);
            trailController.update();
            trailFrameCounter = 0;
        }

        nextExplosionTime -= deltaTime;
        if (nextExplosionTime <= 0) {
            triggerReset();
        }

        supernovaParticles = supernovaParticles.filter(particle => {
            const alive = particle.update();
            if (!alive) particle.destroy();
            return alive;
        });

        explosionFlashes = explosionFlashes.filter(flash => {
            const alive = flash.update();
            if (!alive) flash.destroy();
            return alive;
        });

        vignetteController.update(timestamp);
    }

    function startAnimation() {
        for (let i = 0; i < 3; i++) {
            const newShape = shapePool.get();
            newShape.onSupernova = createSupernovaParticle;
            newShape.onExplosionFlash = createExplosionFlash;
            shapes.push(newShape);
        }

        let firstFrame = true;
        const fpsCounter = document.getElementById('fps-counter');
        let fpsUpdateTimer = 0;

        // v8: ticker callback receives Ticker object, use ticker.deltaTime
        app.ticker.add((ticker) => {
            animate(performance.now());
            if (firstFrame) {
                firstFrame = false;
                setTimeout(() => {
                    document.getElementById('loader').classList.remove('visible');
                    document.getElementById('back-button').classList.add('visible');
                    document.getElementById('reset-button').classList.add('visible');
                    fpsCounter.classList.add('visible');
                }, 500);
            }
            fpsUpdateTimer += ticker.deltaTime;
            if (fpsUpdateTimer >= 30) {
                fpsCounter.textContent = Math.round(app.ticker.FPS) + ' FPS';
                fpsUpdateTimer = 0;
            }
        });
    }

    startAnimation();
}
