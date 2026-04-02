// ===== DATABASE PERSISTENCE (SQLite for portability) =====
// Stores match history, ELO ratings, player stats.
// Uses better-sqlite3 for synchronous, zero-config embedded DB.

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'factionwars.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// ===== SCHEMA =====
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    elo INTEGER DEFAULT 1000,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1_name TEXT NOT NULL,
    player2_name TEXT NOT NULL,
    player1_faction TEXT,
    player2_faction TEXT,
    winner_name TEXT,
    reason TEXT,
    duration_ticks INTEGER,
    map_id INTEGER,
    played_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_players_elo ON players(elo DESC);
  CREATE INDEX IF NOT EXISTS idx_matches_played ON matches(played_at DESC);
`);

// ===== PREPARED STATEMENTS =====
const stmts = {
  getPlayer: db.prepare('SELECT * FROM players WHERE name = ?'),
  upsertPlayer: db.prepare(`
    INSERT INTO players (name, elo) VALUES (?, 1000)
    ON CONFLICT(name) DO NOTHING
  `),
  updateElo: db.prepare('UPDATE players SET elo = ?, wins = wins + ?, losses = losses + ? WHERE name = ?'),
  getLeaderboard: db.prepare('SELECT name, elo, wins, losses FROM players ORDER BY elo DESC LIMIT ?'),
  insertMatch: db.prepare(`
    INSERT INTO matches (player1_name, player2_name, player1_faction, player2_faction, winner_name, reason, duration_ticks, map_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getMatchHistory: db.prepare('SELECT * FROM matches WHERE player1_name = ? OR player2_name = ? ORDER BY played_at DESC LIMIT ?'),
  getPlayerStats: db.prepare(`
    SELECT name, elo, wins, losses,
      CASE WHEN (wins + losses) > 0 THEN ROUND(wins * 100.0 / (wins + losses), 1) ELSE 0 END as winrate
    FROM players WHERE name = ?
  `)
};

// ===== ELO CALCULATION =====
function calculateElo(winnerElo, loserElo) {
  var K = 32;
  var expected = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  var newWinner = Math.round(winnerElo + K * (1 - expected));
  var newLoser = Math.round(loserElo + K * (0 - (1 - expected)));
  return { winner: newWinner, loser: Math.max(100, newLoser) };
}

// ===== PUBLIC API =====
function ensurePlayer(name) {
  stmts.upsertPlayer.run(name);
  return stmts.getPlayer.get(name);
}

function getPlayerElo(name) {
  var p = stmts.getPlayer.get(name);
  return p ? p.elo : 1000;
}

function recordMatch(p1Name, p2Name, p1Faction, p2Faction, winnerName, reason, durationTicks, mapId) {
  var loserName = winnerName === p1Name ? p2Name : p1Name;
  var winnerElo = getPlayerElo(winnerName);
  var loserElo = getPlayerElo(loserName);
  var newElo = calculateElo(winnerElo, loserElo);

  stmts.updateElo.run(newElo.winner, 1, 0, winnerName);
  stmts.updateElo.run(newElo.loser, 0, 1, loserName);
  stmts.insertMatch.run(p1Name, p2Name, p1Faction, p2Faction, winnerName, reason, durationTicks, mapId);

  return { winnerElo: newElo.winner, loserElo: newElo.loser };
}

function getLeaderboard(limit) {
  return stmts.getLeaderboard.all(limit || 50);
}

function getMatchHistory(name, limit) {
  return stmts.getMatchHistory.all(name, name, limit || 20);
}

function getPlayerStats(name) {
  return stmts.getPlayerStats.get(name);
}

module.exports = { ensurePlayer, getPlayerElo, recordMatch, getLeaderboard, getMatchHistory, getPlayerStats, db };

// ===== PostgreSQL MIGRATION GUIDE =====
// To switch from SQLite to PostgreSQL:
// 1. npm install pg
// 2. Set env: DATABASE_URL=postgres://user:pass@host:5432/factionwars
// 3. Replace this file with db-pg.js (same exports, pg driver)
// The schema is identical — just change the driver.
