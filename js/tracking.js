const Tracking = {
  watchId: null,
  lastPosition: null,
  active: false,
  MIN_ACCURACY_METERS: 50,
  SNAP_TOLERANCE_METERS: 25,

  start() {
    if (!navigator.geolocation) {
      Gamification.toast('⚠️ Geolocalización no soportada en este navegador', 'warn');
      return false;
    }
    this.active = true;
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos),
      (err) => this.handleError(err),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
    );
    Gamification.toast('🛰️ Tracking activo. ¡A caminar!', 'info');
    return true;
  },

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    this.watchId = null;
    this.active = false;
    Storage.saveTracks(AppMap.userPath.getLatLngs().map(ll => ({ lat: ll.lat, lng: ll.lng })));
    Storage.saveStats(App.state.stats);
  },

  handleError(err) {
    const map = {
      1: 'Permiso denegado. Concede acceso a la ubicación.',
      2: 'Ubicación no disponible.',
      3: 'Tiempo de espera agotado.'
    };
    Gamification.toast('⚠️ ' + (map[err.code] || err.message), 'warn', 5000);
  },

  handlePosition(pos) {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    if (accuracy > this.MIN_ACCURACY_METERS) {
      App.setStatus(`Precisión baja (${Math.round(accuracy)}m). Esperando mejor señal…`, 2000);
      return;
    }

    AppMap.updateUserLocation(lat, lng, accuracy);

    if (this.lastPosition) {
      const d = turf.distance(
        [this.lastPosition.lng, this.lastPosition.lat],
        [lng, lat],
        { units: 'meters' }
      );
      if (d < 200) {
        App.state.stats.totalDistance += d;
      }
    }
    this.lastPosition = { lat, lng };
    this.detectStreet(lat, lng);

    if ((AppMap.userPath.getLatLngs().length % 20) === 0) {
      Storage.saveTracks(AppMap.userPath.getLatLngs().map(ll => ({ lat: ll.lat, lng: ll.lng })));
      Storage.saveStats(App.state.stats);
    }

    App.updateStats();
  },

  registerPointManually(lat, lng) {
    AppMap.updateUserLocation(lat, lng, 10);
    this.lastPosition = { lat, lng };
    this.detectStreet(lat, lng);
    Storage.saveTracks(AppMap.userPath.getLatLngs().map(ll => ({ lat: ll.lat, lng: ll.lng })));
    App.updateStats();
  },

  detectStreet(lat, lng) {
    const point = turf.point([lng, lat]);
    let closest = null;
    let minDist = this.SNAP_TOLERANCE_METERS;

    for (const street of AppMap.streets.values()) {
      if (App.state.explored.has(street.id)) continue;
      const line = turf.lineString(street.coords.map(c => [c[1], c[0]]));
      const dist = turf.pointToLineDistance(point, line, { units: 'meters' });
      if (dist < minDist) {
        minDist = dist;
        closest = street;
      }
    }

    if (closest) {
      App.state.explored.add(closest.id);
      Storage.saveExplored(App.state.explored);
      AppMap.markExplored(closest.id);
      Gamification.notifyStreet(closest.name);
      Gamification.checkAchievements();
    }
  }
};
