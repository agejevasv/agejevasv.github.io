import { randomColor, hslToRgb } from './utils.js';

const vertexShader = /* glsl */ `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

const fragmentShader = /* glsl */ `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec4 uColor0;
uniform vec4 uColor1;
uniform vec4 uColor2;
uniform vec4 uColor3;
uniform vec4 uColor4;
uniform vec2 uResolution;
uniform float uAngle;

void main(void) {
    // Use gl_FragCoord for pixel-accurate positioning
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 center = uResolution * 0.5;

    float cosA = cos(uAngle);
    float sinA = sin(uAngle);

    // Gradient endpoints matching Canvas 2D
    vec2 p1 = center + vec2(cosA * uResolution.x, sinA * uResolution.y);
    vec2 p2 = center - vec2(cosA * uResolution.x, sinA * uResolution.y);

    vec2 dir = p2 - p1;
    float t = dot(fragCoord - p1, dir) / dot(dir, dir);
    t = clamp(t, 0.0, 1.0);

    float scaledT = t * 4.0;

    vec3 color;
    if (scaledT < 1.0) {
        color = mix(uColor0.rgb, uColor1.rgb, scaledT);
    } else if (scaledT < 2.0) {
        color = mix(uColor1.rgb, uColor2.rgb, scaledT - 1.0);
    } else if (scaledT < 3.0) {
        color = mix(uColor2.rgb, uColor3.rgb, scaledT - 2.0);
    } else {
        color = mix(uColor3.rgb, uColor4.rgb, scaledT - 3.0);
    }

    finalColor = vec4(color, 1.0);
}
`;

export class GradientControllerGPU {
    constructor(app, layer) {
        this.app = app;
        this.currentColors = this.generateColors();
        this.targetColors = this.generateColors();
        this.currentAngle = Math.random() * 360;
        this.targetAngle = Math.random() * 360;
        this.transition = 0;
        this.transitionSpeed = (0.0006 + Math.random() * 0.0012) / 5;

        this.sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
        this.sprite.width = app.screen.width;
        this.sprite.height = app.screen.height;

        this.filter = new PIXI.Filter({
            glProgram: PIXI.GlProgram.from({
                vertex: vertexShader,
                fragment: fragmentShader,
                name: 'gradient-filter'
            }),
            resources: {
                gradientUniforms: {
                    uColor0: { value: new Float32Array([0, 0, 0, 1]), type: 'vec4<f32>' },
                    uColor1: { value: new Float32Array([0, 0, 0, 1]), type: 'vec4<f32>' },
                    uColor2: { value: new Float32Array([0, 0, 0, 1]), type: 'vec4<f32>' },
                    uColor3: { value: new Float32Array([0, 0, 0, 1]), type: 'vec4<f32>' },
                    uColor4: { value: new Float32Array([0, 0, 0, 1]), type: 'vec4<f32>' },
                    uResolution: { value: new Float32Array([app.screen.width, app.screen.height]), type: 'vec2<f32>' },
                    uAngle: { value: 0, type: 'f32' }
                }
            }
        });

        this.sprite.filters = [this.filter];
        layer.addChild(this.sprite);

        this.updateUniforms();
    }

    generateColors() {
        return Array.from({ length: 5 }, () => randomColor());
    }

    updateUniforms() {
        const t = this.transition;
        const uniforms = this.filter.resources.gradientUniforms.uniforms;

        for (let i = 0; i < 5; i++) {
            const c = this.currentColors[i];
            const tc = this.targetColors[i];
            const h = c.h + (tc.h - c.h) * t;
            const s = c.s + (tc.s - c.s) * t;
            const l = c.l + (tc.l - c.l) * t;

            const rgb = hslToRgb(h, s, l);
            const colorArray = uniforms[`uColor${i}`];
            colorArray[0] = rgb[0];
            colorArray[1] = rgb[1];
            colorArray[2] = rgb[2];
        }

        const angle = this.currentAngle + (this.targetAngle - this.currentAngle) * t;
        uniforms.uAngle = (angle * Math.PI) / 180;
        const dpr = this.app.renderer.resolution || 1;
        uniforms.uResolution[0] = this.app.screen.width * dpr;
        uniforms.uResolution[1] = this.app.screen.height * dpr;
    }

    update() {
        this.transition += this.transitionSpeed;

        if (this.transition >= 1) {
            this.transition = 0;
            this.currentColors = [...this.targetColors];
            this.targetColors = this.generateColors();
            this.currentAngle = this.targetAngle;
            this.targetAngle = Math.random() * 360;
            this.transitionSpeed = (0.0006 + Math.random() * 0.0012) / 5;
        }

        this.updateUniforms();
    }

    resize(width, height) {
        this.sprite.width = width;
        this.sprite.height = height;
        const dpr = this.app.renderer.resolution || 1;
        this.filter.resources.gradientUniforms.uniforms.uResolution[0] = width * dpr;
        this.filter.resources.gradientUniforms.uniforms.uResolution[1] = height * dpr;
    }

    regenerate() {
        this.currentColors = this.generateColors();
        this.targetColors = this.generateColors();
        this.currentAngle = Math.random() * 360;
        this.targetAngle = Math.random() * 360;
        this.transition = 0;
        this.transitionSpeed = (0.0006 + Math.random() * 0.0012) / 5;
    }
}
