function main() {
    /** @type {HTMLCanvasElement} */
    var CANVAS = document.getElementById("mycanvas");
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    /*===================== GET WEBGL CONTEXT ===================== */
    /** @type {WebGLRenderingContext} */
    var GL;
    try {
        GL = CANVAS.getContext("webgl", { antialias: true });
    } catch (e) {
        alert("WebGL context cannot be initialized");
        return false;
    }

    /*========================= SHADERS ========================= */
    var shader_vertex_source = `
        attribute vec3 position;
        attribute vec2 uv; // Texture coordinates from buffer
        uniform mat4 Pmatrix, Vmatrix, Mmatrix;
        varying vec2 vUV; // Pass texture coordinates to fragment shader

        void main(void) {
            gl_Position = Pmatrix * Vmatrix * Mmatrix * vec4(position, 1.);
            vUV = uv;
        }`;

    var shader_fragment_source = `
        precision mediump float;
        uniform sampler2D sampler;
        varying vec2 vUV; // Receive texture coordinates from vertex shader

        void main(void) {
            gl_FragColor = texture2D(sampler, vUV);
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

    // --- FIX 1: Removed unused 'color' attribute ---
    // The shader doesn't use a 'color' attribute, so getting its location and enabling it was unnecessary.
    var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
    var _uv = GL.getAttribLocation(SHADER_PROGRAM, "uv");

    GL.enableVertexAttribArray(_position);
    GL.enableVertexAttribArray(_uv);

    GL.useProgram(SHADER_PROGRAM);

    var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
    var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");
    var _sampler = GL.getUniformLocation(SHADER_PROGRAM, "sampler");

    GL.uniform1i(_sampler, 0); // Tell the shader to use texture unit 0.

    /*======================== THE CUBE ======================== */
    // Vertex data: 3 for position (x,y,z), 2 for texture coordinates (u,v)
    var cube_vertex = [
        -1,-1,-1,    0,0,
         1,-1,-1,    1,0,
         1, 1,-1,    1,1,
        -1, 1,-1,    0,1,

        -1,-1, 1,    0,0,
         1,-1, 1,    1,0,
         1, 1, 1,    1,1,
        -1, 1, 1,    0,1,

        -1,-1,-1,    0,0,
        -1, 1,-1,    1,0,
        -1, 1, 1,    1,1,
        -1,-1, 1,    0,1,

         1,-1,-1,    0,0,
         1, 1,-1,    1,0,
         1, 1, 1,    1,1,
         1,-1, 1,    0,1,

        -1,-1,-1,    0,0,
        -1,-1, 1,    1,0,
         1,-1, 1,    1,1,
         1,-1,-1,    0,1,

        -1, 1,-1,    0,0,
        -1, 1, 1,    1,0,
         1, 1, 1,    1,1,
         1, 1,-1,    0,1
    ];

    var cube_faces = [
        0, 1, 2,   0, 2, 3,
        4, 5, 6,   4, 6, 7,
        8, 9,10,   8,10,11,
        12,13,14,  12,14,15,
        16,17,18,  16,18,19,
        20,21,22,  20,22,23
    ];

    var CUBE_VERTEX = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(cube_vertex), GL.STATIC_DRAW);

    var CUBE_FACES = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(cube_faces), GL.STATIC_DRAW);

    /*========================= MATRIX & TRANSFORMATIONS ========================= */
    var PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    var MOVEMATRIX = LIBS.get_I4();
    var VIEWMATRIX = LIBS.get_I4();

    LIBS.translateZ(VIEWMATRIX, -6);

    /*========================= INTERACTIVITY ========================= */
    var THETA = 0, PHI = 0;
    var drag = false;
    var x_prev, y_prev;
    var FRICTION = 0.05;
    var dX = 0, dY = 0;

    var mouseDown = function (e) {
        drag = true;
        x_prev = e.pageX;
        y_prev = e.pageY;
        e.preventDefault();
        return false;
    };

    var mouseUp = function (e) {
        drag = false;
    };

    var mouseMove = function (e) {
        if (!drag) return false;
        dX = (e.pageX - x_prev) * 2 * Math.PI / CANVAS.width;
        dY = (e.pageY - y_prev) * 2 * Math.PI / CANVAS.height;
        THETA += dX;
        PHI += dY;
        x_prev = e.pageX;
        y_prev = e.pageY;
        e.preventDefault();
    };

    CANVAS.addEventListener("mousedown", mouseDown, false);
    CANVAS.addEventListener("mouseup", mouseUp, false);
    CANVAS.addEventListener("mouseout", mouseUp, false);
    CANVAS.addEventListener("mousemove", mouseMove, false);
    
    var SPEED = 0.05;
    var keyDown = function (e) {
        if (e.key === 'w') {
            dY -= SPEED;
        } else if (e.key === 's') {
            dY += SPEED;
        } else if (e.key === 'a') {
            dX -= SPEED;
        } else if (e.key === 'd') {
            dX += SPEED;
        }
    };
    window.addEventListener("keydown", keyDown, false);

    /*========================= TEXTURES =========================*/
    var load_texture = function (image_URL) {
        var texture = GL.createTexture();
        var image = new Image();
        image.src = image_URL;
        image.onload = function () {
            GL.bindTexture(GL.TEXTURE_2D, texture);
            GL.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, true);
            GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, image);
            GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
            GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
            GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
            GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
            GL.bindTexture(GL.TEXTURE_2D, null);
        };
        return texture;
    };

    var cube_texture = load_texture("texture.png");

    /*========================= DRAWING ========================= */
    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearColor(0.0, 0.0, 0.0, 1.0);
    GL.clearDepth(1.0);

    var animate = function (time) {
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT); // Clear both color and depth

        // Update model matrix for rotation
        LIBS.set_I4(MOVEMATRIX);
        LIBS.rotateY(MOVEMATRIX, THETA);
        LIBS.rotateX(MOVEMATRIX, PHI);

        // Apply friction for smooth stop
        if (!drag) {
            dX *= (1 - FRICTION);
            dY *= (1 - FRICTION);
            THETA += dX;
            PHI += dY;
        }

        // Send matrices to the shader
        GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);
        GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX);

        // Activate texture
        GL.activeTexture(GL.TEXTURE0);
        GL.bindTexture(GL.TEXTURE_2D, cube_texture);
        
        // --- FIX 2: Correctly configure and bind vertex attributes ---
        // There was a duplicated, incorrect block of code here that tried to use the 'color' attribute.
        // This is the single, correct way to set up the vertex buffer for this shader.
        GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);

        // Configure the 'position' attribute
        // Stride is 20 bytes: (3 position floats + 2 uv floats) * 4 bytes/float
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 4 * (3 + 2), 0);
        
        // Configure the 'uv' attribute
        // Offset is 12 bytes: 3 position floats * 4 bytes/float
        GL.vertexAttribPointer(_uv, 2, GL.FLOAT, false, 4 * (3 + 2), 4 * 3);

        // Bind the index buffer
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
        
        // Draw the cube
        GL.drawElements(GL.TRIANGLES, cube_faces.length, GL.UNSIGNED_SHORT, 0);

        GL.flush();
        window.requestAnimationFrame(animate);
    };
    
    // --- FIX 3: Removed premature draw call ---
    // The original code had a GL.drawElements call here, outside the animation loop.
    // All drawing must happen inside the `animate` function.
    animate(0);
}
window.addEventListener('load', main);