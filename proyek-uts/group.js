export class group {
  constructor(_Mmatrix){
    this._MMatrix = _Mmatrix;         
    this.POSITION_MATRIX = LIBS.get_I4();
    this.MOVE_MATRIX     = LIBS.get_I4();
    this.childs = [];
  }
  setup(){ this.childs.forEach(c => c.setup()); }
  render(PARENT_MATRIX){
    const M = LIBS.get_I4();
    LIBS.mul(M, PARENT_MATRIX, this.POSITION_MATRIX);
    LIBS.mul(M, M, this.MOVE_MATRIX);
    this.childs.forEach(c => c.render(M)); 
  }
}