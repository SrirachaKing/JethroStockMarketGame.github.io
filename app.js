
const INITIAL_CASH = 100000;
const TRADING_START_DATE = new Date('2015-11-24');
const TRADING_END_DATE = new Date('2025-11-24'); // 10 years
const DAYS_IN_PERIOD = 3652; // ~10 years

const STOCKS = [
    { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 175.50, icon: '🍎', volatility: 0.02 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', basePrice: 142.30, icon: '🔍', volatility: 0.025 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', basePrice: 378.85, icon: '💻', volatility: 0.018 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', basePrice: 151.25, icon: '📦', volatility: 0.03 },
    { symbol: 'TSLA', name: 'Tesla Inc.', basePrice: 238.45, icon: '⚡', volatility: 0.05 },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', basePrice: 495.20, icon: '🎮', volatility: 0.04 },
    { symbol: 'META', name: 'Meta Platforms', basePrice: 325.75, icon: '📱', volatility: 0.028 },
    { symbol: 'NFLX', name: 'Netflix Inc.', basePrice: 445.60, icon: '🎬', volatility: 0.035 }
];

let state = {
    cash: INITIAL_CASH,
    holdings: {}, // { symbol: { quantity, avgPrice } }
    selectedStock: null,
    stockData: {}, // { symbol: { currentPrice, priceHistory, dailyHigh, dailyLow, dailyOpen, volume } }
    currentTab: 'buy',
    currentDate: new Date(TRADING_START_DATE),
    currentDayIndex: 0,
    searchQuery: '',
    allPriceData: {}, // Store all 10 years of historical data
    realizedPL: 0, // Track total realized profit/loss from completed trades
    isMarketPaused: false,
    hasWon: false,
    events: [] // { type, title, message, timestamp }
};

function formatCurrency(amount) {
    return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// ============================================
// INITIALIZATION
// ============================================

function generateHistoricalData() {
    // Generate 10 years of price data for all stocks
    STOCKS.forEach(stock => {
        const priceHistory = [];
        let currentPrice = stock.basePrice;

        // Generate daily prices for 10 years
        for (let i = 0; i < DAYS_IN_PERIOD; i++) {
            priceHistory.push(currentPrice);

            // Simulate realistic price movements
            // Add trend component (slight upward bias)
            const trend = 0.0002 * currentPrice;
            // Add random walk
            const randomChange = (Math.random() - 0.48) * stock.volatility * currentPrice;
            // Occasional larger movements (5% chance)
            const largeMove = Math.random() < 0.05 ? (Math.random() - 0.5) * 0.1 * currentPrice : 0;

            currentPrice += trend + randomChange + largeMove;

            // Prevent prices from going too low
            if (currentPrice < stock.basePrice * 0.2) {
                currentPrice = stock.basePrice * 0.2;
            }
        }

        state.allPriceData[stock.symbol] = priceHistory;
    });
}

function initializeStockData() {
    STOCKS.forEach(stock => {
        const currentDayData = getCurrentDayData(stock.symbol);

        state.stockData[stock.symbol] = {
            currentPrice: currentDayData.close,
            priceHistory: currentDayData.history,
            dailyOpen: currentDayData.open,
            dailyHigh: currentDayData.high,
            dailyLow: currentDayData.low,
            volume: currentDayData.volume
        };
    });
}

function getCurrentDayData(symbol) {
    const allPrices = state.allPriceData[symbol];
    const dayIndex = state.currentDayIndex;

    // Get recent history (last 50 days up to current day)
    const historyStart = Math.max(0, dayIndex - 49);
    const history = allPrices.slice(historyStart, dayIndex + 1);

    // Get current day's OHLC
    const todayPrice = allPrices[dayIndex];
    const yesterdayPrice = dayIndex > 0 ? allPrices[dayIndex - 1] : todayPrice;

    // Simulate intraday high/low (±2%)
    const high = todayPrice * (1 + Math.random() * 0.02);
    const low = todayPrice * (1 - Math.random() * 0.02);

    return {
        open: yesterdayPrice,
        high: Math.max(high, todayPrice, yesterdayPrice),
        low: Math.min(low, todayPrice, yesterdayPrice),
        close: todayPrice,
        history: history,
        volume: Math.floor(Math.random() * 50000000) + 10000000
    };
}

// ============================================
// AUTOMATIC PRICE UPDATES
// ============================================

function updateStockPrices() {
    if (state.isMarketPaused) return;

    STOCKS.forEach(stock => {
        const stockInfo = state.stockData[stock.symbol];

        // Fixed change of $23
        const priceChangeAmount = 23;

        // Negative 30% of the time, Positive 70% of the time
        const direction = Math.random() < 0.30 ? -1 : 1;
        const priceChange = direction * priceChangeAmount;

        // Update current price
        const newPrice = stockInfo.currentPrice + priceChange;

        // Prevent prices from going below $10
        stockInfo.currentPrice = Math.max(10, newPrice);

        // Update daily high/low
        stockInfo.dailyHigh = Math.max(stockInfo.dailyHigh, stockInfo.currentPrice);
        stockInfo.dailyLow = Math.min(stockInfo.dailyLow, stockInfo.currentPrice);

        // Update price history
        stockInfo.priceHistory.push(stockInfo.currentPrice);
        if (stockInfo.priceHistory.length > 50) {
            stockInfo.priceHistory.shift();
        }

        // Update volume
        stockInfo.volume += Math.floor(Math.random() * 1000000);
    });

    // Re-render everything
    renderStocks();
    renderHoldings();
    updatePortfolioValues();

    // Update selected stock display if emotion trading is active
    if (state.selectedStock && window.emotionTrading) {
        window.emotionTrading.updateSelectedStockDisplay();
    }
}

function startAutomaticPriceUpdates() {
    console.log('🚀 Starting automatic price updates...');

    // Update prices every 1 second
    const intervalId = setInterval(() => {
        console.log('💰 Updating stock prices...');
        updateStockPrices();
    }, 1000);

    // Update Profit/Loss every 0.5 seconds
    setInterval(() => {
        updatePortfolioValues();
        renderHoldings();
    }, 500);

    // Start Market Crash System (checks every 1 second)
    startMarketCrashSystem();

    // Start Earnings Report System (checks every 1 second)
    startEarningsReportSystem();

    // Start Recession System (checks every 1 second)
    startRecessionSystem();

    // Start Warren Buffett System (checks every 1 second)
    startBuffettSystem();

    console.log('✅ Automatic price updates started (every 1 second)');
    showToast('Live Market Active', 'Prices updating every 1 second!', 'success');

    return intervalId;
}

function startBuffettSystem() {
    console.log('📈 Buffett System Active');

    setInterval(() => {
        if (state.isMarketPaused) return;

        // 1 in 300 chance (approx 0.33%)
        if (Math.random() < (1 / 300)) {
            triggerBuffettEvent();
        }
    }, 1000);
}

function triggerBuffettEvent() {
    // Pick one random stock
    const randomStock = STOCKS[Math.floor(Math.random() * STOCKS.length)];
    const stockInfo = state.stockData[randomStock.symbol];

    console.log(`📈 BUFFETT EVENT: Warren Buffett buys ${randomStock.name}!`);
    showToast('WHALE ALERT! 🐋', `Warren Buffett buys ${randomStock.name}! Stock up 1000%!`, 'success');

    // Up 1000% means adding 10x the current price (total 11x)
    const increaseAmount = stockInfo.currentPrice * 10;
    stockInfo.currentPrice += increaseAmount;

    // Update daily high/low
    stockInfo.dailyHigh = Math.max(stockInfo.dailyHigh, stockInfo.currentPrice);

    // Update price history
    stockInfo.priceHistory.push(stockInfo.currentPrice);
    if (stockInfo.priceHistory.length > 50) {
        stockInfo.priceHistory.shift();
    }

    // Force immediate re-render
    renderStocks();
    renderHoldings();
    updatePortfolioValues();

    // Update selected stock display if emotion trading is active
    if (state.selectedStock && window.emotionTrading) {
        window.emotionTrading.updateSelectedStockDisplay();
    }

    logEvent('buffett', 'Warren Buffett Buy', `Buffett bought ${randomStock.name}! Stock up 1000%!`);
}

function startRecessionSystem() {
    console.log('📉 Recession System Active');

    setInterval(() => {
        if (state.isMarketPaused) return;

        // 1 in 500 chance (0.2%)
        if (Math.random() < (1 / 500)) {
            triggerRecession();
        }
    }, 1000);
}

function triggerRecession() {
    console.log('📉 RECESSION TRIGGERED!');
    showToast('GREAT DEPRESSION!', '📉 RECESSION HIT! ALL STOCKS AT $1! 📉', 'error');

    STOCKS.forEach(stock => {
        const stockInfo = state.stockData[stock.symbol];

        // Set price to exactly $1
        stockInfo.currentPrice = 1.00;

        // Update daily high/low
        stockInfo.dailyLow = Math.min(stockInfo.dailyLow, stockInfo.currentPrice);

        // Update price history
        stockInfo.priceHistory.push(stockInfo.currentPrice);
        if (stockInfo.priceHistory.length > 50) {
            stockInfo.priceHistory.shift();
        }
    });

    // Force immediate re-render
    renderStocks();
    renderHoldings();
    updatePortfolioValues();

    // Update selected stock display if emotion trading is active
    if (state.selectedStock && window.emotionTrading) {
        window.emotionTrading.updateSelectedStockDisplay();
    }

    logEvent('recession', 'Market Recession', 'All stocks dropped to $1.00!');
}

function startEarningsReportSystem() {
    console.log('📊 Earnings Report System Active');

    setInterval(() => {
        if (state.isMarketPaused) return;

        // 1 in 80 chance (approx 1.25%)
        if (Math.random() < (1 / 80)) {
            triggerEarningsReport();
        }
    }, 1000);
}

function triggerEarningsReport() {
    // 50% chance of Good News (Up 50%) or Bad News (Down 50%)
    const isGoodNews = Math.random() < 0.5;
    const multiplier = 0.50; // 50% change

    console.log(`📊 EARNINGS REPORT: ${isGoodNews ? 'POSITIVE' : 'NEGATIVE'}`);

    const title = isGoodNews ? 'EARNINGS BOOM! 🚀' : 'EARNINGS MISS! 📉';
    const message = isGoodNews ? 'Massive earnings beat! Stocks soar 50%!' : 'Disappointing earnings! Stocks drop 50%!';
    const type = isGoodNews ? 'success' : 'error';

    showToast(title, message, type);

    STOCKS.forEach(stock => {
        const stockInfo = state.stockData[stock.symbol];
        const changeAmount = stockInfo.currentPrice * multiplier;

        if (isGoodNews) {
            stockInfo.currentPrice += changeAmount;
        } else {
            stockInfo.currentPrice -= changeAmount;
        }

        // Ensure price doesn't go below $0.01
        stockInfo.currentPrice = Math.max(0.01, stockInfo.currentPrice);

        // Update daily high/low
        stockInfo.dailyHigh = Math.max(stockInfo.dailyHigh, stockInfo.currentPrice);
        stockInfo.dailyLow = Math.min(stockInfo.dailyLow, stockInfo.currentPrice);

        // Update price history
        stockInfo.priceHistory.push(stockInfo.currentPrice);
        if (stockInfo.priceHistory.length > 50) {
            stockInfo.priceHistory.shift();
        }
    });

    // Force immediate re-render
    renderStocks();
    renderHoldings();
    updatePortfolioValues();

    // Update selected stock display if emotion trading is active
    if (state.selectedStock && window.emotionTrading) {
        window.emotionTrading.updateSelectedStockDisplay();
    }

    logEvent(
        isGoodNews ? 'earnings-good' : 'earnings-bad',
        isGoodNews ? 'Positive Earnings' : 'Negative Earnings',
        isGoodNews ? 'Market up 50% on good news!' : 'Market down 50% on bad news!'
    );
}

function startMarketCrashSystem() {
    console.log('⚠️ Market Crash System Active');

    setInterval(() => {
        if (state.isMarketPaused) return;

        // 1 in 80 chance (approx 1.25%)
        if (Math.random() < (1 / 80)) {
            triggerMarketCrash();
        }
    }, 1000);
}

function triggerMarketCrash() {
    console.log('📉 MARKET CRASH TRIGGERED!');
    showToast('MARKET CRASH!', '⚠️ ALL STOCKS PLUMMETING! ⚠️', 'error');

    STOCKS.forEach(stock => {
        const stockInfo = state.stockData[stock.symbol];

        // Drop between 50% and 75%
        const dropPercent = 0.50 + (Math.random() * 0.25);
        const dropAmount = stockInfo.currentPrice * dropPercent;

        stockInfo.currentPrice -= dropAmount;

        // Ensure price doesn't go below $0.01
        stockInfo.currentPrice = Math.max(0.01, stockInfo.currentPrice);

        // Update daily high/low
        stockInfo.dailyLow = Math.min(stockInfo.dailyLow, stockInfo.currentPrice);

        // Update price history
        stockInfo.priceHistory.push(stockInfo.currentPrice);
        if (stockInfo.priceHistory.length > 50) {
            stockInfo.priceHistory.shift();
        }
    });

    // Force immediate re-render
    renderStocks();
    renderHoldings();
    updatePortfolioValues();

    // Update selected stock display if emotion trading is active
    if (state.selectedStock && window.emotionTrading) {
        window.emotionTrading.updateSelectedStockDisplay();
    }

    logEvent('crash', 'Market Crash', 'All stocks plummeted 50-75%!');
}

// ============================================
// RENDERING FUNCTIONS
// ============================================

function renderStocks() {
    const stocksGrid = document.getElementById('stocks-grid');
    stocksGrid.innerHTML = '';

    STOCKS.forEach(stock => {
        const stockInfo = state.stockData[stock.symbol];
        const priceChange = stockInfo.currentPrice - stockInfo.dailyOpen;
        const priceChangePercent = (priceChange / stockInfo.dailyOpen) * 100;
        const isPositive = priceChange >= 0;

        const card = document.createElement('div');
        card.className = 'stock-card';
        card.innerHTML = `
            <div class="stock-header">
                <div class="stock-info">
                    <h3>${stock.symbol}</h3>
                    <p>${stock.name}</p>
                </div>
                <div class="stock-icon">${stock.icon}</div>
            </div>
            <div class="stock-price">
                <div class="price">${formatCurrency(stockInfo.currentPrice)}</div>
                <span class="change ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '+' : ''}${formatCurrency(Math.abs(priceChange))} (${isPositive ? '+' : ''}${priceChangePercent.toFixed(2)}%)
                </span>
            </div>
            <div class="mini-chart">
                <canvas id="mini-chart-${stock.symbol}" width="250" height="60"></canvas>
            </div>
        `;

        card.addEventListener('click', () => selectStock(stock.symbol));
        stocksGrid.appendChild(card);

        // Render mini chart
        renderMiniChart(stock.symbol);
    });
}

function renderMiniChart(symbol) {
    const canvas = document.getElementById(`mini-chart-${symbol}`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const stockInfo = state.stockData[symbol];
    const prices = stockInfo.priceHistory.slice(-20);

    const width = canvas.width;
    const height = canvas.height;
    const padding = 5;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const xStep = (width - padding * 2) / (prices.length - 1);

    ctx.clearRect(0, 0, width, height);

    // Draw line
    ctx.beginPath();
    prices.forEach((price, i) => {
        const x = padding + i * xStep;
        const y = height - padding - ((price - min) / range) * (height - padding * 2);

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw filled area
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();

    const fillGradient = ctx.createLinearGradient(0, 0, 0, height);
    fillGradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
    fillGradient.addColorStop(1, 'rgba(102, 126, 234, 0.0)');

    ctx.fillStyle = fillGradient;
    ctx.fill();
}

function renderHoldings() {
    const holdingsList = document.getElementById('holdings-list');

    const holdings = Object.entries(state.holdings);
    if (holdings.length === 0) {
        holdingsList.innerHTML = '<p class="placeholder-text">No holdings yet</p>';
        return;
    }

    holdingsList.innerHTML = '';
    holdings.forEach(([symbol, holding]) => {
        const stockInfo = state.stockData[symbol];
        const currentValue = holding.quantity * stockInfo.currentPrice;
        const costBasis = holding.quantity * holding.avgPrice;
        const profitLoss = currentValue - costBasis;
        const profitLossPercent = (profitLoss / costBasis) * 100;
        const isPositive = profitLoss >= 0;

        const item = document.createElement('div');
        item.className = 'holding-item';
        item.innerHTML = `
            <div class="holding-header">
                <span class="holding-symbol">${symbol}</span>
                <span class="holding-value">$${currentValue.toFixed(2)}</span>
            </div>
            <div class="holding-details">
                <span>${holding.quantity} shares @ ${formatCurrency(holding.avgPrice)}</span>
                <span class="${isPositive ? 'change positive' : 'change negative'}">
                    ${isPositive ? '+' : ''}${formatCurrency(Math.abs(profitLoss))} (${isPositive ? '+' : ''}${profitLossPercent.toFixed(2)}%)
                </span>
            </div>
        `;

        item.addEventListener('click', () => selectStockForSell(symbol));
        holdingsList.appendChild(item);
    });
}

function updatePortfolioValues() {
    let portfolioValue = state.cash;
    let unrealizedPL = 0;

    Object.entries(state.holdings).forEach(([symbol, holding]) => {
        const currentPrice = state.stockData[symbol].currentPrice;
        const currentValue = holding.quantity * currentPrice;
        const costBasis = holding.quantity * holding.avgPrice;

        portfolioValue += currentValue;
        unrealizedPL += (currentValue - costBasis);
    });

    const totalPL = unrealizedPL + state.realizedPL;

    document.getElementById('portfolio-value').textContent = formatCurrency(portfolioValue);
    document.getElementById('cash-balance').textContent = formatCurrency(state.cash);

    const plElement = document.getElementById('total-pl');
    plElement.textContent = `${totalPL >= 0 ? '+' : ''}${formatCurrency(totalPL).replace('-', '')}`;
    plElement.style.color = totalPL >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
    plElement.title = `Unrealized: ${unrealizedPL >= 0 ? '+' : ''}$${unrealizedPL.toFixed(2)}, Realized: ${state.realizedPL >= 0 ? '+' : ''}$${state.realizedPL.toFixed(2)}`;

    // Check for win condition
    if (portfolioValue >= 1000000 && !state.hasWon) {
        showWinModal();
    }
}

function logEvent(type, title, message) {
    const event = {
        type,
        title,
        message,
        timestamp: new Date().toLocaleTimeString()
    };

    state.events.unshift(event); // Add to beginning
    if (state.events.length > 50) state.events.pop(); // Keep last 50

    renderEvents();
}

function renderEvents() {
    const logContainer = document.getElementById('events-log');
    if (!logContainer) return;

    if (state.events.length === 0) {
        logContainer.innerHTML = '<div class="empty-state">No market events yet...</div>';
        return;
    }

    logContainer.innerHTML = '';
    state.events.forEach(event => {
        const item = document.createElement('div');
        item.className = `event-item ${event.type}`;

        let icon = '📢';
        if (event.type === 'crash') icon = '📉';
        if (event.type === 'recession') icon = '🔥';
        if (event.type === 'buffett') icon = '🐋';
        if (event.type === 'earnings-good') icon = '🚀';
        if (event.type === 'earnings-bad') icon = '🥀';

        item.innerHTML = `
            <div class="event-time">${event.timestamp}</div>
            <div class="event-icon">${icon}</div>
            <div class="event-content">
                <div class="event-title">${event.title}</div>
                <div class="event-desc">${event.message}</div>
            </div>
        `;

        logContainer.appendChild(item);
    });
}

function clearEventsLog() {
    state.events = [];
    renderEvents();
}

// ============================================
// TRADING FUNCTIONS
// ============================================

function selectStock(symbol) {
    state.selectedStock = symbol;

    // Update selected stock display for emotion trading
    if (window.emotionTrading) {
        window.emotionTrading.updateSelectedStockDisplay();
    }

    // Also show in modal
    showStockModal(symbol);
}

function selectStockForSell(symbol) {
    state.selectedStock = symbol;

    if (window.emotionTrading) {
        window.emotionTrading.updateSelectedStockDisplay();
    }
}

function updateBuyPanel() {
    const selectedStockDiv = document.getElementById('selected-stock-buy');

    if (!state.selectedStock) {
        selectedStockDiv.innerHTML = '<p class="placeholder-text">Select a stock to buy</p>';
        document.getElementById('execute-buy-btn').disabled = true;
        return;
    }

    const stock = STOCKS.find(s => s.symbol === state.selectedStock);
    const stockInfo = state.stockData[state.selectedStock];

    selectedStockDiv.innerHTML = `
        <div class="selected-stock-info">
            <h4>${stock.symbol} - ${stock.name}</h4>
            <div class="price">${formatCurrency(stockInfo.currentPrice)}</div>
        </div>
    `;

    updateBuyOrderSummary();
}

function updateSellPanel() {
    const selectedStockDiv = document.getElementById('selected-stock-sell');

    if (!state.selectedStock) {
        selectedStockDiv.innerHTML = '<p class="placeholder-text">Select a stock to sell</p>';
        document.getElementById('execute-sell-btn').disabled = true;
        return;
    }

    const stock = STOCKS.find(s => s.symbol === state.selectedStock);
    const stockInfo = state.stockData[state.selectedStock];
    const holding = state.holdings[state.selectedStock];
    const availableShares = holding ? holding.quantity : 0;

    selectedStockDiv.innerHTML = `
        <div class="selected-stock-info">
            <h4>${stock.symbol} - ${stock.name}</h4>
            <div class="price">${formatCurrency(stockInfo.currentPrice)}</div>
        </div>
    `;

    document.getElementById('sell-available').textContent = `Available: ${availableShares} shares`;
    document.getElementById('sell-quantity').max = availableShares;

    updateSellOrderSummary();
}

function updateBuyOrderSummary() {
    if (!state.selectedStock) return;

    const stockInfo = state.stockData[state.selectedStock];
    const quantity = parseInt(document.getElementById('buy-quantity').value) || 0;
    const totalCost = quantity * stockInfo.currentPrice;

    document.getElementById('buy-price-per-share').textContent = formatCurrency(stockInfo.currentPrice);
    document.getElementById('buy-quantity-display').textContent = quantity.toLocaleString();
    document.getElementById('buy-total-cost').textContent = formatCurrency(totalCost);

    const canAfford = totalCost <= state.cash && quantity > 0;
    document.getElementById('execute-buy-btn').disabled = !canAfford;
}

function updateSellOrderSummary() {
    if (!state.selectedStock) return;

    const stockInfo = state.stockData[state.selectedStock];
    const holding = state.holdings[state.selectedStock];
    const quantity = parseInt(document.getElementById('sell-quantity').value) || 0;
    const totalProceeds = quantity * stockInfo.currentPrice;

    document.getElementById('sell-price-per-share').textContent = formatCurrency(stockInfo.currentPrice);
    document.getElementById('sell-quantity-display').textContent = quantity.toLocaleString();
    document.getElementById('sell-total-proceeds').textContent = formatCurrency(totalProceeds);

    const canSell = holding && quantity > 0 && quantity <= holding.quantity;
    document.getElementById('execute-sell-btn').disabled = !canSell;
}

function executeBuy() {
    if (state.isMarketPaused) {
        showToast('Market Paused', 'Trading is disabled while market is stopped.', 'error');
        return;
    }

    if (!state.selectedStock) return;

    const quantity = parseInt(document.getElementById('buy-quantity').value);
    const stockInfo = state.stockData[state.selectedStock];
    const totalCost = quantity * stockInfo.currentPrice;

    if (totalCost > state.cash || quantity <= 0) {
        showToast('Insufficient funds', 'You don\'t have enough cash for this purchase', 'error');
        return;
    }

    // Update cash
    state.cash -= totalCost;

    // Update holdings
    if (state.holdings[state.selectedStock]) {
        const holding = state.holdings[state.selectedStock];
        const totalShares = holding.quantity + quantity;
        const totalCostBasis = (holding.quantity * holding.avgPrice) + totalCost;
        holding.avgPrice = totalCostBasis / totalShares;
        holding.quantity = totalShares;
    } else {
        state.holdings[state.selectedStock] = {
            quantity: quantity,
            avgPrice: stockInfo.currentPrice
        };
    }

    showToast(
        'Order Executed',
        `Bought ${quantity.toLocaleString()} shares of ${state.selectedStock} at ${formatCurrency(stockInfo.currentPrice)}`,
        'success'
    );

    renderHoldings();
    updatePortfolioValues();
    updateBuyOrderSummary();
}

function executeSell() {
    if (state.isMarketPaused) {
        showToast('Market Paused', 'Trading is disabled while market is stopped.', 'error');
        return;
    }

    if (!state.selectedStock) return;

    const quantity = parseInt(document.getElementById('sell-quantity').value);
    const holding = state.holdings[state.selectedStock];

    if (!holding || quantity <= 0 || quantity > holding.quantity) {
        showToast('Invalid order', 'You don\'t have enough shares to sell', 'error');
        return;
    }

    const stockInfo = state.stockData[state.selectedStock];
    const totalProceeds = quantity * stockInfo.currentPrice;

    // Update cash
    state.cash += totalProceeds;

    // Update holdings
    holding.quantity -= quantity;
    if (holding.quantity === 0) {
        delete state.holdings[state.selectedStock];
    }

    showToast(
        'Order Executed',
        `Sold ${quantity.toLocaleString()} shares of ${state.selectedStock} at ${formatCurrency(stockInfo.currentPrice)}`,
        'success'
    );

    renderHoldings();
    updatePortfolioValues();
    updateSellOrderSummary();
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function showStockModal(symbol) {
    const stock = STOCKS.find(s => s.symbol === symbol);
    const stockInfo = state.stockData[symbol];
    const priceChange = stockInfo.currentPrice - stockInfo.dailyOpen;
    const priceChangePercent = (priceChange / stockInfo.dailyOpen) * 100;
    const isPositive = priceChange >= 0;

    document.getElementById('modal-stock-symbol').textContent = stock.symbol;
    document.getElementById('modal-stock-name').textContent = stock.name;
    document.getElementById('modal-current-price').textContent = formatCurrency(stockInfo.currentPrice);

    const changeElement = document.getElementById('modal-price-change');
    changeElement.textContent = `${isPositive ? '+' : ''}${formatCurrency(Math.abs(priceChange))} (${isPositive ? '+' : ''}${priceChangePercent.toFixed(2)}%)`;
    changeElement.className = `price-change ${isPositive ? 'positive' : 'negative'}`;

    document.getElementById('modal-open').textContent = formatCurrency(stockInfo.dailyOpen);
    document.getElementById('modal-high').textContent = formatCurrency(stockInfo.dailyHigh);
    document.getElementById('modal-low').textContent = formatCurrency(stockInfo.dailyLow);
    document.getElementById('modal-volume').textContent = formatVolume(stockInfo.volume);

    renderStockChart(symbol);

    const modal = document.getElementById('stock-modal');
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('stock-modal');
    modal.classList.remove('active');
}

function showWinModal() {
    state.hasWon = true;
    state.isMarketPaused = true; // Pause the market

    // Update button text if it exists
    const btn = document.getElementById('toggle-market-btn');
    if (btn) {
        btn.textContent = 'Resume Market';
        btn.style.background = 'rgba(16, 185, 129, 0.2)';
        btn.style.color = '#6ee7b7';
        btn.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    }

    const modal = document.getElementById('win-modal');
    modal.classList.add('active');
}

function keepPlaying() {
    const modal = document.getElementById('win-modal');
    modal.classList.remove('active');

    // Resume market
    state.isMarketPaused = false;
    const btn = document.getElementById('toggle-market-btn');
    if (btn) {
        btn.textContent = 'Halt trading';
        btn.style.background = 'rgba(239, 68, 68, 0.2)';
        btn.style.color = '#fca5a5';
        btn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    }

    showToast('Game Continued', 'You are now playing in endless mode!', 'success');
}

function exitGame() {
    // Reload the page to reset the game
    location.reload();
}

function renderStockChart(symbol) {
    const canvas = document.getElementById('stock-chart');
    const ctx = canvas.getContext('2d');
    const stockInfo = state.stockData[symbol];
    const prices = stockInfo.priceHistory;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const xStep = (width - padding * 2) / (prices.length - 1);

    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
        const y = padding + (i / 5) * (height - padding * 2);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }

    // Draw line
    ctx.beginPath();
    prices.forEach((price, i) => {
        const x = padding + i * xStep;
        const y = height - padding - ((price - min) / range) * (height - padding * 2);

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw filled area
    const currentPath = ctx.getImageData(0, 0, width, height);
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();

    const fillGradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    fillGradient.addColorStop(0, 'rgba(102, 126, 234, 0.2)');
    fillGradient.addColorStop(1, 'rgba(102, 126, 234, 0.0)');
    ctx.fillStyle = fillGradient;
    ctx.fill();
}


// ============================================
// UTILITIES
// ============================================

function formatVolume(volume) {
    if (volume >= 1000000) {
        return (volume / 1000000).toFixed(2) + 'M';
    }
    return volume.toLocaleString();
}

function showToast(title, message, type = 'success') {
    const container = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function switchTab(tab) {
    state.currentTab = tab;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tab}-tab`);
    });

    // Reset selected stock when switching tabs
    if (tab === 'buy') {
        updateBuyPanel();
    } else {
        updateSellPanel();
    }
}

// ============================================
// TIME CONTROL FUNCTIONS
// ============================================

function advanceTime(days) {
    const newDayIndex = state.currentDayIndex + days;

    if (newDayIndex >= DAYS_IN_PERIOD) {
        showToast('Trading Period Ended', 'You\'veched the end of the 10-year trading period!', 'error');
        return;
    }

    state.currentDayIndex = newDayIndex;
    state.currentDate = new Date(TRADING_START_DATE);
    state.currentDate.setDate(state.currentDate.getDate() + newDayIndex);

    // Update stock prices for the new day
    initializeStockData();

    // Re-render everything
    renderStocks();
    renderHoldings();
    updatePortfolioValues();
    updateTimeDisplay();

    if (state.selectedStock) {
        if (state.currentTab === 'buy') {
            updateBuyPanel();
        } else {
            updateSellPanel();
        }
    }

    showToast('Time Advanced', `Jumped forward ${days} day${days > 1 ? 's' : ''}`, 'success');
}

function updateTimeDisplay() {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    document.getElementById('current-date').textContent = state.currentDate.toLocaleDateString('en-US', options);

    const yearsElapsed = state.currentDayIndex / 365.25;
    const progressPercent = (state.currentDayIndex / DAYS_IN_PERIOD) * 100;

    document.getElementById('time-progress-fill').style.width = `${progressPercent}%`;
    document.getElementById('time-progress-text').textContent = `${yearsElapsed.toFixed(1)} / 10 years`;
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

function filterStocks() {
    const query = state.searchQuery.toLowerCase();
    const stockCards = document.querySelectorAll('.stock-card');

    STOCKS.forEach((stock, index) => {
        const matchesSearch = stock.symbol.toLowerCase().includes(query) ||
            stock.name.toLowerCase().includes(query);

        const card = stockCards[index];
        if (card) {
            card.style.display = matchesSearch ? 'block' : 'none';
        }
    });
}

function handleSearch(event) {
    state.searchQuery = event.target.value;
    filterStocks();
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Buy form
    const buyQuantity = document.getElementById('buy-quantity');
    if (buyQuantity) buyQuantity.addEventListener('input', updateBuyOrderSummary);

    const executeBuyBtn = document.getElementById('execute-buy-btn');
    if (executeBuyBtn) executeBuyBtn.addEventListener('click', executeBuy);

    // Sell form
    const sellQuantity = document.getElementById('sell-quantity');
    if (sellQuantity) sellQuantity.addEventListener('input', updateSellOrderSummary);

    const executeSellBtn = document.getElementById('execute-sell-btn');
    if (executeSellBtn) executeSellBtn.addEventListener('click', executeSell);

    // Modal
    const modalClose = document.getElementById('modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    } else {
        console.warn('Element #modal-close not found');
    }

    const stockModal = document.getElementById('stock-modal');
    if (stockModal) {
        stockModal.addEventListener('click', (e) => {
            if (e.target.id === 'stock-modal') {
                closeModal();
            }
        });
    } else {
        console.warn('Element #stock-modal not found');
    }

    // Time controls
    const skipDay = document.getElementById('skip-day');
    if (skipDay) skipDay.addEventListener('click', () => advanceTime(1));

    const skipWeek = document.getElementById('skip-week');
    if (skipWeek) skipWeek.addEventListener('click', () => advanceTime(7));

    const skipMonth = document.getElementById('skip-month');
    if (skipMonth) skipMonth.addEventListener('click', () => advanceTime(30));

    const skipYear = document.getElementById('skip-year');
    if (skipYear) skipYear.addEventListener('click', () => advanceTime(365));

    // Search
    const stockSearch = document.getElementById('stock-search');
    if (stockSearch) stockSearch.addEventListener('input', handleSearch);

    // Market Pause
    const toggleMarketBtn = document.getElementById('toggle-market-btn');
    if (toggleMarketBtn) toggleMarketBtn.addEventListener('click', toggleMarketPause);

    // Win Modal Buttons
    const keepPlayingBtn = document.getElementById('keep-playing-btn');
    if (keepPlayingBtn) keepPlayingBtn.addEventListener('click', keepPlaying);

    const exitGameBtn = document.getElementById('exit-game-btn');
    if (exitGameBtn) exitGameBtn.addEventListener('click', exitGame);

    // Clear Events
    const clearEventsBtn = document.getElementById('clear-events-btn');
    if (clearEventsBtn) clearEventsBtn.addEventListener('click', clearEventsLog);
}

function toggleMarketPause() {
    state.isMarketPaused = !state.isMarketPaused;

    const btn = document.getElementById('toggle-market-btn');
    if (btn) {
        if (state.isMarketPaused) {
            btn.textContent = 'Resume Market';
            btn.style.background = 'rgba(16, 185, 129, 0.2)';
            btn.style.color = '#6ee7b7';
            btn.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            showToast('Market Paused', 'Prices and trading have been stopped.', 'warning');
        } else {
            btn.textContent = 'Halt trading';
            btn.style.background = 'rgba(239, 68, 68, 0.2)';
            btn.style.color = '#fca5a5';
            btn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            showToast('Market Resumed', 'Trading is active again.', 'success');
        }
    }
}

// ============================================
// START APPLICATION
// ============================================

function init() {
    console.log('init() called');
    try {
        showToast('Generating Market Data', 'Creating 10 years of historical stock data...', 'success');
    } catch (e) {
        console.error('Error in showToast:', e);
    }

    // Generate historical data first (this may take a moment)
    setTimeout(() => {
        console.log('Inside init setTimeout');
        try {
            generateHistoricalData();
            console.log('Historical data generated');
            initializeStockData();
            console.log('Stock data initialized');
            renderStocks();
            renderHoldings();
            updatePortfolioValues();
            updateTimeDisplay();
            setupEventListeners();

            console.log('About to start automatic price updates...');
            // Start automatic price updates
            startAutomaticPriceUpdates();
            console.log('After calling startAutomaticPriceUpdates');
        } catch (e) {
            console.error('Error in init setTimeout:', e);
        }

        showToast('Market Ready', 'Click "Start Emotion Trading" to begin!', 'success');

        // Set up manual camera start button - wait for emotion trading module
        const startBtn = document.getElementById('start-camera-btn');
        if (startBtn) {
            startBtn.onclick = async () => {
                console.log('Start button clicked!');

                if (!window.emotionTrading) {
                    console.error('emotionTrading module not loaded!');
                    showToast('Error', 'Emotion detection module not loaded. Please refresh the page.', 'error');
                    return;
                }

                startBtn.disabled = true;
                startBtn.textContent = 'Starting...';

                try {
                    await window.emotionTrading.init();
                } catch (error) {
                    console.error('Failed to initialize emotion trading:', error);
                    showToast('Initialization Failed', error.message || 'Could not start camera', 'error');
                    startBtn.disabled = false;
                    startBtn.textContent = 'Try Again';
                }
            };
            console.log('Button handler set up successfully');
        } else {
            console.error('Start button not found!');
        }
    }, 100);
}

console.log('app.js loaded');

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    console.log('DOM already loaded, running init immediately');
    init();
}
