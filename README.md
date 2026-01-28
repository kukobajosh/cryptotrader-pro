# NexusTrader - Crypto Trading Bot Dashboard

A real-time, simulated cryptocurrency trading dashboard built with Vanilla JavaScript and Tailwind CSS.

## Features

- **Real-time Chart**: Simulated price movement using Chart.js with dynamic updates.
- **Automated Trading Bot**: A simple "Buy the Dip" algorithm with configurable Take-Profit and Stop-Loss settings.
- **Portfolio Management**: Real-time tracking of portfolio value across USD and BTC.
- **Manual Trading**: Buy and Sell Bitcoin with instant execution.
- **Transaction History**: Detailed log of all automated and manual trades.
- **Responsive Design**: Fully responsive layout optimized for desktop and tablet.

## Tech Stack

- **HTML5**: Semantic structure.
- **Tailwind CSS**: Utility-first styling (via CDN).
- **JavaScript (ES6+)**: Core application logic, state management, and simulation engine.
- **Chart.js**: Data visualization.

## How to Run

Since this is a static frontend application, you can run it using any static file server.

### Option 1: Using Vite (Recommended)
```bash
npm install
npm run dev
```

### Option 2: Simple Python Server
```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

## Bot Strategy

The "Auto-Pilot" bot uses a simplified strategy for demonstration:
1. **Entry**: Buys when the price drops >0.1% over the last 5 seconds ("Buy the Dip").
2. **Exit**: 
   - **Take Profit**: Sells when profit exceeds the configured percentage (default 1.5%).
   - **Stop Loss**: Sells when loss exceeds the configured percentage (default 2.0%).

*Note: This is a simulation for educational and UI demonstration purposes only.*