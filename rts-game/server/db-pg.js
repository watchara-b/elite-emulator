// ===== PostgreSQL DATABASE ADAPTER =====
// Drop-in replacement for db.js. Same exports, uses pg instead of better-sqlite3.
// Usage: DATABASE_URL=postgres://user:pass@host:5432/factionwars node server.js

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ===== SCHEMA (auto-create on first run) =====
pool.query(`
  CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    elo INTEGER DEFAULT 1000,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    player1_name TEXT NOT NULL,
    player2_name TEXT NOT NULL,
    player1_faction TEXT,
    player2_faction TEXT,
    winner_name TEXT,
    reason TEXT,
    duration_ticks INTEGER,
    map_id INTEGER,
    played_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_players_elo ON players(elo DESC);
  CREATE INDEX IF NOT EXISTS idx_matches_played ON matches(played_at DESC);
`).catch(e => console.error('[DB-PG] Schema error:', e.message));

function calculateElo(winnerElo, loserElo) {
  var K = 32;
  var expected = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  var newWinner = Math.round(winnerElo + K * (1 - expected));
  var newLoser = Math.round(loserElo + K * (0 - (1 - expected)));
  return { winner: newWinner, loser: Math.max(100, newLoser) };
}

async function ensurePlayer(name) {
  await pool.query('INSERT INTO players (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
  var r = await pool.query('SELECT * FROM players WHERE name = $1', [name]);
  return r.rows[0];
}

async function getPlayerElo(name) {
  var r = await pool.query('SELECT elo FROM players WHERE name = $1', [name]);
  return r.rows[0] ? r.rows[0].elo : 1000;
}

async function recordMatch(p1Name, p2Name, p1Faction, p2Faction, winnerName, reason, durationTicks, mapId) {
  var loserName = winnerName === p1Name ? p2Name : p1Name;
  var winnerElo = await getPlayerElo(winnerName);
  var loserElo = await getPlayerElo(loserName);
  var newElo = calculateElo(winnerElo, loserElo);
  await pool.query('UPDATE players SET elo = $1, wins = wins + 1 WHERE name = $2', [newElo.winner, winnerName]);
  await pool.query('UPDATE players SET elo = $1, losses = losses + 1 WHERE name = $2', [newElo.loser, loserName]);
  await pool.query(
    'INSERT INTO matches (player1_name, player2_name, player1_faction, player2_faction, winner_name, reason, duration_ticks, map_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [p1Name, p2Name, p1Faction, p2Faction, winnerName, reason, durationTicks, mapId]
  );
  return { winnerElo: newElo.winner, loserElo: newElo.loser };
}

async function getLeaderboard(limit) {
  var r = await pool.query('SELECT name, elo, wins, losses FROM players ORDER BY elo DESC LIMIT $1', [limit || 50]);
  return r.rows;
}

async function getMatchHistory(name, limit) {
  var r = await pool.query('SELECT * FROM matches WHERE player1_name = $1 OR player2_name = $1 ORDER BY played_at DESC LIMIT $2', [name, limit || 20]);
  return r.rows;
}

async function getPlayerStats(name) {
  var r = await pool.query(
    `SELECT name, elo, wins, losses,
      CASE WHEN (wins + losses) > 0 THEN ROUND(wins * 100.0 / (wins + losses), 1) ELSE 0 END as winrate
    FROM players WHERE name = $1`, [name]
  );
  return r.rows[0] || null;
}

module.exports = { ensurePlayer, getPlayerElo, recordMatch, getLeaderboard, getMatchHistory, getPlayerStats, pool };
