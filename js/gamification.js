const Gamification = {
  MILESTONES: [
    { n: 1,   title: 'Primer paso', icon: '👣' },
    { n: 5,   title: 'Explorador novato', icon: '🌱' },
    { n: 10,  title: 'Callejero', icon: '🚶' },
    { n: 25,  title: 'Caminante', icon: '🏃' },
    { n: 50,  title: 'Cartógrafo', icon: '🗺️' },
    { n: 100, title: 'Urbanita', icon: '🏙️' },
    { n: 250, title: 'Descubridor', icon: '🧭' },
    { n: 500, title: 'Maestro urbano', icon: '👑' },
    { n: 1000,title: 'Leyenda', icon: '🏆' }
  ],

  notifyStreet(name) {
    this.toast(`🗺️ Nueva calle: ${name}`, 'info');
  },

  checkAchievements() {
    const count = App.state.explored.size;
    const earned = new Set(App.state.stats.achievements.map(a => a.key));

    this.MILESTONES.forEach(m => {
      const key = `milestone_${m.n}`;
      if (count >= m.n && !earned.has(key)) {
        const ach = {
          key,
          name: `${m.icon} ${m.title}`,
          description: `${m.n} calles exploradas`,
          date: Date.now()
        };
        App.state.stats.achievements.push(ach);
        this.toast(`${m.icon} ¡Logro desbloqueado: ${m.title}!`, 'achievement');
      }
    });

    this._checkZoneCompletion();
    App.renderAchievements();
  },

  _checkZoneCompletion() {
    const total = AppMap.streets.size;
    if (total < 10) return;
    const explored = [...AppMap.streets.keys()].filter(id => App.state.explored.has(id)).length;
    const earned = new Set(App.state.stats.achievements.map(a => a.key));

    const zoneKey = `zone_${AppMap.map.getCenter().lat.toFixed(3)}_${AppMap.map.getCenter().lng.toFixed(3)}`;
    if (explored === total && !earned.has(zoneKey)) {
      App.state.stats.achievements.push({
        key: zoneKey,
        name: `🎊 Zona completada`,
        description: `${total} calles al 100% en esta área`,
        date: Date.now()
      });
      this.toast(`🎊 ¡ZONA COMPLETADA AL 100%! ${total} calles`, 'achievement');
    }
  },

  toast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }
};
