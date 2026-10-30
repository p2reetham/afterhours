# 🛡️ AnomalyWatch
### Intelligent Network Anomaly Detection & Cyber-Attack Simulation

**Team Name:** CtrlFreaks  
**Project Name:** AnomalyWatch – Hurdle 3 Enhanced  
**Domain:** Cybersecurity | Network Anomaly Detection

---

## 📌 About the Project

AnomalyWatch is an interactive cybersecurity monitoring platform designed to detect unusual network behaviour, visualize potential cyber threats, and demonstrate how intelligent monitoring systems can identify suspicious activities.

The platform provides a real-time simulated Security Operations Center (SOC) dashboard where users can monitor network metrics, investigate anomalies, simulate cyberattacks, and explore different threat detection strategies.

It also demonstrates the limitations of conventional fixed-threshold detection through Low-and-Slow Data Exfiltration simulations.

## 🚀 Key Features

### 1. Live Network Monitoring
- Simulated real-time network telemetry.
- CPU and memory utilization monitoring.
- Network latency and request-rate tracking.
- Error-rate and outbound traffic monitoring.
- Historical metric visualization.

### 2. Cyber-Attack Simulation
Simulate different cybersecurity threats and observe their impact on network behaviour.

Supported scenarios include:
- Distributed Denial of Service (DDoS)
- Ransomware
- Man-in-the-Middle (MitM)
- Cryptojacking
- SQL Injection
- Low-and-Slow Data Exfiltration

### 3. Interactive Network Topology
- Visual representation of connected network nodes.
- Client-server and campus network configurations.
- Node inspection and monitoring.
- Visualization of suspicious and compromised nodes.

### 4. Threshold Observatory & Resilience Analysis
- Adjustable anomaly detection thresholds.
- Visualization of metric deviations.
- Low-and-Slow Exfiltration attack demonstration.
- Cumulative outbound traffic analysis.
- Host-aware containment recommendations.
- Identification of suspicious behaviour that may remain below conventional thresholds.

### 5. Security Analyst Dashboard
- Threat alert investigation.
- Confirm threat functionality.
- False-positive classification.
- Needs-review classification.
- Analyst feedback summaries.
- Explanation of detected anomalies.

## ⚙️ How It Works

AnomalyWatch generates simulated network telemetry and evaluates incoming metric samples against a rolling historical baseline.

The system uses statistical anomaly-scoring techniques, including z-score-style analysis, to identify unusual deviations.

The Low-and-Slow Exfiltration simulation demonstrates how attackers can gradually transfer data while keeping individual readings below fixed detection thresholds.

By examining cumulative outbound traffic alongside individual readings, the platform illustrates how sustained suspicious activity can be identified.

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React 18 |
| Build Tool | Vite 5 |
| Programming Language | JavaScript |
| Styling | CSS |
| Visualization | SVG and CSS |
| Deployment | Vercel |

## 📂 Project Structure

```text
anomalywatch/
│
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
│
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── data.js
    ├── styles.css
    │
    └── assets/
        └── bg.jpg
```

## 💻 Installation & Setup

### Prerequisites
- Node.js (LTS recommended)
- npm
- Git

### Step 1: Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
```

### Step 2: Navigate to the Project

```bash
cd anomalywatch
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Start the Development Server

```bash
npm run dev
```

Open the local URL displayed in your terminal, usually:

```text
http://localhost:5173
```

## 🏗️ Production Build

To generate the production-ready application:

```bash
npm run build
```

<<<<<<< HEAD
To preview the production build:

```bash
npm run preview
```

## ☁️ Deployment

AnomalyWatch can be deployed using Vercel.

1. Upload the project to GitHub.
2. Open Vercel.
3. Import the GitHub repository.
4. Select Vite as the framework preset.
5. Configure the following settings:

| Setting | Value |
|---|---|
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

6. Click **Deploy**.

## 🔬 Project Objectives

- Demonstrate network anomaly detection concepts.
- Visualize cybersecurity threats through interactive simulations.
- Explore the limitations of fixed-threshold detection.
- Demonstrate cumulative behavioural analysis.
- Improve security analyst awareness through explainable alerts.
- Provide an interactive environment for understanding network security.

## 🔮 Future Enhancements

- Integration with real-time network telemetry.
- Persistent cloud-based alert storage.
- Advanced behavioural anomaly detection.
- Historical threat intelligence analysis.
- Automated alert notifications.
- Integration with real network security infrastructure.

## ⚠️ Disclaimer

AnomalyWatch is an educational cybersecurity prototype. Network metrics and attack scenarios are simulated in the browser.

The application does not currently monitor real network traffic, execute actual containment operations, or provide production-grade intrusion prevention.

Anomaly scores indicate statistical deviations and should not be interpreted as confirmed attack probabilities.

## 👥 Team CtrlFreaks

**Project:** AnomalyWatch  
**Domain:** Cybersecurity & Network Anomaly Detection

*Building smarter ways to identify hidden network threats.*
=======
## Resilience upgrades (Hurdle: attacker learns your threshold)

The Resilience view adds three defensive capabilities:

1. **Threshold observatory:** tune the anomaly sensitivity and inspect a rolling outbound-data total/trend. The Low-and-Slow Exfiltration scenario demonstrates why single-reading thresholds are insufficient: the detector also correlates sustained outbound activity.
2. **Host-aware response policy:** critical infrastructure (Domain Controller, NAS, shared access points) receives scoped containment recommendations rather than blanket shutdown. Standard endpoints can be isolated more aggressively. The button runs a simulation only; it does not touch real hosts.
3. **False-positive feedback:** analysts can mark alerts as false positives. The dashboard displays the count and share of alerts marked this way, making detector quality visible rather than claiming every alert is a confirmed attack.

The app remains a front-end simulation using synthetic telemetry. These controls are demonstration logic, not a production IDS/IPS or live endpoint-response integration.
>>>>>>> d41b534 (third update: added new features ui enhancment)
