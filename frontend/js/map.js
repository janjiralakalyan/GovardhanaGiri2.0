/**
 * GovardhanaGiri 2.0: Interactive Geospatial GIS Map Engine (Leaflet)
 * Accurately marks all 10 Telangana hotspots across districts:
 * - Adilabad, Kumuram Bheem Asifabad, Nirmal, Mulugu, Bhadradri Kothagudem, Khammam, Nagarkurnool, Hyderabad
 * Features: Watermark-free basemaps, permanent station badges, danger buffer zones, and safe shelters.
 */

class FloodMapEngine {
  constructor(mapContainerId, onStationSelectCallback) {
    this.containerId = mapContainerId;
    this.onStationSelect = onStationSelectCallback;
    this.map = null;
    this.markers = {};
    this.stations = [];
    this.bufferGroup = null;
    this.shelterLayerGroup = null;
    this.activeFilter = 'ALL';
    this.baseLayers = {};
    this.currentBaseLayerKey = 'dark';
    this.showShelters = false;
  }

  init() {
    // 1. Watermark-Free Base Tile Layers
    this.baseLayers = {
      'dark': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        className: 'dark-tiles',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }),
      'topo': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Map: &copy; OpenStreetMap, SRTM | Style: &copy; OpenTopoMap'
      }),
      'satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics'
      }),
      'streets': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      })
    };

    // 2. Initialize Leaflet Map centered on Telangana state geographic centroid (17.8° N, 79.5° E)
    this.map = L.map(this.containerId, {
      zoomControl: true,
      attributionControl: true
    }).setView([17.9, 79.5], 7.5);

    // Default: Dark Mode
    this.baseLayers['dark'].addTo(this.map);

    // Groups for Shelters & Inundation Danger Buffers
    this.bufferGroup = L.layerGroup().addTo(this.map);
    this.shelterLayerGroup = L.layerGroup().addTo(this.map);
  }

  switchBaseLayer(layerKey) {
    if (!this.baseLayers[layerKey] || layerKey === this.currentBaseLayerKey) return;
    this.map.removeLayer(this.baseLayers[this.currentBaseLayerKey]);
    this.baseLayers[layerKey].addTo(this.map);
    this.currentBaseLayerKey = layerKey;
    console.log(`[MapEngine] Basemap switched to: ${layerKey}`);
  }

  getMarkerHtml(stn, riskLevel, isSelected = false) {
    const colorMap = {
      'Low': '#10b981',
      'Moderate': '#f59e0b',
      'High': '#f97316',
      'Critical': '#ef4444'
    };
    const col = colorMap[riskLevel] || '#38bdf8';
    const isCritical = riskLevel === 'Critical';

    // Short display name for map badge
    const shortName = stn.village_area.split('/')[0].split('(')[0].trim();

    return `
      <div class="custom-geo-marker ${isSelected ? 'marker-selected' : ''}" style="position:relative; display:flex; flex-direction:column; align-items:center; cursor:pointer;">
        <!-- Pulsing Warning Aura -->
        <div style="position:absolute; top:4px; width:${isCritical ? '44px' : '28px'}; height:${isCritical ? '44px' : '28px'}; border-radius:50%; background:${col}; opacity:0.35; animation: pulse ${isCritical ? '0.9s' : '1.6s'} infinite ease-in-out;"></div>
        <!-- Core Node Pin -->
        <div style="width:16px; height:16px; border-radius:50%; background:${col}; border:2.5px solid #ffffff; box-shadow:0 0 16px ${col}; z-index:2;"></div>
        <!-- Permanent Location Pill Badge -->
        <div class="map-station-badge" style="margin-top:4px; white-space:nowrap; background:rgba(10,15,30,0.88); backdrop-filter:blur(8px); border:1px solid ${col}; color:#ffffff; padding:2px 8px; border-radius:12px; font-size:10.5px; font-weight:700; font-family:'Inter',sans-serif; box-shadow:0 4px 12px rgba(0,0,0,0.6); pointer-events:none; z-index:3;">
          <span style="color:${col}; margin-right:3px;">●</span>${shortName}
        </div>
      </div>
    `;
  }

  renderStations(stations, selectedStationId) {
    this.stations = stations;

    // Clear old markers & buffers
    Object.values(this.markers).forEach(m => this.map.removeLayer(m));
    this.bufferGroup.clearLayers();
    this.markers = {};

    stations.forEach(stn => {
      const risk = stn.prediction ? stn.prediction.risk_level : 'Low';

      // Check Filter
      if (this.activeFilter !== 'ALL' && risk !== this.activeFilter) {
        return;
      }

      const isSelected = stn.id === selectedStationId;
      const isCritical = risk === 'Critical';

      // Danger Buffer Zone Circle (Inundation Perimeter)
      const bufferRadiusMeters = isCritical ? 3500 : (risk === 'High' ? 2200 : 1200);
      const bufferColor = isCritical ? '#ef4444' : (risk === 'High' ? '#f97316' : (risk === 'Moderate' ? '#f59e0b' : '#10b981'));

      const bufferCircle = L.circle([stn.lat, stn.lon], {
        radius: bufferRadiusMeters,
        color: bufferColor,
        weight: isSelected ? 2.5 : 1,
        opacity: isSelected ? 0.9 : 0.45,
        fillColor: bufferColor,
        fillOpacity: isCritical ? 0.22 : 0.08,
        dashArray: isCritical ? '4, 4' : null
      });
      this.bufferGroup.addLayer(bufferCircle);

      // Custom Marker with permanent label
      const icon = L.divIcon({
        className: 'flood-leaflet-icon',
        html: this.getMarkerHtml(stn, risk, isSelected),
        iconSize: [40, 48],
        iconAnchor: [20, 8]
      });

      const marker = L.marker([stn.lat, stn.lon], { icon }).addTo(this.map);

      // Detailed Interactive Popup
      const popupHtml = `
        <div style="font-family:'Inter',sans-serif; min-width:220px; color:#f8fafc; padding:4px;">
          <div style="font-weight:700; font-size:14px; color:#38bdf8; margin-bottom:2px;">${stn.village_area}</div>
          <div style="font-size:11px; color:#94a3b8;">${stn.mandal} Mandal, ${stn.district}</div>
          <div style="margin:8px 0; padding:6px 10px; border-radius:6px; background:rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; font-weight:600;">Status:</span>
            <span style="font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px; background:${bufferColor}; color:#fff;">${risk}</span>
          </div>
          <div style="font-size:11.5px; color:#e2e8f0;">🌊 River: <strong>${stn.river_name}</strong></div>
          <div style="font-size:11.5px; margin-top:3px; color:#38bdf8;">Stage: <strong>${stn.telemetry.Water_Level} m</strong> / Danger: <strong>${stn.danger_water_level} m</strong></div>
          <div style="font-size:10px; color:#64748b; margin-top:5px;">Coordinates: ${stn.lat.toFixed(4)}°N, ${stn.lon.toFixed(4)}°E | Elev: ${stn.elevation}m</div>
        </div>
      `;
      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        if (this.onStationSelect) {
          this.onStationSelect(stn.id, true);
        }
      });

      this.markers[stn.id] = marker;
    });
  }

  renderShelters(shelters, baseLat, baseLon) {
    this.shelterLayerGroup.clearLayers();
    if (!shelters || !this.showShelters) return;

    shelters.forEach((sh, idx) => {
      const dLat = (idx === 0 ? 0.018 : (idx === 1 ? -0.015 : 0.022));
      const dLon = (idx === 0 ? 0.014 : (idx === 1 ? 0.018 : -0.019));
      const shLat = baseLat + dLat;
      const shLon = baseLon + dLon;

      const shelterIcon = L.divIcon({
        className: 'shelter-icon',
        html: `
          <div style="width:26px; height:26px; border-radius:8px; background:#0284c7; border:2px solid #ffffff; display:flex; align-items:center; justify-content:center; box-shadow:0 0 12px rgba(2,132,199,0.8); font-size:13px;">
            🏠
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const sMarker = L.marker([shLat, shLon], { icon: shelterIcon });
      sMarker.bindPopup(`
        <div style="font-family:'Inter',sans-serif; color:#f8fafc; font-size:12px; min-width:180px;">
          <div style="font-weight:700; color:#38bdf8; font-size:13px;">${sh.name}</div>
          <div style="color:#cbd5e1; font-size:11px;">${sh.type}</div>
          <div style="margin-top:6px; font-size:11px; color:#94a3b8;">
            Capacity: <strong>${sh.capacity} people</strong><br>
            Elevation: <strong>+${sh.elevation_m}m</strong> | Dist: <strong>${sh.distance_km} km</strong>
          </div>
          <div style="font-size:11px; color:#34d399; margin-top:4px;">📞 ${sh.contact}</div>
        </div>
      `);
      this.shelterLayerGroup.addLayer(sMarker);
    });
  }

  toggleShelters(force) {
    this.showShelters = force !== undefined ? force : !this.showShelters;
    const curr = this.stations.find(s => s.id === this.selectedStationId);
    if (curr) {
      this.renderShelters(curr.shelters, curr.lat, curr.lon);
    }
  }

  fitAllStations() {
    if (!this.stations || this.stations.length === 0) return;
    const latLngs = this.stations.map(s => [s.lat, s.lon]);
    this.map.fitBounds(latLngs, {
      padding: [45, 45],
      maxZoom: 8.5
    });
    console.log("[MapEngine] View reset to all 10 Telangana stations.");
  }

  flyToStation(lat, lon, zoom = 11) {
    if (this.map) {
      this.map.flyTo([lat, lon], zoom, {
        duration: 1.2
      });
    }
  }

  setFilter(filterTier) {
    this.activeFilter = filterTier;
  }
}

window.FloodMapEngine = FloodMapEngine;
