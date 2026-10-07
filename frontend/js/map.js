/**
 * GovardhanaGiri 2.0: Interactive Geospatial GIS Map Engine (Leaflet)
 * Renders Telangana hotspots, glowing risk pulses, river channels, and safe shelters.
 */

class FloodMapEngine {
  constructor(mapContainerId, onStationSelectCallback) {
    this.containerId = mapContainerId;
    this.onStationSelect = onStationSelectCallback;
    this.map = null;
    this.markers = {};
    this.shelterLayerGroup = null;
    this.activeFilter = 'ALL';
  }

  init() {
    // Center around Telangana (latitude ~18.0, longitude ~79.5)
    this.map = L.map(this.containerId, {
      zoomControl: true,
      attributionControl: false
    }).setView([18.25, 79.6], 7);

    // Dark Matter tile layer from CartoDB for clean high-contrast emergency UI
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(this.map);

    this.shelterLayerGroup = L.layerGroup().addTo(this.map);
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
      <div class="custom-geo-marker ${isSelected ? 'marker-selected' : ''}" style="position:relative; width:32px; height:32px; display:flex; align-items:center; justify-content:center;">
        <div style="position:absolute; width:${isCritical ? '36px' : '26px'}; height:${isCritical ? '36px' : '26px'}; border-radius:50%; background:${col}; opacity:0.3; animation: pulse 1.4s infinite ease-in-out;"></div>
        <div style="width:16px; height:16px; border-radius:50%; background:${col}; border:2.5px solid #ffffff; box-shadow:0 0 14px ${col};"></div>
      </div>
    `;
  }

  renderStations(stations, selectedStationId) {
    // Clear old markers if any
    Object.values(this.markers).forEach(m => this.map.removeLayer(m));
    this.markers = {};

    stations.forEach(stn => {
      const risk = stn.prediction ? stn.prediction.risk_level : 'Low';

      // Check filter
      if (this.activeFilter !== 'ALL' && risk !== this.activeFilter) {
        return;
      }

      const icon = L.divIcon({
        className: 'flood-leaflet-icon',
        html: this.getMarkerHtml(risk, stn.id === selectedStationId),
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([stn.lat, stn.lon], { icon }).addTo(this.map);

      // Popup
      const popupHtml = `
        <div style="font-family:'Inter',sans-serif; min-width:180px; color:#f8fafc;">
          <div style="font-weight:700; font-size:13px; margin-bottom:2px;">${stn.village_area}</div>
          <div style="font-size:11px; color:#94a3b8;">${stn.mandal}, ${stn.district}</div>
          <div style="margin-top:6px; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:11px; font-weight:600; text-transform:uppercase;">Risk Tier:</span>
            <span style="font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px; background:${risk === 'Critical' ? '#ef4444' : (risk === 'High' ? '#f97316' : (risk === 'Moderate' ? '#f59e0b' : '#10b981'))}; color:#fff;">${risk}</span>
          </div>
          <div style="font-size:11px; margin-top:4px; color:#38bdf8;">Stage: ${stn.telemetry.Water_Level}m / ${stn.danger_water_level}m</div>
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
      // Offset slightly for visual representation on map
      const dLat = (idx === 0 ? 0.015 : (idx === 1 ? -0.012 : 0.018));
      const dLon = (idx === 0 ? 0.012 : (idx === 1 ? 0.014 : -0.016));
      const shLat = baseLat + dLat;
      const shLon = baseLon + dLon;

      const shelterIcon = L.divIcon({
        className: 'shelter-icon',
        html: `
          <div style="width:24px; height:24px; border-radius:6px; background:#0284c7; border:2px solid #ffffff; display:flex; align-items:center; justify-content:center; box-shadow:0 0 10px #0284c7; font-size:12px;">
            🏠
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const sMarker = L.marker([shLat, shLon], { icon: shelterIcon });
      sMarker.bindPopup(`
        <div style="font-family:'Inter',sans-serif; color:#f8fafc; font-size:12px;">
          <div style="font-weight:700; color:#38bdf8;">${sh.name}</div>
          <div>${sh.type}</div>
          <div style="font-size:11px; color:#94a3b8; margin-top:4px;">Capacity: ${sh.capacity} people | Elev: +${sh.elevation_m}m</div>
          <div style="font-size:11px; color:#34d399; margin-top:2px;">Contact: ${sh.contact}</div>
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
