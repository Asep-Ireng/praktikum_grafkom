// environment.js - Environment Orchestrator
import { Sky } from './sky.js';
import { Ground } from './ground.js';
import { Rocks } from './rocks.js';
import { Fountain } from './fountain.js';

export class Environment {
  GL = null;
  SHADER_PROGRAM = null;
  _position = null;
  _color = null;
  _MMatrix = null;

  POSITION_MATRIX = LIBS.get_I4();
  MOVE_MATRIX = LIBS.get_I4();

  childs = [];

  // Components
  sky = null;
  ground = null;
  rocks = null;
  fountain = null;

  /**
   * @param {WebGLRenderingContext} GL
   * @param {WebGLProgram} SHADER_PROGRAM
   * @param {GLuint} _position
   * @param {GLuint} _color
   * @param {WebGLUniformLocation} _Mmatrix
   * @param {Object} opts - configuration untuk semua components
   */
  constructor(GL, SHADER_PROGRAM, _position, _color, _Mmatrix, opts = {}) {
    this.GL = GL;
    this.SHADER_PROGRAM = SHADER_PROGRAM;
    this._position = _position;
    this._color = _color;
    this._MMatrix = _Mmatrix;

    // === CREATE SKY ===
    this.sky = new Sky(GL, SHADER_PROGRAM, _position, _color, _Mmatrix, {
      topColor: opts.skyTopColor || [135/255, 206/255, 250/255],
      bottomColor: opts.skyBottomColor || [200/255, 230/255, 255/255],
      size: opts.skySize || 50,
      segments: 24,
      rings: 16,
    });

    // === CREATE GROUND ===
    this.ground = new Ground(GL, SHADER_PROGRAM, _position, _color, _Mmatrix, {
      size: opts.groundSize || 100,
      segments: opts.groundSegments || 50,
      muddyColor: opts.muddyColor || [0.45, 0.35, 0.25],
      puddleColor: opts.puddleColor || [0.25, 0.4, 0.55],
      heightVariation: opts.heightVariation || 0.5,
      puddleCount: opts.puddleCount || 12,
    });

    // Position ground (sedikit ke bawah)
    LIBS.translateY(this.ground.POSITION_MATRIX, -2);

    // === CREATE ROCKS ===
    this.rocks = new Rocks(GL, SHADER_PROGRAM, _position, _color, _Mmatrix, {
      count: opts.rockCount || 20,
      sizeRange: opts.rockSizeRange || [0.5, 2.5],
      spreadArea: opts.rockSpreadArea || 80,
      color: opts.rockColor || [0.45, 0.45, 0.45],
      colorVariation: 0.15,
      segments: 12,
      rings: 10,
    });

    // Position rocks (on ground)
    LIBS.translateY(this.rocks.POSITION_MATRIX, -1.5);

    // === CREATE FOUNTAIN (optional) ===
    if (opts.enableFountain !== false) {
      this.fountain = new Fountain(GL, SHADER_PROGRAM, _position, _color, _Mmatrix, {
        height: opts.fountainHeight || 8,
        width: opts.fountainWidth || 2,
        segments: 20,
        waterColor: opts.waterColor || [0.2, 0.5, 0.8],
        flowSpeed: opts.flowSpeed || 1.0,
      });

      // Position fountain (di salah satu sisi)
      LIBS.translateX(this.fountain.POSITION_MATRIX, opts.fountainX || 15);
      LIBS.translateY(this.fountain.POSITION_MATRIX, opts.fountainY || 3);
      LIBS.translateZ(this.fountain.POSITION_MATRIX, opts.fountainZ || -10);
    }

    // Add all to childs
    this.childs.push(this.sky);
    this.childs.push(this.ground);
    this.childs.push(this.rocks);
    if (this.fountain) {
      this.childs.push(this.fountain);
    }
  }

  // Update animation (call dari main loop)
  update(deltaTime) {
    if (this.fountain) {
      this.fountain.updateAnimation(deltaTime);
    }
  }

  setup() {
    this.childs.forEach(child => child.setup());
  }

  render(PARENT_MATRIX) {
    const M = LIBS.get_I4();
    LIBS.mul(M, PARENT_MATRIX, this.POSITION_MATRIX);
    LIBS.mul(M, M, this.MOVE_MATRIX);
    this.MODEL_MATRIX = M;

    // Render sky first (background)
    if (this.sky) {
      this.sky.render(M);
    }

    // Then ground
    if (this.ground) {
      this.ground.render(M);
    }

    // Then rocks
    if (this.rocks) {
      this.rocks.render(M);
    }

    // Finally fountain (dengan blending)
    if (this.fountain) {
      this.fountain.render(M);
    }
  }
}