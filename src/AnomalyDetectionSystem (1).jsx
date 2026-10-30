import { useState, useEffect, useRef, useCallback } from "react";

// ─── Theme palettes ──────────────────────────────────────────────────────────
const DARK = {
  bg: "#0d1117", panel: "#161b27", panelAlt: "#1c2333",
  border: "#21293d", borderHover: "#3a4a6b",
  accent: "#00e5b0", accentDim: "#00e5b018",
  warn: "#f97316", warnDim: "#f9731618",
  danger: "#f43f5e", dangerDim: "#f43f5e18",
  hack: "#a855f7", hackDim: "#a855f718",
  muted: "#374162", text: "#e2e8f8", textDim: "#64748b",
  textStrong: "#ffffff", cardShadow: "0 2px 12px #00000040",
};
const LIGHT = {
  bg: "#f0f4ff", panel: "#ffffff", panelAlt: "#f8faff",
  border: "#dde3f0", borderHover: "#a3b4d6",
  accent: "#0077cc", accentDim: "#0077cc15",
  warn: "#ea6c00", warnDim: "#ea6c0015",
  danger: "#dc2626", dangerDim: "#dc262615",
  hack: "#7c3aed", hackDim: "#7c3aed15",
  muted: "#c4cfe8", text: "#334155", textDim: "#94a3b8",
  textStrong: "#0f172a", cardShadow: "0 2px 12px #c8d6ef40",
};

// ─── Attack scenarios ────────────────────────────────────────────────────────
const ATTACK_TYPES = [
  {
    id: "ddos", name: "DDoS Flood", icon: "🌊", color: "#3b82f6",
    description: "Distributed Denial-of-Service flooding endpoints with 847k req/s from 12,400 botnet nodes across 38 countries.",
    phases: [
      "Botnet activation — 12,400 compromised nodes coming online",
      "SYN flood — TCP handshake table exhaustion in progress",
      "UDP amplification via DNS reflection — 3.2 Tbps peak",
      "Load balancer overwhelmed — dropping legitimate traffic",
      "API gateway saturated — 503 errors cascading system-wide",
    ],
    metrics: { rps: 980, latency: 590, errors: 28, cpu: 97 },
  },
  {
    id: "ransomware", name: "Ransomware", icon: "🔒", color: "#ef4444",
    description: "LockBit 3.0 encrypting filesystem via AES-256 + RSA-2048. Lateral movement via SMB across 6 nodes detected.",
    phases: [
      "Initial access via phishing email — malicious macro executed",
      "Privilege escalation — CVE-2024-1234 local exploit deployed",
      "Lateral movement — SMB relay across subnet 10.0.1.0/24",
      "Shadow copies deleted — vssadmin.exe terminated",
      "Encryption active — 94,218 files locked, ransom note dropped",
    ],
    metrics: { disk: 390, cpu: 94, mem: 91, errors: 22 },
  },
  {
    id: "mitm", name: "Man-in-the-Middle", icon: "👁️", color: "#f97316",
    description: "ARP poisoning active. Attacker intercepting TLS traffic between API server and DB. Cert spoofing on LAN.",
    phases: [
      "ARP cache poisoning — gateway MAC overwritten on 4 hosts",
      "SSL stripping — HTTPS downgraded to HTTP",
      "Fake cert injected — CN=internal-db.corp spoofed",
      "Credential harvesting — 3 DB passwords captured in plaintext",
      "Session tokens extracted — 14 active sessions hijacked",
    ],
    metrics: { latency: 340, errors: 15, mem: 78 },
  },
  {
    id: "cryptojack", name: "Cryptojacking", icon: "⛏️", color: "#a855f7",
    description: "Monero miner (XMRig) on 5 servers. CPU at 99%. C2 beacon to pool.minexmr.com:4444 every 60s.",
    phases: [
      "Dropper via vulnerable npm package (event-stream fork)",
      "XMRig unpacked to /tmp/.systemd-cache/ — hidden process",
      "CPU governor to performance — thermal limits disabled",
      "Persistence via crontab + systemd service",
      "Mining active — 4.7 H/s per node, C2 beacon active",
    ],
    metrics: { cpu: 99, mem: 88, disk: 280, rps: 45 },
  },
  {
    id: "sqli", name: "SQL Injection", icon: "💉", color: "#10b981",
    description: "Blind SQLi campaign on /api/users via sqlmap. Extracting schema + dumping 128k-row credentials table.",
    phases: [
      "Reconnaissance — 4,200 malformed queries probing validation",
      "Boolean-based blind SQLi confirmed — timing attack active",
      "Database schema extracted — 23 tables enumerated",
      "Credential dump — users table (128,430 rows) exfiltrating",
      "xp_cmdshell escalation — OS command execution active",
    ],
    metrics: { errors: 19, latency: 280, rps: 620 },
  },
];

// ─── Network topology ────────────────────────────────────────────────────────
const NET_NODES = [
  { id: "internet", label: "Internet",       icon: "🌐", type: "external",  x: 400, y: 40  },
  { id: "fw",       label: "Firewall",        icon: "🔥", type: "security",  x: 400, y: 130 },
  { id: "lb",       label: "Load Balancer",   icon: "⚖️",  type: "infra",     x: 400, y: 220 },
  { id: "gw-01",    label: "API Gateway",     icon: "🔀", type: "gateway",   x: 400, y: 310 },
  { id: "srv-01",   label: "API Server 01",   icon: "🖥",  type: "server",    x: 200, y: 410 },
  { id: "srv-02",   label: "API Server 02",   icon: "🖥",  type: "server",    x: 600, y: 410 },
  { id: "cache",    label: "Redis Cache",     icon: "⚡", type: "cache",     x: 100, y: 510 },
  { id: "wrk-01",   label: "Worker Node",     icon: "⚙️",  type: "worker",    x: 310, y: 510 },
  { id: "ml",       label: "ML Engine",       icon: "🧠", type: "ml",        x: 490, y: 510 },
  { id: "db-01",    label: "MongoDB Primary", icon: "🗄",  type: "database",  x: 280, y: 620 },
  { id: "db-02",    label: "MongoDB Replica", icon: "🗄",  type: "database",  x: 520, y: 620 },
  { id: "mon",      label: "Prometheus",      icon: "📊", type: "monitoring",x: 700, y: 510 },
];

const NET_EDGES = [
  ["internet","fw"], ["fw","lb"], ["lb","gw-01"],
  ["gw-01","srv-01"], ["gw-01","srv-02"],
  ["srv-01","cache"], ["srv-01","wrk-01"], ["srv-01","db-01"],
  ["srv-02","ml"],    ["srv-02","db-02"],
  ["db-01","db-02"],  ["srv-01","mon"], ["srv-02","mon"],
  ["wrk-01","db-01"], ["ml","db-02"],
];

const NODE_COLORS = {
  external: "#64748b", security: "#f97316", infra: "#3b82f6",
  gateway: "#8b5cf6", server: "#00e5b0", cache: "#eab308",
  worker: "#06b6d4", database: "#7c6ff7", ml: "#a855f7",
  monitoring: "#f43f5e",
};

const DEVICES = [
  { id: "srv-01", name: "API Server 01",   type: "server",   ip: "10.0.1.10" },
  { id: "srv-02", name: "API Server 02",   type: "server",   ip: "10.0.1.11" },
  { id: "db-01",  name: "MongoDB Primary", type: "database", ip: "10.0.2.10" },
  { id: "db-02",  name: "MongoDB Replica", type: "database", ip: "10.0.2.11" },
  { id: "gw-01",  name: "API Gateway",     type: "gateway",  ip: "10.0.0.1"  },
  { id: "wrk-01", name: "Worker Node",     type: "worker",   ip: "10.0.3.10" },
];

const METRICS_CONFIG = [
  { id: "cpu",     label: "CPU Usage",   unit: "%",    base: 45,  min: 0, max: 100,  color: "#00e5b0" },
  { id: "mem",     label: "Memory",      unit: "%",    base: 62,  min: 0, max: 100,  color: "#8b5cf6" },
  { id: "latency", label: "API Latency", unit: "ms",   base: 120, min: 0, max: 600,  color: "#f97316" },
  { id: "rps",     label: "Req/sec",     unit: "rps",  base: 340, min: 0, max: 1000, color: "#3b82f6" },
  { id: "errors",  label: "Error Rate",  unit: "%",    base: 1.2, min: 0, max: 30,   color: "#f43f5e" },
  { id: "disk",    label: "Disk I/O",    unit: "MB/s", base: 85,  min: 0, max: 400,  color: "#ec4899" },
];

// ─── ML helpers ──────────────────────────────────────────────────────────────
function anomalyScore(value, history) {
  if (history.length < 10) return 0;
  const vals = history.slice(-50);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length) || 1;
  return Math.min(1, Math.abs(value - mean) / std / 4);
}
function genMetric(prev, burst, target) {
  if (target !== undefined) return prev + (target - prev) * 0.18 + (Math.random() - 0.5) * 3;
  const spike = burst && Math.random() > 0.6;
  const drift = prev + (Math.random() - 0.49) * 4;
  return spike ? drift + (Math.random() > 0.5 ? 40 : -40) : drift;
}
function initMetrics() {
  return Object.fromEntries(
    METRICS_CONFIG.map((m) => [m.id, { current: m.base, history: Array(60).fill(m.base), score: 0, anomalous: false }])
  );
}

// ─── Sparkline ───────────────────────────────────────────────────────────────
function Sparkline({ data, color, anomalous, P }) {
  const w = 160, h = 40;
  const lo = Math.min(...data), hi = Math.max(...data) || lo + 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - lo) / (hi - lo)) * h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={anomalous ? P.danger : color} strokeWidth="2"
        style={{ transition: "stroke 0.3s" }} />
    </svg>
  );
}

// ─── NEW: MetricDetailPanel ───────────────────────────────────────────────────
function MetricDetailPanel({ metricId, metrics, onClose, P }) {
  if (!metricId) return null;
  const cfg = METRICS_CONFIG.find(c => c.id === metricId);
  if (!cfg) return null;
  const m = metrics[metricId];

  // Rolling mean (window = 10)
  const windowSize = 10;
  const movingAvg = m.history.map((_, i, arr) => {
    const slice = arr.slice(Math.max(0, i - windowSize + 1), i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });

  const data = m.history;
  const lo = Math.min(...data);
  const hi = Math.max(...data) || lo + 1;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const minVal = lo;
  const maxVal = hi;

  const W = 500, H = 140;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - lo) / (hi - lo || 1)) * H}`).join(" ");
  const mapts = movingAvg.map((v, i) => `${(i / (movingAvg.length - 1)) * W},${H - ((v - lo) / (hi - lo || 1)) * H}`).join(" ");

  // Correlation with 1-2 other metrics
  const correlPairs = METRICS_CONFIG.filter(c => c.id !== metricId).slice(0, 2);
  function pearson(a, b) {
    const n = Math.min(a.length, b.length);
    const ax = a.slice(-n), bx = b.slice(-n);
    const ma = ax.reduce((s,v)=>s+v,0)/n, mb = bx.reduce((s,v)=>s+v,0)/n;
    const num = ax.reduce((s,v,i)=>s+(v-ma)*(bx[i]-mb),0);
    const den = Math.sqrt(ax.reduce((s,v)=>s+(v-ma)**2,0)*bx.reduce((s,v)=>s+(v-mb)**2,0))||1;
    return num/den;
  }

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 560, zIndex: 800,
      background: P.panel, borderLeft: `2px solid ${cfg.color}60`,
      boxShadow: `-20px 0 60px rgba(0,0,0,0.4)`,
      display: "flex", flexDirection: "column",
      transform: "translateX(0)",
      animation: "slideInPanel 0.35s cubic-bezier(0.22,1,0.36,1)",
      overflow: "hidden",
    }}>
      <style>{`@keyframes slideInPanel { from { transform: translateX(100%); opacity:0.3; } to { transform: translateX(0); opacity:1; } }`}</style>

      {/* Header */}
      <div style={{
        padding: "18px 22px 16px", borderBottom: `1px solid ${P.border}`,
        background: `linear-gradient(135deg, ${cfg.color}12, transparent)`,
        display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
      }}>
        <div>
          <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 800, fontSize: 18, color: P.textStrong, letterSpacing: -0.5 }}>{cfg.label}</div>
          <div style={{ fontSize: 10, color: cfg.color, fontWeight: 700, letterSpacing: 1, fontFamily: "JetBrains Mono, monospace", marginTop: 2 }}>METRIC DEEP DIVE · {data.length} SAMPLES</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: m.anomalous ? P.danger : cfg.color, fontFamily: "Space Grotesk, sans-serif", lineHeight: 1, letterSpacing: -1 }}>{m.current.toFixed(1)}</div>
            <div style={{ fontSize: 10, color: P.textDim, fontFamily: "JetBrains Mono, monospace" }}>{cfg.unit}</div>
          </div>
          <button onClick={onClose} style={{ background: P.panelAlt, border: `1px solid ${P.border}`, color: P.textDim, borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "MIN", value: minVal.toFixed(1), color: P.accent },
            { label: "MAX", value: maxVal.toFixed(1), color: m.anomalous ? P.danger : P.warn },
            { label: "MEAN", value: mean.toFixed(1), color: cfg.color },
            { label: "SCORE", value: `${(m.score*100).toFixed(0)}%`, color: m.score > 0.5 ? P.danger : P.accent },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: P.panelAlt, borderRadius: 10, padding: "10px 12px", border: `1px solid ${P.border}` }}>
              <div style={{ fontSize: 9, color: P.textDim, letterSpacing: 1, fontFamily: "JetBrains Mono, monospace", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "Space Grotesk, sans-serif" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Enlarged time-series graph with moving average */}
        <div style={{ background: P.panelAlt, border: `1px solid ${P.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: P.textDim, letterSpacing: 0.8, fontFamily: "JetBrains Mono, monospace" }}>TIME SERIES (60s window)</div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 20, height: 2, background: cfg.color, borderRadius: 1 }} />
                <span style={{ fontSize: 9, color: P.textDim }}>Live</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 20, height: 2, background: "#fff", borderRadius: 1, opacity: 0.5 }} />
                <span style={{ fontSize: 9, color: P.textDim }}>MA(10)</span>
              </div>
            </div>
          </div>
          <svg width="100%" viewBox={`0 0 ${W} ${H + 10}`} style={{ overflow: "visible", display: "block" }}>
            <defs>
              <linearGradient id={`fill-${metricId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cfg.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={cfg.color} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {/* Fill area */}
            <polygon
              points={`0,${H} ${pts} ${W},${H}`}
              fill={`url(#fill-${metricId})`}
            />
            {/* Main line */}
            <polyline points={pts} fill="none" stroke={m.anomalous ? P.danger : cfg.color} strokeWidth="2.5" strokeLinejoin="round" />
            {/* Moving average */}
            <polyline points={mapts} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeDasharray="5 3" strokeLinejoin="round" />
            {/* Mean line */}
            <line x1={0} y1={H - ((mean - lo) / (hi - lo || 1)) * H} x2={W} y2={H - ((mean - lo) / (hi - lo || 1)) * H}
              stroke={cfg.color} strokeWidth="1" strokeDasharray="3 6" opacity="0.4" />
            {/* Axis labels */}
            <text x={0} y={H + 10} fill={P.textDim} fontSize="9" fontFamily="JetBrains Mono, monospace">-60s</text>
            <text x={W} y={H + 10} textAnchor="end" fill={P.textDim} fontSize="9" fontFamily="JetBrains Mono, monospace">now</text>
            <text x={W + 4} y={H - ((mean - lo) / (hi - lo || 1)) * H + 3} fill={cfg.color} fontSize="8" opacity="0.6">avg</text>
          </svg>
        </div>

        {/* Anomaly score bar */}
        {m.anomalous && (
          <div style={{ background: P.danger+"15", border: `1px solid ${P.danger}40`, borderRadius: 10, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚠</span>
            <div>
              <div style={{ fontSize: 11, color: P.danger, fontWeight: 700, marginBottom: 2 }}>ANOMALY DETECTED</div>
              <div style={{ fontSize: 11, color: P.text }}>Value deviates {Math.abs(m.current - mean).toFixed(1)}{cfg.unit} from rolling mean. Anomaly score: {(m.score * 100).toFixed(0)}%</div>
            </div>
          </div>
        )}

        {/* Correlation hints */}
        <div style={{ background: P.panelAlt, border: `1px solid ${P.border}`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, color: P.textDim, letterSpacing: 0.8, fontFamily: "JetBrains Mono, monospace", marginBottom: 12 }}>CORRELATION ANALYSIS</div>
          {correlPairs.map(other => {
            const r = pearson(m.history, metrics[other.id].history);
            const pct = Math.abs(r) * 100;
            const direction = r > 0.2 ? "positive" : r < -0.2 ? "negative" : "weak";
            const dirColor = direction === "positive" ? P.accent : direction === "negative" ? P.warn : P.textDim;
            return (
              <div key={other.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: other.color }} />
                    <span style={{ fontSize: 12, color: P.text, fontWeight: 600 }}>{cfg.label} <span style={{ color: P.textDim }}>vs</span> {other.label}</span>
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}>
                    <span style={{ color: dirColor, fontWeight: 700 }}>r = {r.toFixed(2)}</span>
                    <span style={{ color: P.textDim, marginLeft: 8 }}>{direction}</span>
                  </div>
                </div>
                <div style={{ background: P.border, borderRadius: 4, height: 5 }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: dirColor, transition: "width 0.4s" }} />
                </div>
                <div style={{ fontSize: 10, color: P.textDim, marginTop: 3 }}>
                  {direction === "positive" ? `${cfg.label} and ${other.label} tend to rise together` :
                   direction === "negative" ? `${cfg.label} inversely correlates with ${other.label}` :
                   `No significant correlation detected between ${cfg.label} and ${other.label}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── GaugeArc ────────────────────────────────────────────────────────────────
function GaugeArc({ score, color, P }) {
  const r = 22, cx = 28, cy = 28, c = Math.PI * r;
  return (
    <svg width={56} height={32} style={{ overflow: "visible" }}>
      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={P.border} strokeWidth="4" />
      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none"
        stroke={score > 0.7 ? P.danger : score > 0.4 ? P.warn : color}
        strokeWidth="4" strokeDasharray={`${score*c} ${c-score*c}`}
        style={{ transition: "stroke-dasharray 0.4s, stroke 0.4s" }} />
    </svg>
  );
}

// ─── Alert item ───────────────────────────────────────────────────────────────
function AlertItem({ alert, onDismiss, P }) {
  const isAttack = alert.type === "attack";
  const sev = isAttack ? alert.severity : (alert.score > 0.8 ? "CRITICAL" : alert.score > 0.5 ? "HIGH" : "MEDIUM");
  const col = sev === "CRITICAL" ? P.danger : sev === "HIGH" ? P.warn : isAttack ? P.hack : P.accent;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      background: col+"18", border: `1px solid ${col}50`, borderLeft: `3px solid ${col}`,
      borderRadius: 8, padding: "9px 12px", marginBottom: 6, animation: "slideIn 0.3s ease",
    }}>
      {isAttack && <span style={{ fontSize: 16, lineHeight: 1.5, flexShrink: 0 }}>{alert.icon}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
          <span style={{ color: col, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>{sev}</span>
          <span style={{ color: P.textDim, fontSize: 10 }}>{alert.time}</span>
        </div>
        <div style={{ color: P.text, fontSize: 12, lineHeight: 1.4 }}>
          {isAttack
            ? <><b style={{ color: P.textStrong }}>[{alert.attackName}]</b> {alert.message}</>
            : <><b style={{ color: P.textStrong }}>{alert.metric}</b> anomaly — score <b>{(alert.score*100).toFixed(0)}%</b>, value <b>{alert.value}</b></>
          }
        </div>
      </div>
      {onDismiss && (
        <button onClick={() => onDismiss(alert.id)} style={{ background: "none", border: "none", color: P.textDim, cursor: "pointer", fontSize: 16, padding: "0 2px", lineHeight: 1, flexShrink: 0 }}>×</button>
      )}
    </div>
  );
}

// ─── Toast notifications ──────────────────────────────────────────────────────
function Toast({ toasts, P }) {
  return (
    <div style={{ position: "fixed", top: 70, right: 20, zIndex: 9999, width: 340, pointerEvents: "none" }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: P.panel, border: `1px solid ${t.color}60`, borderLeft: `4px solid ${t.color}`,
          borderRadius: 10, padding: "12px 16px", marginBottom: 10,
          boxShadow: `0 8px 30px ${t.color}25`, animation: "toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ color: t.color, fontWeight: 700, fontSize: 11, letterSpacing: 0.5 }}>{t.title}</span>
          </div>
          <div style={{ color: P.text, fontSize: 11, lineHeight: 1.5 }}>{t.message}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Device card (sidebar) ────────────────────────────────────────────────────
function DeviceCard({ device, status, P }) {
  const icons = { server: "🖥", database: "🗄", gateway: "🔀", worker: "⚙️" };
  const col = status === "hijacked" ? P.danger : status === "compromising" ? P.warn : P.accent;
  return (
    <div style={{
      background: P.bg, border: `1px solid ${status === "hijacked" ? P.danger+"70" : status === "compromising" ? P.warn+"50" : P.border}`,
      borderRadius: 8, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8,
      transition: "border-color 0.4s", boxShadow: status === "hijacked" ? `0 0 10px ${P.danger}25` : "none",
    }}>
      <span style={{ fontSize: 18, filter: status === "hijacked" ? "grayscale(1) brightness(0.5)" : "none", transition: "filter 0.5s" }}>
        {icons[device.type]}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: P.textStrong, fontWeight: 700 }}>{device.name}</div>
        <div style={{ fontSize: 10, color: P.textDim }}>{device.ip}</div>
      </div>
      <div style={{ fontSize: 9, color: col, fontWeight: 700, letterSpacing: 0.3, animation: status === "compromising" ? "pulse 1s infinite" : "none" }}>
        {status === "hijacked" ? "☠ HIJACKED" : status === "compromising" ? "⚡ BREACH" : "✓ OK"}
      </div>
    </div>
  );
}

// ─── Attack banner ────────────────────────────────────────────────────────────
function AttackBanner({ attack, phase, deviceStatuses, onResolve, P }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${attack.color}18, ${P.danger}0c)`,
      border: `1px solid ${attack.color}60`, borderRadius: 12, padding: "16px 20px", marginBottom: 20,
      boxShadow: `0 0 30px ${attack.color}20`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 32, animation: "pulse 1.5s infinite" }}>{attack.icon}</span>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <span style={{ color: attack.color, fontWeight: 800, fontSize: 14, fontFamily: "Space Grotesk, sans-serif" }}>
                ☠ ACTIVE ATTACK: {attack.name.toUpperCase()}
              </span>
              <span style={{ background: P.danger, color: "#fff", fontSize: 9, padding: "2px 8px", borderRadius: 20, fontWeight: 700, animation: "pulse 1s infinite" }}>LIVE</span>
            </div>
            <div style={{ color: P.text, fontSize: 12, lineHeight: 1.5, maxWidth: 520 }}>{attack.description}</div>
          </div>
        </div>
        <button onClick={onResolve} style={{
          background: P.accentDim, color: P.accent, border: `1px solid ${P.accent}50`,
          borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontFamily: "inherit",
          fontWeight: 700, fontSize: 11, whiteSpace: "nowrap", flexShrink: 0,
        }}>🛡 CONTAIN &amp; RESOLVE</button>
      </div>

      {phase >= 0 && (
        <div style={{ background: P.bg+"cc", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: attack.color, letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>
            PHASE {phase + 1}/{attack.phases.length}
          </div>
          <div style={{ fontSize: 12, color: P.text, marginBottom: 8 }}>
            <span style={{ color: attack.color }}>▶ </span>{attack.phases[phase]}
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {attack.phases.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= phase ? attack.color : P.border, transition: "background 0.4s" }} />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {DEVICES.map((d) => <DeviceCard key={d.id} device={d} status={deviceStatuses[d.id] || "secure"} P={P} />)}
      </div>
    </div>
  );
}

// ─── Cyber Attack Modal ───────────────────────────────────────────────────────
function CyberAttackModal({ onClose, onLaunch, P }) {
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: P.panel, border: `1px solid ${P.danger}50`, borderRadius: 16, width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto", boxShadow: `0 20px 80px ${P.danger}25` }}>
        {/* Header */}
        <div style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${P.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: `linear-gradient(135deg, ${P.danger}12, transparent)` }}>
          <div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 800, fontSize: 20, color: P.danger }}>☠ Cyber Attack Simulator</div>
            <div style={{ fontSize: 11, color: P.textDim, marginTop: 2 }}>Select an attack vector to simulate a full device hijack scenario</div>
          </div>
          <button onClick={onClose} style={{
            background: P.panelAlt, border: `1px solid ${P.border}`, color: P.textDim,
            borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 300,
          }}>×</button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ background: P.warnDim, border: `1px solid ${P.warn}40`, borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 11, color: P.warn, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ flexShrink: 0 }}>⚠</span>
            <span><b>SIMULATION MODE</b> — Injects synthetic attack telemetry into the monitoring pipeline. No real systems are affected.</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {ATTACK_TYPES.map((a) => (
              <div key={a.id} onClick={() => setSelected(a.id === selected ? null : a.id)} style={{
                background: selected === a.id ? a.color+"15" : P.panelAlt,
                border: `2px solid ${selected === a.id ? a.color : P.border}`,
                borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "all 0.2s",
                boxShadow: selected === a.id ? `0 0 20px ${a.color}20` : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{a.icon}</span>
                  <span style={{ color: selected === a.id ? a.color : P.textStrong, fontWeight: 700, fontSize: 13 }}>{a.name}</span>
                </div>
                <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.5 }}>{a.description}</div>
                {selected === a.id && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${a.color}30` }}>
                    <div style={{ fontSize: 10, color: a.color, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>ATTACK PHASES</div>
                    {a.phases.map((p, i) => (
                      <div key={i} style={{ fontSize: 11, color: P.text, marginBottom: 4, display: "flex", gap: 6 }}>
                        <span style={{ color: a.color, minWidth: 14, fontWeight: 700 }}>{i+1}.</span>{p}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button disabled={!selected} onClick={() => selected && onLaunch(ATTACK_TYPES.find(a => a.id === selected))} style={{
            width: "100%", padding: 14, borderRadius: 10, cursor: selected ? "pointer" : "not-allowed",
            background: selected ? P.danger : P.border,
            color: selected ? "#fff" : P.textDim,
            border: "none", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 14,
            letterSpacing: 0.5, transition: "all 0.2s",
            boxShadow: selected ? `0 4px 20px ${P.danger}40` : "none",
          }}>
            {selected ? `☠ Launch ${ATTACK_TYPES.find(a=>a.id===selected)?.name} Attack` : "Select an Attack Type Above"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Node detail popup ────────────────────────────────────────────────────────
function NodePopup({ node, onClose, onOpenDevice, deviceStatuses, metrics, P }) {
  if (!node) return null;
  const status = deviceStatuses[node.id] || "secure";
  const col = NODE_COLORS[node.type] || P.accent;
  const relMetrics = METRICS_CONFIG.filter((_, i) => i < 3);
  const device = DEVICES.find(d => d.id === node.id);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: P.panel, border: `2px solid ${col}60`, borderRadius: 16, width: 360, boxShadow: `0 20px 60px ${col}20` }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${P.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 28 }}>{node.icon}</span>
            <div>
              <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 15, color: P.textStrong }}>{node.label}</div>
              <div style={{ fontSize: 10, color: col, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{node.type}</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: P.panelAlt, border: `1px solid ${P.border}`, color: P.textDim,
            borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>
        <div style={{ padding: "16px 20px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Status", value: status === "hijacked" ? "☠ HIJACKED" : status === "compromising" ? "⚡ BREACHING" : "✓ Secure", color: status === "hijacked" ? P.danger : status === "compromising" ? P.warn : P.accent },
              { label: "Type", value: node.type, color: col },
              { label: "Connections", value: NET_EDGES.filter(e => e.includes(node.id)).length, color: P.text },
              { label: "Uptime", value: status === "hijacked" ? "0%" : "99.9%", color: P.text },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: P.panelAlt, borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: P.textDim, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
          {relMetrics.map((cfg) => {
            const m = metrics[cfg.id];
            return (
              <div key={cfg.id} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: P.textDim }}>{cfg.label}</span>
                  <span style={{ fontSize: 11, color: cfg.color, fontWeight: 700 }}>{m.current.toFixed(1)}{cfg.unit}</span>
                </div>
                <div style={{ background: P.border, borderRadius: 3, height: 4 }}>
                  <div style={{ width: `${Math.min(100, (m.current/cfg.max)*100)}%`, height: "100%", borderRadius: 3, background: cfg.color, transition: "width 0.4s" }} />
                </div>
              </div>
            );
          })}
          {/* NEW: Open Full Dashboard button */}
          {device && onOpenDevice && (
            <button onClick={() => { onOpenDevice(device); onClose(); }} style={{
              marginTop: 14, width: "100%", padding: "10px 14px", borderRadius: 10, cursor: "pointer",
              background: col+"18", color: col, border: `1px solid ${col}50`,
              fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 0.3,
              transition: "all 0.2s",
            }}>
              📊 Open Full Device Dashboard →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── NEW: DeviceDashboard (full-page device view) ────────────────────────────
function DeviceDashboard({ device, deviceStatuses, metrics, alerts, onBack, P }) {
  if (!device) return null;
  const node = NET_NODES.find(n => n.id === device.id);
  const status = deviceStatuses[device.id] || "secure";
  const col = status === "hijacked" ? P.danger : status === "compromising" ? P.warn : P.accent;
  const nodeColor = NODE_COLORS[device.type] || P.accent;

  // Metrics relevant to this device (all 6, but simulate device-specific variance)
  const deviceMetrics = METRICS_CONFIG.map(cfg => {
    const m = metrics[cfg.id];
    // Simulate per-device variance: scale slightly based on device id hash
    const seed = device.id.charCodeAt(0) + device.id.charCodeAt(device.id.length - 1);
    const factor = 0.85 + (seed % 30) / 100;
    return { cfg, current: Math.min(cfg.max, m.current * factor), history: m.history.map(v => Math.min(cfg.max, v * factor)), score: m.score, anomalous: m.anomalous };
  });

  // Alerts filtered by device name/type
  const deviceAlerts = alerts.filter(a =>
    (a.message && a.message.toLowerCase().includes(device.name.toLowerCase())) ||
    (a.message && a.message.includes(device.ip)) ||
    (a.type === "attack" && status !== "secure")
  ).slice(0, 15);

  const W = 220, H = 55;

  return (
    <div style={{ padding: 24 }}>
      {/* Back button + header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button onClick={onBack} style={{
          background: P.panelAlt, border: `1px solid ${P.border}`, color: P.textDim,
          borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12,
          fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
        }}>← Back</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 32 }}>{node?.icon || "🖥"}</span>
          <div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 800, fontSize: 22, color: P.textStrong, letterSpacing: -0.5 }}>{device.name}</div>
            <div style={{ fontSize: 10, color: nodeColor, fontWeight: 700, letterSpacing: 1, fontFamily: "JetBrains Mono, monospace" }}>{device.type.toUpperCase()} · {device.ip}</div>
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <span style={{
            background: col+"20", color: col, fontSize: 11, padding: "6px 14px",
            borderRadius: 20, fontWeight: 700, fontFamily: "JetBrains Mono, monospace",
            border: `1px solid ${col}40`, animation: status !== "secure" ? "pulse 1s infinite" : "none",
          }}>
            {status === "hijacked" ? "☠ HIJACKED" : status === "compromising" ? "⚡ BREACHING" : "✓ SECURE"}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        <div>
          {/* Device info cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "IP Address", value: device.ip, icon: "🌐", color: P.accent },
              { label: "Device Type", value: device.type, icon: "🔧", color: nodeColor },
              { label: "Connections", value: NET_EDGES.filter(e => e.includes(device.id)).length, icon: "🔗", color: P.accent },
              { label: "Uptime", value: status === "hijacked" ? "0%" : "99.9%", icon: "⏱", color: status === "hijacked" ? P.danger : P.accent },
            ].map(({ label, value, icon, color }) => (
              <div key={label} style={{ background: P.panel, border: `1px solid ${P.border}`, borderRadius: 12, padding: "14px 16px", boxShadow: P.cardShadow }}>
                <div style={{ fontSize: 18, marginBottom: 8 }}>{icon}</div>
                <div style={{ fontSize: 10, color: P.textDim, letterSpacing: 0.5, marginBottom: 4, fontFamily: "JetBrains Mono, monospace" }}>{label.toUpperCase()}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color, fontFamily: "Space Grotesk, sans-serif" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Metrics grid */}
          <div style={{ background: P.panel, border: `1px solid ${P.border}`, borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: P.cardShadow }}>
            <div style={{ fontSize: 11, color: P.textDim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14, fontFamily: "JetBrains Mono, monospace" }}>Live Metrics</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {deviceMetrics.map(({ cfg, current, history, score, anomalous }) => {
                const pct = ((current - cfg.min) / (cfg.max - cfg.min)) * 100;
                const lo2 = Math.min(...history), hi2 = Math.max(...history) || lo2 + 1;
                const pts2 = history.map((v, i) => `${(i / (history.length - 1)) * W},${H - ((v - lo2) / (hi2 - lo2)) * H}`).join(" ");
                return (
                  <div key={cfg.id} style={{ background: P.panelAlt, borderRadius: 10, padding: 12, border: `1px solid ${anomalous ? P.danger+"50" : P.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 9, color: P.textDim, letterSpacing: 0.8, textTransform: "uppercase", fontFamily: "JetBrains Mono, monospace" }}>{cfg.label}</span>
                      {anomalous && <span style={{ fontSize: 8, color: P.danger, fontWeight: 700 }}>⚠</span>}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: anomalous ? P.danger : cfg.color, fontFamily: "Space Grotesk, sans-serif", letterSpacing: -0.5, marginBottom: 6 }}>
                      {current.toFixed(1)}<span style={{ fontSize: 10, color: P.textDim, fontWeight: 400, marginLeft: 2 }}>{cfg.unit}</span>
                    </div>
                    <div style={{ background: P.border, borderRadius: 3, height: 3, marginBottom: 8 }}>
                      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", borderRadius: 3, background: anomalous ? P.danger : cfg.color, transition: "width 0.4s" }} />
                    </div>
                    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: H, display: "block", overflow: "hidden" }}>
                      <polyline points={pts2} fill="none" stroke={anomalous ? P.danger : cfg.color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Alerts sidebar */}
        <div>
          <div style={{ background: P.panel, border: `1px solid ${status !== "secure" ? col+"40" : P.border}`, borderRadius: 12, padding: 16, boxShadow: P.cardShadow }}>
            <div style={{ fontSize: 11, color: P.textDim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, fontFamily: "JetBrains Mono, monospace" }}>
              Device Alerts <span style={{ color: col }}>({deviceAlerts.length})</span>
            </div>
            {deviceAlerts.length === 0 ? (
              <div style={{ color: P.textDim, textAlign: "center", padding: "30px 0", fontSize: 12 }}>No alerts for this device</div>
            ) : (
              <div style={{ maxHeight: 460, overflowY: "auto" }}>
                {deviceAlerts.map(a => <AlertItem key={a.id} alert={a} P={P} />)}
              </div>
            )}
          </div>

          {/* Connected neighbors */}
          <div style={{ background: P.panel, border: `1px solid ${P.border}`, borderRadius: 12, padding: 16, marginTop: 16, boxShadow: P.cardShadow }}>
            <div style={{ fontSize: 11, color: P.textDim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, fontFamily: "JetBrains Mono, monospace" }}>Connected Nodes</div>
            {NET_EDGES.filter(e => e.includes(device.id)).map(([a, b]) => {
              const otherId = a === device.id ? b : a;
              const otherNode = NET_NODES.find(n => n.id === otherId);
              if (!otherNode) return null;
              const otherStatus = deviceStatuses[otherId] || "secure";
              const otherCol = otherStatus === "hijacked" ? P.danger : otherStatus === "compromising" ? P.warn : NODE_COLORS[otherNode.type] || P.accent;
              return (
                <div key={otherId} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, padding: "6px 8px", background: P.panelAlt, borderRadius: 8, border: `1px solid ${P.border}` }}>
                  <span style={{ fontSize: 14 }}>{otherNode.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: P.textStrong, fontWeight: 600 }}>{otherNode.label}</div>
                    <div style={{ fontSize: 9, color: P.textDim }}>{otherNode.type}</div>
                  </div>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: otherCol }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Network Graph ────────────────────────────────────────────────────────────
function NetworkGraph({ deviceStatuses, metrics, P, onOpenDevice }) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode]   = useState(null);
  const [animated, setAnimated]         = useState(true);
  const [heatmap, setHeatmap]           = useState(true);
  const [frame, setFrame]               = useState(0);
  const rafRef = useRef(null);

  // ── NEW: getNodeIntensity ──────────────────────────────────────────────────
  function getNodeIntensity(nodeId) {
    const device = DEVICES.find(d => d.id === nodeId);
    const status = deviceStatuses[nodeId] || "secure";
    if (status === "hijacked") return { level: "high", score: 1, color: P.danger };
    if (status === "compromising") return { level: "medium", score: 0.7, color: P.warn };
    if (!device) return { level: "normal", score: 0, color: null };
    const scores = Object.values(metrics).map(m => m.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avgScore > 0.6) return { level: "high", score: avgScore, color: P.danger };
    if (avgScore > 0.3) return { level: "medium", score: avgScore, color: P.warn };
    return { level: "normal", score: avgScore, color: null };
  }

  // ── NEW: getEdgeTrafficWeight ──────────────────────────────────────────────
  function getEdgeTrafficWeight(fromId, toId) {
    const rps = metrics.rps?.current || 0;
    const lat = metrics.latency?.current || 0;
    const rpsNorm = rps / 1000;
    const latNorm = lat / 600;
    const combined = (rpsNorm + latNorm) / 2;
    const isDataPath = ["gw-01","lb","srv-01","srv-02"].includes(fromId) || ["gw-01","lb","srv-01","srv-02"].includes(toId);
    return isDataPath ? 1 + combined * 4 : 1;
  }

  useEffect(() => {
    if (!animated) { cancelAnimationFrame(rafRef.current); return; }
    const loop = () => { setFrame(f => f + 1); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animated]);

  const viewBox = "0 0 800 680";

  return (
    <div style={{ background: P.panel, border: `1px solid ${P.border}`, borderRadius: 14, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ padding: "12px 18px", borderBottom: `1px solid ${P.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 14, color: P.textStrong }}>Network Topology</span>
          <span style={{ fontSize: 11, color: P.textDim, marginLeft: 10 }}>{NET_NODES.length} nodes · {NET_EDGES.length} connections</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Legend */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginRight: 8 }}>
            {[["Secure", P.accent], ["Breaching", P.warn], ["Hijacked", P.danger]].map(([label, color]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                <span style={{ fontSize: 10, color: P.textDim }}>{label}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setHeatmap(h => !h)} style={{
            background: heatmap ? P.warn+"18" : P.panelAlt, border: `1px solid ${heatmap ? P.warn+"50" : P.border}`,
            color: heatmap ? P.warn : P.textDim,
            borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 10, fontFamily: "inherit", fontWeight: 700,
          }}>🌡 {heatmap ? "HEATMAP ON" : "HEATMAP OFF"}</button>
          <button onClick={() => setAnimated(a => !a)} style={{
            background: P.panelAlt, border: `1px solid ${P.border}`, color: animated ? P.accent : P.textDim,
            borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 10, fontFamily: "inherit", fontWeight: 700,
          }}>{animated ? "⏸ PAUSE" : "▶ ANIMATE"}</button>
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <svg viewBox={viewBox} style={{ width: "100%", height: "auto", display: "block", maxHeight: 660 }}>
          <defs>
            {/* Glow filters */}
            <filter id="glow-g"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="glow-r"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            {/* NEW: Heatmap glow filters */}
            <filter id="glow-medium"><feGaussianBlur stdDeviation="6" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="glow-high"><feGaussianBlur stdDeviation="10" result="blur"/><feColorMatrix in="blur" type="saturate" values="3" result="sat"/><feMerge><feMergeNode in="sat"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            {/* Animated packet gradient */}
            <linearGradient id="packetGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00e5b0" stopOpacity="0"/>
              <stop offset="50%" stopColor="#00e5b0" stopOpacity="1"/>
              <stop offset="100%" stopColor="#00e5b0" stopOpacity="0"/>
            </linearGradient>
          </defs>

          {/* Grid background */}
          {Array.from({ length: 17 }).map((_, i) => (
            <line key={`v${i}`} x1={i*50} y1={0} x2={i*50} y2={680} stroke={P.border} strokeWidth="0.5" opacity="0.5" />
          ))}
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i*50} x2={800} y2={i*50} stroke={P.border} strokeWidth="0.5" opacity="0.5" />
          ))}

          {/* Edges */}
          {NET_EDGES.map(([fromId, toId], ei) => {
            const from = NET_NODES.find(n => n.id === fromId);
            const to   = NET_NODES.find(n => n.id === toId);
            if (!from || !to) return null;
            const fromStatus = deviceStatuses[fromId] || "secure";
            const toStatus   = deviceStatuses[toId] || "secure";
            const isAttacked = fromStatus === "hijacked" || toStatus === "hijacked";
            const isBreaching = fromStatus === "compromising" || toStatus === "compromising";
            const edgeColor = isAttacked ? "#f43f5e" : isBreaching ? "#f97316" : P.borderHover;

            // ── NEW: heatmap edge thickness from traffic ──────────────────────
            const trafficWeight = heatmap ? getEdgeTrafficWeight(fromId, toId) : 1;
            const baseWidth = isAttacked ? 2.5 : 1.5;
            const edgeWidth = baseWidth * trafficWeight;
            const edgeGlow = heatmap && trafficWeight > 2 ? (isAttacked ? "url(#glow-r)" : "url(#glow-g)") : "none";

            // Animated packet along edge
            const t = animated ? ((frame * 0.012 + ei * 0.15) % 1) : 0.5;
            const px = from.x + (to.x - from.x) * t;
            const py = from.y + (to.y - from.y) * t;

            return (
              <g key={ei}>
                {/* NEW: glow halo for high-traffic edges */}
                {heatmap && trafficWeight > 2.5 && (
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={isAttacked ? "#f43f5e" : P.accent}
                    strokeWidth={edgeWidth + 4} opacity="0.08"
                    filter={edgeGlow}
                  />
                )}
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                  stroke={edgeColor} strokeWidth={edgeWidth} opacity={isAttacked ? 0.9 : 0.5}
                  strokeDasharray={isAttacked ? "6 3" : "none"}
                />
                {/* Animated data packet */}
                {animated && (
                  <circle cx={px} cy={py} r={isAttacked ? 4 : 2.5}
                    fill={isAttacked ? "#f43f5e" : P.accent} opacity="0.9"
                    filter={isAttacked ? "url(#glow-r)" : "url(#glow-g)"}
                  />
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {NET_NODES.map((node) => {
            const status = deviceStatuses[node.id] || "secure";
            const col = status === "hijacked" ? "#f43f5e" : status === "compromising" ? "#f97316" : (NODE_COLORS[node.type] || P.accent);
            const isHovered = hoveredNode === node.id;
            const isSelected = selectedNode?.id === node.id;
            const pulse = animated && (status === "hijacked" || status === "compromising");
            const r = isHovered || isSelected ? 28 : 24;

            // ── NEW: heatmap intensity ──────────────────────────────────────
            const intensity = heatmap ? getNodeIntensity(node.id) : { level: "normal", score: 0, color: null };
            const heatmapPulse = heatmap && intensity.level === "high" && animated;
            const heatColor = intensity.color || col;
            const nodeFilter = heatmap && intensity.level === "high" ? "url(#glow-high)"
              : heatmap && intensity.level === "medium" ? "url(#glow-medium)"
              : status !== "secure" ? "url(#glow-r)"
              : isHovered ? "url(#glow-g)" : "none";
            const strokeColor = heatmap && intensity.level !== "normal" ? heatColor : col;
            const strokeW = isSelected ? 3 : (heatmap && intensity.level !== "normal") ? 2.5 : 2;

            return (
              <g key={node.id} style={{ cursor: "pointer" }}
                onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Pulse ring for attacked nodes */}
                {pulse && (
                  <>
                    <circle cx={node.x} cy={node.y} r={r + 10 + (frame % 30)} fill="none"
                      stroke={col} strokeWidth="1" opacity={Math.max(0, 0.5 - (frame % 30) / 60)} />
                    <circle cx={node.x} cy={node.y} r={r + 5} fill="none"
                      stroke={col} strokeWidth="1.5" opacity="0.4" />
                  </>
                )}

                {/* NEW: Heatmap high anomaly pulse ring */}
                {heatmapPulse && !pulse && (
                  <>
                    <circle cx={node.x} cy={node.y} r={r + 8 + (frame % 20)} fill="none"
                      stroke={heatColor} strokeWidth="1.5" opacity={Math.max(0, 0.6 - (frame % 20) / 30)} />
                    <circle cx={node.x} cy={node.y} r={r + 4} fill={heatColor} opacity="0.07" />
                  </>
                )}

                {/* NEW: Heatmap medium glow ring */}
                {heatmap && intensity.level === "medium" && !pulse && (
                  <circle cx={node.x} cy={node.y} r={r + 6} fill={heatColor} opacity="0.09" />
                )}

                {/* Hover glow */}
                {(isHovered || isSelected) && (
                  <circle cx={node.x} cy={node.y} r={r + 8} fill={strokeColor} opacity="0.08" />
                )}

                {/* Background circle */}
                <circle cx={node.x} cy={node.y} r={r}
                  fill={heatmap && intensity.level !== "normal" ? heatColor+"12" : P.panelAlt}
                  stroke={strokeColor} strokeWidth={strokeW}
                  filter={nodeFilter}
                />

                {/* Icon */}
                <text x={node.x} y={node.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="16">
                  {node.icon}
                </text>

                {/* Label */}
                <text x={node.x} y={node.y + r + 14} textAnchor="middle" fontSize="10"
                  fill={P.text} fontFamily="Space Grotesk, sans-serif" fontWeight="600">
                  {node.label}
                </text>

                {/* Status badge */}
                {status !== "secure" && (
                  <g>
                    <circle cx={node.x + r - 4} cy={node.y - r + 4} r={7} fill={col} />
                    <text x={node.x + r - 4} y={node.y - r + 4} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#fff">
                      {status === "hijacked" ? "☠" : "!"}
                    </text>
                  </g>
                )}

                {/* NEW: Heatmap anomaly score badge */}
                {heatmap && intensity.level !== "normal" && status === "secure" && (
                  <g>
                    <circle cx={node.x + r - 4} cy={node.y - r + 4} r={8} fill={heatColor} opacity="0.9" />
                    <text x={node.x + r - 4} y={node.y - r + 4} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill="#fff" fontWeight="700">
                      {Math.round(intensity.score * 100)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Stats bar */}
      <div style={{ padding: "10px 18px", borderTop: `1px solid ${P.border}`, display: "flex", gap: 20 }}>
        {[
          { label: "Total Nodes", value: NET_NODES.length, color: P.accent },
          { label: "Connections", value: NET_EDGES.length, color: P.accent },
          { label: "Hijacked", value: Object.values(deviceStatuses).filter(s=>s==="hijacked").length, color: P.danger },
          { label: "Breaching", value: Object.values(deviceStatuses).filter(s=>s==="compromising").length, color: P.warn },
          { label: "Secure", value: NET_NODES.length - Object.values(deviceStatuses).filter(s=>s!=="secure").length, color: P.accent },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div style={{ fontSize: 9, color: P.textDim, letterSpacing: 0.5, marginBottom: 1 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Node detail popup */}
      {selectedNode && (
        <NodePopup node={selectedNode} onClose={() => setSelectedNode(null)} onOpenDevice={onOpenDevice} deviceStatuses={deviceStatuses} metrics={metrics} P={P} />
      )}
    </div>
  );
}

// ─── Model status panel ───────────────────────────────────────────────────────
function ModelStatus({ modelInfo, P }) {
  return (
    <div style={{ background: P.panel, border: `1px solid ${P.border}`, borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: P.cardShadow }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ color: P.textStrong, fontSize: 12, fontWeight: 700, margin: 0, letterSpacing: 0.5, textTransform: "uppercase" }}>ML Model</h3>
        <span style={{ background: P.accentDim, color: P.accent, fontSize: 10, padding: "3px 8px", borderRadius: 20, fontWeight: 700 }}>ACTIVE</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "Algorithm", value: "Isolation Forest" },
          { label: "Window",    value: "50 samples" },
          { label: "Threshold", value: "σ > 2.5" },
          { label: "Processed", value: modelInfo.processed.toLocaleString() },
          { label: "Anomalies", value: modelInfo.totalAnomalies },
          { label: "Accuracy",  value: modelInfo.accuracy + "%" },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ color: P.textDim, fontSize: 10, marginBottom: 2 }}>{label}</div>
            <div style={{ color: P.accent, fontSize: 13, fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function AnomalyDetectionSystem() {
  const [darkMode, setDarkMode]   = useState(true);
  const P = darkMode ? DARK : LIGHT;

  const [metrics, setMetrics]       = useState(initMetrics);
  const [alerts, setAlerts]         = useState([]);
  const [dismissed, setDismissed]   = useState(new Set());
  const [running, setRunning]       = useState(true);
  const [burst, setBurst]           = useState(false);
  const [modelInfo, setModelInfo]   = useState({ processed: 0, totalAnomalies: 0, accuracy: 97.4 });
  const [tab, setTab]               = useState("dashboard");
  const [showModal, setShowModal]   = useState(false);
  const [activeAttack, setActiveAttack]     = useState(null);
  const [attackPhase, setAttackPhase]       = useState(-1);
  const [deviceStatuses, setDeviceStatuses] = useState({});
  const [toasts, setToasts]         = useState([]);
  // ── NEW state ──
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [showMetricPanel, setShowMetricPanel] = useState(false);
  const [selectedDevice, setSelectedDevice]   = useState(null);

  const intervalRef = useRef(null);
  const timerRefs   = useRef([]);
  const alertIdRef  = useRef(0);
  const toastIdRef  = useRef(0);

  const pushToast = useCallback((icon, title, message, color) => {
    const id = ++toastIdRef.current;
    setToasts(t => [{ id, icon, title, message, color }, ...t].slice(0, 4));
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5500);
  }, []);

  const pushAlert = useCallback((obj) => {
    setAlerts(a => [obj, ...a].slice(0, 60));
  }, []);

  const tick = useCallback(() => {
    setMetrics(prev => {
      const next = {};
      const newAlerts = [];
      const overrides = activeAttack?.metrics || {};
      for (const cfg of METRICS_CONFIG) {
        const p = prev[cfg.id];
        const raw = genMetric(p.current, burst, overrides[cfg.id]);
        const clamped = Math.max(cfg.min, Math.min(cfg.max, raw));
        const hist = [...p.history.slice(-59), clamped];
        const score = anomalyScore(clamped, hist);
        const anomalous = score > 0.45;
        next[cfg.id] = { current: clamped, history: hist, score, anomalous };
        if (anomalous && score > 0.5 && Math.random() > 0.7) {
          newAlerts.push({ id: ++alertIdRef.current, type: "metric", metric: cfg.label, score, value: `${clamped.toFixed(1)}${cfg.unit}`, time: new Date().toLocaleTimeString() });
        }
      }
      if (newAlerts.length > 0) {
        setAlerts(a => [...newAlerts, ...a].slice(0, 60));
        setModelInfo(m => ({ ...m, processed: m.processed + METRICS_CONFIG.length, totalAnomalies: m.totalAnomalies + newAlerts.length, accuracy: +(97 + Math.random() * 1.5).toFixed(1) }));
      } else {
        setModelInfo(m => ({ ...m, processed: m.processed + METRICS_CONFIG.length }));
      }
      return next;
    });
  }, [burst, activeAttack]);

  useEffect(() => {
    if (running) intervalRef.current = setInterval(tick, 800);
    else clearInterval(intervalRef.current);
    return () => clearInterval(intervalRef.current);
  }, [running, tick]);

  const launchAttack = useCallback((attack) => {
    setShowModal(false);
    setActiveAttack(attack);
    setAttackPhase(0);
    setDeviceStatuses({});
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];

    pushToast(attack.icon, `${attack.name} Detected`,
      `Hostile intrusion confirmed. ${DEVICES.length} nodes targeted. Immediate containment required.`,
      attack.color);

    attack.phases.forEach((_, i) => {
      const t = setTimeout(() => {
        setAttackPhase(i);
        pushAlert({ id: ++alertIdRef.current, type: "attack", attackName: attack.name, icon: attack.icon, severity: i >= 3 ? "CRITICAL" : "HIGH", message: attack.phases[i], time: new Date().toLocaleTimeString() });
        pushToast(attack.icon, `Phase ${i+1} — ${attack.name}`, attack.phases[i], i >= 3 ? P.danger : attack.color);
      }, i * 3800);
      timerRefs.current.push(t);
    });

    const shuffled = [...DEVICES].sort(() => Math.random() - 0.5);
    shuffled.forEach((dev, i) => {
      const t1 = setTimeout(() => {
        setDeviceStatuses(s => ({ ...s, [dev.id]: "compromising" }));
        pushToast("⚡", "Device Breaching", `Lateral movement to ${dev.name} (${dev.ip}) — exploit in progress`, P.warn);
      }, 1500 + i * 2200);
      const t2 = setTimeout(() => {
        setDeviceStatuses(s => ({ ...s, [dev.id]: "hijacked" }));
        pushAlert({ id: ++alertIdRef.current, type: "attack", attackName: attack.name, icon: "☠", severity: "CRITICAL", message: `${dev.name} (${dev.ip}) FULLY COMPROMISED — attacker has root access`, time: new Date().toLocaleTimeString() });
        pushToast("☠", "Host Hijacked", `${dev.name} at ${dev.ip} is under attacker control`, P.danger);
      }, 3000 + i * 2200);
      timerRefs.current.push(t1, t2);
    });
  }, [pushToast, pushAlert, P]);

  const resolveAttack = useCallback(() => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
    setActiveAttack(null);
    setAttackPhase(-1);
    setDeviceStatuses({});
    pushToast("🛡", "Threat Contained", "Attack neutralised. All devices restored. Incident logged to MongoDB.", P.accent);
    pushAlert({ id: ++alertIdRef.current, type: "attack", attackName: "SYSTEM RESPONSE", icon: "🛡", severity: "MEDIUM", message: "Incident contained — sessions revoked, firewall rules updated, forensic snapshot taken.", time: new Date().toLocaleTimeString() });
  }, [pushToast, pushAlert, P]);

  const triggerBurst = () => { setBurst(true); setTimeout(() => setBurst(false), 5000); };
  const visibleAlerts  = alerts.filter(a => !dismissed.has(a.id));
  const anomalousCount = Object.values(metrics).filter(m => m.anomalous).length;
  const hijackedCount  = Object.values(deviceStatuses).filter(s => s === "hijacked").length;

  const TABS = ["dashboard", "network", "alerts"];

  const openDeviceDashboard = (device) => {
    setSelectedDevice(device);
    setTab("device");
  };

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", background: P.bg, minHeight: "100vh", color: P.text, transition: "background 0.3s, color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes slideIn  { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:none; } }
        @keyframes slideInPanel { from { transform:translateX(100%); opacity:0.3; } to { transform:translateX(0); opacity:1; } }
        @keyframes toastIn  { from { opacity:0; transform:translateX(20px) scale(0.97); } to { opacity:1; transform:none; } }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes glitch   { 0%,100%{transform:none} 25%{transform:translate(-1px,1px)} 75%{transform:translate(1px,-1px)} }
        .metric-card { transition: box-shadow 0.2s, border-color 0.2s !important; }
        .metric-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important; }
        ::-webkit-scrollbar { width:4px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:${P.muted}; border-radius:2px }
        b { font-weight: 600; }
      `}</style>

      <Toast toasts={toasts} P={P} />
      {/* NEW: Metric Detail Panel */}
      {showMetricPanel && selectedMetric && (
        <MetricDetailPanel metricId={selectedMetric} metrics={metrics} onClose={() => { setShowMetricPanel(false); setSelectedMetric(null); }} P={P} />
      )}
      {showModal && <CyberAttackModal onClose={() => setShowModal(false)} onLaunch={launchAttack} P={P} />}

      {/* ── Header ── */}
      <div style={{
        borderBottom: `1px solid ${activeAttack ? P.danger+"50" : P.border}`,
        padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
        background: P.panel, position: "sticky", top: 0, zIndex: 100,
        boxShadow: P.cardShadow, transition: "border-color 0.4s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `linear-gradient(135deg, ${P.accent}30, ${P.accent}10)`,
            border: `2px solid ${P.accent}50`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            animation: activeAttack ? "glitch 0.5s infinite" : "none",
          }}>⬡</div>
          <div>
            <div style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 800, fontSize: 16, color: activeAttack ? P.danger : P.textStrong, transition: "color 0.3s", letterSpacing: -0.3 }}>
              Anomaly Detection
            </div>
            <div style={{ fontSize: 10, color: P.textDim, letterSpacing: 1.5, fontFamily: "JetBrains Mono, monospace" }}>MERN · ML · REAL-TIME</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {activeAttack && (
            <span style={{ background: P.dangerDim, color: P.danger, fontSize: 10, padding: "4px 10px", borderRadius: 20, animation: "pulse 0.8s infinite", fontWeight: 700 }}>
              ☠ {hijackedCount}/{DEVICES.length} hijacked
            </span>
          )}
          {burst && <span style={{ background: P.dangerDim, color: P.danger, fontSize: 10, padding: "4px 10px", borderRadius: 20, animation: "pulse 1s infinite", fontWeight: 700 }}>⚡ Burst</span>}
          <span style={{
            background: anomalousCount > 0 ? P.warnDim : P.accentDim,
            color: anomalousCount > 0 ? P.warn : P.accent,
            fontSize: 11, padding: "4px 10px", borderRadius: 20, fontWeight: 600,
          }}>{anomalousCount > 0 ? `⚠ ${anomalousCount} anomalies` : "✓ Nominal"}</span>

          {/* Theme toggle */}
          <button onClick={() => setDarkMode(d => !d)} style={{
            background: P.panelAlt, border: `1px solid ${P.border}`, color: P.textDim,
            borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 15, lineHeight: 1,
          }} title="Toggle theme">{darkMode ? "☀️" : "🌙"}</button>

          <button onClick={() => setRunning(r => !r)} style={{
            background: running ? P.accentDim : P.warnDim, color: running ? P.accent : P.warn,
            border: `1px solid ${running ? P.accent : P.warn}40`, borderRadius: 8, padding: "6px 12px",
            cursor: "pointer", fontSize: 11, fontFamily: "Space Grotesk, sans-serif", fontWeight: 700,
          }}>{running ? "⏸ Pause" : "▶ Resume"}</button>

          <button onClick={triggerBurst} style={{
            background: P.dangerDim, color: P.danger, border: `1px solid ${P.danger}40`,
            borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 11,
            fontFamily: "Space Grotesk, sans-serif", fontWeight: 700,
          }}>💥 Inject</button>

          <button onClick={() => setShowModal(true)} style={{
            background: activeAttack ? P.dangerDim : P.hack+"18",
            color: activeAttack ? P.danger : P.hack,
            border: `2px solid ${activeAttack ? P.danger : P.hack}50`,
            borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 11,
            fontFamily: "Space Grotesk, sans-serif", fontWeight: 800,
            boxShadow: activeAttack ? `0 0 16px ${P.danger}30` : `0 0 10px ${P.hack}20`,
            animation: activeAttack ? "pulse 1s infinite" : "none",
          }}>
            {activeAttack ? "☠ Attack Active" : "☠ Cyber Attack"}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ borderBottom: `1px solid ${P.border}`, padding: "0 24px", background: P.panel }}>
        {[...TABS, ...(selectedDevice ? ["device"] : [])].map((t) => (
          <button key={t} onClick={() => { if (t !== "device") setSelectedDevice(null); setTab(t); }} style={{
            background: "none", border: "none",
            borderBottom: tab === t ? `2px solid ${P.accent}` : "2px solid transparent",
            color: tab === t ? P.accent : P.textDim,
            padding: "10px 16px", cursor: "pointer", fontSize: 12,
            fontFamily: "Space Grotesk, sans-serif", fontWeight: tab === t ? 700 : 500,
            textTransform: "capitalize", letterSpacing: 0.3, marginBottom: -1,
            transition: "color 0.2s",
          }}>
            {t === "device" && selectedDevice ? `📊 ${selectedDevice.name}` : t}{t === "alerts" && alerts.length > 0 ? ` (${alerts.length})` : ""}
          </button>
        ))}
      </div>

      <div style={{ padding: 24 }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 290px", gap: 20 }}>
            <div>
              {activeAttack && <AttackBanner attack={activeAttack} phase={attackPhase} deviceStatuses={deviceStatuses} onResolve={resolveAttack} P={P} />}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
                {METRICS_CONFIG.map((cfg) => {
                  const m = metrics[cfg.id];
                  const pct = ((m.current - cfg.min) / (cfg.max - cfg.min)) * 100;
                  return (
                    <div key={cfg.id} className="metric-card" onClick={() => { setSelectedMetric(cfg.id); setShowMetricPanel(true); }} style={{
                      background: P.panel, border: `1px solid ${m.anomalous ? P.danger+"50" : P.border}`,
                      borderRadius: 12, padding: 16, position: "relative", overflow: "hidden",
                      boxShadow: m.anomalous ? `0 0 20px ${P.danger}15` : P.cardShadow,
                      cursor: "pointer",
                    }}>
                      {m.anomalous && (
                        <div style={{ position: "absolute", top: 0, right: 0, background: P.danger, color: "#fff", fontSize: 9, padding: "3px 10px", borderBottomLeftRadius: 8, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>ANOMALY</div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ color: P.textDim, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", fontFamily: "JetBrains Mono, monospace" }}>{cfg.label}</span>
                        <GaugeArc score={m.score} color={cfg.color} P={P} />
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 10 }}>
                        <span style={{ fontSize: 30, fontWeight: 800, color: m.anomalous ? P.danger : cfg.color, fontFamily: "Space Grotesk, sans-serif", transition: "color 0.3s", letterSpacing: -1 }}>
                          {m.current.toFixed(1)}
                        </span>
                        <span style={{ fontSize: 11, color: P.textDim, fontFamily: "JetBrains Mono, monospace" }}>{cfg.unit}</span>
                      </div>
                      <div style={{ background: P.border, borderRadius: 3, height: 4, marginBottom: 10 }}>
                        <div style={{ width: `${Math.min(100,pct)}%`, height: "100%", borderRadius: 3, background: m.anomalous ? P.danger : cfg.color, transition: "width 0.4s, background 0.3s" }} />
                      </div>
                      <Sparkline data={m.history} color={cfg.color} anomalous={m.anomalous} P={P} />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                        <span style={{ fontSize: 10, color: P.textDim, fontFamily: "JetBrains Mono, monospace" }}>
                          score: <span style={{ color: m.score > 0.5 ? P.danger : P.textDim }}>{(m.score*100).toFixed(0)}%</span>
                        </span>
                        <span style={{ fontSize: 10, color: P.textDim, fontFamily: "JetBrains Mono, monospace" }}>
                          σ {(m.current - m.history.reduce((a,b)=>a+b,0)/m.history.length).toFixed(1)}
                        </span>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 9, color: P.textDim, textAlign: "right", letterSpacing: 0.3, opacity: 0.7 }}>click to drill down →</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: P.panel, border: `1px solid ${P.border}`, borderRadius: 12, padding: 16, boxShadow: P.cardShadow }}>
                <div style={{ fontSize: 11, color: P.textDim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, fontFamily: "JetBrains Mono, monospace" }}>Live Event Stream</div>
                <div style={{ maxHeight: 230, overflowY: "auto" }}>
                  {visibleAlerts.length === 0
                    ? <div style={{ color: P.textDim, fontSize: 12, textAlign: "center", padding: 24 }}>No active anomalies detected</div>
                    : visibleAlerts.slice(0, 12).map(a => <AlertItem key={a.id} alert={a} onDismiss={id => setDismissed(d => new Set([...d, id]))} P={P} />)
                  }
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div>
              <ModelStatus modelInfo={modelInfo} P={P} />

              <div style={{ background: P.panel, border: `1px solid ${activeAttack ? P.danger+"40" : P.border}`, borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: P.cardShadow, transition: "border-color 0.4s" }}>
                <div style={{ fontSize: 11, color: P.textDim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, fontFamily: "JetBrains Mono, monospace" }}>Device Nodes</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {DEVICES.map(d => <DeviceCard key={d.id} device={d} status={deviceStatuses[d.id] || "secure"} P={P} />)}
                </div>
              </div>

              <div style={{ background: P.panel, border: `1px solid ${P.border}`, borderRadius: 12, padding: 16, boxShadow: P.cardShadow }}>
                <div style={{ fontSize: 11, color: P.textDim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, fontFamily: "JetBrains Mono, monospace" }}>Anomaly Scores</div>
                {METRICS_CONFIG.map(cfg => {
                  const score = metrics[cfg.id].score;
                  return (
                    <div key={cfg.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: P.textDim }}>{cfg.label}</span>
                        <span style={{ fontSize: 11, color: score > 0.5 ? P.danger : P.accent, fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>{(score*100).toFixed(0)}%</span>
                      </div>
                      <div style={{ background: P.border, borderRadius: 3, height: 5 }}>
                        <div style={{ width: `${score*100}%`, height: "100%", borderRadius: 3, background: score > 0.7 ? P.danger : score > 0.4 ? P.warn : cfg.color, transition: "width 0.4s, background 0.4s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── NETWORK GRAPH ── */}
        {tab === "network" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 800, fontSize: 22, color: P.textStrong, margin: "0 0 4px", letterSpacing: -0.5 }}>Network Topology</h2>
              <p style={{ color: P.textDim, fontSize: 13, margin: 0 }}>Live device graph showing all connected nodes, data flow, and attack propagation. Click any node for details.</p>
            </div>
            <NetworkGraph deviceStatuses={deviceStatuses} metrics={metrics} P={P} onOpenDevice={openDeviceDashboard} />
          </div>
        )}

        {/* ── ALERTS ── */}
        {tab === "alerts" && (
          <div style={{ maxWidth: 820 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontFamily: "Space Grotesk, sans-serif", fontWeight: 800, fontSize: 22, color: P.textStrong, letterSpacing: -0.5 }}>
                Alert Log <span style={{ color: P.textDim, fontSize: 15, fontWeight: 500 }}>({alerts.length})</span>
              </h2>
              <button onClick={() => { setAlerts([]); setDismissed(new Set()); }} style={{ background: P.panelAlt, border: `1px solid ${P.border}`, color: P.textDim, padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontFamily: "Space Grotesk, sans-serif", fontWeight: 600 }}>
                Clear All
              </button>
            </div>
            {alerts.length === 0
              ? <div style={{ color: P.textDim, textAlign: "center", padding: 60, fontSize: 14 }}>No alerts recorded yet</div>
              : alerts.map(a => <AlertItem key={a.id} alert={a} onDismiss={id => setDismissed(d => new Set([...d, id]))} P={P} />)
            }
          </div>
        )}

        {/* ── DEVICE DASHBOARD (NEW) ── */}
        {tab === "device" && selectedDevice && (
          <DeviceDashboard
            device={selectedDevice}
            deviceStatuses={deviceStatuses}
            metrics={metrics}
            alerts={alerts}
            onBack={() => { setTab("network"); }}
            P={P}
          />
        )}


      </div>
    </div>
  );
}
