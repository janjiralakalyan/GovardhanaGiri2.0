/**
 * NE-LENS: Northeast India Landslide GIS Map Engine
 * Leaflet-powered operational map with all detected districts, risk polygons,
 * 2.5km hazard buffers, historical events, road corridors, and 1-click 3D DEM visualization.
 */

class NeLensMapEngine {
  constructor(containerId, onLocationSelected) {
    this.containerId = containerId;
    this.onLocationSelected = onLocationSelected;
    this.map = null;
    this.locations = [];

    // Layer groups for toggle control
    this.layers = {
      districtPins: null,
      riskZones: null,
      previousLandslides: null,
      villages: null,
      roads: null,
      rivers: null,
      sensors: null
    };

    this.activeLocationId = null;
    this.bufferCircle = null;
    this.districtMarkers = {};
  }

  init(initialLat = 24.8, initialLon = 93.0, initialZoom = 7.5) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    this.map = L.map(this.containerId, {
      zoomControl: true,
      attributionControl: false
    }).setView([initialLat, initialLon], initialZoom);

    // High-contrast Dark Matter Basemap using OSM with CSS filter
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      className: 'dark-tiles',
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Initialize layer groups
    this.layers.districtPins = L.layerGroup().addTo(this.map);
    this.layers.riskZones = L.layerGroup().addTo(this.map);
    this.layers.previousLandslides = L.layerGroup().addTo(this.map);
    this.layers.villages = L.layerGroup().addTo(this.map);
    this.layers.roads = L.layerGroup().addTo(this.map);
    this.layers.rivers = L.layerGroup().addTo(this.map);
    this.layers.sensors = L.layerGroup().addTo(this.map);

    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 200);
  }

  renderAllLocations(locations, activeLocId) {
    this.locations = locations;
    this.layers.districtPins.clearLayers();
    this.districtMarkers = {};

    locations.forEach(loc => {
      const isSelected = loc.id === activeLocId;
      const isCritical = loc.risk_level === "CRITICAL";
      const riskCol = isCritical ? "#dc2626" : (loc.risk_level === "HIGH" ? "#ea580c" : (loc.risk_level === "MODERATE" ? "#ca8a04" : "#16a34a"));

      const markerHtml = `
        <div class="nelens-map-marker ${isSelected ? 'selected' : ''}" style="position:relative; display:flex; flex-direction:column; align-items:center; cursor:pointer;">
          <div style="position:absolute; top:2px; width:${isCritical ? '42px' : '30px'}; height:${isCritical ? '42px' : '30px'}; border-radius:50%; background:${riskCol}; opacity:0.35; animation: pulse ${isCritical ? '0.9s' : '1.6s'} infinite ease-in-out;"></div>
          <div style="width:18px; height:18px; border-radius:50%; background:${riskCol}; border:2.5px solid #ffffff; box-shadow:0 0 14px ${riskCol}; z-index:2;"></div>
          <div style="margin-top:3px; white-space:nowrap; background:rgba(10,15,30,0.92); backdrop-filter:blur(8px); border:1px solid ${riskCol}; color:#ffffff; padding:2px 7px; border-radius:10px; font-size:10px; font-weight:800; font-family:'Inter',sans-serif; box-shadow:0 4px 12px rgba(0,0,0,0.6); pointer-events:none; z-index:3;">
            <span style="color:${riskCol}; margin-right:3px;">●</span>${loc.district}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'nelens-pin-icon',
        html: markerHtml,
        iconSize: [42, 48],
        iconAnchor: [21, 9]
      });

      const marker = L.marker([loc.lat, loc.lon], { icon }).addTo(this.layers.districtPins);

      const popupHtml = `
        <div style="font-family:'Inter',sans-serif; min-width:230px; color:#0f172a; padding:4px;">
          <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">${loc.state} • DETECTED LANDSLIDE AREA</div>
          <div style="font-size:14px; font-weight:800; color:#0f172a; margin-top:1px;">${loc.corridor_name}</div>
          <div style="font-size:11px; color:#475569; margin-bottom:6px;">${loc.district}</div>
          
          <div style="display:flex; justify-content:space-between; align-items:center; margin:6px 0; background:${riskCol}15; border:1px solid ${riskCol}40; padding:5px 8px; border-radius:6px;">
            <span style="font-size:11.5px; font-weight:700; color:#0f172a;">Risk Score: <strong>${loc.risk_score}/100</strong></span>
            <span style="font-size:11px; font-weight:800; padding:2px 7px; border-radius:4px; background:${riskCol}; color:#fff;">${loc.risk_level}</span>
          </div>

          <div style="font-size:11px; color:#334155; line-height:1.55;">
            <div>🌧️ 24h Rain: <b>${loc.risk_drivers.rainfall_24h.value} mm</b> | Slope: <b>${loc.risk_drivers.slope.value}°</b></div>
            <div>💧 Soil Saturation: <b>${loc.risk_drivers.soil_moisture.value}%</b> | Radius: <b>${loc.affected_radius_km} km</b></div>
            <div>👥 Population at Risk: <b>${loc.exposure.population_affected.toLocaleString()}</b></div>
          </div>

          <button onclick="window.app.trigger3DFromMap('${loc.id}')" style="width:100%; margin-top:8px; background:linear-gradient(135deg, #d97706, #b45309); border:1px solid #f59e0b; color:#ffffff; font-size:11.5px; font-weight:700; padding:6px 10px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 4px 10px rgba(217,119,6,0.35);">
            <span>⛰️</span> <span>Visualize 3D Landslide DEM</span>
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        if (this.onLocationSelected) {
          this.onLocationSelected(loc.id);
        }
      });

      this.districtMarkers[loc.id] = marker;
    });
  }

  renderLocation(loc, isSelected = true) {
    this.activeLocationId = loc.id;
    const center = [loc.lat, loc.lon];

    // Clear previous dynamic detail layers
    this.layers.riskZones.clearLayers();
    this.layers.previousLandslides.clearLayers();
    this.layers.villages.clearLayers();
    this.layers.roads.clearLayers();
    this.layers.rivers.clearLayers();
    this.layers.sensors.clearLayers();

    const isCritical = loc.risk_level === "CRITICAL";
    const riskCol = isCritical ? "#dc2626" : (loc.risk_level === "HIGH" ? "#ea580c" : (loc.risk_level === "MODERATE" ? "#ca8a04" : "#16a34a"));

    // 1. AFFECTED BUFFER RING (e.g. 2.5 km)
    const radiusMeters = (loc.affected_radius_km || 2.5) * 1000;
    this.bufferCircle = L.circle(center, {
      radius: radiusMeters,
      color: riskCol,
      weight: 2.5,
      opacity: 0.9,
      fillColor: riskCol,
      fillOpacity: isCritical ? 0.22 : 0.12,
      dashArray: isCritical ? "6, 6" : null
    }).addTo(this.layers.riskZones);

    // 2. RISK ZONE POLYGON
    const polyCoords = [
      [loc.lat + 0.016, loc.lon - 0.012],
      [loc.lat + 0.021, loc.lon + 0.008],
      [loc.lat + 0.009, loc.lon + 0.019],
      [loc.lat - 0.014, loc.lon + 0.012],
      [loc.lat - 0.018, loc.lon - 0.009],
      [loc.lat - 0.005, loc.lon - 0.017]
    ];
    L.polygon(polyCoords, {
      color: riskCol,
      weight: 1.8,
      fillColor: riskCol,
      fillOpacity: isCritical ? 0.32 : 0.20
    }).bindTooltip(`<b>Hazard Catchment:</b> ${loc.corridor_name}<br>Risk: ${loc.risk_score}/100 (${loc.risk_level})`, {
      sticky: true
    }).addTo(this.layers.riskZones);

    // 3. PREVIOUS LANDSLIDES MARKERS
    if (loc.historical_reports && loc.historical_reports.events) {
      loc.historical_reports.events.forEach(ev => {
        const hIcon = L.divIcon({
          className: 'history-pin',
          html: `<div style="background:#475569; color:#fff; border:1.5px solid #fff; border-radius:50%; width:22px; height:22px; display:flex; align-items:center; justify-content:center; font-size:11px; box-shadow:0 0 8px rgba(0,0,0,0.5);">📚</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        const hMarker = L.marker([ev.lat, ev.lon], { icon: hIcon }).addTo(this.layers.previousLandslides);
        hMarker.bindPopup(`
          <div style="font-family:'Inter',sans-serif; color:#0f172a; font-size:12px;">
            <div style="font-weight:800; color:#b91c1c;">● Previous Landslide Event (${ev.time_ago})</div>
            <div style="font-weight:700; margin:2px 0;">${ev.type}</div>
            <div style="font-size:11px; color:#64748b;">${ev.affected}</div>
            <div style="font-size:11px; margin-top:4px;">${ev.description}</div>
            <div style="font-size:10px; color:#0284c7; margin-top:2px;">Source: ${ev.source}</div>
          </div>
        `);
      });
    }

    // 4. VILLAGES IN VICINITY
    const villageList = loc.exposure.villages_list || ["Tuirial Veng", "Durtlang North", "Sihphir Outskirts"];
    villageList.forEach((vName, idx) => {
      const dLat = (idx === 0 ? 0.008 : (idx === 1 ? 0.014 : -0.011));
      const dLon = (idx === 0 ? -0.007 : (idx === 1 ? 0.006 : -0.009));
      const vIcon = L.divIcon({
        className: 'village-pin',
        html: `<div style="background:#0284c7; color:#fff; border:1.5px solid #fff; border-radius:4px; padding:2px 6px; font-size:10px; font-weight:700; white-space:nowrap; box-shadow:0 0 8px rgba(2,132,199,0.5);">🏘 ${vName}</div>`,
        iconSize: [85, 22],
        iconAnchor: [42, 11]
      });
      L.marker([loc.lat + dLat, loc.lon + dLon], { icon: vIcon })
        .bindPopup(`<b>Village: ${vName}</b><br>Status: Monitored in ${loc.district}`)
        .addTo(this.layers.villages);
    });

    // 5. ROADS
    const roadPoints = [
      [loc.lat - 0.024, loc.lon - 0.016],
      [loc.lat - 0.012, loc.lon - 0.009],
      [loc.lat, loc.lon - 0.003],
      [loc.lat + 0.011, loc.lon + 0.004],
      [loc.lat + 0.025, loc.lon + 0.015]
    ];
    L.polyline(roadPoints, {
      color: "#f59e0b",
      weight: 4,
      dashArray: "2, 6"
    }).bindTooltip(`<b>Road Corridor:</b> ${loc.exposure.roads_list ? loc.exposure.roads_list[0] : 'High Vulnerability Section'}`, { sticky: true }).addTo(this.layers.roads);

    // 6. RIVERS / GULLIES
    const riverPoints = [
      [loc.lat + 0.028, loc.lon - 0.022],
      [loc.lat + 0.015, loc.lon - 0.015],
      [loc.lat, loc.lon - 0.010],
      [loc.lat - 0.016, loc.lon - 0.004],
      [loc.lat - 0.028, loc.lon + 0.005]
    ];
    L.polyline(riverPoints, {
      color: "#38bdf8",
      weight: 3.5,
      opacity: 0.85
    }).bindTooltip("<b>Drainage / Torrent Corridor</b>", { sticky: true }).addTo(this.layers.rivers);

    // 7. MONITORING SENSORS
    const sensorOffsets = [
      { name: "AWS-Rain Gauge", dLat: 0.005, dLon: 0.008, type: "Tipping Bucket Precipitation" },
      { name: "TDR-Soil Sensor", dLat: -0.006, dLon: -0.005, type: "Volumetric Moisture & Pore Pressure" }
    ];
    sensorOffsets.forEach(s => {
      const sIcon = L.divIcon({
        className: 'sensor-pin',
        html: `<div style="background:#10b981; color:#fff; border:1px solid #fff; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:11px;">📡</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      L.marker([loc.lat + s.dLat, loc.lon + s.dLon], { icon: sIcon })
        .bindPopup(`<b>Station: ${s.name}</b><br>Type: ${s.type}<br>Status: Live Operational Stream`)
        .addTo(this.layers.sensors);
    });

    if (isSelected) {
      this.map.flyTo(center, 12.5, { duration: 0.9 });
    }
  }

  toggleLayer(layerKey, isVisible) {
    if (this.layers[layerKey]) {
      if (isVisible) {
        if (!this.map.hasLayer(this.layers[layerKey])) {
          this.map.addLayer(this.layers[layerKey]);
        }
      } else {
        if (this.map.hasLayer(this.layers[layerKey])) {
          this.map.removeLayer(this.layers[layerKey]);
        }
      }
    }
  }

  zoomToBuffer() {
    if (this.bufferCircle) {
      this.map.fitBounds(this.bufferCircle.getBounds(), { padding: [40, 40], duration: 1 });
    }
  }

  focusHistorical() {
    if (this.layers.previousLandslides) {
      const bounds = this.layers.previousLandslides.getBounds ? this.layers.previousLandslides.getBounds() : null;
      if (bounds && bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [50, 50], duration: 1 });
      } else {
        this.zoomToBuffer();
      }
    }
  }
}

window.NeLensMapEngine = NeLensMapEngine;
