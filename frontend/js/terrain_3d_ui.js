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

        <!-- Dynamic Emergency Alarm Floating HUD Banner -->
        <div class="t3d-alarm-banner" id="${this.mountId}-alarm-banner" style="display:none;">
          <div class="t3d-alarm-icon-wrap">
            <span class="t3d-alarm-beacon-icon">🚨</span>
          </div>
          <div class="t3d-alarm-text-block">
            <div class="t3d-alarm-title" id="${this.mountId}-alarm-title">DAM INFLOW SURCHARGE ALARM TRIGGERED</div>
            <div class="t3d-alarm-details" id="${this.mountId}-alarm-details">Inflow 3.2 Lakh Cusecs • Spillway Radial Gates Open • Downstream Sirens Broadcasting</div>
          </div>
          <div class="t3d-alarm-status-pill crit" id="${this.mountId}-alarm-pill">CRITICAL ALARM</div>
        </div>

        <!-- Top Unified Operations HUD Container -->
        <div class="t3d-top-hud">
          <!-- Row 1: Title, Dropdown, and Camera Tools -->
          <div class="t3d-hud-row-main">
            <div class="t3d-title-block">
              <span style="font-size:15px;">${isFlood ? '🌊' : '⛰️'}</span>
              <div>
                <h4 id="${this.mountId}-title">${this.config.title}</h4>
                <div style="font-size:9.5px; color:#94a3b8;" id="${this.mountId}-subtitle">
                  ${isFlood ? 'Telangana Flood Decision Support System • Primary River Basins & Dams' : 'NE-LENS Landslide Early Warning System • Northeast Mountain Corridors'}
                </div>
              </div>
              <span class="mode-pill" id="${this.mountId}-pill" style="background:${isFlood ? '#0284c7' : '#d97706'};">
                ${isFlood ? 'FLOOD DSS' : 'LANDSLIDE DSS'}
              </span>
            </div>

            <!-- Area Selector Dropdown (Strictly filtered by mode) -->
            <div class="t3d-area-select-wrap">
              <label for="${this.mountId}-area-dropdown">📍 ${isFlood ? 'Flood Basin:' : 'Landslide Corridor:'}</label>
              <select class="t3d-area-select" id="${this.mountId}-area-dropdown">
                ${isFlood ? `
                  <optgroup label="⚠️ 6 Primary Telangana Flood Risk Areas">
                    <option value="TEL-STN-01" ${this.config.stationId === 'TEL-STN-01' ? 'selected' : ''}>🌊 Bhadrachalam (Godavari River Ghat)</option>
                    <option value="TEL-STN-03" ${this.config.stationId === 'TEL-STN-03' ? 'selected' : ''}>🏞️ Medaram (Jampanna Vagu Gorge)</option>
                    <option value="TEL-STN-06" ${this.config.stationId === 'TEL-STN-06' ? 'selected' : ''}>💦 Kuntala Falls Ravine (45m Drop)</option>
                    <option value="TEL-STN-07" ${this.config.stationId === 'TEL-STN-07' ? 'selected' : ''}>🏗️ Kadam Dam (Spillway & Forebay)</option>
                    <option value="TEL-STN-08" ${this.config.stationId === 'TEL-STN-08' ? 'selected' : ''}>🏙️ Prakash Nagar (Munneru River Urban)</option>
                    <option value="TEL-STN-10" ${this.config.stationId === 'TEL-STN-10' ? 'selected' : ''}>🌉 Musi River (Puranapool Urban Canal)</option>
                  </optgroup>
                  <optgroup label="Additional Telangana River Basins">
                    <option value="TEL-STN-02" ${this.config.stationId === 'TEL-STN-02' ? 'selected' : ''}>Charla (Taliperu Spillway)</option>
                    <option value="TEL-STN-04" ${this.config.stationId === 'TEL-STN-04' ? 'selected' : ''}>Eturnagaram (Dayam Confluence)</option>
                  </optgroup>
                ` : `
                  <optgroup label="⛰️ 5 Detected Northeast Mountain Landslide Corridors">
                    <option value="AIZAWL-01" ${this.config.stationId === 'AIZAWL-01' ? 'selected' : ''}>⛰️ Aizawl (Tuirial & Durtlang Slope, Mizoram)</option>
                    <option value="CHAMPHAI-02" ${this.config.stationId === 'CHAMPHAI-02' ? 'selected' : ''}>⛰️ Champhai (Tiau Border Escarpment, Mizoram)</option>
                    <option value="EKHASI-03" ${this.config.stationId === 'EKHASI-03' ? 'selected' : ''}>⛰️ East Khasi Hills (Mawkdok/Sohra Gorge, Meghalaya)</option>
                    <option value="DIMAHASAO-04" ${this.config.stationId === 'DIMAHASAO-04' ? 'selected' : ''}>⛰️ Dima Hasao (Jatinga - Haflong Ghat, Assam)</option>
                    <option value="KOHIMA-05" ${this.config.stationId === 'KOHIMA-05' ? 'selected' : ''}>⛰️ Kohima (Dzükou Foothills Bypass, Nagaland)</option>
                  </optgroup>
                `}
              </select>
            </div>

            <!-- Camera Controls & Layer Toggles -->
            <div class="terrain-3d-controls-strip">
              <button class="t3d-btn t3d-btn-fullscreen-toggle" id="${this.mountId}-btn-complete-screen" title="Toggle 100% Complete Screen 3D Decision Support View">⛶ Complete Screen</button>
              <button class="t3d-btn" id="${this.mountId}-btn-dem-modal" title="Import Custom GeoTIFF / DEM Heightmap or LiDAR">📁 Ingest DEM</button>
              <button class="t3d-btn active" data-cam="iso" title="Isometric Aerial View">📐 Orbit</button>
              <button class="t3d-btn" data-cam="top" title="Top-Down 2D DEM Map">🗺️ 2D</button>
              <button class="t3d-btn" data-cam="cross-section" title="Geological Cross-Section">✂️ Slice</button>
              <button class="t3d-btn" id="${this.mountId}-btn-drone" title="Autonomous Drone Aerial Patrol Flight">🚁 Drone</button>
              <button class="t3d-btn" id="${this.mountId}-btn-heatmap" title="Toggle 3D Hazard Risk Heatmap Overlay">🔥 Heatmap</button>
              <button class="t3d-btn active" id="${this.mountId}-btn-runoff" title="Toggle Hydrological Runoff Streamlines">💧 Runoff</button>
              <button class="t3d-btn active" id="${this.mountId}-btn-shader" title="Toggle Advanced GLSL Hydraulic Water Shader">🌊 Water GLSL</button>
              <button class="t3d-btn active" id="${this.mountId}-btn-seepage" title="Toggle Subsurface Darcy Seepage Lines">💧 Seepage</button>
              <button class="t3d-btn active" id="${this.mountId}-btn-audio" title="Toggle Emergency Siren & Flood Audio Effects">🔊 Siren Audio</button>
              <button class="t3d-btn" id="${this.mountId}-toggle-wire" title="Toggle Topological Wireframe">🕸️ Wire</button>
            </div>
          </div>

          <!-- Row 2: Mode-Specific Quick Areas + 4-Phase Hazard Stepper -->
          <div class="t3d-hud-row-sub">
            <!-- Mode-Specific Quick Area Pills -->
            <div class="t3d-sub-group">
              <span class="t3d-sub-label">⚡ ${isFlood ? '6 FLOOD HOTSPOTS:' : '5 DETECTED LANDSLIDE AREAS:'}</span>
              <div class="t3d-fast-btns-wrap">
                ${isFlood ? `
                  <button class="t3d-fast-btn ${this.config.stationId === 'TEL-STN-01' ? 'active' : ''}" data-stn="TEL-STN-01">🌊 Bhadrachalam</button>
                  <button class="t3d-fast-btn ${this.config.stationId === 'TEL-STN-03' ? 'active' : ''}" data-stn="TEL-STN-03">🏞️ Medaram</button>
                  <button class="t3d-fast-btn ${this.config.stationId === 'TEL-STN-06' ? 'active' : ''}" data-stn="TEL-STN-06">💦 Kuntala Falls</button>
                  <button class="t3d-fast-btn ${this.config.stationId === 'TEL-STN-07' ? 'active' : ''}" data-stn="TEL-STN-07">🏗️ Kadam Dam</button>
                  <button class="t3d-fast-btn ${this.config.stationId === 'TEL-STN-08' ? 'active' : ''}" data-stn="TEL-STN-08">🏙️ Prakash Nagar</button>
                  <button class="t3d-fast-btn ${this.config.stationId === 'TEL-STN-10' ? 'active' : ''}" data-stn="TEL-STN-10">🌉 Musi River</button>
                ` : `
                  <button class="t3d-fast-btn ${this.config.stationId === 'AIZAWL-01' ? 'active' : ''}" data-stn="AIZAWL-01">⛰️ Aizawl</button>
                  <button class="t3d-fast-btn ${this.config.stationId === 'CHAMPHAI-02' ? 'active' : ''}" data-stn="CHAMPHAI-02">⛰️ Champhai</button>
                  <button class="t3d-fast-btn ${this.config.stationId === 'EKHASI-03' ? 'active' : ''}" data-stn="EKHASI-03">⛰️ East Khasi Hills</button>
                  <button class="t3d-fast-btn ${this.config.stationId === 'DIMAHASAO-04' ? 'active' : ''}" data-stn="DIMAHASAO-04">⛰️ Dima Hasao</button>
                  <button class="t3d-fast-btn ${this.config.stationId === 'KOHIMA-05' ? 'active' : ''}" data-stn="KOHIMA-05">⛰️ Kohima</button>
                `}
              </div>
            </div>

            <!-- 4-Phase Stepper (Dynamic for Flood vs Landslide) -->
            <div class="t3d-sub-group">
              <span class="t3d-sub-label">⚡ ${isFlood ? 'HOW FLOOD BECOMES RISKY:' : 'HOW SLOPE BECOMES RISKY:'}</span>
              <div class="t3d-phase-stepper-wrap">
                ${isFlood ? `
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
                ` : `
                  <div class="t3d-step-node ${this.config.riskEvolutionPhase === 1 ? 'active-step' : ''}" data-phase="1">
                    <span class="t3d-step-num">PHASE 1</span>
                    <span class="t3d-step-name">🟢 Stable Slope</span>
                  </div>
                  <div class="t3d-step-node ${this.config.riskEvolutionPhase === 2 ? 'active-step' : ''}" data-phase="2">
                    <span class="t3d-step-num">PHASE 2</span>
                    <span class="t3d-step-name">🟡 Pore Surcharge</span>
                  </div>
                  <div class="t3d-step-node ${this.config.riskEvolutionPhase === 3 ? 'active-step' : ''}" data-phase="3">
                    <span class="t3d-step-num">PHASE 3</span>
                    <span class="t3d-step-name">🟠 Tension Cracks</span>
                  </div>
                  <div class="t3d-step-node critical-phase ${this.config.riskEvolutionPhase === 4 ? 'active-step' : ''}" data-phase="4">
                    <span class="t3d-step-num">PHASE 4</span>
                    <span class="t3d-step-name">🔴 Bishop Slip</span>
                  </div>
                `}
              </div>
            </div>
          </div>

          <!-- Row 3: 3D Danger Simulation & 4-Hour Risk Evolution Stages (Hour 0 to Hour 4) -->
          <div class="t3d-hud-row-sim">
            <button class="t3d-sim-master-btn" id="${this.mountId}-btn-run-sim" title="Run Automated 4-Hour Risk Progression Simulation with Early Warning Sirens">
              <span class="sim-pulse-dot"></span>
              <span class="sim-btn-text" id="${this.mountId}-sim-btn-text">⚡ RUN 4-HOUR DANGER SIMULATION</span>
            </button>

            <div class="t3d-sim-stages-group">
              <span class="t3d-sim-stages-lbl">⏱️ 4-HOUR RISK PROGRESSION:</span>
              <button class="t3d-stage-btn active" data-stage="0" title="Hour 0 (Now): Baseline Equilibrium">T+0h (Now)</button>
              <button class="t3d-stage-btn" data-stage="1" title="Hour 1 (+1h): Precipitation Inflow & Runoff Rise">⏱️ +1h (Inflow)</button>
              <button class="t3d-stage-btn" data-stage="2" title="Hour 2 (+2h): Saturated Catchment Surge Watch">⏱️ +2h (Surge)</button>
              <button class="t3d-stage-btn stage-alarm" data-stage="3" title="Hour 3 (+3h): 🚨 Critical Danger Breach & Shear Slip">🚨 +3h (Breach)</button>
              <button class="t3d-stage-btn stage-crit" data-stage="4" title="Hour 4 (+4h): 🔴 Peak Inundation & Catastrophic Deluge">🔴 +4h (Peak)</button>
            </div>

            <button class="t3d-btn" id="${this.mountId}-btn-toggle-factors" title="Toggle Factors Alteration Matrix Table">
              📊 4-Hour Factors Matrix
            </button>
          </div>
        </div>

        <!-- Floating Dynamic Factors & Telemetry Alteration Matrix Card -->
        <div class="t3d-factors-matrix-card" id="${this.mountId}-factors-matrix" style="display:none;">
          <div class="t3d-factors-matrix-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:16px;">📊</span>
              <div>
                <h5 style="margin:0; font-size:12px; font-weight:800; color:#f8fafc;">4-HOUR DYNAMIC RISK ALTERATION MATRIX</h5>
                <div style="font-size:9.5px; color:#94a3b8;">How Hydrodynamic, Pore Pressure & Inundation Factors Evolve Over The Next 4 Hours</div>
              </div>
            </div>
            <button class="t3d-factors-close" id="${this.mountId}-factors-close">✕</button>
          </div>

          <div class="t3d-factors-table-wrap">
            <table class="t3d-factors-table">
              <thead>
                <tr>
                  <th>Parameters / Factors</th>
                  <th class="stage-col stage-col-0">T+0h (Now)</th>
                  <th class="stage-col stage-col-1">T+1h (Inflow)</th>
                  <th class="stage-col stage-col-2">T+2h (Surge)</th>
                  <th class="stage-col stage-col-3 highlight-alarm">🚨 T+3h (Breach)</th>
                  <th class="stage-col stage-col-4 highlight-crit">🔴 T+4h (Peak)</th>
                  <th class="live-col">Current Live</th>
                </tr>
              </thead>
              <tbody id="${this.mountId}-factors-tbody">
                <!-- Dynamically updated by renderFactorsMatrix -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- GeoTIFF / DEM Ingestion Floating Modal -->
        <div class="t3d-dem-modal" id="${this.mountId}-dem-modal" style="display:none;">
          <div class="t3d-dem-modal-box">
            <div class="t3d-dem-modal-header">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:18px;">📁</span>
                <div>
                  <h4 style="margin:0; font-size:14px; color:#f8fafc; font-weight:800;">GeoTIFF & High-Res LiDAR DEM Ingestion</h4>
                  <div style="font-size:10px; color:#94a3b8;">High-Precision Digital Elevation Model Ingestion & Interpolation</div>
                </div>
              </div>
              <button class="t3d-dem-close" id="${this.mountId}-dem-close">✕</button>
            </div>

            <div class="t3d-dem-modal-body">
              <div class="t3d-dem-section-title">✨ PRESET HIGH-RESOLUTION LiDAR & DEM DATASETS</div>
              <div class="t3d-dem-presets-grid">
                <button class="t3d-dem-preset-btn" data-preset="DEM-KUNTALA-LIDAR">
                  <span class="preset-icon">💦</span>
                  <span class="preset-name">Kuntala 45m LiDAR</span>
                  <span class="preset-tag">Basalt Drop & Gorge</span>
                </button>
                <button class="t3d-dem-preset-btn" data-preset="DEM-MEDARAM-BASIN">
                  <span class="preset-icon">🏞️</span>
                  <span class="preset-name">Medaram Catchment</span>
                  <span class="preset-tag">Braided Terraces</span>
                </button>
                <button class="t3d-dem-preset-btn" data-preset="DEM-BHADRACHALAM-GHAT">
                  <span class="preset-icon">🌊</span>
                  <span class="preset-name">Bhadrachalam Ghat</span>
                  <span class="preset-tag">Godavari Floodwalls</span>
                </button>
                <button class="t3d-dem-preset-btn" data-preset="DEM-AIZAWL-DURTLANG">
                  <span class="preset-icon">⛰️</span>
                  <span class="preset-name">Aizawl Durtlang</span>
                  <span class="preset-tag">38° Dip Slope Escarpment</span>
                </button>
                <button class="t3d-dem-preset-btn" data-preset="DEM-GANGTOK-RIDGE">
                  <span class="preset-icon">🏔️</span>
                  <span class="preset-name">Gangtok Urban Ridge</span>
                  <span class="preset-tag">Active Fault Shear Zone</span>
                </button>
              </div>

              <div class="t3d-dem-section-title" style="margin-top:14px;">📤 UPLOAD CUSTOM GeoTIFF / RASTER / JSON MATRIX</div>
              <div class="t3d-dem-dropzone" id="${this.mountId}-dem-dropzone">
                <input type="file" id="${this.mountId}-dem-fileinput" accept=".tif,.tiff,.png,.jpg,.jpeg,.json" style="display:none;">
                <span style="font-size:26px;">📥</span>
                <div style="font-size:12px; font-weight:700; color:#e2e8f0; margin-top:4px;">Drag & Drop GeoTIFF, Grayscale Image, or DEM JSON</div>
                <div style="font-size:10px; color:#94a3b8; margin-top:2px;">Supports 16-bit Grayscale PNG/TIFF, GeoTIFF elevation bands, or 2D JSON matrix</div>
                <button class="t3d-btn" id="${this.mountId}-dem-browse" style="margin-top:8px;">Browse Files</button>
              </div>

              <div class="t3d-dem-slider-wrap" style="margin-top:12px;">
                <div style="display:flex; justify-content:space-between; font-size:11px; color:#cbd5e1; font-weight:600;">
                  <span>Vertical Exaggeration:</span>
                  <strong id="${this.mountId}-lbl-exag" style="color:#38bdf8;">1.0x</strong>
                </div>
                <input type="range" class="t3d-range-input" id="${this.mountId}-sld-exag" min="0.3" max="3.0" step="0.1" value="1.0" style="margin-top:4px;">
              </div>

              <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:14px;">
                <button class="t3d-btn" id="${this.mountId}-dem-reset" style="background:#334155;">Reset to Default</button>
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
            <div class="t3d-infra-badge safe" id="${this.mountId}-badge-shelter" style="border-color:#10b981; background:rgba(16,185,129,0.15);">
              <span>🛡️ Safe Sanctuary:</span> <strong style="color:#34d399;">100% PROTECTED</strong>
            </div>
          </div>

          <!-- Dynamic Causality List -->
          <div class="t3d-causality-list" id="${this.mountId}-causality-list">
            <!-- Populated dynamically via renderCausalityNarrative -->
          </div>
        </div>

        <!-- Left Floating Villages Flood Impact Dock (Flood Mode) -->
        <div class="t3d-villages-card" id="${this.mountId}-villages-card" style="${isFlood ? 'display:flex;' : 'display:none;'}">
          <div class="t3d-villages-header">
            <h5><span>🏘️ RIPARIAN VILLAGES IMPACT</span> <span style="font-size:9.5px; color:#38bdf8;">LIVE TELEMETRY</span></h5>
            <button class="t3d-factors-close" id="${this.mountId}-villages-close" title="Toggle Dock">─</button>
          </div>
          <div class="t3d-villages-list" id="${this.mountId}-villages-list">
            <!-- Populated dynamically via terrain3d-update -->
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
          <h5><span>⚙️ ${isFlood ? 'Hydraulic Stress Simulator' : 'Geotechnical Stress Simulator'}</span> <span style="font-size:9.5px; color:#94a3b8;">Real-Time</span></h5>
          
          <div class="t3d-slider-row">
            <div class="t3d-slider-header">
              <span>${isFlood ? 'Rainfall Intensity' : 'Rainfall Surcharge'}</span>
              <span class="val-num" id="${this.mountId}-lbl-rain">${this.config.rainfall} mm/h</span>
            </div>
            <input type="range" class="t3d-range-input" id="${this.mountId}-sld-rain" min="0" max="180" value="${this.config.rainfall}">
          </div>

          <div class="t3d-slider-row">
            <div class="t3d-slider-header">
              <span>${isFlood ? 'Soil Saturation' : 'Soil Moisture / Saturation'}</span>
              <span class="val-num" id="${this.mountId}-lbl-sat">${this.config.saturation}%</span>
            </div>
            <input type="range" class="t3d-range-input" id="${this.mountId}-sld-sat" min="15" max="100" value="${this.config.saturation}">
          </div>

          <div class="t3d-slider-row">
            <div class="t3d-slider-header">
              <span>${isFlood ? 'River Water Stage' : 'Pore Water Head / Table'}</span>
              <span class="val-num" id="${this.mountId}-lbl-stage">${this.config.waterLevel} m</span>
            </div>
            <input type="range" class="t3d-range-input" id="${this.mountId}-sld-stage" min="0.5" max="18.0" step="0.1" value="${this.config.waterLevel}">
          </div>

          <div class="t3d-slider-row">
            <div class="t3d-slider-header">
              <span>${isFlood ? 'Terrain Slope (α)' : 'Slope Gradient (α)'}</span>
              <span class="val-num" id="${this.mountId}-lbl-slope">${this.config.slopeAngle}°</span>
            </div>
            <input type="range" class="t3d-range-input" id="${this.mountId}-sld-slope" min="10" max="60" step="1" value="${this.config.slopeAngle}">
          </div>

          ${!isFlood ? `
            <div class="t3d-slider-row">
              <div class="t3d-slider-header">
                <span>Bingham Yield Stress (τy)</span>
                <span class="val-num" id="${this.mountId}-lbl-yield">35 Pa</span>
              </div>
              <input type="range" class="t3d-range-input" id="${this.mountId}-sld-yield" min="10" max="120" step="1" value="35">
            </div>
          ` : ''}

          <!-- Telemetry Metric Pill Box -->
          <div class="t3d-telemetry-pill-box">
            <div class="t3d-tel-pill-row">
              <span>${isFlood ? 'Hazard FoS:' : 'Bishop FoS Factor:'}</span>
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
              <span>${isFlood ? 'Danger Mark:' : 'Slide Displacement:'}</span>
              <strong id="${this.mountId}-val-danger-lvl" style="color:#ef4444;">${isFlood ? '5.2 m' : '0.0 m'}</strong>
            </div>
            ${isFlood ? `
              <div class="t3d-tel-pill-row" id="${this.mountId}-row-inflow">
                <span>Inflow / Runoff:</span>
                <strong id="${this.mountId}-val-inflow" style="color:#38bdf8;">0.85 Lk Cusecs</strong>
              </div>
              <div class="t3d-tel-pill-row" id="${this.mountId}-row-outflow">
                <span>Spillway Outflow:</span>
                <strong id="${this.mountId}-val-outflow" style="color:#f59e0b;">0.65 Lk Cusecs</strong>
              </div>
              <div class="t3d-tel-pill-row" id="${this.mountId}-row-gates">
                <span>Radial Gates:</span>
                <strong id="${this.mountId}-val-gates" style="color:#0284c7;">15% Open</strong>
              </div>
              <div class="t3d-tel-pill-row" id="${this.mountId}-row-siren">
                <span>Emergency Alarm:</span>
                <strong id="${this.mountId}-val-siren" style="color:#10b981;">🟢 NORMAL (SIREN ARMED)</strong>
              </div>
            ` : `
              <div class="t3d-tel-pill-row">
                <span>Slope Stability Alarm:</span>
                <strong id="${this.mountId}-val-siren" style="color:#10b981;">🟢 SAFE EQUILIBRIUM</strong>
              </div>
            `}
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

    // 6a-1. Complete Screen Mode Toggle
    const compScreenBtn = document.getElementById(`${this.mountId}-btn-complete-screen`);
    if (compScreenBtn) {
      compScreenBtn.addEventListener('click', () => {
        this.toggleCompleteScreen();
      });
    }

    // 6a-2. Villages Dock Toggle
    const vCloseBtn = document.getElementById(`${this.mountId}-villages-close`);
    if (vCloseBtn) {
      vCloseBtn.addEventListener('click', () => {
        const vList = document.getElementById(`${this.mountId}-villages-list`);
        if (vList) {
          const isHidden = vList.style.display === 'none';
          vList.style.display = isHidden ? 'flex' : 'none';
          vCloseBtn.textContent = isHidden ? '─' : '+';
        }
      });
    }

    // 6b. Advanced GLSL Water Shader Toggle
    const shaderBtn = document.getElementById(`${this.mountId}-btn-shader`);
    if (shaderBtn) {
      shaderBtn.addEventListener('click', () => {
        if (this.visualizer) {
          const active = this.visualizer.toggleAdvancedWaterShader();
          shaderBtn.classList.toggle('active', active);
        }
      });
    }

    // 6c. Subsurface Darcy Seepage Lines Toggle
    const seepageBtn = document.getElementById(`${this.mountId}-btn-seepage`);
    if (seepageBtn) {
      seepageBtn.addEventListener('click', () => {
        if (this.visualizer) {
          const active = this.visualizer.toggleSeepage();
          seepageBtn.classList.toggle('active', active);
        }
      });
    }

    // 6d. Audio Emergency Siren & Water Torrent Mute Toggle
    const audioBtn = document.getElementById(`${this.mountId}-btn-audio`);
    if (audioBtn) {
      let audioMuted = false;
      audioBtn.addEventListener('click', () => {
        audioMuted = !audioMuted;
        audioBtn.classList.toggle('active', !audioMuted);
        audioBtn.textContent = audioMuted ? '🔇 Audio Muted' : '🔊 Siren Audio';
        if (typeof window !== 'undefined' && window.disasterAudio) {
          window.disasterAudio.setMuted(audioMuted);
        }
      });
    }

    // 6e. GeoTIFF / DEM Ingestion Modal & Controls
    const demModalBtn = document.getElementById(`${this.mountId}-btn-dem-modal`);
    const demModal = document.getElementById(`${this.mountId}-dem-modal`);
    const demCloseBtn = document.getElementById(`${this.mountId}-dem-close`);
    const demFileInput = document.getElementById(`${this.mountId}-dem-fileinput`);
    const demBrowseBtn = document.getElementById(`${this.mountId}-dem-browse`);
    const demDropzone = document.getElementById(`${this.mountId}-dem-dropzone`);
    const demResetBtn = document.getElementById(`${this.mountId}-dem-reset`);
    const sldExag = document.getElementById(`${this.mountId}-sld-exag`);
    const lblExag = document.getElementById(`${this.mountId}-lbl-exag`);

    if (demModalBtn && demModal) {
      demModalBtn.addEventListener('click', () => {
        demModal.style.display = 'flex';
      });
    }

    if (demCloseBtn && demModal) {
      demCloseBtn.addEventListener('click', () => {
        demModal.style.display = 'none';
      });
    }

    // Preset DEM Ingestion buttons
    const presetBtns = container.querySelectorAll('.t3d-dem-preset-btn');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const presetId = btn.getAttribute('data-preset');
        if (this.visualizer) {
          this.visualizer.loadDEMPreset(presetId);
          presetBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (demModal) demModal.style.display = 'none';
        }
      });
    });

    // File Input & Drag/Drop
    if (demBrowseBtn && demFileInput) {
      demBrowseBtn.addEventListener('click', () => demFileInput.click());
    }

    const handleDEMFile = (file) => {
      if (!file || !this.visualizer) return;
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const json = JSON.parse(e.target.result);
            this.visualizer.loadCustomDEMFromJSON(json);
            if (demModal) demModal.style.display = 'none';
          } catch (err) {
            alert('Failed to parse DEM JSON: ' + err.message);
          }
        };
        reader.readAsText(file);
      } else {
        // Image or raster heightmap
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            this.visualizer.loadCustomDEMFromImage(img, 100, 480);
            if (demModal) demModal.style.display = 'none';
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    };

    if (demFileInput) {
      demFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleDEMFile(e.target.files[0]);
        }
      });
    }

    if (demDropzone) {
      demDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        demDropzone.classList.add('dragover');
      });
      demDropzone.addEventListener('dragleave', () => {
        demDropzone.classList.remove('dragover');
      });
      demDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        demDropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleDEMFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (sldExag && lblExag) {
      sldExag.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        lblExag.textContent = `${val.toFixed(1)}x`;
        if (this.visualizer) this.visualizer.setDEMExaggeration(val);
      });
    }

    if (demResetBtn) {
      demResetBtn.addEventListener('click', () => {
        if (this.visualizer) {
          this.visualizer.resetCustomDEM();
          presetBtns.forEach(b => b.classList.remove('active'));
          if (demModal) demModal.style.display = 'none';
        }
      });
    }

    // 6e. Bingham Yield Stress Slider
    const sldYield = document.getElementById(`${this.mountId}-sld-yield`);
    const lblYield = document.getElementById(`${this.mountId}-lbl-yield`);
    if (sldYield && lblYield) {
      sldYield.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        lblYield.textContent = `${val} Pa`;
        if (this.visualizer) this.visualizer.setBinghamParameters(val, 14.0);
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

      // 🚨 Emergency Alarm Floating Banner Update
      const alarmBanner = document.getElementById(`${this.mountId}-alarm-banner`);
      const alarmTitle = document.getElementById(`${this.mountId}-alarm-title`);
      const alarmDetails = document.getElementById(`${this.mountId}-alarm-details`);
      const alarmPill = document.getElementById(`${this.mountId}-alarm-pill`);

      if (alarmBanner && alarmTitle && alarmDetails && alarmPill) {
        if (data.alarmTriggered) {
          alarmBanner.style.display = 'flex';
          const isCrit = data.alarmLevel === 'CRITICAL';
          alarmBanner.className = `t3d-alarm-banner ${isCrit ? 'alarm-critical' : 'alarm-warning'}`;
          alarmPill.className = `t3d-alarm-status-pill ${isCrit ? 'crit' : 'warn'}`;
          alarmPill.textContent = isCrit ? '🚨 CRITICAL SIREN ACTIVE' : '⚠️ ALARM ARMED';

          if (data.mode === 'flood') {
            const hasDam = data.stationId === 'TEL-STN-07' || data.stationId === 'TEL-STN-02';
            if (hasDam) {
              alarmTitle.textContent = isCrit 
                ? '🚨 DAM INFLOW SURCHARGE & SPILLWAY OVERTOPPING ALARM' 
                : '⚠️ RESERVOIR INFLOW ACCUMULATION & SURCHARGE ALERT';
              alarmDetails.textContent = `Inflow: ${((data.inflowCusecs || 85000) / 100000).toFixed(2)} Lakh Cusecs • Outflow: ${((data.outflowCusecs || 65000) / 100000).toFixed(2)} Lakh Cusecs • Gates: ${data.gateOpenPct || 35}% Open • High-decibel Warning Siren Broadcasting`;
            } else {
              alarmTitle.textContent = isCrit 
                ? '🚨 CRITICAL FLOOD INUNDATION & SURGE ALARM' 
                : '⚠️ RIVER WATER LEVEL SURCHARGE WARNING';
              alarmDetails.textContent = `Rainfall: ${data.rainfall} mm/h • River Stage: ${data.waterLevel.toFixed(1)}m (Danger Mark: ${data.dangerWaterLevel}m) • Riparian Settlements Inundated`;
            }
          } else {
            alarmTitle.textContent = isCrit 
              ? '🚨 IMMINENT SLOPE SHEAR FAILURE & DEBRIS FLOW ALARM' 
              : '⚠️ PORE PRESSURE SURCHARGE & INSTABILITY WARNING';
            alarmDetails.textContent = `Bishop FoS: ${data.factorOfSafety} • Soil Moisture: ${data.saturation}% • Cumulative Displacement: ${data.slidingDisplacementMeters || '0.0'}m`;
          }
        } else {
          alarmBanner.style.display = 'none';
        }
      }

      // Update Bridge & Road Infrastructure Badges
      const badgeBridge = document.getElementById(`${this.mountId}-badge-bridge`);
      const badgeRoad = document.getElementById(`${this.mountId}-badge-road`);
      const badgeHouses = document.getElementById(`${this.mountId}-badge-houses`);

      if (data.mode === 'landslide') {
        if (badgeBridge) {
          const isShearCrit = parseFloat(data.factorOfSafety) < 1.0;
          badgeBridge.className = `t3d-infra-badge ${isShearCrit ? 'danger' : 'safe'}`;
          badgeBridge.innerHTML = isShearCrit
            ? `<span>⛰️ Slip Failure:</span> <strong style="color:#ef4444;">🚨 ACTIVE SHEAR SLIDE (${data.slidingDisplacementMeters || '12.0'}m)</strong>`
            : `<span>⛰️ Slip Status:</span> <strong>STABLE FoS ${data.factorOfSafety || '1.8'}</strong>`;
        }

        if (badgeRoad && data.isLowlandRoadCutoff !== undefined) {
          badgeRoad.className = `t3d-infra-badge ${data.isLowlandRoadCutoff ? 'danger' : 'safe'}`;
          badgeRoad.innerHTML = data.isLowlandRoadCutoff
            ? `<span>🛣️ Mountain Highway:</span> <strong style="color:#ef4444;">🚨 SEVERED / BURIED</strong>`
            : `<span>🛣️ Mountain Highway:</span> <strong>CLEAR & OPEN</strong>`;
        }

        if (badgeHouses && data.floodedHousesCount !== undefined) {
          const isCritical = data.floodedHousesCount > 0;
          badgeHouses.className = `t3d-infra-badge ${isCritical ? 'danger' : 'safe'}`;
          badgeHouses.innerHTML = `<span>🏘️ Remote Huts:</span> <strong style="color:${isCritical ? '#ef4444' : '#34d399'};">${data.floodedHousesCount} / ${data.totalHouses} In Path</strong>`;
        }
      } else {
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
      }

      const badgeShelter = document.getElementById(`${this.mountId}-badge-shelter`);
      if (badgeShelter) {
        badgeShelter.className = 't3d-infra-badge safe';
        badgeShelter.innerHTML = `<span>🛡️ Safe Sanctuary:</span> <strong style="color:#34d399;">100% PROTECTED</strong>`;
      }

      // 🏘️ Update Riparian Villages Live Flood Impact Telemetry Dock
      const vList = document.getElementById(`${this.mountId}-villages-list`);
      const vCard = document.getElementById(`${this.mountId}-villages-card`);
      if (vCard) {
        vCard.style.display = data.mode === 'flood' ? 'flex' : 'none';
      }
      if (vList && data.villageDetails && data.villageDetails.length > 0) {
        vList.innerHTML = data.villageDetails.map((v) => {
          const isCrit = v.status === 'inundated';
          const isWarn = v.status === 'threatened';
          const statusClass = isCrit ? 'status-inundated' : (isWarn ? 'status-threatened' : 'status-safe');
          const tagClass = isCrit ? 'inundated' : (isWarn ? 'threatened' : 'safe');
          const tagText = isCrit ? '🚨 INUNDATED' : (isWarn ? '⚠️ WARNING' : '🟢 SAFE');
          const depthClass = isCrit ? 'crit' : (isWarn ? 'warn' : 'safe');
          const depthText = isCrit 
            ? `+${(v.maxSubDepth * 1.5).toFixed(1)}m Inundated (${v.floodedHouses}/${v.totalHouses} Homes)` 
            : (isWarn ? `Buffer ${Math.abs(v.clearanceM).toFixed(1)}m (Threat)` : `Buffer +${Math.abs(v.clearanceM).toFixed(1)}m Safe`);

          return `
            <div class="t3d-village-item ${statusClass}" data-vidx="${v.index}" title="Click to fly 3D camera over ${v.name}">
              <div class="t3d-village-top-row">
                <span class="t3d-village-name">🏘️ ${v.name}</span>
                <span class="t3d-village-status-tag ${tagClass}">${tagText}</span>
              </div>
              <div class="t3d-village-meta">
                <span>MSL: +${v.elevationMSL}m</span>
                <span class="t3d-village-depth-val ${depthClass}">${depthText}</span>
              </div>
            </div>
          `;
        }).join('');

        // Wire click-to-fly
        vList.querySelectorAll('.t3d-village-item').forEach(el => {
          el.addEventListener('click', () => {
            const vidx = parseInt(el.getAttribute('data-vidx'));
            if (this.visualizer && typeof this.visualizer.flyToVillage === 'function') {
              this.visualizer.flyToVillage(vidx);
            }
          });
        });
      }

      // Update FoS & Pore Pressure pill values
      const valFos = document.getElementById(`${this.mountId}-val-fos`);
      const valPore = document.getElementById(`${this.mountId}-val-pore`);
      const valDanger = document.getElementById(`${this.mountId}-val-danger-lvl`);
      const valInflow = document.getElementById(`${this.mountId}-val-inflow`);
      const valOutflow = document.getElementById(`${this.mountId}-val-outflow`);
      const valGates = document.getElementById(`${this.mountId}-val-gates`);
      const valSiren = document.getElementById(`${this.mountId}-val-siren`);

      if (valFos && data.factorOfSafety) {
        valFos.textContent = `${data.factorOfSafety} (${parseFloat(data.factorOfSafety) < 1.0 ? 'UNSTABLE' : (parseFloat(data.factorOfSafety) < 1.3 ? 'MARGINAL' : 'STABLE')})`;
        valFos.style.color = parseFloat(data.factorOfSafety) < 1.0 ? '#ef4444' : (parseFloat(data.factorOfSafety) < 1.3 ? '#f59e0b' : '#10b981');
      }
      if (valPore && data.porePressure) {
        valPore.textContent = `${data.porePressure} kPa`;
      }
      if (valDanger) {
        if (data.mode === 'landslide') {
          valDanger.textContent = `${data.slidingDisplacementMeters || '0.0'} m`;
          valDanger.style.color = parseFloat(data.slidingDisplacementMeters || '0') > 4 ? '#ef4444' : (parseFloat(data.slidingDisplacementMeters || '0') > 1 ? '#f59e0b' : '#38bdf8');
        } else {
          valDanger.textContent = `${data.dangerWaterLevel || '5.2'} m`;
          valDanger.style.color = '#ef4444';
        }
      }

      if (valInflow && data.inflowCusecs !== undefined) {
        valInflow.textContent = `${(data.inflowCusecs / 100000).toFixed(2)} Lk Cusecs`;
        valInflow.style.color = data.inflowCusecs > 180000 ? '#ef4444' : '#38bdf8';
      }
      if (valOutflow && data.outflowCusecs !== undefined) {
        valOutflow.textContent = `${(data.outflowCusecs / 100000).toFixed(2)} Lk Cusecs`;
        valOutflow.style.color = data.outflowCusecs > 150000 ? '#ef4444' : '#f59e0b';
      }
      if (valGates && data.gateOpenPct !== undefined) {
        valGates.textContent = `${data.gateOpenPct}% Open`;
        valGates.style.color = data.gateOpenPct > 70 ? '#ef4444' : '#0284c7';
      }
      if (valSiren) {
        if (data.alarmLevel === 'CRITICAL') {
          valSiren.textContent = '🔴 CRITICAL SIREN ACTIVE (110 dB)';
          valSiren.style.color = '#ef4444';
        } else if (data.alarmLevel === 'WARNING') {
          valSiren.textContent = '🟡 WARNING (SIREN ARMED)';
          valSiren.style.color = '#f59e0b';
        } else {
          valSiren.textContent = '🟢 NORMAL (SAFE BASEFLOW)';
          valSiren.style.color = '#10b981';
        }
      }

      // Render Dynamic Causality Narrative
      this.renderCausalityNarrative(data.stationId, data.riskPhase, data);

      // Render Dynamic Factors Alteration Matrix
      this.renderFactorsMatrix(data);
    });

    // 12. 3D Danger Simulation & 3 Animation Stages Controls
    const btnRunSim = document.getElementById(`${this.mountId}-btn-run-sim`);
    const simBtnText = document.getElementById(`${this.mountId}-sim-btn-text`);
    const stageBtns = container.querySelectorAll('.t3d-stage-btn');
    const btnToggleFactors = document.getElementById(`${this.mountId}-btn-toggle-factors`);
    const factorsMatrixCard = document.getElementById(`${this.mountId}-factors-matrix`);
    const factorsCloseBtn = document.getElementById(`${this.mountId}-factors-close`);

    let isSimRunning = false;

    if (btnRunSim) {
      btnRunSim.addEventListener('click', () => {
        if (!this.visualizer) return;
        isSimRunning = !isSimRunning;

        if (isSimRunning) {
          btnRunSim.classList.add('sim-running');
          if (simBtnText) simBtnText.textContent = '⏹ STOP SIMULATION';

          this.visualizer.runDangerEvolutionSimulation(
            (stage) => {
              stageBtns.forEach(b => {
                b.classList.toggle('active', parseInt(b.getAttribute('data-stage')) === stage);
              });
              this.highlightMatrixColumn(stage);
            },
            () => {
              isSimRunning = false;
              btnRunSim.classList.remove('sim-running');
              if (simBtnText) simBtnText.textContent = '⚡ RUN 4-HOUR DANGER SIMULATION';
            }
          );
        } else {
          this.visualizer.stopDangerSimulation();
          btnRunSim.classList.remove('sim-running');
          if (simBtnText) simBtnText.textContent = '⚡ RUN 4-HOUR DANGER SIMULATION';
        }
      });
    }

    // Direct 3D Animation Stage buttons (Hour 0 to Hour 4)
    stageBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const stage = parseInt(btn.getAttribute('data-stage'));
        stageBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (this.visualizer) {
          this.visualizer.stopDangerSimulation();
          isSimRunning = false;
          if (btnRunSim) btnRunSim.classList.remove('sim-running');
          if (simBtnText) simBtnText.textContent = '⚡ RUN 4-HOUR DANGER SIMULATION';
          this.visualizer.setSimulationTimeStage(stage);
          this.highlightMatrixColumn(stage);
        }
      });
    });

    // Toggle Factors Matrix Card
    if (btnToggleFactors && factorsMatrixCard) {
      btnToggleFactors.addEventListener('click', () => {
        const isHidden = factorsMatrixCard.style.display === 'none' || !factorsMatrixCard.style.display;
        factorsMatrixCard.style.display = isHidden ? 'block' : 'none';
        btnToggleFactors.classList.toggle('active', isHidden);
        if (isHidden && this.visualizer) {
          this.renderFactorsMatrix(this.visualizer.statsPayload || {});
        }
      });
    }

    if (factorsCloseBtn && factorsMatrixCard) {
      factorsCloseBtn.addEventListener('click', () => {
        factorsMatrixCard.style.display = 'none';
        if (btnToggleFactors) btnToggleFactors.classList.remove('active');
      });
    }

    // Listen to Simulation Stage Updates
    window.addEventListener('terrain3d-simulation-stage', (e) => {
      const d = e.detail;
      const stage = d.stageMinutes;

      // Update Sliders and UI inputs to match simulation
      if (sldRain) sldRain.value = d.rainfall;
      if (lblRain) lblRain.textContent = `${d.rainfall} mm/h`;
      if (sldSat) sldSat.value = d.saturation;
      if (lblSat) lblSat.textContent = `${d.saturation}%`;
      if (sldStage) sldStage.value = d.waterLevel;
      if (lblStage) lblStage.textContent = `${d.waterLevel.toFixed(1)} m`;

      this.highlightMatrixColumn(stage);
      if (d.stats) this.renderFactorsMatrix(d.stats);
    });
  }

  highlightMatrixColumn(stage) {
    const container = document.getElementById(this.mountId);
    if (!container) return;

    const cols = container.querySelectorAll('.stage-col');
    cols.forEach(c => c.classList.remove('active-col-pulse'));

    const activeCol = container.querySelector(`.stage-col-${stage}`);
    if (activeCol) activeCol.classList.add('active-col-pulse');

    const tdCols = container.querySelectorAll(`td[data-stage-col="${stage}"]`);
    container.querySelectorAll('td[data-stage-col]').forEach(td => td.classList.remove('active-cell-highlight'));
    tdCols.forEach(td => td.classList.add('active-cell-highlight'));
  }

  renderFactorsMatrix(data) {
    const tbody = document.getElementById(`${this.mountId}-factors-tbody`);
    if (!tbody) return;

    const isFlood = (data && data.mode === 'flood') || this.config.mode === 'flood';
    const rain = (data && data.rainfall !== undefined ? data.rainfall : this.config.rainfall || 35).toFixed(0);
    const sat = (data && data.saturation !== undefined ? data.saturation : this.config.saturation || 75).toFixed(0);
    const stage = (data && data.waterLevel !== undefined ? data.waterLevel : this.config.waterLevel || 3.8).toFixed(1);
    const dangerLvl = (data && data.dangerWaterLevel ? data.dangerWaterLevel : 5.2).toFixed(1);

    if (isFlood) {
      const inflow = data && data.inflowCusecs ? ((data.inflowCusecs) / 100000).toFixed(2) : '0.85';
      const outflow = data && data.outflowCusecs ? ((data.outflowCusecs) / 100000).toFixed(2) : '0.65';
      const gates = data && data.gateOpenPct !== undefined ? data.gateOpenPct : 25;
      const alarmStatus = data && data.alarmLevel ? (data.alarmLevel === 'CRITICAL' ? '🔴 CRITICAL' : (data.alarmLevel === 'WARNING' ? '🟡 WARNING' : '🟢 NORMAL')) : '🟢 NORMAL';

      tbody.innerHTML = `
        <tr>
          <td><strong>🌧️ Rainfall Intensity</strong></td>
          <td data-stage-col="0">18 mm/h</td>
          <td data-stage-col="1">58 mm/h</td>
          <td data-stage-col="2">98 mm/h</td>
          <td data-stage-col="3" class="warn-val">145 mm/h</td>
          <td data-stage-col="4" class="crit-val">185 mm/h</td>
          <td class="live-val"><strong>${rain} mm/h</strong></td>
        </tr>
        <tr>
          <td><strong>💧 Soil Moisture Saturation</strong></td>
          <td data-stage-col="0">38%</td>
          <td data-stage-col="1">68%</td>
          <td data-stage-col="2">86%</td>
          <td data-stage-col="3" class="warn-val">95%</td>
          <td data-stage-col="4" class="crit-val">99%</td>
          <td class="live-val"><strong>${sat}%</strong></td>
        </tr>
        <tr>
          <td><strong>🌊 River Stage / Forebay Head</strong></td>
          <td data-stage-col="0">2.2 m</td>
          <td data-stage-col="1">3.40 m</td>
          <td data-stage-col="2">4.60 m</td>
          <td data-stage-col="3" class="warn-val">5.80 m (Danger)</td>
          <td data-stage-col="4" class="crit-val">7.20 m (Overtopped)</td>
          <td class="live-val"><strong style="color:${parseFloat(stage) >= parseFloat(dangerLvl) ? '#ef4444' : '#38bdf8'};">${stage} m</strong></td>
        </tr>
        <tr>
          <td><strong>⚡ Catchment Inflow Surge</strong></td>
          <td data-stage-col="0">0.35 Lk Cusecs</td>
          <td data-stage-col="1">1.25 Lk Cusecs</td>
          <td data-stage-col="2">2.40 Lk Cusecs</td>
          <td data-stage-col="3" class="warn-val">3.65 Lk Cusecs</td>
          <td data-stage-col="4" class="crit-val">4.50 Lk Cusecs</td>
          <td class="live-val"><strong style="color:#38bdf8;">${inflow} Lk Cusecs</strong></td>
        </tr>
        <tr>
          <td><strong>🌊 Spillway Discharge Outflow</strong></td>
          <td data-stage-col="0">0.20 Lk Cusecs</td>
          <td data-stage-col="1">0.80 Lk Cusecs</td>
          <td data-stage-col="2">1.80 Lk Cusecs</td>
          <td data-stage-col="3" class="warn-val">3.10 Lk Cusecs</td>
          <td data-stage-col="4" class="crit-val">4.20 Lk Cusecs</td>
          <td class="live-val"><strong style="color:#f59e0b;">${outflow} Lk Cusecs</strong></td>
        </tr>
        <tr>
          <td><strong>⚙️ Radial Gates Aperture</strong></td>
          <td data-stage-col="0">10% Open</td>
          <td data-stage-col="1">30% Open</td>
          <td data-stage-col="2">60% Open</td>
          <td data-stage-col="3" class="warn-val">85% Open</td>
          <td data-stage-col="4" class="crit-val">100% Fully Hoisted</td>
          <td class="live-val"><strong>${gates}% Open</strong></td>
        </tr>
        <tr class="alarm-row">
          <td><strong>🚨 Siren Warning Status</strong></td>
          <td data-stage-col="0"><span class="pill-green">🟢 NORMAL (Hour 0)</span></td>
          <td data-stage-col="1"><span class="pill-yellow">🟡 INFLOW WATCH (+1h)</span></td>
          <td data-stage-col="2"><span class="pill-yellow">🟠 SURGE WARNING (+2h)</span></td>
          <td data-stage-col="3"><span class="pill-red pulse-alarm">🚨 ALARM TRIGGERED (+3h)</span></td>
          <td data-stage-col="4"><span class="pill-crit">🔴 PEAK OVERTOPPING (+4h)</span></td>
          <td class="live-val"><span class="${data && data.alarmLevel === 'CRITICAL' ? 'pill-red' : (data && data.alarmLevel === 'WARNING' ? 'pill-yellow' : 'pill-green')}">${alarmStatus}</span></td>
        </tr>
        <tr class="lead-time-row">
          <td><strong>⏱️ Evacuation Window Remaining</strong></td>
          <td data-stage-col="0">4.0 Hours Safe Buffer</td>
          <td data-stage-col="1">3.0 Hours Buffer</td>
          <td data-stage-col="2">2.0 Hours Remaining</td>
          <td data-stage-col="3" class="highlight-lead"><strong>🚨 <1.0h Critical Window</strong></td>
          <td data-stage-col="4" class="crit-lead">Peak Submergence Horizon</td>
          <td class="live-val"><strong style="color:#38bdf8;">${(data && data.leadTimeHours) ? data.leadTimeHours.toFixed(1) + 'h Lead Time' : '6.4h Lead Time'}</strong></td>
        </tr>
        <tr style="background: rgba(56, 189, 248, 0.08);">
          <td><strong>🎯 AI Prediction Confidence</strong></td>
          <td data-stage-col="0"><span style="color:#38bdf8; font-weight:700;">98.2% Confidence</span></td>
          <td data-stage-col="1"><span style="color:#38bdf8; font-weight:700;">98.2% Confidence</span></td>
          <td data-stage-col="2"><strong style="color:#4ade80;">98.4% Confidence</strong></td>
          <td data-stage-col="3"><strong style="color:#f59e0b;">98.4% Confidence</strong></td>
          <td data-stage-col="4"><strong style="color:#ef4444;">98.2% Confidence</strong></td>
          <td class="live-val"><strong style="color:#4ade80;">98.2% Confidence</strong></td>
        </tr>
      `;
    } else {
      const fos = data && data.factorOfSafety ? data.factorOfSafety : '1.85';
      const pore = data && data.porePressure ? data.porePressure : '14.2';
      const disp = data && data.slidingDisplacementMeters ? data.slidingDisplacementMeters : '0.2';
      const alarmStatus = data && data.alarmLevel ? (data.alarmLevel === 'CRITICAL' ? '🔴 CRITICAL' : (data.alarmLevel === 'WARNING' ? '🟡 WARNING' : '🟢 SAFE')) : '🟢 SAFE';

      tbody.innerHTML = `
        <tr>
          <td><strong>🌧️ Rainfall Surcharge</strong></td>
          <td data-stage-col="0">15 mm/h</td>
          <td data-stage-col="1">55 mm/h</td>
          <td data-stage-col="2">95 mm/h</td>
          <td data-stage-col="3" class="warn-val">140 mm/h</td>
          <td data-stage-col="4" class="crit-val">180 mm/h</td>
          <td class="live-val"><strong>${rain} mm/h</strong></td>
        </tr>
        <tr>
          <td><strong>💧 Soil Moisture Saturation</strong></td>
          <td data-stage-col="0">38%</td>
          <td data-stage-col="1">68%</td>
          <td data-stage-col="2">86%</td>
          <td data-stage-col="3" class="warn-val">95%</td>
          <td data-stage-col="4" class="crit-val">99%</td>
          <td class="live-val"><strong>${sat}%</strong></td>
        </tr>
        <tr>
          <td><strong>⛰️ Bishop Factor of Safety (FoS)</strong></td>
          <td data-stage-col="0">1.82 (STABLE)</td>
          <td data-stage-col="1">1.38 (MARGINAL)</td>
          <td data-stage-col="2">1.08 (WARNING)</td>
          <td data-stage-col="3" class="warn-val">0.82 (🚨 SLIP INITIATED)</td>
          <td data-stage-col="4" class="crit-val">0.45 (🔴 CATASTROPHIC RUNOUT)</td>
          <td class="live-val"><strong style="color:${parseFloat(fos) < 1.0 ? '#ef4444' : '#10b981'};">${fos}</strong></td>
        </tr>
        <tr>
          <td><strong>🌊 Pore Water Pressure (u)</strong></td>
          <td data-stage-col="0">14.2 kPa</td>
          <td data-stage-col="1">26.5 kPa</td>
          <td data-stage-col="2">39.0 kPa</td>
          <td data-stage-col="3" class="warn-val">52.0 kPa</td>
          <td data-stage-col="4" class="crit-val">68.5 kPa</td>
          <td class="live-val"><strong style="color:#38bdf8;">${pore} kPa</strong></td>
        </tr>
        <tr>
          <td><strong>📐 Cumulative Slide Displacement</strong></td>
          <td data-stage-col="0">0.2 m</td>
          <td data-stage-col="1">1.2 m</td>
          <td data-stage-col="2">3.8 m (Tension Cracks)</td>
          <td data-stage-col="3" class="warn-val">8.5 m (Shear Slip)</td>
          <td data-stage-col="4" class="crit-val">16.8 m (Debris Fan)</td>
          <td class="live-val"><strong>${disp} m</strong></td>
        </tr>
        <tr class="alarm-row">
          <td><strong>🚨 Geotechnical Alarm Status</strong></td>
          <td data-stage-col="0"><span class="pill-green">🟢 STABLE (Hour 0)</span></td>
          <td data-stage-col="1"><span class="pill-yellow">🟡 INFILTRATION (+1h)</span></td>
          <td data-stage-col="2"><span class="pill-yellow">🟠 TENSION CRACK (+2h)</span></td>
          <td data-stage-col="3"><span class="pill-red pulse-alarm">🚨 SHEAR COLLAPSE (+3h)</span></td>
          <td data-stage-col="4"><span class="pill-crit">🔴 RUNOUT DELUGE (+4h)</span></td>
          <td class="live-val"><span class="${data && data.alarmLevel === 'CRITICAL' ? 'pill-red' : (data && data.alarmLevel === 'WARNING' ? 'pill-yellow' : 'pill-green')}">${alarmStatus}</span></td>
        </tr>
        <tr class="lead-time-row">
          <td><strong>⏱️ Evacuation Window Remaining</strong></td>
          <td data-stage-col="0">4.0 Hours Safe Buffer</td>
          <td data-stage-col="1">3.0 Hours Buffer</td>
          <td data-stage-col="2">2.0 Hours Remaining</td>
          <td data-stage-col="3" class="highlight-lead"><strong>🚨 <1.0h Critical Window</strong></td>
          <td data-stage-col="4" class="crit-lead">Peak Landslide Horizon</td>
          <td class="live-val"><strong style="color:#38bdf8;">${(data && data.leadTimeHours) ? data.leadTimeHours.toFixed(1) + 'h Lead Time' : '6.4h Lead Time'}</strong></td>
        </tr>
        <tr style="background: rgba(217, 119, 6, 0.08);">
          <td><strong>🎯 AI Prediction Confidence</strong></td>
          <td data-stage-col="0"><span style="color:#f59e0b; font-weight:700;">98.2% Confidence</span></td>
          <td data-stage-col="1"><span style="color:#f59e0b; font-weight:700;">98.2% Confidence</span></td>
          <td data-stage-col="2"><strong style="color:#4ade80;">98.4% Confidence</strong></td>
          <td data-stage-col="3"><strong style="color:#f59e0b;">98.4% Confidence</strong></td>
          <td data-stage-col="4"><strong style="color:#ef4444;">98.2% Confidence</strong></td>
          <td class="live-val"><strong style="color:#4ade80;">98.2% Confidence</strong></td>
        </tr>
      `;
    }

    if (this.visualizer && this.visualizer.currentSimStage !== undefined) {
      this.highlightMatrixColumn(this.visualizer.currentSimStage);
    }
  }

  highlightMatrixColumn(stage) {
    const tbody = document.getElementById(`${this.mountId}-factors-tbody`);
    const table = tbody ? tbody.closest('table') : null;
    if (!table) return;

    // Remove active highlight from all headers and cells
    table.querySelectorAll('.stage-col').forEach(th => th.classList.remove('active-col'));
    table.querySelectorAll('td[data-stage-col]').forEach(td => td.classList.remove('active-col'));

    // Highlight header
    const th = table.querySelector(`.stage-col-${stage}`);
    if (th) th.classList.add('active-col');

    // Highlight cells
    table.querySelectorAll(`td[data-stage-col="${stage}"]`).forEach(td => td.classList.add('active-col'));
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
      },
      'AIZAWL-01': {
        // Aizawl (Tuirial & Durtlang Slope Corridor, Mizoram)
        1: [
          { icon: '🟢', title: 'Phase 1: Stable Mountain Slope Baseline', text: `Factor of Safety FoS = <strong>${data.factorOfSafety || '1.82'}</strong> (STABLE). Dry shale & siltstone interbedded strata. Durtlang ridge stilt homes secure; NH-54 bypass clear.` },
          { icon: '⛰️', title: 'Geological Profile', text: `Bedding dip angle matches 38° slope face. Groundwater table 18m below surface with zero positive pore pressure.` },
          { icon: '🏥', title: 'Public Safety', text: `All 4,820 residents across Tuirial Veng and Durtlang North safe.` }
        ],
        2: [
          { icon: '🟡', title: 'Phase 2: Hydro-Meteorological Saturation & Pore Surcharge', text: `Heavy accumulated rainfall (${rain} mm/h, 146mm/24h) drives soil moisture to <strong>${sat}%</strong>. Pore water pressure (u) surges to <strong>${data.porePressure || '28.5'} kPa</strong>.` },
          { icon: '💧', title: 'Frictional Strength Loss', text: `Effective normal stress across shale joints reduced by 42%. FoS declines to 1.34.` },
          { icon: '⚠️', title: 'Early Warning Issued', text: `DDMA & PWD place sensors on NH-54 Bypass Km 18-22 on high alert.` }
        ],
        3: [
          { icon: '🟠', title: 'Phase 3: Crown Tension Cracks & Incipient Shear Creep', text: `15cm crown tension cracks open along Durtlang ridge shoulder and NH-54 Km 19.4. FoS drops to <strong>1.05</strong> (MARGINAL EQUILIBRIUM).` },
          { icon: '🔍', title: 'Kinematic Instability', text: `Subsurface inclinometers record 14mm/hr active creep displacement along 120m planar shear rupture.` },
          { icon: '🚨', title: 'Pre-emptive Restriction', text: `Heavy vehicular transit stopped on NH-54. Traffic diverted to Zemabawk arterial.` }
        ],
        4: [
          { icon: '🔴', title: 'Phase 4: Critical Bishop Circular Slip Failure & Debris Flow', text: `Pore pressure overcomes shear resistance; FoS crashes to <strong>${data.factorOfSafety || '0.76'}</strong>! Deep Bishop circular rotational rupture releases 80,000 m³ of saturated shale debris!` },
          { icon: '🚧', title: 'Infrastructure Severed', text: `NH-54 bypass completely buried under 4.5m debris. Lower Tuirial Veng access cut off.` },
          { icon: '🚀', title: 'Emergency Evacuation', text: `4,820 residents shifted to Durtlang Community Hall & Aizawl Safe Complex.` }
        ]
      },
      'CHAMPHAI-02': {
        // Champhai (Tiau River Border Escarpment, Mizoram)
        1: [
          { icon: '🟢', title: 'Phase 1: Escarpment Stable Baseline', text: `Factor of Safety FoS = <strong>${data.factorOfSafety || '1.76'}</strong>. Siltstone & sandstone strata stable along Tiau river border gorge.` },
          { icon: '🌉', title: 'Border Corridor Status', text: `Zokhawthar border trade post and Tiau Friendship Bridge fully operational.` },
          { icon: '🏥', title: 'Safety Status', text: `3,210 border residents safe across terraced valley hamlets.` }
        ],
        2: [
          { icon: '🟡', title: 'Phase 2: Border Valley Rain Surcharge', text: `Monsoon downpour (${rain} mm/h, 118mm/24h) pushes soil moisture to <strong>${sat}%</strong>. Pore pressure builds up in jointed sandstone blocks.` },
          { icon: '🌊', title: 'Toe Scour Dynamics', text: `Tiau river high velocity scours the toe of the 34° escarpment.` },
          { icon: '⚠️', title: 'Watch Advisory', text: `Border Roads Organisation (BRO) alerts Champhai-Zokhawthar link patrols.` }
        ],
        3: [
          { icon: '🟠', title: 'Phase 3: Wedge Detachment & Road Tension Fissures', text: `Tension cracks propagate across upper terrace road; FoS drops to <strong>1.08</strong>. Loose boulder dislodgements reported near border cuts.` },
          { icon: '🔍', title: 'Sub-surface Seepage', text: `Water springs emerge directly from rock face, indicating saturated aquifer surcharge.` },
          { icon: '🚨', title: 'Operational Action', text: `Single-lane convoy protocol enforced on international border feeder route.` }
        ],
        4: [
          { icon: '🔴', title: 'Phase 4: Massive Wedge Rockslide & Road Breach', text: `Full planar failure triggers on 34° slope; FoS crashes to <strong>0.79</strong>! 45,000 m³ rock-debris avalanche destroys border road section.` },
          { icon: '🏘️', title: 'Zokhawthar Hamlet Threat', text: `Lower border settlements evacuated due to rolling boulder hazard.` },
          { icon: '🚀', title: 'Relief Mobilization', text: `Population shifted to Champhai Sub-Divisional Hospital relief zone.` }
        ]
      },
      'EKHASI-03': {
        // East Khasi Hills (Mawkdok Dympep Gorge & Sohra, Meghalaya)
        1: [
          { icon: '🟢', title: 'Phase 1: Sheer Canyon Bedrock Stability', text: `FoS = <strong>${data.factorOfSafety || '1.95'}</strong>. Massive sandstone & limestone precipice towering 60m over Mawkdok canyon. Waterfalls flow in defined rocky plunge pool.` },
          { icon: '🌉', title: 'High Gorge Bridge', text: `Mawkdok canyon bridge and tourism viewpoint completely secure.` },
          { icon: '🏥', title: 'Community Status', text: `Sohra plateau safe colony and Dympep village functioning normally.` }
        ],
        2: [
          { icon: '🟡', title: 'Phase 2: World-Record Deluge Surcharge', text: `Extreme orographic rainfall (${rain} mm/h, 180mm/24h) drives soil saturation to <strong>${sat}%</strong>. Colluvium layer on 42° cliff face becomes liquefied.` },
          { icon: '💧', title: 'High Hydraulic Gradient', text: `Vertical joint networks channel massive torrents, increasing uplift pressure to 44 kPa.` },
          { icon: '⚠️', title: 'Meghalaya Alert', text: `State Disaster Management Authority activates gorge acoustic monitors.` }
        ],
        3: [
          { icon: '🟠', title: 'Phase 3: Rockfall Cascades & Cliff Edge Fracture', text: `Tension fractures widen at canyon lip; FoS drops to <strong>1.04</strong>. Rockfall blocks crash into lower ravine.` },
          { icon: '🌪️', title: 'Waterfall Spray Erosion', text: `Intense spray and turbulent wind blast canyon slope, stripping topsoil.` },
          { icon: '🚨', title: 'Pre-emptive Action', text: `Gorge viewpoint closed; tourists and valley villagers moved to high plateau.` }
        ],
        4: [
          { icon: '🔴', title: 'Phase 4: Catastrophic Canyon Debris Avalanche', text: `Colluvial mantle gives way across 42° cliff; FoS collapses to <strong>0.68</strong>! Massive debris avalanche tears down Mawkdok ravine with supersonic air blast!` },
          { icon: '🏘️', title: 'Valley Cutoff', text: `Mawkdok valley link road obliterated; canyon bridge approach blocked.` },
          { icon: '🚀', title: 'Emergency High-Ground Shelter', text: `Civilians sheltered at Sohra Community Health Safe Complex.` }
        ]
      },
      'DIMAHASAO-04': {
        // Dima Hasao (Jatinga - Haflong Ghat Range, Assam)
        1: [
          { icon: '🟢', title: 'Phase 1: Mountain Ghat Stability', text: `Factor of Safety FoS = <strong>${data.factorOfSafety || '1.70'}</strong>. Lumding-Badarpur railway hill cuts and Jatinga valley roads stable.` },
          { icon: '🛤️', title: 'Railway Hill Slopes', text: `Concrete retaining crib-walls and weep holes draining baseflow effectively.` },
          { icon: '🏥', title: 'Safety Status', text: `Haflong town and Jatinga valley settlements completely secure.` }
        ],
        2: [
          { icon: '🟡', title: 'Phase 2: Plastic Clay Shale Swelling', text: `Prolonged downpour (${rain} mm/h) saturates thick Disang shale overburden to <strong>${sat}%</strong>. Highly expansive montmorillonite clay loses internal cohesion.` },
          { icon: '📉', title: 'Shear Strength Degradation', text: `Internal friction angle drops from 28° to 14°; pore pressure rises to 34 kPa.` },
          { icon: '⚠️', title: 'N.F. Railway Warning', text: `Speed restrictions enforced for hill-section passenger express trains.` }
        ],
        3: [
          { icon: '🟠', title: 'Phase 3: Active Slumping & Track Displacement', text: `Haflong railway cutting undergoes 35cm lateral shear displacement; FoS drops to <strong>1.06</strong>. Toe bulges deform valley highway.` },
          { icon: '🚧', title: 'Retaining Wall Bulging', text: `Concrete retaining structures experience excessive earth pressure and tilting.` },
          { icon: '🚨', title: 'Operational Action', text: `Railway transit suspended; emergency earthmovers deployed along Jatinga road.` }
        ],
        4: [
          { icon: '🔴', title: 'Phase 4: Massive Rotational Slump & Mudflow', text: `Deep circular rotational failure breaches entire hill slope; FoS crashes to <strong>0.74</strong>! 120,000 m³ saturated clay mudflow engulfs railway tracks & road!` },
          { icon: '🏘️', title: 'Valley Settlements Submerged', text: `Jatinga valley habitation damaged by heavy mud runout; road severed.` },
          { icon: '🚀', title: 'Emergency Relief', text: `Affected population shifted to Haflong Civil Hospital High Shelter & Community Camp.` }
        ]
      },
      'KOHIMA-05': {
        // Kohima (Dzükou Foothills & South Bypass, Nagaland)
        1: [
          { icon: '🟢', title: 'Phase 1: Terraced Hill Baseline', text: `Factor of Safety FoS = <strong>${data.factorOfSafety || '1.65'}</strong>. Stepped agricultural terraces and NH-29 South Bypass highway clear.` },
          { icon: '🌾', title: 'Terrace Drainage', text: `Contour bunds regulating surface runoff into Dzuvuru stream.` },
          { icon: '🏥', title: 'Public Safety', text: `Kigwema village and Kohima south bypass dwellings safe.` }
        ],
        2: [
          { icon: '🟡', title: 'Phase 2: Terrace Surcharge & Toe Infiltration', text: `Rainfall (${rain} mm/h) saturates terrace benches to <strong>${sat}%</strong>. Infiltration elevates perched water table along weathered sandstone contact.` },
          { icon: '💧', title: 'Pore Pressure Buildup', text: `Pore pressure u reaches 26 kPa; toe of slope along Dzuvuru stream scoured by high runoff.` },
          { icon: '⚠️', title: 'Nagaland NSDMA Advisory', text: `Traffic police alert drivers on NH-29 South Bypass regarding falling rocks.` }
        ],
        3: [
          { icon: '🟠', title: 'Phase 3: Rotational Creep & Pavement Fissures', text: `Longitudinal fissures widen along NH-29 hairpin turns; FoS declines to <strong>1.07</strong>. Retaining walls show distress cracks.` },
          { icon: '🔍', title: 'Creeping Slip Geometry', text: `GPS benchmarks detect 8mm/hr continuous downhill displacement.` },
          { icon: '🚨', title: 'Operational Action', text: `NH-29 South Bypass reduced to one-way pilot convoy; roadside dwellings warned.` }
        ],
        4: [
          { icon: '🔴', title: 'Phase 4: Catastrophic Rotational Shear & Highway Collapse', text: `Slope yields along deep rotational shear plane; FoS collapses to <strong>0.77</strong>! 60,000 m³ hill mass drops 3.8m, snapping NH-29 highway!` },
          { icon: '🚧', title: 'Critical Lifeline Cut', text: `Nagaland-Manipur arterial connectivity severed; Kigwema terrace huts damaged.` },
          { icon: '🚀', title: 'Immediate Shelter Mobilization', text: `Residents relocated to Kigwema Community Shelter & Kohima Municipal Camp.` }
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

  selectStation(stnId) {
    if (!stnId) return;
    this.config.stationId = stnId;

    const areaDropdown = document.getElementById(`${this.mountId}-area-dropdown`);
    if (areaDropdown && areaDropdown.value !== stnId) {
      areaDropdown.value = stnId;
    }

    const container = document.getElementById(this.mountId);
    if (container) {
      const fastBtns = container.querySelectorAll('.t3d-fast-btn');
      fastBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-stn') === stnId);
      });
    }

    if (this.visualizer) {
      this.visualizer.setStation(stnId);
      const prof = this.visualizer.getCurrentProfile();
      if (prof) this.updateAreaUIHeader(prof);
    }
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

  toggleCompleteScreen() {
    const container = document.getElementById(this.mountId);
    if (!container) return;
    const wrapper = container.querySelector('.terrain-3d-wrapper') || container;
    const isFull = wrapper.classList.toggle('complete-screen-mode');
    
    const btn = document.getElementById(`${this.mountId}-btn-complete-screen`);
    if (btn) {
      btn.classList.toggle('active', isFull);
      btn.textContent = isFull ? '⛶ Exit Complete Screen (Esc)' : '⛶ Complete Screen';
    }

    // Trigger multi-tick resize passes for Three.js viewport
    [30, 80, 180, 400, 800].forEach(delay => {
      setTimeout(() => {
        if (this.visualizer && typeof this.visualizer.onWindowResize === 'function') {
          this.visualizer.onWindowResize();
        }
      }, delay);
    });

    if (isFull) {
      const escHandler = (e) => {
        if (e.key === 'Escape' && wrapper.classList.contains('complete-screen-mode')) {
          this.toggleCompleteScreen();
          window.removeEventListener('keydown', escHandler);
        }
      };
      window.addEventListener('keydown', escHandler);
    }
  }
}

/**
 * Global Fullscreen Modal Launcher for 3D Dynamic DSS
 */
window.openTerrain3DModal = function(mode = 'flood', initialData = {}) {
  const existing = document.getElementById('t3d-modal-root');
  if (existing) {
    existing.remove();
  }

  // Ensure Audio Context is unlocked on click
  if (typeof window !== 'undefined' && window.disasterAudio) {
    try {
      window.disasterAudio.init();
    } catch (e) {
      console.warn("Audio init deferred", e);
    }
  }

  const modalBackdrop = document.createElement('div');
  modalBackdrop.className = 't3d-modal-backdrop';
  modalBackdrop.id = 't3d-modal-root';
  modalBackdrop.style.zIndex = '999999';

  const title = mode === 'flood'
    ? '🌊 3D River Canyon & Dynamic Inundation Decision Support Center (Telangana)' 
    : '⛰️ 3D Slope Geotechnical Slip-Surface & Hazard Progression Simulator (NE-LENS)';

  modalBackdrop.innerHTML = `
    <div class="t3d-modal-window" id="t3d-active-modal-window">
      <div class="t3d-modal-header">
        <h3>${title}</h3>
        <div style="display:flex; gap:10px; align-items:center;">
          <span style="font-size:11px; color:#94a3b8; font-family:'JetBrains Mono',monospace;">Dynamic 3D Spatial DEM</span>
          <button id="btn-toggle-modal-complete-screen" class="t3d-btn" style="background:#0284c7; color:#fff; padding:6px 12px; font-weight:700; border-radius:6px; cursor:pointer;">⛶ Complete Screen</button>
          <button id="btn-close-t3d-modal" class="t3d-btn" style="background:#dc2626; color:#fff; padding:6px 14px; font-weight:700; border-radius:6px; cursor:pointer;">✕ CLOSE</button>
        </div>
      </div>
      <div class="t3d-modal-body" id="modal-t3d-container" style="height: calc(100% - 50px); width:100%; position:relative;"></div>
    </div>
  `;

  document.body.appendChild(modalBackdrop);

  const comp = new Terrain3DComponent('modal-t3d-container', {
    mode: mode,
    stationId: initialData.stationId || (mode === 'flood' ? 'TEL-STN-01' : 'AIZAWL-01'),
    rainfall: initialData.rainfall || 45.0,
    saturation: initialData.saturation || 80.0,
    waterLevel: initialData.waterLevel || 4.2,
    slopeAngle: initialData.slopeAngle || 34.0,
    riskEvolutionPhase: initialData.riskEvolutionPhase || 2
  });

  // Modal Complete Screen toggle button
  const modalCompleteBtn = document.getElementById('btn-toggle-modal-complete-screen');
  const modalWin = document.getElementById('t3d-active-modal-window');
  if (modalCompleteBtn && modalWin) {
    modalCompleteBtn.addEventListener('click', () => {
      const isFull = modalWin.classList.toggle('complete-screen-mode');
      modalCompleteBtn.textContent = isFull ? '⛶ Restore Window' : '⛶ Complete Screen';
      [30, 100, 250, 600].forEach(d => {
        setTimeout(() => {
          if (comp.visualizer && typeof comp.visualizer.onWindowResize === 'function') {
            comp.visualizer.onWindowResize();
          }
        }, d);
      });
    });
  }

  // Multiple resize passes to ensure Three.js canvas fills the container completely
  [80, 200, 450, 900].forEach(delay => {
    setTimeout(() => {
      if (comp.visualizer && typeof comp.visualizer.onWindowResize === 'function') {
        comp.visualizer.onWindowResize();
      }
    }, delay);
  });

  if (initialData.autoRunSimulation) {
    setTimeout(() => {
      const runBtn = document.getElementById('modal-t3d-container-btn-run-sim');
      if (runBtn) runBtn.click();
    }, 400);
  }

  const closeModal = () => {
    if (comp.visualizer) comp.visualizer.destroy();
    modalBackdrop.remove();
    document.removeEventListener('keydown', onEsc);
  };

  const onEsc = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', onEsc);

  const closeBtn = document.getElementById('btn-close-t3d-modal');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  return comp;
};

window.Terrain3DComponent = Terrain3DComponent;
