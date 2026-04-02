// ===== Server API Tests =====
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

let serverProcess;
const PORT = 4099; // Use non-standard port for testing

function fetch(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${PORT}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    }).on('error', reject);
  });
}

describe('Server API', () => {
  before(async () => {
    const { spawn } = require('child_process');
    serverProcess = spawn('node', ['server.js'], {
      cwd: require('path').join(__dirname, '..', 'server'),
      env: { ...process.env, PORT: String(PORT) },
      stdio: 'pipe'
    });
    // Wait for server to start
    await new Promise(resolve => {
      serverProcess.stdout.on('data', (data) => {
        if (data.toString().includes('relay on port')) resolve();
      });
      setTimeout(resolve, 2000);
    });
  });

  after(() => {
    if (serverProcess) serverProcess.kill();
  });

  it('GET /api/rooms should return array', async () => {
    const res = await fetch('/api/rooms');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data));
  });

  it('GET /api/leaderboard should return array', async () => {
    const res = await fetch('/api/leaderboard');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data));
  });

  it('GET /api/stats should return server stats', async () => {
    const res = await fetch('/api/stats');
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.data.onlinePlayers === 'number');
    assert.ok(typeof res.data.activeRooms === 'number');
  });

  it('GET /api/replays should return array', async () => {
    const res = await fetch('/api/replays');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data));
  });

  it('GET /api/player/unknown should return empty stats', async () => {
    const res = await fetch('/api/player/testuser_nonexistent');
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.stats === null || res.data.stats === undefined || typeof res.data.stats === 'object');
  });

  it('GET /api/replays/nonexistent.json should return 404', async () => {
    const res = await fetch('/api/replays/nonexistent.json');
    assert.strictEqual(res.status, 404);
  });
});
