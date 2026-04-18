const Overpass = {
  ENDPOINTS: [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter'
  ],
  cache: new Map(),
  inflight: new Map(),

  _tileKey(bounds) {
    const factor = 100;
    return bounds.map(n => Math.round(n * factor) / factor).join('|');
  },

  async fetchStreets(bounds) {
    const key = this._tileKey(bounds);
    if (this.cache.has(key)) return this.cache.get(key);
    if (this.inflight.has(key)) return this.inflight.get(key);

    const promise = this._fetchFromAny(bounds).then(streets => {
      this.cache.set(key, streets);
      this.inflight.delete(key);
      return streets;
    }).catch(err => {
      this.inflight.delete(key);
      throw err;
    });

    this.inflight.set(key, promise);
    return promise;
  },

  async _fetchFromAny(bounds) {
    const [s, w, n, e] = bounds;
    const query = `[out:json][timeout:25];
      way[highway~"^(primary|secondary|tertiary|residential|living_street|pedestrian|unclassified|service|footway|path)$"]
         [highway!~"^(motorway|trunk)"]
         (${s},${w},${n},${e});
      out geom tags;`;

    let lastErr = null;
    for (const endpoint of this.ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query)
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        return this._parse(data);
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('No Overpass endpoint responded');
  },

  _parse(data) {
    if (!data.elements) return [];
    return data.elements
      .filter(el => el.type === 'way' && el.geometry && el.geometry.length >= 2)
      .map(way => ({
        id: way.id,
        name: way.tags?.name || way.tags?.ref || 'Calle sin nombre',
        type: way.tags?.highway || 'unknown',
        neighborhood: way.tags?.['addr:suburb'] || way.tags?.['addr:neighbourhood'] || null,
        coords: way.geometry.map(g => [g.lat, g.lon])
      }));
  }
};
