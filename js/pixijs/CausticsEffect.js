export class CausticsEffect {
    constructor(app) {
        this.app = app;

        const vertShader = `
            in vec2 aPosition;
            out vec2 vTextureCoord;
            uniform vec4 uInputSize;
            uniform vec4 uOutputFrame;
            uniform vec4 uOutputTexture;

            void main() {
                vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
                position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
                position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
                gl_Position = vec4(position, 0.0, 1.0);
                vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
            }
        `;

        const fragShader = `
            precision highp float;
            in vec2 vTextureCoord;
            out vec4 finalColor;
            uniform float uTime;
            uniform vec2 uResolution;

            void main() {
                vec2 uv = vTextureCoord * uResolution / 100.0;
                float v1 = sin(uv.x * 0.5 + uTime * 1.2) * cos(uv.y * 0.5 + uTime * 0.8);
                float v2 = sin((uv.x + uv.y) * 0.875 + uTime * 0.9) * cos((uv.x - uv.y) * 0.875 + uTime * 1.1);
                float v3 = sin(uv.x * 0.375 - uTime * 0.7) * sin(uv.y * 0.375 + uTime * 1.3);
                float v = (v1 + v2 + v3) / 3.0;
                v = pow(abs(v), 0.5) * sign(v);
                v = (v + 1.0) / 2.0;
                float brightness = pow(v, 4.0) * 0.22;
                finalColor = vec4(brightness * 0.5, brightness * 0.8, brightness, brightness);
            }
        `;

        this.filter = new PIXI.Filter({
            glProgram: PIXI.GlProgram.from({ fragment: fragShader, vertex: vertShader }),
            resources: {
                filterUniforms: {
                    uTime: { value: 0, type: 'f32' },
                    uResolution: { value: new Float32Array([app.screen.width, app.screen.height]), type: 'vec2<f32>' }
                }
            }
        });

        this.sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
        this.sprite.width = app.screen.width;
        this.sprite.height = app.screen.height;
        this.sprite.filters = [this.filter];
        this.sprite.blendMode = 'add';
    }

    update(timestamp) {
        this.filter.resources.filterUniforms.uniforms.uTime = (timestamp * 0.0002) % 6283.185;
    }

    resize() {
        const { innerWidth: w, innerHeight: h } = window;
        this.sprite.width = w;
        this.sprite.height = h;
        this.filter.resources.filterUniforms.uniforms.uResolution[0] = w;
        this.filter.resources.filterUniforms.uniforms.uResolution[1] = h;
    }
}
