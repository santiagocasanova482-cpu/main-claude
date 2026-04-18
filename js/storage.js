const Storage = {
  KEYS: {
    EXPLORED: 'urbex.explored',
    TRACKS: 'urbex.tracks',
    STATS: 'urbex.stats',
    LAST_VIEW: 'urbex.lastView'
  },

  load() {
    return {
      explored: new Set(this._read(this.KEYS.EXPLORED, [])),
      tracks: this._read(this.KEYS.TRACKS, []),
      stats: this._read(this.KEYS.STATS, {
        totalDistance: 0,
        achievements: [],
        startedAt: Date.now()
      }),
      lastView: this._read(this.KEYS.LAST_VIEW, null)
    };
  },

  saveExplored(exploredSet) {
    localStorage.setItem(this.KEYS.EXPLORED, JSON.stringify([...exploredSet]));
  },

  saveTracks(tracks) {
    const trimmed = tracks.slice(-5000);
    localStorage.setItem(this.KEYS.TRACKS, JSON.stringify(trimmed));
  },

  saveStats(stats) {
    localStorage.setItem(this.KEYS.STATS, JSON.stringify(stats));
  },

  saveLastView(lat, lng, zoom) {
    localStorage.setItem(this.KEYS.LAST_VIEW, JSON.stringify({ lat, lng, zoom }));
  },

  clear() {
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
  },

  _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
};
