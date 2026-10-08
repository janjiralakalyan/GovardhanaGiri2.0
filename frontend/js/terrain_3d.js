/**
 * GovardhanaGiri 2.0 & NE-LENS: Advanced 3D Terrain & Dynamic Risk Evolution Decision Support System (DSS)
 * ========================================================================================================
 * High-performance WebGL 3D Digital Elevation Model (DEM) with:
 *  - Dynamic Topographic Profiles for ALL 10 Telangana Hotspots + Northeast Landslide Corridors
 *  - 4-Stage "How It Becomes Risky" Dynamic Risk Evolution & Hazard Progression Engine
 *  - Interactive 3D Hazard Risk Heatmap Overlay on Terrain Vertices
 *  - Dynamic Hydrological Runoff Streamlines & Waterfall Spray Particles
 *  - Real-Time Infrastructure (Bridges, Dams, Spillways, Ghat Roads, Village Settlements)
 *  - Dynamic Evacuation Pathfinding & Road Cutoff Engine
 *  - Bishop Geotechnical Circular Slip Failure Plane & Pore Water Pressure Analysis
 *  - Interactive Spatial Raycaster Elevation & Inundation Depth Probe
 *  - Autonomous Drone Aerial Survey Patrol & Tactical Camera Angles
 */

class Terrain3DVisualizer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.warn(`[Terrain3D] Container #${containerId} not found.`);
      return;
    }

    this.options = Object.assign({
      mode: 'flood', // 'flood' or 'landslide'
      stationId: 'TEL-STN-03', // Default: Medaram Jampanna Vagu
      rainfall: 35.0, // mm/h
      saturation: 75.0, // %
      waterLevel: 3.8, // meters
      slopeAngle: 32.0, // degrees
      soilCohesion: 18.0, // kPa
      frictionAngle: 28.0, // deg
      timelineHour: 0, // 0 = Current (range: -6 to +6)
      isPlayingTimeline: false,
      playbackSpeed: 1.0,
      droneMode: false,
      showHeatmap: false,
      showRunoff: true,
      riskEvolutionPhase: 2 // 1: Safe, 2: Moderate Infiltration, 3: Saturated Surge, 4: Critical Inundation
    }, options);

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.animationFrameId = null;

    // 3D Meshes & Groups
    this.terrainMesh = null;
    this.wireframeMesh = null;
    this.waterMesh = null;
    this.damMeshGroup = null;
    this.waterfallMeshGroup = null;
    this.slipPlaneMesh = null;
    this.markersGroup = null;
    this.settlementsGroup = null;
    this.roadsGroup = null;
    this.bridgeGroup = null;
    this.probeGroup = null;
    this.rainParticles = null;
    this.runoffParticles = null;
    this.dangerContoursGroup = null;

    // Raycaster for Spatial Elevation & Depth Probing
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);
    this.hoveredPoint = null;

    // Timeline Simulation State
    this.timelineClock = 0;
    this.clock = new THREE.Clock();

    // Area Topographic Profiles Registry
    this.initStationRegistry();

    this.init();
  }

  /* -------------------------------------------------------------
     AREA TOPOGRAPHIC REGISTRY (Telangana & Northeast Hotspots)
     ------------------------------------------------------------- */
  initStationRegistry() {
    this.areaProfiles = {
      'TEL-STN-01': {
        id: 'TEL-STN-01',
        name: 'Bhadrachalam (Godavari River Ghat)',
        mode: 'flood',
        morphType: 'wide_river',
        riverName: 'Godavari River',
        baseElevation: 48.0,
        slope: 8.5,
        dangerWaterLevel: 15.5,
        riverWidth: 26.0,
        canyonDepth: 4.5,
        hasBridge: true,
        bridgeElev: 1.8,
        hasDam: false,
        hasWaterfall: false,
        settlements: [
          { name: 'Ghat Vista Colony', x: -12, z: 10, houses: 4 },
          { name: 'Temple Riparian Ward', x: 14, z: -14, houses: 4 },
          { name: 'Lowland Market Quarters', x: -18, z: -18, houses: 4 },
          { name: 'Upper Vista Colony', x: 26, z: 20, houses: 4 }
        ],
        shelters: [
          { name: 'Bhadrachalam Model Residential School', x: -32, z: -22 },
          { name: 'ZPHS High Ground Camp', x: 34, z: 26 }
        ]
      },
      'TEL-STN-02': {
        id: 'TEL-STN-02',
        name: 'Charla (Taliperu Spillway & Catchment)',
        mode: 'flood',
        morphType: 'spillway_valley',
        riverName: 'Taliperu River',
        baseElevation: 65.0,
        slope: 14.0,
        dangerWaterLevel: 7.8,
        riverWidth: 16.0,
        canyonDepth: 6.0,
        hasBridge: true,
        bridgeElev: 0.5,
        hasDam: true,
        hasWaterfall: false,
        settlements: [
          { name: 'Subbanapalli Hamlet', x: -8, z: 14, houses: 4 },
          { name: 'Spillway Canal Habitation', x: 10, z: -10, houses: 4 },
          { name: 'Forest Border Settlement', x: 22, z: 18, houses: 4 }
        ],
        shelters: [
          { name: 'Charla Cyclone Relief Centre', x: -30, z: -20 },
          { name: 'Charla Revenue Hall', x: 32, z: 24 }
        ]
      },
      'TEL-STN-03': {
        id: 'TEL-STN-03',
        name: 'Medaram (Jampanna Vagu Gorge)',
        mode: 'flood',
        morphType: 'canyon_gorge',
        riverName: 'Jampanna Vagu',
        baseElevation: 142.0,
        slope: 19.5,
        dangerWaterLevel: 5.2,
        riverWidth: 12.0,
        canyonDepth: 8.5,
        hasBridge: true,
        bridgeElev: 0.2,
        hasDam: false,
        hasWaterfall: false,
        settlements: [
          { name: 'Jampanna Bathing Ghat Ward', x: -6, z: 12, houses: 4 },
          { name: 'Tribal Hamlet East', x: 8, z: -18, houses: 4 },
          { name: 'Mid-Slope Hamlets', x: -18, z: -10, houses: 4 },
          { name: 'High-Ground Colony', x: 26, z: 16, houses: 4 }
        ],
        shelters: [
          { name: 'ZPHS Hill Top Shelter', x: -32, z: -20 },
          { name: 'High-Ground Community Hall', x: 34, z: 25 }
        ]
      },
      'TEL-STN-04': {
        id: 'TEL-STN-04',
        name: 'Eturnagaram (Dayam Vagu Confluence)',
        mode: 'flood',
        morphType: 'confluence_delta',
        riverName: 'Dayam Vagu',
        baseElevation: 82.0,
        slope: 16.2,
        dangerWaterLevel: 6.5,
        riverWidth: 18.0,
        canyonDepth: 5.5,
        hasBridge: true,
        bridgeElev: 0.8,
        hasDam: false,
        hasWaterfall: false,
        settlements: [
          { name: 'Sanctuary Lowland Ward', x: -10, z: 15, houses: 4 },
          { name: 'Dayam Confluence Village', x: 12, z: -12, houses: 4 },
          { name: 'Elevated Eco Camp', x: 28, z: 18, houses: 4 }
        ],
        shelters: [
          { name: 'Eturnagaram High School Relief Camp', x: -34, z: -18 },
          { name: 'Forest Department Transit Hall', x: 32, z: 22 }
        ]
      },
      'TEL-STN-05': {
        id: 'TEL-STN-05',
        name: 'Kerameri Ghat Range Summit',
        mode: 'landslide',
        morphType: 'mountain_ghat',
        riverName: 'Kerameri Mountain Torrent',
        baseElevation: 610.0,
        slope: 34.5,
        dangerWaterLevel: 4.5,
        riverWidth: 8.0,
        canyonDepth: 14.0,
        hasBridge: false,
        hasDam: false,
        hasWaterfall: false,
        settlements: [
          { name: 'Ghat Hairpin Village', x: -12, z: 24, houses: 4 },
          { name: 'Valley Base Hamlet', x: 0, z: 32, houses: 4 },
          { name: 'Summit Crest Colony', x: 20, z: -15, houses: 4 }
        ],
        shelters: [
          { name: 'Kerameri Summit Transit Complex', x: -28, z: -25 },
          { name: 'Asifabad Sub-Collector Shelter', x: 30, z: -22 }
        ]
      },
      'TEL-STN-06': {
        id: 'TEL-STN-06',
        name: 'Kuntala Falls Ravine Catchment',
        mode: 'flood',
        morphType: 'waterfall_ravine',
        riverName: 'Kadem Stream Gorge',
        baseElevation: 415.0,
        slope: 28.0,
        dangerWaterLevel: 6.0,
        riverWidth: 10.0,
        canyonDepth: 12.0,
        hasBridge: true,
        bridgeElev: 1.2,
        hasDam: false,
        hasWaterfall: true,
        settlements: [
          { name: 'Plunge Pool Downstream Ward', x: -6, z: 18, houses: 4 },
          { name: 'Ravine Tourist Enclave', x: 12, z: -8, houses: 4 },
          { name: 'Plateau Top Settlement', x: 24, z: 22, houses: 4 }
        ],
        shelters: [
          { name: 'Neradigonda Relief Building', x: -32, z: -18 },
          { name: 'Forest Rest House High Ground', x: 30, z: 26 }
        ]
      },
      'TEL-STN-07': {
        id: 'TEL-STN-07',
        name: 'Kadam Dam Reservoir Spillway',
        mode: 'flood',
        morphType: 'reservoir_dam',
        riverName: 'Kadam River',
        baseElevation: 218.0,
        slope: 21.0,
        dangerWaterLevel: 8.9,
        riverWidth: 22.0,
        canyonDepth: 7.0,
        hasBridge: true,
        bridgeElev: 1.5,
        hasDam: true,
        hasWaterfall: false,
        settlements: [
          { name: 'Spillway Tailrace Colony', x: -10, z: 20, houses: 4 },
          { name: 'Peddur Village', x: 14, z: 12, houses: 4 },
          { name: 'High-Ground Township', x: 26, z: -18, houses: 4 }
        ],
        shelters: [
          { name: 'Kadam Irrigation Project Camp', x: -35, z: -20 },
          { name: 'Peddur Model School', x: 32, z: 24 }
        ]
      },
      'TEL-STN-08': {
        id: 'TEL-STN-08',
        name: 'Prakash Nagar (Munneru River Urban)',
        mode: 'flood',
        morphType: 'urban_river',
        riverName: 'Munneru River',
        baseElevation: 105.0,
        slope: 6.2,
        dangerWaterLevel: 9.2,
        riverWidth: 20.0,
        canyonDepth: 4.0,
        hasBridge: true,
        bridgeElev: 1.0,
        hasDam: false,
        hasWaterfall: false,
        settlements: [
          { name: 'Prakash Nagar Embankment Huts', x: -8, z: 8, houses: 5 },
          { name: 'Munneru Lowland Colony', x: 10, z: -14, houses: 5 },
          { name: 'Town Core Colony', x: -20, z: -20, houses: 4 },
          { name: 'Khammam High Ridge Colony', x: 24, z: 18, houses: 4 }
        ],
        shelters: [
          { name: 'Khammam ZP High School Hall', x: -32, z: -22 },
          { name: 'Municipal Stadium Pavilion Camp', x: 30, z: 26 }
        ]
      },
      'TEL-STN-09': {
        id: 'TEL-STN-09',
        name: 'Mannanur Nallamala Plateau Ghat',
        mode: 'landslide',
        morphType: 'plateau_escarpment',
        riverName: 'Dindi Stream Ravines',
        baseElevation: 585.0,
        slope: 26.5,
        dangerWaterLevel: 4.8,
        riverWidth: 10.0,
        canyonDepth: 10.0,
        hasBridge: true,
        bridgeElev: 0.4,
        hasDam: false,
        hasWaterfall: false,
        settlements: [
          { name: 'Mannanur Ghat Entrance Colony', x: -10, z: 18, houses: 4 },
          { name: 'Ravine Forest Habitation', x: 12, z: 22, houses: 4 },
          { name: 'Plateau Top Outpost', x: 22, z: -12, houses: 4 }
        ],
        shelters: [
          { name: 'Amrabad Forest Research Complex', x: -30, z: -20 },
          { name: 'Mannanur High Ground Rest Camp', x: 32, z: 20 }
        ]
      },
      'TEL-STN-10': {
        id: 'TEL-STN-10',
        name: 'Musi River Basin / Puranapool Bridge',
        mode: 'flood',
        morphType: 'urban_canal',
        riverName: 'Musi River Urban Canal',
        baseElevation: 492.0,
        slope: 9.0,
        dangerWaterLevel: 5.8,
        riverWidth: 18.0,
        canyonDepth: 3.8,
        hasBridge: true,
        bridgeElev: 0.6,
        hasDam: false,
        hasWaterfall: false,
        settlements: [
          { name: 'Puranapool Low Embankment Quarters', x: -8, z: 6, houses: 6 },
          { name: 'Chaderghat Floodplain Tenements', x: 8, z: -10, houses: 6 },
          { name: 'City Upper Terraces', x: 22, z: 18, houses: 4 }
        ],
        shelters: [
          { name: 'Bahadurpura Relief Transit Complex', x: -30, z: -22 },
          { name: 'High-Level Municipal Community Hall', x: 30, z: 24 }
        ]
      },
      // Northeast Landslide Corridors
      'AIZAWL-01': {
        id: 'AIZAWL-01',
        name: 'Aizawl (Tuirial & Durtlang Slope Corridor)',
        mode: 'landslide',
        morphType: 'aizawl_ridge',
        riverName: 'Tuirial River Valley',
        baseElevation: 920.0,
        slope: 38.0,
        dangerWaterLevel: 5.0,
        riverWidth: 6.0,
        canyonDepth: 18.0,
        hasBridge: false,
        hasDam: false,
        hasWaterfall: false,
        settlements: [
          { name: 'Tuirial Veng Stilt Houses', x: -10, z: 18, houses: 5 },
          { name: 'Durtlang Ridge Dwellings', x: 6, z: 26, houses: 4 },
          { name: 'Sihphir High Ground Crest', x: 22, z: -18, houses: 4 }
        ],
        shelters: [
          { name: 'Durtlang Community Evacuation Hall', x: -30, z: -22 },
          { name: 'Aizawl Government Safe Complex', x: 32, z: -18 }
        ]
      },
      'CHAMPHAI-02': {
        id: 'CHAMPHAI-02',
        name: 'Champhai (Tiau River Border Escarpment)',
        mode: 'landslide',
        morphType: 'champhai_border',
        riverName: 'Tiau River Border Gorge',
        baseElevation: 880.0,
        slope: 34.0,
        dangerWaterLevel: 4.5,
        riverWidth: 8.0,
        canyonDepth: 16.0,
        hasBridge: true,
        bridgeElev: 0.8,
        hasDam: false,
        hasWaterfall: false,
        settlements: [
          { name: 'Zokhawthar Border Hamlet', x: -8, z: 20, houses: 4 },
          { name: 'Champhai Vengsang Terrace', x: 10, z: 24, houses: 4 },
          { name: 'Upper Ridge Post', x: 20, z: -14, houses: 4 }
        ],
        shelters: [
          { name: 'Zokhawthar Relief Center', x: -28, z: -20 },
          { name: 'Champhai Sub-Divisional Complex', x: 30, z: 22 }
        ]
      },
      'EKHASI-03': {
        id: 'EKHASI-03',
        name: 'East Khasi Hills (Mawkdok Dympep Gorge & Sohra)',
        mode: 'landslide',
        morphType: 'meghalaya_gorge',
        riverName: 'Mawkdok Canyon Torrent',
        baseElevation: 1480.0,
        slope: 42.0,
        dangerWaterLevel: 6.0,
        riverWidth: 10.0,
        canyonDepth: 24.0,
        hasBridge: true,
        bridgeElev: 3.5,
        hasDam: false,
        hasWaterfall: true,
        settlements: [
          { name: 'Mawkdok Valley Village', x: -10, z: 22, houses: 4 },
          { name: 'Dympep Settlement', x: 12, z: 18, houses: 4 },
          { name: 'Sohra Plateau Safe Colony', x: 24, z: -20, houses: 4 }
        ],
        shelters: [
          { name: 'Sohra Community Health Safe Zone', x: -32, z: -24 },
          { name: 'Mawkdok Tourism Transit Hall', x: 30, z: -18 }
        ]
      },
      'DIMAHASAO-04': {
        id: 'DIMAHASAO-04',
        name: 'Dima Hasao (Jatinga - Haflong Ghat Range)',
        mode: 'landslide',
        morphType: 'haflong_ghat',
        riverName: 'Jatinga River Stream',
        baseElevation: 580.0,
        slope: 32.0,
        dangerWaterLevel: 4.8,
        riverWidth: 10.0,
        canyonDepth: 15.0,
        hasBridge: true,
        bridgeElev: 1.2,
        hasDam: false,
        hasWaterfall: false,
        settlements: [
          { name: 'Haflong East Habitation', x: -10, z: 18, houses: 5 },
          { name: 'Jatinga Valley Colony', x: 8, z: 24, houses: 4 },
          { name: 'Fiangpui Safe Ridge', x: 22, z: -16, houses: 4 }
        ],
        shelters: [
          { name: 'Haflong Civil Hospital High Shelter', x: -30, z: -20 },
          { name: 'Jatinga Community Center', x: 32, z: -20 }
        ]
      },
      'KOHIMA-05': {
        id: 'KOHIMA-05',
        name: 'Kohima (Dzükou Foothills & South Bypass)',
        mode: 'landslide',
        morphType: 'kohima_foothills',
        riverName: 'Dzuvuru Stream',
        baseElevation: 1260.0,
        slope: 26.0,
        dangerWaterLevel: 3.8,
        riverWidth: 8.0,
        canyonDepth: 12.0,
        hasBridge: false,
        hasDam: false,
        hasWaterfall: false,
        settlements: [
          { name: 'Kigwema Valley Terraces', x: -10, z: 18, houses: 4 },
          { name: 'NH-29 South Corridor Huts', x: 8, z: 22, houses: 4 },
          { name: 'Upper Foothill Hamlet', x: 20, z: -12, houses: 4 }
        ],
        shelters: [
          { name: 'Kigwema Community Shelter', x: -28, z: -20 },
          { name: 'Kohima South Municipal Camp', x: 30, z: 20 }
        ]
      }
    };
  }

  getCurrentProfile() {
    return this.areaProfiles[this.options.stationId] || this.areaProfiles['TEL-STN-03'];
  }

  init() {
    if (typeof THREE === 'undefined') {
      console.error('[Terrain3D] Three.js is not loaded.');
      return;
    }

    const rect = this.container.getBoundingClientRect();
    const width = rect.width > 50 ? rect.width : (this.container.clientWidth || 740);
    const height = rect.height > 50 ? rect.height : (this.container.clientHeight || 500);

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d);
    this.scene.fog = new THREE.FogExp2(0x0a0f1d, 0.0065);

    // 2. Camera setup
    this.camera = new THREE.PerspectiveCamera(45, Math.max(0.1, width / Math.max(1, height)), 0.5, 1200);
    this.camera.position.set(70, 52, 85);

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;

    // Clear previous canvas
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.06;
      this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
      this.controls.minDistance = 12;
      this.controls.maxDistance = 320;
      this.controls.target.set(0, 0, 0);
    }

    // 5. Lighting
    this.setupLighting();

    // 6. Build Terrain & Hydrology Elements
    this.rebuildScene();

    // 7. Setup Spatial Probe Interactivity
    this.setupRaycasterEvents();

    // 8. Handle Resize
    this.resizeObserver = new ResizeObserver(() => this.onWindowResize());
    this.resizeObserver.observe(this.container);

    setTimeout(() => this.onWindowResize(), 150);
    setTimeout(() => this.onWindowResize(), 500);

    // 9. Start Render Loop
    this.animate = this.animate.bind(this);
    this.animate();
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.45);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.35);
    sunLight.position.set(85, 110, 55);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 320;
    sunLight.shadow.camera.left = -65;
    sunLight.shadow.camera.right = 65;
    sunLight.shadow.camera.top = 65;
    sunLight.shadow.camera.bottom = -65;
    this.scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x0ea5e9, 0x0f172a, 0.7);
    this.scene.add(hemiLight);

    this.hazardLight = new THREE.PointLight(0xef4444, 2.2, 50);
    this.hazardLight.position.set(0, 16, 0);
    this.scene.add(this.hazardLight);
  }

  rebuildScene() {
    // Clear existing meshes
    if (this.terrainMesh) this.scene.remove(this.terrainMesh);
    if (this.wireframeMesh) this.scene.remove(this.wireframeMesh);
    if (this.waterMesh) this.scene.remove(this.waterMesh);
    if (this.damMeshGroup) this.scene.remove(this.damMeshGroup);
    if (this.waterfallMeshGroup) this.scene.remove(this.waterfallMeshGroup);
    if (this.slipPlaneMesh) this.scene.remove(this.slipPlaneMesh);
    if (this.markersGroup) this.scene.remove(this.markersGroup);
    if (this.settlementsGroup) this.scene.remove(this.settlementsGroup);
    if (this.roadsGroup) this.scene.remove(this.roadsGroup);
    if (this.bridgeGroup) this.scene.remove(this.bridgeGroup);
    if (this.probeGroup) this.scene.remove(this.probeGroup);
    if (this.rainParticles) this.scene.remove(this.rainParticles);
    if (this.runoffParticles) this.scene.remove(this.runoffParticles);
    if (this.dangerContoursGroup) this.scene.remove(this.dangerContoursGroup);

    this.markersGroup = new THREE.Group();
    this.settlementsGroup = new THREE.Group();
    this.roadsGroup = new THREE.Group();
    this.bridgeGroup = new THREE.Group();
    this.probeGroup = new THREE.Group();
    this.damMeshGroup = new THREE.Group();
    this.waterfallMeshGroup = new THREE.Group();
    this.dangerContoursGroup = new THREE.Group();

    this.scene.add(this.markersGroup);
    this.scene.add(this.settlementsGroup);
    this.scene.add(this.roadsGroup);
    this.scene.add(this.bridgeGroup);
    this.scene.add(this.probeGroup);
    this.scene.add(this.damMeshGroup);
    this.scene.add(this.waterfallMeshGroup);
    this.scene.add(this.dangerContoursGroup);

    const profile = this.getCurrentProfile();

    if (profile.mode === 'flood') {
      this.buildDynamicAreaTerrain(profile);
      this.buildWaterSurgePlane(profile);
      if (profile.hasBridge) this.buildBridgeInfrastructure(profile);
      if (profile.hasDam) this.buildDamSpillwayInfrastructure(profile);
      if (profile.hasWaterfall) this.buildWaterfallPrecipice(profile);
      this.buildSettlementVillages(profile);
      this.buildEvacuationRoadNetwork(profile);
      this.buildFloodMarkers(profile);
    } else {
      this.buildLandslideSlopeTerrain(profile);
      this.buildSlipFailurePlane(profile);
      this.buildLandslideSettlements(profile);
      this.buildLandslideRoadNetwork(profile);
      this.buildLandslideMarkers(profile);
    }

    this.buildRainSystem();
    if (this.options.showRunoff) {
      this.buildRunoffStreamlines(profile);
    }
    this.buildSpatialProbeMarker();
    this.updatePhysics();
  }

  /* -------------------------------------------------------------
     DYNAMIC PROCEDURAL ELEVATION MATHEMATICS FOR EACH AREA
     ------------------------------------------------------------- */
  getElevationAt(x, z, profile = null) {
    if (!profile) profile = this.getCurrentProfile();
    const type = profile.morphType || 'canyon_gorge';

    if (type === 'wide_river') {
      // Bhadrachalam Godavari - broad valley with river terraces and ghats
      const riverCenter = Math.sin(z * 0.03) * 8;
      const dist = Math.abs(x - riverCenter);
      if (dist < 14) {
        return Math.pow(dist / 14, 2) * 2.5 - 3.2 + Math.sin(x * 0.3) * 0.15;
      } else {
        const wall = (dist - 14) / 32;
        return -0.7 + Math.pow(wall, 1.1) * 14.0 + Math.sin(x * 0.1 + z * 0.08) * 2.0;
      }
    } else if (type === 'spillway_valley') {
      // Charla Taliperu - spillway valley with forebay
      const riverCenter = Math.sin(z * 0.06) * 10;
      const dist = Math.abs(x - riverCenter);
      if (z < -10) {
        // Upstream reservoir lake basin
        return -2.5 + Math.sin(x * 0.1) * 0.4 + (Math.abs(x) > 18 ? Math.pow((Math.abs(x) - 18) / 20, 1.4) * 16 : 0);
      } else if (dist < 10) {
        return Math.pow(dist / 10, 2) * 3 - 3.8;
      } else {
        return -0.8 + Math.pow((dist - 10) / 28, 1.25) * 18.0 + Math.sin(x * 0.15) * 2.5;
      }
    } else if (type === 'waterfall_ravine') {
      // Kuntala Falls - dramatic vertical cliff at z = 0 and circular plunge pool
      const poolDist = Math.sqrt(x * x + (z - 8) * (z - 8));
      if (z < -2) {
        // High upper plateau stream bed
        return 8.5 + Math.sin(x * 0.2) * 1.0 + (Math.abs(x) > 8 ? Math.pow((Math.abs(x) - 8) / 20, 1.3) * 12 : 0);
      } else if (poolDist < 12) {
        // Plunge pool basin
        return -4.5 + Math.pow(poolDist / 12, 2) * 3.0;
      } else if (Math.abs(x) < 8 && z >= -2) {
        // Canyon outlet
        return -1.5 + (z / 40) * 1.5;
      } else {
        // High vertical canyon walls
        return 7.0 + Math.pow(Math.abs(x) / 35, 1.2) * 16.0 + Math.sin(x * 0.15 + z * 0.1) * 2.0;
      }
    } else if (type === 'reservoir_dam') {
      // Kadam Dam - reservoir lake upstream (z < 0) and spillway chute downstream (z > 0)
      if (z < -2) {
        // Deep reservoir basin
        return -3.5 + Math.sin(x * 0.08) * 0.4 + (Math.abs(x) > 22 ? Math.pow((Math.abs(x) - 22) / 20, 1.3) * 18 : 0);
      } else {
        // Downstream river gorge
        const dist = Math.abs(x);
        if (dist < 12) return -2.5 + (z / 40) * 1.8;
        return -0.5 + Math.pow((dist - 12) / 28, 1.3) * 20.0 + Math.sin(x * 0.2) * 2.0;
      }
    } else if (type === 'urban_canal' || type === 'urban_river') {
      // Musi River / Munneru Urban Embankments
      const canalCenter = Math.sin(z * 0.04) * 6;
      const dist = Math.abs(x - canalCenter);
      if (dist < 10) {
        return Math.pow(dist / 10, 2) * 2.0 - 2.8;
      } else if (dist < 14) {
        // Steep concrete floodwall embankment step
        return 1.2 + (dist - 10) * 0.8;
      } else {
        // Flat urban city terrace
        return 4.4 + Math.sin(x * 0.08 + z * 0.08) * 1.2;
      }
    } else if (type === 'confluence_delta') {
      // Eturnagaram Dayam Vagu confluence
      const mainDist = Math.abs(x - 5);
      const tribDist = Math.abs(x + z * 0.6 + 6);
      const minD = Math.min(mainDist, tribDist);
      if (minD < 8) {
        return Math.pow(minD / 8, 2) * 2.8 - 3.4;
      } else {
        return -0.6 + Math.pow((minD - 8) / 30, 1.25) * 18.0 + Math.sin(x * 0.12 + z * 0.12) * 2.5;
      }
    } else if (type === 'aizawl_ridge') {
      // Aizawl Durtlang Razorback Ridge - 38 deg slope with cut-slope shoulder & crown cracks
      const radSlope = (38.0 * Math.PI) / 180;
      let el = (-z) * Math.tan(radSlope * 0.52);
      // Asymmetric ridge spur
      el += Math.sin(x * 0.09) * 5.2 + Math.cos(z * 0.08 + x * 0.06) * 3.0;
      const scarDist = Math.sqrt(x * x + (z - 2) * (z - 2));
      if (scarDist < 19) {
        // Active planar shear rupture scar
        el -= (1 - scarDist / 19) * 4.8;
      }
      return el;
    } else if (type === 'champhai_border') {
      // Champhai Tiau River Border Escarpment - steep valley flanking river boundary
      const riverCenter = Math.sin(z * 0.04) * 8 + 12;
      const dist = Math.abs(x - riverCenter);
      if (dist < 8) {
        return -3.8 + Math.pow(dist / 8, 2) * 2.2;
      } else {
        const wall = (dist - 8) / 30;
        return -1.6 + Math.pow(wall, 1.3) * 24.0 + Math.sin(x * 0.12 + z * 0.08) * 3.2;
      }
    } else if (type === 'meghalaya_gorge') {
      // East Khasi Hills (Mawkdok Dympep Gorge & Sohra) - sheer 60m limestone canyon drop
      const canyonCenter = Math.sin(z * 0.03) * 6;
      const dist = Math.abs(x - canyonCenter);
      if (dist < 10) {
        // Deep ravine floor
        return -5.5 + Math.pow(dist / 10, 2) * 2.5;
      } else if (dist < 16) {
        // Vertical limestone canyon cliffs
        return -3.0 + Math.pow((dist - 10) / 6, 0.4) * 16.0;
      } else {
        // High Sohra rain plateau
        return 13.0 + Math.sin(x * 0.08 + z * 0.06) * 2.5;
      }
    } else if (type === 'haflong_ghat') {
      // Dima Hasao (Jatinga Haflong Ghat) - railway cut slope with unstable clay creep lobe
      const radSlope = (32.0 * Math.PI) / 180;
      let el = (-z) * Math.tan(radSlope * 0.48);
      el += Math.sin(x * 0.07) * 4.0 + Math.cos(z * 0.1) * 2.2;
      const creepDist = Math.sqrt((x - 4) * (x - 4) + (z - 6) * (z - 6));
      if (creepDist < 16) {
        // Displaced slump hummock
        el += Math.sin(creepDist * 0.4) * 2.8;
      }
      return el;
    } else if (type === 'kohima_foothills') {
      // Kohima (Dzükou Foothills) - stepped agricultural terraces and rolling swales
      const radSlope = (26.0 * Math.PI) / 180;
      let el = (-z) * Math.tan(radSlope * 0.42);
      // Terraced stepped benches
      const terraceStep = Math.floor(el / 2.5) * 2.5;
      el = el * 0.4 + terraceStep * 0.6 + Math.sin(x * 0.06) * 2.0;
      return el;
    } else if (type === 'mountain_ghat' || type === 'plateau_escarpment') {
      // Kerameri Ghat Range / Nallamala Plateau
      const radSlope = ((profile.slope || 34.0) * Math.PI) / 180;
      let el = (-z) * Math.tan(radSlope * 0.55);
      el += Math.sin(x * 0.08) * 4.5 + Math.cos(z * 0.09 + x * 0.05) * 2.5;
      const scarRadius = Math.sqrt(x * x + (z - 4) * (z - 4));
      if (scarRadius < 18) {
        el -= (1 - scarRadius / 18) * 4.2;
      }
      return el;
    } else {
      // Default: Medaram Jampanna Vagu Canyon Gorge
      const riverCenter = Math.sin(z * 0.05) * 12 + Math.cos(z * 0.1) * 4;
      const dist = Math.abs(x - riverCenter);
      if (dist < 8) {
        let el = Math.pow(dist / 8, 2) * 3 - 3.5;
        el += Math.sin(x * 0.5) * 0.2;
        return el;
      } else {
        const wallT = (dist - 8) / 35;
        let el = -0.5 + Math.pow(wallT, 1.3) * 22;
        el += Math.sin(x * 0.15 + z * 0.1) * 3.5 + Math.cos(x * 0.25 - z * 0.2) * 2.0;
        return el;
      }
    }
  }

  /* -------------------------------------------------------------
     3D TERRAIN MESH BUILDER WITH DYNAMIC RISK HEATMAP SHADING
     ------------------------------------------------------------- */
  buildDynamicAreaTerrain(profile) {
    const size = 100;
    const segments = 120;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    const colors = [];
    const color = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const elevation = this.getElevationAt(x, z, profile);
      pos.setY(i, elevation);

      if (this.options.showHeatmap) {
        // Dynamic Risk Heatmap Color Coding:
        // Vertices close to water level or low elevation are high hazard
        const currentWaterY = this.waterMesh ? this.waterMesh.position.y : -1.5;
        const relativeHeight = elevation - currentWaterY;

        if (relativeHeight < 0.2) {
          color.setRGB(0.95, 0.15, 0.15); // Critical Inundation (Red)
        } else if (relativeHeight < 1.8) {
          color.setRGB(0.98, 0.55, 0.10); // High Threat Floodplain (Amber)
        } else if (relativeHeight < 4.0) {
          color.setRGB(0.85, 0.85, 0.20); // Moderate Warning Buffer (Yellow)
        } else {
          color.setRGB(0.10, 0.65, 0.35); // Safe High Ground (Green)
        }
      } else {
        // Natural Topographic Shading tailored to morphType
        if (profile.morphType === 'urban_canal' || profile.morphType === 'urban_river') {
          if (elevation < -1.0) color.setRGB(0.25, 0.30, 0.32); // Concrete canal bed
          else if (elevation < 2.5) color.setRGB(0.40, 0.45, 0.50); // Stone embankment walls
          else color.setRGB(0.32, 0.36, 0.40); // Urban asphalt & buildings
        } else if (profile.morphType === 'waterfall_ravine') {
          if (elevation < -1.0) color.setRGB(0.15, 0.22, 0.25); // Plunge pool rocks
          else if (elevation > 8.0) color.setRGB(0.20, 0.50, 0.25); // High forested plateau
          else color.setRGB(0.45, 0.40, 0.35); // Vertical cliff face
        } else {
          if (elevation < -1.0) color.setRGB(0.20, 0.24, 0.26); // Riverbed gravel
          else if (elevation < 3.5) color.setRGB(0.14, 0.48, 0.26); // Riparian vegetation
          else if (elevation < 12.0) color.setRGB(0.22, 0.58, 0.30); // Forest slopes
          else color.setRGB(0.50, 0.46, 0.42); // Mountain crest rock
        }
      }

      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.1
    });

    this.terrainMesh = new THREE.Mesh(geometry, material);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = true;
    this.scene.add(this.terrainMesh);

    // Wireframe overlay
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.08
    });
    this.wireframeMesh = new THREE.Mesh(geometry, wireMat);
    this.wireframeMesh.position.y = 0.02;
    this.scene.add(this.wireframeMesh);
  }

  buildWaterSurgePlane(profile) {
    const size = 100;
    const geom = new THREE.PlaneGeometry(size, size, 64, 64);
    geom.rotateX(-Math.PI / 2);

    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      transmission: 0.68,
      opacity: 0.88,
      transparent: true,
      roughness: 0.12,
      metalness: 0.1,
      ior: 1.333,
      reflectivity: 0.88,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });

    this.waterMesh = new THREE.Mesh(geom, waterMat);
    this.waterMesh.position.y = -1.5;
    this.scene.add(this.waterMesh);
  }

  /* -------------------------------------------------------------
     INFRASTRUCTURE: BRIDGES, DAMS, WATERFALLS & SETTLEMENTS
     ------------------------------------------------------------- */
  buildBridgeInfrastructure(profile) {
    const bridgeY = profile.bridgeElev !== undefined ? profile.bridgeElev : 0.2;
    const bridgeZ = -8.0;
    const morph = profile.morphType || 'canyon_gorge';

    if (morph === 'urban_canal') {
      // Musi River / Puranapool - Historic Stone Multi-Arch Bridge
      const bridgeLen = 30;
      const deckGeom = new THREE.BoxGeometry(bridgeLen, 0.9, 4.0);
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
      this.bridgeDeck = new THREE.Mesh(deckGeom, stoneMat);
      this.bridgeDeck.position.set(0, bridgeY, bridgeZ);
      this.bridgeDeck.castShadow = true;
      this.bridgeGroup.add(this.bridgeDeck);

      // Stone Arch Openings
      [-8, 0, 8].forEach(archX => {
        const archGeom = new THREE.CylinderGeometry(2.2, 2.2, 4.2, 16, 1, false, 0, Math.PI);
        archGeom.rotateZ(Math.PI / 2);
        archGeom.rotateY(Math.PI / 2);
        const archMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.95 });
        const arch = new THREE.Mesh(archGeom, archMat);
        arch.position.set(archX, bridgeY - 1.2, bridgeZ);
        this.bridgeGroup.add(arch);

        // Stone Piers
        const pierGeom = new THREE.BoxGeometry(1.6, 4.5, 4.2);
        const pier = new THREE.Mesh(pierGeom, stoneMat);
        pier.position.set(archX + 4.0, bridgeY - 2.2, bridgeZ);
        this.bridgeGroup.add(pier);
      });

      // Balustrades
      const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
      [-1.9, 1.9].forEach(rz => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(bridgeLen, 0.4, 0.2), railMat);
        rail.position.set(0, bridgeY + 0.65, bridgeZ + rz);
        this.bridgeGroup.add(rail);
      });

    } else if (morph === 'urban_river') {
      // Prakash Nagar Munneru - Modern Multi-Span Concrete Highway Bridge + Floodwalls
      const bridgeLen = 32;
      const deckGeom = new THREE.BoxGeometry(bridgeLen, 0.75, 4.5);
      const concreteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
      this.bridgeDeck = new THREE.Mesh(deckGeom, concreteMat);
      this.bridgeDeck.position.set(0, bridgeY, bridgeZ);
      this.bridgeDeck.castShadow = true;
      this.bridgeGroup.add(this.bridgeDeck);

      // 4 Concrete Pier Columns
      [-10, -3.3, 3.3, 10].forEach(px => {
        const pier = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 6.0, 4.5),
          new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 })
        );
        pillar_pos: pier.position.set(px, bridgeY - 3.0, bridgeZ);
        this.bridgeGroup.add(pier);
      });

      // Concrete Floodwalls along river banks
      [-12, 12].forEach(fx => {
        const wallGeom = new THREE.BoxGeometry(0.8, 3.2, 45);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.75 });
        const wall = new THREE.Mesh(wallGeom, wallMat);
        wall.position.set(fx, 1.2, 0);
        wall.castShadow = true;
        this.bridgeGroup.add(wall);
      });

    } else if (morph === 'waterfall_ravine') {
      // Kuntala Falls - Suspension Footbridge across gorge outlet
      const span = 20;
      const deckGeom = new THREE.BoxGeometry(span, 0.35, 2.0);
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
      this.bridgeDeck = new THREE.Mesh(deckGeom, woodMat);
      this.bridgeDeck.position.set(0, bridgeY, 18);
      this.bridgeDeck.castShadow = true;
      this.bridgeGroup.add(this.bridgeDeck);

      // Suspension Cable Towers
      [-8, 8].forEach(tx => {
        const tower = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.35, 6.5, 8),
          new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.6 })
        );
        tower.position.set(tx, bridgeY + 2.5, 18);
        this.bridgeGroup.add(tower);
      });

    } else if (morph === 'wide_river') {
      // Bhadrachalam Godavari - Massive 4-Pier Highway Bridge & Bathing Ghat Steps
      const bridgeLen = 36;
      const deckGeom = new THREE.BoxGeometry(bridgeLen, 0.9, 4.2);
      const deckMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
      this.bridgeDeck = new THREE.Mesh(deckGeom, deckMat);
      this.bridgeDeck.position.set(0, bridgeY, bridgeZ);
      this.bridgeDeck.castShadow = true;
      this.bridgeGroup.add(this.bridgeDeck);

      // 4 Heavy Cylindrical Piers
      [-12, -4, 4, 12].forEach(px => {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(1.2, 1.2, 8.0, 16),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
        );
        pillar.position.set(px, bridgeY - 4.0, bridgeZ);
        this.bridgeGroup.add(pillar);
      });

      // Stepped Bathing Ghat Terraces along the riverbank
      for (let s = 0; s < 5; s++) {
        const stepGeom = new THREE.BoxGeometry(22, 0.4, 1.2);
        const stepMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
        const step = new THREE.Mesh(stepGeom, stepMat);
        step.position.set(15 + s * 1.0, -1.8 + s * 0.4, 8);
        this.bridgeGroup.add(step);
      }

    } else {
      // Medaram Jampanna Vagu - Low Causeway Slab Bridge with Warning Markers
      const deckGeom = new THREE.BoxGeometry(24, 0.5, 3.2);
      const deckMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
      this.bridgeDeck = new THREE.Mesh(deckGeom, deckMat);
      this.bridgeDeck.position.set(0, bridgeY, bridgeZ);
      this.bridgeDeck.castShadow = true;
      this.bridgeGroup.add(this.bridgeDeck);

      // Low Culvert Piers
      [-8, -2.5, 2.5, 8].forEach(px => {
        const pillar = new THREE.Mesh(
          new THREE.BoxGeometry(1.2, 3.0, 3.4),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
        );
        pillar.position.set(px, bridgeY - 1.5, bridgeZ);
        this.bridgeGroup.add(pillar);
      });

      // Striped Hazard Markers
      [-10, 10].forEach(mx => {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.18, 2.2, 8),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b })
        );
        post.position.set(mx, bridgeY + 1.1, bridgeZ);
        this.bridgeGroup.add(post);
      });
    }

    // Dynamic Flood Warning Beacon on Bridge
    this.bridgeBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    this.bridgeBeacon.position.set(0, bridgeY + 1.3, bridgeZ);
    this.bridgeGroup.add(this.bridgeBeacon);
  }

  buildDamSpillwayInfrastructure(profile) {
    // Concrete Gravity Dam across canyon at z = 0
    const damGeom = new THREE.BoxGeometry(42, 9.0, 5.0);
    const damMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.45 });
    const dam = new THREE.Mesh(damGeom, damMat);
    dam.position.set(0, 0.8, 0);
    dam.castShadow = true;
    this.damMeshGroup.add(dam);

    // Dam Crest Roadway
    const crestRoad = new THREE.Mesh(
      new THREE.BoxGeometry(42, 0.4, 5.2),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    crestRoad.position.set(0, 5.3, 0);
    this.damMeshGroup.add(crestRoad);

    // 3 Radial Spillway Arched Gates
    [-7, 0, 7].forEach(gx => {
      const gate = new THREE.Mesh(
        new THREE.BoxGeometry(4.0, 5.2, 5.4),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.85, roughness: 0.25 })
      );
      gate.position.set(gx, 0.6, 0);
      this.damMeshGroup.add(gate);

      // Gate Hoist Gantry Towers
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 4.0, 1.2),
        new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7 })
      );
      tower.position.set(gx, 6.8, 0);
      this.damMeshGroup.add(tower);
    });

    // Downstream Spillway Chute & Flip Bucket
    const chuteGeom = new THREE.BoxGeometry(26, 1.2, 16);
    const chuteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
    const chute = new THREE.Mesh(chuteGeom, chuteMat);
    chute.position.set(0, -1.8, 8);
    chute.rotateX(0.18);
    this.damMeshGroup.add(chute);
  }

  buildWaterfallPrecipice(profile) {
    // 45m Waterfall sheet mesh at z = 0
    const fallGeom = new THREE.PlaneGeometry(7.5, 12.0, 16, 16);
    const fallMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide
    });
    const fallMesh = new THREE.Mesh(fallGeom, fallMat);
    fallMesh.position.set(0, 2.5, 0.5);
    this.waterfallMeshGroup.add(fallMesh);

    // Waterfall water spray particle emitter
    const sprayCount = 500;
    const sprayGeom = new THREE.BufferGeometry();
    const sprayPos = new Float32Array(sprayCount * 3);

    for (let i = 0; i < sprayCount; i++) {
      sprayPos[i * 3] = (Math.random() - 0.5) * 9.0;
      sprayPos[i * 3 + 1] = Math.random() * 9.0 - 3.0;
      sprayPos[i * 3 + 2] = Math.random() * 8.0 + 3.0;
    }

    sprayGeom.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
    const sprayMat = new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 0.85,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.waterfallParticles = new THREE.Points(sprayGeom, sprayMat);
    this.waterfallMeshGroup.add(this.waterfallParticles);
  }

  buildSettlementVillages(profile) {
    const clusters = profile.settlements || [
      { name: 'Ghat Lowland Ward', x: -6, z: 12, houses: 4 },
      { name: 'Riparian Village East', x: 8, z: -18, houses: 4 }
    ];

    const morph = profile.morphType || 'canyon_gorge';
    this.settlementNodes = [];

    clusters.forEach(cluster => {
      const node = { name: cluster.name, x: cluster.x, z: cluster.z, houses: [] };
      const houseCount = cluster.houses || 4;

      for (let i = 0; i < houseCount; i++) {
        const hx = cluster.x + (i % 3) * 3.2 - 2.8 + (Math.random() - 0.5) * 0.8;
        const hz = cluster.z + Math.floor(i / 3) * 3.2 - 2.8 + (Math.random() - 0.5) * 0.8;
        const hy = this.getElevationAt(hx, hz, profile);

        const houseGroup = new THREE.Group();

        if (morph === 'urban_canal' || morph === 'urban_river') {
          // Urban Tenements & Multi-Story Buildings
          const stories = 1 + (i % 3);
          const bldgHeight = stories * 1.8;
          const bldgGeom = new THREE.BoxGeometry(2.6, bldgHeight, 2.6);
          const baseMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
          const roofMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });

          const base = new THREE.Mesh(bldgGeom, baseMat);
          base.position.y = bldgHeight / 2;
          base.castShadow = true;
          houseGroup.add(base);

          const roof = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.3, 2.8), roofMat);
          roof.position.y = bldgHeight + 0.15;
          roof.castShadow = true;
          houseGroup.add(roof);

          houseGroup.position.set(hx, hy, hz);
          this.settlementsGroup.add(houseGroup);
          node.houses.push({ group: houseGroup, baseMesh: base, roofMesh: roof, elevation: hy });

        } else if (morph === 'wide_river' && cluster.name.includes('Temple')) {
          // Temple Pagoda Tower with Spire Gopuram
          const baseGeom = new THREE.BoxGeometry(3.6, 2.4, 3.6);
          const baseMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5 });
          const base = new THREE.Mesh(baseGeom, baseMat);
          base.position.y = 1.2;
          base.castShadow = true;
          houseGroup.add(base);

          const towerGeom = new THREE.ConeGeometry(2.0, 3.5, 4);
          towerGeom.rotateY(Math.PI / 4);
          const roofMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.3 });
          const roof = new THREE.Mesh(towerGeom, roofMat);
          roof.position.y = 4.15;
          roof.castShadow = true;
          houseGroup.add(roof);

          houseGroup.position.set(hx, hy, hz);
          this.settlementsGroup.add(houseGroup);
          node.houses.push({ group: houseGroup, baseMesh: base, roofMesh: roof, elevation: hy });

        } else {
          // Pitched Thatch & Tiled Village Huts
          const houseGeom = new THREE.BoxGeometry(2.2, 1.4, 2.2);
          const roofGeom = new THREE.ConeGeometry(1.8, 1.2, 4);
          roofGeom.rotateY(Math.PI / 4);

          const baseMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85 });
          const roofMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });

          const base = new THREE.Mesh(houseGeom, baseMat);
          base.position.y = 0.7;
          base.castShadow = true;
          houseGroup.add(base);

          const roof = new THREE.Mesh(roofGeom, roofMat);
          roof.position.y = 1.95;
          roof.castShadow = true;
          houseGroup.add(roof);

          houseGroup.position.set(hx, hy, hz);
          this.settlementsGroup.add(houseGroup);
          node.houses.push({ group: houseGroup, baseMesh: base, roofMesh: roof, elevation: hy });
        }
      }

      this.settlementNodes.push(node);
    });
  }

  buildEvacuationRoadNetwork(profile) {
    // 1. Lowland Riparian Road (Subject to flood cutoff)
    const lowlandPoints = [
      new THREE.Vector3(-32, this.getElevationAt(-32, 22, profile) + 0.18, 22),
      new THREE.Vector3(-15, this.getElevationAt(-15, 12, profile) + 0.18, 12),
      new THREE.Vector3(0, (profile.bridgeElev || 0.2) + 0.45, -8),
      new THREE.Vector3(15, this.getElevationAt(15, -15, profile) + 0.18, -15),
      new THREE.Vector3(32, this.getElevationAt(32, -25, profile) + 0.18, -25)
    ];

    const lowCurve = new THREE.CatmullRomCurve3(lowlandPoints);
    const lowGeom = new THREE.TubeGeometry(lowCurve, 64, 0.4, 8, false);
    this.lowlandRoadMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
    this.lowlandRoadMesh = new THREE.Mesh(lowGeom, this.lowlandRoadMat);
    this.roadsGroup.add(this.lowlandRoadMesh);

    // 2. High-Ground Evacuation Route to Shelters
    const ridgePoints = [
      new THREE.Vector3(-6, this.getElevationAt(-6, 12, profile) + 0.2, 12),
      new THREE.Vector3(-18, this.getElevationAt(-18, 0, profile) + 0.2, 0),
      new THREE.Vector3(-25, this.getElevationAt(-25, -12, profile) + 0.2, -12),
      new THREE.Vector3(-32, this.getElevationAt(-32, -20, profile) + 0.28, -20)
    ];

    const ridgeCurve = new THREE.CatmullRomCurve3(ridgePoints);
    const ridgeGeom = new THREE.TubeGeometry(ridgeCurve, 48, 0.48, 8, false);
    this.ridgeRoadMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.65,
      roughness: 0.4
    });
    this.ridgeRoadMesh = new THREE.Mesh(ridgeGeom, this.ridgeRoadMat);
    this.roadsGroup.add(this.ridgeRoadMesh);
  }

  buildFloodMarkers(profile) {
    // 1. River Gauge Station Mast
    const mastGeom = new THREE.CylinderGeometry(0.3, 0.3, 8, 16);
    const mastMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8 });
    const mast = new THREE.Mesh(mastGeom, mastMat);
    mast.position.set(0, 1, 0);
    this.markersGroup.add(mast);

    this.gaugeBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    this.gaugeBeacon.position.set(0, 5.2, 0);
    this.markersGroup.add(this.gaugeBeacon);

    // 2. High Ground Shelters
    const shelterPositions = profile.shelters || [
      { name: 'ZPHS Hill Top Shelter', x: -32, z: -20 },
      { name: 'High Ground Community Hall', x: 34, z: 25 }
    ];

    shelterPositions.forEach(pos => {
      const y = this.getElevationAt(pos.x, pos.z, profile);
      const bldgGeom = new THREE.BoxGeometry(4.2, 2.8, 4.2);
      const bldgMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 });
      const bldg = new THREE.Mesh(bldgGeom, bldgMat);
      bldg.position.set(pos.x, y + 1.4, pos.z);
      this.markersGroup.add(bldg);

      // Green safety ring
      const ringGeom = new THREE.RingGeometry(2.5, 3.2, 32);
      ringGeom.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.set(pos.x, y + 0.1, pos.z);
      this.markersGroup.add(ring);
    });
  }

  /* -------------------------------------------------------------
     LANDSLIDE SLOPE & SLIP SURFACE SCENE BUILDERS
     ------------------------------------------------------------- */
  buildLandslideSlopeTerrain(profile) {
    const size = 90;
    const segments = 100;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    const colors = [];
    const color = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const elevation = this.getElevationAt(x, z, profile);
      pos.setY(i, elevation);

      const scarRadius = Math.sqrt(x * x + (z - 5) * (z - 5));
      if (this.options.showHeatmap) {
        if (scarRadius < 18) {
          color.setRGB(0.95, 0.15, 0.15); // Critical shear failure scar
        } else if (elevation > 10) {
          color.setRGB(0.95, 0.60, 0.10); // High slope angle threat
        } else {
          color.setRGB(0.15, 0.65, 0.35); // Stable toe buffer
        }
      } else {
        if (scarRadius < 18) {
          color.setRGB(0.92, 0.22, 0.18); // Active shear scar
        } else if (elevation > 12) {
          color.setRGB(0.70, 0.55, 0.38); // Crest sandstone
        } else if (elevation > -5) {
          color.setRGB(0.35, 0.60, 0.30); // Colluvium slope
        } else {
          color.setRGB(0.25, 0.28, 0.32); // Toe road corridor
        }
      }

      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.1 });
    this.terrainMesh = new THREE.Mesh(geometry, mat);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = true;
    this.scene.add(this.terrainMesh);

    const wireMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true, transparent: true, opacity: 0.09 });
    this.wireframeMesh = new THREE.Mesh(geometry, wireMat);
    this.wireframeMesh.position.y = 0.03;
    this.scene.add(this.wireframeMesh);
  }

  buildSlipFailurePlane(profile) {
    const slipGeom = new THREE.SphereGeometry(22, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.45);
    slipGeom.scale(1.0, 0.35, 1.4);
    slipGeom.rotateX(Math.PI * 0.15);

    const slipMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      roughness: 0.3,
      emissive: 0x991b1b,
      emissiveIntensity: 0.4
    });

    this.slipPlaneMesh = new THREE.Mesh(slipGeom, slipMat);
    this.slipPlaneMesh.position.set(0, 0, 5);
    this.scene.add(this.slipPlaneMesh);

    const waterTableGeom = new THREE.PlaneGeometry(70, 70);
    waterTableGeom.rotateX(-Math.PI / 2);
    waterTableGeom.rotateZ(0.2);

    const waterTableMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.45, roughness: 0.1 });
    this.waterMesh = new THREE.Mesh(waterTableGeom, waterTableMat);
    this.waterMesh.position.set(0, -2, 0);
    this.scene.add(this.waterMesh);
  }

  buildLandslideSettlements(profile) {
    const housePositions = [
      { x: -12, z: 28 }, { x: 0, z: 32 }, { x: 14, z: 30 },
      { x: -18, z: 8 }, { x: 20, z: 6 }
    ];

    housePositions.forEach(p => {
      const hy = this.getElevationAt(p.x, p.z, profile);
      const bldg = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.8, 2.4),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 })
      );
      bldg.position.set(p.x, hy + 0.9, p.z);
      this.settlementsGroup.add(bldg);
    });
  }

  buildLandslideRoadNetwork(profile) {
    const roadPoints = [
      new THREE.Vector3(-40, this.getElevationAt(-40, 36, profile) + 0.2, 36),
      new THREE.Vector3(-15, this.getElevationAt(-15, 34, profile) + 0.2, 34),
      new THREE.Vector3(0, this.getElevationAt(0, 35, profile) + 0.2, 35),
      new THREE.Vector3(20, this.getElevationAt(20, 36, profile) + 0.2, 36),
      new THREE.Vector3(40, this.getElevationAt(40, 38, profile) + 0.2, 38)
    ];

    const curve = new THREE.CatmullRomCurve3(roadPoints);
    const geom = new THREE.TubeGeometry(curve, 48, 0.5, 8, false);
    const mat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
    const road = new THREE.Mesh(geom, mat);
    this.roadsGroup.add(road);
  }

  buildLandslideMarkers(profile) {
    const sensorPositions = [
      { x: -5, z: 2, y: this.getElevationAt(-5, 2, profile), id: 'INC-01 (Inclinometer)' },
      { x: 6, z: 8, y: this.getElevationAt(6, 8, profile), id: 'INC-02 (Inclinometer)' },
      { x: 0, z: -12, y: this.getElevationAt(0, -12, profile), id: 'PZ-01 (Piezometer)' }
    ];

    sensorPositions.forEach(sp => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 5, 12),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7 })
      );
      pole.position.set(sp.x, sp.y + 2.5, sp.z);
      this.markersGroup.add(pole);

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.8, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x2563eb })
      );
      head.position.set(sp.x, sp.y + 5.2, sp.z);
      this.markersGroup.add(head);
    });
  }

  /* -------------------------------------------------------------
     DYNAMIC HYDROLOGICAL RUNOFF STREAMLINES
     ------------------------------------------------------------- */
  buildRunoffStreamlines(profile) {
    // 3D Streamline curves running down slope gullies
    const streamsGroup = new THREE.Group();

    const gullyPaths = [
      [new THREE.Vector3(-25, 18, -25), new THREE.Vector3(-18, 8, -15), new THREE.Vector3(-8, 1, -5), new THREE.Vector3(0, -1, 0)],
      [new THREE.Vector3(28, 16, -20), new THREE.Vector3(18, 7, -10), new THREE.Vector3(8, 0, -2), new THREE.Vector3(0, -1, 0)],
      [new THREE.Vector3(-30, 20, 20), new THREE.Vector3(-15, 6, 12), new THREE.Vector3(-6, -0.5, 5)],
      [new THREE.Vector3(32, 22, 22), new THREE.Vector3(16, 8, 14), new THREE.Vector3(6, 0.2, 6)]
    ];

    gullyPaths.forEach(pts => {
      // Snap Y to actual topography
      const snapped = pts.map(p => new THREE.Vector3(p.x, this.getElevationAt(p.x, p.z, profile) + 0.35, p.z));
      const curve = new THREE.CatmullRomCurve3(snapped);
      const geom = new THREE.TubeGeometry(curve, 32, 0.22, 6, false);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.75
      });
      const tube = new THREE.Mesh(geom, mat);
      streamsGroup.add(tube);
    });

    this.runoffMeshGroup = streamsGroup;
    this.scene.add(this.runoffMeshGroup);
  }

  /* -------------------------------------------------------------
     SPATIAL ELEVATION & INUNDATION DEPTH PROBE
     ------------------------------------------------------------- */
  buildSpatialProbeMarker() {
    this.probePin = new THREE.Group();

    const cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.2, 3.5, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    cylinder.position.y = 1.75;
    this.probePin.add(cylinder);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x38bdf8, emissiveIntensity: 0.8 })
    );
    head.position.y = 3.6;
    this.probePin.add(head);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 1.1, 32),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
    );
    ring.rotateX(-Math.PI / 2);
    ring.position.y = 0.05;
    this.probePin.add(ring);

    this.probePin.visible = false;
    this.probeGroup.add(this.probePin);
  }

  setupRaycasterEvents() {
    const dom = this.renderer.domElement;

    const onPointerMove = (e) => {
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (!this.terrainMesh) return;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.terrainMesh);

      if (intersects.length > 0) {
        const p = intersects[0].point;
        this.hoveredPoint = p;
        this.probePin.position.copy(p);
        this.probePin.visible = true;

        const profile = this.getCurrentProfile();
        const terrainElevationMeters = (p.y * 4.5 + (profile.baseElevation || 130)).toFixed(1);
        const currentWaterY = this.waterMesh ? this.waterMesh.position.y : -1.5;
        const waterDepthOverGround = Math.max(0, currentWaterY - p.y);
        const isInundated = waterDepthOverGround > 0.05;

        window.dispatchEvent(new CustomEvent('terrain3d-probe', {
          detail: {
            x: p.x.toFixed(1),
            z: p.z.toFixed(1),
            elevationMeters: terrainElevationMeters,
            isInundated: isInundated,
            waterDepthMeters: (waterDepthOverGround * 1.8).toFixed(2),
            timeToInundateMins: isInundated ? 0 : Math.max(5, Math.floor((p.y - currentWaterY) * 25)),
            clientCoords: { clientX: e.clientX, clientY: e.clientY }
          }
        }));
      } else {
        this.probePin.visible = false;
      }
    };

    dom.addEventListener('pointermove', onPointerMove);
  }

  /* -------------------------------------------------------------
     RAINFALL PARTICLES SIMULATION
     ------------------------------------------------------------- */
  buildRainSystem() {
    const rainCount = Math.min(2500, Math.floor(this.options.rainfall * 30));
    if (rainCount <= 0) return;

    const rainGeom = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    const rainVelocities = [];

    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 120;
      rainPositions[i * 3 + 1] = Math.random() * 60 + 5;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 120;
      rainVelocities.push(1.5 + Math.random() * 1.5);
    }

    rainGeom.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.rainVelocities = rainVelocities;

    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.65,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    this.rainParticles = new THREE.Points(rainGeom, rainMat);
    this.scene.add(this.rainParticles);
  }

  /* -------------------------------------------------------------
     REAL-TIME HYDRAULIC, TIMELINE & FACTOR OF SAFETY PHYSICS
     ------------------------------------------------------------- */
  updatePhysics() {
    const profile = this.getCurrentProfile();
    const rain = this.options.rainfall;
    const sat = this.options.saturation;
    const t = this.options.timelineHour;

    const waveSurgeFactor = Math.exp(-Math.pow(t - 1.5, 2) / 8.0);
    const dynamicStage = Math.max(0.8, this.options.waterLevel + (waveSurgeFactor * 2.8) - 1.0);

    if (profile.mode === 'flood') {
      const targetWaterY = -3.0 + (dynamicStage * 1.05) + (rain / 120) * 2.2;
      if (this.waterMesh) {
        this.waterMesh.position.y = targetWaterY;

        // Dynamic water color reflecting turbidity and flood surge
        if (dynamicStage > (profile.dangerWaterLevel * 0.9) || rain > 85) {
          this.waterMesh.material.color.setHex(0x991b1b); // Muddy critical red
          this.waterMesh.material.opacity = 0.94;
        } else if (dynamicStage > (profile.dangerWaterLevel * 0.6)) {
          this.waterMesh.material.color.setHex(0xd97706); // Turbid amber
          this.waterMesh.material.opacity = 0.88;
        } else {
          this.waterMesh.material.color.setHex(0x0284c7); // Clear blue
          this.waterMesh.material.opacity = 0.78;
        }
      }

      // Check Bridge Overtopping
      const bridgeDeckY = profile.bridgeElev !== undefined ? profile.bridgeElev : 0.2;
      const isBridgeSubmerged = targetWaterY > bridgeDeckY;
      if (this.bridgeBeacon) {
        this.bridgeBeacon.material.color.setHex(isBridgeSubmerged ? 0xef4444 : 0x10b981);
      }
      if (this.bridgeDeck) {
        this.bridgeDeck.material.color.setHex(isBridgeSubmerged ? 0x7f1d1d : 0x475569);
      }

      // Check Settlement Inundation
      let floodedCount = 0;
      let totalHouses = 0;
      if (this.settlementNodes) {
        this.settlementNodes.forEach(cluster => {
          cluster.houses.forEach(h => {
            totalHouses++;
            const houseDepth = targetWaterY - h.elevation;
            if (houseDepth > 0) {
              floodedCount++;
              h.roofMesh.material.color.setHex(0xef4444); // Submerged
            } else if (houseDepth > -1.2) {
              h.roofMesh.material.color.setHex(0xf59e0b); // Threatened
            } else {
              h.roofMesh.material.color.setHex(0x10b981); // Safe
            }
          });
        });
      }

      // Check Road Cutoff
      const isLowlandRoadCutoff = targetWaterY > -0.5;
      if (this.lowlandRoadMesh) {
        this.lowlandRoadMat.color.setHex(isLowlandRoadCutoff ? 0xdc2626 : 0x334155);
      }

      this.statsPayload = {
        stationId: profile.id,
        stationName: profile.name,
        mode: 'flood',
        waterLevel: dynamicStage,
        floodedHousesCount: floodedCount,
        totalHouses: totalHouses,
        isBridgeSubmerged: isBridgeSubmerged,
        isLowlandRoadCutoff: isLowlandRoadCutoff,
        rainfall: rain,
        saturation: sat,
        timelineHour: t,
        dangerWaterLevel: profile.dangerWaterLevel,
        riskPhase: this.options.riskEvolutionPhase
      };
    } else {
      // Landslide Slope FoS (Bishop Simplified & Infinite Slope Equations)
      const c = this.options.soilCohesion;
      const phi = (this.options.frictionAngle * Math.PI) / 180;
      const alpha = ((profile.slope || this.options.slopeAngle) * Math.PI) / 180;
      const gamma = 19.5;
      const z = 4.5;

      const ru = (sat / 100) * 0.50 + (rain / 140) * 0.38 + (waveSurgeFactor * 0.15);
      const u = ru * gamma * z;

      const normalStress = gamma * z * Math.pow(Math.cos(alpha), 2);
      const effectiveStress = Math.max(0.1, normalStress - u);
      const shearStrength = c + effectiveStress * Math.tan(phi);
      const shearStress = gamma * z * Math.sin(alpha) * Math.cos(alpha);

      const factorOfSafety = Math.max(0.45, Math.min(3.5, shearStrength / Math.max(1.0, shearStress)));
      this.calculatedFoS = factorOfSafety.toFixed(2);
      this.porePressureVal = u.toFixed(1);

      if (this.slipPlaneMesh) {
        if (factorOfSafety < 1.0) {
          this.slipPlaneMesh.material.color.setHex(0xdc2626);
          this.slipPlaneMesh.material.emissive.setHex(0xb91c1c);
          this.slipPlaneMesh.material.opacity = 0.88;
        } else if (factorOfSafety < 1.3) {
          this.slipPlaneMesh.material.color.setHex(0xf59e0b);
          this.slipPlaneMesh.material.emissive.setHex(0xd97706);
          this.slipPlaneMesh.material.opacity = 0.65;
        } else {
          this.slipPlaneMesh.material.color.setHex(0x10b981);
          this.slipPlaneMesh.material.emissive.setHex(0x047857);
          this.slipPlaneMesh.material.opacity = 0.4;
        }
      }

      if (this.waterMesh) {
        this.waterMesh.position.y = -6 + (sat / 100) * 6;
      }

      this.statsPayload = {
        stationId: profile.id,
        stationName: profile.name,
        mode: 'landslide',
        factorOfSafety: this.calculatedFoS,
        porePressure: this.porePressureVal,
        rainfall: rain,
        saturation: sat,
        timelineHour: t,
        riskPhase: this.options.riskEvolutionPhase
      };
    }

    window.dispatchEvent(new CustomEvent('terrain3d-update', { detail: this.statsPayload }));
  }

  /* -------------------------------------------------------------
     4-STAGE "HOW IT BECOMES RISKY" RISK EVOLUTION STEPPER
     ------------------------------------------------------------- */
  setRiskEvolutionPhase(phaseNum) {
    this.options.riskEvolutionPhase = parseInt(phaseNum);
    const profile = this.getCurrentProfile();

    if (phaseNum === 1) {
      // Phase 1: Calm Equilibrium (Safe / Low Risk)
      this.options.rainfall = 8.0;
      this.options.saturation = 35.0;
      this.options.waterLevel = profile.mode === 'flood' ? profile.dangerWaterLevel * 0.35 : 2.0;
      this.setTimelineHour(-3.0);
    } else if (phaseNum === 2) {
      // Phase 2: Precipitation Accumulation & Infiltration (Moderate Risk)
      this.options.rainfall = 38.0;
      this.options.saturation = 68.0;
      this.options.waterLevel = profile.mode === 'flood' ? profile.dangerWaterLevel * 0.65 : 3.2;
      this.setTimelineHour(0.0);
    } else if (phaseNum === 3) {
      // Phase 3: High Pore Pressure & Bankfull Runoff (High Risk / Warning)
      this.options.rainfall = 82.0;
      this.options.saturation = 88.0;
      this.options.waterLevel = profile.mode === 'flood' ? profile.dangerWaterLevel * 0.95 : 4.4;
      this.setTimelineHour(1.0);
    } else if (phaseNum === 4) {
      // Phase 4: Extreme Surge / Inundation & Slope Failure (Critical Red)
      this.options.rainfall = 135.0;
      this.options.saturation = 98.0;
      this.options.waterLevel = profile.mode === 'flood' ? profile.dangerWaterLevel * 1.35 : 5.8;
      this.setTimelineHour(1.8);
    }

    this.rebuildScene();
  }

  /* -------------------------------------------------------------
     DYNAMIC AREA SWITCHER
     ------------------------------------------------------------- */
  setStation(stationId) {
    if (this.options.stationId !== stationId) {
      this.options.stationId = stationId;
      const profile = this.getCurrentProfile();
      this.options.mode = profile.mode;

      // Animate Camera to high vantage overview
      if (this.camera && this.controls) {
        this.camera.position.set(70, 52, 85);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
      }

      this.rebuildScene();
    }
  }

  /* -------------------------------------------------------------
     ANIMATION LOOP WITH TIMELINE PLAYBACK & DRONE PATROL
     ------------------------------------------------------------- */
  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const elapsedTime = this.clock.getElapsedTime();
    const delta = this.clock.getDelta();

    // 1. Water wave ripples
    if (this.waterMesh && this.options.mode === 'flood') {
      const pos = this.waterMesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i);
        const v = pos.getZ(i);
        const wave = Math.sin(u * 0.3 + elapsedTime * 3.0) * 0.25 + Math.cos(v * 0.2 + elapsedTime * 2.5) * 0.2;
        pos.setY(i, wave);
      }
      this.waterMesh.geometry.attributes.position.needsUpdate = true;
    }

    // 2. Rain particles
    if (this.rainParticles && this.rainParticles.geometry) {
      const pos = this.rainParticles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i);
        y -= (this.rainVelocities[i] || 2.0);
        if (y < -5) y = 55 + Math.random() * 10;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    // 3. Waterfall spray particles
    if (this.waterfallParticles && this.waterfallParticles.geometry) {
      const pos = this.waterfallParticles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i);
        y -= 0.3;
        if (y < -3.5) y = 7.0 + Math.random() * 2.0;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    // 4. Hazard beacon pulsing
    if (this.hazardLight) {
      this.hazardLight.intensity = 1.5 + Math.sin(elapsedTime * 6.0) * 1.2;
    }

    // 5. Autonomous Drone Aerial Patrol Camera Mode
    if (this.options.droneMode && this.camera && this.controls) {
      const droneRadius = 85;
      const droneSpeed = 0.22;
      const droneAngle = elapsedTime * droneSpeed;
      this.camera.position.x = Math.sin(droneAngle) * droneRadius;
      this.camera.position.z = Math.cos(droneAngle) * droneRadius;
      this.camera.position.y = 42 + Math.sin(elapsedTime * 0.5) * 8;
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    } else if (this.controls) {
      this.controls.update();
    }

    // 6. Timeline Auto-Playback Scrubber
    if (this.options.isPlayingTimeline) {
      this.timelineClock += 0.02 * this.options.playbackSpeed;
      if (this.timelineClock > 6.0) this.timelineClock = -6.0;
      this.options.timelineHour = this.timelineClock;
      this.updatePhysics();
    }

    this.renderer.render(this.scene, this.camera);
  }

  /* -------------------------------------------------------------
     PUBLIC API CONTROLS
     ------------------------------------------------------------- */
  setTimelineHour(hour) {
    this.options.timelineHour = parseFloat(hour);
    this.timelineClock = parseFloat(hour);
    this.updatePhysics();
  }

  toggleTimelinePlay(playing, speed = 1.0) {
    this.options.isPlayingTimeline = playing;
    this.options.playbackSpeed = speed;
  }

  toggleDroneMode(enabled) {
    this.options.droneMode = enabled;
  }

  toggleHeatmap(enabled) {
    this.options.showHeatmap = enabled !== undefined ? enabled : !this.options.showHeatmap;
    this.rebuildScene();
    return this.options.showHeatmap;
  }

  toggleRunoff(enabled) {
    this.options.showRunoff = enabled !== undefined ? enabled : !this.options.showRunoff;
    if (this.runoffMeshGroup) {
      this.runoffMeshGroup.visible = this.options.showRunoff;
    }
    return this.options.showRunoff;
  }

  setMode(mode) {
    if (this.options.mode !== mode) {
      this.options.mode = mode;
      this.rebuildScene();
    }
  }

  setTelemetry(telemetry) {
    if (telemetry.rainfall !== undefined) this.options.rainfall = telemetry.rainfall;
    if (telemetry.saturation !== undefined) this.options.saturation = telemetry.saturation;
    if (telemetry.waterLevel !== undefined) this.options.waterLevel = telemetry.waterLevel;
    if (telemetry.slopeAngle !== undefined) this.options.slopeAngle = telemetry.slopeAngle;

    this.updatePhysics();

    if (telemetry.rainfall !== undefined) {
      if (this.rainParticles) this.scene.remove(this.rainParticles);
      this.buildRainSystem();
    }
  }

  setCameraPreset(preset) {
    if (!this.camera || !this.controls) return;
    this.options.droneMode = false;

    if (preset === 'iso') {
      this.camera.position.set(70, 52, 85);
      this.controls.target.set(0, 0, 0);
    } else if (preset === 'top') {
      this.camera.position.set(0, 120, 0.1);
      this.controls.target.set(0, 0, 0);
    } else if (preset === 'cross-section') {
      this.camera.position.set(95, 6, 0);
      this.controls.target.set(0, 2, 0);
    } else if (preset === 'bridge') {
      this.camera.position.set(0, 6, 18);
      this.controls.target.set(0, 0, -8);
    } else if (preset === 'shelter') {
      this.camera.position.set(-32, 28, 5);
      this.controls.target.set(0, 0, 0);
    }
    this.controls.update();
  }

  toggleWireframe(enabled) {
    if (this.wireframeMesh) {
      this.wireframeMesh.visible = enabled;
    }
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const rect = this.container.getBoundingClientRect();
    const width = rect.width > 50 ? rect.width : (this.container.clientWidth || 740);
    const height = rect.height > 50 ? rect.height : (this.container.clientHeight || 500);
    if (width <= 0 || height <= 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  destroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.remove();
    }
  }
}

window.Terrain3DVisualizer = Terrain3DVisualizer;
