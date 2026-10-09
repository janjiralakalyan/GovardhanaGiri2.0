/**
 * GovardhanaGiri 2.0: AI Multi-Agent Incident Commander & IAP Copilot Controller
 * ===============================================================================
 * Coordinates:
 * - 3-Agent Deliberation Pipeline (Groq Worker 1 + Groq Worker 2 + Cohere Commander)
 * - NDMA-Compliant IAP Generation & Resource Metric Cards
 * - Multi-Lingual Emergency Public Broadcasts (English, Telugu, Hindi) with Speech Controls
 * - API Keys Modal & Local Key Management
 * - Professional PDF / Print Export (NDMA Form 201/204)
 * - Interactive Commander Query Chat with Telemetry Cards
 */

const CopilotApp = {
  currentStationId: "TEL-STN-01",
  activeLang: "english",
  currentIAP: null,
  stationsList: [],
  speechUtterance: null,
  apiKeys: { groq: "", cohere: "" },

  init() {
    this.loadSavedKeys();
    this.bindDOM();
    this.loadStationsDropdown();
    this.loadQuickPrompts();
    this.bindEvents();
    this.bindAudioControls();
    this.bindKeysModal();
    console.log("[CopilotApp] AI Multi-Agent Incident Commander initialized.");
  },

  loadSavedKeys() {
    try {
      const saved = localStorage.getItem("gg2_api_keys");
      if (saved) {
        this.apiKeys = JSON.parse(saved);
      }
    } catch (e) {
      console.warn("[CopilotApp] Error parsing saved API keys:", e);
    }
  },

  saveKeys(groqKey, cohereKey) {
    this.apiKeys = { groq: groqKey.trim(), cohere: cohereKey.trim() };
    localStorage.setItem("gg2_api_keys", JSON.stringify(this.apiKeys));
    this.showToast("🔑 API key settings saved locally!");
  },

  clearKeys() {
    this.apiKeys = { groq: "", cohere: "" };
    localStorage.removeItem("gg2_api_keys");
    if (this.groqKeyInput) this.groqKeyInput.value = "";
    if (this.cohereKeyInput) this.cohereKeyInput.value = "";
    this.showToast("🗑️ Saved API keys cleared.");
  },

  bindDOM() {
    this.modal = document.getElementById("copilot-modal");
    this.btnLaunch = document.getElementById("btn-launch-copilot");
    this.btnClose = document.getElementById("btn-close-copilot");
    this.stationSelect = document.getElementById("copilot-station-picker");
    this.btnGenIAP = document.getElementById("btn-trigger-iap");
    this.btnPrintIAP = document.getElementById("btn-print-iap");
    
    // Resource Cards
    this.resFood = document.getElementById("copilot-res-food");
    this.resWater = document.getElementById("copilot-res-water");
    this.resBoats = document.getElementById("copilot-res-boats");
    this.resStaff = document.getElementById("copilot-res-staff");

    // Live Telemetry & Threat Summary Bar
    this.summaryRisk = document.getElementById("copilot-summary-risk");
    this.summaryStation = document.getElementById("copilot-summary-station");
    this.summaryLeadTime = document.getElementById("copilot-summary-leadtime");
    this.summaryPop = document.getElementById("copilot-summary-pop");
    this.summaryEvacPct = document.getElementById("copilot-summary-evac-pct");

    // Deliberation text containers
    this.w1Analysis = document.getElementById("copilot-w1-text");
    this.w2Analysis = document.getElementById("copilot-w2-text");
    this.cmdAnalysis = document.getElementById("copilot-cmd-text");

    // Broadcasts
    this.broadcastText = document.getElementById("copilot-broadcast-text");
    this.btnCopyBroadcast = document.getElementById("btn-copy-broadcast");
    this.btnPlayBroadcast = document.getElementById("btn-play-broadcast");
    this.btnDispatchBroadcast = document.getElementById("btn-dispatch-broadcast");

    // Speech Audio Toolbar
    this.btnSpeechPause = document.getElementById("btn-speech-pause");
    this.btnSpeechStop = document.getElementById("btn-speech-stop");
    this.speechVolSlider = document.getElementById("speech-vol-slider");
    this.speechRateSelect = document.getElementById("speech-rate-select");

    // API Keys Modal elements
    this.btnOpenKeysModal = document.getElementById("btn-open-keys-modal");
    this.keysModal = document.getElementById("copilot-keys-modal");
    this.btnCloseKeysModal = document.getElementById("btn-close-keys-modal");
    this.btnSaveKeys = document.getElementById("btn-save-keys");
    this.btnClearKeys = document.getElementById("btn-clear-keys");
    this.groqKeyInput = document.getElementById("groq-api-key-input");
    this.cohereKeyInput = document.getElementById("cohere-api-key-input");

    // Chat
    this.chatContainer = document.getElementById("copilot-chat-msgs");
    this.chatInput = document.getElementById("copilot-chat-input");
    this.btnSendChat = document.getElementById("btn-copilot-send");
    this.quickPromptsBar = document.getElementById("copilot-quick-prompts");
  },

  bindEvents() {
    if (this.btnLaunch) {
      this.btnLaunch.addEventListener("click", () => this.openModal());
    }
    if (this.btnClose) {
      this.btnClose.addEventListener("click", () => this.closeModal());
    }
    if (this.modal) {
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) this.closeModal();
      });
    }

    if (this.stationSelect) {
      this.stationSelect.addEventListener("change", (e) => {
        this.currentStationId = e.target.value;
      });
    }

    if (this.btnGenIAP) {
      this.btnGenIAP.addEventListener("click", () => this.generateIAP());
    }

    if (this.btnPrintIAP) {
      this.btnPrintIAP.addEventListener("click", () => this.printIAPReport());
    }

    // Language tabs
    document.querySelectorAll(".btn-lang-tab").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".btn-lang-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.activeLang = btn.dataset.lang;
        this.updateBroadcastDisplay();
      });
    });

    // Copy broadcast
    if (this.btnCopyBroadcast) {
      this.btnCopyBroadcast.addEventListener("click", () => {
        if (!this.currentIAP) return;
        const txt = this.currentIAP.broadcasts[this.activeLang] || "";
        navigator.clipboard.writeText(txt).then(() => {
          this.showToast("📋 Broadcast alert copied to clipboard!");
        });
      });
    }

    // Audio Play Broadcast
    if (this.btnPlayBroadcast) {
      this.btnPlayBroadcast.addEventListener("click", () => {
        if (!this.currentIAP) return;
        const txt = this.currentIAP.broadcasts[this.activeLang] || "";
        this.speakText(txt, this.activeLang);
      });
    }

    // Dispatch Alert
    if (this.btnDispatchBroadcast) {
      this.btnDispatchBroadcast.addEventListener("click", () => {
        if (window.AudioAlerts) {
          window.AudioAlerts.playSiren(3.5);
        }
        this.showToast(`🚨 Public emergency broadcast dispatched across ${this.activeLang.toUpperCase()} channels!`);
      });
    }

    // Chat send
    if (this.btnSendChat) {
      this.btnSendChat.addEventListener("click", () => this.handleChatSubmit());
    }
    if (this.chatInput) {
      this.chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.handleChatSubmit();
      });
    }
  },

  bindAudioControls() {
    if (this.btnSpeechPause) {
      this.btnSpeechPause.addEventListener("click", () => {
        if (!('speechSynthesis' in window)) return;
        if (window.speechSynthesis.speaking) {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            this.btnSpeechPause.textContent = "⏸️ Pause";
            this.showToast("▶️ Audio playback resumed.");
          } else {
            window.speechSynthesis.pause();
            this.btnSpeechPause.textContent = "▶️ Resume";
            this.showToast("⏸️ Audio playback paused.");
          }
        }
      });
    }

    if (this.btnSpeechStop) {
      this.btnSpeechStop.addEventListener("click", () => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          if (this.btnSpeechPause) this.btnSpeechPause.textContent = "⏸️ Pause";
          this.showToast("⏹️ Audio playback stopped.");
        }
      });
    }

    if (this.speechVolSlider) {
      this.speechVolSlider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        if (this.speechUtterance) {
          this.speechUtterance.volume = val;
        }
      });
    }
  },

  bindKeysModal() {
    if (this.btnOpenKeysModal) {
      this.btnOpenKeysModal.addEventListener("click", () => {
        if (this.groqKeyInput) this.groqKeyInput.value = this.apiKeys.groq || "";
        if (this.cohereKeyInput) this.cohereKeyInput.value = this.apiKeys.cohere || "";
        if (this.keysModal) this.keysModal.classList.add("active");
      });
    }

    if (this.btnCloseKeysModal) {
      this.btnCloseKeysModal.addEventListener("click", () => {
        if (this.keysModal) this.keysModal.classList.remove("active");
      });
    }

    if (this.keysModal) {
      this.keysModal.addEventListener("click", (e) => {
        if (e.target === this.keysModal) {
          this.keysModal.classList.remove("active");
        }
      });
    }

    if (this.btnSaveKeys) {
      this.btnSaveKeys.addEventListener("click", () => {
        const gKey = this.groqKeyInput ? this.groqKeyInput.value : "";
        const cKey = this.cohereKeyInput ? this.cohereKeyInput.value : "";
        this.saveKeys(gKey, cKey);
        if (this.keysModal) this.keysModal.classList.remove("active");
      });
    }

    if (this.btnClearKeys) {
      this.btnClearKeys.addEventListener("click", () => {
        this.clearKeys();
      });
    }
  },

  openModal(stationId = null) {
    if (stationId) {
      this.currentStationId = stationId;
      if (this.stationSelect) this.stationSelect.value = stationId;
    }
    if (this.modal) {
      this.modal.classList.add("active");
    }
    if (!this.currentIAP) {
      this.generateIAP();
    }
  },

  closeModal() {
    if (this.modal) {
      this.modal.classList.remove("active");
    }
  },

  async loadStationsDropdown() {
    try {
      const res = await fetch("/api/stations");
      const data = await res.json();
      this.stationsList = data.stations || [];
      if (this.stationSelect) {
        this.stationSelect.innerHTML = this.stationsList.map((s) => `
          <option value="${s.id}">${s.village_area} (${s.district})</option>
        `).join("");
      }
    } catch (e) {
      console.error("[CopilotApp] Error loading stations:", e);
    }
  },

  async loadQuickPrompts() {
    try {
      const res = await fetch("/api/copilot/quick-prompts");
      const data = await res.json();
      if (this.quickPromptsBar && data.prompts) {
        this.quickPromptsBar.innerHTML = data.prompts.map((p) => `
          <button class="prompt-chip" data-query="${encodeURIComponent(p.query)}" data-station="${p.station_id}">
            ${p.title}
          </button>
        `).join("");

        this.quickPromptsBar.querySelectorAll(".prompt-chip").forEach((chip) => {
          chip.addEventListener("click", () => {
            const q = decodeURIComponent(chip.dataset.query);
            const stn = chip.dataset.station;
            if (stn && this.stationSelect) {
              this.currentStationId = stn;
              this.stationSelect.value = stn;
            }
            if (this.chatInput) this.chatInput.value = q;
            this.handleChatSubmit();
          });
        });
      }
    } catch (e) {
      console.error("[CopilotApp] Error loading quick prompts:", e);
    }
  },

  setAgentsWorking(isWorking) {
    if (this.btnGenIAP) {
      this.btnGenIAP.disabled = isWorking;
      this.btnGenIAP.innerHTML = isWorking
        ? `⏳ Synthesizing Incident Action Plan...`
        : `⚡ Generate NDMA Action Plan (IAP)`;
    }
  },

  async generateIAP() {
    this.setAgentsWorking(true);
    try {
      const stnId = this.stationSelect ? this.stationSelect.value : this.currentStationId;
      const res = await fetch("/api/copilot/generate-iap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          station_id: stnId,
          groq_api_key: this.apiKeys.groq || null,
          cohere_api_key: this.apiKeys.cohere || null
        })
      });
      const data = await res.json();
      this.currentIAP = data;
      this.renderIAP(data);
      this.showToast(`✅ Official Incident Action Plan synthesized for ${data.station_name}`);
    } catch (e) {
      console.error("[CopilotApp] IAP Generation error:", e);
      this.showToast("⚠️ Generated fallback incident plan.");
    } finally {
      this.setAgentsWorking(false);
    }
  },

  renderIAP(iap) {
    if (!iap) return;
    const sup = iap.resource_matrix ? iap.resource_matrix.supplies : {};

    // Live Telemetry & Risk Summary Bar (Strong Info)
    if (this.summaryRisk && iap.risk_level) {
      const risk = iap.risk_level.toUpperCase();
      this.summaryRisk.textContent = `${risk} ALERT`;
      this.summaryRisk.className = `summary-risk-badge ${iap.risk_level.toLowerCase()}`;
    }

    if (this.summaryStation && iap.station_name) {
      this.summaryStation.textContent = `${iap.station_name} (${iap.district || ""})`;
    }

    if (this.summaryLeadTime && iap.lead_time_hours !== undefined) {
      this.summaryLeadTime.textContent = `⚡ ${iap.lead_time_hours} Hours`;
    }

    if (this.summaryPop && iap.resource_matrix) {
      const targetPop = iap.resource_matrix.target_vulnerable_population || 0;
      const totalPop = iap.resource_matrix.total_station_population || 1;
      const pct = Math.round((targetPop / totalPop) * 100);
      this.summaryPop.textContent = `${targetPop.toLocaleString()} Persons`;
      if (this.summaryEvacPct) {
        this.summaryEvacPct.textContent = `${pct}% Immediate Evacuation Zone`;
      }
    }

    // Resource metrics
    if (this.resFood) this.resFood.textContent = (sup.food_packets_48h || 0).toLocaleString();
    if (this.resWater) this.resWater.textContent = `${(sup.water_tankers_10k_L || 0)} Tankers (${((sup.water_liters_48h || 0) / 1000).toFixed(0)}k L)`;
    if (this.resBoats) this.resBoats.textContent = `${(sup.sdrf_inflatable_rescue_boats || 0)} IRBs`;
    if (this.resStaff) this.resStaff.textContent = `${(sup.sdrf_ndrf_personnel || 0)} Active`;

    // Deliberation sections
    const delib = iap.deliberation || {};
    if (this.w1Analysis && delib.worker_1_hazard) {
      this.w1Analysis.textContent = delib.worker_1_hazard.analysis;
    }
    if (this.w2Analysis && delib.worker_2_logistics) {
      this.w2Analysis.textContent = delib.worker_2_logistics.analysis;
    }
    if (this.cmdAnalysis && delib.commander_synthesis) {
      this.cmdAnalysis.textContent = delib.commander_synthesis.full_iap;
    }

    this.updateBroadcastDisplay();
  },

  updateBroadcastDisplay() {
    if (!this.currentIAP || !this.broadcastText) return;
    const msg = this.currentIAP.broadcasts[this.activeLang] || "No broadcast generated.";
    this.broadcastText.textContent = msg;
  },

  speakText(text, lang) {
    if (!('speechSynthesis' in window)) {
      this.showToast("Speech synthesis not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    
    // Play alert chime first
    if (window.AudioAlerts) {
      window.AudioAlerts.playChime();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (lang === "telugu") utterance.lang = "te-IN";
    else if (lang === "hindi") utterance.lang = "hi-IN";
    else utterance.lang = "en-IN";

    const vol = this.speechVolSlider ? parseFloat(this.speechVolSlider.value) : 1.0;
    const rate = this.speechRateSelect ? parseFloat(this.speechRateSelect.value) : 1.0;

    utterance.volume = vol;
    utterance.rate = rate;
    utterance.pitch = 1.0;

    this.speechUtterance = utterance;
    if (this.btnSpeechPause) this.btnSpeechPause.textContent = "⏸️ Pause";

    window.speechSynthesis.speak(utterance);
    this.showToast(`🔊 Broadcasting announcement in ${lang.toUpperCase()}...`);
  },

  async handleChatSubmit() {
    if (!this.chatInput) return;
    const query = this.chatInput.value.trim();
    if (!query) return;

    this.appendMessage("user", query, "Incident Commander");
    this.chatInput.value = "";

    const loadingId = this.appendMessage("bot", "⚡ Synthesizing AI Disaster Advisory...", "AI Incident Commander");

    try {
      const stnId = this.stationSelect ? this.stationSelect.value : this.currentStationId;
      const res = await fetch("/api/copilot/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
          station_id: stnId,
          groq_api_key: this.apiKeys.groq || null,
          cohere_api_key: this.apiKeys.cohere || null
        })
      });
      const data = await res.json();
      this.updateMessage(loadingId, data.answer, `${data.responder} • ${data.timestamp}`, data.station_data);
    } catch (e) {
      this.updateMessage(loadingId, "⚠️ Error querying Copilot backend. Please try again.", "EOC System Error");
    }
  },

  appendMessage(role, text, meta) {
    if (!this.chatContainer) return null;
    const msgId = "msg-" + Date.now();
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${role}`;
    bubble.id = msgId;

    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n- /g, "<br>• ")
      .replace(/\n/g, "<br>");

    bubble.innerHTML = `
      <div>${formatted}</div>
      <div class="chat-bubble-meta">
        <span>${role === "user" ? "👤" : "🛡️"}</span>
        <span>${meta}</span>
      </div>
    `;
    this.chatContainer.appendChild(bubble);
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    return msgId;
  },

  updateMessage(msgId, text, meta, stnData = null) {
    const bubble = document.getElementById(msgId);
    if (!bubble) return;
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n- /g, "<br>• ")
      .replace(/\n/g, "<br>");

    let cardHtml = "";
    if (stnData) {
      const tel = stnData.telemetry || {};
      const pred = stnData.prediction || {};
      const danger = stnData.danger_water_level || 5.0;
      const water = tel.Water_Level || 0;
      const risk = pred.risk_level || "Moderate";
      const lead = pred.lead_time_hours || 3.5;
      const shelters = stnData.shelters || [];

      cardHtml = `
        <div class="chat-telemetry-card">
          <div class="chat-card-title">
            📍 ${stnData.village_area} (${stnData.district})
            <span class="summary-risk-badge ${risk.toLowerCase()}" style="margin-left:8px; font-size:10px; padding:2px 6px;">${risk.toUpperCase()} ALERT</span>
          </div>
          <div class="chat-metrics-grid">
            <div class="chat-metric-pill">
              <span class="lbl">River Water Stage</span>
              <span class="val" style="color:${water >= danger ? '#ef4444' : '#38bdf8'};">${water}m / ${danger}m</span>
            </div>
            <div class="chat-metric-pill">
              <span class="lbl">1h Rain Intensity</span>
              <span class="val">${tel.Rainfall_1h || 0} mm/h</span>
            </div>
            <div class="chat-metric-pill">
              <span class="lbl">Soil Saturation</span>
              <span class="val">${tel.Soil_Saturation || 0}%</span>
            </div>
            <div class="chat-metric-pill">
              <span class="lbl">Action Lead Time</span>
              <span class="val" style="color:#fbbf24;">⚡ ${lead} Hours</span>
            </div>
          </div>
          ${shelters.length > 0 ? `
            <div style="font-size:10.5px; color:#cbd5e1; margin-top:8px;">
              <strong>🏥 Primary Relief Camp:</strong> ${shelters[0].name} (Cap: ${shelters[0].capacity.toLocaleString()} evacuees • ${shelters[0].distance_km}km)
            </div>
          ` : ""}
        </div>
      `;
    }

    bubble.innerHTML = `
      <div>${formatted}</div>
      ${cardHtml}
      <div class="chat-bubble-meta">
        <span>🛡️</span>
        <span>${meta}</span>
      </div>
    `;
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  },

  printIAPReport() {
    if (!this.currentIAP) {
      this.showToast("Generate an IAP first before printing.");
      return;
    }
    const iap = this.currentIAP;
    const resMatrix = iap.resource_matrix || {};
    const sup = resMatrix.supplies || {};
    const shelterPlan = resMatrix.shelter_allocations || [];

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>NDMA FORM 201/204 - INCIDENT ACTION PLAN (${iap.station_name})</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 25px; color: #0f172a; line-height: 1.5; background: #fff; }
          .official-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
          .header-title-box h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: #0f172a; }
          .header-title-box p { margin: 2px 0 0 0; font-size: 12px; color: #475569; font-weight: 600; }
          .ndma-badge { background: #dc2626; color: #fff; padding: 6px 12px; font-weight: 800; font-size: 12px; border-radius: 4px; text-transform: uppercase; }
          .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 12px; }
          .meta-item { display: flex; flex-direction: column; }
          .meta-item .lbl { color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; }
          .meta-item .val { font-size: 13px; font-weight: 800; color: #0f172a; }
          .section-title { font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; border-left: 4px solid #2563eb; padding-left: 8px; margin-top: 22px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
          th { background: #f1f5f9; font-weight: 700; color: #1e293b; text-transform: uppercase; font-size: 10.5px; }
          .pre-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 14px; border-radius: 6px; font-size: 11.5px; white-space: pre-wrap; line-height: 1.6; }
          .footer-sign { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="official-header">
          <div class="header-title-box">
            <h1>NATIONAL DISASTER MANAGEMENT AUTHORITY (NDMA)</h1>
            <p>GovardhanaGiri 2.0 • Incident Command Form 201/204 • State Disaster Operations</p>
          </div>
          <div class="ndma-badge">FORM 201 / 204 • ${iap.risk_level} ALERT</div>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><span class="lbl">Monitored Station & District</span><span class="val">${iap.station_name}, ${iap.mandal} Mandal (${iap.district} District)</span></div>
          <div class="meta-item"><span class="lbl">Report Generation Timestamp</span><span class="val">${iap.generated_at}</span></div>
          <div class="meta-item"><span class="lbl">AI Evacuation Lead Time</span><span class="val">⚡ ${iap.lead_time_hours} Hours (3–4h Early Warning Window)</span></div>
          <div class="meta-item"><span class="lbl">Target Riparian Population at Risk</span><span class="val">${(resMatrix.target_vulnerable_population || iap.population).toLocaleString()} Persons</span></div>
        </div>

        <div class="section-title">1. Mandated 48-Hour Operational Resource Reserve</div>
        <table>
          <thead>
            <tr><th>Resource Category</th><th>NDMA Mandated Reserve Quantity</th><th>Deployment Status & Standards</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Dry Meal Food Rations</strong></td><td>${(sup.food_packets_48h || 0).toLocaleString()} Packets</td><td>3 meals x 48h operational reserve per evacuee</td></tr>
            <tr><td><strong>Clean Potable Drinking Water</strong></td><td>${(sup.water_liters_48h || 0).toLocaleString()} L (${sup.water_tankers_10k_L || 0} Tankers @ 10k L)</td><td>SPHERE Standard: 4 Liters / person / day</td></tr>
            <tr><td><strong>SDRF Motorized Rescue Boats</strong></td><td>${sup.sdrf_inflatable_rescue_boats || 0} IRBs</td><td>Deployed to riverbank launch points</td></tr>
            <tr><td><strong>Life Jackets & Safety Gear</strong></td><td>${(sup.life_jackets_distributed || 0).toLocaleString()} Units</td><td>Distributed to frontline responders & riparian wards</td></tr>
            <tr><td><strong>Emergency Medical Triage Tents</strong></td><td>${sup.medical_triage_tents || 0} Tents (${(sup.ors_chlorine_sachets || 0).toLocaleString()} ORS/Chlorine Kits)</td><td>Equipped with water purification & triage kits</td></tr>
            <tr><td><strong>SDRF / NDRF First Responders</strong></td><td>${sup.sdrf_ndrf_personnel || 0} Officers</td><td>Active search & rescue personnel on standby</td></tr>
          </tbody>
        </table>

        ${shelterPlan.length > 0 ? `
          <div class="section-title">2. Designated Safe Relief Camps & Occupancy Plan</div>
          <table>
            <thead>
              <tr><th>Shelter Facility Name</th><th>Elevation</th><th>Distance</th><th>Max Capacity</th><th>Allocated Evacuees</th><th>Contact Phone</th></tr>
            </thead>
            <tbody>
              ${shelterPlan.map(s => `
                <tr>
                  <td><strong>${s.name}</strong></td>
                  <td>${s.elevation_m} m</td>
                  <td>${s.distance_km} km</td>
                  <td>${s.capacity.toLocaleString()}</td>
                  <td>${s.allocated_evacuees.toLocaleString()} (${s.occupancy_rate_pct}%)</td>
                  <td>${s.contact}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        ` : ""}

        <div class="section-title">3. Multi-Agent Incident Action Plan Synthesis & Directives</div>
        <div class="pre-box">${iap.deliberation ? iap.deliberation.commander_synthesis.full_iap : ""}</div>

        <div class="section-title">4. Authenticated Multi-Lingual Emergency Public Broadcast</div>
        <table>
          <tr><th>English Broadcast</th><td>${iap.broadcasts.english}</td></tr>
          <tr><th>Telugu Broadcast (తెలుగు)</th><td>${iap.broadcasts.telugu}</td></tr>
          <tr><th>Hindi Broadcast (हिन्दी)</th><td>${iap.broadcasts.hindi}</td></tr>
        </table>

        <div class="footer-sign">
          <div><strong>Issued By:</strong> GovardhanaGiri 2.0 AI Incident Commander</div>
          <div><strong>Authority:</strong> State Disaster Management Authority (SDMA)</div>
          <div><strong>Helpline:</strong> 1077 / 112</div>
        </div>

        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  },

  showToast(msg) {
    if (window.showToast) {
      window.showToast(msg);
    } else {
      console.log("[Toast]", msg);
    }
  }
};

window.CopilotApp = CopilotApp;
document.addEventListener("DOMContentLoaded", () => {
  CopilotApp.init();
});
