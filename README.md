# StockMarketGame.github.io
Fun stock market game that uses your emotions to buy and sell stocks! 
📊 Market Events (Checked every 1 second)
Event	Probability (per second)	What Happens:
- Earnings Report	1 in 80 (~1.25%)	Volatility Spike: Each stock individually flips a coin. Heads: +50% price. Tails: -50% price.
- Market Crash	1 in 80 (~1.25%)	Plummet: All stocks drop by a random amount between 50% and 75%.
- Warren Buffett Buy	1 in 300 (~0.33%)	Whale Alert: One random stock instantly shoots up by 1000% (11x its current price).
- Recession	1 in 500 (~0.20%)	Great Depression: Every single stock drops to exactly $1.00.

📈 Stock Price Movement (Every 1 second)
Every second, each stock updates its price independently:

70% Chance: Price goes UP by $23.
30% Chance: Price goes DOWN by $23.
