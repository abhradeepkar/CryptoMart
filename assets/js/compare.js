const coin1Select = document.getElementById('coin1Select');
const coin2Select = document.getElementById('coin2Select');
const compareBtn = document.getElementById('compareBtn');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const resultTableDiv = document.getElementById('resultTable');
const startMessageDiv = document.getElementById('startMessage');

const coin1NameTh = document.getElementById('coin1Name');
const coin2NameTh = document.getElementById('coin2Name');
const price1Td = document.getElementById('price1');
const price2Td = document.getElementById('price2');
const marketCap1Td = document.getElementById('marketCap1');
const marketCap2Td = document.getElementById('marketCap2');
const volume1Td = document.getElementById('volume1');
const volume2Td = document.getElementById('volume2');
const change1Td = document.getElementById('change1');
const change2Td = document.getElementById('change2');
const rank1Td = document.getElementById('rank1');
const rank2Td = document.getElementById('rank2');
const supply1Td = document.getElementById('supply1');
const supply2Td = document.getElementById('supply2');

const CACHE_KEY = 'cryptomart_top100_coins_cache';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

const FALLBACK_COINS = [
  { id: 'bitcoin', name: 'Bitcoin', image: '', current_price: 0, market_cap: 0, total_volume: 0, price_change_percentage_24h: 0, market_cap_rank: 1, circulating_supply: 0 },
  { id: 'ethereum', name: 'Ethereum', image: '', current_price: 0, market_cap: 0, total_volume: 0, price_change_percentage_24h: 0, market_cap_rank: 2, circulating_supply: 0 },
  { id: 'solana', name: 'Solana', image: '', current_price: 0, market_cap: 0, total_volume: 0, price_change_percentage_24h: 0, market_cap_rank: 5, circulating_supply: 0 },
  { id: 'binancecoin', name: 'BNB', image: '', current_price: 0, market_cap: 0, total_volume: 0, price_change_percentage_24h: 0, market_cap_rank: 4, circulating_supply: 0 },
  { id: 'ripple', name: 'XRP', image: '', current_price: 0, market_cap: 0, total_volume: 0, price_change_percentage_24h: 0, market_cap_rank: 6, circulating_supply: 0 },
  { id: 'dogecoin', name: 'Dogecoin', image: '', current_price: 0, market_cap: 0, total_volume: 0, price_change_percentage_24h: 0, market_cap_rank: 8, circulating_supply: 0 }
];

let coinsMap = new Map();

function createCoinHeader(name, imageUrl) {
  const container = document.createElement('div');
  container.classList.add('coin-header');

  if (imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = `${name} logo`;
    container.appendChild(img);
  }

  const span = document.createElement('span');
  span.textContent = name;
  container.appendChild(span);

  return container;
}

function formatNumber(num) {
  if (num === undefined || num === null || isNaN(num)) return 'N/A';
  const abs = Math.abs(num);
  return abs >= 1e9 ? (num / 1e9).toFixed(2) + ' B'
       : abs >= 1e6 ? (num / 1e6).toFixed(2) + ' M'
       : abs >= 1e3 ? (num / 1e3).toFixed(2) + ' K'
       : Number(num).toFixed(2);
}

function setChangeColor(element, value) {
  if (value === undefined || value === null || isNaN(value)) {
    element.textContent = 'N/A';
    element.className = '';
    return;
  }
  element.textContent = value.toFixed(2) + '%';
  element.className = value > 0 ? 'positive' : (value < 0 ? 'negative' : '');
}

function populateSelects(coins) {
  coinsMap.clear();
  coin1Select.innerHTML = '<option value="">Select Coin 1</option>';
  coin2Select.innerHTML = '<option value="">Select Coin 2</option>';

  coins.forEach((coin) => {
    coinsMap.set(coin.id, coin);
    coin1Select.appendChild(new Option(coin.name, coin.id));
    coin2Select.appendChild(new Option(coin.name, coin.id));
  });
}

function getCachedCoins() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_TTL && Array.isArray(parsed.data) && parsed.data.length) {
      return parsed.data;
    }
  } catch (_) {}
  return null;
}

async function fetchCoinsList() {
  errorDiv.style.display = 'none';

  const cached = getCachedCoins();
  if (cached) {
    populateSelects(cached);
    return;
  }

  try {
    const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

    const coins = await res.json();
    if (!Array.isArray(coins) || coins.length === 0) {
      throw new Error('Empty coins list');
    }

    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: coins
    }));

    populateSelects(coins);
  } catch (error) {
    console.error('Coins list fetch error:', error);
    populateSelects(FALLBACK_COINS);
    errorDiv.style.display = 'block';
    errorDiv.textContent = 'Live API rate-limited. Showing basic fallback coins.';
  }
}

function clearTable() {
  price1Td.textContent = '';
  price2Td.textContent = '';
  marketCap1Td.textContent = '';
  marketCap2Td.textContent = '';
  volume1Td.textContent = '';
  volume2Td.textContent = '';
  change1Td.textContent = '';
  change1Td.className = '';
  change2Td.textContent = '';
  change2Td.className = '';
  rank1Td.textContent = '';
  rank2Td.textContent = '';
  supply1Td.textContent = '';
  supply2Td.textContent = '';
  coin1NameTh.textContent = 'Coin 1';
  coin2NameTh.textContent = 'Coin 2';
}

compareBtn.addEventListener('click', () => {
  const coin1Id = coin1Select.value;
  const coin2Id = coin2Select.value;

  errorDiv.style.display = 'none';
  loadingDiv.style.display = 'none';
  resultTableDiv.style.display = 'none';
  if (startMessageDiv) startMessageDiv.style.display = 'none';

  if (!coin1Id || !coin2Id) {
    errorDiv.style.display = 'block';
    errorDiv.textContent = 'Please select both coins.';
    return;
  }
  if (coin1Id === coin2Id) {
    errorDiv.style.display = 'block';
    errorDiv.textContent = 'Please select two different coins.';
    return;
  }

  const data1 = coinsMap.get(coin1Id);
  const data2 = coinsMap.get(coin2Id);

  if (!data1 || !data2) {
    errorDiv.style.display = 'block';
    errorDiv.textContent = 'Failed to load coin data.';
    return;
  }

  loadingDiv.style.display = 'block';
  clearTable();

  coin1NameTh.innerHTML = '';
  coin2NameTh.innerHTML = '';
  coin1NameTh.appendChild(createCoinHeader(data1.name, data1.image));
  coin2NameTh.appendChild(createCoinHeader(data2.name, data2.image));

  price1Td.textContent = `$${formatNumber(data1.current_price)}`;
  price2Td.textContent = `$${formatNumber(data2.current_price)}`;

  marketCap1Td.textContent = `$${formatNumber(data1.market_cap)}`;
  marketCap2Td.textContent = `$${formatNumber(data2.market_cap)}`;

  volume1Td.textContent = `$${formatNumber(data1.total_volume)}`;
  volume2Td.textContent = `$${formatNumber(data2.total_volume)}`;

  setChangeColor(change1Td, data1.price_change_percentage_24h);
  setChangeColor(change2Td, data2.price_change_percentage_24h);

  rank1Td.textContent = data1.market_cap_rank ?? 'N/A';
  rank2Td.textContent = data2.market_cap_rank ?? 'N/A';

  supply1Td.textContent = formatNumber(data1.circulating_supply);
  supply2Td.textContent = formatNumber(data2.circulating_supply);

  loadingDiv.style.display = 'none';
  resultTableDiv.style.display = 'block';
});

fetchCoinsList();