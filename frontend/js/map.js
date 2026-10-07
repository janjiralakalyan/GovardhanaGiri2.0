/**
 * GovardhanaGiri 2.0: Interactive Geospatial GIS Map Engine (Leaflet)
 * Renders Telangana hotspots, multi-source basemaps (Dark Ops, Topo Contours, Satellite),
 * danger perimeter buffers, and emergency relief shelters.
 */

class FloodMapEngine {
  constructor(mapContainerId, onStationSelectCallback) {
    this.containerId = mapContainerId;
    this.onStationSelect = onStationSelectCallback;
    this.map = null;
    this.markers = {};
    this.bufferLayers = {};
    this.shelterLayerGroup = null;
    this.activeFilter = 'ALL';
    this.baseLayers = {};
    this.currentBaseLayerKey = 'dark';
  }

  init() {
    // 1. Define Free Base Tile Layers (100% Free, Zero API Keys)
    this.baseLayers = {
      'dark': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap, &copy; CARTO'
      }),
      'topo': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Map: &copy; OpenStreetMap, SRTM | Style: &copy; OpenTopoMap'
      }),
      'satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics'
      }),
      'streets': L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap, &copy; CARTO'
      })
    };

    // 2. Initialize Leaflet Map centered on Telangana (18.1° N, 79.5° E)
    this.map = L.map(this.containerId, {
      zoomControl: true,
      attributionControl: true
    }).setView([18.25, 79.6], 7);

    // Set Default Base Layer (Dark Ops)
    this.baseLayers['dark'].addTo(this.map);

    // Layers for Shelters and Danger Buffers
    this.shelterLayerGroup = L.layerGroup().addTo(this.map);
    this.bufferGroup = L.layerGroup().addTo(this.map);
  }

  switchBaseLayer(layerKey) {
    if (!this.baseLayers[layerKey] || layerKey === this.currentBaseLayerKey) return;
    
    // Remove previous layer
    this.map.removeLayer(this.baseLayers[this.currentBaseLayerKey]);
    
    // Add new layer
    this.baseLayers[layerKey].addTo(this.map);
    this.currentBaseLayerKey = layerKey;
    console.log(`[MapEngine] Basemap switched to: ${layerKey}`);
  }

  getMarkerHtml(riskLevel, isSelected = false) {
    const colorMap = {
      'Low': '#10b981',
      'Moderate': '#f59e0b',
      'High': '#f97316',
      'Critical': '#ef4444'
    };
    const col = colorMap[riskLevel] || '#38bdf8';
    const isCritical = riskLevel === 'Critical';

    return `
      <div class="custom-geo-marker ${isSelected ? 'marker-selected' : ''}" style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
        <div style="position:absolute; width:${isCritical ? '42px' : '30px'}; height:${isCritical ? '42px' : '30px'}; border-radius:50%; background:${col}; opacity:0.35; animation: pulse ${isCritical ? '1.0s' : '1.6s'} infinite ease-in-out;"></div>
        <div style="width:16px; height:16px; border-radius:50%; background:${col}; border:2.5px solid #ffffff; box-shadow:0 0 16px ${col};"></div>
      </div>
    `;
  }

  renderStations(stations, selectedStationId) {
    // Clear old markers & buffers
    Object.values(this.markers).forEach(m => this.map.removeLayer(m));
    this.bufferGroup.clearLayers();
    this.markers = {};

    stations.forEach(stn => {
      const risk = stn.prediction ? stn.prediction.risk_level : 'Low';

      // Apply Filter
      if (this.activeFilter !== 'ALL' && risk !== this.activeFilter) {
        return;
      }

      const isSelected = stn.id === selectedStationId;
      const isCritical = risk === 'Critical';

      // Create Danger Buffer Circle (Inundation Perimeter)
      const bufferRadiusMeters = isCritical ? 3500 : (risk === 'High' ? 2200 : 1200);
      const bufferColor = isCritical ? '#ef4444' : (risk === 'High' ? '#f97316' : (risk === 'Moderate' ? '#f59e0b' : '#10b981'));

      const bufferCircle = L.circle([stn.lat, stn.lon], {
        radius: bufferRadiusMeters,
        color: bufferColor,
        weight: isSelected ? 2 : 1,
        opacity: isSelected ? 0.8 : 0.4,
        fillColor: bufferColor,
        fillOpacity: isCritical ? 0.22 : 0.08,
        dashArray: isCritical ? '4, 4' : null
      });
      this.bufferGroup.addLayer(bufferCircle);

      // Create Custom SVG Radar Marker
      const icon = L.divIcon({
        className: 'flood-leaflet-icon',
        html: this.getMarkerHtml(risk, isSelected),
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const marker = L.marker([stn.lat, stn.lon], { icon }).addTo(this.map);

      // Interactive Popup
      const popupHtml = `
        <div style="font-family:'Inter',sans-serif; min-width:210px; color:#f8fafc; padding:2px;">
          <div style="font-weight:700; font-size:14px; margin-bottom:2px; color:#38bdf8;">${stn.village_area}</div>
          <div style="font-size:11px; color:#94a3b8;">${stn.mandal}, ${stn.district}</div>
          <div style="margin:8px 0; padding:6px 8px; border-radius:6px; background:rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; font-weight:600;">Status:</span>
            <span style="font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px; background:${bufferColor}; color:#fff;">${risk}</span>
          </div>
          <div style="font-size:11px; color:#e2e8f0;">🌊 River: <strong>${stn.river_name}</strong></div>
          <div style="font-size:11px; margin-top:2px; color:#38bdf8;">Stage: <strong>${stn.telemetry.Water_Level} m</strong> (Danger: ${stn.danger_water_level} m)</div>
          <div style="font-size:10px; color:#64748b; margin-top:4px;">Elev: ${stn.elevation}m | Slope: ${stn.slope}°</div>
        </div>
      `;
      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        if (this.onStationSelect) {
          this.onStationSelect(stn.id);
        }
      });

      this.markers[stn.id] = marker;
    });
  }

  renderShelters(shelters, baseLat, baseLon) {
    this.shelterLayerGroup.clearLayers();
    if (!shelters) return;

    shelters.forEach((sh, idx) => {
      // Spatial offsets for multiple shelter pins around station
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
