const AppMap = {
  map: null,
  streetLayer: null,
  userMarker: null,
  userAccuracy: null,
  userPath: null,
  streets: new Map(),
  streetLines: new Map(),
  highlightedLine: null,

  STYLE: {
    unexplored: { color: '#9ca3af', weight: 3, opacity: 0.55 },
    explored:   { color: '#22c55e', weight: 5, opacity: 0.9 },
    suggested:  { color: '#f59e0b', weight: 6, opacity: 1 }
  },

  init() {
    const saved = Storage._read(Storage.KEYS.LAST_VIEW, null);
    const center = saved ? [saved.lat, saved.lng] : [40.4168, -3.7038];
    const zoom = saved ? saved.zoom : 15;

    this.map = L.map('map', { zoomControl: true }).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    this.streetLayer = L.layerGroup().addTo(this.map);
    this.userPath = L.polyline([], {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.75,
      dashArray: '1 0'
    }).addTo(this.map);

    const savedTracks = Storage._read(Storage.KEYS.TRACKS, []);
    if (savedTracks.length) {
      this.userPath.setLatLngs(savedTracks.map(p => [p.lat, p.lng]));
    }

    this.map.on('moveend', () => {
      const c = this.map.getCenter();
      Storage.saveLastView(c.lat, c.lng, this.map.getZoom());
      this.loadStreetsInView();
    });

    this.map.on('click', (e) => {
      if (App.simulateMode) {
        Tracking.registerPointManually(e.latlng.lat, e.latlng.lng);
      }
    });
  },

  async loadStreetsInView() {
    if (this.map.getZoom() < 15) {
      App.setStatus('Haz zoom para cargar calles (zoom ≥ 15)');
      return;
    }
    const b = this.map.getBounds();
    const bounds = [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()];
    App.setStatus('Cargando calles…');
    try {
      const streets = await Overpass.fetchStreets(bounds);
      let added = 0;
      streets.forEach(s => {
        if (this.streets.has(s.id)) return;
        this.streets.set(s.id, s);
        const explored = App.state.explored.has(s.id);
        const style = explored ? this.STYLE.explored : this.STYLE.unexplored;
        const line = L.polyline(s.coords, style);
        line.bindPopup(this._popup(s, explored));
        line.streetId = s.id;
        line.addTo(this.streetLayer);
        this.streetLines.set(s.id, line);
        added++;
      });
      App.setStatus(added ? `+${added} calles cargadas` : '', added ? 1500 : 0);
      App.updateStats();
    } catch (err) {
      console.error(err);
      App.setStatus('Error cargando calles. Reintenta más tarde.', 3500);
    }
  },

  _popup(street, explored) {
    const badge = explored
      ? '<span style="color:#22c55e">✓ Explorada</span>'
      : '<span style="color:#9ca3af">○ Pendiente</span>';
    return `<strong>${this._escape(street.name)}</strong><br>${badge}<br><small>${street.type}</small>`;
  },

  _escape(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  },

  markExplored(streetId) {
    const line = this.streetLines.get(streetId);
    if (!line) return;
    line.setStyle(this.STYLE.explored);
    const s = this.streets.get(streetId);
    if (s) line.bindPopup(this._popup(s, true));
  },

  highlightSuggested(streetId) {
    if (this.highlightedLine) {
      const prev = this.streets.get(this.highlightedLine.streetId);
      const wasExplored = prev && App.state.explored.has(prev.id);
      this.highlightedLine.setStyle(wasExplored ? this.STYLE.explored : this.STYLE.unexplored);
    }
    const line = this.streetLines.get(streetId);
    if (!line) return;
    line.setStyle(this.STYLE.suggested);
    line.bringToFront();
    this.highlightedLine = line;
  },

  clearHighlight() {
    if (this.highlightedLine) {
      const s = this.streets.get(this.highlightedLine.streetId);
      const explored = s && App.state.explored.has(s.id);
      this.highlightedLine.setStyle(explored ? this.STYLE.explored : this.STYLE.unexplored);
      this.highlightedLine = null;
    }
  },

  updateUserLocation(lat, lng, accuracy) {
    if (!this.userMarker) {
      this.userAccuracy = L.circle([lat, lng], {
        radius: accuracy || 20,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 1
      }).addTo(this.map);
      this.userMarker = L.circleMarker([lat, lng], {
        radius: 8,
        color: '#fff',
        weight: 3,
        fillColor: '#3b82f6',
        fillOpacity: 1
      }).addTo(this.map);
    } else {
      this.userMarker.setLatLng([lat, lng]);
      this.userAccuracy.setLatLng([lat, lng]);
      if (accuracy) this.userAccuracy.setRadius(accuracy);
    }
    this.userPath.addLatLng([lat, lng]);
  },

  centerOn(lat, lng, zoom) {
    this.map.setView([lat, lng], zoom || Math.max(this.map.getZoom(), 17));
  },

  clearAllExplored() {
    this.streetLines.forEach((line, id) => {
      line.setStyle(this.STYLE.unexplored);
      const s = this.streets.get(id);
      if (s) line.bindPopup(this._popup(s, false));
    });
    this.userPath.setLatLngs([]);
  }
};
