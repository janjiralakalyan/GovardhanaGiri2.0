/**
 * GovardhanaGiri 2.0 & NE-LENS: Advanced 3D Terrain & Dynamic Risk Evolution UI Component Manager
 * ==============================================================================================
 * Renders the full Decision Support System (DSS) Interactive HUD:
 *  - Dynamic Detected Area Selector (All 10 Telangana Hotspots + Northeast Landslide Corridors)
 *  - 4-Stage "How It Becomes Risky" Risk Evolution Stepper & Storyboard
 *  - 3D Hazard Risk Heatmap & Hydrological Runoff Streamline Toggles
 *  - Dynamic Causality & Physics Breakdown (Why It Becomes Risky)
 *  - 12-Hour Hydrodynamic Wave Timeline Scrubber & Speed Controls
 *  - Interactive Spatial Elevation & Inundation Depth Probe
 *  - Infrastructure Status Badges (Bridge Overtopping, Road Cutoff, Houses Flooded)
 *  - Tactical Camera Angle Switcher (Orbit, Slice, Top 2D, Bridge, Shelter, Drone Patrol)
 *  - Real-Time Parameter Shock Sliders
 */

class Terrain3DComponent {
  constructor(mountContainerId, initialConfig = {}) {
    this.mountId = mountContainerId;
    this.config = Object.assign({
      mode: 'flood',
      stationId: 'TEL-STN-03',
      title: '3D Terrain & Hydrodynamic Surge Decision Model',
      rainfall: 35.0,
      saturation: 75.0,
      waterLevel: 3.8,
      slopeAngle: 34.0,
      timelineHour: 0,
      showHeatmap: false,
      showRunoff: true,
      riskEvolutionPhase: 2
    }, initialConfig);

    this.visualizer = null;
    this.isPlayingTimeline = false;
    this.isDroneActive = false;
    this.isHeatmapActive = false;
    this.isRunoffActive = true;
    this.render();
  }

  render() {
    const container = document.getElementById(this.mountId);
    if (!container) return;

    const isFlood = this.config.mode === 'flood';

    container.innerHTML = `
      <div class="terrain-3d-wrapper">
        <!-- 3D WebGL Canvas Mount -->
        <div class="terrain-3d-canvas-container" id="${this.mountId}-canvas"></div>

        <!-- Floating Spatial Elevation & Depth Probe Tooltip -->
        <div class="t3d-probe-tooltip" id="${this.mountId}-probe-tooltip" style="display:none;">
          <div class="t3d-probe-title">🎯 3D SPATIAL TERRAIN PROBE</div>
          <div class="t3d-probe-row">
            <span>Elevation:</span>
            <strong id="${this.mountId}-pb-elev">142.5 m MSL</strong>
          </div>
          <div class="t3d-probe-row">
            <span>Water Depth:</span>
            <strong id="${this.mountId}-pb-depth" style="color:#38bdf8;">0.0 m (Dry Ground)</strong>
          </div>
          <div class="t3d-probe-row">
            <span>Inundation Status:</span>
            <strong id="${this.mountId}-pb-status" style="color:#10b981;">SAFE ZONE</strong>
          </div>
          <div class="t3d-probe-row">
            <span>Time to Inundate:</span>
            <strong id="${this.mountId}-pb-time">45 mins safe</strong>
          </div>
        </div>

        <!-- Top Floating Operations HUD Bar -->
        <div class="terrain-3d-hud-top">
          <div class="terrain-3d-title-badge">
            <span style="font-size:16px;">${isFlood ? '🌊' : '⛰️'}</span>
            <div>
              <h4 id="${this.mountId}-title">${this.config.title}</h4>
              <div style="font-size:10px; color:#94a3b8;" id="${this.mountId}-subtitle">Multi-Area DEM with Dynamic Risk Evolution</div>
            </div>
            <span class="mode-pill" id="${this.mountId}-pill">${isFlood ? 'FLASH FLOOD DSS' : 'LANDSLIDE SLIP DSS'}</span>
          </div>

          <!-- Dynamic Detected Area Selector Dropdown -->
          <div class="t3d-area-select-wrap">
            <label for="${this.mountId}-area-dropdown">📍 Area:</label>
            <select class="t3d-area-select" id="${this.mountId}-area-dropdown">
              <optgroup label="Telangana Flood Hotspots">
                <option value="TEL-STN-03" ${this.config.stationId === 'TEL-STN-03' ? 'selected' : ''}>Medaram (Jampanna Vagu)</option>
                <option value="TEL-STN-01" ${this.config.stationId === 'TEL-STN-01' ? 'selected' : ''}>Bhadrachalam (Godavari)</option>
                <option value="TEL-STN-06" ${this.config.stationId === 'TEL-STN-06' ? 'selected' : ''}>Kuntala Falls Gorge</option>
                <option value="TEL-STN-07" ${this.config.stationId === 'TEL-STN-07' ? 'selected' : ''}>Kadam Dam Spillway</option>
                <option value="TEL-STN-08" ${this.config.stationId === 'TEL-STN-08' ? 'selected' : ''}>Prakash Nagar (Munneru)</option>
                <option value="TEL-STN-10" ${this.config.stationId === 'TEL-STN-10' ? 'selected' : ''}>Musi River / Puranapool</option>
                <option value="TEL-STN-02" ${this.config.stationId === 'TEL-STN-02' ? 'selected' : ''}>Charla (Taliperu Spillway)</option>
                <option value="TEL-STN-04" ${this.config.stationId === 'TEL-STN-04' ? 'selected' : ''}>Eturnagaram (Dayam Vagu)</option>
              </optgroup>
              <optgroup label="Mountain & Landslide Ghats">
                <option value="AIZAWL-01" ${this.config.stationId === 'AIZAWL-01' ? 'selected' : ''}>Aizawl (Tuirial & Durtlang, Mizoram)</option>
                <option value="CHAMPHAI-02" ${this.config.stationId === 'CHAMPHAI-02' ? 'selected' : ''}>Champhai (Tiau Border, Mizoram)</option>
                <option value="EKHASI-03" ${this.config.stationId === 'EKHASI-03' ? 'selected' : ''}>East Khasi Hills (Mawkdok/Sohra, Meghalaya)</option>
                <option value="DIMAHASAO-04" ${this.config.stationId === 'DIMAHASAO-04' ? 'selected' : ''}>Dima Hasao (Jatinga Haflong, Assam)</option>
                <option value="KOHIMA-05" ${this.config.stationId === 'KOHIMA-05' ? 'selected' : ''}>Kohima (Dzükou Foothills, Nagaland)</option>
                <option value="TEL-STN-05" ${this.config.stationId === 'TEL-STN-05' ? 'selected' : ''}>Kerameri Ghat Range (610m, Telangana)</option>
                <option value="TEL-STN-09" ${this.config.stationId === 'TEL-STN-09' ? 'selected' : ''}>Mannanur Nallamala Plateau (Telangana)</option>
              </optgroup>
            </select>
          </div>

          <!-- Tactical Camera Angle & Overlay Switcher -->
          <div class="terrain-3d-controls-strip">
            <button class="t3d-btn active" data-cam="iso" title="Isometric Aerial View">📐 Orbit</button>
            <button class="t3d-btn" data-cam="cross-section" title="Geological Cross-Section">✂️ Slice</button>
            <button class="t3d-btn" data-cam="top" title="Top-Down 2D DEM Map">🗺️ 2D DEM</button>
            <button class="t3d-btn" data-cam="bridge" title="Bridge & Embankment View">🌉 Bridge</button>
            <button class="t3d-btn" data-cam="shelter" title="High-Ground Shelter Safe Zone">🏥 Shelter</button>
            <button class="t3d-btn" id="${this.mountId}-btn-drone" title="Autonomous Drone Aerial Patrol Flight">🚁 Drone</button>
            <button class="t3d-btn" id="${this.mountId}-btn-heatmap" title="Toggle 3D Hazard Risk Heatmap Overlay">🔥 Heatmap</button>
            <button class="t3d-btn active" id="${this.mountId}-btn-runoff" title="Toggle Hydrological Runoff Streamlines">💧 Runoff</button>
            <button class="t3d-btn" id="${this.mountId}-toggle-wire" title="Toggle Topological Wireframe">🕸️ Wire</button>
          </div>
        </div>

        <!-- 4-Stage Dynamic Risk Evolution Stepper (How It Becomes Risky) -->
        <div class="t3d-risk-stepper-bar">
          <div class="t3d-stepper-title">
            <span>⚡ RISK EVOLUTION:</span>
          </div>
          <div class="t3d-step-nodes">
            <div class="t3d-step-node ${this.config.riskEvolutionPhase === 1 ? 'active-step' : ''}" data-phase="1" title="Initial normal conditions, low runoff, high stability">
              <span class="t3d-step-num">PHASE 1</span>
              <span class="t3d-step-name">🟢 Calm Baseflow</span>
            </div>
            <div class="t3d-step-node ${this.config.riskEvolutionPhase === 2 ? 'active-step' : ''}" data-phase="2" title="Rainfall onset, soil absorbs water, rising saturation">
              <span class="t3d-step-num">PHASE 2</span>
              <span class="t3d-step-name">🟡 Infiltration & Runoff</span>
            </div>
            <div class="t3d-step-node ${this.config.riskEvolutionPhase === 3 ? 'active-step' : ''}" data-phase="3" title="Soil saturated, surface flow accumulation, road warnings">
              <span class="t3d-step-num">PHASE 3</span>
              <span class="t3d-step-name">🟠 Pore Pressure Surge</span>
            </div>
            <div class="t3d-step-node critical-phase ${this.config.riskEvolutionPhase === 4 ? 'active-step' : ''}" data-phase="4" title="Extreme Cloudburst, flash breach, overtopping & slip rupture">
              <span class="t3d-step-num">PHASE 4</span>
              <span class="t3d-step-name">🔴 Critical Inundation</span>
            </div>
          </div>
        </div>

        <!-- Infrastructure Status HUD (Floating Below Stepper) -->
        <div class="terrain-3d-infra-hud" id="${this.mountId}-infra-hud">
          <div class="t3d-infra-badge safe" id="${this.mountId}-badge-bridge">
            <span>🌉 Bridge / Culvert:</span> <strong>CLEAR (+1.4m)</strong>
          </div>
          <div class="t3d-infra-badge safe" id="${this.mountId}-badge-road">
            <span>🛣️ Lowland Access:</span> <strong>OPEN</strong>
          </div>
          <div class="t3d-infra-badge safe" id="${this.mountId}-badge-houses">
            <span>🏘️ Settlements:</span> <strong>0 / 16 Inundated</strong>
          </div>
          <div class="t3d-infra-badge safe" style="border-color:#10b981; background:rgba(6,78,59,0.75);">
            <span>🏥 Evacuation Path:</span> <strong style="color:#34d399;">100% DRY CLEAR</strong>
          </div>
        </div>

        <!-- Dynamic Causality & Physics Breakdown (Why This Area Is Risky) -->
        <div class="t3d-causality-box" id="${this.mountId}-causality">
          <div class="t3d-causality-header">
            <span>🔬 RISK CAUSALITY & MECHANICS</span>
            <span style="font-size:9.5px; color:#94a3b8;" id="${this.mountId}-causality-state">LIVE CALCULATION</span>
          </div>
          <div class="t3d-causality-list" id="${this.mountId}-causality-list">
            <div class="t3d-causality-item">
              <span class="icon">🌧️</span>
              <div>Rainfall (<strong>${this.config.rainfall} mm/h</strong>) vs Soil Infiltration (<strong id="${this.mountId}-c-infil">3.8 mm/h</strong>).</div>
            </div>
            <div class="t3d-causality-item">
              <span class="icon">🌊</span>
              <div>Water Stage at <strong id="${this.mountId}-c-stage">${this.config.waterLevel} m</strong> (Danger Mark: <strong id="${this.mountId}-c-danger">5.2 m</strong>).</div>
            </div>
            <div class="t3d-causality-item">
              <span class="icon">⛰️</span>
              <div>Geotechnical Stability: <strong id="${this.mountId}-c-fos">FoS 1.85 (STABLE)</strong>.</div>
            </div>
          </div>
        </div>

        <!-- 12-Hour Hydrodynamic Forecast Timeline Scrubber -->
        <div class="terrain-3d-timeline-bar">
          <div class="t3d-timeline-controls">
            <button class="t3d-play-btn" id="${this.mountId}-btn-play" title="Play / Pause 12-Hour Flood Wave Simulation">▶ Play</button>
            <span class="t3d-timeline-label" id="${this.mountId}-lbl-time">T = 0.0h (Now)</span>
          </div>
          <div class="t3d-timeline-track-wrap">
            <input type="range" class="t3d-timeline-range" id="${this.mountId}-sld-timeline" min="-6.0" max="6.0" step="0.1" value="0.0">
            <div class="t3d-timeline-ticks">
              <span>T-6h (Onset)</span>
              <span>T-3h</span>
              <span style="color:#38bdf8; font-weight:700;">T-0 (Now)</span>
              <span style="color:#f59e0b; font-weight:700;">T+1.5h (Peak Surge)</span>
              <span>T+3h</span>
              <span>T+6h (Recession)</span>
            </div>
          </div>
          <div class="t3d-speed-btns">
            <button class="t3d-spd-btn active" data-speed="1">1x</button>
            <button class="t3d-spd-btn" data-speed="2">2x</button>
            <button class="t3d-spd-btn" data-speed="5">5x</button>
          </div>
        </div>

        <!-- Parameter Shock Controls in Right Sidebar -->
        <div class="terrain-3d-sidebar">
          <h5><span>⚙️ Stress Simulator</span> <span style="font-size:10px; color:#94a3b8;">Real-Time</span></h5>
          
          <div class="t3d-slider-row">
            <div class="t3d-slider-header">
              <span>Rainfall Intensity</span>
              <span class="val-num" id="${this.mountId}-lbl-rain">${this.config.rainfall} mm/h</span>
            </div>
            <input type="range" class="t3d-range-input" id="${this.mountId}-sld-rain" min="0" max="150" value="${this.config.rainfall}">
          </div>

          <div class="t3d-slider-row">
            <div class="t3d-slider-header">
              <span>Soil Saturation</span>
              <span class="val-num" id="${this.mountId}-lbl-sat">${this.config.saturation}%</span>
            </div>
            <input type="range" class="t3d-range-input" id="${this.mountId}-sld-sat" min="15" max="100" value="${this.config.saturation}">
          </div>

          <div class="t3d-slider-row">
            <div class="t3d-slider-header">
              <span>Stream Water Stage</span>
              <span class="val-num" id="${this.mountId}-lbl-stage">${this.config.waterLevel} m</span>
            </div>
            <input type="range" class="t3d-range-input" id="${this.mountId}-sld-stage" min="0.5" max="18.0" step="0.1" value="${this.config.waterLevel}">
          </div>

          <div class="t3d-slider-row">
            <div class="t3d-slider-header">
              <span>Slope Angle (α)</span>
              <span class="val-num" id="${this.mountId}-lbl-slope">${this.config.slopeAngle}°</span>
            </div>
            <input type="range" class="t3d-range-input" id="${this.mountId}-sld-slope" min="10" max="55" step="1" value="${this.config.slopeAngle}">
          </div>

          <!-- Quick Telemetry & Geotechnical Metric Pill Box -->
          <div class="t3d-telemetry-pill-box">
            <div class="t3d-tel-pill-row">
              <span>FoS Factor:</span>
              <strong id="${this.mountId}-val-fos" style="color:#10b981;">1.85 (STABLE)</strong>
            </div>
            <div class="t3d-tel-pill-row">
              <span>Pore Pressure (u):</span>
              <strong id="${this.mountId}-val-pore">14.2 kPa</strong>
            </div>
            <div class="t3d-tel-pill-row">
              <span>Base Elevation:</span>
              <strong id="${this.mountId}-val-base-el">142 m MSL</strong>
            </div>
            <div class="t3d-tel-pill-row">
              <span>Danger Mark:</span>
              <strong id="${this.mountId}-val-danger-lvl" style="color:#ef4444;">5.2 m</strong>
            </div>
          </div>
        </div>
      </div>
    `;

    // Instantiate Three.js Engine
    setTimeout(() => {
      this.visualizer = new Terrain3DVisualizer(`${this.mountId}-canvas`, {
        mode: this.config.mode,
        stationId: this.config.stationId,
        rainfall: this.config.rainfall,
        saturation: this.config.saturation,
        waterLevel: this.config.waterLevel,
        slopeAngle: this.config.slopeAngle,
        timelineHour: this.config.timelineHour,
        showHeatmap: this.config.showHeatmap,
        showRunoff: this.config.showRunoff,
        riskEvolutionPhase: this.config.riskEvolutionPhase
      });

      this.bindEvents();
    }, 60);
  }

  bindEvents() {
    const container = document.getElementById(this.mountId);
    if (!container) return;

    // 1. Detected Area Selector Dropdown
    const areaDropdown = document.getElementById(`${this.mountId}-area-dropdown`);
    if (areaDropdown) {
      areaDropdown.addEventListener('change', (e) => {
        const stnId = e.target.value;
        this.config.stationId = stnId;
        if (this.visualizer) {
          this.visualizer.setStation(stnId);
          const prof = this.visualizer.getCurrentProfile();
          this.config.mode = prof.mode;
          this.updateAreaUIHeader(prof);
        }
      });
    }

    // 2. 4-Stage Risk Evolution Stepper
    const stepNodes = container.querySelectorAll('.t3d-step-node');
    stepNodes.forEach(node => {
      node.addEventListener('click', () => {
        stepNodes.forEach(n => n.classList.remove('active-step'));
        node.classList.add('active-step');
        const phase = parseInt(node.getAttribute('data-phase'));
        this.config.riskEvolutionPhase = phase;
        if (this.visualizer) {
          this.visualizer.setRiskEvolutionPhase(phase);
        }
      });
    });

    // 3. Camera preset buttons
    const camBtns = container.querySelectorAll('.t3d-btn[data-cam]');
    camBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        camBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const camPreset = btn.getAttribute('data-cam');
        if (this.visualizer) this.visualizer.setCameraPreset(camPreset);
      });
    });

    // 4. Drone Patrol Toggle
    const droneBtn = document.getElementById(`${this.mountId}-btn-drone`);
    if (droneBtn) {
      droneBtn.addEventListener('click', () => {
        this.isDroneActive = !this.isDroneActive;
        droneBtn.classList.toggle('active', this.isDroneActive);
        if (this.visualizer) this.visualizer.toggleDroneMode(this.isDroneActive);
      });
    }

    // 5. Heatmap Overlay Toggle
    const heatmapBtn = document.getElementById(`${this.mountId}-btn-heatmap`);
    if (heatmapBtn) {
      heatmapBtn.addEventListener('click', () => {
        if (this.visualizer) {
          const active = this.visualizer.toggleHeatmap();
          this.isHeatmapActive = active;
          heatmapBtn.classList.toggle('active', active);
        }
      });
    }

    // 6. Runoff Streamlines Toggle
    const runoffBtn = document.getElementById(`${this.mountId}-btn-runoff`);
    if (runoffBtn) {
      runoffBtn.addEventListener('click', () => {
        if (this.visualizer) {
          const active = this.visualizer.toggleRunoff();
          this.isRunoffActive = active;
          runoffBtn.classList.toggle('active', active);
        }
      });
    }

    // 7. Wireframe toggle
    let wireframeOn = true;
    const wireBtn = document.getElementById(`${this.mountId}-toggle-wire`);
    if (wireBtn) {
      wireBtn.addEventListener('click', () => {
        wireframeOn = !wireframeOn;
        wireBtn.classList.toggle('active', wireframeOn);
        if (this.visualizer) this.visualizer.toggleWireframe(wireframeOn);
      });
    }

    // 8. Timeline Scrubber & Playback
    const playBtn = document.getElementById(`${this.mountId}-btn-play`);
    const sldTimeline = document.getElementById(`${this.mountId}-sld-timeline`);
    const lblTime = document.getElementById(`${this.mountId}-lbl-time`);

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        this.isPlayingTimeline = !this.isPlayingTimeline;
        playBtn.textContent = this.isPlayingTimeline ? '⏸ Pause' : '▶ Play';
        playBtn.classList.toggle('active', this.isPlayingTimeline);
        if (this.visualizer) this.visualizer.toggleTimelinePlay(this.isPlayingTimeline);
      });
    }

    if (sldTimeline) {
      sldTimeline.addEventListener('input', (e) => {
        const h = parseFloat(e.target.value);
        if (lblTime) lblTime.textContent = `T = ${h >= 0 ? '+' : ''}${h.toFixed(1)}h`;
        if (this.visualizer) this.visualizer.setTimelineHour(h);
      });
    }

    // Speed multiplier buttons
    const spdBtns = container.querySelectorAll('.t3d-spd-btn');
    spdBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        spdBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const spd = parseFloat(btn.getAttribute('data-speed'));
        if (this.visualizer) this.visualizer.toggleTimelinePlay(this.isPlayingTimeline, spd);
      });
    });

    // 9. Stress Sliders
    const sldRain = document.getElementById(`${this.mountId}-sld-rain`);
    const sldSat = document.getElementById(`${this.mountId}-sld-sat`);
    const sldStage = document.getElementById(`${this.mountId}-sld-stage`);
    const sldSlope = document.getElementById(`${this.mountId}-sld-slope`);

    const lblRain = document.getElementById(`${this.mountId}-lbl-rain`);
    const lblSat = document.getElementById(`${this.mountId}-lbl-sat`);
    const lblStage = document.getElementById(`${this.mountId}-lbl-stage`);
    const lblSlope = document.getElementById(`${this.mountId}-lbl-slope`);

    if (sldRain) {
      sldRain.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (lblRain) lblRain.textContent = `${val} mm/h`;
        this.config.rainfall = val;
        if (this.visualizer) this.visualizer.setTelemetry({ rainfall: val });
      });
    }

    if (sldSat) {
      sldSat.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (lblSat) lblSat.textContent = `${val}%`;
        this.config.saturation = val;
        if (this.visualizer) this.visualizer.setTelemetry({ saturation: val });
      });
    }

    if (sldStage) {
      sldStage.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (lblStage) lblStage.textContent = `${val.toFixed(1)} m`;
        this.config.waterLevel = val;
        if (this.visualizer) this.visualizer.setTelemetry({ waterLevel: val });
      });
    }

    if (sldSlope) {
      sldSlope.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (lblSlope) lblSlope.textContent = `${val}°`;
        this.config.slopeAngle = val;
        if (this.visualizer) this.visualizer.setTelemetry({ slopeAngle: val });
      });
    }

    // 10. Spatial Probe Tooltip Listener
    const probeTooltip = document.getElementById(`${this.mountId}-probe-tooltip`);
    const pbElev = document.getElementById(`${this.mountId}-pb-elev`);
    const pbDepth = document.getElementById(`${this.mountId}-pb-depth`);
    const pbStatus = document.getElementById(`${this.mountId}-pb-status`);
    const pbTime = document.getElementById(`${this.mountId}-pb-time`);

    window.addEventListener('terrain3d-probe', (e) => {
      const d = e.detail;
      if (probeTooltip) {
        probeTooltip.style.display = 'block';
        if (pbElev) pbElev.textContent = `${d.elevationMeters} m MSL`;
        if (pbDepth) {
          pbDepth.textContent = d.isInundated ? `${d.waterDepthMeters} m Submerged` : '0.0 m (Dry Ground)';
          pbDepth.style.color = d.isInundated ? '#ef4444' : '#38bdf8';
        }
        if (pbStatus) {
          pbStatus.textContent = d.isInundated ? '🚨 INUNDATED' : '✅ SAFE DRY GROUND';
          pbStatus.style.color = d.isInundated ? '#ef4444' : '#10b981';
        }
        if (pbTime) {
          pbTime.textContent = d.isInundated ? 'Immediate Overtopping' : `~${d.timeToInundateMins} mins safe window`;
          pbTime.style.color = d.isInundated ? '#ef4444' : '#f59e0b';
        }
      }
    });

    // 11. Physics & Infrastructure Updates Listener
    window.addEventListener('terrain3d-update', (e) => {
      const data = e.detail;

      // Update Timeline Slider Position
      if (sldTimeline && this.isPlayingTimeline) {
        sldTimeline.value = data.timelineHour.toFixed(1);
        if (lblTime) lblTime.textContent = `T = ${data.timelineHour >= 0 ? '+' : ''}${data.timelineHour.toFixed(1)}h`;
      }

      // Update Bridge & Road Infrastructure Badges
      const badgeBridge = document.getElementById(`${this.mountId}-badge-bridge`);
      const badgeRoad = document.getElementById(`${this.mountId}-badge-road`);
      const badgeHouses = document.getElementById(`${this.mountId}-badge-houses`);

      if (badgeBridge && data.isBridgeSubmerged !== undefined) {
        badgeBridge.className = `t3d-infra-badge ${data.isBridgeSubmerged ? 'danger' : 'safe'}`;
        badgeBridge.innerHTML = data.isBridgeSubmerged 
          ? `<span>🌉 Bridge:</span> <strong style="color:#ef4444;">🚨 OVERTOPPED / CLOSED</strong>`
          : `<span>🌉 Bridge:</span> <strong>CLEAR PASSABLE</strong>`;
      }

      if (badgeRoad && data.isLowlandRoadCutoff !== undefined) {
        badgeRoad.className = `t3d-infra-badge ${data.isLowlandRoadCutoff ? 'danger' : 'safe'}`;
        badgeRoad.innerHTML = data.isLowlandRoadCutoff
          ? `<span>🛣️ Lowland Access:</span> <strong style="color:#ef4444;">🚨 CUT OFF / BLOCKED</strong>`
          : `<span>🛣️ Lowland Access:</span> <strong>OPEN & PASSABLE</strong>`;
      }

      if (badgeHouses && data.floodedHousesCount !== undefined) {
        const isCritical = data.floodedHousesCount > 2;
        badgeHouses.className = `t3d-infra-badge ${isCritical ? 'danger' : 'safe'}`;
        badgeHouses.innerHTML = `<span>🏘️ Settlements:</span> <strong style="color:${isCritical ? '#ef4444' : '#34d399'};">${data.floodedHousesCount} / ${data.totalHouses} Inundated</strong>`;
      }

      // Update Causality Card values
      const cStage = document.getElementById(`${this.mountId}-c-stage`);
      const cDanger = document.getElementById(`${this.mountId}-c-danger`);
      const cFos = document.getElementById(`${this.mountId}-c-fos`);
      const valFos = document.getElementById(`${this.mountId}-val-fos`);
      const valPore = document.getElementById(`${this.mountId}-val-pore`);

      if (cStage && data.waterLevel !== undefined) cStage.textContent = `${data.waterLevel.toFixed(1)} m`;
      if (cDanger && data.dangerWaterLevel !== undefined) cDanger.textContent = `${data.dangerWaterLevel.toFixed(1)} m`;

      if (data.factorOfSafety !== undefined) {
        const fosNum = parseFloat(data.factorOfSafety);
        const text = fosNum < 1.0 ? `${data.factorOfSafety} (FAILURE ACTIVE)` : (fosNum < 1.3 ? `${data.factorOfSafety} (UNSTABLE)` : `${data.factorOfSafety} (STABLE)`);
        const col = fosNum < 1.0 ? '#ef4444' : (fosNum < 1.3 ? '#f59e0b' : '#10b981');
        if (cFos) cFos.innerHTML = `<span style="color:${col};">${text}</span>`;
        if (valFos) valFos.innerHTML = `<span style="color:${col};">${text}</span>`;
      }

      if (valPore && data.porePressure !== undefined) {
        valPore.textContent = `${data.porePressure} kPa`;
      }
    });
  }

  updateAreaUIHeader(prof) {
    const titleEl = document.getElementById(`${this.mountId}-title`);
    const pillEl = document.getElementById(`${this.mountId}-pill`);
    const baseEl = document.getElementById(`${this.mountId}-val-base-el`);
    const dangerEl = document.getElementById(`${this.mountId}-val-danger-lvl`);

    if (titleEl) titleEl.textContent = `${prof.name} (3D DEM)`;
    if (pillEl) {
      pillEl.textContent = prof.mode === 'flood' ? 'FLASH FLOOD DSS' : 'LANDSLIDE SLIP DSS';
      pillEl.style.background = prof.mode === 'flood' ? '#0284c7' : '#d97706';
    }
    if (baseEl) baseEl.textContent = `${prof.baseElevation} m MSL`;
    if (dangerEl) dangerEl.textContent = `${prof.dangerWaterLevel} m`;
  }

  updateWithStationTelemetry(stn) {
    if (!stn) return;
    const stnId = stn.id;
    this.config.stationId = stnId;

    const dropdown = document.getElementById(`${this.mountId}-area-dropdown`);
    if (dropdown) dropdown.value = stnId;

    const tel = stn.telemetry || {};
    const rain = tel.Rainfall_Intensity || tel.Rainfall_1h || 35;
    const sat = tel.Soil_Saturation || 75;
    const stage = tel.Water_Level || 3.8;
    const slope = stn.slope || tel.Slope_Degree || 20;

    this.config.rainfall = rain;
    this.config.saturation = sat;
    this.config.waterLevel = stage;
    this.config.slopeAngle = slope;

    if (this.visualizer) {
      this.visualizer.setStation(stnId);
      this.visualizer.setTelemetry({
        rainfall: rain,
        saturation: sat,
        waterLevel: stage,
        slopeAngle: slope
      });
      this.updateAreaUIHeader(this.visualizer.getCurrentProfile());
    }

    const sldRain = document.getElementById(`${this.mountId}-sld-rain`);
    const sldSat = document.getElementById(`${this.mountId}-sld-sat`);
    const sldStage = document.getElementById(`${this.mountId}-sld-stage`);
    const sldSlope = document.getElementById(`${this.mountId}-sld-slope`);
    const lblRain = document.getElementById(`${this.mountId}-lbl-rain`);
    const lblSat = document.getElementById(`${this.mountId}-lbl-sat`);
    const lblStage = document.getElementById(`${this.mountId}-lbl-stage`);
    const lblSlope = document.getElementById(`${this.mountId}-lbl-slope`);

    if (sldRain) sldRain.value = rain;
    if (sldSat) sldSat.value = sat;
    if (sldStage) sldStage.value = stage;
    if (sldSlope) sldSlope.value = slope;
    if (lblRain) lblRain.textContent = `${rain} mm/h`;
    if (lblSat) lblSat.textContent = `${sat}%`;
    if (lblStage) lblStage.textContent = `${stage.toFixed(1)} m`;
    if (lblSlope) lblSlope.textContent = `${slope}°`;
  }
}

/**
 * Global Fullscreen Modal Launcher for 3D Dynamic DSS
 */
window.openTerrain3DModal = function(mode = 'flood', initialData = {}) {
  const existing = document.getElementById('t3d-modal-root');
  if (existing) existing.remove();

  const modalBackdrop = document.createElement('div');
  modalBackdrop.className = 't3d-modal-backdrop';
  modalBackdrop.id = 't3d-modal-root';

  const title = mode === 'flood'
    ? '🌊 3D River Canyon & Dynamic Inundation Decision Support Center (Telangana)' 
    : '⛰️ 3D Slope Geotechnical Slip-Surface & Hazard Progression Simulator (NE-LENS)';

  modalBackdrop.innerHTML = `
    <div class="t3d-modal-window">
      <div class="t3d-modal-header">
        <h3>${title}</h3>
        <div style="display:flex; gap:10px; align-items:center;">
          <span style="font-size:11px; color:#94a3b8; font-family:'JetBrains Mono',monospace;">Dynamic 3D Multi-Area Spatial DEM</span>
          <button id="btn-close-t3d-modal" class="t3d-btn" style="background:#dc2626; color:#fff; padding:6px 12px; font-weight:700;">✕ CLOSE</button>
        </div>
      </div>
      <div class="t3d-modal-body" id="modal-t3d-container" style="height: calc(100% - 60px);"></div>
    </div>
  `;

  document.body.appendChild(modalBackdrop);

  const comp = new Terrain3DComponent('modal-t3d-container', {
    mode: mode,
    stationId: initialData.stationId || 'TEL-STN-03',
    rainfall: initialData.rainfall || 45.0,
    saturation: initialData.saturation || 80.0,
    waterLevel: initialData.waterLevel || 4.2,
    slopeAngle: initialData.slopeAngle || 34.0,
    riskEvolutionPhase: initialData.riskEvolutionPhase || 2
  });

  document.getElementById('btn-close-t3d-modal').addEventListener('click', () => {
    if (comp.visualizer) comp.visualizer.destroy();
    modalBackdrop.remove();
  });

  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
      if (comp.visualizer) comp.visualizer.destroy();
      modalBackdrop.remove();
    }
  });
};

window.Terrain3DComponent = Terrain3DComponent;
