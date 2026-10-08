/**
 * NE-LENS: Northeast India Landslide GIS Map Engine
 * Leaflet-powered operational map with risk polygons, 2.5km buffers,
 * historical events, road corridors, rivers, sensors, and layer toggles.
 */

class NeLensMapEngine {
  constructor(containerId, onLocationSelected) {
    this.containerId = containerId;
    this.onLocationSelected = onLocationSelected;
    this.map = null;

    // Layer groups for toggle control
    this.layers = {
      riskZones: null,
      previousLandslides: null,
      villages: null,
      roads: null,
      rivers: null,
      sensors: null
    };

    this.activeLocationId = null;
    this.bufferCircle = null;
    this.locationMarkers = {};
  }

  init(initialLat = 23.7271, initialLon = 92.7176, initialZoom = 13) {
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
    this.layers.riskZones = L.layerGroup().addTo(this.map);
    this.layers.previousLandslides = L.layerGroup().addTo(this.map);
    this.layers.villages = L.layerGroup().addTo(this.map);
    this.layers.roads = L.layerGroup().addTo(this.map);
    this.layers.rivers = L.layerGroup().addTo(this.map);
    this.layers.sensors = L.layerGroup().addTo(this.map);
  }

  renderLocation(loc, isSelected = true) {
    this.activeLocationId = loc.id;
    const center = [loc.lat, loc.lon];

    // Clear previous dynamic layers
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
      weight: 2,
      opacity: 0.9,
      fillColor: riskCol,
      fillOpacity: 0.12,
      dashArray: isCritical ? "6, 6" : null
    }).addTo(this.layers.riskZones);

    // 2. RISK ZONE POLYGON (Simulated steep slope catchment)
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
      weight: 1.5,
      fillColor: riskCol,
      fillOpacity: isCritical ? 0.28 : 0.18
    }).bindTooltip(`<b>Hazard Catchment:</b> ${loc.corridor_name}<br>Risk: ${loc.risk_score}/100 (${loc.risk_level})`, {
      sticky: true
    }).addTo(this.layers.riskZones);

    // 3. CENTROID PIN (Active Location)
    const pinHtml = `
      <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
        <div style="position:absolute; width:36px; height:36px; border-radius:50%; background:${riskCol}; opacity:0.35; animation: pulse 1.5s infinite ease-in-out;"></div>
        <div style="width:18px; height:18px; border-radius:50%; background:${riskCol}; border:2.5px solid #ffffff; box-shadow:0 0 14px ${riskCol};"></div>
      </div>
    `;
    const centroidIcon = L.divIcon({
      className: 'centroid-icon',
      html: pinHtml,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const centroidMarker = L.marker(center, { icon: centroidIcon }).addTo(this.layers.riskZones);
    
    // COMPACT POPUP FORMAT EXACTLY AS SPECIFIED
    const compactPopupHtml = `
      <div style="font-family:'Inter',sans-serif; min-width:210px; color:#0f172a; padding:2px;">
        <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">LOCATION</div>
        <div style="font-size:14px; font-weight:800; color:#0f172a; margin-bottom:4px;">${loc.corridor_name}</div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin:6px 0; background:${riskCol}15; padding:4px 8px; border-radius:4px;">
          <span style="font-size:12px; font-weight:700;">Risk: ${loc.risk_score}/100</span>
          <span style="font-size:11px; font-weight:800; color:${riskCol};">${loc.risk_level}</span>
        </div>
        <div style="font-size:11px; color:#334155; line-height:1.6;">
          <div><b>Affected Radius:</b> ${loc.affected_radius_km} km</div>
          <div><b>Previous Landslides:</b> ${loc.historical_reports ? loc.historical_reports.total_in_radius : 4}</div>
          <div><b>Rainfall:</b> ${loc.risk_drivers.rainfall_24h.value} mm / 24h</div>
          <div><b>Slope:</b> ${loc.risk_drivers.slope.value}°</div>
          <div><b>Soil Moisture:</b> ${loc.risk_drivers.soil_moisture.value}%</div>
        </div>
      </div>
    `;
    centroidMarker.bindPopup(compactPopupHtml);
    if (isSelected) centroidMarker.openPopup();

    // 4. PREVIOUS LANDSLIDES MARKERS
    if (loc.historical_reports && loc.historical_reports.events) {
      loc.historical_reports.events.forEach(ev => {
        const hIcon = L.divIcon({
          className: 'history-pin',
          html: `<div style="background:#475569; color:#fff; border:1.5px solid #fff; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:10px; box-shadow:0 0 8px rgba(0,0,0,0.5);">📚</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        const hMarker = L.marker([ev.lat, ev.lon], { icon: hIcon }).addTo(this.layers.previousLandslides);
        hMarker.bindPopup(`
          <div style="font-family:'Inter',sans-serif; color:#0f172a; font-size:12px;">
            <div style="font-weight:800; color:#b91c1c;">● Previous Event (${ev.time_ago})</div>
            <div style="font-weight:700; margin:2px 0;">${ev.type}</div>
            <div style="font-size:11px; color:#64748b;">${ev.affected}</div>
            <div style="font-size:11px; margin-top:4px;">${ev.description}</div>
            <div style="font-size:10px; color:#0284c7; margin-top:2px;">Source: ${ev.source}</div>
          </div>
        `);
      });
    }

    // 5. VILLAGES IN VICINITY
    const villageOffsets = [
      { name: loc.exposure.villages_list[0] || "Tuirial Veng", dLat: 0.008, dLon: -0.007, pop: "1,840" },
      { name: loc.exposure.villages_list[1] || "Durtlang North", dLat: 0.014, dLon: 0.006, pop: "2,120" },
      { name: loc.exposure.villages_list[2] || "Sihphir Outskirts", dLat: -0.011, dLon: -0.009, pop: "860" }
    ];
    villageOffsets.forEach(v => {
      const vIcon = L.divIcon({
        className: 'village-pin',
        html: `<div style="background:#0284c7; color:#fff; border:1.5px solid #fff; border-radius:4px; padding:1px 5px; font-size:10px; font-weight:700; white-space:nowrap; box-shadow:0 0 8px rgba(2,132,199,0.5);">🏘 ${v.name}</div>`,
        iconSize: [80, 20],
        iconAnchor: [40, 10]
      });
      L.marker([loc.lat + v.dLat, loc.lon + v.dLon], { icon: vIcon })
        .bindPopup(`<b>Village: ${v.name}</b><br>Est. Population: ${v.pop}<br>Status: Inside ${loc.affected_radius_km} km Hazard Buffer`)
        .addTo(this.layers.villages);
    });

    // 6. ROADS (Polyline vectors)
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
      dashArray: "1, 6"
    }).bindTooltip("<b>Road Network:</b> NH-54 Bypass Corridor (High Vulnerability)", { sticky: true }).addTo(this.layers.roads);

    // 7. RIVERS / GULLIES
    const riverPoints = [
      [loc.lat + 0.028, loc.lon - 0.022],
      [loc.lat + 0.015, loc.lon - 0.015],
      [loc.lat, loc.lon - 0.010],
      [loc.lat - 0.016, loc.lon - 0.004],
      [loc.lat - 0.028, loc.lon + 0.005]
    ];
    L.polyline(riverPoints, {
      color: "#38bdf8",
      weight: 3,
      opacity: 0.85
    }).bindTooltip("<b>Drainage Corridor:</b> Tuirial River Drainage", { sticky: true }).addTo(this.layers.rivers);

    // 8. MONITORING SENSORS
    const sensorOffsets = [
      { name: "AWS-Rain Gauge #04", dLat: 0.005, dLon: 0.008, type: "Tipping Bucket" },
      { name: "TDR-Soil Sensor #02", dLat: -0.006, dLon: -0.005, type: "Volumetric Moisture" }
    ];
    sensorOffsets.forEach(s => {
      const sIcon = L.divIcon({
        className: 'sensor-pin',
        html: `<div style="background:#10b981; color:#fff; border:1px solid #fff; border-radius:50%; width:18px; height:18px; display:flex; align-items:center; justify-content:center; font-size:10px;">📡</div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      L.marker([loc.lat + s.dLat, loc.lon + s.dLon], { icon: sIcon })
        .bindPopup(`<b>Station: ${s.name}</b><br>Type: ${s.type}<br>Status: Operational (Live Stream)`)
        .addTo(this.layers.sensors);
    });

    if (isSelected) {
      this.map.flyTo(center, 13, { duration: 0.8 });
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
