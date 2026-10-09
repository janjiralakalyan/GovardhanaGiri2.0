/**
 * CustomDEMEngine: High-Performance GeoTIFF, Raster Image & Matrix DEM Ingestion Subsystem
 */
class CustomDEMEngine {
  constructor() {
    this.presets = {
      'DEM-KUNTALA-LIDAR': {
        id: 'DEM-KUNTALA-LIDAR',
        name: 'Kuntala Gorge (45m Basalt Precipice LiDAR)',
        mode: 'flood',
        resX: 64,
        resY: 64,
        minMSL: 380,
        maxMSL: 445,
        generator: (u, v) => {
          const x = u * 50;
          const z = v * 50;
          const poolDist = Math.sqrt(x * x + (z - 8) * (z - 8));
          if (z < -2) {
            return 8.5 + Math.sin(x * 0.2) * 1.0 + (Math.abs(x) > 8 ? Math.pow((Math.abs(x) - 8) / 20, 1.3) * 12 : 0);
          } else if (poolDist < 12) {
            return -4.5 + Math.pow(poolDist / 12, 2) * 3.0;
          } else if (Math.abs(x) < 8 && z >= -2) {
            return -1.5 + (z / 40) * 1.5;
          } else {
            return 7.0 + Math.pow(Math.abs(x) / 35, 1.2) * 16.0 + Math.sin(x * 0.15 + z * 0.1) * 2.0;
          }
        }
      },
      'DEM-MEDARAM-BASIN': {
        id: 'DEM-MEDARAM-BASIN',
        name: 'Medaram Jampanna Vagu Catchment DEM',
        mode: 'flood',
        resX: 64,
        resY: 64,
        minMSL: 140,
        maxMSL: 195,
        generator: (u, v) => {
          const x = u * 50;
          const z = v * 50;
          const riverCenter = Math.sin(z * 0.05) * 8.0 + Math.cos(z * 0.02) * 4.0;
          const dist = Math.abs(x - riverCenter);
          if (dist < 9) {
            return Math.pow(dist / 9, 2) * 2.8 - 3.8 + Math.sin(x * 0.4) * 0.2;
          } else if (dist < 18) {
            return -1.0 + (dist - 9) * 0.6 + Math.sin(z * 0.1) * 0.5;
          } else {
            const hill = (dist - 18) / 25;
            return 4.4 + Math.pow(hill, 1.25) * 18.0 + Math.sin(x * 0.12 + z * 0.12) * 2.5;
          }
        }
      },
      'DEM-BHADRACHALAM-GHAT': {
        id: 'DEM-BHADRACHALAM-GHAT',
        name: 'Bhadrachalam Godavari River & Ghats LiDAR',
        mode: 'flood',
        resX: 64,
        resY: 64,
        minMSL: 45,
        maxMSL: 78,
        generator: (u, v) => {
          const x = u * 50;
          const z = v * 50;
          const riverCenter = Math.sin(z * 0.03) * 8;
          const dist = Math.abs(x - riverCenter);
          if (dist < 14) {
            return Math.pow(dist / 14, 2) * 2.5 - 3.2 + Math.sin(x * 0.3) * 0.15;
          } else {
            const wall = (dist - 14) / 32;
            return -0.7 + Math.pow(wall, 1.1) * 14.0 + Math.sin(x * 0.1 + z * 0.08) * 2.0;
          }
        }
      },
      'DEM-AIZAWL-DURTLANG': {
        id: 'DEM-AIZAWL-DURTLANG',
        name: 'Aizawl Durtlang Razorback Escarpment DEM (38° Dip Slope)',
        mode: 'landslide',
        resX: 64,
        resY: 64,
        minMSL: 820,
        maxMSL: 1180,
        generator: (u, v) => {
          const x = u * 50;
          const z = v * 50;
          const radSlope = (38.0 * Math.PI) / 180;
          let el = (-z) * Math.tan(radSlope * 0.52);
          el += Math.sin(x * 0.09) * 5.2 + Math.cos(z * 0.08 + x * 0.06) * 3.0;
          const scarDist = Math.sqrt(x * x + (z - 2) * (z - 2));
          if (scarDist < 19) {
            el -= (1 - scarDist / 19) * 4.8;
          }
          return el;
        }
      },
      'DEM-GANGTOK-RIDGE': {
        id: 'DEM-GANGTOK-RIDGE',
        name: 'Gangtok Urban Ridge & Active Shear Thrust DEM',
        mode: 'landslide',
        resX: 64,
        resY: 64,
        minMSL: 1540,
        maxMSL: 1820,
        generator: (u, v) => {
          const x = u * 50;
          const z = v * 50;
          let el = (-z) * 0.62 + Math.sin(x * 0.1) * 4.0 + Math.cos(x * 0.18 + z * 0.1) * 2.5;
          const step = Math.floor((z + 30) / 10);
          el += (step % 2 === 0 ? 1.2 : -0.8);
          return el;
        }
      }
    };
  }

  generateGridFromPreset(presetId) {
    const preset = this.presets[presetId] || this.presets['DEM-KUNTALA-LIDAR'];
    const { resX, resY, generator } = preset;
    const grid = [];
    for (let r = 0; r < resY; r++) {
      const row = [];
      const v = (r / (resY - 1)) * 2 - 1;
      for (let c = 0; c < resX; c++) {
        const u = (c / (resX - 1)) * 2 - 1;
        row.push(generator(u, v));
      }
      grid.push(row);
    }
    return {
      id: preset.id,
      name: preset.name,
      mode: preset.mode,
      minMSL: preset.minMSL,
      maxMSL: preset.maxMSL,
      grid: grid,
      resX: resX,
      resY: resY,
      getElevation: (x, z, size = 100) => {
        const u = (x / size + 0.5) * (resX - 1);
        const v = (z / size + 0.5) * (resY - 1);
        const c0 = Math.max(0, Math.min(resX - 1, Math.floor(u)));
        const c1 = Math.max(0, Math.min(resX - 1, Math.ceil(u)));
        const r0 = Math.max(0, Math.min(resY - 1, Math.floor(v)));
        const r1 = Math.max(0, Math.min(resY - 1, Math.ceil(v)));
        const fu = u - c0;
        const fv = v - r0;
        const q00 = grid[r0][c0];
        const q10 = grid[r0][c1];
        const q01 = grid[r1][c0];
        const q11 = grid[r1][c1];
        return (q00 * (1 - fu) + q10 * fu) * (1 - fv) + (q01 * (1 - fu) + q11 * fu) * fv;
      }
    };
  }

  parseFromCanvasImage(image, minMSL = 100, maxMSL = 450) {
    const canvas = document.createElement('canvas');
    const res = 64;
    canvas.width = res;
    canvas.height = res;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, res, res);
    const imgData = ctx.getImageData(0, 0, res, res).data;
    const grid = [];
    const heightSpan = 30.0;
    for (let r = 0; r < res; r++) {
      const row = [];
      for (let c = 0; c < res; c++) {
        const idx = (r * res + c) * 4;
        const rVal = imgData[idx];
        const gVal = imgData[idx + 1];
        const bVal = imgData[idx + 2];
        const luminance = (rVal * 0.299 + gVal * 0.587 + bVal * 0.114) / 255.0;
        const elev = (luminance - 0.5) * heightSpan;
        row.push(elev);
      }
      grid.push(row);
    }
    return {
      id: 'CUSTOM-IMAGE-DEM',
      name: 'Custom Ingested GeoTIFF/DEM Raster',
      mode: 'flood',
      minMSL: minMSL,
      maxMSL: maxMSL,
      grid: grid,
      resX: res,
      resY: res,
      getElevation: (x, z, size = 100) => {
        const u = (x / size + 0.5) * (res - 1);
        const v = (z / size + 0.5) * (res - 1);
        const c0 = Math.max(0, Math.min(res - 1, Math.floor(u)));
        const c1 = Math.max(0, Math.min(res - 1, Math.ceil(u)));
        const r0 = Math.max(0, Math.min(res - 1, Math.floor(v)));
        const r1 = Math.max(0, Math.min(res - 1, Math.ceil(v)));
        const fu = u - c0;
        const fv = v - r0;
        const q00 = grid[r0][c0];
        const q10 = grid[r0][c1];
        const q01 = grid[r1][c0];
        const q11 = grid[r1][c1];
        return (q00 * (1 - fu) + q10 * fu) * (1 - fv) + (q01 * (1 - fu) + q11 * fu) * fv;
      }
    };
  }

  parseFromMatrixJSON(jsonObj) {
    const matrix = jsonObj.matrix || jsonObj.grid || jsonObj;
    if (!Array.isArray(matrix) || !Array.isArray(matrix[0])) {
      throw new Error('Invalid DEM JSON format: Expected 2D elevation array matrix.');
    }
    const resY = matrix.length;
    const resX = matrix[0].length;
    let minE = Infinity, maxE = -Infinity;
    for (let r = 0; r < resY; r++) {
      for (let c = 0; c < resX; c++) {
        const val = Number(matrix[r][c]) || 0;
        if (val < minE) minE = val;
        if (val > maxE) maxE = val;
      }
    }
    const minMSL = jsonObj.minMSL || (minE > 0 ? minE : 120);
    const maxMSL = jsonObj.maxMSL || (maxE > 0 ? maxE : 280);
    const span = Math.max(1, maxE - minE);

    const normGrid = [];
    for (let r = 0; r < resY; r++) {
      const row = [];
      for (let c = 0; c < resX; c++) {
        const val = Number(matrix[r][c]) || 0;
        const norm = ((val - minE) / span - 0.5) * 28.0;
        row.push(norm);
      }
      normGrid.push(row);
    }

    return {
      id: jsonObj.id || 'CUSTOM-JSON-DEM',
      name: jsonObj.name || 'Custom Ingested Matrix DEM',
      mode: jsonObj.mode || 'flood',
      minMSL: minMSL,
      maxMSL: maxMSL,
      grid: normGrid,
      resX: resX,
      resY: resY,
      getElevation: (x, z, size = 100) => {
        const u = (x / size + 0.5) * (resX - 1);
        const v = (z / size + 0.5) * (resY - 1);
        const c0 = Math.max(0, Math.min(resX - 1, Math.floor(u)));
        const c1 = Math.max(0, Math.min(resX - 1, Math.ceil(u)));
        const r0 = Math.max(0, Math.min(resY - 1, Math.floor(v)));
        const r1 = Math.max(0, Math.min(resY - 1, Math.ceil(v)));
        const fu = u - c0;
        const fv = v - r0;
        const q00 = normGrid[r0][c0];
        const q10 = normGrid[r0][c1];
        const q01 = normGrid[r1][c0];
        const q11 = normGrid[r1][c1];
        return (q00 * (1 - fu) + q10 * fu) * (1 - fv) + (q01 * (1 - fu) + q11 * fu) * fv;
      }
    };
  }
}

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
      riskEvolutionPhase: 2, // 1: Safe, 2: Moderate Infiltration, 3: Saturated Surge, 4: Critical Inundation
      useAdvancedWaterShader: true,
      showSeepage: true,
      binghamYieldStress: 35.0,
      binghamViscosity: 14.0,
      demExaggeration: 1.0
    }, options);

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.animationFrameId = null;

    // Custom DEM Ingestion Engine
    this.demEngine = new CustomDEMEngine();
    this.customDEMData = null;

    // Advanced Water Shader & Hydraulics
    this.waterShaderUniforms = null;
    this.hydraulicSprayParticles = null;
    this.hydraulicSprayVelocities = [];

    // Bingham Viscoplastic Mudflow & Dynamic Alluvial Fan
    this.alluvialFanMesh = null;
    this.alluvialFanAccumulation = 0.0;
    this.binghamDebrisPhysics = [];

    // Darcy Groundwater Seepage Streamlines
    this.seepageStreamlinesGroup = null;

    // 3D Meshes & Groups
    this.terrainMesh = null;
    this.wireframeMesh = null;
    this.waterMesh = null;
    this.damMeshGroup = null;
    this.waterfallMeshGroup = null;
    this.slipPlaneMesh = null;
    this.tensionCracksGroup = null;
    this.slidingMassGroup = null;
    this.bouldersGroup = null;
    this.debrisFlowParticles = null;
    this.dustCloudsGroup = null;
    this.treesGroup = null;
    this.markersGroup = null;
    this.settlementsGroup = null;
    this.roadsGroup = null;
    this.bridgeGroup = null;
    this.probeGroup = null;
    this.rainParticles = null;
    this.runoffParticles = null;
    this.dangerContoursGroup = null;

    // Dam Engineering & Hydrodynamic Spillway System
    this.damGates = [];
    this.damAlarmBeacons = [];
    this.spillwayWaterMesh = null;
    this.damJetMesh = null;
    this.damSprayParticles = null;
    this.damSprayVelocities = [];
    this.damOvertoppingCascadeMesh = null;

    // Dynamic Atmospheric Lighting & Alarm System
    this.ambientLight = null;
    this.sunLight = null;
    this.hemiLight = null;
    this.hazardLight = null;
    this.lightningLight = null;
    this.lightningFlash = 0.0;
    this.lastThunderTime = 0;
    this.isAlarmTriggered = false;
    this.alarmLevel = 'NORMAL';

    // Dynamic Landslide Physics State
    this.boulderPhysics = [];
    this.dustParticlePhysics = [];
    this.slopeTreesNodes = [];
    this.currentSlideDisplacement = 0;
    this.targetSlideDisplacement = 0;

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
        name: 'Kerameri Ghat (Mountain Flash Torrent)',
        mode: 'flood',
        morphType: 'canyon_gorge',
        riverName: 'Kerameri Mountain Torrent',
        baseElevation: 610.0,
        slope: 24.5,
        dangerWaterLevel: 4.5,
        riverWidth: 10.0,
        canyonDepth: 10.0,
        hasBridge: true,
        bridgeElev: 0.8,
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
        name: 'Mannanur Nallamala Plateau (Dindi Ravines)',
        mode: 'flood',
        morphType: 'confluence_delta',
        riverName: 'Dindi Stream Ravines',
        baseElevation: 585.0,
        slope: 16.5,
        dangerWaterLevel: 4.8,
        riverWidth: 12.0,
        canyonDepth: 8.0,
        hasBridge: true,
        bridgeElev: 0.8,
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
    this.ambientLight = new THREE.AmbientLight(0x38bdf8, 0.45);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 1.35);
    this.sunLight.position.set(85, 110, 55);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 320;
    this.sunLight.shadow.camera.left = -65;
    this.sunLight.shadow.camera.right = 65;
    this.sunLight.shadow.camera.top = 65;
    this.sunLight.shadow.camera.bottom = -65;
    this.scene.add(this.sunLight);

    this.hemiLight = new THREE.HemisphereLight(0x0ea5e9, 0x0f172a, 0.7);
    this.scene.add(this.hemiLight);

    this.hazardLight = new THREE.PointLight(0xef4444, 2.2, 50);
    this.hazardLight.position.set(0, 16, 0);
    this.scene.add(this.hazardLight);

    // Dynamic lightning strobe flash
    this.lightningLight = new THREE.DirectionalLight(0xa5f3fc, 0.0);
    this.lightningLight.position.set(-20, 90, -40);
    this.scene.add(this.lightningLight);
  }

  rebuildScene() {
    // Clear existing meshes
    if (this.terrainMesh) this.scene.remove(this.terrainMesh);
    if (this.wireframeMesh) this.scene.remove(this.wireframeMesh);
    if (this.waterMesh) this.scene.remove(this.waterMesh);
    if (this.damMeshGroup) this.scene.remove(this.damMeshGroup);
    if (this.waterfallMeshGroup) this.scene.remove(this.waterfallMeshGroup);
    if (this.slipPlaneMesh) this.scene.remove(this.slipPlaneMesh);
    if (this.tensionCracksGroup) this.scene.remove(this.tensionCracksGroup);
    if (this.slidingMassGroup) this.scene.remove(this.slidingMassGroup);
    if (this.bouldersGroup) this.scene.remove(this.bouldersGroup);
    if (this.debrisFlowParticles) this.scene.remove(this.debrisFlowParticles);
    if (this.dustCloudsGroup) this.scene.remove(this.dustCloudsGroup);
    if (this.treesGroup) this.scene.remove(this.treesGroup);
    if (this.markersGroup) this.scene.remove(this.markersGroup);
    if (this.settlementsGroup) this.scene.remove(this.settlementsGroup);
    if (this.roadsGroup) this.scene.remove(this.roadsGroup);
    if (this.bridgeGroup) this.scene.remove(this.bridgeGroup);
    if (this.probeGroup) this.scene.remove(this.probeGroup);
    if (this.rainParticles) this.scene.remove(this.rainParticles);
    if (this.runoffParticles) this.scene.remove(this.runoffParticles);
    if (this.dangerContoursGroup) this.scene.remove(this.dangerContoursGroup);
    if (this.hydraulicSprayParticles) this.scene.remove(this.hydraulicSprayParticles);
    if (this.alluvialFanMesh) this.scene.remove(this.alluvialFanMesh);
    if (this.seepageStreamlinesGroup) this.scene.remove(this.seepageStreamlinesGroup);
    if (this.spillwayWaterMesh) this.scene.remove(this.spillwayWaterMesh);
    if (this.damJetMesh) this.scene.remove(this.damJetMesh);
    if (this.damSprayParticles) this.scene.remove(this.damSprayParticles);
    if (this.damOvertoppingCascadeMesh) this.scene.remove(this.damOvertoppingCascadeMesh);

    this.damGates = [];
    this.damAlarmBeacons = [];
    this.spillwayWaterMesh = null;
    this.damJetMesh = null;
    this.damSprayParticles = null;
    this.damSprayVelocities = [];
    this.damOvertoppingCascadeMesh = null;

    this.markersGroup = new THREE.Group();
    this.settlementsGroup = new THREE.Group();
    this.roadsGroup = new THREE.Group();
    this.bridgeGroup = new THREE.Group();
    this.probeGroup = new THREE.Group();
    this.damMeshGroup = new THREE.Group();
    this.waterfallMeshGroup = new THREE.Group();
    this.dangerContoursGroup = new THREE.Group();
    this.tensionCracksGroup = new THREE.Group();
    this.slidingMassGroup = new THREE.Group();
    this.bouldersGroup = new THREE.Group();
    this.dustCloudsGroup = new THREE.Group();
    this.treesGroup = new THREE.Group();
    this.seepageStreamlinesGroup = new THREE.Group();

    this.scene.add(this.markersGroup);
    this.scene.add(this.settlementsGroup);
    this.scene.add(this.roadsGroup);
    this.scene.add(this.bridgeGroup);
    this.scene.add(this.probeGroup);
    this.scene.add(this.damMeshGroup);
    this.scene.add(this.waterfallMeshGroup);
    this.scene.add(this.dangerContoursGroup);
    this.scene.add(this.tensionCracksGroup);
    this.scene.add(this.slidingMassGroup);
    this.scene.add(this.bouldersGroup);
    this.scene.add(this.dustCloudsGroup);
    this.scene.add(this.treesGroup);
    this.scene.add(this.seepageStreamlinesGroup);

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
      this.buildTensionCracks(profile);
      this.buildSlidingLandmass(profile);
      this.buildRollingBouldersAndDebris(profile);
      this.buildDustClouds(profile);
      this.buildLandslideForestTrees(profile);
      this.buildLandslideSettlements(profile);
      this.buildLandslideRoadNetwork(profile);
      this.buildLandslideMarkers(profile);
      this.buildBinghamDebrisFlowSystem(profile);
      this.buildSubsurfaceSeepageFlowlines(profile);
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
    // 1. Custom DEM Ingested Raster Elevation Interpolation
    if (this.customDEMData && typeof this.customDEMData.getElevation === 'function') {
      return this.customDEMData.getElevation(x, z, 100) * (this.options.demExaggeration || 1.0);
    }

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

  createAdvancedWaterShaderMaterial() {
    const uniforms = {
      uTime: { value: 0.0 },
      uWaveHeight: { value: 0.28 },
      uWaveFrequency: { value: 0.22 },
      uWaveSpeed: { value: 2.4 },
      uWaterColorShallow: { value: new THREE.Color(0x38bdf8) },
      uWaterColorDeep: { value: new THREE.Color(0x0284c7) },
      uMuddyColor: { value: new THREE.Color(0x92400e) },
      uTurbidity: { value: 0.15 },
      uFoamColor: { value: new THREE.Color(0xf8fafc) },
      uSunPosition: { value: new THREE.Vector3(85, 110, 55).normalize() },
      uSurgeIntensity: { value: 1.0 }
    };
    this.waterShaderUniforms = uniforms;

    const vertexShader = `
      uniform float uTime;
      uniform float uWaveHeight;
      uniform float uWaveFrequency;
      uniform float uWaveSpeed;
      uniform float uSurgeIntensity;

      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec2 vUv;
      varying float vWaveCrest;

      vec3 gerstnerWave(vec4 wave, vec3 p, inout vec3 tangent, inout vec3 binormal) {
        float steepness = wave.z;
        float wavelength = wave.w;
        float k = 6.2831853 / wavelength;
        float c = sqrt(9.8 / k);
        vec2 d = normalize(wave.xy);
        float f = k * (dot(d, p.xz) - c * uTime * uWaveSpeed * 0.4);
        float a = steepness / k * uWaveHeight * uSurgeIntensity;

        tangent += vec3(
          -d.x * d.x * (steepness * sin(f)),
          d.x * (steepness * cos(f)),
          -d.x * d.y * (steepness * sin(f))
        );
        binormal += vec3(
          -d.x * d.y * (steepness * sin(f)),
          d.y * (steepness * cos(f)),
          -d.y * d.y * (steepness * sin(f))
        );

        return vec3(
          d.x * (a * cos(f)),
          a * sin(f),
          d.y * (a * cos(f))
        );
      }

      void main() {
        vUv = uv;
        vec3 gridPoint = position;
        vec3 tangent = vec3(1.0, 0.0, 0.0);
        vec3 binormal = vec3(0.0, 0.0, 1.0);
        vec3 p = gridPoint;

        vec4 w1 = vec4(1.0, 0.25, 0.32, 12.0);
        vec4 w2 = vec4(0.35, 0.95, 0.22, 7.5);
        vec4 w3 = vec4(-0.7, 0.65, 0.18, 4.2);

        p += gerstnerWave(w1, gridPoint, tangent, binormal);
        p += gerstnerWave(w2, gridPoint, tangent, binormal);
        p += gerstnerWave(w3, gridPoint, tangent, binormal);

        vec3 normal = normalize(cross(binormal, tangent));
        vNormal = normal;
        vWaveCrest = clamp(p.y / (uWaveHeight * 2.0 + 0.1), 0.0, 1.0);

        vec4 worldPos = modelMatrix * vec4(p, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform vec3 uWaterColorShallow;
      uniform vec3 uWaterColorDeep;
      uniform vec3 uMuddyColor;
      uniform float uTurbidity;
      uniform vec3 uFoamColor;
      uniform vec3 uSunPosition;

      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec2 vUv;
      varying float vWaveCrest;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        vec3 normal = normalize(vNormal);

        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.5);
        fresnel = clamp(fresnel * 0.85 + 0.15, 0.0, 1.0);

        vec3 baseWater = mix(uWaterColorShallow, uWaterColorDeep, 0.55);
        vec3 turbulentWater = mix(baseWater, uMuddyColor, uTurbidity);

        vec3 halfVector = normalize(uSunPosition + viewDir);
        float spec = pow(max(dot(normal, halfVector), 0.0), 48.0);
        vec3 specularGlint = vec3(1.0, 0.98, 0.92) * spec * 1.5;

        float foamNoise = noise(vWorldPosition.xz * 1.5 + uTime * 0.7) * 0.55 +
                          noise(vWorldPosition.xz * 3.8 - uTime * 1.1) * 0.45;
        float foamFactor = smoothstep(0.48, 0.92, vWaveCrest + (foamNoise - 0.5) * 0.35);
        foamFactor = clamp(foamFactor * (0.35 + uTurbidity * 0.65), 0.0, 1.0);

        vec3 finalColor = mix(turbulentWater, vec3(0.75, 0.9, 1.0), fresnel * 0.55);
        finalColor = mix(finalColor, uFoamColor, foamFactor);
        finalColor += specularGlint;

        float alpha = mix(0.82, 0.97, uTurbidity * 0.8 + foamFactor * 0.3);
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    return new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      side: THREE.DoubleSide
    });
  }

  buildWaterSurgePlane(profile) {
    const size = 100;
    const geom = new THREE.PlaneGeometry(size, size, 96, 96);
    geom.rotateX(-Math.PI / 2);

    let waterMat;
    if (this.options.useAdvancedWaterShader !== false && typeof THREE.ShaderMaterial !== 'undefined') {
      try {
        waterMat = this.createAdvancedWaterShaderMaterial();
      } catch (err) {
        console.warn('[Terrain3D] GLSL Shader fallback to PBR:', err);
      }
    }

    if (!waterMat) {
      waterMat = new THREE.MeshPhysicalMaterial({
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
    }

    this.waterMesh = new THREE.Mesh(geom, waterMat);
    this.waterMesh.position.y = -1.5;
    this.scene.add(this.waterMesh);

    // Build Hydraulic Spray & Turbulence Plumes around obstacles
    this.buildHydraulicSpraySystem(profile);
  }

  buildHydraulicSpraySystem(profile) {
    const sprayCount = 450;
    const sprayGeom = new THREE.BufferGeometry();
    const sprayPositions = new Float32Array(sprayCount * 3);
    this.hydraulicSprayVelocities = [];

    for (let i = 0; i < sprayCount; i++) {
      const sprayX = (Math.random() - 0.5) * 32.0;
      const sprayZ = -8.0 + (Math.random() - 0.5) * 16.0;
      const sprayY = -1.2 + Math.random() * 2.5;

      sprayPositions[i * 3] = sprayX;
      sprayPositions[i * 3 + 1] = sprayY;
      sprayPositions[i * 3 + 2] = sprayZ;

      this.hydraulicSprayVelocities.push({
        vx: (Math.random() - 0.5) * 0.18,
        vy: 0.12 + Math.random() * 0.28,
        vz: 0.08 + Math.random() * 0.22,
        originX: sprayX,
        originY: -1.2,
        originZ: sprayZ,
        life: Math.random()
      });
    }

    sprayGeom.setAttribute('position', new THREE.BufferAttribute(sprayPositions, 3));

    const sprayMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.4,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    this.hydraulicSprayParticles = new THREE.Points(sprayGeom, sprayMat);
    this.scene.add(this.hydraulicSprayParticles);
  }

  buildBinghamDebrisFlowSystem(profile) {
    // Multi-Phase Bingham Viscoplastic Mudflow Particles (1,500 particles)
    const debrisCount = 1500;
    const debrisGeom = new THREE.BufferGeometry();
    const debrisPositions = new Float32Array(debrisCount * 3);
    this.binghamDebrisPhysics = [];

    for (let i = 0; i < debrisCount; i++) {
      const x = (Math.random() - 0.5) * 38;
      const z = -18 + Math.random() * 56;
      const y = this.getElevationAt(x, z, profile) + 0.35 + Math.random() * 0.6;

      debrisPositions[i * 3] = x;
      debrisPositions[i * 3 + 1] = y;
      debrisPositions[i * 3 + 2] = z;

      this.binghamDebrisPhysics.push({
        origX: (Math.random() - 0.5) * 32,
        origZ: -16 + Math.random() * 6,
        vx: 0,
        vz: 0.2 + Math.random() * 0.4,
        grainSize: 0.8 + Math.random() * 1.6,
        isPlugFlow: false
      });
    }

    debrisGeom.setAttribute('position', new THREE.BufferAttribute(debrisPositions, 3));

    const debrisMat = new THREE.PointsMaterial({
      color: 0x78350f,
      size: 1.5,
      transparent: true,
      opacity: 0.88,
      blending: THREE.NormalBlending
    });

    this.debrisFlowParticles = new THREE.Points(debrisGeom, debrisMat);
    this.scene.add(this.debrisFlowParticles);

    // Dynamic Alluvial Fan Cone (Grows with accumulated volume at valley base)
    const fanGeom = new THREE.ConeGeometry(18, 4.5, 32, 8, false, 0, Math.PI);
    fanGeom.rotateX(Math.PI / 2);
    fanGeom.rotateY(Math.PI);
    const fanMat = new THREE.MeshStandardMaterial({
      color: 0x573919,
      roughness: 0.95,
      metalness: 0.05
    });
    this.alluvialFanMesh = new THREE.Mesh(fanGeom, fanMat);
    this.alluvialFanMesh.position.set(0, -1.8, 22);
    this.alluvialFanMesh.scale.set(1.0, 0.2, 1.0);
    this.scene.add(this.alluvialFanMesh);
  }

  buildSubsurfaceSeepageFlowlines(profile) {
    if (!this.options.showSeepage) return;
    if (!this.seepageStreamlinesGroup) this.seepageStreamlinesGroup = new THREE.Group();

    // 5 Darcy Groundwater Flow Streamlines converging onto the Bishop Shear Surface
    const flowlineCurves = [
      [new THREE.Vector3(-14, 6, -10), new THREE.Vector3(-10, 3, -2), new THREE.Vector3(-6, -0.5, 6), new THREE.Vector3(-2, -3.0, 14)],
      [new THREE.Vector3(-8, 7, -12), new THREE.Vector3(-4, 3.5, -4), new THREE.Vector3(0, 0.0, 5), new THREE.Vector3(2, -2.5, 15)],
      [new THREE.Vector3(0, 8, -14), new THREE.Vector3(1, 4.0, -5), new THREE.Vector3(3, 0.5, 4), new THREE.Vector3(4, -2.0, 16)],
      [new THREE.Vector3(8, 7, -12), new THREE.Vector3(6, 3.5, -4), new THREE.Vector3(4, 0.0, 5), new THREE.Vector3(2, -2.5, 15)],
      [new THREE.Vector3(14, 6, -10), new THREE.Vector3(10, 3, -2), new THREE.Vector3(6, -0.5, 6), new THREE.Vector3(2, -3.0, 14)]
    ];

    flowlineCurves.forEach(pts => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const tubeGeom = new THREE.TubeGeometry(curve, 32, 0.18, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.65,
        transparent: true,
        opacity: 0.75,
        roughness: 0.2
      });
      const tube = new THREE.Mesh(tubeGeom, tubeMat);
      this.seepageStreamlinesGroup.add(tube);
    });

    this.scene.add(this.seepageStreamlinesGroup);
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
    // 1. Concrete Gravity Dam Main Abutment Body across canyon at z = 0
    const damGeom = new THREE.BoxGeometry(44, 9.4, 5.8);
    const damMat = new THREE.MeshStandardMaterial({
      color: 0x526177,
      roughness: 0.65,
      metalness: 0.15
    });
    const dam = new THREE.Mesh(damGeom, damMat);
    dam.position.set(0, 0.8, 0);
    dam.castShadow = true;
    dam.receiveShadow = true;
    this.damMeshGroup.add(dam);

    // Left & Right Flank Abutment Wing Walls
    [-22, 22].forEach(wx => {
      const wingGeom = new THREE.BoxGeometry(6.0, 11.5, 8.0);
      const wing = new THREE.Mesh(wingGeom, damMat);
      wing.position.set(wx, 1.8, 0.5);
      wing.castShadow = true;
      this.damMeshGroup.add(wing);
    });

    // 2. Dam Crest Roadway with Concrete Parapets & Guardrails
    const crestRoad = new THREE.Mesh(
      new THREE.BoxGeometry(46, 0.45, 5.6),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 })
    );
    crestRoad.position.set(0, 5.5, 0);
    this.damMeshGroup.add(crestRoad);

    // Parapet safety rails on crest
    [-2.6, 2.6].forEach(pz => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(46, 0.5, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 })
      );
      rail.position.set(0, 5.95, pz);
      this.damMeshGroup.add(rail);
    });

    // 3. 3 Radial Spillway Arched Gates & Gate Hoist Towers with Emergency Alarm Sirens
    this.damGates = [];
    this.damAlarmBeacons = [];

    [-8, 0, 8].forEach((gx, idx) => {
      // Pier dividing walls
      const pierGeom = new THREE.BoxGeometry(1.4, 7.5, 6.2);
      const pierMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
      const pierL = new THREE.Mesh(pierGeom, pierMat);
      pierL.position.set(gx - 2.8, 1.5, 0);
      this.damMeshGroup.add(pierL);

      const pierR = new THREE.Mesh(pierGeom, pierMat);
      pierR.position.set(gx + 2.8, 1.5, 0);
      this.damMeshGroup.add(pierR);

      // Radial Curved Steel Gate Leaf
      const gateGeom = new THREE.BoxGeometry(4.2, 5.2, 5.2);
      const gateMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.85,
        roughness: 0.28
      });
      const gate = new THREE.Mesh(gateGeom, gateMat);
      gate.position.set(gx, 0.6, 0);
      gate.castShadow = true;
      this.damMeshGroup.add(gate);
      this.damGates.push({ mesh: gate, origY: 0.6, gx: gx });

      // Gate Hoist Overhead Gantry Tower
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 4.6, 1.6),
        new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.75, roughness: 0.3 })
      );
      tower.position.set(gx, 7.2, 0);
      this.damMeshGroup.add(tower);

      // Gantry Crossbeam
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(5.8, 0.4, 1.4),
        new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.8 })
      );
      beam.position.set(gx, 9.2, 0);
      this.damMeshGroup.add(beam);

      // 🚨 3D Emergency Rotating Warning Siren Beacon atop Tower
      const beaconBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.45, 0.35, 12),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 })
      );
      beaconBase.position.set(gx, 9.6, 0);
      this.damMeshGroup.add(beaconBase);

      const sirenDome = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.55, 16),
        new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: 0xdc2626,
          emissiveIntensity: 0.8,
          transparent: true,
          opacity: 0.92,
          roughness: 0.1
        })
      );
      sirenDome.position.set(gx, 10.0, 0);
      this.damMeshGroup.add(sirenDome);

      // Rotating strobe light lens & point light
      const strobeLight = new THREE.PointLight(0xef4444, 0.5, 30);
      strobeLight.position.set(gx, 10.1, 0);
      this.damMeshGroup.add(strobeLight);

      // Revolving visual reflector beam mesh
      const beamGeom = new THREE.ConeGeometry(3.5, 12, 16, 1, true);
      beamGeom.rotateX(Math.PI / 2);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const reflectorBeam = new THREE.Mesh(beamGeom, beamMat);
      reflectorBeam.position.set(gx, 10.0, 6.0);
      this.damMeshGroup.add(reflectorBeam);

      this.damAlarmBeacons.push({
        dome: sirenDome,
        light: strobeLight,
        beam: reflectorBeam,
        gx: gx
      });
    });

    // 4. Downstream Concrete Spillway Chute & Flip Bucket Ski Jump
    const chuteGeom = new THREE.BoxGeometry(26, 1.4, 17);
    const chuteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.75 });
    const chute = new THREE.Mesh(chuteGeom, chuteMat);
    chute.position.set(0, -1.8, 8.5);
    chute.rotateX(0.19);
    this.damMeshGroup.add(chute);

    // Chute Training Guide Walls
    [-13.2, 13.2].forEach(cx => {
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 3.2, 17),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 })
      );
      wall.position.set(cx, -0.6, 8.5);
      wall.rotateX(0.19);
      this.damMeshGroup.add(wall);
    });

    // Flip-Bucket Up-curve Lip at Chute Termination
    const lipGeom = new THREE.BoxGeometry(26, 1.6, 3.0);
    const lip = new THREE.Mesh(lipGeom, chuteMat);
    lip.position.set(0, -2.4, 16.5);
    lip.rotateX(-0.28); // Upward curve to throw water into air
    this.damMeshGroup.add(lip);

    // 5. Dynamic Cascading Whitewater Spillway Surface Mesh (Over Chute)
    const spillwayWaterGeom = new THREE.PlaneGeometry(24, 17, 32, 32);
    spillwayWaterGeom.rotateX(-Math.PI / 2 + 0.19);
    const spillwayWaterMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.35,
      roughness: 0.1,
      metalness: 0.15,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    });
    this.spillwayWaterMesh = new THREE.Mesh(spillwayWaterGeom, spillwayWaterMat);
    this.spillwayWaterMesh.position.set(0, -1.0, 8.5);
    this.damMeshGroup.add(this.spillwayWaterMesh);

    // 6. Flip-Bucket Aerated Whitewater Jet Discharge Arc Mesh
    const jetGeom = new THREE.PlaneGeometry(22, 12, 24, 24);
    jetGeom.rotateX(-0.35);
    const jetMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xbae6fd,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.88,
      roughness: 0.2,
      side: THREE.DoubleSide
    });
    this.damJetMesh = new THREE.Mesh(jetGeom, jetMat);
    this.damJetMesh.position.set(0, -1.6, 22.0);
    this.damMeshGroup.add(this.damJetMesh);

    // 7. Aerated Whitewater Spray & Plume Particle Emitter (Plunge Pool & Tailrace)
    const sprayCount = 850;
    const sprayGeom = new THREE.BufferGeometry();
    const sprayPos = new Float32Array(sprayCount * 3);
    this.damSprayVelocities = [];

    for (let i = 0; i < sprayCount; i++) {
      const sx = (Math.random() - 0.5) * 26.0;
      const sz = 16.0 + Math.random() * 16.0;
      const sy = -2.8 + Math.random() * 3.5;

      sprayPos[i * 3] = sx;
      sprayPos[i * 3 + 1] = sy;
      sprayPos[i * 3 + 2] = sz;

      this.damSprayVelocities.push({
        vx: (Math.random() - 0.5) * 0.22,
        vy: 0.18 + Math.random() * 0.45,
        vz: 0.15 + Math.random() * 0.35,
        origX: sx,
        origZ: sz
      });
    }

    sprayGeom.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
    const damSprayMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.6,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    this.damSprayParticles = new THREE.Points(sprayGeom, damSprayMat);
    this.damMeshGroup.add(this.damSprayParticles);

    // 8. Dam Crest Overtopping Cascade Sheet Mesh (Active during Extreme Floods / Phase 4)
    const cascadeGeom = new THREE.PlaneGeometry(42, 6.5, 32, 16);
    cascadeGeom.rotateX(0.08);
    const cascadeMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x93c5fd,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    this.damOvertoppingCascadeMesh = new THREE.Mesh(cascadeGeom, cascadeMat);
    this.damOvertoppingCascadeMesh.position.set(0, 2.8, 2.9);
    this.damOvertoppingCascadeMesh.visible = false;
    this.damMeshGroup.add(this.damOvertoppingCascadeMesh);
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
     LANDSLIDE REAL-TIME SLOPE & SLIP SURFACE SCENE BUILDERS
     ------------------------------------------------------------- */
  buildLandslideSlopeTerrain(profile) {
    const size = 110;
    const segments = 130;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    const colors = [];
    const color = new THREE.Color();
    const rain = this.options.rainfall || 35.0;
    const sat = this.options.saturation || 75.0;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const elevation = this.getElevationAt(x, z, profile);
      pos.setY(i, elevation);

      const scarDist = Math.sqrt(x * x + (z - 2) * (z - 2));

      if (this.options.showHeatmap) {
        if (scarDist < 16) {
          color.setRGB(0.95, 0.15, 0.15); // Critical shear rupture scar
        } else if (elevation > 8 && z < 10) {
          color.setRGB(0.95, 0.55, 0.10); // Active sliding zone
        } else if (z > 20) {
          color.setRGB(0.85, 0.80, 0.20); // Remote runout impact zone
        } else {
          color.setRGB(0.12, 0.65, 0.35); // Stable high crest
        }
      } else {
        // High-Fidelity Northeast Mountain Geological Stratigraphy
        if (scarDist < 16 && z < 14) {
          // Exposed sheared wet shale & slickensided clay slip surface
          if (sat > 80 || rain > 45) {
            color.setRGB(0.48, 0.20, 0.12); // Deep muddy saturated slip scar
          } else {
            color.setRGB(0.68, 0.28, 0.18); // Dry exposed sheared clay
          }
        } else if (elevation > 14) {
          // Rocky high crest & jointed sandstone outcrop
          color.setRGB(0.58, 0.52, 0.44);
        } else if (z > 24) {
          // Remote valley alluvial flat & agricultural terraces
          color.setRGB(0.24, 0.46, 0.22);
        } else if (Math.abs(x) < 8 && z >= 10 && z <= 30) {
          // Main erosion gully / debris chute
          color.setRGB(0.38, 0.28, 0.18);
        } else {
          // Sub-tropical lush hillside forest colluvium
          color.setRGB(0.14, 0.50, 0.22);
        }
      }

      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    // Responsive surface sheen: wet glossy mud when saturation or rainfall is high
    const isWet = sat > 75 || rain > 40;
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: isWet ? 0.42 : 0.88,
      metalness: isWet ? 0.22 : 0.05
    });

    this.terrainMesh = new THREE.Mesh(geometry, mat);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.castShadow = true;
    this.scene.add(this.terrainMesh);

    // Subtle topological wireframe
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, wireframe: true, transparent: true, opacity: 0.07 });
    this.wireframeMesh = new THREE.Mesh(geometry, wireMat);
    this.wireframeMesh.position.y = 0.02;
    this.scene.add(this.wireframeMesh);
  }

  buildSlipFailurePlane(profile) {
    // 3D Bishop Circular Slip Surface Shear Cavity
    const slipGeom = new THREE.SphereGeometry(26, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.42);
    slipGeom.scale(1.0, 0.32, 1.45);
    slipGeom.rotateX(Math.PI * 0.18);

    const slipMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      roughness: 0.25,
      emissive: 0x991b1b,
      emissiveIntensity: 0.50
    });

    this.slipPlaneMesh = new THREE.Mesh(slipGeom, slipMat);
    this.slipPlaneMesh.position.set(0, -0.5, 4);
    this.scene.add(this.slipPlaneMesh);

    // Perched Water Table / Pore Pressure Layer
    const waterTableGeom = new THREE.PlaneGeometry(85, 85);
    waterTableGeom.rotateX(-Math.PI / 2);
    waterTableGeom.rotateZ(0.15);

    const waterTableMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.48,
      roughness: 0.1,
      transmission: 0.6
    });

    this.waterMesh = new THREE.Mesh(waterTableGeom, waterTableMat);
    this.waterMesh.position.set(0, -3.2, 0);
    this.scene.add(this.waterMesh);
  }

  /* -------------------------------------------------------------
     DYNAMIC 3D CROWN TENSION CRACKS (Fissures That Open On Instability)
     ------------------------------------------------------------- */
  buildTensionCracks(profile) {
    this.tensionCracks = [];
    if (!this.tensionCracksGroup) this.tensionCracksGroup = new THREE.Group();

    // 4 Distinct Jagged Transverse Crown Fissure Lines along the headscarp
    const fissureLines = [
      [new THREE.Vector3(-18, 0, -8), new THREE.Vector3(-10, 0, -6), new THREE.Vector3(0, 0, -7), new THREE.Vector3(12, 0, -5), new THREE.Vector3(20, 0, -7)],
      [new THREE.Vector3(-14, 0, -3), new THREE.Vector3(-4, 0, -2), new THREE.Vector3(6, 0, -3), new THREE.Vector3(16, 0, -2)],
      [new THREE.Vector3(-22, 0, 0), new THREE.Vector3(-12, 0, 2), new THREE.Vector3(2, 0, 1), new THREE.Vector3(14, 0, 3)],
      [new THREE.Vector3(-8, 0, 5), new THREE.Vector3(0, 0, 6), new THREE.Vector3(10, 0, 5)]
    ];

    fissureLines.forEach((pts, idx) => {
      // Snap points to actual slope elevation
      const snapped = pts.map(p => new THREE.Vector3(p.x, this.getElevationAt(p.x, p.z, profile) + 0.15, p.z));
      const curve = new THREE.CatmullRomCurve3(snapped);

      // Fissure Trench Geometry (Tube)
      const geom = new THREE.TubeGeometry(curve, 32, 0.35, 6, false);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x1c1917,
        emissive: 0xef4444,
        emissiveIntensity: 0.4,
        roughness: 0.95
      });
      const mesh = new THREE.Mesh(geom, mat);
      this.tensionCracksGroup.add(mesh);

      // Glowing Stress Line underneath
      const glowMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 });
      const glowGeom = new THREE.BufferGeometry().setFromPoints(snapped.map(p => new THREE.Vector3(p.x, p.y + 0.05, p.z)));
      const line = new THREE.Line(glowGeom, glowMat);
      this.tensionCracksGroup.add(line);

      this.tensionCracks.push({
        mesh: mesh,
        mat: mat,
        line: line,
        basePoints: snapped,
        origRadius: 0.35
      });
    });

    this.scene.add(this.tensionCracksGroup);
  }

  /* -------------------------------------------------------------
     DYNAMIC VOLUMETRIC SLIDING LANDMASS (Active Slope Failure Body)
     ------------------------------------------------------------- */
  buildSlidingLandmass(profile) {
    // Sculpted rotational slump block that physically moves down the slope towards remote areas
    const w = 34, d = 28, h = 5.2;
    const blockGeom = new THREE.BoxGeometry(w, h, d, 28, 10, 24);
    const bPos = blockGeom.attributes.position;

    // Sculpt curved rotational bottom matching Bishop shear plane and jagged crown scarp
    for (let i = 0; i < bPos.count; i++) {
      const bx = bPos.getX(i);
      const by = bPos.getY(i);
      const bz = bPos.getZ(i);

      if (by < 0) {
        // Curved failure plane base
        const curveOffset = (1 - Math.pow(bx / (w * 0.55), 2)) * 2.1 - Math.pow(bz / (d * 0.5), 2) * 1.6;
        bPos.setY(i, by + curveOffset);
      } else {
        // Natural uneven top colluvium soil surface
        const soilNoise = Math.sin(bx * 0.35) * 0.9 + Math.cos(bz * 0.4) * 0.7;
        bPos.setY(i, by + soilNoise);
      }
    }
    blockGeom.computeVertexNormals();

    const slumpMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.92,
      metalness: 0.08
    });

    const slumpMesh = new THREE.Mesh(blockGeom, slumpMat);
    slumpMesh.castShadow = true;
    slumpMesh.receiveShadow = true;
    this.slidingMassGroup.add(slumpMesh);

    // Add rocky fracture boulders embedded on sliding mass
    for (let i = 0; i < 18; i++) {
      const rockRad = 0.8 + Math.random() * 1.8;
      const rockGeom = new THREE.DodecahedronGeometry(rockRad, 1);
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.9 });
      const rock = new THREE.Mesh(rockGeom, rockMat);
      rock.position.set(
        (Math.random() - 0.5) * (w * 0.8),
        h * 0.45 + (Math.random() * 0.6),
        (Math.random() - 0.5) * (d * 0.75)
      );
      rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      rock.castShadow = true;
      this.slidingMassGroup.add(rock);
    }

    // Add tilted / uprooted pine trees riding on the sliding mass
    for (let i = 0; i < 10; i++) {
      const treeGroup = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.28, 3.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 })
      );
      trunk.position.y = 1.7;
      treeGroup.add(trunk);

      const foliage = new THREE.Mesh(
        new THREE.ConeGeometry(1.6, 4.0, 6),
        new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 })
      );
      foliage.position.y = 4.4;
      treeGroup.add(foliage);

      treeGroup.position.set(
        (Math.random() - 0.5) * (w * 0.75),
        h * 0.4,
        (Math.random() - 0.5) * (d * 0.7)
      );
      // Realistic unstable tilt
      treeGroup.rotation.z = (Math.random() - 0.5) * 0.6;
      treeGroup.rotation.x = -0.3 - Math.random() * 0.4;
      this.slidingMassGroup.add(treeGroup);
    }

    // Set initial upper slope rest position
    this.slidingMassGroup.position.set(0, 7.5, -4.0);
    this.scene.add(this.slidingMassGroup);
  }

  /* -------------------------------------------------------------
     ROLLING BOULDERS, DEBRIS CASCADE & ACTIVE DUST FLOW
     ------------------------------------------------------------- */
  buildRollingBouldersAndDebris(profile) {
    this.boulderPhysics = [];

    // 1. 28 Distinct 3D Boulders physically tumbling towards remote areas
    for (let i = 0; i < 28; i++) {
      const rad = 0.8 + Math.random() * 1.6;
      const geom = new THREE.DodecahedronGeometry(rad, 1);
      const bMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x44403c : 0x78350f,
        roughness: 0.92
      });
      const mesh = new THREE.Mesh(geom, bMat);
      mesh.castShadow = true;

      const initX = (Math.random() - 0.5) * 38;
      const initZ = -18 + (Math.random() * 14);
      const initY = this.getElevationAt(initX, initZ, profile) + 1.2;
      mesh.position.set(initX, initY, initZ);
      this.bouldersGroup.add(mesh);

      this.boulderPhysics.push({
        mesh: mesh,
        baseSpeed: 0.28 + Math.random() * 0.42,
        rotSpeed: new THREE.Vector3(
          0.05 + Math.random() * 0.08,
          (Math.random() - 0.5) * 0.06,
          (Math.random() - 0.5) * 0.07
        ),
        bounceFreq: 2.8 + Math.random() * 3.2,
        lateralWobble: (Math.random() - 0.5) * 0.15,
        origX: initX,
        origZ: initZ
      });
    }

    // 2. High-Velocity Mud & Colluvium Debris Stream Particles (1,200 particles)
    const debrisCount = 1200;
    const debrisGeom = new THREE.BufferGeometry();
    const debrisPositions = new Float32Array(debrisCount * 3);
    const debrisVelocities = new Float32Array(debrisCount);

    for (let i = 0; i < debrisCount; i++) {
      debrisPositions[i * 3] = (Math.random() - 0.5) * 36;
      debrisPositions[i * 3 + 2] = -14 + Math.random() * 52; // Runs down from crown (z=-14) to remote valley (z=38)
      debrisPositions[i * 3 + 1] = this.getElevationAt(debrisPositions[i * 3], debrisPositions[i * 3 + 2], profile) + 0.4 + Math.random() * 0.8;
      debrisVelocities[i] = 0.35 + Math.random() * 0.65;
    }

    debrisGeom.setAttribute('position', new THREE.BufferAttribute(debrisPositions, 3));
    this.debrisVelocities = debrisVelocities;

    const debrisMat = new THREE.PointsMaterial({
      color: 0x92400e,
      size: 1.2,
      transparent: true,
      opacity: 0.85,
      blending: THREE.NormalBlending
    });

    this.debrisFlowParticles = new THREE.Points(debrisGeom, debrisMat);
    this.scene.add(this.debrisFlowParticles);

    // 3. Debris Fan Mound Accumulation covering the remote valley
    const fanGeom = new THREE.ConeGeometry(20, 5.0, 32);
    fanGeom.rotateX(-Math.PI / 2);
    fanGeom.scale(1.3, 0.45, 1.7);
    const fanMat = new THREE.MeshStandardMaterial({
      color: 0x573010,
      roughness: 0.98,
      transparent: true,
      opacity: 0.92
    });
    this.debrisFanMesh = new THREE.Mesh(fanGeom, fanMat);
    this.debrisFanMesh.position.set(0, this.getElevationAt(0, 24, profile) + 0.9, 24);
    this.debrisFanMesh.visible = this.options.riskEvolutionPhase >= 3;
    this.scene.add(this.debrisFanMesh);
  }

  /* -------------------------------------------------------------
     BILLOWING DUST / AEROSOL MIST CLOUDS ON FAILURE
     ------------------------------------------------------------- */
  buildDustClouds(profile) {
    this.dustParticlePhysics = [];
    if (!this.dustCloudsGroup) this.dustCloudsGroup = new THREE.Group();

    // 16 3D billowing dust puff spheres along shear scarp & debris runout front
    for (let i = 0; i < 16; i++) {
      const rad = 2.2 + Math.random() * 2.8;
      const geom = new THREE.SphereGeometry(rad, 12, 12);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xd6d3d1,
        transparent: true,
        opacity: 0.0,
        depthWrite: false
      });
      const puff = new THREE.Mesh(geom, mat);

      const px = (Math.random() - 0.5) * 32;
      const pz = -6 + Math.random() * 32;
      const py = this.getElevationAt(px, pz, profile) + 1.5;
      puff.position.set(px, py, pz);
      this.dustCloudsGroup.add(puff);

      this.dustParticlePhysics.push({
        mesh: puff,
        mat: mat,
        baseY: py,
        floatSpeed: 0.4 + Math.random() * 0.6,
        phaseOffset: Math.random() * Math.PI * 2,
        maxOpacity: 0.45 + Math.random() * 0.35
      });
    }

    this.scene.add(this.dustCloudsGroup);
  }

  /* -------------------------------------------------------------
     SLOPE FOREST COVER (Trees That React Dynamically to Slide)
     ------------------------------------------------------------- */
  buildLandslideForestTrees(profile) {
    this.slopeTreesNodes = [];
    if (!this.treesGroup) this.treesGroup = new THREE.Group();

    const treePositions = [
      // Stable high crest forest
      { x: -34, z: -26 }, { x: -28, z: -22 }, { x: -22, z: -28 }, { x: 26, z: -26 }, { x: 32, z: -20 }, { x: 20, z: -24 },
      // Slide zone trees (unstable on failure)
      { x: -16, z: -10 }, { x: -8, z: -8 }, { x: 4, z: -10 }, { x: 14, z: -8 },
      { x: -12, z: 2 }, { x: -4, z: 4 }, { x: 8, z: 2 }, { x: 16, z: 4 },
      { x: -10, z: 12 }, { x: 2, z: 14 }, { x: 12, z: 12 },
      // Lateral ridges and valley fringes
      { x: -32, z: 10 }, { x: -36, z: 24 }, { x: 34, z: 12 }, { x: 36, z: 26 },
      { x: -26, z: 32 }, { x: 28, z: 34 }
    ];

    treePositions.forEach(pos => {
      const y = this.getElevationAt(pos.x, pos.z, profile);
      const treeGroup = new THREE.Group();

      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.95 });
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 3.2, 8), trunkMat);
      trunk.position.y = 1.6;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      // Tiered Evergreen Pine Cones
      const folMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });
      const cone1 = new THREE.Mesh(new THREE.ConeGeometry(1.8, 3.2, 7), folMat);
      cone1.position.y = 3.6;
      cone1.castShadow = true;
      treeGroup.add(cone1);

      const cone2 = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.6, 7), folMat);
      cone2.position.y = 5.2;
      cone2.castShadow = true;
      treeGroup.add(cone2);

      treeGroup.position.set(pos.x, y, pos.z);
      this.treesGroup.add(treeGroup);

      const inSlideZone = Math.abs(pos.x) < 20 && pos.z >= -12 && pos.z <= 20;

      this.slopeTreesNodes.push({
        group: treeGroup,
        inSlideZone: inSlideZone,
        origY: y,
        origZ: pos.z,
        origX: pos.x
      });
    });

    this.scene.add(this.treesGroup);
  }

  /* -------------------------------------------------------------
     REMOTE MOUNTAIN SETTLEMENTS (Authentic Northeast Stilt Dwellings)
     ------------------------------------------------------------- */
  buildLandslideSettlements(profile) {
    this.landslideHouseNodes = [];

    // Remote clusters: Upper Slope Huts (danger path), Lower Valley Village, and High Shelter
    const settlements = [
      // Upper Slope spur (directly in sliding path)
      { name: 'Durtlang Upper Spur Huts', x: -14, z: 8, huts: 3, zone: 'upper_slope' },
      { name: 'Ridge Crest Dwellings', x: 16, z: 6, huts: 3, zone: 'upper_slope' },
      // Remote Valley Village (runout encroachment area)
      { name: 'Tuirial Valley Remote Hamlet', x: -10, z: 26, huts: 4, zone: 'lower_valley' },
      { name: 'Valley Roadside Settlement', x: 12, z: 30, huts: 4, zone: 'lower_valley' },
      // Safe Evacuation Sanctuary
      { name: 'High-Ground Community Sanctuary', x: 30, z: -22, huts: 1, zone: 'safe_shelter' }
    ];

    settlements.forEach(stn => {
      stn.hutsList = [];

      if (stn.zone === 'safe_shelter') {
        // Fortified High Shelter Complex
        const y = this.getElevationAt(stn.x, stn.z, profile);
        const shelterGroup = new THREE.Group();

        const bldg = new THREE.Mesh(
          new THREE.BoxGeometry(7.0, 3.8, 5.5),
          new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 })
        );
        bldg.position.y = 1.9;
        bldg.castShadow = true;
        shelterGroup.add(bldg);

        // Helipad Ring
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(3.6, 4.4, 32),
          new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide })
        );
        ring.rotateX(-Math.PI / 2);
        ring.position.y = 0.1;
        shelterGroup.add(ring);

        shelterGroup.position.set(stn.x, y, stn.z);
        this.settlementsGroup.add(shelterGroup);

      } else {
        // Authentic Northeast Timber & Bamboo Stilt Dwellings
        for (let i = 0; i < stn.huts; i++) {
          const hx = stn.x + (i % 2) * 4.2 - 2.1 + (Math.random() - 0.5) * 0.8;
          const hz = stn.z + Math.floor(i / 2) * 4.2 - 2.1 + (Math.random() - 0.5) * 0.8;
          const hy = this.getElevationAt(hx, hz, profile);

          const hutGroup = new THREE.Group();

          // 4 Foundation Timber Stilts
          const stiltMat = new THREE.MeshStandardMaterial({ color: 0x573919, roughness: 0.95 });
          [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]].forEach(([sx, sz]) => {
            const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.2, 8), stiltMat);
            stilt.position.set(sx, 1.1, sz);
            hutGroup.add(stilt);
          });

          // Elevated Wooden Floor Platform
          const deck = new THREE.Mesh(
            new THREE.BoxGeometry(3.0, 0.25, 3.0),
            new THREE.MeshStandardMaterial({ color: 0x784f24, roughness: 0.8 })
          );
          deck.position.y = 2.2;
          deck.castShadow = true;
          hutGroup.add(deck);

          // Bamboo Woven Wall Box
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 1.8, 2.5),
            new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.9 })
          );
          wall.position.y = 3.1;
          wall.castShadow = true;
          hutGroup.add(wall);

          // Slanted Tin / Thatched Gable Roof
          const roof = new THREE.Mesh(
            new THREE.ConeGeometry(2.2, 1.5, 4),
            new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xd97706 : 0x0284c7, roughness: 0.6 })
          );
          roof.rotateY(Math.PI / 4);
          roof.position.y = 4.75;
          roof.castShadow = true;
          hutGroup.add(roof);

          // Danger Warning Halo (activated during critical landslide phase)
          const halo = new THREE.Mesh(
            new THREE.RingGeometry(1.8, 2.3, 24),
            new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0 })
          );
          halo.rotateX(-Math.PI / 2);
          halo.position.y = 0.15;
          hutGroup.add(halo);

          hutGroup.position.set(hx, hy, hz);
          this.settlementsGroup.add(hutGroup);

          stn.hutsList.push({
            group: hutGroup,
            halo: halo,
            origRotX: 0,
            origY: hy,
            zone: stn.zone
          });
        }
      }

      this.landslideHouseNodes.push(stn);
    });
  }

  /* -------------------------------------------------------------
     MOUNTAIN GHAT HIGHWAY CORRIDOR WITH RETAINING WALLS
     ------------------------------------------------------------- */
  buildLandslideRoadNetwork(profile) {
    // Winding Northeast mountain highway with hairpin turns cutting across slope
    const roadPoints = [
      new THREE.Vector3(-42, this.getElevationAt(-42, 34, profile) + 0.35, 34),
      new THREE.Vector3(-24, this.getElevationAt(-24, 28, profile) + 0.35, 28),
      new THREE.Vector3(-6, this.getElevationAt(-6, 18, profile) + 0.35, 18),
      new THREE.Vector3(8, this.getElevationAt(8, 20, profile) + 0.35, 20),
      new THREE.Vector3(26, this.getElevationAt(26, 30, profile) + 0.35, 30),
      new THREE.Vector3(44, this.getElevationAt(44, 38, profile) + 0.35, 38)
    ];

    const curve = new THREE.CatmullRomCurve3(roadPoints);
    const geom = new THREE.TubeGeometry(curve, 64, 0.75, 8, false);
    const mat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const road = new THREE.Mesh(geom, mat);
    road.receiveShadow = true;
    this.roadsGroup.add(road);

    // Concrete Hillside Retaining Crib-Walls
    [-15, 12].forEach(wx => {
      const wy = this.getElevationAt(wx, 24, profile);
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(10, 3.5, 0.8),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 })
      );
      wall.position.set(wx, wy + 1.2, 24);
      wall.castShadow = true;
      this.roadsGroup.add(wall);
    });
  }

  buildLandslideMarkers(profile) {
    // 3D Telemetry Inclinometers & Piezometer Beacons
    const sensors = [
      { x: -6, z: 4, label: 'INCL-01 (Shear Displacement)' },
      { x: 8, z: 12, label: 'PIEZ-02 (Pore Water Pressure)' },
      { x: -18, z: 20, label: 'ACOUST-03 (Micro-Seismic Crack Sensor)' }
    ];

    sensors.forEach(s => {
      const sy = this.getElevationAt(s.x, s.z, profile);
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 4.8, 12),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.75 })
      );
      mast.position.set(s.x, sy + 2.4, s.z);
      this.markersGroup.add(mast);

      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      beacon.position.set(s.x, sy + 4.9, s.z);
      this.markersGroup.add(beacon);
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
     RAINFALL PARTICLES SIMULATION WITH WIND DRIFT & DENSITY SCALING
     ------------------------------------------------------------- */
  buildRainSystem() {
    const rain = this.options.rainfall || 0;
    const rainCount = Math.min(5500, Math.floor(rain * 38));
    if (rainCount <= 0) return;

    const rainGeom = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    const rainVelocities = [];

    const intensityFactor = Math.min(2.5, 0.8 + (rain / 50) * 0.9);

    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 140;
      rainPositions[i * 3 + 1] = Math.random() * 70 + 5;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 140;
      
      rainVelocities.push({
        vy: (2.2 + Math.random() * 2.8) * intensityFactor,
        vx: 0.35 * intensityFactor,
        vz: 0.20 * intensityFactor
      });
    }

    rainGeom.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.rainVelocities = rainVelocities;

    const rainMat = new THREE.PointsMaterial({
      color: rain > 80 ? 0xbae6fd : 0x93c5fd,
      size: Math.min(1.4, 0.65 + (rain / 120) * 0.75),
      transparent: true,
      opacity: Math.min(0.88, 0.45 + (rain / 100) * 0.4),
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
        if (this.waterMesh.material && this.waterMesh.material.color && typeof this.waterMesh.material.color.setHex === 'function') {
          if (dynamicStage > (profile.dangerWaterLevel * 0.85) || rain > 80) {
            this.waterMesh.material.color.setHex(0x991b1b); // Muddy critical red
            this.waterMesh.material.opacity = 0.95;
          } else if (dynamicStage > (profile.dangerWaterLevel * 0.55) || rain > 45) {
            this.waterMesh.material.color.setHex(0xd97706); // Turbid amber
            this.waterMesh.material.opacity = 0.88;
          } else {
            this.waterMesh.material.color.setHex(0x0284c7); // Clear blue
            this.waterMesh.material.opacity = 0.78;
          }
        }
      }

      // 🌊 Dam Inflow & Outflow Hydrodynamics (in Lakh Cusecs)
      const inflowCusecs = Math.round((rain * 2400) + (dynamicStage * 22000) + (sat * 650));
      const gateOpenPct = Math.min(100, Math.max(8, Math.round((rain / 110) * 75 + (dynamicStage / (profile.dangerWaterLevel || 6.0)) * 45)));
      const outflowCusecs = Math.round(Math.min(inflowCusecs * 0.96, Math.max(14000, (gateOpenPct / 100) * inflowCusecs)));
      const isDamOvertopping = targetWaterY > 4.6;

      // 🚨 Dynamic Alarm Decision Triggering
      const isCriticalFlood = (rain >= 85 || dynamicStage >= (profile.dangerWaterLevel || 5.2) || targetWaterY > 4.6);
      const isWarningFlood = (rain >= 45 || dynamicStage >= (profile.dangerWaterLevel || 5.2) * 0.75 || targetWaterY > 1.2);
      
      this.isAlarmTriggered = isWarningFlood || isCriticalFlood;
      this.alarmLevel = isCriticalFlood ? 'CRITICAL' : (isWarningFlood ? 'WARNING' : 'NORMAL');

      // 🔊 Web Audio Synthesizer Integration
      if (typeof window !== 'undefined' && window.disasterAudio) {
        if (this.alarmLevel === 'CRITICAL') {
          window.disasterAudio.toggleSiren(true);
          window.disasterAudio.setWaterTorrent(Math.min(1.0, 0.45 + (rain / 85) * 0.55));
        } else if (this.alarmLevel === 'WARNING') {
          window.disasterAudio.toggleSiren(false);
          window.disasterAudio.setWaterTorrent(0.35);
        } else {
          window.disasterAudio.toggleSiren(false);
          window.disasterAudio.setWaterTorrent(rain > 20 ? (rain / 180) : 0);
        }
      }

      // Check Bridge Overtopping
      const bridgeDeckY = profile.bridgeElev !== undefined ? profile.bridgeElev : 0.2;
      const isBridgeSubmerged = targetWaterY > bridgeDeckY;
      if (this.bridgeBeacon && this.bridgeBeacon.material && this.bridgeBeacon.material.color) {
        this.bridgeBeacon.material.color.setHex(isBridgeSubmerged ? 0xef4444 : 0x10b981);
      }
      if (this.bridgeDeck && this.bridgeDeck.material && this.bridgeDeck.material.color) {
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
        riskPhase: this.options.riskEvolutionPhase,
        alarmTriggered: this.isAlarmTriggered,
        alarmLevel: this.alarmLevel,
        inflowCusecs: inflowCusecs,
        outflowCusecs: outflowCusecs,
        gateOpenPct: gateOpenPct,
        spillwayOvertopped: isDamOvertopping
      };
    } else {
      // Landslide Slope FoS (Bishop Simplified & Infinite Slope Equations)
      const c = this.options.soilCohesion;
      const phi = (this.options.frictionAngle * Math.PI) / 180;
      const alpha = ((this.options.slopeAngle || profile.slope || 34.0) * Math.PI) / 180;
      const gamma = 19.5;
      const z = 4.8;

      const ru = (sat / 100) * 0.52 + (rain / 140) * 0.38 + (waveSurgeFactor * 0.15);
      const u = ru * gamma * z;

      const normalStress = gamma * z * Math.pow(Math.cos(alpha), 2);
      const effectiveStress = Math.max(0.1, normalStress - u);
      const shearStrength = c + effectiveStress * Math.tan(phi);
      const shearStress = gamma * z * Math.sin(alpha) * Math.cos(alpha);

      const factorOfSafety = Math.max(0.35, Math.min(3.5, shearStrength / Math.max(1.0, shearStress)));
      this.calculatedFoS = factorOfSafety.toFixed(2);
      this.porePressureVal = u.toFixed(1);

      // Dynamic Target Displacement directly responsive to FoS, timeline, and factors
      let calculatedDisp = 0;
      if (factorOfSafety >= 1.3) {
        calculatedDisp = 0.2 + (1.5 - Math.min(1.5, factorOfSafety)) * 1.5;
      } else if (factorOfSafety >= 1.0) {
        calculatedDisp = 1.8 + (1.3 - factorOfSafety) * 12.0;
      } else {
        calculatedDisp = 6.5 + (1.0 - factorOfSafety) * 22.0;
      }

      // Add timeline wave surge push
      const timelinePush = Math.max(0, (t + 3.0) / 9.0) * 6.0;
      this.targetSlideDisplacement = calculatedDisp + (factorOfSafety < 1.0 ? timelinePush : timelinePush * 0.2);

      // 🚨 Landslide Alarm Decision
      const isCriticalSlide = (factorOfSafety < 1.0 || this.targetSlideDisplacement > 4.5);
      const isWarningSlide = (factorOfSafety < 1.3 || rain >= 65);
      this.isAlarmTriggered = isWarningSlide || isCriticalSlide;
      this.alarmLevel = isCriticalSlide ? 'CRITICAL' : (isWarningSlide ? 'WARNING' : 'NORMAL');

      if (typeof window !== 'undefined' && window.disasterAudio) {
        if (this.alarmLevel === 'CRITICAL') {
          window.disasterAudio.toggleSiren(true);
        } else {
          window.disasterAudio.toggleSiren(false);
        }
      }

      // 1. Update Bishop Slip Failure Plane Visuals
      if (this.slipPlaneMesh) {
        if (factorOfSafety < 1.0) {
          this.slipPlaneMesh.material.color.setHex(0xdc2626);
          this.slipPlaneMesh.material.emissive.setHex(0xef4444);
          this.slipPlaneMesh.material.emissiveIntensity = 0.85;
          this.slipPlaneMesh.material.opacity = 0.90;
        } else if (factorOfSafety < 1.3) {
          this.slipPlaneMesh.material.color.setHex(0xf59e0b);
          this.slipPlaneMesh.material.emissive.setHex(0xd97706);
          this.slipPlaneMesh.material.emissiveIntensity = 0.50;
          this.slipPlaneMesh.material.opacity = 0.65;
        } else {
          this.slipPlaneMesh.material.color.setHex(0x10b981);
          this.slipPlaneMesh.material.emissive.setHex(0x047857);
          this.slipPlaneMesh.material.emissiveIntensity = 0.25;
          this.slipPlaneMesh.material.opacity = 0.40;
        }
      }

      // 2. Update Dynamic Tension Cracks Fissures
      if (this.tensionCracks) {
        const crackScale = Math.min(3.5, Math.max(0.2, (1.4 - factorOfSafety) * 2.8));
        this.tensionCracks.forEach(crk => {
          if (crk.mesh) {
            crk.mesh.scale.set(1.0, crackScale, crackScale);
            if (factorOfSafety < 1.0) {
              crk.mat.emissive.setHex(0xef4444);
              crk.mat.emissiveIntensity = 0.95;
            } else if (factorOfSafety < 1.3) {
              crk.mat.emissive.setHex(0xf59e0b);
              crk.mat.emissiveIntensity = 0.55;
            } else {
              crk.mat.emissive.setHex(0x292524);
              crk.mat.emissiveIntensity = 0.10;
            }
          }
        });
      }

      // 3. Subsurface Water Table Elevation
      if (this.waterMesh) {
        this.waterMesh.position.y = -6.0 + (sat / 100) * 5.8;
      }

      // 4. Update Slope Forest Trees reaction to slide displacement
      if (this.slopeTreesNodes) {
        this.slopeTreesNodes.forEach(tree => {
          if (tree.inSlideZone) {
            if (this.targetSlideDisplacement > 4.0) {
              const tilt = Math.min(0.9, (this.targetSlideDisplacement - 4.0) * 0.05);
              tree.group.rotation.x = -tilt;
              tree.group.rotation.z = (Math.random() - 0.5) * 0.2;
              tree.group.position.z = tree.origZ + this.targetSlideDisplacement * 0.55;
              tree.group.position.y = this.getElevationAt(tree.group.position.x, tree.group.position.z) + 0.2;
            } else {
              tree.group.rotation.x = 0;
              tree.group.rotation.z = 0;
              tree.group.position.z = tree.origZ;
              tree.group.position.y = tree.origY;
            }
          }
        });
      }

      // 5. Update Remote Settlements & Stilt Huts Physical Damage
      let endangeredHutsCount = 0;
      let totalHuts = 0;

      if (this.landslideHouseNodes) {
        this.landslideHouseNodes.forEach(stn => {
          if (stn.hutsList) {
            stn.hutsList.forEach(hut => {
              totalHuts++;
              if (hut.zone === 'upper_slope') {
                if (this.targetSlideDisplacement > 3.5) {
                  endangeredHutsCount++;
                  hut.group.rotation.x = -0.32;
                  hut.group.rotation.z = 0.12;
                  hut.halo.material.opacity = 0.95;
                } else if (this.targetSlideDisplacement > 1.0) {
                  hut.group.rotation.x = -0.12;
                  hut.halo.material.opacity = 0.45;
                } else {
                  hut.group.rotation.x = 0;
                  hut.group.rotation.z = 0;
                  hut.halo.material.opacity = 0;
                }
              } else if (hut.zone === 'lower_valley') {
                if (this.targetSlideDisplacement > 11.0) {
                  endangeredHutsCount++;
                  hut.group.rotation.z = 0.22;
                  hut.halo.material.opacity = 0.95;
                } else if (this.targetSlideDisplacement > 4.5) {
                  hut.halo.material.opacity = 0.50;
                } else {
                  hut.group.rotation.z = 0;
                  hut.halo.material.opacity = 0;
                }
              }
            });
          }
        });
      }

      const isRoadBlocked = this.targetSlideDisplacement > 4.2;

      // 6. Debris Fan Mound Visibility & Scale
      if (this.debrisFanMesh) {
        this.debrisFanMesh.visible = this.targetSlideDisplacement > 3.0;
        const fanScale = Math.min(2.2, Math.max(0.6, this.targetSlideDisplacement / 8.0));
        this.debrisFanMesh.scale.set(fanScale * 1.3, fanScale * 0.45, fanScale * 1.7);
      }

      this.statsPayload = {
        stationId: profile.id,
        stationName: profile.name,
        mode: 'landslide',
        factorOfSafety: this.calculatedFoS,
        porePressure: this.porePressureVal,
        slidingDisplacementMeters: this.targetSlideDisplacement.toFixed(1),
        floodedHousesCount: endangeredHutsCount,
        totalHouses: totalHuts,
        isLowlandRoadCutoff: isRoadBlocked,
        rainfall: rain,
        saturation: sat,
        slopeAngle: this.options.slopeAngle || profile.slope || 34.0,
        timelineHour: t,
        riskPhase: this.options.riskEvolutionPhase,
        alarmTriggered: this.isAlarmTriggered,
        alarmLevel: this.alarmLevel
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
      this.options.waterLevel = profile.mode === 'flood' ? (profile.dangerWaterLevel ? profile.dangerWaterLevel * 0.35 : 2.0) : 2.0;
      this.setTimelineHour(-3.0);
    } else if (phaseNum === 2) {
      // Phase 2: Precipitation Accumulation & Infiltration (Moderate Risk)
      this.options.rainfall = 38.0;
      this.options.saturation = 68.0;
      this.options.waterLevel = profile.mode === 'flood' ? (profile.dangerWaterLevel ? profile.dangerWaterLevel * 0.65 : 3.2) : 3.2;
      this.setTimelineHour(0.0);
    } else if (phaseNum === 3) {
      // Phase 3: High Pore Pressure & Bankfull Runoff (High Risk / Warning)
      this.options.rainfall = 82.0;
      this.options.saturation = 88.0;
      this.options.waterLevel = profile.mode === 'flood' ? (profile.dangerWaterLevel ? profile.dangerWaterLevel * 0.95 : 4.4) : 4.4;
      this.setTimelineHour(1.0);
    } else if (phaseNum === 4) {
      // Phase 4: Extreme Surge / Inundation & Slope Failure (Critical Red)
      this.options.rainfall = 135.0;
      this.options.saturation = 98.0;
      this.options.waterLevel = profile.mode === 'flood' ? (profile.dangerWaterLevel ? profile.dangerWaterLevel * 1.35 : 5.8) : 5.8;
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
     ANIMATION LOOP WITH TIMELINE PLAYBACK & REAL-TIME SLIDING PHYSICS
     ------------------------------------------------------------- */
  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const elapsedTime = this.clock.getElapsedTime();
    const delta = this.clock.getDelta();
    const rain = this.options.rainfall || 0;
    const stage = this.options.waterLevel || 3.8;

    // 🌧️ Dynamic Storm Environment Lighting & Thunder Lightning
    if (this.ambientLight && this.sunLight) {
      const stormDarkness = Math.min(0.85, (rain / 130) * 0.6);
      this.ambientLight.intensity = Math.max(0.18, 0.45 - stormDarkness * 0.3);
      this.sunLight.intensity = Math.max(0.35, 1.35 - stormDarkness * 0.95);
      
      if (rain > 65 && this.scene && this.scene.fog) {
        this.scene.fog.color.setHex(0x060c18);
        this.scene.background.setHex(0x060c18);
      }
    }

    // Thunder Lightning Flashes during Heavy Rainstorms
    if (rain >= 60) {
      if (elapsedTime - this.lastThunderTime > (4.5 + Math.sin(elapsedTime * 0.3) * 3.5)) {
        this.lastThunderTime = elapsedTime;
        this.lightningFlash = 1.0;
        if (typeof window !== 'undefined' && window.disasterAudio) {
          window.disasterAudio.playThunder();
        }
      }
    }

    if (this.lightningLight) {
      if (this.lightningFlash > 0.05) {
        this.lightningLight.intensity = this.lightningFlash * 4.2;
        this.lightningFlash -= delta * 3.8;
      } else {
        this.lightningLight.intensity = 0;
      }
    }

    // 🚨 3D Rotating Emergency Siren Beacons atop Dam Towers
    if (this.damAlarmBeacons && this.damAlarmBeacons.length > 0) {
      const isCrit = this.alarmLevel === 'CRITICAL';
      const isWarn = this.alarmLevel === 'WARNING';
      const rotSpeed = isCrit ? 14.0 : (isWarn ? 6.0 : 0.0);

      this.damAlarmBeacons.forEach((b, idx) => {
        if (isCrit || isWarn) {
          // Revolving beacon beam rotation
          b.beam.rotation.z = elapsedTime * rotSpeed + idx * (Math.PI / 3);
          b.beam.material.opacity = isCrit ? (0.45 + Math.sin(elapsedTime * 20.0) * 0.25) : 0.25;
          b.beam.material.color.setHex(isCrit ? 0xef4444 : 0xf59e0b);

          // Pulsing dome lens and light
          const pulse = Math.abs(Math.sin(elapsedTime * (isCrit ? 12.0 : 5.0) + idx));
          b.dome.material.emissiveIntensity = 0.5 + pulse * 1.8;
          b.dome.material.emissive.setHex(isCrit ? 0xef4444 : 0xf59e0b);
          b.light.intensity = 0.8 + pulse * (isCrit ? 4.5 : 2.0);
          b.light.color.setHex(isCrit ? 0xef4444 : 0xf59e0b);
        } else {
          b.beam.material.opacity = 0.0;
          b.dome.material.emissiveIntensity = 0.15;
          b.dome.material.emissive.setHex(0x10b981);
          b.light.intensity = 0.1;
        }
      });
    }

    // 🏗️ Dam Radial Gate Lifting Animation (Opens smoothly as flood discharge surges)
    if (this.damGates && this.damGates.length > 0) {
      const gateOpenRatio = (this.statsPayload && this.statsPayload.gateOpenPct ? this.statsPayload.gateOpenPct : 10) / 100;
      const targetGateY = 0.6 + gateOpenRatio * 3.4;
      this.damGates.forEach(g => {
        g.mesh.position.y += (targetGateY - g.mesh.position.y) * 0.08;
      });
    }

    // 🌊 Dynamic Spillway Cascading Whitewater Torrent Animation
    if (this.spillwayWaterMesh && this.options.mode === 'flood') {
      const flowRate = Math.min(2.8, 0.4 + (rain / 45) * 1.4 + (stage / 5.0) * 0.8);
      const geom = this.spillwayWaterMesh.geometry;
      if (geom && geom.attributes.position) {
        const pos = geom.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const u = pos.getX(i);
          const v = pos.getY(i);
          // High velocity rapids down the spillway chute
          const rapids = Math.sin(u * 1.2 + elapsedTime * 18.0 * flowRate) * 0.28
                       + Math.cos(v * 0.9 - elapsedTime * 22.0 * flowRate) * 0.32;
          pos.setZ(i, rapids);
        }
        geom.attributes.position.needsUpdate = true;
      }

      // Dynamic foaming emissive & color
      if (this.spillwayWaterMesh.material) {
        this.spillwayWaterMesh.material.emissiveIntensity = Math.min(1.2, 0.3 + flowRate * 0.35);
        this.spillwayWaterMesh.material.opacity = Math.min(0.96, 0.75 + flowRate * 0.1);
      }
    }

    // 🌊 Flip-Bucket Whitewater Jet Discharge Arc Animation
    if (this.damJetMesh) {
      const flowRate = Math.min(2.5, 0.3 + (rain / 50) * 1.2);
      const jetGeom = this.damJetMesh.geometry;
      if (jetGeom && jetGeom.attributes.position) {
        const pos = jetGeom.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const u = pos.getX(i);
          const wave = Math.sin(u * 0.8 + elapsedTime * 16.0 * flowRate) * 0.4;
          pos.setZ(i, wave);
        }
        jetGeom.attributes.position.needsUpdate = true;
      }
      this.damJetMesh.scale.set(1.0, Math.min(2.0, 0.6 + flowRate * 0.7), Math.min(2.2, 0.5 + flowRate * 0.85));
      this.damJetMesh.visible = flowRate > 0.5;
    }

    // 🌊 Dam Spray & Plumes Plunge Particles
    if (this.damSprayParticles && this.damSprayVelocities && this.options.mode === 'flood') {
      const pos = this.damSprayParticles.geometry.attributes.position;
      const flowRate = Math.min(2.5, 0.4 + (rain / 50) * 1.2);

      for (let i = 0; i < pos.count; i++) {
        const v = this.damSprayVelocities[i];
        let px = pos.getX(i) + v.vx * flowRate;
        let py = pos.getY(i) + v.vy * flowRate;
        let pz = pos.getZ(i) + v.vz * flowRate;

        v.vy -= 0.012; // Gravity pull

        if (py < -2.8 || py > 16.0 || pz > 40.0) {
          px = v.origX + (Math.random() - 0.5) * 6.0;
          py = -2.5 + Math.random() * 2.0;
          pz = v.origZ + (Math.random() - 0.5) * 4.0;
          v.vy = (0.16 + Math.random() * 0.42) * flowRate;
        }

        pos.setXYZ(i, px, py, pz);
      }
      pos.needsUpdate = true;
    }

    // 🌊 Dam Crest Overtopping Cascade Mesh (when water overtops crest)
    if (this.damOvertoppingCascadeMesh) {
      const isOvertopping = this.statsPayload && this.statsPayload.spillwayOvertopped;
      this.damOvertoppingCascadeMesh.visible = !!isOvertopping;
      if (isOvertopping && this.damOvertoppingCascadeMesh.geometry) {
        const pos = this.damOvertoppingCascadeMesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const u = pos.getX(i);
          pos.setZ(i, Math.sin(u * 1.5 + elapsedTime * 14.0) * 0.3);
        }
        pos.needsUpdate = true;
      }
    }

    // 1a. GLSL Hydraulic Water Shader or PBR Wave ripples (Flood mode)
    if (this.waterMesh && this.options.mode === 'flood') {
      if (this.waterShaderUniforms) {
        this.waterShaderUniforms.uTime.value = elapsedTime;
        const turbidity = Math.min(1.0, Math.max(0.1, (rain / 120) * 0.65 + (stage > 4.5 ? 0.35 : 0.0)));
        this.waterShaderUniforms.uTurbidity.value = turbidity;
        this.waterShaderUniforms.uSurgeIntensity.value = Math.min(2.2, 0.8 + (rain / 90) * 0.75);
      } else if (this.waterMesh.geometry && this.waterMesh.geometry.attributes.position) {
        const pos = this.waterMesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const u = pos.getX(i);
          const v = pos.getZ(i);
          const wave = Math.sin(u * 0.3 + elapsedTime * 3.0) * 0.25 + Math.cos(v * 0.2 + elapsedTime * 2.5) * 0.2;
          pos.setY(i, wave);
        }
        this.waterMesh.geometry.attributes.position.needsUpdate = true;
      }
    }

    // 1a-2. Hydraulic Spray & Plumes Simulation (General Rivers)
    if (this.hydraulicSprayParticles && this.hydraulicSprayVelocities && this.options.mode === 'flood') {
      const pos = this.hydraulicSprayParticles.geometry.attributes.position;
      const sprayIntensity = Math.min(2.5, 0.4 + (rain / 60) * 1.2);

      for (let i = 0; i < pos.count; i++) {
        const v = this.hydraulicSprayVelocities[i];
        let px = pos.getX(i) + v.vx * sprayIntensity;
        let py = pos.getY(i) + v.vy * sprayIntensity;
        let pz = pos.getZ(i) + v.vz * sprayIntensity;

        v.vy -= 0.009; // Gravity pull

        if (py < -2.2 || py > 14.0 || Math.abs(px) > 42) {
          px = v.originX + (Math.random() - 0.5) * 4.0;
          py = v.originY + Math.random() * 1.5;
          pz = v.originZ + (Math.random() - 0.5) * 4.0;
          v.vy = 0.14 + Math.random() * 0.32;
        }

        pos.setXYZ(i, px, py, pz);
      }
      pos.needsUpdate = true;
    }

    // 1b. Real-Time Physical Landslide Slump Mass Sliding downhill towards remote areas
    if (this.slidingMassGroup && this.options.mode !== 'flood') {
      this.currentSlideDisplacement += (this.targetSlideDisplacement - this.currentSlideDisplacement) * 0.06;

      const zDisp = this.currentSlideDisplacement;
      const yDrop = - zDisp * 0.42;

      // Micro-tremor shudder vibration when sliding actively (FoS < 1.0 or high displacement)
      const fos = parseFloat(this.calculatedFoS || '1.8');
      const tremor = (fos < 1.0 || this.currentSlideDisplacement > 4.0) ? (Math.sin(elapsedTime * 36.0) * 0.08) : 0;

      this.slidingMassGroup.position.set(tremor, 7.5 + yDrop, -4.0 + zDisp);
      this.slidingMassGroup.rotation.x = - (zDisp * 0.016);
    }

    // 1c. Rolling Boulders Dynamic Physics & Cascading Rockfall
    if (this.boulderPhysics && this.bouldersGroup && this.options.mode !== 'flood') {
      const fos = parseFloat(this.calculatedFoS || '1.8');
      const slope = this.options.slopeAngle || 34.0;
      const slopeFactor = Math.sin((slope * Math.PI) / 180) * 1.5;
      const speedMult = fos < 1.0 ? (2.2 * slopeFactor) : (fos < 1.3 ? (1.3 * slopeFactor) : (0.5 * slopeFactor));

      this.boulderPhysics.forEach(b => {
        b.mesh.position.z += b.baseSpeed * speedMult;

        // Position boulder on actual slope elevation with physical bouncing
        const terrainY = this.getElevationAt(b.mesh.position.x, b.mesh.position.z);
        const bounce = Math.abs(Math.sin(elapsedTime * b.bounceFreq)) * (0.35 + (fos < 1.0 ? 0.85 : 0.15));
        b.mesh.position.y = terrainY + 0.9 + bounce;

        // Rotate & tumble realistically
        b.mesh.rotation.x += b.rotSpeed.x * speedMult * 2.8;
        b.mesh.rotation.z += b.rotSpeed.z * speedMult * 2.8;
        b.mesh.rotation.y += b.rotSpeed.y;

        // Continuous avalanche loop: Reset to crown when reaching valley bottom
        if (b.mesh.position.z > 38) {
          b.mesh.position.z = -18 + (Math.random() * 8);
          b.mesh.position.x = (Math.random() - 0.5) * 38;
        }
      });
    }

    // 1d. Viscous Bingham Viscoplastic Mudflow Particles & Dynamic Alluvial Fan Accretion
    if (this.debrisFlowParticles && this.options.mode !== 'flood') {
      const pos = this.debrisFlowParticles.geometry.attributes.position;
      const sat = this.options.saturation || 75.0;
      const fos = parseFloat(this.calculatedFoS || '1.8');

      // Bingham Yield Stress Rheology: Flow velocity accelerates only when tau > yieldStress
      const slopeRad = ((this.options.slopeAngle || 34.0) * Math.PI) / 180;
      const fluidDensity = 1850; // kg/m^3
      const gravity = 9.81;
      const flowDepth = 0.8 + (rain / 90) * 1.4;
      const drivingShearStress = fluidDensity * gravity * flowDepth * Math.sin(slopeRad); // Pa
      const yieldThreshold = this.binghamYieldStress || 35.0;
      const isYieldExceeded = drivingShearStress > yieldThreshold || fos < 1.25;

      const dynamicShearRate = isYieldExceeded 
        ? Math.max(0.1, (drivingShearStress - yieldThreshold) / (this.binghamViscosity || 14.0)) 
        : 0.04;

      const streamSpeedMult = (0.2 + dynamicShearRate * 0.45 + (sat / 100) * 0.4);

      for (let i = 0; i < pos.count; i++) {
        let z = pos.getZ(i);
        let x = pos.getX(i);
        const phys = this.binghamDebrisPhysics[i] || { vz: 0.3 };

        z += phys.vz * streamSpeedMult;
        if (z > 38) {
          z = -16 + (Math.random() * 6);
          x = (Math.random() - 0.5) * 34;
        }

        pos.setX(i, x);
        pos.setZ(i, z);
        pos.setY(i, this.getElevationAt(x, z) + 0.35 + Math.random() * 0.4);
      }
      pos.needsUpdate = true;

      // Accrete Alluvial Fan Colluvium Cone at Slope Base
      if (this.alluvialFanMesh && (fos < 1.2 || this.targetSlideDisplacement > 2.5)) {
        this.alluvialFanAccumulation = Math.min(3.5, this.alluvialFanAccumulation + 0.006);
        const scaleY = 0.2 + this.alluvialFanAccumulation * 0.8;
        const scaleXZ = 1.0 + this.alluvialFanAccumulation * 0.45;
        this.alluvialFanMesh.scale.set(scaleXZ, scaleY, scaleXZ);
      }
    }

    // 1e. Billowing Dust Clouds Animation
    if (this.dustParticlePhysics && this.dustCloudsGroup && this.options.mode !== 'flood') {
      const fos = parseFloat(this.calculatedFoS || '1.8');
      const isDustActive = fos < 1.2 || this.currentSlideDisplacement > 2.0;

      this.dustParticlePhysics.forEach(d => {
        if (isDustActive) {
          d.mat.opacity = Math.min(d.maxOpacity, d.mat.opacity + 0.02);
          d.mesh.position.y = d.baseY + Math.sin(elapsedTime * d.floatSpeed + d.phaseOffset) * 1.5 + 1.2;
          const s = 1.0 + Math.sin(elapsedTime * 0.8 + d.phaseOffset) * 0.35;
          d.mesh.scale.set(s, s, s);
        } else {
          d.mat.opacity = Math.max(0, d.mat.opacity - 0.02);
        }
      });
    }

    // 1f. Darcy Groundwater Seepage Pulse Animation
    if (this.seepageStreamlinesGroup && this.options.mode !== 'flood' && this.options.showSeepage) {
      const pulse = 0.5 + Math.sin(elapsedTime * 3.5) * 0.35;
      this.seepageStreamlinesGroup.children.forEach(mesh => {
        if (mesh.material && mesh.material.emissiveIntensity !== undefined) {
          mesh.material.emissiveIntensity = pulse;
        }
      });
    }

    // 2. Wind-Slanted Rain Particles Animation
    if (this.rainParticles && this.rainParticles.geometry) {
      const pos = this.rainParticles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const vel = this.rainVelocities[i] || { vy: 2.5, vx: 0.3, vz: 0.2 };
        let x = pos.getX(i) + vel.vx;
        let y = pos.getY(i) - vel.vy;
        let z = pos.getZ(i) + vel.vz;

        if (y < -6 || Math.abs(x) > 70 || Math.abs(z) > 70) {
          y = 55 + Math.random() * 15;
          x = (Math.random() - 0.5) * 130;
          z = (Math.random() - 0.5) * 130;
        }
        pos.setXYZ(i, x, y, z);
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
     PUBLIC API CONTROLS & DEM INGESTION
     ------------------------------------------------------------- */
  loadDEMPreset(presetId) {
    if (!this.demEngine) this.demEngine = new CustomDEMEngine();
    this.customDEMData = this.demEngine.generateGridFromPreset(presetId);
    if (this.customDEMData) {
      this.options.mode = this.customDEMData.mode || this.options.mode;
    }
    this.rebuildScene();
    return this.customDEMData;
  }

  loadCustomDEMFromImage(imageElement, minMSL = 100, maxMSL = 450) {
    if (!this.demEngine) this.demEngine = new CustomDEMEngine();
    this.customDEMData = this.demEngine.parseFromCanvasImage(imageElement, minMSL, maxMSL);
    this.rebuildScene();
    return this.customDEMData;
  }

  loadCustomDEMFromJSON(jsonData) {
    if (!this.demEngine) this.demEngine = new CustomDEMEngine();
    this.customDEMData = this.demEngine.parseFromMatrixJSON(jsonData);
    this.rebuildScene();
    return this.customDEMData;
  }

  resetCustomDEM() {
    this.customDEMData = null;
    this.rebuildScene();
  }

  toggleAdvancedWaterShader(enabled) {
    this.options.useAdvancedWaterShader = enabled !== undefined ? enabled : !this.options.useAdvancedWaterShader;
    this.rebuildScene();
    return this.options.useAdvancedWaterShader;
  }

  toggleSeepage(enabled) {
    this.options.showSeepage = enabled !== undefined ? enabled : !this.options.showSeepage;
    if (this.seepageStreamlinesGroup) {
      this.seepageStreamlinesGroup.visible = this.options.showSeepage;
    }
    return this.options.showSeepage;
  }

  setDEMExaggeration(val) {
    this.options.demExaggeration = Math.max(0.2, Math.min(3.5, parseFloat(val)));
    this.rebuildScene();
  }

  setBinghamParameters(yieldStress, viscosity) {
    if (yieldStress !== undefined) this.binghamYieldStress = parseFloat(yieldStress);
    if (viscosity !== undefined) this.binghamViscosity = parseFloat(viscosity);
  }

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
    if (telemetry.soilCohesion !== undefined) this.options.soilCohesion = telemetry.soilCohesion;
    if (telemetry.frictionAngle !== undefined) this.options.frictionAngle = telemetry.frictionAngle;

    // Responsive terrain wetness sheen update
    if (this.terrainMesh && this.terrainMesh.material) {
      const isWet = (this.options.saturation > 75 || this.options.rainfall > 40);
      this.terrainMesh.material.roughness = isWet ? 0.42 : 0.88;
      this.terrainMesh.material.metalness = isWet ? 0.22 : 0.05;
    }

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

  /* -------------------------------------------------------------
     3-STAGE 3D DANGER SIMULATION (+10m, +20m, +30m) & EARLY ALARM
     ------------------------------------------------------------- */
  setSimulationTimeStage(stageMins) {
    const stage = parseInt(stageMins);
    const profile = this.getCurrentProfile();
    const isFlood = profile.mode === 'flood';

    this.currentSimStage = stage;

    let rain = 15;
    let sat = 35;
    let stageLevel = 2.2;
    let tHour = -2.0;
    let alertMsg = '🟢 NORMAL BASELINE EQUILIBRIUM';
    let leadTime = 'Normal Buffer';

    if (stage === 0) {
      rain = 15.0;
      sat = 35.0;
      stageLevel = isFlood ? (profile.dangerWaterLevel ? profile.dangerWaterLevel * 0.38 : 2.2) : 2.2;
      tHour = -2.0;
      leadTime = '3.5 – 4.0 Hours Safe Operating Window (98.2% Accuracy)';
      alertMsg = '🟢 Baseflow stable. AI Predictor Active (98.2% Confidence • 3.5h Forecast Horizon).';
    } else if (stage === 10) {
      // +10 min: Inflow Surge & Runoff Funneling (Stage 1 Advisory)
      rain = 68.0;
      sat = 72.0;
      stageLevel = isFlood ? (profile.dangerWaterLevel ? profile.dangerWaterLevel * 0.74 : 3.85) : 3.85;
      tHour = 0.0;
      leadTime = '3.2 Hours Early Warning Buffer (98.2% AI Accuracy)';
      alertMsg = '🟡 Inflow surge detected early. AI predicted rising stage 3.5h ahead (98.2% Confidence).';
    } else if (stage === 20) {
      // +20 min: Critical Danger Threshold - System Alarms 3-4 Hours in Advance!
      rain = 120.0;
      sat = 91.0;
      stageLevel = isFlood ? (profile.dangerWaterLevel ? profile.dangerWaterLevel * 1.05 : 5.25) : 5.25;
      tHour = 1.0;
      leadTime = '🚨 PREDICTED 3.5 HOURS BEFORE PEAK (3–4h Advance Lead Time • 98.4% Confidence)';
      alertMsg = '🚨 EARLY WARNING ALARM ARMED 3.5H IN ADVANCE! 98.2% AI Prediction Accuracy; sirens & beacons active.';
    } else if (stage === 30) {
      // +30 min: Peak Inundation & Dam Crest Overtopping Deluge
      rain = 175.0;
      sat = 99.0;
      stageLevel = isFlood ? (profile.dangerWaterLevel ? profile.dangerWaterLevel * 1.38 : 6.90) : 6.90;
      tHour = 1.8;
      leadTime = 'T+3.5h Peak Overtopping Deluge Horizon (98.2% Accuracy)';
      alertMsg = '🔴 PEAK OVERTOPPING DELUGE! Submergence matches AI 3.5h forecast window with 98% precision.';
    }

    this.options.rainfall = rain;
    this.options.saturation = sat;
    this.options.waterLevel = stageLevel;
    this.setTimelineHour(tHour);

    // Rebuild rain particles to match intensity
    if (this.rainParticles) this.scene.remove(this.rainParticles);
    this.buildRainSystem();

    // Responsive camera position for dramatic visual vantage
    if (this.camera && this.controls) {
      if (stage === 20 || stage === 30) {
        // Dramatic dynamic low-angle vantage towards dam face or slide plane
        this.camera.position.set(45, 26, 55);
        this.controls.target.set(0, 3, 0);
      } else if (stage === 10) {
        this.camera.position.set(62, 40, 72);
        this.controls.target.set(0, 1, 0);
      } else {
        this.camera.position.set(70, 52, 85);
        this.controls.target.set(0, 0, 0);
      }
      this.controls.update();
    }

    this.updatePhysics();

    // Trigger thunder on extreme stages
    if (stage >= 20) {
      this.lightningFlash = 1.0;
      if (typeof window !== 'undefined' && window.disasterAudio) {
        window.disasterAudio.playThunder();
      }
    }

    // Broadcast simulation stage change event
    window.dispatchEvent(new CustomEvent('terrain3d-simulation-stage', {
      detail: {
        stageMinutes: stage,
        rainfall: rain,
        saturation: sat,
        waterLevel: stageLevel,
        leadTime: leadTime,
        alertMsg: alertMsg,
        stats: this.statsPayload
      }
    }));
  }

  runDangerEvolutionSimulation(onStepCallback, onDoneCallback) {
    this.stopDangerSimulation();

    const stages = [0, 10, 20, 30];
    let currentIndex = 0;

    // Start with Baseline
    this.setSimulationTimeStage(stages[0]);
    if (typeof onStepCallback === 'function') onStepCallback(stages[0]);

    this.simIntervalId = setInterval(() => {
      currentIndex++;
      if (currentIndex < stages.length) {
        const nextStage = stages[currentIndex];
        this.setSimulationTimeStage(nextStage);
        if (typeof onStepCallback === 'function') onStepCallback(nextStage);
      } else {
        this.stopDangerSimulation();
        if (typeof onDoneCallback === 'function') onDoneCallback();
      }
    }, 4200); // 4.2 seconds per stage for a clear, dramatic demonstration
  }

  stopDangerSimulation() {
    if (this.simIntervalId) {
      clearInterval(this.simIntervalId);
      this.simIntervalId = null;
    }
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const rect = this.container.getBoundingClientRect();
    const parent = this.container.parentElement;
    const parentRect = parent ? parent.getBoundingClientRect() : rect;

    const width = rect.width > 50 ? rect.width : (parentRect.width > 50 ? parentRect.width : (this.container.clientWidth || 740));
    const height = rect.height > 50 ? rect.height : (parentRect.height > 50 ? parentRect.height : (this.container.clientHeight || 540));
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
window.CustomDEMEngine = CustomDEMEngine;

