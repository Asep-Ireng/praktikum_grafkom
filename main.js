// main-fps.js - FPS Camera Version
import { createMudkipParts } from './mudkip-part.js';
import { setupMudkipAnimation } from './mudkip-animasi.js';
import { Sky } from './environment/Sky.js';
import { Ground, createPuddles } from './environment/ground.js';
import { Water } from './environment/water.js';
import { Rock } from './environment/rock.js';

function main() {
    /** @type {HTMLCanvasElement} */
    var CANVAS = document.getElementById("mycanvas");
    const dpr = window.devicePixelRatio || 1;
    CANVAS.width = window.innerWidth * dpr;
    CANVAS.height = window.innerHeight * dpr;
    CANVAS.style.width = window.innerWidth + 'px';
    CANVAS.style.height = window.innerHeight + 'px';

    /*===================== GET WEBGL CONTEXT ===================== */
    /** @type {WebGLRenderingContext} */
    var GL;
    try {
        GL = CANVAS.getContext("webgl", { 
            antialias: true,
            alpha: false,
            premultipliedAlpha: false 
        });
    } catch (e) {
        alert("WebGL context cannot be initialized");
        return false;
    }

    /*========================= SHADERS ========================= */
    var shader_vertex_source = `
        attribute vec3 position;
        attribute vec3 color;
        attribute vec3 normal;

        uniform mat4 Pmatrix;   // Projection matrix
        uniform mat4 Vmatrix;   // View matrix
        uniform mat4 Mmatrix;   // Model matrix
        uniform mat3 normalMatrix; // Inverse-transpose of Mmatrix

        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vFragPos;

        void main(void) {
            // posisi vertex di world space
            vec4 worldPos = Mmatrix * vec4(position, 1.0);
            gl_Position = Pmatrix * Vmatrix * worldPos;

            vColor = color;
            vFragPos = worldPos.xyz;

            // ubah normal ke world space & normalisasi
            vNormal = normalize(normalMatrix * normal);
        }`;

    var shader_fragment_source = `
        precision mediump float;

        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vFragPos;

        // ==========================
        //  UNIFORMS (lighting)
        // ==========================
        uniform vec3 lightDir1;   // lampu utama (key light)
        uniform vec3 lightCol1;
        uniform vec3 lightDir2;   // lampu isi (fill light)
        uniform vec3 lightCol2;

        uniform vec3 viewPos;     // posisi kamera

        // kontrol pencahayaan
        uniform float uAmbient;
        uniform float uDiffuse;
        uniform float uSpecular;
        uniform float uShininess;

        uniform vec3 hemiSky;
        uniform vec3 hemiGround;

        void main(void) {
            vec3 N = normalize(vNormal);
            vec3 V = normalize(viewPos - vFragPos);

            // key light
            vec3 L1 = normalize(-lightDir1);
            float diff1 = clamp(dot(N, L1) * 0.5 + 0.5, 0.0, 1.0);
            vec3 H1 = normalize(L1 + V);
            float spec1 = pow(max(dot(N, H1), 0.0), uShininess);

            //  fill light
            vec3 L2 = normalize(-lightDir2);
            float diff2 = clamp(dot(N, L2) * 0.5 + 0.5, 0.0, 1.0);
            vec3 H2 = normalize(L2 + V);
            float spec2 = pow(max(dot(N, H2), 0.0), uShininess);

            // komponen cahaya
            vec3 ambient  = uAmbient * vec3(1.0);
            vec3 diffuse  = uDiffuse * (diff1 * lightCol1 + 0.5 * diff2 * lightCol2);
            vec3 specular = uSpecular * (spec1 * lightCol1 + 0.5 * spec2 * lightCol2);

            vec3 lighting = ambient + diffuse + specular;
            vec3 finalColor = vColor * lighting;

            gl_FragColor = vec4(finalColor, 1.0);
        }`;

    var compile_shader = function (source, type, typeString) {
        var shader = GL.createShader(type);
        GL.shaderSource(shader, source);
        GL.compileShader(shader);
        if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
            alert("ERROR IN " + typeString + " SHADER: " + GL.getShaderInfoLog(shader));
            return false;
        }
        return shader;
    };

    var shader_vertex = compile_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");
    var shader_fragment = compile_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");

    var SHADER_PROGRAM = GL.createProgram();
    GL.attachShader(SHADER_PROGRAM, shader_vertex);
    GL.attachShader(SHADER_PROGRAM, shader_fragment);
    GL.linkProgram(SHADER_PROGRAM);

    var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
    GL.enableVertexAttribArray(_position);

    var _color = GL.getAttribLocation(SHADER_PROGRAM, "color");
    GL.enableVertexAttribArray(_color);

    var _normal = GL.getAttribLocation(SHADER_PROGRAM, "normal"); 
    GL.enableVertexAttribArray(_normal);

    var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
    var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");

    const uNormalMatrix = GL.getUniformLocation(SHADER_PROGRAM, "normalMatrix");
    const uViewPos = GL.getUniformLocation(SHADER_PROGRAM, "viewPos");

    GL.useProgram(SHADER_PROGRAM);

    const uLightDir1 = GL.getUniformLocation(SHADER_PROGRAM, "lightDir1");
    const uLightCol1 = GL.getUniformLocation(SHADER_PROGRAM, "lightCol1");
    const uLightDir2 = GL.getUniformLocation(SHADER_PROGRAM, "lightDir2");
    const uLightCol2 = GL.getUniformLocation(SHADER_PROGRAM, "lightCol2");

    const uAmbient   = GL.getUniformLocation(SHADER_PROGRAM, "uAmbient");
    const uDiffuse   = GL.getUniformLocation(SHADER_PROGRAM, "uDiffuse");
    const uSpecular  = GL.getUniformLocation(SHADER_PROGRAM, "uSpecular");
    const uShininess = GL.getUniformLocation(SHADER_PROGRAM, "uShininess");

    // set value dari light
    GL.uniform3f(uLightDir1, -0.35, 0.80, -0.55);
    GL.uniform3f(uLightCol1,  1.00, 1.00, 1.00);
    GL.uniform3f(uLightDir2,  0.40, -0.20, 0.60);
    GL.uniform3f(uLightCol2,  0.70, 0.80, 1.00);

    GL.uniform1f(uAmbient,   0.45);
    GL.uniform1f(uDiffuse,   0.70);
    GL.uniform1f(uSpecular,  0.20);
    GL.uniform1f(uShininess, 22.0);

    // MUDKIP
    const mudkip = createMudkipParts(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix);
    mudkip.CameraRig.setup();
    const anim = setupMudkipAnimation(mudkip);

    // Set Mudkip position in world (static)
    LIBSMudkip.set_I4(mudkip.MudkipRig.POSITION_MATRIX);
    // Mudkip di origin (0, 0, 0) - adjust kalau perlu
    LIBSMudkip.translateX(mudkip.MudkipRig.POSITION_MATRIX, 0);
    LIBSMudkip.translateY(mudkip.MudkipRig.POSITION_MATRIX, 0);  // Raise Mudkip above ground
    LIBSMudkip.translateZ(mudkip.MudkipRig.POSITION_MATRIX, 0);

    // MARSHTOMP

    // SKYBOX
    const sky = new Sky(GL, {
        texturePath: 'environment/skybox.jpg'
    });
    sky.setup();

    const water = new Water(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
        size: 100,              // Bigger than ground radius
        waterLevel: -2.0,       // Below ground (adjust based on ground cliff height)
        waveAmplitude: 0.58,    // Wave intensity
        segments: 64            // Smoothness
    });
    water.setup();

    // ==================== PUDDLES GENERATION ====================

    // PRESET 1: Banyak puddles kecil menyebar merata (20 puddles)
    const manySmallPuddles = createPuddles(20, 35, 12345, {
        minRadius: 0.5,
        maxRadius: 1.5,
        minDistFromCenter: 2,
        maxDistFromCenter: 35 * 0.9,
        minDistBetweenPuddles: 1.5
    });

    // PRESET 2: Sangat banyak puddles (30-40 puddles, lebih kecil dan rapat)
    const veryManyPuddles = createPuddles(35, 35, 12345, {
        minRadius: 0.4,
        maxRadius: 1.2,
        minDistFromCenter: 1.5,
        maxDistFromCenter: 35 * 0.95,
        minDistBetweenPuddles: 1.0
    });

    // PRESET 3: Sedikit puddles besar (5-8 puddles)
    const fewBigPuddles = createPuddles(6, 35, 12345, {
        minRadius: 2.0,
        maxRadius: 3.5,
        minDistFromCenter: 5,
        maxDistFromCenter: 35 * 0.8,
        minDistBetweenPuddles: 3.0
    });

    // PRESET 4: Default (seimbang, 10 puddles)
    const defaultPuddles = createPuddles(10, 35, 12345, {
        minRadius: 0.8,
        maxRadius: 2.5,
        minDistFromCenter: 3,
        minDistBetweenPuddles: 2.0
    });

    // MANUAL: Full control (tulis satu-satu)
    const manualPuddles = [
        { x: -5, z: 3, radius: 1.8 },
        { x: 6, z: -4, radius: 2.0 },
        { x: 0, z: 7, radius: 1.5 },
        { x: -8, z: -6, radius: 1.2 },
        { x: 3, z: -2, radius: 1.0 },
        { x: -2, z: 8, radius: 1.6 }
    ];

    // ========== PILIH PUDDLES YANG MAU DIPAKAI ==========
    const puddlesToUse = manySmallPuddles; // Ganti sesuai keinginan

    const ground = new Ground(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
        radius: 35,
        cliffHeight: 1.5,
        segments: 64,
        noiseAmplitude: 0.05,
        puddles: puddlesToUse
    });
    ground.setup();

    const rocks = new Rock(GL, SHADER_PROGRAM, _position, _color, _normal, _Mmatrix, {
        groundRadius: 35,
        numClusters: 3,
        numScattered: 5,
        puddles: puddlesToUse  // Use same puddles for rock avoidance
    });
    rocks.setup();


    /*========================= FPS CAMERA SETUP ========================= */
    // Camera position and orientation
    let cameraPosition = [0, 3, 15];      // Start position (higher Y, looking at Mudkip)
    let cameraFront = [0, 0, -1];         // Looking direction (forward = -Z)
    let cameraUp = [0, 1, 0];             // Up vector (Y-up)
    let cameraSpeed = 0.15;               // Movement speed

    // Mouse look variables
    let yaw = -90.0;       // Horizontal rotation (degrees)
    let pitch = 0.0;       // Vertical rotation (degrees)
    let mouseSensitivity = 0.2;

    // Keyboard input tracking
    const keys = {};

    // Mouse drag state
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    /*========================= MATRICES ========================= */
    var PROJMATRIX = LIBSMudkip.get_projection(40, CANVAS.width / CANVAS.height, 0.1, 800);

    /*========================= MOUSE DRAG CONTROLS ========================= */
    CANVAS.addEventListener('mousedown', function(e) {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        CANVAS.style.cursor = 'grabbing';
    });

    CANVAS.addEventListener('mouseup', function() {
        isDragging = false;
        CANVAS.style.cursor = 'grab';
    });

    CANVAS.addEventListener('mouseleave', function() {
        isDragging = false;
        CANVAS.style.cursor = 'grab';
    });

    CANVAS.addEventListener('mousemove', function(e) {
        if (!isDragging) return;

        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;

        yaw += deltaX * mouseSensitivity;
        pitch -= deltaY * mouseSensitivity;

        // Clamp pitch to prevent camera flip
        pitch = Math.max(-89, Math.min(89, pitch));

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;

        updateCameraFront();
    });

    // Set initial cursor
    CANVAS.style.cursor = 'grab';

    /*========================= KEYBOARD CONTROLS ========================= */
    window.addEventListener('keydown', function(e) {
        keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', function(e) {
        keys[e.key.toLowerCase()] = false;
    });

    /*========================= CAMERA UPDATE FUNCTIONS ========================= */
    function updateCameraFront() {
        // Convert yaw/pitch to direction vector
        const yawRad = yaw * Math.PI / 180;
        const pitchRad = pitch * Math.PI / 180;

        cameraFront[0] = Math.cos(yawRad) * Math.cos(pitchRad);
        cameraFront[1] = Math.sin(pitchRad);
        cameraFront[2] = Math.sin(yawRad) * Math.cos(pitchRad);

        // Normalize
        const normalized = LIBSMudkip.normalize(cameraFront);
        cameraFront[0] = normalized[0];
        cameraFront[1] = normalized[1];
        cameraFront[2] = normalized[2];
    }

    function updateFPSCamera() {
        const speed = cameraSpeed;

        // W - Forward
        if (keys['w']) {
            cameraPosition[0] += cameraFront[0] * speed;
            cameraPosition[1] += cameraFront[1] * speed;
            cameraPosition[2] += cameraFront[2] * speed;
        }

        // S - Backward
        if (keys['s']) {
            cameraPosition[0] -= cameraFront[0] * speed;
            cameraPosition[1] -= cameraFront[1] * speed;
            cameraPosition[2] -= cameraFront[2] * speed;
        }

        // A - Strafe Left
        if (keys['a']) {
            const right = LIBSMudkip.cross(cameraFront, cameraUp);
            const normalized = LIBSMudkip.normalize(right);
            cameraPosition[0] -= normalized[0] * speed;
            cameraPosition[1] -= normalized[1] * speed;
            cameraPosition[2] -= normalized[2] * speed;
        }

        // D - Strafe Right
        if (keys['d']) {
            const right = LIBSMudkip.cross(cameraFront, cameraUp);
            const normalized = LIBSMudkip.normalize(right);
            cameraPosition[0] += normalized[0] * speed;
            cameraPosition[1] += normalized[1] * speed;
            cameraPosition[2] += normalized[2] * speed;
        }

        // Space - Move Up
        if (keys[' ']) {
            cameraPosition[1] += speed;
        }

        // Shift - Move Down
        if (keys['shift']) {
            cameraPosition[1] -= speed;
        }
    }

    /*========================= WINDOW RESIZE ========================= */
    window.addEventListener('resize', function() {
        CANVAS.width = window.innerWidth * dpr;
        CANVAS.height = window.innerHeight * dpr;
        CANVAS.style.width = window.innerWidth + 'px';
        CANVAS.style.height = window.innerHeight + 'px';

        PROJMATRIX = LIBSMudkip.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    });

    /*========================= DRAWING ========================= */
    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearColor(0.5, 0.5, 0.5, 1.0);
    GL.clearDepth(1.0);

    // Initialize camera front vector
    updateCameraFront();

    var animate = function (time) {
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

        // Update FPS camera position
        updateFPSCamera();

        // Create lookAt view matrix
        const lookAtPoint = [
            cameraPosition[0] + cameraFront[0],
            cameraPosition[1] + cameraFront[1],
            cameraPosition[2] + cameraFront[2]
        ];
        const viewMatrix = LIBSMudkip.lookAt(cameraPosition, lookAtPoint, cameraUp);

        // Update Mudkip animations
        anim.update(time);
        anim.updateTail(time);
        anim.updateFin(time);
        anim.applyAnimation();

        // Render skybox (background)
        sky.render(PROJMATRIX, viewMatrix, LIBSMudkip.get_I4());
        ground.render(LIBSMudkip.get_I4());
        rocks.render(LIBSMudkip.get_I4());

        water.updateWaves(time);  // Animate waves
        water.render(LIBSMudkip.get_I4());

        // Render Mudkip (foreground)
        GL.useProgram(SHADER_PROGRAM);
        GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(_Vmatrix, false, viewMatrix);

        // Update view position for lighting
        GL.uniform3f(uViewPos, cameraPosition[0], cameraPosition[1], cameraPosition[2]);

        mudkip.CameraRig.render(LIBSMudkip.get_I4());

        GL.flush();
        window.requestAnimationFrame(animate);
    };

    animate(0);

    console.log('Hybrid Camera Controls:');
    console.log('WASD: Move camera position');
    console.log('Click & Drag: Look around (rotate view)');
    console.log('Space: Move up');
    console.log('Shift: Move down');
}

window.addEventListener('load', main);