// ─── ATTACK TYPES ────────────────────────────────────────────────────────────
export const ATTACK_TYPES = [
  {
    id: "ddos", name: "DDoS Flood", color: "#3b82f6",
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
    id: "ransomware", name: "Ransomware", color: "#ef4444",
    description: "LockBit 3.0 encrypting filesystem via AES-256 + RSA-2048. Lateral movement via SMB across 6 nodes.",
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
    id: "mitm", name: "Man-in-the-Middle", color: "#f97316",
    description: "ARP poisoning active. TLS traffic intercepted between API server and DB. Cert spoofing on internal LAN.",
    phases: [
      "ARP cache poisoning — gateway MAC overwritten on 4 hosts",
      "SSL stripping — HTTPS downgraded to HTTP",
      "Fake certificate injected — CN=internal-db.corp spoofed",
      "Credential harvesting — 3 DB passwords captured in plaintext",
      "Session tokens extracted — 14 active sessions hijacked",
    ],
    metrics: { latency: 340, errors: 15, mem: 78 },
  },
  {
    id: "cryptojack", name: "Cryptojacking", color: "#a855f7",
    description: "Monero miner (XMRig) deployed on 5 servers. CPU at 99%. C2 beacon to mining pool every 60s.",
    phases: [
      "Dropper via vulnerable npm package (event-stream fork)",
      "XMRig unpacked to /tmp/.systemd-cache/ — hidden process",
      "CPU governor set to performance — thermal limits disabled",
      "Persistence via crontab + systemd service",
      "Mining active — 4.7 H/s per node, C2 beacon active",
    ],
    metrics: { cpu: 99, mem: 88, disk: 280, rps: 45 },
  },
  {
    id: "sqli", name: "SQL Injection", color: "#10b981",
    description: "Blind SQLi campaign on /api/users via sqlmap. Extracting schema and dumping 128k-row credentials table.",
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

// ─── NETWORK TOPOLOGIES ──────────────────────────────────────────────────────
export const TOPOLOGY_SMALL = {
  id: "small",
  name: "Network 1",
  subtitle: "Client — Server",
  nodes: [
    { id: "client", label: "Client Machine", type: "client",   x: 200, y: 180, ip: "192.168.1.10" },
    { id: "server", label: "Server",         type: "server",   x: 600, y: 180, ip: "192.168.1.1"  },
  ],
  edges: [["client","server"]],
};

export const TOPOLOGY_COLLEGE = {
  id: "college",
  name: "Network 2",
  subtitle: "College Campus Network",
  nodes: [
    { id: "isp",       label: "ISP / WAN",          type: "external",  x: 460, y: 40  },
    { id: "core-sw",   label: "Core Switch",         type: "switch",    x: 460, y: 140 },
    { id: "fw",        label: "Firewall",            type: "security",  x: 460, y: 240 },
    { id: "router",    label: "Campus Router",       type: "router",    x: 460, y: 340 },
    { id: "dist-sw1",  label: "Dist. Switch A",      type: "switch",    x: 200, y: 450 },
    { id: "dist-sw2",  label: "Dist. Switch B",      type: "switch",    x: 720, y: 450 },
    { id: "ap-lib",    label: "Library AP",          type: "wireless",  x: 80,  y: 570 },
    { id: "lab-sw",    label: "Lab Switch",          type: "switch",    x: 240, y: 570 },
    { id: "admin-sw",  label: "Admin Switch",        type: "switch",    x: 600, y: 570 },
    { id: "ap-hostel", label: "Hostel AP",           type: "wireless",  x: 840, y: 570 },
    { id: "srv-dc",    label: "Domain Controller",   type: "server",    x: 460, y: 460 },
    { id: "lab-pc1",   label: "Lab PC Cluster",      type: "client",    x: 180, y: 680 },
    { id: "lab-pc2",   label: "Lab PC Cluster B",    type: "client",    x: 320, y: 680 },
    { id: "admin-pc",  label: "Admin Workstation",   type: "client",    x: 560, y: 680 },
    { id: "nas",       label: "NAS Storage",         type: "database",  x: 700, y: 680 },
  ],
  edges: [
    ["isp","core-sw"],["core-sw","fw"],["fw","router"],
    ["router","dist-sw1"],["router","dist-sw2"],["router","srv-dc"],
    ["dist-sw1","ap-lib"],["dist-sw1","lab-sw"],
    ["dist-sw2","admin-sw"],["dist-sw2","ap-hostel"],
    ["lab-sw","lab-pc1"],["lab-sw","lab-pc2"],
    ["admin-sw","admin-pc"],["admin-sw","nas"],
  ],
};

TOPOLOGY_COLLEGE.nodes.forEach((n, i) => {
  if (!n.ip) n.ip = "10.10." + (Math.floor(i / 5) + 1) + "." + (10 + i);
});

export const NODE_TYPE_COLORS = {
  external: "#94a3b8", security: "#f97316", switch: "#3b82f6",
  router: "#8b5cf6", server: "#10b981", client: "#06b6d4",
  wireless: "#f59e0b", database: "#a855f7", gateway: "#6366f1", ml: "#ec4899",
};

export const NODE_TYPE_ICON = {
  external: "WAN", security: "FW", switch: "SW", router: "RT",
  server: "SRV", client: "PC", wireless: "AP", database: "DB",
  gateway: "GW", ml: "ML",
};

// ─── METRICS CONFIG ───────────────────────────────────────────────────────────
export const METRICS_CONFIG = [
  { id: "cpu",     label: "CPU",         unit: "%",    base: 45,  min: 0, max: 100,  color: "#6ee7f7" },
  { id: "mem",     label: "Memory",      unit: "%",    base: 62,  min: 0, max: 100,  color: "#a78bfa" },
  { id: "latency", label: "Latency",     unit: "ms",   base: 120, min: 0, max: 600,  color: "#fb923c" },
  { id: "rps",     label: "Req / sec",   unit: "",     base: 340, min: 0, max: 1000, color: "#38bdf8" },
  { id: "errors",  label: "Error Rate",  unit: "%",    base: 1.2, min: 0, max: 30,   color: "#f87171" },
  { id: "disk",    label: "Disk I/O",    unit: "MB/s", base: 85,  min: 0, max: 400,  color: "#c084fc" },
];

// ─── ML helpers ──────────────────────────────────────────────────────────────
export function anomalyScore(v, hist) {
  if (hist.length < 10) return 0;
  const vals = hist.slice(-50);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const std  = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length) || 1;
  return Math.min(1, Math.abs(v - mean) / std / 4);
}
export function genMetric(prev, burst, target) {
  if (target !== undefined) return prev + (target - prev) * 0.18 + (Math.random() - 0.5) * 3;
  const spike = burst && Math.random() > 0.6;
  const drift = prev + (Math.random() - 0.49) * 4;
  return spike ? drift + (Math.random() > 0.5 ? 40 : -40) : drift;
}
export function initMetrics() {
  return Object.fromEntries(
    METRICS_CONFIG.map(m => [m.id, { current: m.base, history: Array(60).fill(m.base), score: 0, anomalous: false }])
  );
}

