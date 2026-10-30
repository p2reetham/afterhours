import { useState, useEffect, useRef, useCallback } from "react";
import "./styles.css";
import bg from "./assets/bg.jpg";
import { ATTACK_TYPES, TOPOLOGY_SMALL, TOPOLOGY_COLLEGE, NODE_TYPE_COLORS, METRICS_CONFIG, anomalyScore, genMetric, initMetrics } from "./data.js";

const C = { cyan: "#46d9ff", red: "#ff4057", amber: "#ffb627", mint: "#58f0b0" };
const statusColor = (s, base) => s === "hijacked" ? C.red : s === "compromising" ? C.amber : base;
const statusLabel = { hijacked: "Compromised", compromising: "Breaching", secure: "Secure" };
const clock = () => new Date().toLocaleTimeString();

function Area({ data, color }) {
  const lo = Math.min(...data), hi = Math.max(...data, lo + 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${44 - ((v - lo) / (hi - lo)) * 40}`);
  return (
    <svg viewBox="0 0 100 46" preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,46 ${pts.join(" ")} 100,46`} fill={color} opacity=".14" />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Signal({ cfg, m, onOpen }) {
  const color = m.anomalous ? C.red : cfg.color;
  return (
    <button type="button" className={"sig" + (m.anomalous ? " bad" : "")} style={{ "--c": cfg.color }} onClick={onOpen} aria-label={`${cfg.label} details`}>
      {m.anomalous && <span className="tag">Off baseline</span>}
      <h3>{cfg.label}</h3>
      <div className="v">{m.current.toFixed(1)}<small>{cfg.unit}</small></div>
      <Area data={m.history} color={color} />
      <div className="f"><span>Anomaly score {(m.score * 100).toFixed(0)}%</span><span>Open details</span></div>
    </button>
  );
}

function AlertRow({ a, onDismiss }) {
  const atk = a.type === "attack";
  const sev = atk ? a.severity : a.score > 0.8 ? "Critical" : a.score > 0.5 ? "High" : "Medium";
  const c = /crit/i.test(sev) ? C.red : /high/i.test(sev) ? C.amber : C.cyan;
  return (
    <div className="row" style={{ "--c": c }}>
      <b>{sev[0] + sev.slice(1).toLowerCase()}{atk ? ` · ${a.attackName}` : ` · ${a.metric}`}</b>
      <time>{a.time}</time>
      <p>{atk ? a.message : `${a.value} is about ${(a.score * 4).toFixed(1)}σ from the recent average. The detector flags anything past ${LIMIT}σ. Open the ${a.metric} card for what it can mean.`}</p>
      {onDismiss && <button onClick={() => onDismiss(a.id)} aria-label="Dismiss alert">Dismiss</button>}
    </div>
  );
}

function Gauge({ value }) {
  const col = value < 25 ? C.mint : value < 50 ? C.cyan : value < 75 ? C.amber : C.red;
  const label = value < 25 ? "Calm" : value < 50 ? "Watching" : value < 75 ? "Elevated" : "Critical";
  return (
    <div className="gauge" role="img" aria-label={`Threat index ${value} of 100, ${label}`}>
      <svg viewBox="0 0 200 110">
        <path d="M10 100A90 90 0 0 1 190 100" stroke="rgba(110,200,255,.14)" pathLength="100" />
        <path className="arc" d="M10 100A90 90 0 0 1 190 100" stroke={col} pathLength="100" style={{ "--v": value, filter: `drop-shadow(0 0 8px ${col})` }} />
      </svg>
      <div className="num"><b>{value}</b><span>Threat index · {label}</span></div>
    </div>
  );
}

/* Isometric topology: nodes are tiles with pillars; moving dots show traffic. */
const iso = n => ({ x: (n.x - n.y) * 0.866, y: (n.x + n.y) * 0.5 });
const PILLAR = { server: 34, database: 30, switch: 14, router: 18, security: 26, client: 20, wireless: 24, external: 40 };

function Pillar({ x, y, s, h, col }) {
  const w = s * 0.5, hw = w * 0.866, hh = w * 0.5;
  const P = (...p) => p.map(q => q.join(",")).join(" ");
  return (
    <g>
      <polygon points={P([x, y + hh * 2 - h], [x - hw, y + hh - h], [x - hw, y + hh], [x, y + hh * 2])} fill={col} opacity=".45" />
      <polygon points={P([x, y + hh * 2 - h], [x + hw, y + hh - h], [x + hw, y + hh], [x, y + hh * 2])} fill={col} opacity=".75" />
      <polygon className="top" points={P([x, y - h], [x + hw, y + hh - h], [x, y + hh * 2 - h], [x - hw, y + hh - h])} fill={col} stroke={col} />
    </g>
  );
}

function Topology({ topo, st, T, metrics }) {
  const [sel, setSel] = useState(null);
  useEffect(() => setSel(null), [topo.id]);
  const big = topo.id === "small", s = big ? 52 : 30;
  const pos = Object.fromEntries(topo.nodes.map(n => [n.id, iso(n)]));
  const xs = Object.values(pos).map(p => p.x), ys = Object.values(pos).map(p => p.y);
  const pad = 80, x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad - 40;
  const vb = `${x0} ${y0} ${Math.max(...xs) - Math.min(...xs) + pad * 2} ${Math.max(...ys) - Math.min(...ys) + pad * 2 + 80}`;
  const list = topo.nodes.filter(n => n.type !== "external");
  const bad = Object.values(st).filter(v => v === "hijacked").length;
  const pick = topo.nodes.find(n => n.id === sel);
  const load = (n, i) => Math.min(99, Math.round(metrics.cpu.current * (0.55 + ((i * 37) % 50) / 100) + (st[n.id] === "hijacked" ? 35 : st[n.id] ? 15 : 0)));
  return (
    <div className="topo">
      <div className="map">
        <div className="legend">{[["Secure", C.cyan], ["Breaching", C.amber], ["Compromised", C.red]].map(([l, c]) => <span key={l}><i style={{ background: c }} />{l}</span>)}</div>
        <svg viewBox={vb} role="group" aria-label={`${topo.subtitle} topology`}>
          {topo.edges.map(([a, b], i) => {
            const hot = st[a] === "hijacked" || st[b] === "hijacked", warm = st[a] || st[b];
            const col = hot ? C.red : warm ? C.amber : C.amber;
            return <g key={i}><line x1={pos[a].x} y1={pos[a].y} x2={pos[b].x} y2={pos[b].y} stroke={hot ? C.red : C.cyan} opacity=".3" /><line className={"flow" + (hot ? " hot" : "")} x1={pos[a].x} y1={pos[a].y} x2={pos[b].x} y2={pos[b].y} stroke={col} /></g>;
          })}
          {[...topo.nodes].sort((a, b) => pos[a.id].y - pos[b.id].y).map(n => {
            const { x, y } = pos[n.id], status = st[n.id] || "secure", col = statusColor(status, NODE_TYPE_COLORS[n.type]);
            return (
              <g key={n.id} className="node" tabIndex={0} role="button" aria-label={`${n.label}, ${statusLabel[status]}`} onClick={() => setSel(sel === n.id ? null : n.id)} onKeyDown={e => e.key === "Enter" && setSel(sel === n.id ? null : n.id)}>
                {status !== "secure" && <ellipse className="ring" cx={x} cy={y + s * 0.25} rx={s * 1.2} ry={s * 0.6} fill="none" stroke={col} strokeWidth="2" />}
                <polygon points={`${x},${y - s * 0.5 + s * 0.25} ${x + s},${y + s * 0.25} ${x},${y + s * 0.5 + s * 0.25} ${x - s},${y + s * 0.25}`} fill={col} fillOpacity={sel === n.id ? 0.4 : 0.16} stroke={col} strokeOpacity=".7" />
                <Pillar x={x} y={y - 4} s={s} h={PILLAR[n.type] * (big ? 1.5 : 1)} col={col} />
                <text x={x} y={y + s * 0.5 + s * 0.25 + 15} textAnchor="middle" fontSize={big ? 15 : 11.5} fill="#cfe3f1" fontWeight="500">{n.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="side">
        <div className="card counts">
          <div><b>{topo.nodes.length}</b><span>Nodes</span></div>
          <div><b>{topo.edges.length}</b><span>Links</span></div>
          <div><b style={{ color: bad ? C.red : undefined }}>{bad}</b><span>Compromised</span></div>
        </div>
        <div className="card">
          <h2>{pick ? pick.label : "Hosts"}<small>{pick ? pick.ip : `${list.length} monitored`}</small></h2>
          <div style={{ maxHeight: 360, overflow: "auto" }}>
            {list.map((n, i) => {
              const s2 = st[n.id] || "secure", c = statusColor(s2, C.cyan);
              return (
                <button key={n.id} className="host" aria-pressed={sel === n.id} style={{ "--c": c }} onClick={() => setSel(sel === n.id ? null : n.id)}>
                  <span>{n.label}<br /><small>{n.ip}</small></span><em>{statusLabel[s2]}</em>
                  <div className="bar"><i style={{ width: `${load(n, i)}%`, background: c }} /></div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const MEANING = {
  cpu: "Sudden CPU spikes often come from cryptominers, ransomware encrypting files, or a flood of requests the server is forced to process.",
  mem: "Memory climbing fast can mean malware loading payloads, ransomware staging files, or buffers filling up under attack.",
  latency: "Slow responses are typical when a DDoS saturates the network, or when traffic is being intercepted and relayed through an attacker (man-in-the-middle).",
  rps: "A jump in requests per second is the classic sign of a DDoS flood or automated scanning tools. A sharp drop can mean the service is failing.",
  errors: "A rising error rate suggests probing, such as malformed requests from SQL injection tools, or services failing under load.",
  disk: "Heavy disk activity is typical of ransomware encrypting files, or of large amounts of data being copied out.",
};
const LIMIT = 1.8; // default visual reference; adaptive limit is controlled in App

function Detail({ id, setId, metrics, attack, onClose }) {
  useEffect(() => { const k = e => e.key === "Escape" && onClose(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);
  const cfg = METRICS_CONFIG.find(c => c.id === id), m = metrics[id], h = m.history, n = h.length;
  const mean = h.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(h.reduce((a, b) => a + (b - mean) ** 2, 0) / n) || 1;
  const lo = Math.min(...h), hi = Math.max(...h), a = Math.min(lo, mean - 3 * sd), b = Math.max(hi, mean + 3 * sd);
  const y = v => 196 - ((v - a) / (b - a)) * 186, col = m.anomalous ? C.red : cfg.color, z = (m.current - mean) / sd;
  const pts = h.map((v, i) => `${(i / (n - 1)) * 600},${y(v).toFixed(1)}`).join(" ");
  const f = v => v.toFixed(cfg.unit === "%" || cfg.id === "rps" ? 1 : 0);
  const stats = [["Now", f(m.current)], ["Average", f(mean)], ["Peak", f(hi)], ["Low", f(lo)], ["Std dev", sd.toFixed(1)], ["Anomaly score", `${(m.score * 100).toFixed(0)}%`]];
  return (
    <div className="veil mid" onClick={onClose}>
      <div className="dlg" role="dialog" aria-label={`${cfg.label} overview`} onClick={e => e.stopPropagation()}>
        <div className="mlist">
          {METRICS_CONFIG.map(c => { const x = metrics[c.id]; return (
            <button key={c.id} aria-pressed={c.id === id} style={{ "--c": x.anomalous ? C.red : c.color }} onClick={() => setId(c.id)}>
              <span>{c.label}</span><b>{x.current.toFixed(1)}<small>{c.unit}</small></b><div className="bar"><i style={{ width: `${x.score * 100}%` }} /></div>
            </button>); })}
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div><h2 className="dh">{cfg.label}</h2>
              <p style={{ color: m.anomalous ? C.red : C.mint, fontWeight: 500 }}>{m.anomalous ? `Off baseline: ${Math.abs(z).toFixed(1)}σ ${z > 0 ? "above" : "below"} the 50-sample average` : "Within baseline"}</p></div>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
          <div className="chart">
            <svg viewBox="0 0 600 200" preserveAspectRatio="none" role="img" aria-label={`${cfg.label} over the last ${n} samples`}>
              <rect x="0" y={y(mean + LIMIT * sd)} width="600" height={Math.max(0, y(mean - LIMIT * sd) - y(mean + LIMIT * sd))} fill={C.cyan} opacity=".08" />
              <line x1="0" x2="600" y1={y(mean)} y2={y(mean)} stroke={C.cyan} strokeDasharray="4 4" opacity=".5" vectorEffect="non-scaling-stroke" />
              <polygon points={`0,200 ${pts} 600,200`} fill={col} opacity=".14" />
              <polyline points={pts} fill="none" stroke={col} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="ax" style={{ top: 4 }}>{f(b)}</span><span className="ax" style={{ bottom: 4 }}>{f(a)}</span>
          </div>
          <p className="cap">Shaded band is the normal range (average ± 1.8σ), the limit the detector uses. Dashed line is the average.</p>
          <div className="why" style={{ "--c": m.anomalous ? C.red : C.mint }}>
            <h3>{m.anomalous ? "Why this is flagged" : "Why this looks normal"}</h3>
            <ul>
              <li><b>The rule.</b> The detector compares each reading with the last {n} readings. {cfg.label} is {f(m.current)}{cfg.unit} against an average of {f(mean)}{cfg.unit}, which is {Math.abs(z).toFixed(1)}σ {z > 0 ? "above" : "below"} it. {m.anomalous ? `Anything past ${LIMIT}σ is marked suspicious.` : `That is inside the ${LIMIT}σ limit.`}</li>
              <li><b>{m.anomalous ? "What it can mean." : "What to watch for."}</b> {MEANING[id]}</li>
              {attack && attack.metrics[id] !== undefined && <li><b>Matches the live simulation.</b> {attack.name} pushes {cfg.label.toLowerCase()} toward {attack.metrics[id]}{cfg.unit}. The Overview headline shows the current phase.</li>}
              {m.anomalous && !(attack && attack.metrics[id] !== undefined) && <li><b>No attack is simulated on this metric,</b> so this is a natural fluctuation or an injected spike. A real spike would warrant checking the hosts behind it.</li>}
            </ul>
          </div>
          <div className="stats">{stats.map(([l, v]) => <div key={l}><span>{l}</span><b>{v}<small>{l === "Anomaly score" || l === "Std dev" ? "" : cfg.unit}</small></b></div>)}</div>
        </div>
      </div>
    </div>
  );
}

function Drawer({ onClose, onLaunch }) {
  const [sel, setSel] = useState(null);
  return (
    <div className="veil" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-label="Simulate attack" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><h2>Simulate an attack</h2><button className="btn" onClick={onClose}>Close</button></div>
        <p>Injects synthetic telemetry only. No real systems are touched.</p>
        {ATTACK_TYPES.map(a => (
          <button key={a.id} className="opt" style={{ "--c": a.color }} aria-pressed={sel === a.id} onClick={() => setSel(sel === a.id ? null : a.id)}>
            <b>{a.name}</b><p>{a.description}</p>
            {sel === a.id && <ol>{a.phases.map(p => <li key={p}>{p}</li>)}</ol>}
          </button>
        ))}
        <button className="btn go" style={{ width: "100%", padding: 12, marginTop: 8, opacity: sel ? 1 : 0.4 }} disabled={!sel} onClick={() => onLaunch(ATTACK_TYPES.find(a => a.id === sel))}>
          {sel ? `Launch ${ATTACK_TYPES.find(a => a.id === sel).name}` : "Pick a scenario"}
        </button>
      </aside>
    </div>
  );
}

export default function App() {
  const [metrics, setMetrics] = useState(initMetrics);
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());
  const [running, setRunning] = useState(true);
  const [burst, setBurst] = useState(false);
  const [tab, setTab] = useState("overview");
  const [drawer, setDrawer] = useState(false);
  const [detail, setDetail] = useState(null);
  const [attack, setAttack] = useState(null);
  const [phase, setPhase] = useState(-1);
  const [st, setSt] = useState({});
  const [toasts, setToasts] = useState([]);
  const [topoKey, setTopoKey] = useState("college");
  const [threshold, setThreshold] = useState(1.8);
  const [falsePositives, setFalsePositives] = useState(new Set());
  const [feedback, setFeedback] = useState({});
  const [responseLog, setResponseLog] = useState([]);
  const topo = topoKey === "small" ? TOPOLOGY_SMALL : TOPOLOGY_COLLEGE;
  const targets = topo.nodes.filter(n => n.type !== "external");
  const timers = useRef([]), ids = useRef(0);

  const toast = useCallback((title, message, color) => {
    const id = ++ids.current;
    setToasts(t => [{ id, title, message, color }, ...t].slice(0, 3));
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4800);
  }, []);
  const push = useCallback(o => setAlerts(a => [{ id: ++ids.current, time: clock(), ...o }, ...a].slice(0, 80)), []);

  const tick = useCallback(() => {
    setMetrics(prev => {
      const next = {}, na = [], ov = attack?.metrics || {};
      for (const cfg of METRICS_CONFIG) {
        const p = prev[cfg.id], cl = Math.max(cfg.min, Math.min(cfg.max, genMetric(p.current, burst, ov[cfg.id])));
        const hist = [...p.history.slice(-59), cl], score = anomalyScore(cl, hist), anomalous = score > Math.max(0.2, (threshold / 4));
        next[cfg.id] = { current: cl, history: hist, score, anomalous };
        if (anomalous && score > 0.5 && Math.random() > 0.7) na.push({ id: ++ids.current, type: "metric", metric: cfg.label, score, value: `${cl.toFixed(1)}${cfg.unit}`, time: clock() });
      }
      if (na.length) setAlerts(a => [...na, ...a].slice(0, 80));
      return next;
    });
  }, [burst, attack]);

  useEffect(() => { if (!running) return; const i = setInterval(tick, 800); return () => clearInterval(i); }, [running, tick]);

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const launch = useCallback(a => {
    clear(); setDrawer(false); setAttack(a); setPhase(0); setSt({});
    toast(`${a.name} detected`, `${targets.length} hosts targeted`, a.color);
    a.phases.forEach((p, i) => timers.current.push(setTimeout(() => {
      setPhase(i); push({ type: "attack", attackName: a.name, severity: i >= 3 ? "CRITICAL" : "HIGH", message: p });
      toast(`Phase ${i + 1} of ${a.phases.length}`, p, i >= 3 ? C.red : a.color);
    }, i * 3800)));
    const step = Math.min(2200, Math.floor(18000 / targets.length));
    [...targets].sort(() => Math.random() - 0.5).forEach((d, i) => {
      timers.current.push(setTimeout(() => { setSt(s => ({ ...s, [d.id]: "compromising" })); }, 1500 + i * step));
      timers.current.push(setTimeout(() => {
        setSt(s => ({ ...s, [d.id]: "hijacked" }));
        push({ type: "attack", attackName: a.name, severity: "CRITICAL", message: `${d.label} (${d.ip}) compromised. Attacker has root access.` });
        toast("Host compromised", `${d.label} · ${d.ip}`, C.red);
      }, 1500 + i * step + Math.min(1500, step)));
    });
  }, [targets, toast, push]);

  const resolve = () => {
    clear(); setAttack(null); setPhase(-1); setSt({});
    toast("Threat contained", "Nodes restored and firewall rules updated.", C.mint);
    push({ type: "attack", attackName: "Response", severity: "MEDIUM", message: "Incident contained. Sessions revoked and forensic snapshot saved." });
  };
  const switchTopo = k => { if (k === topoKey) return; clear(); setAttack(null); setPhase(-1); setSt({}); setTopoKey(k); };

  const vals = Object.values(metrics), off = vals.filter(m => m.anomalous).length;
  const egressHistory = metrics.egress.history;
  const cumulativeEgress = egressHistory.slice(-15).reduce((sum, value) => sum + value, 0);
  const egressTrend = egressHistory.length > 1 ? egressHistory.at(-1) - egressHistory.at(-15) : 0;
  const slowExfilSuspected = !!(attack?.id === "low-slow-exfil" && cumulativeEgress > 250) || (egressTrend > 3 && cumulativeEgress > 250);
  const fpRate = alerts.length ? Math.round(falsePositives.size / alerts.length * 100) : 0;
  const bad = Object.values(st).filter(v => v === "hijacked").length;
  const threat = Math.min(100, Math.round(Math.max((vals.reduce((a, m) => a + m.score, 0) / vals.length) * 150, (bad / targets.length) * 100)));
  const visible = alerts.filter(a => !dismissed.has(a.id));
  const dismiss = id => setDismissed(d => new Set([...d, id]));
  const NavBtn = ({ id, label, children, badge }) => (
    <button className="nav" aria-current={tab === id} onClick={() => setTab(id)}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">{children}</svg>{label}{badge > 0 && <b>{badge > 99 ? "99+" : badge}</b>}
    </button>
  );

  return (
    <div className={attack ? "attack" : ""} style={{ minHeight: "100%" }}>
      <div className="stage" style={{ "--bg": `url(${bg})` }} />
      <div className="toasts" aria-live="polite">{toasts.map(t => <div key={t.id} className="toast" style={{ "--c": t.color }}><b>{t.title}</b><p>{t.message}</p></div>)}</div>
      {detail && <Detail id={detail} setId={setDetail} metrics={metrics} attack={attack} onClose={() => setDetail(null)} />}
      {drawer && <Drawer onClose={() => setDrawer(false)} onLaunch={launch} />}
      <div className="shell">
        <nav className="rail" aria-label="Views">
          <div className="mark"><svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.6" fill={attack ? C.red : C.cyan} /><circle cx="8" cy="8" r="6.4" stroke={attack ? C.red : C.cyan} strokeDasharray="2 2" /></svg></div>
          <NavBtn id="overview" label="Overview"><path d="M3 12a9 9 0 0 1 18 0M12 12l4-4M5 19h14" /></NavBtn>
          <NavBtn id="network" label="Topology"><path d="M12 4l7 4v8l-7 4-7-4V8z M12 4v16M5 8l14 8M19 8L5 16" /></NavBtn>
          <NavBtn id="resilience" label="Resilience"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7zM8 12l2.5 2.5L16 9" /></NavBtn>
          <NavBtn id="alerts" label="Alerts" badge={visible.length}><path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4" /></NavBtn>
        </nav>
        <main>
          <header className="top">
            <div className="brand">ANOMALYWATCH<span>{topo.subtitle}</span></div>
            <div className="acts">
              <button className="btn" onClick={() => setRunning(r => !r)}>{running ? "Pause feed" : "Resume feed"}</button>
              <button className="btn" onClick={() => { setBurst(true); setTimeout(() => setBurst(false), 5000); }}>Inject spike</button>
              <button className={"btn " + (attack ? "hot live" : "go")} onClick={() => setDrawer(true)}>{attack ? "Attack active" : "Simulate attack"}</button>
            </div>
          </header>

          {tab === "overview" && <>
            <section className="hero">
              <div>
                <h1>{attack ? `${attack.name} in progress` : off ? `${off} ${off === 1 ? "signal is" : "signals are"} off baseline` : "Network is within baseline"}</h1>
                <p>{attack ? attack.phases[Math.max(phase, 0)] : "Six live streams are scored against a rolling 50-sample window. Anything beyond the threshold lands in the feed."}</p>
                {attack && <>
                  <div className="phase" aria-label={`Phase ${phase + 1} of ${attack.phases.length}`}>{attack.phases.map((_, i) => <i key={i} style={{ background: i <= phase ? attack.color : undefined }} />)}</div>
                  <button className="btn go" style={{ marginTop: 16 }} onClick={resolve}>Contain and resolve</button>
                </>}
              </div>
              <Gauge value={threat} />
            </section>
            <div className="grid">
              <div className="signals">{METRICS_CONFIG.map(c => <Signal key={c.id} cfg={c} m={metrics[c.id]} onOpen={() => setDetail(c.id)} />)}</div>
              <div className="side">
                <div className="card"><h2>Live feed<small>{visible.length} alerts</small></h2>
                  <div className="feed">{visible.length ? visible.slice(0, 10).map(a => <AlertRow key={a.id} a={a} onDismiss={dismiss} />) : <div className="empty">Nothing off baseline. Alerts appear here as they fire.</div>}</div></div>
                <div className="card"><h2>Anomaly scores</h2>
                  <div className="bars">{METRICS_CONFIG.map(c => { const s = metrics[c.id].score; return <div key={c.id} style={{ "--c": s > 0.7 ? C.red : s > 0.4 ? C.amber : c.color }}><div><span>{c.label}</span><span>{(s * 100).toFixed(0)}%</span></div><div className="bar"><i style={{ width: `${s * 100}%` }} /></div></div>; })}</div></div>
              </div>
            </div>
          </>}

          {tab === "network" && <>
            <div className="seg" style={{ marginBottom: 14 }}>
              {[TOPOLOGY_SMALL, TOPOLOGY_COLLEGE].map(t => <button key={t.id} className="btn" aria-pressed={topoKey === t.id} onClick={() => switchTopo(t.id)}>{t.name}: {t.subtitle}</button>)}
            </div>
            <Topology key={topoKey} topo={topo} st={st} metrics={metrics} />
          </>}

          {tab === "resilience" && <section className="resilience">
            <div className="card"><h2>Threshold observatory <small>Adaptive detection</small></h2>
              <p className="muted">Attackers can learn a fixed line and stay just below it. Tune the sensitivity and compare point alerts with a cumulative trend detector.</p>
              <label className="threshold-control">Anomaly sensitivity <b>{threshold.toFixed(1)}σ</b><input type="range" min="1.0" max="3.5" step="0.1" value={threshold} onChange={e => setThreshold(Number(e.target.value))}/></label>
              <div className="mini-grid"><div><span>Single-sample threshold</span><b>{threshold.toFixed(1)}σ</b></div><div><span>15-sample outbound total</span><b>{cumulativeEgress.toFixed(0)} MB/min-samples</b></div><div><span>Outbound trend</span><b>{egressTrend >= 0 ? "+" : ""}{egressTrend.toFixed(1)} MB/min</b></div></div>
              <div className={"insight " + (slowExfilSuspected ? "danger" : "safe")}><b>{slowExfilSuspected ? "Cumulative exfiltration pattern detected" : "No sustained exfiltration pattern"}</b><p>{slowExfilSuspected ? "Individual readings may look harmless; the rolling total and gradual rise indicate a suspicious transfer pattern. Investigate destination, identity and data sensitivity." : "The detector also watches the accumulated outbound volume so a patient transfer cannot hide only by staying below a per-reading limit."}</p></div>
            </div>
            <div className="card"><h2>Host-aware response policy <small>Never isolate every machine the same way</small></h2>
              <p className="muted">Response is based on business criticality and host role. These are recommended actions in this simulator, not commands sent to real machines.</p>
              {[{name:"Domain Controller",role:"Identity / critical",action:"Restrict suspicious sessions, block malicious egress and require analyst approval before isolation."},{name:"NAS Storage",role:"Data / critical",action:"Pause unusual outbound transfers, preserve snapshots and keep essential internal access available."},{name:"Admin Workstation",role:"Privileged endpoint",action:"Quarantine endpoint VLAN, revoke active tokens and collect forensic evidence."},{name:"Lab PC Cluster",role:"Standard endpoint",action:"Automatically isolate the affected endpoint and allow clean rebuild."},{name:"Library / Hostel AP",role:"Shared network",action:"Apply client-level rate limits or block the offending device; do not shut down the whole access point."}].map(h => <div className="policy" key={h.name}><div><b>{h.name}</b><small>{h.role}</small></div><p>{h.action}</p></div>)}
              <button className="btn go" onClick={() => { setResponseLog([{time:clock(),message:"Policy simulation: critical hosts protected; suspicious egress throttled; standard endpoint isolated."},...responseLog].slice(0,5)); toast("Safe response simulated","Critical services remain online; containment is scoped to the affected host.",C.mint); }}>Run safe-response simulation</button>
              {responseLog.map((r,i)=><p className="muted" key={i}>{r.time} · {r.message}</p>)}
            </div>
            <div className="card"><h2>False-positive honesty <small>Analyst feedback loop</small></h2>
              <div className="mini-grid"><div><span>Alerts raised</span><b>{alerts.length}</b></div><div><span>Marked false positive</span><b>{falsePositives.size}</b></div><div><span>Current false-positive share</span><b>{fpRate}%</b></div></div>
              <p className="muted">A detector is not perfect. Mark an alert as a false positive when investigation finds a legitimate cause. The dashboard reports this feedback instead of treating every alarm as a confirmed attack.</p>
              <div className="feed">{alerts.slice(0,8).map(a=><div className="row" key={a.id}><b>{a.attackName || a.metric || "Alert"}</b><time>{a.time}</time><p>{a.message || `${a.metric}: ${a.value}`}</p><button className="btn" disabled={falsePositives.has(a.id)} onClick={()=>{setFalsePositives(v=>new Set([...v,a.id]));setFeedback(v=>({...v,[a.id]:"Reviewed: legitimate activity / false positive"}));}}>{falsePositives.has(a.id)?"Marked false positive":"Mark false positive"}</button>{feedback[a.id] && <small>{feedback[a.id]}</small>}</div>)}</div>
            </div>
          </section>}

          {tab === "alerts" && <div className="card" style={{ maxWidth: 860 }}>
            <h2>Alert log<button className="btn" onClick={() => { setAlerts([]); setDismissed(new Set()); }}>Clear all</button></h2>
            <div className="feed" style={{ maxHeight: "none" }}>{visible.length ? visible.map(a => <AlertRow key={a.id} a={a} onDismiss={dismiss} />) : <div className="empty">No alerts yet. Start a simulation to see the log fill up.</div>}</div>
          </div>}
        </main>
      </div>
    </div>
  );
}
