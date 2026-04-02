// ===== Test Harness: Mock browser globals for Node.js =====
// Provides minimal stubs so game modules can be require()'d in Node.

// Canvas stub
const canvasStub = {
  width: 800, height: 600,
  getContext: () => ({
    fillRect: () => {}, strokeRect: () => {}, clearRect: () => {},
    beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, arc: () => {},
    fill: () => {}, stroke: () => {}, fillText: () => {},
    drawImage: () => {}, save: () => {}, restore: () => {},
    translate: () => {}, rotate: () => {}, scale: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    ellipse: () => {}, quadraticCurveTo: () => {}, roundRect: () => {},
    setLineDash: () => {},
    imageSmoothingEnabled: true, imageSmoothingQuality: 'high',
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '',
    textAlign: '', globalAlpha: 1, shadowColor: '', shadowBlur: 0
  }),
  addEventListener: () => {}
};

// DOM stub
const elementStubs = {};
function getOrCreateElement(id) {
  if (!elementStubs[id]) {
    elementStubs[id] = {
      id, style: {}, innerHTML: '', textContent: '', className: '',
      appendChild: () => {}, addEventListener: () => {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
      _t: null
    };
  }
  return elementStubs[id];
}

global.document = {
  getElementById: (id) => {
    if (id === 'game' || id === 'minimap' || id === 'map-preview-canvas') return canvasStub;
    return getOrCreateElement(id);
  },
  createElement: (tag) => ({
    style: {}, className: '', innerHTML: '', textContent: '',
    appendChild: () => {}, setAttribute: () => {},
    getContext: canvasStub.getContext, width: 100, height: 100
  }),
  addEventListener: () => {}
};

global.window = {
  innerWidth: 800, innerHeight: 600,
  addEventListener: () => {},
  AudioContext: undefined, webkitAudioContext: undefined
};

global.requestAnimationFrame = () => {};
global.performance = { now: () => Date.now() };
global.Image = class { set src(v) {} get width() { return 32; } get height() { return 32; } };
global.OffscreenCanvas = undefined;

// Load game modules in correct order
function loadGameModules() {
  // Clear module cache
  const gameDir = require('path').join(__dirname, '..');
  const modules = ['rps.js', 'fixedpoint.js', 'mapgen.js', 'net.js', 'economy.js',
                    'fog.js', 'navmesh.js', 'abilities.js', 'ai.js', 'factions.js'];
  for (const m of modules) {
    const p = require('path').join(gameDir, m);
    delete require.cache[p];
  }

  // Execute in global scope (like browser <script> tags)
  const fs = require('fs');
  const vm = require('vm');
  const ctx = vm.createContext(global);

  // Pre-set globals that scripts expect
  ctx.console = console;
  ctx.Math = Math;
  ctx.Array = Array;
  ctx.Object = Object;
  ctx.Infinity = Infinity;
  ctx.parseInt = parseInt;
  ctx.parseFloat = parseFloat;
  ctx.isFinite = isFinite;
  ctx.setTimeout = setTimeout;
  ctx.clearTimeout = clearTimeout;
  ctx.document = global.document;
  ctx.window = global.window;
  ctx.requestAnimationFrame = global.requestAnimationFrame;
  ctx.performance = global.performance;
  ctx.Image = global.Image;

  for (const m of modules) {
    const code = fs.readFileSync(require('path').join(gameDir, m), 'utf8');
    try {
      vm.runInContext(code, ctx, { filename: m });
    } catch (e) {
      // Some modules may fail on DOM-specific code, that's ok for testing
      if (!['mapgen.js'].includes(m)) {
        console.warn(`  [warn] ${m}: ${e.message}`);
      }
    }
  }

  return ctx;
}

module.exports = { loadGameModules, canvasStub, getOrCreateElement };
