# AnomalyWatch

Real-time anomaly detection dashboard with a cyber-attack simulator and
network topology views. Built with React + Vite.

## Run

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

Production build: `npm run build` (output in `dist/`).

## Features

- Six live metric streams (CPU, memory, latency, requests/sec, error rate, disk I/O)
- Sliding-window z-score anomaly scoring (50 samples), scored 0-100%
- Attack simulator: DDoS, ransomware, man-in-the-middle, cryptojacking, SQL injection
- Two switchable network topologies:
  - Network 1: client and server
  - Network 2: college campus network (15 nodes)
- One cinematic SOC theme (bg image tints red during an attack)
- Alert log with dismissable entries and toast notifications

## Notes

All data is simulated in the browser. There is no backend yet. The anomaly
scorer in `src/App.jsx` (`anomalyScore`) is a z-score heuristic, not a trained
Isolation Forest. Both are natural next steps if you want to connect a real
Express/MongoDB/Flask stack.

## Structure

```
anomalywatch/
  index.html
  package.json
  vite.config.js
  src/
    main.jsx
    App.jsx     # new UI
    data.js     # metrics, attacks, topologies, scoring
    styles.css
    assets/bg.jpg
```

## Resilience upgrades (Hurdle: attacker learns your threshold)

The Resilience view adds three defensive capabilities:

1. **Threshold observatory:** tune the anomaly sensitivity and inspect a rolling outbound-data total/trend. The Low-and-Slow Exfiltration scenario demonstrates why single-reading thresholds are insufficient: the detector also correlates sustained outbound activity.
2. **Host-aware response policy:** critical infrastructure (Domain Controller, NAS, shared access points) receives scoped containment recommendations rather than blanket shutdown. Standard endpoints can be isolated more aggressively. The button runs a simulation only; it does not touch real hosts.
3. **False-positive feedback:** analysts can mark alerts as false positives. The dashboard displays the count and share of alerts marked this way, making detector quality visible rather than claiming every alert is a confirmed attack.

The app remains a front-end simulation using synthetic telemetry. These controls are demonstration logic, not a production IDS/IPS or live endpoint-response integration.
