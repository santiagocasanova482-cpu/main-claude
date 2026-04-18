const App = {
  state: {
    explored: new Set(),
    tracks: [],
    stats: { totalDistance: 0, achievements: [], startedAt: Date.now() }
  },
  simulateMode: false,
  _statusTimer: null,

  init() {
    const stored = Storage.load();
    this.state.explored = stored.explored;
    this.state.tracks = stored.tracks;
    this.state.stats = stored.stats;

    AppMap.init();
    this.bindUI();
    this.tryLocate();
    AppMap.loadStreetsInView();
    this.renderAchievements();
    this.updateStats();
  },

  bindUI() {
    const btnTrack = document.getElementById('toggle-tracking');
    btnTrack.onclick = () => {
      if (Tracking.active) {
        Tracking.stop();
        btnTrack.textContent = '▶ Iniciar tracking';
        btnTrack.classList.remove('active');
      } else {
        const ok = Tracking.start();
        if (ok) {
          btnTrack.textContent = '⏸ Detener tracking';
          btnTrack.classList.add('active');
        }
      }
    };

    document.getElementById('suggest-route').onclick = () => Routing.suggestRoute();

    document.getElementById('center-me').onclick = () => {
      if (Tracking.lastPosition) {
        AppMap.centerOn(Tracking.lastPosition.lat, Tracking.lastPosition.lng);
      } else {
        this.tryLocate(true);
      }
    };

    const simBtn = document.getElementById('simulate');
    simBtn.onclick = () => {
      this.simulateMode = !this.simulateMode;
      simBtn.classList.toggle('active', this.simulateMode);
      Gamification.toast(
        this.simulateMode
          ? '🧪 Simulación ON: haz clic en el mapa para marcar calles'
          : '🧪 Simulación OFF',
        'info'
      );
    };

    document.getElementById('reset').onclick = () => {
      if (confirm('¿Seguro que quieres reiniciar todo el progreso?')) {
        Storage.clear();
        location.reload();
      }
    };
  },

  tryLocate(center = false) {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        Tracking.lastPosition = { lat, lng };
        AppMap.updateUserLocation(lat, lng, accuracy);
        if (center || !Storage._read(Storage.KEYS.LAST_VIEW, null)) {
          AppMap.centerOn(lat, lng, 16);
        }
      },
      (err) => console.log('Geolocation:', err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  },

  updateStats() {
    const total = AppMap.streets.size;
    const exploredInView = [...AppMap.streets.keys()]
      .filter(id => this.state.explored.has(id)).length;
    const pct = total ? Math.round((exploredInView / total) * 100) : 0;

    document.getElementById('stat-explored').textContent = exploredInView;
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-percent').textContent = pct + '%';
    document.getElementById('progress-bar').style.width = pct + '%';
    document.getElementById('stat-distance').textContent =
      (this.state.stats.totalDistance / 1000).toFixed(2) + ' km';
    document.getElementById('stat-achievements').textContent =
      this.state.stats.achievements.length;
  },

  renderAchievements() {
    const list = document.getElementById('achievements-list');
    const achievements = [...this.state.stats.achievements].sort((a, b) => b.date - a.date).slice(0, 10);
    if (achievements.length === 0) {
      list.innerHTML = '<li class="empty">Camina para desbloquear logros</li>';
      return;
    }
    list.innerHTML = achievements.map(a => {
      const date = new Date(a.date);
      const label = `${date.getDate()}/${date.getMonth() + 1}`;
      return `<li><span>${this._escape(a.name)}</span><span class="ach-date">${label}</span></li>`;
    }).join('');
  },

  setStatus(message, duration = 0) {
    const bar = document.getElementById('status');
    const text = document.getElementById('status-text');
    if (!message) {
      bar.classList.add('hidden');
      return;
    }
    text.textContent = message;
    bar.classList.remove('hidden');
    clearTimeout(this._statusTimer);
    if (duration > 0) {
      this._statusTimer = setTimeout(() => bar.classList.add('hidden'), duration);
    }
  },

  _escape(str) {
    return String(str).replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
window.addEventListener('beforeunload', () => {
  if (Tracking.active) {
    Storage.saveTracks(AppMap.userPath.getLatLngs().map(ll => ({ lat: ll.lat, lng: ll.lng })));
    Storage.saveStats(App.state.stats);
  }
});
