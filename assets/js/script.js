const tabDataLoaded = {
    tab1: false,
    tab2: false,
    tab3: false,
    tab4: false
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedWithTTL(key, allowExpired = false) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && 'timestamp' in parsed && 'payload' in parsed) {
            const isFresh = Date.now() - parsed.timestamp < CACHE_TTL_MS;
            if ((isFresh || allowExpired) && parsed.payload != null) {
                return parsed.payload;
            }
        }
    } catch (_) {}
    return null;
}

function setCachedWithTTL(key, payload) {
    try {
        localStorage.setItem(key, JSON.stringify({
            timestamp: Date.now(),
            payload
        }));
    } catch (_) {}
}

function openTab(event, tabName) {
    const tabContent = document.querySelectorAll(".tab-content");
    const tabButtons = document.querySelectorAll(".tab-button");

    tabContent.forEach(content => content.style.display = "none");
    tabButtons.forEach(button => button.classList.remove("active"));

    const activePanel = document.getElementById(tabName);
    if (activePanel) activePanel.style.display = "block";
    if (event && event.currentTarget) event.currentTarget.classList.add("active");

    if (!tabDataLoaded[tabName]) {
        switch (tabName) {
            case 'tab1':
                fetchAndDisplay(
                    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=true',
                    ['asset-list'],
                    displayAssets,
                    tabName,
                    'Crypto_Data'
                );
                break;
            case 'tab2':
                fetchAndDisplay(
                    'https://api.coingecko.com/api/v3/exchanges',
                    ['exchange-list'],
                    displayExchanges,
                    tabName,
                    'Exchanges_Data'
                );
                break;
            case 'tab3':
                fetchAndDisplay(
                    'https://api.coingecko.com/api/v3/coins/categories',
                    ['category-list'],
                    displayCategories,
                    tabName,
                    'Categories_Data'
                );
                break;
            case 'tab4':
                fetchAndDisplay(
                    'https://api.coingecko.com/api/v3/companies/public_treasury/bitcoin',
                    ['company-list'],
                    displayCompanies,
                    tabName,
                    'Companies_Data'
                );
                break;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const firstTabBtn = document.querySelector(".tab-button");
    if (firstTabBtn) firstTabBtn.click();
    fetchData();
});

async function fetchData() {
    await fetchAndDisplay(
        'https://api.coingecko.com/api/v3/search/trending',
        ['coins-list', 'nfts-list'],
        displayTrends,
        null,
        'Trending_data'
    );
}

async function fetchAndDisplay(url, idsToToggle, displayFunction, tabName = null, localKey) {
    idsToToggle.forEach(id => {
        const errorElement = document.getElementById(`${id}-error`);
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        toggleSpinner(id, `${id}-spinner`, true);
    });

    const freshData = localKey ? getCachedWithTTL(localKey, false) : null;

    if (freshData) {
        idsToToggle.forEach(id => toggleSpinner(id, `${id}-spinner`, false));
        displayFunction(freshData);
        if (tabName) {
            tabDataLoaded[tabName] = true;
        }
        return;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API limit reached (${response.status})`);
        const data = await response.json();

        idsToToggle.forEach(id => toggleSpinner(id, `${id}-spinner`, false));
        displayFunction(data);
        if (localKey) {
            setCachedWithTTL(localKey, data);
        }
        if (tabName) {
            tabDataLoaded[tabName] = true;
        }
    } catch (error) {
        const staleData = localKey ? getCachedWithTTL(localKey, true) : null;
        idsToToggle.forEach(id => toggleSpinner(id, `${id}-spinner`, false));

        if (staleData) {
            displayFunction(staleData);
            if (tabName) {
                tabDataLoaded[tabName] = true;
            }
            return;
        }

        idsToToggle.forEach(id => {
            const errorElement = document.getElementById(`${id}-error`);
            if (errorElement) errorElement.style.display = 'block';
        });
        if (tabName) {
            tabDataLoaded[tabName] = false;
        }
    }
}

function displayTrends(data) {
    displayTrendCoins(data.coins.slice(0, 5));
    displayTrendNfts(data.nfts.slice(0, 5));
}

function displayTrendCoins(coins) {
    const coinsList = document.getElementById('coins-list');
    if (!coinsList) return;
    coinsList.innerHTML = '';
    const table = createTable(['Coin', 'Price', 'Market Cap', 'Volume', '24h%']);

    coins.forEach(coin => {
        const coinData = coin.item;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="name-column table-fixed-column"><img src="${coinData.thumb}" alt="${coinData.name}"> ${coinData.name} <span>(${coinData.symbol.toUpperCase()})</span></td>
            <td>${parseFloat(coinData.price_btc).toFixed(6)}</td>
            <td>$${coinData.data.market_cap}</td>
            <td>$${coinData.data.total_volume}</td>
            <td class="${coinData.data.price_change_percentage_24h.usd >= 0 ? 'green' : 'red'}">${coinData.data.price_change_percentage_24h.usd.toFixed(2)}%</td>
        `;
        row.onclick = () => window.location.href = `../../pages/coin.html?coin=${coinData.id}`;
        table.appendChild(row);
    });
    coinsList.appendChild(table);
}

function displayTrendNfts(nfts) {
    const nftsList = document.getElementById('nfts-list');
    if (!nftsList) return;
    nftsList.innerHTML = '';
    const table = createTable(['NFT', 'Market', 'Price', '24h Vol', '24h%']);

    nfts.forEach(nft => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="name-column table-fixed-column"><img src="${nft.thumb}" alt="${nft.name}"> ${nft.name} <span>(${nft.symbol.toUpperCase()})</span></td>
            <td>${nft.native_currency_symbol.toUpperCase()}</td>
            <td>$${nft.data.floor_price}</td>
            <td>$${nft.data.h24_volume}</td>
            <td class="${parseFloat(nft.data.floor_price_in_usd_24h_percentage_change) >= 0 ? 'green' : 'red'}">${parseFloat(nft.data.floor_price_in_usd_24h_percentage_change).toFixed(2)}%</td>
        `;
        table.appendChild(row);
    });
    nftsList.appendChild(table);
}

function displayAssets(data) {
    const cryptoList = document.getElementById('asset-list');
    if (!cryptoList) return;
    cryptoList.innerHTML = '';
    const table = createTable(['Rank', 'Coin', 'Price', '24h Price', '24h Price %', 'Total Vol', 'Market Cap', 'Last 7 Days'], 1);

    const sparklineData = [];
    data.forEach(asset => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="rank">${asset.market_cap_rank}</td>
            <td class="name-column table-fixed-column"><img src="${asset.image}" alt="${asset.name}"> ${asset.name} <span>(${asset.symbol.toUpperCase()})</span></td>
            <td>$${asset.current_price.toFixed(2)}</td>
            <td class="${asset.price_change_percentage_24h >= 0 ? 'green' : 'red'}">$${asset.price_change_24h.toFixed(2)}</td>
            <td class="${asset.price_change_percentage_24h >= 0 ? 'green' : 'red'}">${asset.price_change_percentage_24h.toFixed(2)}%</td>
            <td>$${asset.total_volume.toLocaleString()}</td>
            <td>$${asset.market_cap.toLocaleString()}</td>
            <td><canvas id="chart-${asset.id}" width="100" height="50"></canvas></td>
        `;
        table.appendChild(row);
        sparklineData.push({
            id: asset.id,
            sparkline: asset.sparkline_in_7d.price,
            color: asset.sparkline_in_7d.price[0] <= asset.sparkline_in_7d.price[asset.sparkline_in_7d.price.length - 1] ? 'green' : 'red'
        });
        row.onclick = () => window.location.href = `../../pages/coin.html?coin=${asset.id}`;
    });
    cryptoList.appendChild(table);

    sparklineData.forEach(({ id, sparkline, color }) => {
        const canvas = document.getElementById(`chart-${id}`);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: sparkline.map((_, index) => index),
                datasets: [
                    {
                        data: sparkline,
                        borderColor: color,
                        fill: false,
                        pointRadius: 0,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: false,
                scales: {
                    x: { display: false },
                    y: { display: false }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
    });
}

function displayExchanges(data) {
    const exchangeList = document.getElementById('exchange-list');
    if (!exchangeList) return;
    exchangeList.innerHTML = '';
    const table = createTable(['Rank', 'Exchange', 'Trust Score', '24h Trade', '24h Trade (Normal)', 'Country', 'Website', 'Year'], 1);

    data = data.slice(0, 20);

    data.forEach(exchange => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="rank">${exchange.trust_score_rank}</td>
            <td class="name-column table-fixed-column"><img src="${exchange.image}" alt="${exchange.name}"> ${exchange.name}</td>
            <td>${exchange.trust_score}</td>
            <td>$${exchange.trade_volume_24h_btc.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} BTC</td>
            <td>$${exchange.trade_volume_24h_btc_normalized.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} BTC</td>
            <td class="name-column">${exchange.country || 'N/A'}</td>
            <td class="name-column">${exchange.url}</td>
            <td>${exchange.year_established || 'N/A'}</td>
        `;
        table.appendChild(row);
    });
    exchangeList.appendChild(table);
}

function displayCategories(data) {
    const catagoriesList = document.getElementById('category-list');
    if (!catagoriesList) return;
    catagoriesList.innerHTML = '';
    const table = createTable(['Top Coins', 'Category', 'Market Cap', '24h Market Cap', '24h Volume'], 1);

    data = data.slice(0, 20);

    data.forEach(category => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${category.top_3_coins.map(coin => `<img src="${coin}" alt="coin">`).join('')}</td>
            <td class="name-column table-fixed-column">${category.name}</td>
            <td>$${category.market_cap ? category.market_cap.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : 'N/A'}</td>
            <td class="${category.market_cap_change_24h >= 0 ? 'green' : 'red'}">${category.market_cap_change_24h ? category.market_cap_change_24h.toFixed(3) : "0"}%</td>
            <td>$${category.volume_24h ? category.volume_24h.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : "N/A"}</td>
        `;
        table.appendChild(row);
    });
    catagoriesList.appendChild(table);
}

function displayCompanies(data) {
    const companyList = document.getElementById('company-list');
    if (!companyList) return;
    companyList.innerHTML = '';
    const table = createTable(['Company', 'Total BTC', 'Entry Value', 'Total Current Value', 'Total %']);

    data.companies.forEach(company => {
        const row = document.createElement('tr');
        row.innerHTML = `
           <td class="name-column table-fixed-column">${company.name}</td>
            <td>${company.total_holdings}</td>
            <td>${company.total_entry_value_usd}</td>
            <td>${company.total_current_value_usd}</td>
            <td class="${company.percentage_of_total_supply >= 0 ? 'green' : 'red'}">${company.percentage_of_total_supply}%</td>
        `;
        table.appendChild(row);
    });
    companyList.appendChild(table);
}

// crypto converter
let coin_first = document.getElementById('coin-first');
let coin = document.getElementById('coin');
let btc = document.getElementById('btc');

if (coin) {
    coin.addEventListener('change', () => {
        let a = coin.value;
        if (coin_first) coin_first.innerText = a.slice(0, 1);
        if (!btc) return;
        if (a === "Bitcoin") {
            btc.innerText = "BTC";
        } else if (a === "Ethereum") {
            btc.innerText = "ETH";
        } else if (a === "Tether") {
            btc.innerText = "USDT";
        } else {
            btc.innerText = "BNB";
        }
    });
}

let gov_coins = document.getElementById('gov-coins');
let coins = document.getElementById('coins');
let gov = document.getElementById('gov');

if (coins) {
    coins.addEventListener('change', () => {
        let a = coins.value;
        if (gov_coins) gov_coins.innerText = a.slice(0, 1);
        if (a === "Dollar") {
            if (gov_coins) gov_coins.innerText = "$";
            if (gov) gov.innerText = "USD";
        } else if (a === "Rupee") {
            if (gov_coins) gov_coins.innerText = "₹";
            if (gov) gov.innerText = "INR";
        } else if (a === "Riyal") {
            if (gov_coins) gov_coins.innerText = "﷼";
            if (gov) gov.innerText = "SAR";
        } else {
            if (gov_coins) gov_coins.innerText = "د.إ";
            if (gov) gov.innerText = "AED";
        }
    });
}

let crypto = document.getElementById('cr');
let goverment = document.getElementById('gv');

let bitcoin_dollar = 105485.00;
let ethereum_dollar = 2667.58;
let tether_dollar = 1.000024;
let bnb_dollar = 669.72;

if (crypto && goverment && coin && coins) {
    crypto.addEventListener('change', () => {
        const rates = {
            Bitcoin: bitcoin_dollar,
            Ethereum: ethereum_dollar,
            Tether: tether_dollar,
            BNB: bnb_dollar
        };
        const fiatMultiplier = {
            Dollar: 1,
            Rupee: 81,
            Riyal: 3.76,
            Dirham: 3.67
        };
        const baseUsd = rates[coin.value] ?? bitcoin_dollar;
        const mult = fiatMultiplier[coins.value] ?? 1;
        goverment.value = Number(crypto.value) * (baseUsd * mult);
    });
}

async function fetchCryptoNews() {
    const rss2jsonAPI = "https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss";
    const newsWrapper = document.getElementById('news-wrapper');
    if (!newsWrapper) return;

    try {
        const res = await fetch(rss2jsonAPI);
        const data = await res.json();

        if (!data.items || data.items.length === 0) {
            newsWrapper.innerHTML = "<p style='color:#fff; text-align:center;'>No news found.</p>";
            return;
        }

        newsWrapper.innerHTML = '';
        const newsItems = data.items.slice(0, 10);

        newsItems.forEach(item => {
            const newsCard = document.createElement('div');
            newsCard.classList.add('swiper-slide', 'box');

            newsCard.innerHTML = `
                <h3>${item.title}</h3>
                <p>${item.description.replace(/(<([^>]+)>)/gi, "").substring(0, 150)}...</p>
                <a href="${item.link}" target="_blank" rel="noopener noreferrer">Read More</a>
            `;

            newsWrapper.appendChild(newsCard);
        });

        if (window.cryptoSwiper) window.cryptoSwiper.destroy(true, true);

        window.cryptoSwiper = new Swiper('.crypto-news-swiper', {
            slidesPerView: 4,
            spaceBetween: 20,
            loop: true,
            grabCursor: true,
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            breakpoints: {
                320: { slidesPerView: 1, spaceBetween: 10 },
                640: { slidesPerView: 2, spaceBetween: 15 },
                900: { slidesPerView: 4, spaceBetween: 20 },
            },
            autoplay: {
                delay: 4000,
                disableOnInteraction: false,
            }
        });
    } catch (error) {
        newsWrapper.innerHTML = "<p style='color:#fff; text-align:center;'>Failed to load news.</p>";
        console.error("Failed to fetch news:", error);
    }
}

fetchCryptoNews();

const refreshNewsBtn = document.getElementById('refreshNewsBtn');
if (refreshNewsBtn) {
    refreshNewsBtn.addEventListener('click', () => {
        fetchCryptoNews();
    });
}

async function loadTopMovers() {
    const moversKey = 'TopMovers_Data';
    const freshMovers = getCachedWithTTL(moversKey, false);

    function renderMovers(data) {
        const sorted = [...data].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
        const gainers = sorted.slice(0, 5);
        const losers = sorted.slice(-5).reverse();

        const gainersList = document.getElementById("topmovers-gainers");
        const losersList = document.getElementById("topmovers-losers");
        if (!gainersList || !losersList) return;

        gainersList.innerHTML = "";
        losersList.innerHTML = "";

        function createSparkline(prices, isGain) {
            const width = 100;
            const height = 30;
            const maxPrice = Math.max(...prices);
            const minPrice = Math.min(...prices);
            const range = maxPrice - minPrice || 1;

            const points = prices.map((p, i) => {
                const x = (i / (prices.length - 1)) * width;
                const y = height - ((p - minPrice) / range) * height;
                return `${x},${y}`;
            }).join(" ");

            const strokeColor = isGain ? "limegreen" : "tomato";

            const svg = `
                <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" aria-label="sparkline graph" role="img">
                    <polyline
                        fill="none"
                        stroke="${strokeColor}"
                        stroke-width="2"
                        points="${points}"
                    />
                </svg>
            `;
            const wrapper = document.createElement("div");
            wrapper.classList.add("sparkline");
            wrapper.innerHTML = svg;
            return wrapper;
        }

        function createListItem(coin) {
            const item = document.createElement("li");
            const isGain = coin.price_change_percentage_24h > 0;
            item.style.color = isGain ? "limegreen" : "tomato";
            const sign = isGain ? "+" : "";

            const img = document.createElement("img");
            img.src = coin.image;
            img.alt = coin.name + " logo";
            img.style.width = "24px";
            img.style.height = "24px";
            img.style.borderRadius = "50%";
            img.style.marginRight = "8px";
            img.style.verticalAlign = "middle";

            const textSpan = document.createElement("span");
            textSpan.textContent = `${coin.name}: ${sign}${coin.price_change_percentage_24h.toFixed(2)}%`;
            textSpan.style.fontWeight = "600";

            let sparkPrices = coin.sparkline_in_7d?.price || [];
            if (sparkPrices.length > 24) {
                sparkPrices = sparkPrices.slice(-24);
            }

            const sparkline = createSparkline(sparkPrices, isGain);

            item.appendChild(img);
            item.appendChild(textSpan);
            item.appendChild(sparkline);

            return item;
        }

        gainers.forEach((coin) => gainersList.appendChild(createListItem(coin)));
        losers.forEach((coin) => losersList.appendChild(createListItem(coin)));
    }

    if (freshMovers) {
        renderMovers(freshMovers);
        return;
    }

    try {
        const res = await fetch(
            "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true"
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setCachedWithTTL(moversKey, data);
        renderMovers(data);
    } catch (error) {
        const staleMovers = getCachedWithTTL(moversKey, true);
        if (staleMovers) {
            renderMovers(staleMovers);
            return;
        }
        console.error("Error fetching top movers:", error);
    }
}

loadTopMovers();