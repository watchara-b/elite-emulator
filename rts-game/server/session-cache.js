// ===== IN-MEMORY SESSION CACHE (Redis-compatible API) =====
// Drop-in replacement for Redis in prototype/dev. Same API surface.
// Supports TTL expiry, key-value ops, and pub/sub pattern.

class SessionCache {
  constructor() {
    this._store = new Map();
    this._ttls = new Map();
    this._subs = new Map();
    // Cleanup expired keys every 10 seconds
    this._timer = setInterval(() => this._cleanup(), 10000);
  }

  // GET key
  get(key) {
    if (this._isExpired(key)) { this._del(key); return null; }
    var entry = this._store.get(key);
    return entry !== undefined ? entry : null;
  }

  // SET key value [EX seconds]
  set(key, value, ttlSeconds) {
    this._store.set(key, value);
    if (ttlSeconds) this._ttls.set(key, Date.now() + ttlSeconds * 1000);
    else this._ttls.delete(key);
    return 'OK';
  }

  // DEL key
  del(key) { this._del(key); return this._store.has(key) ? 0 : 1; }

  // EXISTS key
  exists(key) {
    if (this._isExpired(key)) { this._del(key); return 0; }
    return this._store.has(key) ? 1 : 0;
  }

  // EXPIRE key seconds
  expire(key, seconds) {
    if (!this._store.has(key)) return 0;
    this._ttls.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  // TTL key (returns seconds remaining, -1 if no expiry, -2 if not exists)
  ttl(key) {
    if (!this._store.has(key)) return -2;
    var exp = this._ttls.get(key);
    if (!exp) return -1;
    var remaining = Math.ceil((exp - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  // INCR key
  incr(key) {
    var val = parseInt(this.get(key)) || 0;
    this._store.set(key, val + 1);
    return val + 1;
  }

  // HSET hash field value
  hset(hash, field, value) {
    var h = this._store.get(hash);
    if (!h || typeof h !== 'object') { h = {}; this._store.set(hash, h); }
    h[field] = value;
    return 1;
  }

  // HGET hash field
  hget(hash, field) {
    var h = this._store.get(hash);
    return (h && typeof h === 'object') ? (h[field] !== undefined ? h[field] : null) : null;
  }

  // HGETALL hash
  hgetall(hash) {
    var h = this._store.get(hash);
    return (h && typeof h === 'object') ? Object.assign({}, h) : null;
  }

  // KEYS pattern (simple glob: * matches anything)
  keys(pattern) {
    var regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    var result = [];
    for (var [k] of this._store) {
      if (!this._isExpired(k) && regex.test(k)) result.push(k);
    }
    return result;
  }

  // PUBLISH channel message
  publish(channel, message) {
    var subs = this._subs.get(channel);
    if (subs) subs.forEach(function(cb) { cb(channel, message); });
    return subs ? subs.length : 0;
  }

  // SUBSCRIBE channel callback
  subscribe(channel, callback) {
    if (!this._subs.has(channel)) this._subs.set(channel, []);
    this._subs.get(channel).push(callback);
  }

  // Internal
  _isExpired(key) {
    var exp = this._ttls.get(key);
    return exp && Date.now() > exp;
  }
  _del(key) { this._store.delete(key); this._ttls.delete(key); }
  _cleanup() {
    for (var [key] of this._ttls) {
      if (this._isExpired(key)) this._del(key);
    }
  }

  // Stats
  dbsize() { return this._store.size; }
  flushall() { this._store.clear(); this._ttls.clear(); return 'OK'; }

  destroy() { clearInterval(this._timer); }
}

module.exports = SessionCache;
