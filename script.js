// Constants & State
const CONFIG = {
    initialPrice: 42500,
    updateInterval: 1000, // ms
    volatility: 0.002 // 0.2% variance per tick
};

let state = {
    balance: 10000.00, // USD
    holdings: {
        btc: 0.0000,
    },
    price: CONFIG.initialPrice,
    history: [],
    bot: {
        active: false,
        takeProfit: 1.5, // %
        stopLoss: 2.0, // %
        lastBuyPrice: 0,
        status: 'Idle'
    },
    chartData: {
        labels: [],
        data: []
    }
};

let priceChart = null;
let currentTradeType = 'buy'; // 'buy' or 'sell'

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    setupEventListeners();
    updateUI();
    
    // Start Data Loop
    setInterval(tick, CONFIG.updateInterval);
});

// Chart.js Setup
function initChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // Generate initial history for the chart (last 60 seconds)
    const now = new Date();
    for(let i = 60; i > 0; i--) {
        state.chartData.labels.push(new Date(now - i * 1000).toLocaleTimeString());
        // Simple random walk for initial data
        let prevPrice = state.chartData.data[state.chartData.data.length - 1] || CONFIG.initialPrice;
        let change = prevPrice * (Math.random() - 0.5) * CONFIG.volatility;
        state.chartData.data.push(prevPrice + change);
    }
    state.price = state.chartData.data[state.chartData.data.length - 1];

    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: state.chartData.labels,
            datasets: [{
                label: 'BTC/USD',
                data: state.chartData.data,
                borderColor: '#2563eb', // brand-600
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    borderColor: '#334155',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    display: false,
                    grid: { display: false }
                },
                y: {
                    position: 'right',
                    grid: {
                        color: '#f1f5f9'
                    },
                    ticks: {
                        callback: (val) => '$' + val.toLocaleString()
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'nearest'
            }
        }
    });
}

// Core Loop
function tick() {
    simulateMarket();
    runBotLogic();
    updateChart();
    updateUI();
}

function simulateMarket() {
    // Random Walk simulation
    const changePercent = (Math.random() - 0.5) * CONFIG.volatility * 2;
    state.price = state.price * (1 + changePercent);
    
    // Push new data
    const now = new Date();
    state.chartData.labels.push(now.toLocaleTimeString());
    state.chartData.data.push(state.price);
    
    // Keep only last 100 points
    if(state.chartData.labels.length > 100) {
        state.chartData.labels.shift();
        state.chartData.data.shift();
    }
}

function updateChart() {
    if(!priceChart) return;
    
    priceChart.data.labels = state.chartData.labels;
    priceChart.data.datasets[0].data = state.chartData.data;
    
    // Dynamic color based on trend
    const start = state.chartData.data[0];
    const end = state.chartData.data[state.chartData.data.length - 1];
    const color = end >= start ? '#16a34a' : '#dc2626'; // green-600 : red-600
    const bg = end >= start ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)';
    
    priceChart.data.datasets[0].borderColor = color;
    priceChart.data.datasets[0].backgroundColor = bg;
    
    priceChart.update('none'); // 'none' for performance
}

function runBotLogic() {
    if(!state.bot.active) {
        state.bot.status = 'Idle';
        return;
    }

    // Bot Logic:
    // 1. If we hold BTC, check for Take Profit or Stop Loss
    // 2. If we don't hold BTC, simple strategy: Buy if price drops 0.5% in last 10 ticks (buy the dip)
    
    const currentPrice = state.price;
    const hasPosition = state.holdings.btc > 0.0001; // Minimum dust

    if (hasPosition) {
        const entryPrice = state.bot.lastBuyPrice;
        const profitPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

        if (profitPercent >= state.bot.takeProfit) {
            // TAKE PROFIT
            executeTrade('sell', state.holdings.btc, 'Take Profit Triggered');
            state.bot.status = `Sold at +${profitPercent.toFixed(2)}%`;
        } else if (profitPercent <= -state.bot.stopLoss) {
            // STOP LOSS
            executeTrade('sell', state.holdings.btc, 'Stop Loss Triggered');
            state.bot.status = `Stopped at ${profitPercent.toFixed(2)}%`;
        } else {
            state.bot.status = `Holding (P&L: ${profitPercent > 0 ? '+' : ''}${profitPercent.toFixed(2)}%)`;
        }
    } else {
        // Simple Buy Strategy: "Buy the dip"
        // Look at last 5 prices, if trend is down, buy
        const recentPrices = state.chartData.data.slice(-5);
        const start = recentPrices[0];
        const end = recentPrices[recentPrices.length - 1];
        const drop = ((end - start) / start) * 100;
        
        // Random factor to make it trade occasionally for demo purposes
        const shouldBuy = drop < -0.1 && Math.random() > 0.7; 

        if (shouldBuy) {
            // Buy with 50% of balance
            const amountInUsd = state.balance * 0.5;
            const amountInBtc = amountInUsd / currentPrice;
            executeTrade('buy', amountInBtc, 'Dip Detected');
            state.bot.status = 'Bought the dip';
        } else {
            state.bot.status = 'Scanning market...';
        }
    }
}

// Trading Engine
function executeTrade(type, amount, note = 'Manual Trade') {
    if (amount <= 0) return;

    const totalValue = amount * state.price;
    const fee = totalValue * 0.001; // 0.1% fee

    if (type === 'buy') {
        if (state.balance < totalValue + fee) {
            alert('Insufficient USD balance');
            return;
        }
        state.balance -= (totalValue + fee);
        state.holdings.btc += amount;
        state.bot.lastBuyPrice = state.price; // Update entry price
    } else {
        if (state.holdings.btc < amount) {
            alert('Insufficient BTC balance');
            return;
        }
        state.balance += (totalValue - fee);
        state.holdings.btc -= amount;
        if(state.holdings.btc < 0.00000001) state.holdings.btc = 0; // Clear dust
    }

    // Log Trade
    const trade = {
        id: Date.now(),
        time: new Date(),
        type: type,
        price: state.price,
        amount: amount,
        total: totalValue,
        status: 'Filled',
        note: note
    };
    state.history.unshift(trade);
    if(state.history.length > 50) state.history.pop();
    
    updateHistoryTable();
    updateUI();
}

// UI Updates
function updateUI() {
    // Header Stats
    document.getElementById('current-price').innerText = formatCurrency(state.price);
    const totalPortfolio = state.balance + (state.holdings.btc * state.price);
    document.getElementById('header-balance').innerText = formatCurrency(totalPortfolio);
    
    // Assets Panel
    document.getElementById('btc-holding').innerText = state.holdings.btc.toFixed(4);
    document.getElementById('btc-value').innerText = formatCurrency(state.holdings.btc * state.price);
    document.getElementById('usdt-holding').innerText = formatCurrency(state.balance).replace('$', '');
    
    // Trading Panel
    document.getElementById('trade-available-balance').innerText = 
        currentTradeType === 'buy' 
            ? formatCurrency(state.balance) 
            : state.holdings.btc.toFixed(4) + ' BTC';

    // Bot Panel
    document.getElementById('bot-status').innerText = state.bot.status;
    
    // Calculate simulated stats
    const profitableTrades = state.history.filter(t => t.type === 'sell' && t.note.includes('Profit')).length;
    const totalTrades = state.history.filter(t => t.type === 'sell').length;
    const winRate = totalTrades > 0 ? Math.round((profitableTrades / totalTrades) * 100) : 0;
    
    document.getElementById('trade-count').innerText = state.history.length;
    document.getElementById('win-rate').innerText = winRate + '%';
    
    // Simple profit calc based on current portfolio vs initial 10k
    const profit = totalPortfolio - 10000;
    const profitEl = document.getElementById('total-profit');
    profitEl.innerText = (profit >= 0 ? '+' : '') + formatCurrency(profit);
    profitEl.className = `text-lg font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-600'}`;
}

function updateHistoryTable() {
    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';
    
    state.history.slice(0, 10).forEach(trade => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors border-b border-slate-50';
        tr.innerHTML = `
            <td class="px-6 py-4 text-slate-500">${trade.time.toLocaleTimeString()}</td>
            <td class="px-6 py-4 font-semibold ${trade.type === 'buy' ? 'text-green-600' : 'text-red-500'} uppercase">${trade.type}</td>
            <td class="px-6 py-4 text-slate-700">${formatCurrency(trade.price)}</td>
            <td class="px-6 py-4 text-slate-700">${trade.amount.toFixed(4)}</td>
            <td class="px-6 py-4 text-right text-slate-900 font-medium">${formatCurrency(trade.total)}</td>
            <td class="px-6 py-4 text-right">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ${trade.status}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function setupEventListeners() {
    // Buy/Sell Tabs
    const btnBuy = document.getElementById('tab-buy');
    const btnSell = document.getElementById('tab-sell');
    const btnExecute = document.getElementById('btn-execute-trade');
    
    btnBuy.addEventListener('click', () => {
        currentTradeType = 'buy';
        btnBuy.className = 'flex-1 py-3 text-sm font-semibold text-green-600 border-b-2 border-green-600 bg-green-50/50 transition-colors';
        btnSell.className = 'flex-1 py-3 text-sm font-semibold text-slate-500 hover:text-red-500 hover:bg-red-50/50 transition-colors';
        btnExecute.className = 'w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm shadow-green-600/20 transition-all';
        btnExecute.innerText = 'Buy BTC';
    });
    
    btnSell.addEventListener('click', () => {
        currentTradeType = 'sell';
        btnSell.className = 'flex-1 py-3 text-sm font-semibold text-red-600 border-b-2 border-red-600 bg-red-50/50 transition-colors';
        btnBuy.className = 'flex-1 py-3 text-sm font-semibold text-slate-500 hover:text-green-500 hover:bg-green-50/50 transition-colors';
        btnExecute.className = 'w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm shadow-red-600/20 transition-all';
        btnExecute.innerText = 'Sell BTC';
    });

    // Execute Trade
    btnExecute.addEventListener('click', () => {
        const amount = parseFloat(document.getElementById('trade-amount').value);
        if(isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        executeTrade(currentTradeType, amount);
        document.getElementById('trade-amount').value = '';
    });

    // Bot Controls
    document.getElementById('bot-toggle').addEventListener('change', (e) => {
        state.bot.active = e.target.checked;
        state.bot.status = state.bot.active ? 'Active' : 'Stopped';
    });

    document.getElementById('tp-slider').addEventListener('input', (e) => {
        state.bot.takeProfit = e.target.value;
        document.getElementById('tp-value').innerText = e.target.value + '%';
    });

    document.getElementById('sl-slider').addEventListener('input', (e) => {
        state.bot.stopLoss = e.target.value;
        document.getElementById('sl-value').innerText = e.target.value + '%';
    });
}

// Helpers
function formatCurrency(num) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

function setPercent(percent) {
    if (currentTradeType === 'buy') {
        const maxBuy = state.balance / state.price;
        document.getElementById('trade-amount').value = (maxBuy * percent * 0.99).toFixed(5); // 0.99 for fees
    } else {
        document.getElementById('trade-amount').value = (state.holdings.btc * percent).toFixed(5);
    }
}