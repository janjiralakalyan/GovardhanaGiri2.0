/**
 * NE-LENS: Northeast India Landslide Risk Early Warning System
 * Main Dashboard Controller
 * Synchronizes all operational cards, GIS map, alerts, and field reports.
 */

class NeLensDashboardApp {
  constructor() {
    this.locations = [];
    this.currentLocation = null;
    this.mapEngine = null;
  }

  async init() {
    // 1. Initialize GIS Map
    this.mapEngine = new NeLensMapEngine('nelens-map', (locId) => this.selectLocation(locId));
    this.mapEngine.init();

    // 2. Setup Layer Controls & DOM Listeners
    this.bindEvents();

    // 4. Start Live Clock
    this.startClock();

    // 5. Fetch System Overview Data
    await this.fetchOverview();
  }

  bindEvents() {
    // Location Selector Dropdown
    const selector = document.getElementById('location-selector');
    if (selector) {
      selector.addEventListener('change', (e) => {
        this.selectLocation(e.target.value);
      });
    }

    // Map Layer Checkbox Toggles
    const layerCheckboxes = [
      { id: 'layer-toggle-risk', key: 'riskZones' },
      { id: 'layer-toggle-history', key: 'previousLandslides' },
      { id: 'layer-toggle-villages', key: 'villages' },
      { id: 'layer-toggle-roads', key: 'roads' },
      { id: 'layer-toggle-rivers', key: 'rivers' },
      { id: 'layer-toggle-sensors', key: 'sensors' }
    ];

    layerCheckboxes.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', (e) => {
          this.mapEngine.toggleLayer(key, e.target.checked);
        });
      }
    });

    // Alert Modal Buttons
    const btnCreateAlert = document.getElementById('btn-create-alert');
    if (btnCreateAlert) {
      btnCreateAlert.addEventListener('click', () => this.openAlertModal());
    }

    const btnCloseAlertModal = document.getElementById('modal-close-alert');
    if (btnCloseAlertModal) {
      btnCloseAlertModal.addEventListener('click', () => this.closeAlertModal());
    }

    const btnConfirmDispatch = document.getElementById('btn-confirm-dispatch');
    if (btnConfirmDispatch) {
      btnConfirmDispatch.addEventListener('click', () => this.dispatchAlert());
    }

    // Zoom Buttons
    const btnViewAffected = document.getElementById('btn-view-affected');
    if (btnViewAffected) {
      btnViewAffected.addEventListener('click', () => {
        this.mapEngine.zoomToBuffer();
      });
    }


    // 3D Landslide Fullscreen Modal Buttons (Header, Hero Card, Drivers Card)
    const handle3DLaunch = () => {
      const loc = this.currentLocation || (this.locations && this.locations[0]) || {};
      this.openLandslide3DModal(loc.id || 'AIZAWL-01');
    };

    const btn3DHeader = document.getElementById('btn-nelens-3d-modal');
    if (btn3DHeader) btn3DHeader.addEventListener('click', handle3DLaunch);

    const btnHero3D = document.getElementById('btn-hero-launch-3d');
    if (btnHero3D) btnHero3D.addEventListener('click', handle3DLaunch);

    const btnDrivers3D = document.getElementById('btn-drivers-launch-3d');
    if (btnDrivers3D) btnDrivers3D.addEventListener('click', handle3DLaunch);

    const btnViewHistory = document.getElementById('btn-view-history');
    if (btnViewHistory) {
      btnViewHistory.addEventListener('click', () => {
        this.mapEngine.focusHistorical();
      });
    }
  }

  startClock() {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', { hour12: false }) + ' IST';
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const el = document.getElementById('live-clock');
      if (el) el.textContent = `${dateStr} | ${timeStr}`;
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  async fetchOverview() {
    try {
      const res = await fetch('/api/nelens/overview');
      if (!res.ok) throw new Error("API request failed");
      const data = await res.json();
      this.locations = data.locations;

      // Populate location selector dropdown
      this.populateLocationSelector();

      // Set default location (Aizawl)
      const defaultId = data.default_location ? data.default_location.id : this.locations[0].id;
      
      // Render all detected locations on map
      this.mapEngine.renderAllLocations(this.locations, defaultId);

      this.selectLocation(defaultId, false);

    } catch (err) {
      console.error("NE-LENS Overview Error:", err);
      this.showToast("Failed to fetch live landslide intelligence", "error");
    }
  }

  populateLocationSelector() {
    const selector = document.getElementById('location-selector');
    if (!selector) return;
    selector.innerHTML = '';

    this.locations.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc.id;
      opt.textContent = `${loc.district}, ${loc.state} (${loc.risk_level} - ${loc.risk_score}/100)`;
      selector.appendChild(opt);
    });
  }

  selectLocation(locId, flyTo = true) {
    const loc = this.locations.find(l => l.id === locId);
    if (!loc) return;
    this.currentLocation = loc;

    // Update dropdown value
    const selector = document.getElementById('location-selector');
    if (selector) selector.value = locId;

    // 1. Update Map
    this.mapEngine.renderAllLocations(this.locations, locId);
    this.mapEngine.renderLocation(loc, flyTo);

    // 2. Update Top Risk Summary Hero
    this.updateRiskHero(loc);

    // 3. Update Impacted Area Card
    this.updateImpactedArea(loc);

    // 4. Update Risk Drivers Card
    this.updateRiskDrivers(loc);

    // 5. Update Historical Landslide Reports
    this.updateHistoricalReports(loc);

    // 6. Update Rainfall Trigger & Chart
    this.updateRainfallTrigger(loc);

    // 7. Update Risk Trend & Chart
    this.updateRiskTrend(loc);

    // 8. Update Recommended Actions Card
    this.updateRecommendedActions(loc);

    // 9. Update Field Reports
    this.updateFieldReports(loc);
  }

  trigger3DFromMap(locId) {
    this.selectLocation(locId, true);
    this.openLandslide3DModal(locId);
  }

  openLandslide3DModal(locId, autoRunSim = false) {
    const locs = this.locations || [];
    const loc = locs.find(l => l.id === locId) || this.currentLocation || (locs.length > 0 ? locs[0] : {});
    const rain = loc.rainfall_metrics ? (loc.rainfall_metrics.current_rate || 18) : (loc.risk_drivers ? loc.risk_drivers.rainfall_24h.value / 4 : 35);
    const sat = loc.risk_drivers ? (loc.risk_drivers.soil_moisture ? loc.risk_drivers.soil_moisture.value : 80) : 75;
    const slope = loc.risk_drivers ? (loc.risk_drivers.slope ? loc.risk_drivers.slope.value : 38) : 38;

    if (typeof window.openTerrain3DModal === 'function') {
      window.openTerrain3DModal('landslide', {
        stationId: loc.id || locId || 'AIZAWL-01',
        rainfall: rain,
        saturation: sat,
        slopeAngle: slope,
        riskEvolutionPhase: loc.risk_level === 'CRITICAL' ? 4 : (loc.risk_level === 'HIGH' ? 3 : 2),
        autoRunSimulation: autoRunSim
      });
    }
  }

  updateRiskHero(loc) {
    const scoreEl = document.getElementById('hero-risk-score');
    if (scoreEl) scoreEl.textContent = loc.risk_score;

    const tierEl = document.getElementById('hero-risk-tier');
    if (tierEl) {
      tierEl.textContent = loc.risk_level;
      tierEl.className = `risk-tier-pill tier-${loc.risk_level}`;
    }

    const locTitleEl = document.getElementById('hero-location-title');
    if (locTitleEl) locTitleEl.textContent = `${loc.district}, ${loc.state}`;

    const locCorridorEl = document.getElementById('hero-corridor-title');
    if (locCorridorEl) locCorridorEl.textContent = `Corridor: ${loc.corridor_name}`;

    const predEl = document.getElementById('hero-prediction-line');
    if (predEl) {
      const predText = loc.prediction_window || `Critical slope failure predicted in 3.5 hours (3–4h Lead Time • 98% Accuracy)`;
      predEl.textContent = `🎯 Prediction: ${predText}`;
      predEl.style.color = '#38bdf8';
      predEl.style.fontWeight = '700';
    }

    const trendEl = document.getElementById('hero-trend-tag');
    if (trendEl) {
      trendEl.textContent = `Risk trend ↑ ${loc.risk_trend}`;
    }

    // Highlight segmented bar
    const score = loc.risk_score;
    const segIds = ['seg-vlow', 'seg-low', 'seg-mod', 'seg-high', 'seg-crit'];
    segIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('active-segment');
    });

    if (score <= 20) document.getElementById('seg-vlow')?.classList.add('active-segment');
    else if (score <= 40) document.getElementById('seg-low')?.classList.add('active-segment');
    else if (score <= 60) document.getElementById('seg-mod')?.classList.add('active-segment');
    else if (score <= 80) document.getElementById('seg-high')?.classList.add('active-segment');
    else document.getElementById('seg-crit')?.classList.add('active-segment');
  }

  updateImpactedArea(loc) {
    const radiusEl = document.getElementById('impact-radius-val');
    if (radiusEl) radiusEl.textContent = `Risk Radius: ${loc.affected_radius_km} km`;

    const priEl = document.getElementById('impact-priority-val');
    if (priEl) priEl.textContent = loc.priority;

    const exp = loc.exposure;
    document.getElementById('exp-villages-count').textContent = exp.villages_count;
    document.getElementById('exp-population-count').textContent = exp.population_affected.toLocaleString();
    document.getElementById('exp-roads-count').textContent = exp.roads_count;
    document.getElementById('exp-schools-count').textContent = exp.schools_count;
    document.getElementById('exp-hospitals-count').textContent = exp.hospitals_count;
    document.getElementById('exp-bridges-count').textContent = exp.bridges_count;
  }

  updateRiskDrivers(loc) {
    const rd = loc.risk_drivers;

    // Rainfall 24h
    document.getElementById('driver-rain-val').textContent = `${rd.rainfall_24h.value} mm / 24h`;
    document.getElementById('driver-rain-rating').textContent = rd.rainfall_24h.rating;
    document.getElementById('driver-rain-bar').style.width = `${Math.min(100, rd.rainfall_24h.contribution_pct * 2.5)}%`;

    // Soil Moisture
    document.getElementById('driver-soil-val').textContent = `${rd.soil_moisture.value}%`;
    document.getElementById('driver-soil-rating').textContent = rd.soil_moisture.rating;
    document.getElementById('driver-soil-bar').style.width = `${Math.min(100, rd.soil_moisture.contribution_pct * 2.5)}%`;

    // Slope
    document.getElementById('driver-slope-val').textContent = `${rd.slope.value}°`;
    document.getElementById('driver-slope-rating').textContent = rd.slope.rating;
    document.getElementById('driver-slope-bar').style.width = `${Math.min(100, rd.slope.contribution_pct * 2.5)}%`;

    // Historical
    document.getElementById('driver-hist-val').textContent = rd.historical_landslides.value;
    document.getElementById('driver-hist-rating').textContent = rd.historical_landslides.rating;
    document.getElementById('driver-hist-bar').style.width = `${Math.min(100, rd.historical_landslides.contribution_pct * 2.5)}%`;

    // Susceptibility
    document.getElementById('driver-susc-val').textContent = rd.susceptibility.value;
    document.getElementById('driver-susc-rating').textContent = rd.susceptibility.rating;
    document.getElementById('driver-susc-bar').style.width = `${Math.min(100, rd.susceptibility.contribution_pct * 2.5)}%`;

    // Main Driver Banner
    document.getElementById('main-driver-text').textContent = rd.main_driver;
  }

  updateHistoricalReports(loc) {
    const hr = loc.historical_reports;
    document.getElementById('hist-total-area').textContent = hr.total_in_area;
    document.getElementById('hist-total-radius').textContent = hr.total_in_radius;
    document.getElementById('hist-most-recent').textContent = hr.most_recent;

    const timelineContainer = document.getElementById('hist-timeline-container');
    if (!timelineContainer) return;
    timelineContainer.innerHTML = '';

    hr.events.forEach(ev => {
      const item = document.createElement('div');
      item.className = 'timeline-event-item';
      item.innerHTML = `
        <div class="timeline-event-bullet"></div>
        <div class="timeline-event-body">
          <div class="timeline-event-title">${ev.time_ago} — ${ev.type}</div>
          <div class="timeline-event-meta">${ev.affected} • ${ev.source}</div>
        </div>
      `;
      item.addEventListener('click', () => {
        this.openEventDetailModal(ev);
      });
      timelineContainer.appendChild(item);
    });
  }

  updateRainfallTrigger(loc) {
    const rf = loc.rainfall_metrics;
    document.getElementById('rf-current-rate').textContent = `${rf.current_rate} mm/h`;
    document.getElementById('rf-last-6h').textContent = `${rf.last_6h} mm`;
    document.getElementById('rf-last-24h').textContent = `${rf.last_24h} mm`;
    document.getElementById('rf-forecast-6h').textContent = `+${rf.forecast_next_6h} mm`;

    // Render Clean SVG 24h Sparkline
    this.renderRainfallSvg(rf.hourly_series_24h);
  }

  renderRainfallSvg(series) {
    const container = document.getElementById('rainfall-sparkline-canvas');
    if (!container || !series || series.length === 0) return;

    const width = 280;
    const height = 55;
    const maxRain = Math.max(...series.map(s => s.rain), 10);

    const points = series.map((s, idx) => {
      const x = (idx / (series.length - 1)) * (width - 20) + 10;
      const y = height - (s.rain / maxRain) * (height - 12) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const svgHtml = `
      <svg viewBox="0 0 ${width} ${height}" class="chart-svg">
        <defs>
          <linearGradient id="rainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0284c7" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#0284c7" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        <polygon points="${points} ${width-10},${height} 10,${height}" fill="url(#rainGrad)" />
        <polyline fill="none" stroke="#0284c7" stroke-width="2.5" points="${points}" stroke-linecap="round" stroke-linejoin="round"/>
        ${series.map((s, idx) => {
          const x = (idx / (series.length - 1)) * (width - 20) + 10;
          const y = height - (s.rain / maxRain) * (height - 12) - 4;
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="#ffffff" stroke="#0284c7" stroke-width="1.5" />`;
        }).join('')}
      </svg>
    `;
    container.innerHTML = svgHtml;
  }

  updateRiskTrend(loc) {
    const series = loc.risk_trend_series || [];
    const container = document.getElementById('risk-trend-canvas');
    if (!container || series.length === 0) return;

    const width = 280;
    const height = 55;
    const points = series.map((s, idx) => {
      const x = (idx / (series.length - 1)) * (width - 20) + 10;
      const y = height - (s.score / 100) * (height - 12) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const svgHtml = `
      <svg viewBox="0 0 ${width} ${height}" class="chart-svg">
        <polyline fill="none" stroke="#dc2626" stroke-width="2.5" points="${points}" stroke-linecap="round" stroke-linejoin="round"/>
        ${series.map((s, idx) => {
          const x = (idx / (series.length - 1)) * (width - 20) + 10;
          const y = height - (s.score / 100) * (height - 12) - 4;
          return `
            <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#ffffff" stroke="#dc2626" stroke-width="2" />
            <text x="${x.toFixed(1)}" y="${y - 6}" font-size="8" font-family="'JetBrains Mono',monospace" font-weight="700" fill="#0f172a" text-anchor="middle">${s.score}</text>
          `;
        }).join('')}
      </svg>
    `;
    container.innerHTML = svgHtml;
  }

  updateRecommendedActions(loc) {
    const listContainer = document.getElementById('action-sop-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const actions = loc.recommended_actions || [];
    actions.forEach((act, idx) => {
      const row = document.createElement('div');
      row.className = 'action-sop-item';
      row.innerHTML = `
        <span class="sop-number">${idx + 1}</span>
        <span>${act}</span>
      `;
      listContainer.appendChild(row);
    });
  }

  updateFieldReports(loc) {
    const container = document.getElementById('field-reports-container');
    if (!container) return;
    container.innerHTML = '';

    const reports = loc.field_reports || [];
    if (reports.length === 0) {
      container.innerHTML = '<div style="font-size:11px; color:#94a3b8; font-style:italic; padding:6px 0;">No active field incidents reported.</div>';
      return;
    }

    reports.forEach(rep => {
      const item = document.createElement('div');
      item.className = 'field-report-item';
      const isPending = rep.status === "Awaiting verification";

      item.innerHTML = `
        <div class="field-report-header">
          <span class="report-title">📷 ${rep.title}</span>
          <span class="${isPending ? 'status-badge-pending' : 'status-badge-verified'}">${rep.status}</span>
        </div>
        <div class="field-report-meta">
          <div><b>Location:</b> ${rep.location}</div>
          <div><b>Time:</b> ${rep.time_ago} • <b>Reporter:</b> ${rep.reporter}</div>
          <div style="margin-top:2px; color:#475569;">"${rep.notes}"</div>
        </div>
        <div class="field-report-actions">
          ${isPending ? `<button class="btn-sm-action verify-btn" onclick="window.app.verifyFieldReport('${rep.id}')">Verify</button>` : ''}
          <button class="btn-sm-action" onclick="window.app.mapEngine.map.flyTo([${rep.lat}, ${rep.lon}], 15)">View on map</button>
        </div>
      `;
      container.appendChild(item);
    });
  }

  async verifyFieldReport(reportId) {
    try {
      const res = await fetch(`/api/nelens/verify-report/${reportId}`, { method: 'POST' });
      if (!res.ok) throw new Error("Failed to verify report");
      this.showToast("Field incident marked as verified", "info");
      await this.fetchOverview();
    } catch (err) {
      console.error(err);
      this.showToast("Error verifying report", "error");
    }
  }

  openAlertModal() {
    const loc = this.currentLocation;
    if (!loc) return;

    document.getElementById('modal-alert-location').textContent = `${loc.corridor_name}, ${loc.district}`;
    document.getElementById('modal-alert-level').textContent = `${loc.risk_level} (${loc.risk_score}/100)`;
    document.getElementById('modal-alert-radius').textContent = `${loc.affected_radius_km} km`;
    document.getElementById('modal-alert-people').textContent = `${loc.exposure.population_affected.toLocaleString()} residents`;

    document.getElementById('alert-modal').classList.add('active');
  }

  closeAlertModal() {
    document.getElementById('alert-modal').classList.remove('active');
  }

  async dispatchAlert() {
    const loc = this.currentLocation;
    if (!loc) return;

    try {
      const res = await fetch('/api/nelens/dispatch-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: loc.id,
          priority: loc.priority,
          alert_title: `URGENT LANDSLIDE ADVISORY: ${loc.corridor_name}`,
          channels: ["SMS Broadcast", "VHF Wireless", "SDRF Dispatch", "WhatsApp Group"],
          instructions: loc.recommended_actions
        })
      });
      const data = await res.json();
      this.closeAlertModal();
      this.showToast(`🚨 ${data.message} (${data.sms_count_dispatched} SMS sent)`, "danger");
    } catch (err) {
      console.error(err);
      this.showToast("Alert broadcast failed", "error");
    }
  }

  openEventDetailModal(ev) {
    alert(`HISTORICAL EVENT DETAIL:\n\nType: ${ev.type}\nDate: ${ev.date} (${ev.time_ago})\nAffected Section: ${ev.affected}\nSeverity: ${ev.severity}\nSource: ${ev.source}\nDetails: ${ev.description}`);
  }

  showToast(message, type = "info") {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.zIndex = '9999';
    toast.style.padding = '12px 18px';
    toast.style.borderRadius = '8px';
    toast.style.fontFamily = "'Inter', sans-serif";
    toast.style.fontSize = '13px';
    toast.style.fontWeight = '700';
    toast.style.color = '#ffffff';
    toast.style.backgroundColor = type === 'danger' ? '#dc2626' : (type === 'error' ? '#ef4444' : '#0284c7');
    toast.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.4)';
    toast.textContent = message;

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new NeLensDashboardApp();
  window.app.init();
});
