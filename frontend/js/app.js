/**
 * GovardhanaGiri 2.0: Core Command Center Application Controller
 * Handles live polling, station state synchronization, AI prediction displays,
 * "What-If" slider simulation, and emergency warning dispatch.
 */

class GovardhanaGiriApp {
  constructor() {
    this.stations = [];
    this.selectedStationId = "TEL-STN-03"; // Default: Medaram (SS Tadwai)
    this.mapEngine = null;
    this.terrain3D = null;
    this.isSirenActive = false;
    this.autoRefreshInterval = null;
  }

  async init() {
    // 1. Initialize Leaflet Map
    this.mapEngine = new FloodMapEngine('flood-map', (id) => this.selectStation(id));
    await this.mapEngine.init();

    // 2. Initialize 3D Terrain & Hydrodynamic Surge Engine
    if (typeof Terrain3DComponent !== 'undefined') {
      this.terrain3D = new Terrain3DComponent('inspector-3d-terrain-mount', {
        mode: 'flood',
        title: '3D River Canyon & Inundation DEM (Telangana)'
      });
    }

    // 3. Setup Event Listeners
    this.bindEvents();

    // 4. Start Clock
    this.startClock();

    // 5. Fetch Initial Station Data
    await this.fetchStations();

    // 6. Fit All 10 Telangana Hotspots across the State
    this.mapEngine.fitAllStations();

    // 7. Select Default Station for inspector without auto-zooming
    this.selectStation(this.selectedStationId, false);
  }

  bindEvents() {
    // Basemap Layer Switcher (Dark Ops, Topo Contours, Satellite, Streets)
    document.querySelectorAll('.basemap-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.basemap-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const basemapKey = e.target.getAttribute('data-basemap');
        this.mapEngine.switchBaseLayer(basemapKey);
        this.showToast(`Switched basemap to ${e.target.textContent}`, "info");
      });
    });

    // Map Hazard Filter Buttons
    document.querySelectorAll('.map-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.map-filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const filter = e.target.getAttribute('data-filter');
        this.mapEngine.setFilter(filter);
        this.mapEngine.renderStations(this.stations, this.selectedStationId);
      });
    });

    // Toggle Rivers & Drainage Layer
    const riverBtn = document.getElementById('btn-toggle-rivers');
    if (riverBtn) {
      riverBtn.addEventListener('click', () => {
        const active = this.mapEngine.toggleRivers();
        riverBtn.classList.toggle('active', active);
        this.showToast(active ? "🌊 River & Stream corridors enabled" : "River corridors hidden", "info");
      });
    }

    // Toggle Ghats & Mountain Ranges Layer
    const ghatBtn = document.getElementById('btn-toggle-ghats');
    if (ghatBtn) {
      ghatBtn.addEventListener('click', () => {
        const active = this.mapEngine.toggleGhats();
        ghatBtn.classList.toggle('active', active);
        this.showToast(active ? "🏔️ Ghat & Mountain ranges enabled" : "Ghat ranges hidden", "info");
      });
    }

    // Inspector Tabs (Telemetry vs Simulator vs 3D Terrain vs Shelters)
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        const tabId = e.target.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');

        // If switching to 3D tab, trigger resize observer on Three.js canvas
        if (tabId === 'tab-3d-terrain' && this.terrain3D && this.terrain3D.visualizer) {
          const curr = this.stations.find(s => s.id === this.selectedStationId);
          if (curr) this.terrain3D.updateWithStationTelemetry(curr);
          setTimeout(() => this.terrain3D.visualizer.onWindowResize(), 30);
          setTimeout(() => this.terrain3D.visualizer.onWindowResize(), 120);
          setTimeout(() => this.terrain3D.visualizer.onWindowResize(), 350);
        }

        // Show shelters only when the user is on the Shelters tab
        if (tabId === 'tab-shelters') {
          this.mapEngine.showShelters = true;
          const curr = this.stations.find(s => s.id === this.selectedStationId);
          if (curr) {
            this.mapEngine.renderShelters(curr.shelters, curr.lat, curr.lon);
            this.mapEngine.flyToStation(curr.lat, curr.lon, 12);
          }
        } else {
          this.mapEngine.showShelters = false;
          this.mapEngine.shelterLayerGroup.clearLayers();
        }
      });
    });

    // 3D Fullscreen Modal Buttons (Top Bar, Tab Expand, & Quick Launch)
    const open3dBtn = document.getElementById('btn-open-3d-modal');
    const open3dDssBtn = document.getElementById('btn-open-3d-dss');
    const expand3dBtn = document.getElementById('btn-expand-3d');
    const quickLaunch3dBtn = document.getElementById('btn-quick-launch-3d');

    const handleOpen3D = (autoRunSim = false) => {
      const stns = this.stations || [];
      const curr = stns.find(s => s.id === this.selectedStationId) || (stns.length > 0 ? stns[0] : {});
      const tel = curr ? (curr.telemetry || {}) : {};
      if (typeof window.openTerrain3DModal === 'function') {
        window.openTerrain3DModal('flood', {
          stationId: this.selectedStationId || (curr && curr.id) || 'TEL-STN-03',
          rainfall: tel.Rainfall_Intensity !== undefined ? tel.Rainfall_Intensity : 12.0,
          saturation: tel.Soil_Saturation !== undefined ? tel.Soil_Saturation : 55.0,
          waterLevel: tel.Water_Level !== undefined ? tel.Water_Level : 2.4,
          autoRunSimulation: autoRunSim
        });
      }
    };

    if (open3dBtn) open3dBtn.addEventListener('click', () => handleOpen3D(false));
    if (open3dDssBtn) open3dDssBtn.addEventListener('click', () => handleOpen3D(false));
    if (expand3dBtn) {
      expand3dBtn.addEventListener('click', () => {
        if (this.terrain3D && typeof this.terrain3D.toggleCompleteScreen === 'function') {
          this.terrain3D.toggleCompleteScreen();
        } else {
          handleOpen3D(false);
        }
      });
    }
    if (quickLaunch3dBtn) quickLaunch3dBtn.addEventListener('click', () => handleOpen3D(true));

    // Master 4-Hour AI Risk Progression Analyse Buttons
    const btnAnalyseMain = document.getElementById('btn-analyse-main');
    if (btnAnalyseMain) {
      btnAnalyseMain.addEventListener('click', () => {
        this.triggerAnalysePoint();
      });
    }

    const btnMapAnalyse = document.getElementById('btn-map-analyse');
    if (btnMapAnalyse) {
      btnMapAnalyse.addEventListener('click', () => {
        this.triggerAnalysePoint();
      });
    }

    // Reset Map to State Overview (Fit All 10 Stations)
    const fitBtn = document.getElementById('btn-fit-all');
    if (fitBtn) {
      fitBtn.addEventListener('click', () => {
        this.mapEngine.fitAllStations();
        this.showToast("Reset map to full Telangana state overview (10 stations)", "info");
      });
    }

    // Cloudburst Shockwave Trigger Button
    document.getElementById('btn-cloudburst').addEventListener('click', () => {
      this.triggerCloudburst();
    });

    // Reset Normal Monsoon Button
    document.getElementById('btn-reset-normal').addEventListener('click', () => {
      this.resetStation();
    });

    // Emergency Siren Trigger Button
    document.getElementById('btn-toggle-siren').addEventListener('click', () => {
      this.toggleSiren();
    });

    // Dispatch Evacuation Alert Button
    document.getElementById('btn-dispatch-alert').addEventListener('click', () => {
      this.dispatchEmergencyAlert();
    });

    // Telemetry Sliders Live Updates
    ['slider-rain-int', 'slider-soil-sat', 'slider-water-lvl', 'slider-rain-1h'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', (e) => this.onSliderChange(e));
      }
    });

    // Apply Telemetry from Sliders
    document.getElementById('btn-apply-telemetry').addEventListener('click', () => {
      this.applyCustomTelemetry();
    });

    // 3D Flood Map Fast Trigger Button on Map Bar
    const btn3dDss = document.getElementById('btn-open-3d-dss');
    if (btn3dDss) {
      btn3dDss.addEventListener('click', () => {
        const tab3d = document.querySelector('.tab-btn[data-tab="tab-3d-terrain"]');
        if (tab3d) tab3d.click();
        const mount = document.getElementById('tab-3d-terrain');
        if (mount) mount.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }

  startClock() {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', { hour12: false }) + ' IST';
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const el = document.getElementById('header-clock');
      if (el) el.textContent = `${dateStr} | ${timeStr}`;
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  async fetchStations() {
    try {
      const res = await fetch('/api/stations');
      if (!res.ok) throw new Error('Failed to fetch station data');
      const data = await res.json();
      this.stations = data.stations;

      // Update Top HUD
      document.getElementById('hud-stations-count').textContent = data.summary.total_stations;
      document.getElementById('hud-critical-count').textContent = data.summary.critical_evacuations_active;
      document.getElementById('hud-warning-count').textContent = data.summary.warnings_active;
      document.getElementById('hud-at-risk-pop').textContent = data.summary.population_at_risk.toLocaleString();

      // Render Map & Strip
      this.mapEngine.renderStations(this.stations, this.selectedStationId);
      this.renderStationStrip();

      // Refresh current inspector if selected
      const curr = this.stations.find(s => s.id === this.selectedStationId);
      if (curr) this.updateInspectorUI(curr);

    } catch (err) {
      console.error("API error:", err);
      this.showToast("Failed to connect to GovardhanaGiri Backend", "error");
    }
  }

  renderStationStrip() {
    const container = document.getElementById('stations-carousel');
    if (!container) return;
    container.innerHTML = '';

    this.stations.forEach(stn => {
      const risk = stn.prediction ? stn.prediction.risk_level : 'Low';
      const pill = document.createElement('div');
      pill.className = `station-pill ${stn.id === this.selectedStationId ? 'active' : ''}`;
      pill.innerHTML = `
        <div class="station-pill-indicator indicator-${risk}"></div>
        <div>
          <div class="station-pill-name">${stn.village_area.split('(')[0].trim()}</div>
          <div class="station-pill-district">${stn.mandal}, ${stn.district}</div>
        </div>
      `;
      pill.addEventListener('click', () => this.selectStation(stn.id));
      container.appendChild(pill);
    });
  }

  selectStation(stationId, flyTo = true) {
    this.selectedStationId = stationId;
    const stn = this.stations.find(s => s.id === stationId);
    if (!stn) return;

    // Update Map
    if (flyTo) {
      this.mapEngine.flyToStation(stn.lat, stn.lon, 11);
    }
    this.mapEngine.renderStations(this.stations, stationId);
    if (this.mapEngine.showShelters) {
      this.mapEngine.renderShelters(stn.shelters, stn.lat, stn.lon);
    }

    // Update Station Strip Active State
    this.renderStationStrip();

    // Update Inspector UI & 3D Terrain
    this.updateInspectorUI(stn);
  }

  trigger3DFromMap(stationId) {
    this.selectStation(stationId, true);
    // Switch to 3D tab
    const tab3dBtn = document.querySelector('.tab-btn[data-tab="tab-3d-terrain"]');
    if (tab3dBtn) tab3dBtn.click();
    const mount = document.getElementById('tab-3d-terrain');
    if (mount) {
      mount.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  updateInspectorUI(stn) {
    const pred = stn.prediction || {
      risk_level: 'Low',
      flood_probability_pct: 5.0,
      lead_time_hours: 12.0,
      lead_time_minutes: 720,
      sop: { action: 'Normal baseflow' }
    };

    // 1. Hazard Banner
    const banner = document.getElementById('hazard-banner');
    banner.className = `hazard-banner tier-${pred.risk_level}`;
    document.getElementById('ins-station-title').textContent = stn.village_area;
    document.getElementById('ins-station-coords').textContent = `${stn.lat.toFixed(4)}°N, ${stn.lon.toFixed(4)}°E | Elev: ${stn.elevation}m | Slope: ${stn.slope}°`;
    
    const badge = document.getElementById('ins-risk-badge');
    badge.className = `risk-badge badge-${pred.risk_level}`;
    const accPct = pred.prediction_accuracy_pct || 98.2;
    badge.textContent = `● ${pred.risk_level} RISK (${accPct}% AI Accuracy)`;

    // Evacuation Lead Time (3–4 Hours Advance Warning Window)
    const leadTimeVal = document.getElementById('ins-lead-time');
    const leadHrs = pred.lead_time_hours ? pred.lead_time_hours.toFixed(1) : '3.5';
    const leadMins = pred.lead_time_minutes || Math.round(parseFloat(leadHrs) * 60);
    leadTimeVal.textContent = `${leadHrs} hrs (~${leadMins}m)`;
    if (pred.risk_level === 'Critical' || parseFloat(leadHrs) <= 3.5) {
      leadTimeVal.className = 'lead-time-val urgent';
    } else {
      leadTimeVal.className = 'lead-time-val';
    }

    document.getElementById('ins-lead-time-sub').textContent = 
      pred.risk_level === 'Critical' ? '🚨 3–4 HOURS ADVANCE EVACUATION WINDOW (98% ACCURACY)' : 'Safe Advance Evacuation Window Remaining (98% Accuracy)';
    
    document.getElementById('ins-sop-action').textContent = pred.sop ? (pred.sop.action || 'Routine monitoring.') : 'Routine monitoring.';

    // 2. River Stage Gauge
    const stage = stn.telemetry.Water_Level;
    const danger = stn.danger_water_level;
    const pct = Math.min(100, Math.max(5, (stage / danger) * 75));
    document.getElementById('gauge-stage-val').textContent = `${stage} m`;
    document.getElementById('gauge-danger-val').textContent = `${danger} m`;
    document.getElementById('gauge-fill-bar').style.width = `${pct}%`;

    // 3. Telemetry Grid Values
    document.getElementById('tel-val-rain-1h').textContent = `${stn.telemetry.Rainfall_1h} mm`;
    document.getElementById('tel-val-rain-6h').textContent = `${stn.telemetry.Rainfall_6h} mm`;
    document.getElementById('tel-val-intensity').textContent = `${stn.telemetry.Rainfall_Intensity} mm/h`;
    document.getElementById('tel-val-soil-moist').textContent = `${stn.telemetry.Soil_Moisture}%`;
    document.getElementById('tel-val-soil-sat').textContent = `${stn.telemetry.Soil_Saturation}%`;
    document.getElementById('tel-val-infil').textContent = `${stn.telemetry.Infiltration_Rate} mm/h`;
    document.getElementById('tel-val-river-dist').textContent = `${stn.distance_to_river} m`;
    document.getElementById('tel-val-flow-accum').textContent = stn.flow_accumulation.toLocaleString();
    document.getElementById('tel-val-land-cover').textContent = stn.land_cover.split('&')[0].trim();

    // 4. Update Sliders to match current telemetry
    document.getElementById('slider-rain-int').value = stn.telemetry.Rainfall_Intensity;
    document.getElementById('slider-rain-int-val').textContent = `${stn.telemetry.Rainfall_Intensity} mm/h`;

    document.getElementById('slider-soil-sat').value = stn.telemetry.Soil_Saturation;
    document.getElementById('slider-soil-sat-val').textContent = `${stn.telemetry.Soil_Saturation} %`;

    document.getElementById('slider-water-lvl').value = stn.telemetry.Water_Level;
    document.getElementById('slider-water-lvl-val').textContent = `${stn.telemetry.Water_Level} m`;

    document.getElementById('slider-rain-1h').value = stn.telemetry.Rainfall_1h;
    document.getElementById('slider-rain-1h-val').textContent = `${stn.telemetry.Rainfall_1h} mm`;

    // 5. Update 3D Terrain & Hydrodynamic Component
    if (this.terrain3D) {
      this.terrain3D.updateWithStationTelemetry(stn);
    }

    // 6. Update AI Action Plan inspector preview
    const foodElem = document.getElementById('ins-copilot-food');
    const boatsElem = document.getElementById('ins-copilot-boats');
    if (foodElem && boatsElem) {
      const pop = stn.population || 5000;
      const mult = pred.risk_level === 'Critical' ? 1.0 : (pred.risk_level === 'High' ? 0.65 : 0.3);
      const targetPop = Math.max(100, Math.floor(pop * mult));
      foodElem.textContent = `${(targetPop * 6).toLocaleString()} pkts`;
      const boats = Math.max(2, Math.ceil((targetPop * 0.20) / 40));
      boatsElem.textContent = `${boats} IRBs`;
    }

    // 6. Update Shelters List
    const shelterContainer = document.getElementById('shelter-list-container');
    shelterContainer.innerHTML = '';
    stn.shelters.forEach(sh => {
      const card = document.createElement('div');
      card.className = 'shelter-card';
      card.innerHTML = `
        <div>
          <div class="shelter-name">${sh.name}</div>
          <div class="shelter-meta">${sh.type} • Elev: +${sh.elevation_m}m • Dist: ${sh.distance_km} km</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px; font-weight:700; color:#38bdf8;">Cap: ${sh.capacity}</div>
          <div style="font-size:10px; color:#34d399;">${sh.contact}</div>
        </div>
      `;
      shelterContainer.appendChild(card);
    });

    // Play chime if critical
    if (pred.risk_level === 'Critical' && window.disasterAudio) {
      window.disasterAudio.playCriticalChime();
    }
  }

  onSliderChange(e) {
    const id = e.target.id;
    const val = e.target.value;
    if (id === 'slider-rain-int') document.getElementById('slider-rain-int-val').textContent = `${val} mm/h`;
    if (id === 'slider-soil-sat') document.getElementById('slider-soil-sat-val').textContent = `${val} %`;
    if (id === 'slider-water-lvl') document.getElementById('slider-water-lvl-val').textContent = `${val} m`;
    if (id === 'slider-rain-1h') document.getElementById('slider-rain-1h-val').textContent = `${val} mm`;
  }

  async applyCustomTelemetry() {
    const rainInt = parseFloat(document.getElementById('slider-rain-int').value);
    const soilSat = parseFloat(document.getElementById('slider-soil-sat').value);
    const waterLvl = parseFloat(document.getElementById('slider-water-lvl').value);
    const rain1h = parseFloat(document.getElementById('slider-rain-1h').value);

    try {
      const res = await fetch(`/api/stations/${this.selectedStationId}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Rainfall_Intensity: rainInt,
          Soil_Saturation: soilSat,
          Soil_Moisture: Math.min(100, Math.round(soilSat * 0.94)),
          Water_Level: waterLvl,
          Rainfall_1h: rain1h,
          Rainfall_3h: roundTo1(rain1h * 1.6),
          Rainfall_6h: roundTo1(rain1h * 2.2)
        })
      });
      const data = await res.json();
      this.showToast(`Custom telemetry simulated on ${data.station.village_area}`, "info");
      await this.fetchStations();
    } catch (err) {
      console.error(err);
      this.showToast("Failed to apply telemetry update", "error");
    }
  }

  async triggerCloudburst() {
    try {
      const res = await fetch(`/api/stations/${this.selectedStationId}/simulate-cloudburst`, {
        method: 'POST'
      });
      const data = await res.json();
      this.showToast(`⚡ CLOUDBURST INJECTED: Sudden extreme surge at ${data.station.village_area}!`, "danger");
      if (window.disasterAudio) {
        window.disasterAudio.playCriticalChime();
      }
      await this.fetchStations();
    } catch (err) {
      console.error(err);
      this.showToast("Failed to trigger cloudburst simulation", "error");
    }
  }

  async resetStation() {
    try {
      const res = await fetch(`/api/stations/${this.selectedStationId}/reset-normal`, {
        method: 'POST'
      });
      const data = await res.json();
      this.showToast(`Reset ${data.station.village_area} to calm monsoon conditions`, "info");
      if (this.isSirenActive) this.toggleSiren(false);
      await this.fetchStations();
    } catch (err) {
      console.error(err);
      this.showToast("Failed to reset station", "error");
    }
  }

  toggleSiren(forceState) {
    const newState = forceState !== undefined ? forceState : !this.isSirenActive;
    this.isSirenActive = newState;
    if (window.disasterAudio) {
      window.disasterAudio.toggleSiren(this.isSirenActive);
    }
    const btn = document.getElementById('btn-toggle-siren');
    if (this.isSirenActive) {
      btn.classList.add('active');
      btn.innerHTML = '🔊 Public Siren: ACTIVE (Mute)';
      this.showToast("EMERGENCY SIRENS ACTIVATED ACROSS WARD CHANNELS", "danger");
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '🔈 Test Warning Siren';
    }
  }

  async dispatchEmergencyAlert() {
    const stn = this.stations.find(s => s.id === this.selectedStationId);
    if (!stn) return;
    const risk = stn.prediction ? stn.prediction.risk_level : 'High';

    try {
      const res = await fetch('/api/dispatch-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          station_id: this.selectedStationId,
          alert_tier: risk,
          channels: ["public_siren", "sms_broadcast", "sdrf_dispatch"]
        })
      });
      const data = await res.json();
      this.showToast(`🚨 DISPATCH SUCCESS: ${data.actions_taken.sms_broadcast_count} SMS alerts broadcasted to ${data.village_area}! SDRF boat unit mobilized.`, "danger");
      this.toggleSiren(true);
    } catch (err) {
      console.error(err);
      this.showToast("Alert dispatch failed", "error");
    }
  }

  triggerAnalysePoint(targetStationId = null) {
    // 1. Pick requested station, or currently active station, or highest risk station
    let targetId = targetStationId || this.selectedStationId;
    if (!targetStationId) {
      // Find critical or high station, or default to Medaram / Bhadrachalam
      const crit = this.stations.find(s => s.prediction && s.prediction.risk_level === 'Critical');
      const high = this.stations.find(s => s.prediction && s.prediction.risk_level === 'High');
      targetId = (crit && crit.id) || (high && high.id) || targetId || 'TEL-STN-03';
    }

    const stn = this.stations.find(s => s.id === targetId) || this.stations[0];
    if (!stn) return;

    this.selectedStationId = stn.id;

    // 2. Scroll to map and zoom in deeply into the station with smooth flyTo
    const mapEl = document.getElementById('flood-map');
    if (mapEl) {
      mapEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    this.selectStation(stn.id, false);
    if (this.mapEngine) {
      this.mapEngine.flyToStation(stn.lat, stn.lon, 13, 1.6, stn.id);
    }

    // 3. Display Step 1 Zoom-in & Risk Assessment toast
    const riskLevel = (stn.prediction && stn.prediction.risk_level) || 'Moderate';
    const leadHours = (stn.prediction && stn.prediction.lead_time_hours) ? stn.prediction.lead_time_hours.toFixed(1) : '3.5';
    this.showToast(`🎯 Step 1/2: Zooming into ${stn.village_area} (${riskLevel} Risk • ${leadHours}h Lead Time)`, "warning");

    // 4. After map zoom-in completes (2.2s delay), trigger and launch the 3D Terrain DEM
    if (this.analyseTimer) clearTimeout(this.analyseTimer);
    this.analyseTimer = setTimeout(() => {
      this.showToast(`⚡ Step 2/2: Launching 3D Decision Support DEM for ${stn.village_area} — Simulating 4-Hour Flood Progression...`, "danger");

      if (typeof window.openTerrain3DModal === 'function') {
        window.openTerrain3DModal('flood', {
          stationId: stn.id,
          rainfall: (stn.telemetry && stn.telemetry.Rainfall_Intensity) || 68.0,
          saturation: (stn.telemetry && stn.telemetry.Soil_Saturation) || 82.0,
          waterLevel: (stn.telemetry && stn.telemetry.Water_Level) || 4.2,
          riskEvolutionPhase: riskLevel === 'Critical' ? 4 : (riskLevel === 'High' ? 3 : 2),
          autoRunSimulation: true
        });
      }
    }, 2200);
  }

  trigger3DFromMap(stnId) {
    this.selectStation(stnId, true);
    const stns = this.stations || [];
    const curr = stns.find(s => s.id === stnId);
    const tel = curr ? (curr.telemetry || {}) : {};
    if (typeof window.openTerrain3DModal === 'function') {
      window.openTerrain3DModal('flood', {
        stationId: stnId,
        rainfall: tel.Rainfall_Intensity || 35.0,
        saturation: tel.Soil_Saturation || 75.0,
        waterLevel: tel.Water_Level || 3.8
      });
    }
  }

  showToast(message, type = "info") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'danger' ? 'toast-danger' : (type === 'warning' ? 'toast-warning' : '')}`;
    toast.innerHTML = `
      <span>${type === 'danger' ? '🚨' : (type === 'warning' ? '⚡' : (type === 'error' ? '❌' : 'ℹ️'))}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }
}

function roundTo1(num) {
  return Math.round(num * 10) / 10;
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new GovardhanaGiriApp();
  window.app.init();
});
