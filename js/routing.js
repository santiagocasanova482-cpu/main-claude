const Routing = {
  suggestRoute() {
    const origin = this._origin();
    if (!origin) {
      Gamification.toast('📍 Necesitamos tu ubicación. Centra o activa tracking.', 'warn');
      return;
    }

    const unexplored = [...AppMap.streets.values()]
      .filter(s => !App.state.explored.has(s.id));

    if (unexplored.length === 0) {
      Gamification.toast('🎉 ¡Todas las calles visibles ya están exploradas!', 'achievement');
      return;
    }

    const scored = unexplored.map(s => {
      const line = turf.lineString(s.coords.map(c => [c[1], c[0]]));
      const nearest = turf.nearestPointOnLine(
        line,
        turf.point([origin.lng, origin.lat]),
        { units: 'meters' }
      );
      const dist = nearest.properties.dist;
      const lengthM = turf.length(line, { units: 'meters' });
      const score = dist - Math.min(lengthM, 300) * 0.3;
      return { street: s, dist, lengthM, score, entry: nearest.geometry.coordinates };
    }).sort((a, b) => a.score - b.score);

    const best = scored[0];
    AppMap.highlightSuggested(best.street.id);
    AppMap.centerOn(best.entry[1], best.entry[0]);

    Gamification.toast(
      `🎯 Ve a "${best.street.name}" · ${Math.round(best.dist)}m · ${Math.round(best.lengthM)}m de calle nueva`,
      'info',
      5000
    );
  },

  _origin() {
    if (Tracking.lastPosition) return Tracking.lastPosition;
    if (AppMap.userMarker) {
      const ll = AppMap.userMarker.getLatLng();
      return { lat: ll.lat, lng: ll.lng };
    }
    return null;
  }
};
