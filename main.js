const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl');
const mat4 = glMatrix.mat4;

if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
}

// Shader sources from map.md
const sky_vert_shader = `
attribute vec3 aPosition;
attribute vec2 aUV;
uniform mat4 uViewProj; // use camera's view * proj but remove translation from view so sphere follows camera
varying vec2 vUV;
void main() {
  vUV = aUV;
  gl_Position = uViewProj * vec4(aPosition, 1.0);
}
`;

const sky_frag_shader = `
precision mediump float;
varying vec2 vUV;
uniform sampler2D uSkyTex;
void main() {
  vec4 c = texture2D(uSkyTex, vUV);
  gl_FragColor = c;
}
`;

const ground_vert_shader = `
attribute vec3 aPosition;
attribute vec2 aUV;
uniform mat4 uModelViewProj;
varying vec2 vUV;
void main(){
  vUV = aUV;
  gl_Position = uModelViewProj * vec4(aPosition,1.0);
}
`;

const ground_frag_shader = `
precision mediump float;
varying vec2 vUV;
uniform sampler2D uGroundTex;
uniform float uTile; // e.g. 10.0 to tile 10x
void main(){
  vec2 uv = vUV * uTile;
  vec4 c = texture2D(uGroundTex, fract(uv));
  gl_FragColor = c;
}
`;

const waterfall_vert_shader = `
attribute vec3 aPosition;
attribute vec2 aUV;
uniform mat4 uModelViewProj;
varying vec2 vUV;
varying vec3 vPosition;
void main(){
  vUV = aUV;
  vPosition = aPosition;
  gl_Position = uModelViewProj * vec4(aPosition,1.0);
}
`;

const waterfall_frag_shader = `
precision mediump float;
varying vec2 vUV;
uniform float uTime;
uniform sampler2D uFlowTex;     // grayscale/rgba mask (flow alpha)
uniform sampler2D uFlowNormal;  // normal map for ripples
uniform sampler2D uBgTex;       // optional background for fake refraction
uniform vec3 uLightDir;         // normalized light
uniform float uScrollSpeed;     // e.g. 1.2
uniform float uStrength;        // refraction strength
void main(){
  // scroll UV downward (v decreasing) to animate falling water
  vec2 uvFlow = vUV + vec2(0.0, -uTime * uScrollSpeed);

  // sample flow mask and normal
  vec4 flowMask = texture2D(uFlowTex, uvFlow);
  vec3 n = texture2D(uFlowNormal, uvFlow).rgb * 2.0 - 1.0; // convert from [0,1] to [-1,1]

  // simple lighting: fresnel-ish + specular
  float ndotl = max(dot(normalize(n), normalize(uLightDir)), 0.0);
  float spec = pow(ndotl, 32.0) * 0.8;

  // fake refraction: offset bg sample by normal.x/normal.y * strength
  vec2 refrUV = vUV + n.xy * uStrength;
  vec4 bg = texture2D(uBgTex, refrUV);

  // color of water is tinted bg + spec highlights
  vec3 waterColor = mix(bg.rgb * 0.9, vec3(0.6,0.7,0.9), 0.25) + spec;

  // use the flowMask alpha (or luminance) as transparency mask
  float alpha = flowMask.a; // or use flowMask.r or luminance
  // soften edges by noise (optional)
  // alpha *= smoothstep(0.15, 0.85, flowMask.r);

  gl_FragColor = vec4(waterColor, alpha * 0.9); // slightly translucent
}
`;

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  width, height, border, srcFormat, srcType,
                  pixel);

    const image = new Image();
    image.crossOrigin = 'anonymous'; // <- MUST be set BEFORE image.src

    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                      srcFormat, srcType, image);

        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
           gl.generateMipmap(gl.TEXTURE_2D);
        } else {
           gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
           gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
           gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
    };
    image.src = url;

    return texture;
}

function isPowerOf2(value) {
    return (value & (value - 1)) == 0;
}

// Initialize shader programs
const skyProgram = initShaderProgram(gl, sky_vert_shader, sky_frag_shader);
const groundProgram = initShaderProgram(gl, ground_vert_shader, ground_frag_shader);
const waterfallProgram = initShaderProgram(gl, waterfall_vert_shader, waterfall_frag_shader);

// Get attribute and uniform locations
const skyLocations = {
    position: gl.getAttribLocation(skyProgram, 'aPosition'),
    uv: gl.getAttribLocation(skyProgram, 'aUV'),
    viewProj: gl.getUniformLocation(skyProgram, 'uViewProj'),
    skyTex: gl.getUniformLocation(skyProgram, 'uSkyTex'),
};

const groundLocations = {
    position: gl.getAttribLocation(groundProgram, 'aPosition'),
    uv: gl.getAttribLocation(groundProgram, 'aUV'),
    modelViewProj: gl.getUniformLocation(groundProgram, 'uModelViewProj'),
    groundTex: gl.getUniformLocation(groundProgram, 'uGroundTex'),
    tile: gl.getUniformLocation(groundProgram, 'uTile'),
};

const waterfallLocations = {
    position: gl.getAttribLocation(waterfallProgram, 'aPosition'),
    uv: gl.getAttribLocation(waterfallProgram, 'aUV'),
    modelViewProj: gl.getUniformLocation(waterfallProgram, 'uModelViewProj'),
    time: gl.getUniformLocation(waterfallProgram, 'uTime'),
    flowTex: gl.getUniformLocation(waterfallProgram, 'uFlowTex'),
    flowNormal: gl.getUniformLocation(waterfallProgram, 'uFlowNormal'),
    bgTex: gl.getUniformLocation(waterfallProgram, 'uBgTex'),
    lightDir: gl.getUniformLocation(waterfallProgram, 'uLightDir'),
    scrollSpeed: gl.getUniformLocation(waterfallProgram, 'uScrollSpeed'),
    strength: gl.getUniformLocation(waterfallProgram, 'uStrength'),
};

function createSphere(radius, lats, longs) {
    const vertices = [];
    const indices = [];
    const uvs = [];

    for (let i = 0; i <= lats; i++) {
        const lat = i * Math.PI / lats;
        const sinLat = Math.sin(lat);
        const cosLat = Math.cos(lat);

        for (let j = 0; j <= longs; j++) {
            const lng = j * 2 * Math.PI / longs;
            const sinLng = Math.sin(lng);
            const cosLng = Math.cos(lng);

            const x = cosLng * sinLat;
            const y = cosLat;
            const z = sinLng * sinLat;

            vertices.push(radius * x, radius * y, radius * z);
            uvs.push(j / longs, i / lats);
        }
    }

    for (let i = 0; i < lats; i++) {
        for (let j = 0; j < longs; j++) {
            const first = (i * (longs + 1)) + j;
            const second = first + longs + 1;
            indices.push(first, second, first + 1);
            indices.push(second, second + 1, first + 1);
        }
    }

    return { vertices, indices, uvs };
}

function createPlane(width, height) {
    const vertices = [
        -width / 2, 0, -height / 2,
         width / 2, 0, -height / 2,
         width / 2, 0,  height / 2,
        -width / 2, 0,  height / 2,
    ];
    const uvs = [0, 0, 1, 0, 1, 1, 0, 1];
    const indices = [0, 1, 2, 0, 2, 3];
    return { vertices, uvs, indices };
}

// Create geometry
const skySphere = createSphere(1000, 32, 32);
const groundPlane = createPlane(100, 100);

// Create buffers
const skyBuffer = {
    position: gl.createBuffer(),
    uv: gl.createBuffer(),
    indices: gl.createBuffer(),
    count: skySphere.indices.length,
};

gl.bindBuffer(gl.ARRAY_BUFFER, skyBuffer.position);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(skySphere.vertices), gl.STATIC_DRAW);

gl.bindBuffer(gl.ARRAY_BUFFER, skyBuffer.uv);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(skySphere.uvs), gl.STATIC_DRAW);

gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyBuffer.indices);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(skySphere.indices), gl.STATIC_DRAW);

const groundBuffer = {
    position: gl.createBuffer(),
    uv: gl.createBuffer(),
    indices: gl.createBuffer(),
    count: groundPlane.indices.length,
};

gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer.position);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(groundPlane.vertices), gl.STATIC_DRAW);

gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer.uv);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(groundPlane.uvs), gl.STATIC_DRAW);

gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundBuffer.indices);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(groundPlane.indices), gl.STATIC_DRAW);

// Load textures
const skyTexture = loadTexture(gl, 'sky.jpeg');
const groundTexture = loadTexture(gl, 'grass.jpeg');

// Render loop
let cameraAngleX = 0;
let cameraAngleY = 0;
let cameraDistance = 5;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;

        cameraAngleX += deltaY * 0.01;
        cameraAngleY += deltaX * 0.01;

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
});

function render(now) {
    now *= 0.001;  // convert to seconds

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfView = 45 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 10000.0;
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    const viewMatrix = mat4.create();
    const cameraX = cameraDistance * Math.sin(cameraAngleY) * Math.cos(cameraAngleX);
    const cameraY = cameraDistance * Math.sin(cameraAngleX);
    const cameraZ = cameraDistance * Math.cos(cameraAngleY) * Math.cos(cameraAngleX);
    mat4.lookAt(viewMatrix, [cameraX, cameraY, cameraZ], [0, 0, 0], [0, 1, 0]);

    // Draw sky
    gl.depthMask(false);
    gl.useProgram(skyProgram);
    const viewMatrixNoTranslation = mat4.clone(viewMatrix);
    viewMatrixNoTranslation[12] = 0;
    viewMatrixNoTranslation[13] = 0;
    viewMatrixNoTranslation[14] = 0;
    const viewProjMatrix = mat4.create();
    mat4.multiply(viewProjMatrix, projectionMatrix, viewMatrixNoTranslation);
    gl.uniformMatrix4fv(skyLocations.viewProj, false, viewProjMatrix);
    gl.uniform1i(skyLocations.skyTex, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, skyTexture);
    gl.bindBuffer(gl.ARRAY_BUFFER, skyBuffer.position);
    gl.vertexAttribPointer(skyLocations.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(skyLocations.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, skyBuffer.uv);
    gl.vertexAttribPointer(skyLocations.uv, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(skyLocations.uv);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyBuffer.indices);
    gl.drawElements(gl.TRIANGLES, skyBuffer.count, gl.UNSIGNED_SHORT, 0);
    gl.depthMask(true);

    // Draw ground
    gl.useProgram(groundProgram);
    const modelMatrix = mat4.create();
    const modelViewProjMatrix = mat4.create();
    mat4.multiply(modelViewProjMatrix, projectionMatrix, viewMatrix);
    mat4.multiply(modelViewProjMatrix, modelViewProjMatrix, modelMatrix);
    gl.uniformMatrix4fv(groundLocations.modelViewProj, false, modelViewProjMatrix);
    gl.uniform1i(groundLocations.groundTex, 0);
    gl.uniform1f(groundLocations.tile, 10.0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, groundTexture);
    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer.position);
    gl.vertexAttribPointer(groundLocations.position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(groundLocations.position);
    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer.uv);
    gl.vertexAttribPointer(groundLocations.uv, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(groundLocations.uv);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundBuffer.indices);
    gl.drawElements(gl.TRIANGLES, groundBuffer.count, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
}

requestAnimationFrame(render);

