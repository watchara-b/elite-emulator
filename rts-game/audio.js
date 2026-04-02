// ===== AUDIO SYSTEM =====
// Dynamic soundtrack per faction, tactical SFX, unit voice lines, spatial audio.
// Uses Web Audio API for spatial positioning and dynamic mixing.

var audioCtx = null;
var masterGain = null;
var musicGain = null;
var sfxGain = null;
var musicMuted = false;
var sfxMuted = false;
var currentMusicSource = null;
var currentMusicBuffer = null;

// Initialize audio context (must be called after user interaction)
var reverbNode = null;
function initAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(audioCtx.destination);
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.3;
    musicGain.connect(masterGain);
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(masterGain);
    // Create convolution reverb from noise impulse
    reverbNode = audioCtx.createConvolver();
    var irLen = audioCtx.sampleRate * 1.5;
    var irBuf = audioCtx.createBuffer(2, irLen, audioCtx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = irBuf.getChannelData(ch);
      for (var i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.5);
    }
    reverbNode.buffer = irBuf;
    var reverbGain = audioCtx.createGain();
    reverbGain.gain.value = 0.15;
    reverbNode.connect(reverbGain);
    reverbGain.connect(masterGain);
  } catch (e) { /* Audio not supported */ }
}

// ===== PROCEDURAL TONE GENERATION =====
// FM Synthesis + ADSR envelopes for realistic sound without audio files.

function playTone(freq, duration, type, gainNode, vol) {
  if (!audioCtx || sfxMuted) return;
  var t = audioCtx.currentTime;
  var osc = audioCtx.createOscillator();
  var g = audioCtx.createGain();
  var panner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  // ADSR envelope: attack 5ms, decay 20%, sustain, release
  var attack = Math.min(0.005, duration * 0.1);
  var release = Math.min(0.05, duration * 0.3);
  var v = vol || 0.15;
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(v, t + attack);
  g.gain.setValueAtTime(v * 0.8, t + attack + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(g);
  if (panner) { g.connect(panner); panner.connect(gainNode || sfxGain); }
  else { g.connect(gainNode || sfxGain); }
  // Send to reverb too
  if (reverbNode) { var rSend = audioCtx.createGain(); rSend.gain.value = 0.2; g.connect(rSend); rSend.connect(reverbNode); }
  osc.start(t);
  osc.stop(t + duration);
  return panner;
}

// FM Synthesis: carrier + modulator for richer timbres
function playFM(carrierFreq, modFreq, modDepth, duration, gainNode, vol) {
  if (!audioCtx || sfxMuted) return;
  var t = audioCtx.currentTime;
  var mod = audioCtx.createOscillator();
  var modGain = audioCtx.createGain();
  var carrier = audioCtx.createOscillator();
  var g = audioCtx.createGain();
  var panner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
  mod.frequency.value = modFreq;
  modGain.gain.value = modDepth;
  modGain.gain.exponentialRampToValueAtTime(1, t + duration);
  mod.connect(modGain);
  modGain.connect(carrier.frequency);
  carrier.frequency.value = carrierFreq;
  var v = vol || 0.1;
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(v, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  carrier.connect(g);
  if (panner) { g.connect(panner); panner.connect(gainNode || sfxGain); }
  else { g.connect(gainNode || sfxGain); }
  if (reverbNode) { var rS = audioCtx.createGain(); rS.gain.value = 0.15; g.connect(rS); rS.connect(reverbNode); }
  mod.start(t); carrier.start(t);
  mod.stop(t + duration); carrier.stop(t + duration);
  return panner;
}

// Spatial panning version
function playToneSpatial(freq, duration, type, gainNode, vol, worldX, worldY) {
  var panner = playTone(freq, duration, type, gainNode, vol);
  if (panner && worldX !== undefined) panner.pan.value = spatialPan(worldX);
  return panner;
}

function playFMSpatial(cFreq, mFreq, mDepth, dur, gainNode, vol, wx, wy) {
  var panner = playFM(cFreq, mFreq, mDepth, dur, gainNode, vol);
  if (panner && wx !== undefined) panner.pan.value = spatialPan(wx);
  return panner;
}

function playNoise(duration, gainNode, vol) {
  if (!audioCtx || sfxMuted) return;
  var bufSize = audioCtx.sampleRate * duration;
  var buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  var data = buf.getChannelData(0);
  for (var i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  var src = audioCtx.createBufferSource();
  src.buffer = buf;
  var g = audioCtx.createGain();
  g.gain.setValueAtTime(vol || 0.08, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  src.connect(g);
  g.connect(gainNode || sfxGain);
  src.start();
}

// ===== TACTICAL SFX =====
var _sfxCooldown = {};
function sfxThrottle(id, cooldown) {
  var now = audioCtx ? audioCtx.currentTime : 0;
  if (_sfxCooldown[id] && now - _sfxCooldown[id] < cooldown) return false;
  _sfxCooldown[id] = now;
  return true;
}

function sfxAttack(dmgType, x, y) {
  if (!audioCtx || sfxMuted) return;
  if (!sfxThrottle('atk', 0.06)) return;
  var vol = spatialVol(x, y) * 0.12;
  switch (dmgType) {
    case 'antiInf': // Rifle: FM metallic crack
      playFMSpatial(900, 200, 400, 0.06, sfxGain, vol, x, y);
      setTimeout(function() { playFMSpatial(850, 180, 350, 0.05, sfxGain, vol * 0.7, x, y); }, 60);
      break;
    case 'explosive': // Explosion: low FM rumble + noise
      playFMSpatial(60, 30, 200, 0.35, sfxGain, vol * 1.5, x, y);
      playNoise(0.2, sfxGain, vol * 0.5);
      break;
    case 'armorPierce': // Laser: FM sweep
      playFMSpatial(2200, 800, 600, 0.12, sfxGain, vol * 0.6, x, y);
      playToneSpatial(1400, 0.15, 'sine', sfxGain, vol * 0.3, x, y);
      break;
    case 'antiAir': // EMP: FM electric zap
      playFMSpatial(3200, 1600, 1000, 0.08, sfxGain, vol * 0.5, x, y);
      playFMSpatial(80, 40, 300, 0.12, sfxGain, vol * 0.3, x, y);
      break;
    default:
      playFMSpatial(600, 150, 200, 0.08, sfxGain, vol, x, y);
  }
}

function sfxExplosion(x, y) {
  if (!audioCtx || sfxMuted) return;
  if (!sfxThrottle('exp', 0.1)) return;
  var vol = spatialVol(x, y) * 0.2;
  // Layered FM explosion: sub-bass thump + mid crunch + high debris
  playFMSpatial(45, 20, 300, 0.5, sfxGain, vol, x, y);
  playFMSpatial(120, 60, 500, 0.3, sfxGain, vol * 0.6, x, y);
  playNoise(0.35, sfxGain, vol * 0.5);
  setTimeout(function() { playFMSpatial(30, 15, 200, 0.6, sfxGain, vol * 0.4, x, y); }, 50);
}

function sfxBuild() {
  if (!audioCtx || sfxMuted) return;
  playTone(400, 0.1, 'square', sfxGain, 0.08);
  playTone(600, 0.1, 'square', sfxGain, 0.06);
  setTimeout(function() { playTone(800, 0.15, 'triangle', sfxGain, 0.07); }, 100);
}

function sfxTrain() {
  if (!audioCtx || sfxMuted) return;
  playTone(500, 0.08, 'triangle', sfxGain, 0.07);
  playTone(700, 0.1, 'triangle', sfxGain, 0.06);
}

function sfxSuperweaponCharge() {
  if (!audioCtx || sfxMuted) return;
  // Shepard Tone — overlapping rising octaves create illusion of infinite rise
  var t = audioCtx.currentTime;
  for (var oct = 0; oct < 3; oct++) {
    var osc = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100 * Math.pow(2, oct), t);
    osc.frequency.exponentialRampToValueAtTime(200 * Math.pow(2, oct), t + 2.5);
    g.gain.setValueAtTime(0.12 - oct * 0.03, t);
    g.gain.linearRampToValueAtTime(0.01, t + 2.5);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 2.5);
  }
}

function sfxSuperweaponFire() {
  if (!audioCtx || sfxMuted) return;
  playTone(40, 1.0, 'sine', sfxGain, 0.25);
  playNoise(0.8, sfxGain, 0.15);
  playTone(80, 0.8, 'sine', sfxGain, 0.2);
  setTimeout(function() { playTone(30, 1.2, 'sine', sfxGain, 0.2); }, 200);
}

function sfxUnitReady() {
  if (!audioCtx || sfxMuted) return;
  playTone(600, 0.1, 'sine', sfxGain, 0.06);
  setTimeout(function() { playTone(800, 0.15, 'sine', sfxGain, 0.07); }, 120);
}

function sfxBaseUnderAttack() {
  if (!audioCtx || sfxMuted) return;
  if (!sfxThrottle('bua', 3.0)) return;
  // Urgent alarm
  playTone(800, 0.2, 'square', sfxGain, 0.12);
  setTimeout(function() { playTone(600, 0.2, 'square', sfxGain, 0.12); }, 250);
  setTimeout(function() { playTone(800, 0.2, 'square', sfxGain, 0.12); }, 500);
}

function sfxCoin() {
  if (!audioCtx || sfxMuted) return;
  if (!sfxThrottle('coin', 0.5)) return;
  playTone(1200, 0.08, 'sine', sfxGain, 0.06);
  setTimeout(function() { playTone(1600, 0.1, 'sine', sfxGain, 0.05); }, 80);
}

function sfxFreeze() {
  if (!audioCtx || sfxMuted) return;
  playTone(2500, 0.15, 'sine', sfxGain, 0.06);
  playTone(3000, 0.2, 'triangle', sfxGain, 0.04);
}

function sfxClick() {
  if (!audioCtx || sfxMuted) return;
  playTone(1000, 0.03, 'sine', sfxGain, 0.04);
}

// ===== SPATIAL AUDIO =====
function spatialPan(worldX) {
  if (!audioCtx || typeof camX === 'undefined') return 0;
  var screenX = (worldX * TILE - camX) / screenW;
  return Math.max(-1, Math.min(1, (screenX - 0.5) * 2));
}

function spatialVol(worldX, worldY) {
  if (typeof camX === 'undefined') return 1;
  var sx = (worldX * TILE - camX) / screenW - 0.5;
  var sy = (worldY * TILE - camY) / screenH - 0.5;
  var d = Math.sqrt(sx * sx + sy * sy);
  return Math.max(0.2, 1.0 - d * 0.8);
}

// Gap #21: Low-pass filter for distant sounds
function playToneFiltered(freq, duration, type, gainNode, vol, worldX, worldY) {
  if (!audioCtx || sfxMuted) return;
  var osc = audioCtx.createOscillator();
  var g = audioCtx.createGain();
  var filter = audioCtx.createBiquadFilter();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  // Distance-based low-pass: closer = full freq, far = muffled
  var d = spatialVol(worldX || 0, worldY || 0);
  filter.type = 'lowpass';
  filter.frequency.value = 800 + d * 4000; // 800Hz far, 4800Hz close
  g.gain.setValueAtTime(vol || 0.15, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(filter);
  filter.connect(g);
  g.connect(gainNode || sfxGain);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// ===== THREAT NOTIFICATIONS =====
var _lastThreatTime = 0;
function checkThreats() {
  if (!audioCtx || typeof gameTime === 'undefined') return;
  if (gameTime - _lastThreatTime < 180) return; // 3 second cooldown
  // Check if player buildings are under attack
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    if (e.dead || e.team !== TEAMS.PLAYER || e.cat !== 'building') continue;
    if (e.hp < e.maxHp * 0.9) {
      // Check if enemy nearby
      for (var j = 0; j < entities.length; j++) {
        var en = entities[j];
        if (en.dead || en.team !== TEAMS.ENEMY) continue;
        if (Math.hypot(e.x - en.x, e.y - en.y) < 8) {
          sfxBaseUnderAttack();
          _lastThreatTime = gameTime;
          return;
        }
      }
    }
  }
}

// ===== DYNAMIC MUSIC =====
// Procedural ambient music — faction-themed drone + rhythm
var _musicBeat = 0;
// Chord progressions per faction (root notes in Hz)
var FACTION_CHORDS = {
  thailand:    [[55,110,165],[65,130,196],[73,147,220],[55,110,165]],
  japan:       [[110,220,330],[123,247,370],[147,294,440],[110,220,330]],
  switzerland: [[82,165,247],[98,196,294],[110,220,330],[82,165,247]],
  brazil:      [[65,131,196],[73,147,220],[82,165,247],[65,131,196]],
  egypt:       [[73,147,220],[82,165,247],[98,196,294],[73,147,220]]
};

function updateMusic() {
  if (!audioCtx || musicMuted) return;
  if (typeof gameTime === 'undefined' || typeof playerFaction === 'undefined' || !playerFaction) return;
  _musicBeat++;
  if (_musicBeat % 15 !== 0) return; // Every 0.25 seconds for tighter rhythm

  var fid = playerFaction.id;
  var inCombat = false;
  for (var i = 0; i < entities.length; i++) {
    var e = entities[i];
    if (!e.dead && e.team === TEAMS.PLAYER && e.target && !e.target.dead) { inCombat = true; break; }
  }

  var baseVol = inCombat ? 0.055 : 0.025;
  var bpm = inCombat ? 140 : 80;
  var beatLen = 60 / bpm;
  var chords = FACTION_CHORDS[fid] || FACTION_CHORDS.thailand;
  var chordIdx = Math.floor((_musicBeat / 120) % chords.length);
  var chord = chords[chordIdx];
  var beat16 = _musicBeat % 60; // 0-59 = one bar of 16th notes at current tempo

  switch (fid) {
    case 'thailand':
      // Kick on 1 and 3
      if (beat16 === 0 || beat16 === 30) playFM(55, 27, 400, beatLen * 0.8, musicGain, baseVol * 1.5);
      // Hi-hat 16ths
      if (beat16 % 15 === 0) playFM(8000, 12000, 200, 0.02, musicGain, baseVol * 0.25);
      // Snare on 2 and 4
      if (beat16 === 15 || beat16 === 45) { playNoise(0.08, musicGain, baseVol * 0.4); playFM(200, 400, 100, 0.08, musicGain, baseVol * 0.3); }
      // Phin arpeggio
      if (beat16 % 30 === 0) playFM(chord[0] * 2, chord[0], 80, 0.15, musicGain, baseVol * 0.4);
      if (beat16 === 15) playFM(chord[1] * 2, chord[1], 80, 0.12, musicGain, baseVol * 0.3);
      // Bass
      if (beat16 === 0) playFM(chord[0], chord[0] / 2, 200, beatLen * 1.5, musicGain, baseVol * 0.6);
      break;
    case 'japan':
      // Kick
      if (beat16 === 0 || beat16 === 30) playFM(60, 30, 300, beatLen * 0.6, musicGain, baseVol * 1.2);
      // Shamisen pluck arpeggio
      if (beat16 % 15 === 0) { var n = chord[beat16 / 15 % 3 | 0]; playFM(n * 4, n * 2, 500, 0.06, musicGain, baseVol * 0.35); }
      // Synth pad (sustained)
      if (beat16 === 0) playFM(chord[0], chord[0] + 3, 200, beatLen * 3, musicGain, baseVol * 0.5);
      // Clap on 2,4
      if (beat16 === 15 || beat16 === 45) playNoise(0.04, musicGain, baseVol * 0.3);
      break;
    case 'switzerland':
      // Clockwork tick (constant)
      if (beat16 % 15 === 0) playFM(4000, 2000, 50, 0.01, musicGain, baseVol * 0.12);
      // Brass chord stabs
      if (beat16 === 0) { for (var ci = 0; ci < 3; ci++) playFM(chord[ci], chord[ci] / 2, 300, beatLen * 0.5, musicGain, baseVol * 0.3); }
      // Industrial kick
      if (beat16 === 0 || beat16 === 30) playFM(50, 25, 400, 0.2, musicGain, baseVol);
      // Metallic snare
      if (beat16 === 15 || beat16 === 45) { playNoise(0.06, musicGain, baseVol * 0.35); playFM(300, 600, 200, 0.05, musicGain, baseVol * 0.2); }
      break;
    case 'brazil':
      // Deep kick
      if (beat16 === 0 || beat16 === 30) playFM(65, 32, 500, beatLen * 0.5, musicGain, baseVol * 1.2);
      // Conga pattern (syncopated)
      if (beat16 === 0 || beat16 === 22 || beat16 === 37) playFM(300, 600, 100, 0.04, musicGain, baseVol * 0.25);
      // Shaker 16ths
      if (beat16 % 15 === 0) playNoise(0.02, musicGain, baseVol * 0.12);
      // Bass melody
      if (beat16 === 0) playFM(chord[0], chord[0] / 2, 150, beatLen * 1.5, musicGain, baseVol * 0.5);
      if (beat16 === 30) playFM(chord[1], chord[1] / 2, 150, beatLen, musicGain, baseVol * 0.4);
      // Jungle ambience chirp
      if (_musicBeat % 120 === 0) playFM(2000 + Math.random() * 1000, 500, 50, 0.08, musicGain, baseVol * 0.1);
      break;
    case 'egypt':
      // Darbuka pattern (doum-tek-tek)
      if (beat16 === 0) playFM(100, 50, 400, 0.12, musicGain, baseVol * 0.5); // doum
      if (beat16 === 22 || beat16 === 30) playFM(400, 800, 300, 0.04, musicGain, baseVol * 0.3); // tek
      if (beat16 === 45) playFM(350, 700, 250, 0.04, musicGain, baseVol * 0.25); // tek
      // Oud drone + melody
      if (beat16 === 0) playFM(chord[0], chord[0] * 2, 180, beatLen * 3, musicGain, baseVol * 0.5);
      if (beat16 === 30) playFM(chord[2], chord[2] * 2, 150, beatLen, musicGain, baseVol * 0.3);
      // Riq shimmer
      if (beat16 % 15 === 0) playFM(6000, 3000, 30, 0.015, musicGain, baseVol * 0.08);
      break;
  }
}

// ===== UNIT VOICE LINES (Web Speech API synthesis) =====
var _voiceCooldown = 0;
var VOICE_LINES = {
  thailand: {
    move: ['จัดไปลูกพี่!', 'ไปเลย!', 'รับทราบ!', 'เข้าใจแล้ว!'],
    attack: ['ลุยเลย!', 'ยิงเลย!', 'ไม่มีถอย!', 'จัดหนักเลย!'],
    ready: ['พร้อมรบ!', 'ยูนิตพร้อม!', 'รอคำสั่ง!'],
    build: ['สร้างเสร็จ!', 'ฐานขยายแล้ว!'],
    kill: ['เก็บแล้ว!', 'หมดแล้วลูกพี่!'],
    underAttack: ['ฐานโดนโจมตี!', 'ช่วยด้วย!'],
    superweapon: ['อาวุธพร้อมยิง!', 'เปิดฉากเลย!'],
    lang: 'th-TH', pitch: 1.1, rate: 1.2
  },
  japan: {
    move: ['了解!', 'Moving out!', 'Hai!', 'Proceeding!'],
    attack: ['Engaging!', 'Target locked!', 'Banzai!', 'Weapons hot!'],
    ready: ['Unit ready!', 'Online!', 'Awaiting orders!'],
    build: ['Construction complete!', 'Structure online!'],
    kill: ['Target eliminated!', 'Enemy down!'],
    underAttack: ['Base under attack!', 'We need backup!'],
    superweapon: ['Void Generator charged!', 'Firing!'],
    lang: 'en-US', pitch: 0.8, rate: 1.0
  },
  switzerland: {
    move: ['Affirmative.', 'Moving.', 'Understood.', 'Proceeding to coordinates.'],
    attack: ['Engaging target.', 'Firing.', 'Nothing gets through.', 'Weapons free.'],
    ready: ['Unit operational.', 'Systems online.', 'Standing by.'],
    build: ['Structure complete.', 'Facility operational.'],
    kill: ['Threat neutralized.', 'Target down.'],
    underAttack: ['Perimeter breach!', 'Defensive positions!'],
    superweapon: ['Collider charged.', 'Initiating freeze protocol.'],
    lang: 'en-GB', pitch: 0.7, rate: 0.9
  },
  brazil: {
    move: ['Vamos!', 'Moving through jungle.', 'On the hunt.', 'Stalking.'],
    attack: ['Release the swarm!', 'Toxin deployed!', 'Nature strikes!', 'Feed!'],
    ready: ['Organism ready.', 'Bio-unit active.', 'Evolved.'],
    build: ['Growth complete!', 'Hive expanded!'],
    kill: ['Consumed!', 'Prey eliminated!'],
    underAttack: ['The hive is threatened!', 'Defend the nest!'],
    superweapon: ['Swarm ready!', 'Unleash the hive!'],
    lang: 'en-US', pitch: 0.9, rate: 1.1
  },
  egypt: {
    move: ['By the sun!', 'As commanded.', 'Moving.', 'The Pharaoh wills it.'],
    attack: ['Solar beam charging!', 'For the Pharaoh!', 'Burn them!', 'Judgement!'],
    ready: ['Awakened.', 'Unit ready.', 'Risen from the sands.'],
    build: ['Monument erected.', 'Temple complete.'],
    kill: ['Returned to dust.', 'Judgement delivered.'],
    underAttack: ['The temple is under siege!', 'Defend the pyramid!'],
    superweapon: ['Solaris Array charged!', 'Orbital strike ready!'],
    lang: 'en-US', pitch: 0.6, rate: 0.85
  }
};

function playVoiceLine(type) {
  if (typeof gameTime === 'undefined') return;
  if (gameTime - _voiceCooldown < 90) return;
  _voiceCooldown = gameTime;
  if (!playerFaction) return;
  var fv = VOICE_LINES[playerFaction.id];
  if (!fv || !fv[type]) return;
  var arr = fv[type];
  var line = arr[Math.floor(Math.random() * arr.length)];
  // Web Speech API voice synthesis
  if (typeof speechSynthesis !== 'undefined' && !sfxMuted) {
    var utter = new SpeechSynthesisUtterance(line);
    utter.lang = fv.lang || 'en-US';
    utter.pitch = fv.pitch || 1.0;
    utter.rate = fv.rate || 1.0;
    utter.volume = 0.6;
    speechSynthesis.cancel(); // stop any current speech
    speechSynthesis.speak(utter);
  }
  if (typeof showMsg === 'function') showMsg('🗣 ' + line);
  if (audioCtx && !sfxMuted) playTone(500, 0.05, 'sine', sfxGain, 0.03);
}

// ===== AUDIO TOGGLE =====
function toggleMusic() {
  musicMuted = !musicMuted;
  if (musicGain) musicGain.gain.value = musicMuted ? 0 : 0.3;
  return musicMuted;
}

function toggleSfx() {
  sfxMuted = !sfxMuted;
  if (sfxGain) sfxGain.gain.value = sfxMuted ? 0 : 0.5;
  return sfxMuted;
}

// ===== AMBIENT ENVIRONMENTAL AUDIO =====
var _ambientOsc = null;
function updateAmbient() {
  if (!audioCtx || musicMuted) return;
  if (_ambientOsc) return; // already running
  // Low continuous drone — changes with weather
  _ambientOsc = audioCtx.createOscillator();
  var g = audioCtx.createGain();
  var filter = audioCtx.createBiquadFilter();
  _ambientOsc.type = 'sine';
  _ambientOsc.frequency.value = 55;
  filter.type = 'lowpass';
  filter.frequency.value = 200;
  g.gain.value = 0.02;
  _ambientOsc.connect(filter);
  filter.connect(g);
  g.connect(musicGain);
  _ambientOsc.start();
  // Weather-specific ambient layer
  if (typeof currentWeather !== 'undefined') {
    var wOsc = audioCtx.createOscillator();
    var wg = audioCtx.createGain();
    wg.gain.value = 0.01;
    switch (currentWeather) {
      case 'rain': wOsc.type = 'sawtooth'; wOsc.frequency.value = 30; wg.gain.value = 0.015; break;
      case 'snow': wOsc.type = 'sine'; wOsc.frequency.value = 80; wg.gain.value = 0.008; break;
      case 'sandstorm': wOsc.type = 'sawtooth'; wOsc.frequency.value = 45; wg.gain.value = 0.02; break;
      default: wOsc.type = 'sine'; wOsc.frequency.value = 40; wg.gain.value = 0.005;
    }
    wOsc.connect(wg); wg.connect(musicGain); wOsc.start();
  }
}
