// Emotion Detection & Trading System
// Uses face-api.js for facial expression recognition

let emotionState = {
    isInitialized: false,
    isDetecting: false,
    lastEmotion: null,
    lastTradeTime: 0,
    tradeCooldown: 2000, // 2 seconds between trades
    emotionHistory: []
};

const EMOTION_ICONS = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    fearful: '😨',
    disgusted: '🤢',
    surprised: '😮',
    neutral: '😐'
};

// Check if face-api is loaded
function checkFaceApiLoaded() {
    if (typeof faceapi === 'undefined') {
        console.error('face-api.js not loaded!');
        return false;
    }
    console.log('face-api.js loaded successfully');
    return true;
}

// Initialize face-api.js models
async function loadFaceModels() {
    if (!checkFaceApiLoaded()) {
        updateCameraStatus('❌', 'AI library not loaded');
        showToast('Error', 'Face detection library failed to load', 'error');
        return false;
    }

    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

    try {
        console.log('Starting to load face detection models...');
        updateCameraStatus('📥', 'Loading AI models...');

        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);

        console.log('Face detection models loaded successfully');
        return true;
    } catch (error) {
        console.error('Error loading face-api models:', error);
        updateCameraStatus('❌', 'Failed to load AI models');
        showToast('AI Model Error', error.message || 'Could not load face detection models', 'error');
        return false;
    }
}


// Start camera
async function startCamera() {
    const video = document.getElementById('video');

    try {
        console.log('Requesting camera access...');
        updateCameraStatus('📷', 'Requesting camera access...');

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            },
            audio: false
        });

        console.log('Camera access granted!');
        video.srcObject = stream;

        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                console.log('Camera video loaded');
                updateCameraStatus('✅', 'Camera ready!');
                setTimeout(() => {
                    const statusEl = document.getElementById('camera-status');
                    if (statusEl) {
                        statusEl.style.display = 'none';
                    }
                }, 1500);
                resolve(true);
            };
        });
    } catch (error) {
        console.error('Camera error:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);

        let errorMessage = 'Camera access denied';
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Please allow camera access in your browser settings';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'No camera found on this device';
        } else if (error.name === 'NotReadableError') {
            errorMessage = 'Camera is already in use';
        }

        updateCameraStatus('❌', errorMessage);
        showToast('Camera Error', errorMessage, 'error');
        return false;
    }
}


function updateCameraStatus(icon, text) {
    document.querySelector('.status-icon').textContent = icon;
    document.querySelector('.status-text').textContent = text;
}

// Detect emotions from video
async function detectEmotions() {
    if (!emotionState.isDetecting) return;

    const video = document.getElementById('video');
    const canvas = document.getElementById('overlay-canvas');
    const displaySize = { width: video.width, height: video.height };

    if (video.readyState === 4) {
        // Detect face and expressions
        const detection = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

        if (detection) {
            // Update canvas size
            canvas.width = video.offsetWidth;
            canvas.height = video.offsetHeight;

            // Get dominant emotion
            const expressions = detection.expressions;
            const dominantEmotion = getDominantEmotion(expressions);

            // Update UI
            updateEmotionDisplay(dominantEmotion.emotion, dominantEmotion.confidence);

            // Check for trading trigger
            handleEmotionTrading(dominantEmotion.emotion, dominantEmotion.confidence);

            // Draw face box (optional)
            drawFaceBox(canvas, detection.detection.box, video);
        } else {
            updateEmotionDisplay('neutral', 0);
        }
    }

    // Continue detection
    requestAnimationFrame(detectEmotions);
}

function getDominantEmotion(expressions) {
    let maxEmotion = 'neutral';
    let maxConfidence = 0;

    for (const [emotion, confidence] of Object.entries(expressions)) {
        if (confidence > maxConfidence) {
            maxConfidence = confidence;
            maxEmotion = emotion;
        }
    }

    return { emotion: maxEmotion, confidence: maxConfidence };
}

function updateEmotionDisplay(emotion, confidence) {
    const icon = EMOTION_ICONS[emotion] || '😐';
    const text = emotion.charAt(0).toUpperCase() + emotion.slice(1);
    const percentage = Math.round(confidence * 100);

    document.getElementById('emotion-icon').textContent = icon;
    document.getElementById('emotion-text').textContent = text;
    document.getElementById('confidence-fill').style.width = `${percentage}%`;
    document.getElementById('confidence-label').textContent = `${percentage}%`;

    // Add visual feedback for trading emotions
    const indicator = document.getElementById('emotion-indicator');
    if (emotion === 'happy' && confidence > 0.6) {
        indicator.style.background = 'rgba(16, 185, 129, 0.1)';
    } else if (emotion === 'sad' && confidence > 0.6) {
        indicator.style.background = 'rgba(239, 68, 68, 0.1)';
    } else {
        indicator.style.background = 'transparent';
    }
}

function drawFaceBox(canvas, box, video) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / video.videoWidth;
    const scaleY = canvas.height / video.videoHeight;

    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.strokeRect(
        box.x * scaleX,
        box.y * scaleY,
        box.width * scaleX,
        box.height * scaleY
    );
}

// Handle emotion-based trading
function handleEmotionTrading(emotion, confidence) {
    const tradingEnabled = document.getElementById('trading-enabled').checked;
    if (!tradingEnabled || !state.selectedStock) return;

    const now = Date.now();
    const timeSinceLastTrade = now - emotionState.lastTradeTime;

    // Check cooldown
    if (timeSinceLastTrade < emotionState.tradeCooldown) return;

    // Require high confidence
    const confidenceThreshold = 0.65;
    if (confidence < confidenceThreshold) return;

    // Execute trade based on emotion
    if (emotion === 'happy') {
        executeBuyEmotion();
        emotionState.lastTradeTime = now;
    } else if (emotion === 'sad') {
        executeSellEmotion();
        emotionState.lastTradeTime = now;
    }
}

function executeBuyEmotion() {
    if (!state.selectedStock) return;

    const sharesPerTrade = parseInt(document.getElementById('shares-per-trade').value) || 1;
    const stockInfo = state.stockData[state.selectedStock];
    const totalCost = sharesPerTrade * stockInfo.currentPrice;

    if (totalCost > state.cash) {
        showToast('😊 Happy but Poor', 'Not enough cash to buy!', 'error');
        return;
    }

    // Update cash
    state.cash -= totalCost;

    // Update holdings
    if (state.holdings[state.selectedStock]) {
        const holding = state.holdings[state.selectedStock];
        const totalShares = holding.quantity + sharesPerTrade;
        const totalCostBasis = (holding.quantity * holding.avgPrice) + totalCost;
        holding.avgPrice = totalCostBasis / totalShares;
        holding.quantity = totalShares;
    } else {
        state.holdings[state.selectedStock] = {
            quantity: sharesPerTrade,
            avgPrice: stockInfo.currentPrice
        };
    }

    showToast(
        '😊 Happy Buy!',
        `Bought ${sharesPerTrade} share${sharesPerTrade > 1 ? 's' : ''} of ${state.selectedStock} at $${stockInfo.currentPrice.toFixed(2)}`,
        'success'
    );

    renderHoldings();
    updatePortfolioValues();
    updateSelectedStockDisplay();
}

function executeSellEmotion() {
    if (!state.selectedStock) return;

    const holding = state.holdings[state.selectedStock];
    if (!holding || holding.quantity === 0) {
        showToast('😢 Sad but Empty', 'No shares to sell!', 'error');
        return;
    }

    const sharesPerTrade = Math.min(
        parseInt(document.getElementById('shares-per-trade').value) || 1,
        holding.quantity
    );

    const stockInfo = state.stockData[state.selectedStock];
    const totalProceeds = sharesPerTrade * stockInfo.currentPrice;
    const costBasis = sharesPerTrade * holding.avgPrice;
    const realizedProfit = totalProceeds - costBasis;

    // Update cash
    state.cash += totalProceeds;

    // Track realized P&L
    state.realizedPL += realizedProfit;

    // Update holdings
    holding.quantity -= sharesPerTrade;
    if (holding.quantity === 0) {
        delete state.holdings[state.selectedStock];
    }

    const profitText = realizedProfit >= 0 ? `+$${realizedProfit.toFixed(2)}` : `-$${Math.abs(realizedProfit).toFixed(2)}`;

    showToast(
        '😢 Sad Sell!',
        `Sold ${sharesPerTrade} share${sharesPerTrade > 1 ? 's' : ''} of ${state.selectedStock} at $${stockInfo.currentPrice.toFixed(2)} (${profitText})`,
        'success'
    );

    renderHoldings();
    updatePortfolioValues();
    updateSelectedStockDisplay();
}

function updateSelectedStockDisplay() {
    const display = document.getElementById('selected-stock-display');

    if (!state.selectedStock) {
        display.innerHTML = '<p class="placeholder-text">Click a stock to select it for emotion trading</p>';
        display.classList.remove('active');
        return;
    }

    const stock = STOCKS.find(s => s.symbol === state.selectedStock);
    const stockInfo = state.stockData[state.selectedStock];
    const holding = state.holdings[state.selectedStock];

    display.classList.add('active');
    display.innerHTML = `
        <div class="stock-display-content">
            <div class="stock-display-header">
                <span class="stock-display-symbol">${stock.symbol}</span>
                <span class="stock-display-price">$${stockInfo.currentPrice.toFixed(2)}</span>
            </div>
            <div class="stock-display-name">${stock.name}</div>
            ${holding ? `<div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-secondary);">You own: ${holding.quantity} shares</div>` : ''}
        </div>
    `;
}

// Initialize emotion detection system
async function initEmotionDetection() {
    console.log('=== INITIALIZING EMOTION DETECTION ===');
    console.log('Checking if face-api.js loaded...');

    // Wait a bit for face-api to load
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!checkFaceApiLoaded()) {
        console.error('face-api.js did not load properly');
        updateCameraStatus('❌', 'AI library not loaded');
        const btn = document.getElementById('start-camera-btn');
        if (btn) {
            btn.style.display = 'block';
            btn.textContent = 'Retry';
            btn.onclick = () => {
                location.reload();
            };
        }
        showToast('Emotion Detection Failed', 'AI library did not load. Try refreshing the page.', 'error');
        return false;
    }

    console.log('Loading face detection models...');
    const modelsLoaded = await loadFaceModels();
    if (!modelsLoaded) {
        console.error('Failed to load face detection models');
        showToast('Emotion Detection Failed', 'Could not load AI models', 'error');
        const btn = document.getElementById('start-camera-btn');
        if (btn) {
            btn.style.display = 'block';
            btn.textContent = 'Retry';
            btn.onclick = () => initEmotionDetection();
        }
        return false;
    }

    console.log('Starting camera...');
    const cameraStarted = await startCamera();
    if (!cameraStarted) {
        console.error('Failed to start camera');
        const btn = document.getElementById('start-camera-btn');
        if (btn) {
            btn.style.display = 'block';
            btn.textContent = 'Try Again';
            btn.onclick = async () => {
                btn.style.display = 'none';
                const success = await startCamera();
                if (success) {
                    await finishInitialization();
                }
            };
        }
        return false;
    }

    await finishInitialization();
    return true;
}

async function finishInitialization() {
    console.log('Finishing initialization...');

    // Wait for video to be ready
    const video = document.getElementById('video');
    await new Promise(resolve => {
        if (video.readyState >= 2) {
            resolve();
        } else {
            video.addEventListener('loadeddata', resolve, { once: true });
        }
    });

    emotionState.isInitialized = true;
    emotionState.isDetecting = true;

    console.log('Starting detection loop...');
    // Start detection loop
    detectEmotions();

    showToast('Emotion Trading Active!', 'Smile to buy, frown to sell 😊😢', 'success');
    console.log('=== EMOTION DETECTION READY ===');
}

// Export for use in main app
window.emotionTrading = {
    init: initEmotionDetection,
    updateSelectedStockDisplay
};

console.log('emotion-detection.js loaded');
