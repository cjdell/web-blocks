#define M_PI 3.1415926535897932384626433832795

uniform sampler2D textures;
uniform sampler2D webcam;

uniform vec3 ambientLightColor;

uniform vec3 pointLightColor[MAX_POINT_LIGHTS];
uniform vec3 pointLightPosition[MAX_POINT_LIGHTS];
uniform float pointLightDistance[MAX_POINT_LIGHTS];

uniform float time;

varying vec3 vPos;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vOffset;

varying float vType;
varying float vSide;
varying float vShade;
varying vec3 vColour;

uniform vec3 fogColor;

void main() {
  vec2 uv = vUv;

  float type = floor(vType);
  float side = floor(vSide);
  float shade = floor(vShade);

  float isSide = 0.0;

  if (side == 0.0 || side == 1.0 || side == 4.0 || side == 5.0) {
    isSide = 1.0;
  }

  vec4 col;

  if (type == 4.0)
    col = texture2D(webcam, uv);
  else
    col = texture2D(textures, uv);

  if (type == 5.0) {
    col = normalize(col + vec4(vColour, 0.0));
  }

  // Pretty basic lambertian lighting...
  vec4 addedLights = vec4(0.0, 0.0, 0.0, 1.0);

  for (int l = 0; l < MAX_POINT_LIGHTS; l++) {
    vec3 lightDirection = normalize(vPos - pointLightPosition[l]);
    addedLights.rgb += clamp(dot(-lightDirection, vNormal), 0.0, 1.0) * pointLightColor[l];
  }

  gl_FragColor = col * (addedLights + vec4(ambientLightColor, 1.0));

  float shine = 0.0;

  // Make water somewhat wavey
  if (type == 3.0) {
    shine = sin(vPos.x + time * 0.5) * sin(vPos.z + time * 0.3) * 0.05;
  }

  float fog = min(1.0, pow((gl_FragCoord.z / gl_FragCoord.w) / 96.0, 1.8));

  // Only top face has shade
  if (side == 2.0) {
    gl_FragColor = gl_FragColor * (1.0 - (shade / 255.0));
  }

  gl_FragColor = gl_FragColor * (1.0 - fog) + vec4(fogColor, 0.0) * fog;

  /*if (type == 1.0) {
    gl_FragColor.r += sin(time + vPos.x);
    gl_FragColor.g += sin(time + vPos.y);
    gl_FragColor.b += sin(time + vPos.z);
  }*/

  gl_FragColor = gl_FragColor + vec4(1.0, 1.0, 1.0, 0.0) * shine;
}
