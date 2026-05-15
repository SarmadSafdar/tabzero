// PASTE YOUR GROQ API KEY BELOW — never share this key publicly
const GROQ_API_KEY = "PASTE_YOUR_KEY_HERE";
const GROQ_MODEL = "llama-3.3-70b-versatile";

const CLIENTS = {
  "acme corp": {
    name: "Acme Corp",
    tier: "Enterprise",
    contact: "John Smith",
    phone: "+1 919 555 0101",
    email: "jsmith@acmecorp.com",
    environment: "VMware vCloud + M365",
    vpn: "vpn.acmecorp.com",
    vms: [
      { name: "ACME-DC01", status: "green" },
      { name: "ACME-FS01", status: "green" },
      { name: "ACME-APP02", status: "red" },
    ],
    openTickets: 2,
    notes: "Citrix environment — use dedicated admin account. Escalate AD issues to Julio.",
  },
  "techstart": {
    name: "TechStart LLC",
    tier: "Business",
    contact: "Sara Lee",
    phone: "+1 704 555 0188",
    email: "sara@techstart.io",
    environment: "M365 + Mimecast",
    vpn: "N/A",
    vms: [
      { name: "TS-MAIL01", status: "green" },
      { name: "TS-WEB01", status: "yellow" },
    ],
    openTickets: 1,
    notes: "Mimecast admin portal access required for email issues. Contact Sara only.",
  },
  "globalmed": {
    name: "GlobalMed Health",
    tier: "Enterprise",
    contact: "Dr. Raj Patel",
    phone: "+1 336 555 0244",
    email: "raj.patel@globalmed.org",
    environment: "VMware + Citrix + M365",
    vpn: "vpn.globalmed.org",
    vms: [
      { name: "GM-DC01", status: "green" },
      { name: "GM-CITRIX01", status: "green" },
      { name: "GM-SQL01", status: "green" },
    ],
    openTickets: 0,
    notes: "HIPAA environment — do NOT share client data over email. All changes require change ticket approval.",
  }
};

const TEMPLATES = [
  "We have received your request and are currently investigating the issue.",
  "We have identified the root cause and are implementing a resolution.",
  "The issue has been resolved. Please confirm everything is working on your end.",
  "We are escalating this to our Tier 2 team for further investigation.",
  "We are monitoring the environment following the fix to ensure stability."
];

// Timer
let seconds = 0;
setInterval(() => {
  seconds++;
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  document.getElementById("timer").textContent = `${m}:${s}`;
}, 1000);

let currentClient = null;
let lastAIResponse = "";

async function analyzeIssue() {
  const issue = document.getElementById("issue-input").value.trim();
  if (!issue || !currentClient) return;

  const btn = document.getElementById("analyze-btn");
  const aiBox = document.getElementById("ai-box");

  btn.disabled = true;
  btn.textContent = "Analyzing...";

  aiBox.innerHTML = `
    <div class="ai-response">
      <div class="ai-header">
        <div class="ai-dot"></div>
        AI is analyzing the issue...
      </div>
      <div class="loading">Reading ticket and finding solutions...</div>
    </div>`;

  const prompt = `You are a Tier 1 cloud support engineer assistant. A client has reported an issue and you need to help the engineer resolve it quickly.

CLIENT: ${currentClient.name}
ENVIRONMENT: ${currentClient.environment}
NOTES: ${currentClient.notes}
VM STATUS: ${currentClient.vms.map(v => `${v.name}: ${v.status}`).join(", ")}

ISSUE REPORTED: ${issue}

Respond with exactly these 4 sections, keep it short, engineers are on a live call:

1. LIKELY CAUSE
(1-2 sentences max)

2. STEPS TO FIX
(max 4 numbered steps)

3. CLIENT RESPONSE
(ready to copy and send, professional, 2-3 sentences)

4. ESCALATE?
(Yes or No, one sentence reason)`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: "You are a concise IT support assistant. Always respond in the exact format requested. Never add extra commentary."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.2
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text) throw new Error("Empty response from AI.");

    lastAIResponse = text;

    aiBox.innerHTML = `
      <div class="ai-response">
        <div class="ai-header">✦ AI Analysis</div>
        <div class="ai-content">${text}</div>
        <button class="copy-ai-btn" id="copy-ai-btn">Copy Client Response</button>
      </div>`;

    document.getElementById("copy-ai-btn").addEventListener("click", function() {
      const match = text.match(/3\.\s*CLIENT RESPONSE[\s\S]*?\n([\s\S]*?)(?=\n4\.|$)/i);
      const toCopy = match ? match[1].trim() : text;
      navigator.clipboard.writeText(toCopy);
      this.textContent = "✓ Copied!";
      this.classList.add("copied");
      setTimeout(() => {
        this.textContent = "Copy Client Response";
        this.classList.remove("copied");
      }, 2000);
    });

  } catch (err) {
    aiBox.innerHTML = `
      <div class="ai-response">
        <div class="ai-header" style="color:#ef4444">Error</div>
        <div class="ai-content" style="color:#ef4444">
          ${err.message}
        </div>
      </div>`;
  }

  btn.disabled = false;
  btn.textContent = "✦ Analyze with AI";
}

function renderClient(c) {
  currentClient = c;

  const vmRows = c.vms.map(vm => `
    <div class="info-row">
      <div class="status-dot ${vm.status}"></div>
      <span style="color:#F5F0E8;font-weight:600;margin-left:0">${vm.name}</span>
      <span style="margin-left:auto;font-size:10px;font-weight:700;color:${
        vm.status === "green" ? "#10b981" :
        vm.status === "red" ? "#ef4444" : "#f59e0b"
      }">
        ${vm.status === "green" ? "Online" :
          vm.status === "red" ? "Offline" : "Warning"}
      </span>
    </div>`).join("");

  const templateBtns = TEMPLATES.map((t, i) => `
    <button class="template-btn" data-index="${i}">
      ${t.substring(0, 55)}...
    </button>`).join("");

  document.getElementById("content").innerHTML = `
    <div class="client-card">
      <div class="client-header">
        <div class="client-name">${c.name}</div>
        <div class="client-tier">${c.tier}</div>
      </div>
      <div class="info-row">👤 Contact <span>${c.contact}</span></div>
      <div class="info-row">📞 Phone <span>${c.phone}</span></div>
      <div class="info-row">✉️ Email <span>${c.email}</span></div>
      <div class="info-row">💻 Environment <span>${c.environment}</span></div>
      <div class="info-row">🎫 Open Tickets
        <span style="color:${c.openTickets > 0 ? "#f59e0b" : "#10b981"}">
          ${c.openTickets}
        </span>
      </div>
    </div>

    <div class="section-title">VM / vApp Status</div>
    <div class="client-card">${vmRows}</div>

    <div class="section-title">Notes</div>
    <div class="client-card">
      <div class="info-row" style="font-style:italic;font-size:11px;
        padding:12px 16px;color:#888;display:block">
        ${c.notes}
      </div>
    </div>

    <div class="section-title">Describe the Issue — AI Will Analyze It</div>
    <div class="issue-box">
      <textarea id="issue-input"
        placeholder="e.g. Client cannot connect to Citrix, getting black screen since this morning...">
      </textarea>
      <button class="analyze-btn" id="analyze-btn">✦ Analyze with AI</button>
    </div>

    <div id="ai-box"></div>

    <div class="section-title">Quick Response Templates</div>
    ${templateBtns}
    <div style="height:12px"></div>
  `;

  document.getElementById("analyze-btn").addEventListener("click", analyzeIssue);

  document.querySelectorAll(".template-btn").forEach(btn => {
    btn.addEventListener("click", function() {
      const index = parseInt(this.getAttribute("data-index"));
      navigator.clipboard.writeText(TEMPLATES[index]);
      this.classList.add("copied");
      this.textContent = "✓ Copied!";
      setTimeout(() => {
        this.classList.remove("copied");
        this.textContent = TEMPLATES[index].substring(0, 55) + "...";
      }, 2000);
    });
  });
}

function searchClient(query) {
  const key = query.toLowerCase().trim();
  const content = document.getElementById("content");

  if (!key) {
    currentClient = null;
    content.innerHTML = `
      <div class="no-client">
        <div style="font-size:28px">🔍</div>
        <p>Type a client name to load their profile</p>
      </div>`;
    return;
  }

  const match = Object.keys(CLIENTS).find(k => k.includes(key));

  if (!match) {
    currentClient = null;
    content.innerHTML = `
      <div class="no-client">
        <div style="font-size:28px">❌</div>
        <p>No client found for "${query}"</p>
      </div>`;
    return;
  }

  renderClient(CLIENTS[match]);
}

document.getElementById("search").addEventListener("input", function() {
  searchClient(this.value);
});