uniform sampler2D grass[4];
uniform sampler2D info;

uniform vec3 ambientLightColor;

uniform vec3 pointLightColor[MAX_POINT_LIGHTS];
uniform vec3 pointLightPosition[MAX_POINT_LIGHTS];
uniform float pointLightDistance[MAX_POINT_LIGHTS];

uniform float time;

varying vec3 vPos;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vOffset;
varying float vData;

varying float vType;
varying float vSide;
varying float vShade;

uniform vec3 fogColor;

void main() {
  vec2 uv = vUv;

  float isSide = 0.0;

  float side = floor(vSide);

  if (side == 0.0 || side == 1.0 || side == 4.0 || side == 5.0) {
    isSide = 1.0;
  }

  // Number of textures per cube
  float sideCount = 8.0;

  // Number block types
  float typeCount = 8.0;

  uv.x = uv.x * (1.0 / sideCount) + isSide * (1.0 / sideCount);
  uv.y = uv.y * (1.0 / typeCount) + vType * (1.0 / typeCount);

  //// Force stone texture only
  //uv.x = uv.x / 8.0;
  //uv.y = uv.y / 8.0 + (1.0 / 8.0);

  vec4 col = texture2D(info, uv);

  // Pretty basic lambertian lighting...
  vec4 addedLights = vec4(0.0, 0.0, 0.0, 1.0);

  for (int l = 0; l < MAX_POINT_LIGHTS; l++) {
    vec3 lightDirection = normalize(vPos - pointLightPosition[l]);
    addedLights.rgb += clamp(dot(-lightDirection, vNormal), 0.0, 1.0) * pointLightColor[l];
  }

  gl_FragColor = col * (addedLights + vec4(ambientLightColor, 1.0));

  float fog = min(1.0, pow((gl_FragCoord.z / gl_FragCoord.w) / 96.0, 1.5));

  //float sky = (vPos.y / 32.0);
  //float ground = 1.0 - (vPos.y / 32.0);
  //
  //vec3 fogCol = vec3(1.0, 1.0, 1.0) * ground + vec3(0.7333, 0.8, 1.0) * sky;

// Only top face has shade
  if (side == 2.0) {
    gl_FragColor = gl_FragColor * (1.0 - (vShade / 255.0));
  }

  gl_FragColor = gl_FragColor * (1.0 - fog) + vec4(fogColor, 0.0) * fog;

  /*if (vType == 1.0) {
    gl_FragColor.r += sin(time + vPos.x);
    gl_FragColor.g += sin(time + vPos.y);
    gl_FragColor.b += sin(time + vPos.z);
  }*/

  //gl_FragColor = vec4(vPos, 1.0);

  //gl_FragColor.r = sin(vAbsPos.x);
}
