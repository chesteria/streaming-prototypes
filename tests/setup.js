/**
 * Global test setup — runs via setupFiles (before jest framework globals).
 * Only contains module-level code; no beforeEach/afterEach here.
 *
 * BroadcastChannel auto-resets its state in the constructor: analytics.js
 * calls `new BroadcastChannel('proto_analytics')` on every module load
 * (triggered by jest.resetModules() + require() in each test's beforeEach),
 * which clears _posted and _instances for that channel name automatically.
 * No manual beforeEach reset is needed.
 */

// ── BroadcastChannel Mock ──────────────────────────────────────────────────
class BroadcastChannelMock {
  constructor(name) {
    this.name = name;
    this.onmessage = null;
    this._closed = false;

    // Auto-reset state for this channel name on each new construction.
    // analytics.js creates a new BroadcastChannel on every module load,
    // so this clears accumulated messages from prior test iterations.
    BroadcastChannelMock._posted    = BroadcastChannelMock._posted.filter(m => m.channel !== name);
    BroadcastChannelMock._instances = BroadcastChannelMock._instances.filter(i => i.name !== name);

    BroadcastChannelMock._instances.push(this);
  }

  postMessage(data) {
    if (this._closed) return;
    BroadcastChannelMock._posted.push({ channel: this.name, data });
    BroadcastChannelMock._instances
      .filter(i => i !== this && i.name === this.name && !i._closed && i.onmessage)
      .forEach(i => i.onmessage({ data }));
  }

  close() {
    this._closed = true;
  }

  // ── Test helpers ─────────────────────────────────────────────────────────
  static reset() {
    BroadcastChannelMock._instances = [];
    BroadcastChannelMock._posted    = [];
  }

  static postedTo(channelName) {
    return BroadcastChannelMock._posted
      .filter(m => m.channel === channelName)
      .map(m => m.data);
  }
}

BroadcastChannelMock._instances = [];
BroadcastChannelMock._posted    = [];

global.BroadcastChannel = BroadcastChannelMock;
