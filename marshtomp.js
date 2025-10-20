// --- FUNGSI UNTUK MEMBUAT GEOMETRI CYLINDER/DISK ---
function generateCylinder(radius, height, segments) {
    const vertices = [];
    const normals = [];
    const indices = [];
    let vertexIndex = 0;

    // Sisi Atas (Top Cap)
    vertices.push(0, height / 2, 0); // Titik tengah atas
    normals.push(0, 1, 0);
    vertexIndex++;
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        vertices.push(x, height / 2, z);
        normals.push(0, 1, 0);
        vertexIndex++;
    }
    for (let i = 0; i < segments; i++) {
        indices.push(0, i + 1, i + 2);
    }

    // Sisi Bawah (Bottom Cap)
    const bottomCenterIndex = vertexIndex;
    vertices.push(0, -height / 2, 0); // Titik tengah bawah
    normals.push(0, -1, 0);
    vertexIndex++;
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        vertices.push(x, -height / 2, z);
        normals.push(0, -1, 0);
        vertexIndex++;
    }
    for (let i = 0; i < segments; i++) {
        indices.push(bottomCenterIndex, bottomCenterIndex + i + 2, bottomCenterIndex + i + 1);
    }
    return { vertices, normals, indices };
}

// --- FUNGSI UNTUK MEMBUAT GEOMETRI ELLIPSOID ---
// Dimodifikasi untuk menghasilkan vertices, normals, dan indices secara terpisah
function generateSphere(a, b, c, stacks, sectors) {
    var vertices = [];
    var normals = [];
    var indices = [];

    for (var i = 0; i <= stacks; i++) {
        var u = i / stacks * Math.PI - (Math.PI / 2); // Latitude
        for (var j = 0; j <= sectors; j++) {
            var v = j / sectors * 2 * Math.PI - Math.PI; // Longitude

            // Posisi vertex
            var x = a * Math.cos(v) * Math.cos(u);
            var y = b * Math.sin(u);
            var z = c * Math.sin(v) * Math.cos(u);
            vertices.push(x, y, z);

            // Normal untuk ellipsoid (penting untuk pencahayaan)
            var nx = x / (a * a);
            var ny = y / (b * b);
            var nz = z / (c * c);
            var len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            normals.push(nx / len, ny / len, nz / len);
        }
    }

    // Indices (faces)
    for (var i = 0; i < stacks; i++) {
        for (var j = 0; j < sectors; j++) {
            var first = i * (sectors + 1) + j;
            var second = first + 1;
            var third = first + (sectors + 1);
            var fourth = third + 1;
            indices.push(first, second, fourth);
            indices.push(first, fourth, third);
        }
    }
    return { vertices, normals, indices };
}

// --- FUNGSI UNTUK MEMBUAT GEOMETRI CONE ---
// Dimodifikasi agar lebih ringkas dan benar
function generateCone(radius, height, segments) {
    const vertices = [];
    const normals = [];
    const indices = [];

    // Titik puncak (apex)
    vertices.push(0, height, 0);
    normals.push(0, 1, 0);

    // Titik tengah alas
    vertices.push(0, 0, 0);
    normals.push(0, -1, 0);

    // Titik-titik di sekeliling alas
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        vertices.push(x, 0, z);
        
        // Normal untuk sisi cone
        const normal = [height * x, radius * radius, height * z];
        const len = Math.sqrt(normal[0]**2 + normal[1]**2 + normal[2]**2);
        normals.push(normal[0]/len, normal[1]/len, normal[2]/len);
    }
    
    // Indices untuk sisi cone (dari puncak ke alas)
    for (let i = 0; i < segments; i++) {
        indices.push(0, 2 + i, 2 + i + 1);
    }
    return { vertices, normals, indices };
}

// --- FUNGSI UTAMA ---
function main() {
    /** @type {HTMLCanvasElement} */
    var CANVAS = document.getElementById("mycanvas");
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;

    var GL;
    try {
        GL = CANVAS.getContext("webgl", { antialias: true });
    } catch (e) { alert("WebGL context cannot be initialized"); return false; }

    /*========================= SHADERS ========================= */
    var shader_vertex_source = `
        attribute vec3 position;
        attribute vec3 normal;
        uniform mat4 Pmatrix, Vmatrix, Mmatrix, Nmatrix;
        varying vec3 v_normal, v_surfaceToLight, v_surfaceToView;
        uniform vec3 u_lightPosition, u_cameraPosition;

        void main(void) {
            vec3 worldPosition = (Mmatrix * vec4(position, 1.0)).xyz;
            gl_Position = Pmatrix * Vmatrix * vec4(worldPosition, 1.0);
            v_normal = (Nmatrix * vec4(normal, 0.0)).xyz;
            v_surfaceToLight = u_lightPosition - worldPosition;
            v_surfaceToView = u_cameraPosition - worldPosition;
        }`;

    var shader_fragment_source = `
        precision mediump float;
        varying vec3 v_normal, v_surfaceToLight, v_surfaceToView;
        uniform vec4 u_color;
        uniform float u_shininess;

        void main(void) {
            vec3 normal = normalize(v_normal);
            vec3 surfaceToLight = normalize(v_surfaceToLight);
            vec3 surfaceToView = normalize(v_surfaceToView);
            vec3 halfVector = normalize(surfaceToLight + surfaceToView);
            
            float diffuseBrightness = max(dot(normal, surfaceToLight), 0.0);
            vec3 diffuse = u_color.rgb * diffuseBrightness;
            
            float specularBrightness = pow(max(dot(normal, halfVector), 0.0), u_shininess);
            vec3 specular = vec3(0.8, 0.8, 0.8) * specularBrightness;

            vec3 ambient = vec3(0.2, 0.2, 0.2) * u_color.rgb;
            
            gl_FragColor = vec4(ambient + diffuse + specular, u_color.a);
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

    // --- LOKASI ATTRIBUTE & UNIFORM ---
    var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
    var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
    var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");
    var _Nmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Nmatrix");
    var _u_color = GL.getUniformLocation(SHADER_PROGRAM, "u_color");
    var _shininess = GL.getUniformLocation(SHADER_PROGRAM, "u_shininess");
    var _lightPosition = GL.getUniformLocation(SHADER_PROGRAM, "u_lightPosition");
    var _cameraPosition = GL.getUniformLocation(SHADER_PROGRAM, "u_cameraPosition");
    var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
    var _normal = GL.getAttribLocation(SHADER_PROGRAM, "normal");
    
    GL.enableVertexAttribArray(_position);
    GL.enableVertexAttribArray(_normal);
    GL.useProgram(SHADER_PROGRAM);

    /*======================== MEMBUAT GEOMETRI ======================== */
    const kepala = generateSphere(1.0, 0.8, 0.7, 50, 50);
    const pipi = generateCone(0.2, 1.2, 20);
    const alasPipi = generateSphere(0.3, 0.02, 0.3, 30, 30); 

    // --- BUFFERS UNTUK KEPALA ---
    var KEPALA_VERTEX_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, KEPALA_VERTEX_BUFFER);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(kepala.vertices), GL.STATIC_DRAW);
    var KEPALA_NORMAL_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, KEPALA_NORMAL_BUFFER);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(kepala.normals), GL.STATIC_DRAW);
    var KEPALA_FACES_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, KEPALA_FACES_BUFFER);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(kepala.indices), GL.STATIC_DRAW);

    // --- BUFFERS UNTUK PIPI ---
    var PIPI_VERTEX_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, PIPI_VERTEX_BUFFER);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(pipi.vertices), GL.STATIC_DRAW);
    var PIPI_NORMAL_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, PIPI_NORMAL_BUFFER);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(pipi.normals), GL.STATIC_DRAW);
    var PIPI_FACES_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, PIPI_FACES_BUFFER);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(pipi.indices), GL.STATIC_DRAW);

    // --- BUFFERS UNTUK ALAS PIPI ---
    var ALAS_PIPI_VERTEX_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, ALAS_PIPI_VERTEX_BUFFER);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(alasPipi.vertices), GL.STATIC_DRAW);

    var ALAS_PIPI_NORMAL_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ARRAY_BUFFER, ALAS_PIPI_NORMAL_BUFFER);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array(alasPipi.normals), GL.STATIC_DRAW);

    var ALAS_PIPI_FACES_BUFFER = GL.createBuffer();
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, ALAS_PIPI_FACES_BUFFER);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, new Uint16Array(alasPipi.indices), GL.STATIC_DRAW);

    /*======================== PENGATURAN MATRIKS DAN KAMERA ======================== */
    var PROJMATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    var MOVEMATRIX_KEPALA = LIBS.get_I4();
    var VIEWMATRIX = LIBS.get_I4();
    const cameraPosition = [0, 0, 8];
    LIBS.translateZ(VIEWMATRIX, -cameraPosition[2]);

    /*========================= KONTROL DAN INTERAKSI ========================= */
    var THETA = 0, PHI = 0;
    var drag = false;
    var x_prev, y_prev;
    var dX = 0, dY = 0;
    var mouseDown = function(e){drag=true; x_prev=e.pageX, y_prev=e.pageY; e.preventDefault(); return false;};
    var mouseUp = function(e){drag=false;};
    var mouseMove = function(e){if(!drag){return false;} dX=(e.pageX-x_prev)*2*Math.PI/CANVAS.width, dY=(e.pageY-y_prev)*2*Math.PI/CANVAS.height; THETA+=dX; PHI+=dY; x_prev=e.pageX, y_prev=e.pageY; e.preventDefault();};
    CANVAS.addEventListener("mousedown", mouseDown, false);
    CANVAS.addEventListener("mouseup", mouseUp, false);
    CANVAS.addEventListener("mouseout", mouseUp, false);
    CANVAS.addEventListener("mousemove", mouseMove, false);

    /*========================= DRAWING ========================= */
    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);
    GL.clearColor(0.1, 0.15, 0.2, 1.0);
    GL.clearDepth(1.0);

    var animate = function (time) {
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);

        if (!drag) {
            dX *= 0.95; dY *= 0.95;
            THETA += dX; PHI += dY;
        }

        GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
        GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);
        GL.uniform3fv(_lightPosition, [5.0, 5.0, 8.0]);
        GL.uniform3fv(_cameraPosition, cameraPosition);

        // --- 1. GAMBAR KEPALA (PARENT) ---
        var MOVEMATRIX_KEPALA = LIBS.get_I4();
        LIBS.rotateY(MOVEMATRIX_KEPALA, THETA);
        LIBS.rotateX(MOVEMATRIX_KEPALA, PHI);
        GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX_KEPALA);

        var NORMALMATRIX_KEPALA = LIBS.get_I4();
        LIBS.rotateY(NORMALMATRIX_KEPALA, THETA);
        LIBS.rotateX(NORMALMATRIX_KEPALA, PHI);
        GL.uniformMatrix4fv(_Nmatrix, false, NORMALMATRIX_KEPALA);
        
        GL.uniform4f(_u_color, 85/255, 185/255, 235/255, 1.0);
        GL.uniform1f(_shininess, 30.0);

        GL.bindBuffer(GL.ARRAY_BUFFER, KEPALA_VERTEX_BUFFER);
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 0, 0);
        GL.bindBuffer(GL.ARRAY_BUFFER, KEPALA_NORMAL_BUFFER);
        GL.vertexAttribPointer(_normal, 3, GL.FLOAT, false, 0, 0);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, KEPALA_FACES_BUFFER);
        GL.drawElements(GL.TRIANGLES, kepala.indices.length, GL.UNSIGNED_SHORT, 0);

        // --- Atur warna kuning/oranye untuk semua bagian pipi ---
        GL.uniform4f(_u_color, 255/255, 223/255, 0/255, 1.0); // Warna kuning cerah

        // =======================================================
        // --- 2. GAMBAR BAGIAN PIPI KANAN (ALAS + CONE) ---
        // =======================================================

        // A. GAMBAR ALAS PIPI KANAN
        var localMatrixAlasKanan = LIBS.get_I4();
        LIBS.translateX(localMatrixAlasKanan, 0.95);
        LIBS.rotateZ(localMatrixAlasKanan, LIBS.degToRad(-90)); // Miringkan agar pas di permukaan
        
        var MOVEMATRIX_ALAS_KANAN = LIBS.multiply(MOVEMATRIX_KEPALA, localMatrixAlasKanan);
        GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX_ALAS_KANAN);

        var localNormalAlasKanan = LIBS.get_I4();
        LIBS.rotateZ(localNormalAlasKanan, LIBS.degToRad(-15));
        var NORMALMATRIX_ALAS_KANAN = LIBS.multiply(NORMALMATRIX_KEPALA, localNormalAlasKanan);
        GL.uniformMatrix4fv(_Nmatrix, false, NORMALMATRIX_ALAS_KANAN);
        
        GL.uniform1f(_shininess, 5.0); // Alas tidak terlalu berkilau

        GL.bindBuffer(GL.ARRAY_BUFFER, ALAS_PIPI_VERTEX_BUFFER);
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 0, 0);
        GL.bindBuffer(GL.ARRAY_BUFFER, ALAS_PIPI_NORMAL_BUFFER);
        GL.vertexAttribPointer(_normal, 3, GL.FLOAT, false, 0, 0);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, ALAS_PIPI_FACES_BUFFER);
        GL.drawElements(GL.TRIANGLES, alasPipi.indices.length, GL.UNSIGNED_SHORT, 0);
        
        // B. GAMBAR CONE PIPI KANAN
        // var localMatrixPipiKanan = LIBS.get_I4();
        // LIBS.translateX(localMatrixPipiKanan, 0.8);
        // LIBS.rotateZ(localMatrixPipiKanan, LIBS.degToRad(-90));
        
        // var MOVEMATRIX_PIPI_KANAN = LIBS.multiply(MOVEMATRIX_KEPALA, localMatrixPipiKanan);
        // GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX_PIPI_KANAN);

        // var localNormalPipiKanan = LIBS.get_I4();
        // LIBS.rotateZ(localNormalPipiKanan, LIBS.degToRad(-90));
        // var NORMALMATRIX_PIPI_KANAN = LIBS.multiply(NORMALMATRIX_KEPALA, localNormalPipiKanan);
        // GL.uniformMatrix4fv(_Nmatrix, false, NORMALMATRIX_PIPI_KANAN);
        
        // GL.uniform1f(_shininess, 10.0);

        // GL.bindBuffer(GL.ARRAY_BUFFER, PIPI_VERTEX_BUFFER);
        // GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 0, 0);
        // GL.bindBuffer(GL.ARRAY_BUFFER, PIPI_NORMAL_BUFFER);
        // GL.vertexAttribPointer(_normal, 3, GL.FLOAT, false, 0, 0);
        // GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, PIPI_FACES_BUFFER);
        // GL.drawElements(GL.TRIANGLES, pipi.indices.length, GL.UNSIGNED_SHORT, 0);

        // =======================================================
        // --- 3. GAMBAR BAGIAN PIPI KIRI (ALAS + CONE) ---
        // =======================================================

        // A. GAMBAR ALAS PIPI KIRI
        var localMatrixAlasKiri = LIBS.get_I4();
        LIBS.translateX(localMatrixAlasKiri, -0.8);
        LIBS.rotateZ(localMatrixAlasKiri, LIBS.degToRad(15));
        
        var MOVEMATRIX_ALAS_KIRI = LIBS.multiply(MOVEMATRIX_KEPALA, localMatrixAlasKiri);
        GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX_ALAS_KIRI);

        var localNormalAlasKiri = LIBS.get_I4();
        LIBS.rotateZ(localNormalAlasKiri, LIBS.degToRad(15));
        var NORMALMATRIX_ALAS_KIRI = LIBS.multiply(NORMALMATRIX_KEPALA, localNormalAlasKiri);
        GL.uniformMatrix4fv(_Nmatrix, false, NORMALMATRIX_ALAS_KIRI);
        
        GL.uniform1f(_shininess, 5.0);

        GL.bindBuffer(GL.ARRAY_BUFFER, ALAS_PIPI_VERTEX_BUFFER);
        GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 0, 0);
        GL.bindBuffer(GL.ARRAY_BUFFER, ALAS_PIPI_NORMAL_BUFFER);
        GL.vertexAttribPointer(_normal, 3, GL.FLOAT, false, 0, 0);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, ALAS_PIPI_FACES_BUFFER);
        GL.drawElements(GL.TRIANGLES, alasPipi.indices.length, GL.UNSIGNED_SHORT, 0);

        // B. GAMBAR CONE PIPI KIRI
        // var localMatrixPipiKiri = LIBS.get_I4();
        // LIBS.translateX(localMatrixPipiKiri, -0.8);
        // LIBS.rotateZ(localMatrixPipiKiri, LIBS.degToRad(90));
        
        // var MOVEMATRIX_PIPI_KIRI = LIBS.multiply(MOVEMATRIX_KEPALA, localMatrixPipiKiri);
        // GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX_PIPI_KIRI);
        
        // var localNormalPipiKiri = LIBS.get_I4();
        // LIBS.rotateZ(localNormalPipiKiri, LIBS.degToRad(90));
        // var NORMALMATRIX_PIPI_KIRI = LIBS.multiply(NORMALMATRIX_KEPALA, localNormalPipiKiri);
        // GL.uniformMatrix4fv(_Nmatrix, false, NORMALMATRIX_PIPI_KIRI);
        
        // GL.uniform1f(_shininess, 10.0);
        
        // GL.bindBuffer(GL.ARRAY_BUFFER, PIPI_VERTEX_BUFFER);
        // GL.vertexAttribPointer(_position, 3, GL.FLOAT, false, 0, 0);
        // GL.bindBuffer(GL.ARRAY_BUFFER, PIPI_NORMAL_BUFFER);
        // GL.vertexAttribPointer(_normal, 3, GL.FLOAT, false, 0, 0);
        // GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, PIPI_FACES_BUFFER);
        // GL.drawElements(GL.TRIANGLES, pipi.indices.length, GL.UNSIGNED_SHORT, 0);

        GL.flush();
        window.requestAnimationFrame(animate);
    };
    animate(0);
};
window.addEventListener('load', main);