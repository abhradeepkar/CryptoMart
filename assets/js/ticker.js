const TICKER_COIN_MAP = [
  { symbol: "BTC", id: "bitcoin" },
  { symbol: "ETH", id: "ethereum" },
  { symbol: "DOGE", id: "dogecoin" },
  { symbol: "SHIB", id: "shiba-inu" },
  { symbol: "APE", id: "apecoin" },
  { symbol: "SOL", id: "solana" },
  { symbol: "XRP", id: "ripple" },
  { symbol: "ADA", id: "cardano" },
  { symbol: "MATIC", id: "polygon-ecosystem-token" },
  { symbol: "LTC", id: "litecoin" },
  { symbol: "DOT", id: "polkadot" },
  { symbol: "TRX", id: "tron" },
  { symbol: "AVAX", id: "avalanche-2" },
  { symbol: "LINK", id: "chainlink" },
  { symbol: "UNI", id: "uniswap" },
  { symbol: "BNB", id: "binancecoin" },
  { symbol: "USDT", id: "tether" },
  { symbol: "USDC", id: "usd-coin" },
];

const TICKER_CACHE_KEY = "cryptomart_ticker_prices_v1";
const TICKER_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const TICKER_POLL_INTERVAL = 2 * 60 * 1000; // 2 minutes

function formatTickerText(data) {
  return TICKER_COIN_MAP.map(({ symbol, id }) => {
    const price = data?.[id]?.usd;
    const formattedPrice =
      typeof price === "number"
        ? price.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })
        : "N/A";
    return `${symbol}: ${formattedPrice}`;
  }).join(" | ");
}

function readTickerCache(allowExpired = false) {
  try {
    const raw = sessionStorage.getItem(TICKER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const isFresh = Date.now() - parsed.timestamp < TICKER_CACHE_TTL;
    if ((isFresh || allowExpired) && parsed.data) {
      return parsed.data;
    }
  } catch (_) {}
  return null;
}

function writeTickerCache(data) {
  try {
    sessionStorage.setItem(
      TICKER_CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), data })
    );
  } catch (_) {}
}

async function fetchTickerPrices(forceRefresh = false) {
  const targetEl = document.getElementById("licker");
  if (!targetEl) {
    console.error("Element with id 'licker' not found.");
    return;
  }

  if (!forceRefresh) {
    const cachedData = readTickerCache(false);
    if (cachedData) {
      targetEl.textContent = formatTickerText(cachedData);
      return;
    }
  }

  const ids = TICKER_COIN_MAP.map((c) => c.id).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;

  try {
    const res = await fetch(url);
    if (res.status === 429) {
      const staleData = readTickerCache(true);
      if (staleData) {
        targetEl.textContent = formatTickerText(staleData);
        return;
      }
      throw new Error("Rate limited (429)");
    }

    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }

    const data = await res.json();
    writeTickerCache(data);
    targetEl.textContent = formatTickerText(data);
  } catch (error) {
    const staleData = readTickerCache(true);
    if (staleData) {
      targetEl.textContent = formatTickerText(staleData);
      return;
    }
    targetEl.textContent = "Failed to load prices.";
    console.error("Ticker Fetch Error:", error);
  }
}

fetchTickerPrices();

setInterval(() => {
  if (!document.hidden) {
    fetchTickerPrices(true);
  }
}, TICKER_POLL_INTERVAL);