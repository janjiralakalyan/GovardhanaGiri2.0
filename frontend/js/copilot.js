/**
 * GovardhanaGiri 2.0: AI Multi-Agent Incident Commander & IAP Copilot Controller
 * ===============================================================================
 * Coordinates:
 * - 3-Agent Deliberation Pipeline (Groq Worker 1 + Groq Worker 2 + Cohere Commander)
 * - NDMA-Compliant IAP Generation & Resource Metric Cards
 * - Multi-Lingual Emergency Public Broadcasts (English, Telugu, Hindi) with Speech Synthesizer
 * - Interactive Commander Query Chat with Quick Prompts
 */

const CopilotApp = {
  currentStationId: "TEL-STN-01",
  activeLang: "english",
  currentIAP: null,
  stationsList: [],

  init() {
    this.bindDOM();
    this.loadStationsDropdown();
    this.loadQuickPrompts();
    this.bindEvents();
    console.log("[CopilotApp] AI Multi-Agent Incident Commander initialized.");
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

    // Agent status dots
    this.dotW1 = document.getElementById("dot-agent-w1");
    this.dotW2 = document.getElementById("dot-agent-w2");
    this.dotCmd = document.getElementById("dot-agent-cmd");

    // Broadcasts
    this.broadcastText = document.getElementById("copilot-broadcast-text");
    this.btnCopyBroadcast = document.getElementById("btn-copy-broadcast");
    this.btnPlayBroadcast = document.getElementById("btn-play-broadcast");
    this.btnDispatchBroadcast = document.getElementById("btn-dispatch-broadcast");

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
        body: JSON.stringify({ station_id: stnId })
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

    utterance.rate = 0.95;
    utterance.pitch = 1.0;
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
        body: JSON.stringify({ query: query, station_id: stnId })
      });
      const data = await res.json();
      this.updateMessage(loadingId, data.answer, `${data.responder} • ${data.timestamp}`);
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

    // Convert simple markdown bold/bullets
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

  updateMessage(msgId, text, meta) {
    const bubble = document.getElementById(msgId);
    if (!bubble) return;
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n- /g, "<br>• ")
      .replace(/\n/g, "<br>");

    bubble.innerHTML = `
      <div>${formatted}</div>
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
    const sup = iap.resource_matrix ? iap.resource_matrix.supplies : {};
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>NDMA Incident Action Plan - ${iap.station_name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 30px; color: #1e293b; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 22px; font-weight: bold; color: #0f172a; }
          .subtitle { font-size: 14px; color: #64748b; }
          .badge { display: inline-block; padding: 4px 10px; background: #dc2626; color: #fff; font-weight: bold; border-radius: 4px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 13px; }
          th { background: #f1f5f9; font-weight: 600; }
          .section-title { font-size: 16px; font-weight: bold; margin-top: 20px; border-left: 4px solid #3b82f6; padding-left: 8px; }
          pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; font-size: 12px; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="badge">NDMA FORM 201 / 204 • GOVARDHANA GIRI 2.0</div>
          <div class="title">INCIDENT ACTION PLAN (IAP)</div>
          <div class="subtitle">Location: ${iap.station_name}, ${iap.mandal}, ${iap.district} | Generated: ${iap.generated_at}</div>
        </div>

        <div class="section-title">1. Operational Status & Threat Summary</div>
        <table>
          <tr><th>Hazard Risk Level</th><td><strong>${iap.risk_level}</strong></td><th>Evacuation Lead Time</th><td><strong>${iap.lead_time_hours} Hours</strong></td></tr>
          <tr><th>Riparian Population</th><td>${iap.population.toLocaleString()}</td><th>Flood Predicted</th><td>${iap.flood_predicted ? "YES (Imminent)" : "NO (Monitoring)"}</td></tr>
        </table>

        <div class="section-title">2. NDMA Mandated Resource Matrix (48-Hour Operational Reserve)</div>
        <table>
          <tr><th>Food Packets (3 meals x 48h)</th><td>${(sup.food_packets_48h || 0).toLocaleString()} Packets</td></tr>
          <tr><th>Clean Potable Water</th><td>${(sup.water_liters_48h || 0).toLocaleString()} Liters (${sup.water_tankers_10k_L || 0} Tankers @ 10k L)</td></tr>
          <tr><th>SDRF Inflatable Rescue Boats</th><td>${sup.sdrf_inflatable_rescue_boats || 0} Motorized IRBs</td></tr>
          <tr><th>Life Jackets</th><td>${(sup.life_jackets_distributed || 0).toLocaleString()} Units</td></tr>
          <tr><th>Medical Triage Tents</th><td>${sup.medical_triage_tents || 0} Tents (${(sup.ors_chlorine_sachets || 0).toLocaleString()} ORS/Chlorine Sachets)</td></tr>
          <tr><th>First Responders</th><td>${sup.sdrf_ndrf_personnel || 0} SDRF / NDRF Personnel</td></tr>
        </table>

        <div class="section-title">3. Multi-Agent Deliberation & Command Directive</div>
        <pre>${iap.deliberation ? iap.deliberation.commander_synthesis.full_iap : ""}</pre>

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
