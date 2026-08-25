const VERTEX_DATA_TYPE = 0;
const VERTEX_DATA_SIDE = 1;
const VERTEX_DATA_LIGHT = 2;
const VERTEX_DATA_COLOUR = 3;

export default {
  VERTEX_DATA_TYPE,
  VERTEX_DATA_SIDE,
  // Continuous per-vertex light 0..1 (sky light × face brightness × AO).
  // Unlike the other components it must not be quantised: the vertex
  // shader passes it through unmodified so it interpolates smoothly.
  VERTEX_DATA_LIGHT,
  VERTEX_DATA_COLOUR,
};
