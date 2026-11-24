/**
 * A knowledge graph drawn live, in the look of the brand film: nodes scattered in space come
 * home to clusters around their hubs, drift a little, and turn slowly over a field of dust,
 * while a pulse of light travels each link between hubs. Decoration: the clusters stand for
 * nothing in particular. Plain WebGL with no library, so the landing page pays for a few
 * hundred lines rather than a 3D engine. The lens and the dust are the film stage's own.
 */

import { DEFAULT_PALETTE, readPalette, type Rgb } from './palette'

const DUST_COUNT = 900
export const RADIUS = 3.4 // the graph fits inside a sphere of this size
const CAM_Z = 14
const FOV = 38
const BESIDE_CENTRE = 460 // CSS px from the top, the middle of the hero's words
const SETTLED = 8 // seconds in, the picture reduced motion holds

const clamp = (x: number) => Math.max(0, Math.min(1, x))
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3)
const easeInOut = (x: number) => {
  x = clamp(x)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

export interface Graph {
  dust: Float32Array
  dustSize: Float32Array
  scatter: Float32Array
  home: Float32Array
  size: Float32Array
  /** One colour per node. */
  color: Float32Array
  /** How far each node drifts about its place. */
  drift: Float32Array
  /** Index pairs: the relationships drawn between nodes. */
  pairs: number[]
  /** Index pairs, hub to hub, that a pulse of light travels along. */
  routes: number[]
}

// Each cluster's size and which palette colour it wears.
const CLUSTERS: Array<[number, number]> = [
  [46, 1],
  [42, 2],
  [38, 5],
  [34, 0],
  [32, 3],
  [28, 4],
  [24, 1],
  [20, 2],
]

/**
 * Seeded, so every visitor and every screenshot gets the same picture. The palette colours
 * the nodes and takes no part in where they sit.
 */
export function buildGraph(seed = 11, palette: Rgb[] = DEFAULT_PALETTE): Graph {
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647), s / 2147483647)

  const dust = new Float32Array(DUST_COUNT * 3)
  const dustSize = new Float32Array(DUST_COUNT)
  for (let i = 0; i < DUST_COUNT; i++) {
    dust.set([(rnd() - 0.5) * 60, (rnd() - 0.5) * 34, -rnd() * 110 + 8], i * 3)
    dustSize[i] = 0.3 + rnd() * 0.8
  }

  const total = CLUSTERS.reduce((n, [count]) => n + count, 0)
  const scatter = new Float32Array(total * 3)
  const home = new Float32Array(total * 3)
  const size = new Float32Array(total)
  const color = new Float32Array(total * 3)
  const drift = new Float32Array(total)
  const pairs: number[] = []
  const hubs: number[] = []
  const at = (i: number) => [home[i * 3], home[i * 3 + 1], home[i * 3 + 2]]
  const d2 = (i: number, j: number) =>
    at(i).reduce((sum, v, k) => sum + (v - at(j)[k]) ** 2, 0)
  const nearest = (i: number, among: number[], n: number) =>
    among
      .filter((j) => j !== i)
      .sort((p, q) => d2(i, p) - d2(i, q))
      .slice(0, n)

  let i = 0
  CLUSTERS.forEach(([count, tint], c) => {
    const rgb = palette[tint]
    // cluster centres spread evenly over an ellipsoid, members in a soft cloud about each
    const y = 1 - ((c + 0.5) / CLUSTERS.length) * 2
    const r = Math.sqrt(1 - y * y)
    const a = c * 2.39996 + 0.6
    const centre = [Math.cos(a) * r * 3.0, y * 2.6, Math.sin(a) * r * 2.6]
    const spread = 0.46 + count * 0.011
    const members: number[] = []
    for (let m = 0; m < count; m++, i++) {
      const hub = m === 0
      scatter.set(
        [(rnd() - 0.5) * 44, (rnd() - 0.5) * 24, -rnd() * 46 + 4],
        i * 3
      )
      const off = () => (hub ? 0 : (rnd() + rnd() + rnd() - 1.5) * spread)
      home.set([centre[0] + off(), centre[1] + off(), centre[2] + off()], i * 3)
      size[i] = hub ? 4.4 : 1.4 + rnd() * 1.3
      color.set(hub ? [1, 1, 1] : rgb, i * 3)
      drift[i] = hub ? 0.03 : 0.05 + rnd() * 0.07
      members.push(i)
    }
    hubs.push(members[0])
    members.slice(1).forEach((n) => {
      // most members hang off the hub; the rest, and a few besides, off a neighbour
      if (rnd() < 0.62) pairs.push(members[0], n)
      else pairs.push(n, nearest(n, members.slice(1), 1)[0])
      if (rnd() < 0.3) pairs.push(n, nearest(n, members.slice(1), 2)[1])
    })
  })

  // pull the whole graph inside its sphere, so no outlying node strays off the stage
  const reach = Math.max(
    ...Array.from({ length: total }, (_, n) => Math.hypot(...at(n)))
  )
  const fit = Math.min(1, (RADIUS - 0.15) / reach)
  for (let k = 0; k < home.length; k++) home[k] *= fit

  const routes: number[] = []
  hubs.forEach((h) =>
    nearest(h, hubs, 2).forEach((o) => {
      const seen = routes.some(
        (_, k) => k % 2 === 0 && routes[k] === o && routes[k + 1] === h
      )
      if (!seen) routes.push(h, o)
    })
  )
  pairs.push(...routes)
  return { dust, dustSize, scatter, home, size, color, drift, pairs, routes }
}

/**
 * Where the graph sits: right of the words when they are set beside it, above them
 * otherwise. Beside them its centre is a fixed distance from the top, level with the words,
 * so a tall window does not drop it toward the section below.
 */
export function placeGraph(aspect: number, beside: boolean, height: number) {
  const halfH = CAM_Z * Math.tan((FOV * Math.PI) / 360)
  const halfW = halfH * aspect
  if (beside) {
    const scale = Math.min(1, (halfW * 0.36) / RADIUS, (halfH * 0.8) / RADIUS)
    const centre = Math.min(BESIDE_CENTRE, height / 2) / height
    return { x: halfW * 0.48, y: halfH * (1 - 2 * centre), scale }
  }
  const scale = Math.min(1, (halfW * 0.8) / RADIUS, (halfH * 0.29) / RADIUS)
  return { x: 0, y: halfH * 0.47, scale }
}

const POINT_VERT = `
precision mediump float;
attribute vec3 position; attribute vec3 color; attribute float size; attribute float front;
uniform mat4 uProj; uniform float uRot, uFocus, uAperture, uPx, uHalo;
varying float vA; varying vec3 vC;
void main() {
  vC = color;
  float c = cos(uRot), s = sin(uRot);
  vec3 p = vec3(c * position.x + s * position.z, position.y, c * position.z - s * position.x);
  float d = ${CAM_Z.toFixed(1)} - p.z;
  float coc = abs(d - uFocus) * uAperture;
  gl_PointSize = (size + coc * 5.) * 60. / d * uPx * uHalo;
  gl_Position = uProj * vec4(p.xy, -d, 1.);
  vec2 n = abs(gl_Position.xy / gl_Position.w);
  vA = smoothstep(1.5, 5., d) * smoothstep(1.02, .84, max(n.x, n.y)) / (1. + coc * coc * 1.6) * front;
}`
// The film blooms its highlights in a second pass; here each point carries its own soft halo.
const POINT_FRAG = `
precision mediump float;
uniform float uAlpha, uHalo, uGlow; varying float vA; varying vec3 vC;
void main() {
  float r = length(gl_PointCoord - .5) * uHalo;
  float a = smoothstep(.5, .32, r) + uGlow * exp(-r * r * 5.);
  gl_FragColor = vec4(vC, a * vA * uAlpha);
}`
const LINE_VERT = `
precision mediump float;
attribute vec3 position; attribute vec3 color; attribute float front; uniform mat4 uProj;
varying float vF; varying vec3 vC;
void main() { vF = front; vC = color; gl_Position = uProj * vec4(position.xy, position.z - ${CAM_Z.toFixed(1)}, 1.); }`
const LINE_FRAG = `
precision mediump float; uniform float uAlpha; varying float vF; varying vec3 vC;
void main() { gl_FragColor = vec4(vC, uAlpha * vF); }`

function program(gl: WebGLRenderingContext, vert: string, frag: string) {
  const p = gl.createProgram()!
  for (const [type, src] of [
    [gl.VERTEX_SHADER, vert],
    [gl.FRAGMENT_SHADER, frag],
  ] as const) {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    gl.attachShader(p, sh)
  }
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(p) ?? 'shader link failed')
  }
  const u = (name: string) => gl.getUniformLocation(p, name)
  const a = (name: string) => gl.getAttribLocation(p, name)
  return { p, u, a }
}

/**
 * Draws the stage on `canvas` until the returned function is called. It runs only while the
 * canvas is on screen, and holds one settled frame for a visitor who asks for reduced
 * motion. Where WebGL is unavailable it draws nothing: the page stands without it.
 */
export function mountGraphStage(
  canvas: HTMLCanvasElement,
  /** The CSS width from which the page sets its words beside the graph. */
  besideFrom: number
): () => void {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true })
  if (!gl) return () => {}

  const palette = readPalette(canvas)
  const g = buildGraph(11, palette)
  const count = g.size.length
  const points = program(gl, POINT_VERT, POINT_FRAG)
  const lines = program(gl, LINE_VERT, LINE_FRAG)
  const buffer = (data: Float32Array, usage: number = gl.STATIC_DRAW) => {
    const b = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, b)
    gl.bufferData(gl.ARRAY_BUFFER, data, usage)
    return b
  }
  const bind = (
    prog: ReturnType<typeof program>,
    name: string,
    b: WebGLBuffer,
    n: number
  ) => {
    const loc = prog.a(name)
    gl.bindBuffer(gl.ARRAY_BUFFER, b)
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0)
  }

  const dustPos = buffer(g.dust)
  const dustSize = buffer(g.dustSize)
  const nodeSize = buffer(g.size)
  const nodeColor = buffer(g.color)
  const pos = new Float32Array(count * 3)
  const front = new Float32Array(count)
  const edgePos = new Float32Array(g.pairs.length * 3)
  const edgeFront = new Float32Array(g.pairs.length)
  const edgeColor = new Float32Array(g.pairs.length * 3)
  g.pairs.forEach((n, k) =>
    edgeColor.set(g.color.subarray(n * 3, n * 3 + 3), k * 3)
  )
  const edgeColorBuf = buffer(edgeColor)
  // a pulse of light along each route between hubs
  const pulses = g.routes.length / 2
  const pulsePos = new Float32Array(pulses * 3)
  const pulseFront = new Float32Array(pulses)
  const pulsePosBuf = buffer(pulsePos, gl.DYNAMIC_DRAW)
  const pulseFrontBuf = buffer(pulseFront, gl.DYNAMIC_DRAW)
  const pulseSize = buffer(new Float32Array(pulses).fill(2.4))
  const nodePos = buffer(pos, gl.DYNAMIC_DRAW)
  const nodeFront = buffer(front, gl.DYNAMIC_DRAW)
  const edgePosBuf = buffer(edgePos, gl.DYNAMIC_DRAW)
  const edgeFrontBuf = buffer(edgeFront, gl.DYNAMIC_DRAW)

  gl.enable(gl.BLEND)
  // Light is added, and alpha is kept in step with it: a GPU compositor drops colour that
  // has no alpha behind it, though a software one shows it.
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.clearColor(0, 0, 0, 0)

  const proj = new Float32Array(16)
  let place = placeGraph(1, false, 1)
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    gl.viewport(0, 0, w, h)
    const f = 1 / Math.tan((FOV * Math.PI) / 360)
    const near = 0.1
    const far = 400
    proj.fill(0)
    proj[0] = f / (w / h)
    proj[5] = f
    proj[10] = (far + near) / (near - far)
    proj[11] = -1
    proj[14] = (2 * far * near) / (near - far)
    place = placeGraph(
      w / h,
      canvas.clientWidth >= besideFrom,
      canvas.clientHeight
    )
  }

  const draw = (t: number) => {
    const home = easeInOut(seg(t, 0.3, 3.2))
    // The turn: a slow spin about the upright axis, then a slight tilt toward the viewer.
    const [tilt, spin] = [0.22, t * 0.07]
    const [cx, sx, cy, sy] = [
      Math.cos(tilt),
      Math.sin(tilt),
      Math.cos(spin),
      Math.sin(spin),
    ]
    for (let i = 0; i < count; i++) {
      const w = g.drift[i]
      const hx = g.home[i * 3] + w * Math.sin(t * 0.6 + i)
      const hy = g.home[i * 3 + 1] + w * Math.cos(t * 0.5 + i * 1.3)
      const hz = g.home[i * 3 + 2] + w * Math.sin(t * 0.4 + i * 0.7)
      const x2 = cy * hx + sy * hz
      const z2 = cy * hz - sy * hx
      const y3 = cx * hy - sx * z2
      const z3 = sx * hy + cx * z2
      const target = [
        place.x + x2 * place.scale,
        place.y + y3 * place.scale,
        z3 * place.scale,
      ]
      for (let k = 0; k < 3; k++) {
        const from = g.scatter[i * 3 + k]
        pos[i * 3 + k] = from + (target[k] - from) * home
      }
      // nodes on the far side are dimmed, which is what gives the graph its depth
      const facing = 0.4 + 0.6 * easeInOut(seg(z3 / RADIUS, -1, 0.5))
      front[i] = 1 + (facing - 1) * home
    }
    g.pairs.forEach((n, k) => {
      edgePos.set(pos.subarray(n * 3, n * 3 + 3), k * 3)
      edgeFront[k] = front[n]
    })

    gl.clear(gl.COLOR_BUFFER_BIT)
    const px = canvas.height / 1080

    gl.useProgram(lines.p)
    gl.uniformMatrix4fv(lines.u('uProj'), false, proj)
    gl.uniform1f(lines.u('uAlpha'), 0.42 * easeOut(seg(t, 2.4, 4)))
    gl.bindBuffer(gl.ARRAY_BUFFER, edgePosBuf)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, edgePos)
    gl.bindBuffer(gl.ARRAY_BUFFER, edgeFrontBuf)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, edgeFront)
    bind(lines, 'position', edgePosBuf, 3)
    bind(lines, 'front', edgeFrontBuf, 1)
    bind(lines, 'color', edgeColorBuf, 3)
    gl.drawArrays(gl.LINES, 0, g.pairs.length)

    gl.useProgram(points.p)
    gl.uniformMatrix4fv(points.u('uProj'), false, proj)
    gl.uniform1f(points.u('uFocus'), CAM_Z)

    // dust: the first brand colour, small, drifting almost imperceptibly
    gl.uniform1f(points.u('uRot'), t * 0.004)
    gl.uniform1f(points.u('uAperture'), 0.05)
    gl.uniform1f(points.u('uPx'), px)
    gl.uniform1f(points.u('uHalo'), 1)
    gl.uniform1f(points.u('uGlow'), 0)
    gl.uniform1f(points.u('uAlpha'), 0.5)
    bind(points, 'position', dustPos, 3)
    bind(points, 'size', dustSize, 1)
    gl.disableVertexAttribArray(points.a('front'))
    gl.vertexAttrib1f(points.a('front'), 1)
    gl.disableVertexAttribArray(points.a('color'))
    gl.vertexAttrib3f(points.a('color'), ...palette[0])
    gl.drawArrays(gl.POINTS, 0, DUST_COUNT)

    // the nodes: haloed, white hubs and coloured members
    gl.uniform1f(points.u('uRot'), 0)
    gl.uniform1f(points.u('uAperture'), 0.06)
    gl.uniform1f(points.u('uPx'), px * (1 + (place.scale - 1) * home))
    gl.uniform1f(points.u('uHalo'), 3)
    gl.uniform1f(points.u('uGlow'), 0.22)
    gl.uniform1f(points.u('uAlpha'), 1)
    gl.bindBuffer(gl.ARRAY_BUFFER, nodePos)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos)
    gl.bindBuffer(gl.ARRAY_BUFFER, nodeFront)
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, front)
    bind(points, 'position', nodePos, 3)
    bind(points, 'size', nodeSize, 1)
    bind(points, 'front', nodeFront, 1)
    bind(points, 'color', nodeColor, 3)
    gl.drawArrays(gl.POINTS, 0, count)

    {
      const lit = easeOut(seg(t, 3.6, 5))
      for (let k = 0; k < pulses; k++) {
        const [a, b] = [g.routes[k * 2], g.routes[k * 2 + 1]]
        const along = (t * 0.16 + k * 0.37) % 1
        for (let c = 0; c < 3; c++) {
          pulsePos[k * 3 + c] =
            pos[a * 3 + c] + (pos[b * 3 + c] - pos[a * 3 + c]) * along
        }
        pulseFront[k] = Math.sin(Math.PI * along) * lit
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, pulsePosBuf)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pulsePos)
      gl.bindBuffer(gl.ARRAY_BUFFER, pulseFrontBuf)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pulseFront)
      bind(points, 'position', pulsePosBuf, 3)
      bind(points, 'size', pulseSize, 1)
      bind(points, 'front', pulseFrontBuf, 1)
      gl.disableVertexAttribArray(points.a('color'))
      gl.vertexAttrib3f(points.a('color'), 1, 1, 1)
      gl.drawArrays(gl.POINTS, 0, pulses)
    }
  }

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let raf = 0
  let start = 0
  let onScreen = false
  const loop = (now: number) => {
    start ||= now
    draw((now - start) / 1000)
    raf = requestAnimationFrame(loop)
  }
  const run = () => {
    cancelAnimationFrame(raf)
    if (still) draw(SETTLED)
    else if (onScreen) raf = requestAnimationFrame(loop)
  }

  const sized = new ResizeObserver(() => {
    resize()
    if (still) draw(SETTLED)
  })
  const seen = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting
    run()
  })
  resize()
  sized.observe(canvas)
  seen.observe(canvas)

  return () => {
    cancelAnimationFrame(raf)
    sized.disconnect()
    seen.disconnect()
  }
}
