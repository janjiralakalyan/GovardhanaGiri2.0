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

        <!-- Floating Spatial Elevation & Depth Probe Tooltip (Mouse Tracker) -->
        <div class="t3d-probe-tooltip" id="${this.mountId}-probe-tooltip" style="display:none;">
          <div class="t3d-probe-title">🎯 SPATIAL TERRAIN PROBE</div>
          <div class="t3d-probe-row">
            <span>Elevation:</span>
            <strong id="${this.mountId}-pb-elev">142.5 m MSL</strong>
          </div>
          <div class="t3d-probe-row">
            <span>Water Depth:</span>
            <strong id="${this.mountId}-pb-depth" style="color:#38bdf8;">0.0 m (Dry Ground)</strong>
          </div>
          <div class="t3d-probe-row">
            <span>Status:</span>
            <strong id="${this.mountId}-pb-status" style="color:#10b981;">SAFE ZONE</strong>
          </div>
          <div class="t3d-probe-row">
            <span>Time to Inundate:</span>
            <strong id="${this.mountId}-pb-time">45 mins safe</strong>
          </div>
        </div>

        <!-- Top Unified Operations HUD Container -->
        <div class="t3d-top-hud">
          <!-- Row 1: Title, Dropdown, and Camera Tools -->
          <div class="t3d-hud-row-main">
            <div class="t3d-title-block">
              <span style="font-size:15px;">${isFlood ? '🌊' : '⛰️'}</span>
              <div>
                <h4 id="${this.mountId}-title">${this.config.title}</h4>
                <div style="font-size:9.5px; color:#94a3b8;" id="${this.mountId}-subtitle">Multi-Area 3D Terrain & Hydrodynamic Decision System</div>
              </div>
              <span class="mode-pill" id="${this.mountId}-pill">${isFlood ? 'FLOOD DSS' : 'LANDSLIDE DSS'}</span>
            </div>

            <!-- Area Selector Dropdown -->
            <div class="t3d-area-select-wrap">
              <label for="${this.mountId}-area-dropdown">📍 Area:</label>
              <select class="t3d-area-select" id="${this.mountId}-area-dropdown">
                <optgroup label="⚠️ 6 Primary Telangana Flood Risk Areas">
                  <option value="TEL-STN-01" ${this.config.stationId === 'TEL-STN-01' ? 'selected' : ''}>🌊 Bhadrachalam (Godavari Ghat)</option>
                  <option value="TEL-STN-03" ${this.config.stationId === 'TEL-STN-03' ? 'selected' : ''}>🏞️ Medaram (Jampanna Gorge)</option>
                  <option value="TEL-STN-06" ${this.config.stationId === 'TEL-STN-06' ? 'selected' : ''}>💦 Kuntala Falls Ravine (45m Drop)</option>
                  <option value="TEL-STN-07" ${this.config.stationId === 'TEL-STN-07' ? 'selected' : ''}>🏗️ Kadam Dam (Spillway & Forebay)</option>
                  <option value="TEL-STN-08" ${this.config.stationId === 'TEL-STN-08' ? 'selected' : ''}>🏙️ Prakash Nagar (Munneru Urban)</option>
                  <option value="TEL-STN-10" ${this.config.stationId === 'TEL-STN-10' ? 'selected' : ''}>🌉 Musi River (Puranapool Canal)</option>
                </optgroup>
                <optgroup label="Other Telangana Basins & Ghats">
                  <option value="TEL-STN-02" ${this.config.stationId === 'TEL-STN-02' ? 'selected' : ''}>Charla (Taliperu Spillway)</option>
                  <option value="TEL-STN-04" ${this.config.stationId === 'TEL-STN-04' ? 'selected' : ''}>Eturnagaram (Dayam Confluence)</option>
                  <option value="TEL-STN-05" ${this.config.stationId === 'TEL-STN-05' ? 'selected' : ''}>Kerameri Ghat Range (610m)</option>
                  <option value="TEL-STN-09" ${this.config.stationId === 'TEL-STN-09' ? 'selected' : ''}>Mannanur Nallamala Plateau</option>
                </optgroup>
                <optgroup label="Northeast Mountain Landslides">
                  <option value="AIZAWL-01" ${this.config.stationId === 'AIZAWL-01' ? 'selected' : ''}>Aizawl (Tuirial & Durtlang, Mizoram)</option>
                  <option value="CHAMPHAI-02" ${this.config.stationId === 'CHAMPHAI-02' ? 'selected' : ''}>Champhai (Tiau Border, Mizoram)</option>
                  <option value="EKHASI-03" ${this.config.stationId === 'EKHASI-03' ? 'selected' : ''}>East Khasi Hills (Mawkdok/Sohra, Meghalaya)</option>
                  <option value="DIMAHASAO-04" ${this.config.stationId === 'DIMAHASAO-04' ? 'selected' : ''}>Dima Hasao (Jatinga Haflong, Assam)</option>
                  <option value="KOHIMA-05" ${this.config.stationId === 'KOHIMA-05' ? 'selected' : ''}>Kohima (Dzükou Foothills, Nagaland)</option>
                </optgroup>
              </select>
            </div>

            <!-- Camera Controls & Layer Toggles -->
            <div class="terrain-3d-controls-strip">
              <button class="t3d-btn active" data-cam="iso" title="Isometric Aerial View">📐 Orbit</button>
              <button class="t3d-btn" data-cam="top" title="Top-Down 2D DEM Map">🗺️ 2D</button>
              <button class="t3d-btn" data-cam="cross-section" title="Geological Cross-Section">✂️ Slice</button>
              <button class="t3d-btn" id="${this.mountId}-btn-drone" title="Autonomous Drone Aerial Patrol Flight">🚁 Drone</button>
              <button class="t3d-btn" id="${this.mountId}-btn-heatmap" title="Toggle 3D Hazard Risk Heatmap Overlay">🔥 Heatmap</button>
              <button class="t3d-btn active" id="${this.mountId}-btn-runoff" title="Toggle Hydrological Runoff Streamlines">💧 Runoff</button>
              <button class="t3d-btn" id="${this.mountId}-toggle-wire" title="Toggle Topological Wireframe">🕸️ Wire</button>
            </div>
          </div>

          <!-- Row 2: 6 Flood Hotspots + 4 Risk Phases -->
          <div class="t3d-hud-row-sub">
            <!-- 6 Hotspot Quick Pills -->
            <div class="t3d-sub-group">
              <span class="t3d-sub-label">⚡ 6 FLOOD HOTSPOTS:</span>
              <div class="t3d-fast-btns-wrap">
                <button class="t3d-fast-btn ${this.config.stationId === 'TEL-STN-01' ? 'active' : ''}" data-stn="TEL-STN-01">🌊 Bhadrachalam</button>
                <button class="t3d-fast-btn ${this.config.stationId === 'TEL-STN-03' ? 'active' : ''}" data-stn="TEL-STN-03">🏞️ Medaram</button>
                <button class="t3d-fast-btn ${this.config.stationId === 'TEL-STN-06' ? 'active' : ''}" data-stn="TEL-STN-06">💦 Kuntala Falls</button>
                <button class="t3d-fast-btn ${this.config.stationId === 'TEL-STN-07' ? 'active' : ''}" data-stn="TEL-STN-07">🏗️ Kadam Dam</button>
                <button class="t3d-fast-btn ${this.config.stationId === 'TEL-STN-08' ? 'active' : ''}" data-stn="TEL-STN-08">🏙️ Prakash Nagar</button>
                <button class="t3d-fast-btn ${this.config.stationId === 'TEL-STN-10' ? 'active' : ''}" data-stn="TEL-STN-10">🌉 Musi River</button>
              </div>
            </div>

            <!-- 4-Phase Stepper -->
            <div class="t3d-sub-group">
              <span class="t3d-sub-label">⚡ HOW IT BECOMES RISKY:</span>
              <div class="t3d-phase-stepper-wrap">
                <div class="t3d-step-node ${this.config.riskEvolutionPhase === 1 ? 'active-step' : ''}" data-phase="1">
                  <span class="t3d-step-num">PHASE 1</span>
                  <span class="t3d-step-name">🟢 Calm Base</span>
                </div>
                <div class="t3d-step-node ${this.config.riskEvolutionPhase === 2 ? 'active-step' : ''}" data-phase="2">
                  <span class="t3d-step-num">PHASE 2</span>
                  <span class="t3d-step-name">🟡 Rain Infil</span>
                </div>
                <div class="t3d-step-node ${this.config.riskEvolutionPhase === 3 ? 'active-step' : ''}" data-phase="3">
                  <span class="t3d-step-num">PHASE 3</span>
                  <span class="t3d-step-name">🟠 Surge Warn</span>
                </div>
                <div class="t3d-step-node critical-phase ${this.config.riskEvolutionPhase === 4 ? 'active-step' : ''}" data-phase="4">
                  <span class="t3d-step-num">PHASE 4</span>
                  <span class="t3d-step-name">🔴 Overtopping</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Left Floating Card: Risk Causality & Infrastructure Status -->
        <div class="t3d-left-card" id="${this.mountId}-causality">
          <div class="t3d-card-header">
            <span>🔬 WHY THIS AREA BECOMES RISKY</span>
            <span class="t3d-live-tag">LIVE DYNAMICS</span>
          </div>

          <!-- Infrastructure Badges Row -->
          <div class="t3d-infra-badges-row">
            <div class="t3d-infra-badge safe" id="${this.mountId}-badge-bridge">
              <span>🌉 Bridge:</span> <strong>CLEAR</strong>
            </div>
            <div class="t3d-infra-badge safe" id="${this.mountId}-badge-road">
              <span>🛣️ Road:</span> <strong>OPEN</strong>
            </div>
            <div class="t3d-infra-badge safe" id="${this.mountId}-badge-houses">
              <span>🏘️ Settlements:</span> <strong>0/16 Safe</strong>
            </div>
          </div>

          <!-- Dynamic Causality List -->
          <div class="t3d-causality-list" id="${this.mountId}-causality-list">
            <!-- Populated dynamically via renderCausalityNarrative -->
          </div>
        </div>

        <!-- Bottom Center Timeline Bar -->
        <div class="terrain-3d-timeline-bar">
          <div class="t3d-timeline-controls">
            <button class="t3d-play-btn" id="${this.mountId}-btn-play" title="Play / Pause 12-Hour Flood Wave Simulation">▶ Play</button>
            <span class="t3d-timeline-label" id="${this.mountId}-lbl-time">T = 0.0h (Now)</span>
          </div>
          <div class="t3d-timeline-track-wrap">
            <input type="range" class="t3d-timeline-range" id="${this.mountId}-sld-timeline" min="-6.0" max="6.0" step="0.1" value="0.0">
            <div class="t3d-timeline-ticks">
              <span>T-6h</span>
              <span>T-3h</span>
              <span style="color:#38bdf8; font-weight:700;">T-0 (Now)</span>
              <span style="color:#f59e0b; font-weight:700;">T+1.5h (Peak)</span>
              <span>T+3h</span>
              <span>T+6h</span>
            </div>
          </div>
          <div class="t3d-speed-btns">
            <button class="t3d-spd-btn active" data-speed="1">1x</button>
            <button class="t3d-spd-btn" data-speed="2">2x</button>
            <button class="t3d-spd-btn" data-speed="5">5x</button>
          </div>
        </div>

        <!-- Right Floating Panel: Stress Simulator -->
        <div class="terrain-3d-sidebar">
          <h5><span>⚙️ Stress Simulator</span> <span style="font-size:9.5px; color:#94a3b8;">Real-Time</span></h5>
          
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
              <span>Water Stage</span>
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

          <!-- Telemetry Metric Pill Box -->
          <div class="t3d-telemetry-pill-box">
            <div class="t3d-tel-pill-row">
              <span>FoS Factor:</span>
              <strong id="${this.mountId}-val-fos" style="color:#10b981;">1.85 (STABLE)</strong>
            </div>
            <div class="t3d-tel-pill-row">
              <span>Pore Pressure (u):</span>
              <strong id="${this.mountId}-val-pore" style="color:#38bdf8;">14.2 kPa</strong>
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
        this.selectStation(stnId);
      });
    }

    // 1b. 6 Flood Hotspot 1-Click Fast Buttons
    const fastBtns = container.querySelectorAll('.t3d-fast-btn');
    fastBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const stnId = btn.getAttribute('data-stn');
        this.selectStation(stnId);
      });
    });

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
    const canvasWrap = document.getElementById(`${this.mountId}-canvas`);

    if (canvasWrap && probeTooltip) {
      canvasWrap.addEventListener('pointerleave', () => {
        probeTooltip.style.display = 'none';
      });
      canvasWrap.addEventListener('pointermove', (e) => {
        if (probeTooltip.style.display === 'block') {
          probeTooltip.style.left = `${e.clientX + 14}px`;
          probeTooltip.style.top = `${e.clientY + 14}px`;
        }
      });
    }

    window.addEventListener('terrain3d-probe', (e) => {
      const d = e.detail;
      if (probeTooltip) {
        probeTooltip.style.display = 'block';
        if (d.clientCoords) {
          probeTooltip.style.left = `${d.clientCoords.clientX + 14}px`;
          probeTooltip.style.top = `${d.clientCoords.clientY + 14}px`;
        }
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

      // Render Dynamic Causality Narrative
      this.renderCausalityNarrative(data.stationId, data.riskPhase, data);
    });
  }

  selectStation(stnId) {
    this.config.stationId = stnId;

    // Update Dropdown
    const dropdown = document.getElementById(`${this.mountId}-area-dropdown`);
    if (dropdown) dropdown.value = stnId;

    // Update Fast Hotspot Buttons active state
    const container = document.getElementById(this.mountId);
    if (container) {
      const fastBtns = container.querySelectorAll('.t3d-fast-btn');
      fastBtns.forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-stn') === stnId);
      });
    }

    if (this.visualizer) {
      this.visualizer.setStation(stnId);
      const prof = this.visualizer.getCurrentProfile();
      this.config.mode = prof.mode;
      this.updateAreaUIHeader(prof);
    }
  }

  renderCausalityNarrative(stationId, phase, data) {
    const listEl = document.getElementById(`${this.mountId}-causality-list`);
    if (!listEl) return;

    const p = phase || this.config.riskEvolutionPhase || 2;
    const stage = (data.waterLevel || this.config.waterLevel || 3.8).toFixed(1);
    const danger = (data.dangerWaterLevel || 5.2).toFixed(1);
    const rain = (data.rainfall || this.config.rainfall || 35).toFixed(0);
    const sat = (data.saturation || this.config.saturation || 75).toFixed(0);

    const causalityMap = {
      'TEL-STN-01': {
        // Bhadrachalam Godavari River Ghat
        1: [
          { icon: '🟢', title: 'Phase 1: Calm Baseflow', text: `Godavari River flowing steadily at <strong>${stage}m</strong> (Danger Mark: <strong>${danger}m</strong>). Temple vista bathing ghats, market complex, and 4-pier highway bridge completely dry.` },
          { icon: '🌊', title: 'Hydrological Inflow', text: `Upper catchment flow accumulation normal. Infiltration buffer high with red alluvial soils absorbing monsoon moisture.` },
          { icon: '🏥', title: 'Safety Status', text: `Zero settlements threatened. All riverbank approach corridors open.` }
        ],
        2: [
          { icon: '🟡', title: 'Phase 2: Catchment Accumulation', text: `Precipitation (${rain} mm/h) across upstream Godavari basin funnels into main channel. Stage rising to <strong>${stage}m</strong> (approaching 1st Warning mark 13.1m).` },
          { icon: '💧', title: 'Soil Saturation Saturation', text: `Soil moisture reached ${sat}%. Drainage channels discharging into Godavari with moderate velocity.` },
          { icon: '⚠️', title: 'Advisory', text: `Riverbank warning sirens placed on alert. Lowland ghat visitors advised to move to upper terraces.` }
        ],
        3: [
          { icon: '🟠', title: 'Phase 3: Saturated Bankfull Surcharge', text: `Massive inflow from Indravati & Pranhita confluences surges river stage to <strong>${stage}m</strong> (crossing 2nd Warning mark 14.6m). Lower ghat steps inundated.` },
          { icon: '🌉', title: 'Infrastructure Threat', text: `Flood depth reaches bridge pier bases. Lowland riverside stalls submerged. Road access to Dummugudem monitored.` },
          { icon: '🚨', title: 'Operational Action', text: `First responders deployed. High-ground shelters prepared at Bhadrachalam Model Residential School.` }
        ],
        4: [
          { icon: '🔴', title: 'Phase 4: Critical Godavari Inundation', text: `Extreme deluge (${rain} mm/h) pushes Godavari stage to <strong>${stage}m</strong> (+${(stage - danger).toFixed(1)}m above 3rd Danger Mark ${danger}m)!` },
          { icon: '🏘️', title: 'Catastrophic Overtopping', text: `Temple Riparian Ward & Lowland Market Quarters heavily inundated. Highway bridge deck threatened by turbulent whitewater.` },
          { icon: '🚀', title: 'Emergency Evacuation Active', text: `Mandatory evacuation in progress via high-ground green corridor to ZPHS Camp.` }
        ]
      },
      'TEL-STN-03': {
        // Medaram Jampanna Vagu Gorge
        1: [
          { icon: '🟢', title: 'Phase 1: Calm Baseflow', text: `Jampanna Vagu flowing at normal base stage <strong>${stage}m</strong> (Danger: <strong>${danger}m</strong>). Causeway bridge clear, quartzite canyon banks dry.` },
          { icon: '🌲', title: 'Forest Infiltration', text: `Thick canopy deciduous forest absorbing runoff. Infiltration capacity stable at 3.8 mm/h.` },
          { icon: '🏥', title: 'Safety Status', text: `All tribal hamlets secure. Vehicle passage across causeway unimpeded.` }
        ],
        2: [
          { icon: '🟡', title: 'Phase 2: Canyon Infiltration', text: `Heavy cloudburst (${rain} mm/h) over Mulugu hills. Steep 19.5° quartzite valley slopes funnel rapid sheet runoff directly into the narrow gorge.` },
          { icon: '📈', title: 'Stage Acceleration', text: `Water level rises swiftly to <strong>${stage}m</strong>. Turbidity and streamline velocity increasing.` },
          { icon: '⚠️', title: 'Flash Warning', text: `Early warning issued to Jampanna Bathing Ghat devotees and tribal forest settlers.` }
        ],
        3: [
          { icon: '🟠', title: 'Phase 3: Gorge Funneling & Causeway Overtopping', text: `Soil fully saturated (${sat}%). Channel stage surges to <strong>${stage}m</strong> near danger mark. Water overtops the low causeway slab by +0.3m, severing vehicle crossing.` },
          { icon: '🌊', title: 'Hydraulic Bottleneck', text: `Narrow 12m canyon gorge constricts flood discharge, generating turbulent backward surge waves.` },
          { icon: '🚨', title: 'Operational Action', text: `Police barricade causeway. Riparian hut residents ordered to move up to Mid-Slope terraces.` }
        ],
        4: [
          { icon: '🔴', title: 'Phase 4: Critical 45-Min Flash Flood Crest', text: `Torrential deluge (${rain} mm/h) creates a violent flash wave reaching <strong>${stage}m</strong> (+${(stage - danger).toFixed(1)}m over danger mark ${danger}m)!` },
          { icon: '🏘️', title: 'Riparian Submergence', text: `Jampanna Bathing Ghat platform & Tribal Hamlet East submerged under 1.8m turbulent water. Lowland road completely cut off.` },
          { icon: '🚀', title: 'Emergency High-Ground Flight', text: `Evacuees moving along lit green ridge corridor to ZPHS Hill Top Shelter.` }
        ]
      },
      'TEL-STN-06': {
        // Kuntala Falls Gorge & Ravine
        1: [
          { icon: '🟢', title: 'Phase 1: Scenic Flow Equilibrium', text: `Kadem stream cascading down 45m vertical cliff at normal stage <strong>${stage}m</strong> (Danger: <strong>${danger}m</strong>). Plunge pool basin calm, tourist pathways open.` },
          { icon: '🪨', title: 'Basalt Geology', text: `Deccan basalt rock formations stable. Ravine forest acting as natural sponge.` },
          { icon: '🏥', title: 'Safety Status', text: `Lower viewing deck clear. Exit trail open to parking pavilion.` }
        ],
        2: [
          { icon: '🟡', title: 'Phase 2: Upper Plateau Runoff Surge', text: `Intense downpour (${rain} mm/h) across Neradigonda plateau. Upstream Kadem stream catchment volume doubles within 30 minutes.` },
          { icon: '💦', title: 'Plunge Pool Turbulence', text: `Waterfall discharge explodes with heavy mist spray. Stage reaches <strong>${stage}m</strong> in the plunge basin.` },
          { icon: '⚠️', title: 'Tourist Evacuation', text: `Forest guards sound siren to evacuate all tourists from lower plunge pool stairs.` }
        ],
        3: [
          { icon: '🟠', title: 'Phase 3: Plunge Pool Surge & Footbridge Threat', text: `Water level in confined circular plunge pool boils to <strong>${stage}m</strong>, nearing 6.0m danger threshold. Violent spray and whitewater engulf lower viewing deck.` },
          { icon: '🌉', title: 'Canyon Narrowing', text: `Ravine outlet width (10m) cannot discharge incoming waterfall volume, causing vertical water buildup.` },
          { icon: '🚨', title: 'Operational Action', text: `Suspension footbridge closed. Ravine tourist enclave evacuated to upper plateau shelter.` }
        ],
        4: [
          { icon: '🔴', title: 'Phase 4: Catastrophic Ravine Flash Deluge', text: `Cloudburst (${rain} mm/h) triggers massive hydraulic jump reaching <strong>${stage}m</strong> (+${(stage - danger).toFixed(1)}m above danger level)!` },
          { icon: '🌊', title: 'Pathways Swallowed', text: `Plunge pool overflows completely, drowning the suspension footbridge and washing away lower walking trails.` },
          { icon: '🚀', title: 'High-Ground Refuge', text: `All personnel assembled at Forest Rest House High Ground Camp.` }
        ]
      },
      'TEL-STN-07': {
        // Kadam Dam Spillway & Reservoir
        1: [
          { icon: '🟢', title: 'Phase 1: Normal Conservation Storage', text: `Reservoir forebay stage at <strong>${stage}m</strong> (Full Reservoir Level FRL: <strong>${danger}m</strong>). 3 radial spillway gates closed. Downstream tailrace channel dry.` },
          { icon: '🏗️', title: 'Dam Structural Integrity', text: `Concrete gravity dam wall stable with zero uplift pressure. Sluice gates delivering regulated irrigation flow.` },
          { icon: '🏥', title: 'Safety Status', text: `Peddur village and downstream tailrace settlements safe.` }
        ],
        2: [
          { icon: '🟡', title: 'Phase 2: Heavy Inflow Surcharge', text: `Catchment rainfall (${rain} mm/h) pushes reservoir inflow to 45,000 cusecs. Forebay level climbs steadily to <strong>${stage}m</strong>.` },
          { icon: '⚙️', title: 'Hydraulic Gate Management', text: `Irrigation engineers open sluice gates 30% to moderate forebay rate of rise.` },
          { icon: '⚠️', title: 'Downstream Alert', text: `First flood warning broadcast to Peddur & downstream Kadam riverside villages.` }
        ],
        3: [
          { icon: '🟠', title: 'Phase 3: Radial Spillway Emergency Hoisting', text: `Inflow spikes to 1.2 lakh cusecs; forebay reaches <strong>${stage}m</strong> near FRL ${danger}m. All 3 radial spillway gates hoisted, discharging massive roaring white torrent into tailrace.` },
          { icon: '🌊', title: 'Tailrace Plunge Surge', text: `Downstream riverbed rapidly fills with high-velocity discharge (8.2 m/s), scouring banks and threatening low-lying farmland.` },
          { icon: '🚨', title: 'Operational Action', text: `Downstream causeway closed. Spillway Tailrace Colony evacuated.` }
        ],
        4: [
          { icon: '🔴', title: 'Phase 4: Unprecedented Dam Crest Surcharge', text: `Massive cloudburst inflow (3.5 lakh cusecs) overwhelms gate capacity; water overtops dam spillway crest at <strong>${stage}m</strong> (+${(stage - danger).toFixed(1)}m above FRL)!` },
          { icon: '🏘️', title: 'Downstream Lowland Inundation', text: `Spillway Tailrace Colony & Peddur lowlands inundated under 2.2m raging floodwater; approach road bridge submerged.` },
          { icon: '🚀', title: 'Emergency Flood Relief', text: `Population shifted to Kadam Irrigation Project High-Ground Camp.` }
        ]
      },
      'TEL-STN-08': {
        // Prakash Nagar Munneru River Urban
        1: [
          { icon: '🟢', title: 'Phase 1: Normal Urban River Flow', text: `Munneru river stage at <strong>${stage}m</strong> (Danger Mark: <strong>${danger}m</strong>). Concrete floodwalls offer 6.2m freeboard. Khammam city traffic moving smoothly.` },
          { icon: '🏙️', title: 'Drainage Status', text: `City stormwater gravity outfalls discharging freely. No backwater accumulation.` },
          { icon: '🏥', title: 'Safety Status', text: `Prakash Nagar embankment huts and town market dry and secure.` }
        ],
        2: [
          { icon: '🟡', title: 'Phase 2: Impervious Urban Storm Runoff', text: `High rainfall (${rain} mm/h) over 72% impervious concrete urban catchment creates instantaneous storm drainage surge into Munneru. Stage rises to <strong>${stage}m</strong>.` },
          { icon: '📈', title: 'Hydrograph Steepness', text: `Runoff coefficient 0.85 generates rapid hydrograph peak within 50 minutes.` },
          { icon: '⚠️', title: 'Urban Flood Warning', text: `Municipal Corporation alerts Prakash Nagar and low-lying Munneru riverbank huts.` }
        ],
        3: [
          { icon: '🟠', title: 'Phase 3: Floodwall Buffer Breach & Surcharge', text: `Upstream flash runoff pushes river stage to <strong>${stage}m</strong> near 9.2m danger level. Floodwall freeboard reduced to 0.4m; storm drains back-flood low streets.` },
          { icon: '🌉', title: 'Bridge Scour Threat', text: `Water level reaches multi-span highway bridge pier caps. Debris accumulation at bridge girders.` },
          { icon: '🚨', title: 'Operational Action', text: `Prakash Nagar Embankment Huts evacuation initiated. Municipal pumps activated.` }
        ],
        4: [
          { icon: '🔴', title: 'Phase 4: Critical Urban Floodwall Overtopping', text: `Cloudburst deluge surges Munneru to <strong>${stage}m</strong> (+${(stage - danger).toFixed(1)}m above danger mark ${danger}m)!` },
          { icon: '🏘️', title: 'Massive Settlement Inundation', text: `Floodwater overtops concrete floodwalls, submerging Prakash Nagar huts & Lowland Colony under 1.8m water; main bridge closed.` },
          { icon: '🚀', title: 'Emergency Transit Shelter', text: `Residents relocated to Khammam ZP High School & Municipal Stadium Pavilion.` }
        ]
      },
      'TEL-STN-10': {
        // Musi River Basin / Puranapool Bridge Urban Canal
        1: [
          { icon: '🟢', title: 'Phase 1: Regulated Canal Baseflow', text: `Musi canal stage flowing at base <strong>${stage}m</strong> (Danger Mark: <strong>${danger}m</strong>). Historic Puranapool stone arches clear. Embankment roads dry.` },
          { icon: '🏢', title: 'Dense Urban Setting', text: `Canal retaining walls contain baseflow through Hyderabad old city corridor.` },
          { icon: '🏥', title: 'Safety Status', text: `Puranapool & Chaderghat tenements safe. Arterial bridge traffic normal.` }
        ],
        2: [
          { icon: '🟡', title: 'Phase 2: 88% Concrete Flash Runoff', text: `Heavy storm (${rain} mm/h) over Greater Hyderabad. 88% impervious surface creates immediate 92% runoff into Musi canal; stage rises to <strong>${stage}m</strong>.` },
          { icon: '⚡', title: 'Urban Flash Hydrograph', text: `City nullahs (storm conduits) surcharge rapidly, feeding torrents into Musi.` },
          { icon: '⚠️', title: 'GHMC Flood Advisory', text: `GHMC issues orange alert for Puranapool, Chaderghat, and Moosarambagh lowlands.` }
        ],
        3: [
          { icon: '🟠', title: 'Phase 3: Stone Arch Keystones Submergence', text: `Canal stage surges to <strong>${stage}m</strong>, nearing 5.8m danger mark. Water level reaches arch keystones of historic Puranapool bridge; drainage outfalls back-flood.` },
          { icon: '🌊', title: 'Backwater Choking', text: `Constricted canal sections cause water to back up into low-lying colony alleys.` },
          { icon: '🚨', title: 'Operational Action', text: `Puranapool bridge closed to vehicular traffic. SDRF teams staged with inflatable rescue boats.` }
        ],
        4: [
          { icon: '🔴', title: 'Phase 4: Catastrophic Canal Bank Overtopping', text: `Extreme deluge (${rain} mm/h) forces Musi stage to <strong>${stage}m</strong> (+${(stage - danger).toFixed(1)}m above danger level ${danger}m)!` },
          { icon: '🏘️', title: 'High-Density Urban Inundation', text: `Musi overtops concrete retaining walls, inundating 12+ Puranapool & Chaderghat tenement clusters under 1.6m water; bridge impassable.` },
          { icon: '🚀', title: 'Immediate Evacuation', text: `Civilians shifted to Bahadurpura Relief Transit Complex & High-Level Community Halls.` }
        ]
      }
    };

    // Generic fallback for other stations (Charla, Eturnagaram, Northeast landslides, etc.)
    const defaultCausality = [
      { icon: p === 1 ? '🟢' : (p === 2 ? '🟡' : (p === 3 ? '🟠' : '🔴')), title: `Phase ${p} Dynamic Simulation`, text: `Rainfall (<strong>${rain} mm/h</strong>) vs Soil Saturation (<strong>${sat}%</strong>). Water Stage: <strong>${stage}m</strong> (Danger: <strong>${danger}m</strong>).` },
      { icon: '🔬', title: 'Live Geotechnical & Hydraulic Mechanics', text: data.factorOfSafety ? `Slope Stability Factor of Safety: FoS <strong>${data.factorOfSafety}</strong> (Pore Pressure: <strong>${data.porePressure} kPa</strong>).` : `Flow accumulation and terrain slope govern local overland runoff and river stage response.` },
      { icon: '🏥', title: 'Evacuation Decision Status', text: p >= 4 ? `Immediate mandatory evacuation to nearest high-ground safety shelter active.` : (p >= 3 ? `Pre-emptive warning issued; low-lying routes monitored.` : `All infrastructure and evacuation routes normal.`) }
    ];

    const stnNarrative = causalityMap[stationId] ? (causalityMap[stationId][p] || causalityMap[stationId][2]) : defaultCausality;

    listEl.innerHTML = stnNarrative.map(item => `
      <div class="t3d-causality-item">
        <span class="icon">${item.icon}</span>
        <div>
          <strong style="color:#f8fafc; font-size:11.5px; display:block; margin-bottom:2px;">${item.title}</strong>
          <div style="font-size:11px; color:#cbd5e1; line-height:1.45;">${item.text}</div>
        </div>
      </div>
    `).join('');
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
    this.selectStation(stnId);

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
