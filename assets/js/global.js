const coinsCount = document.getElementById('coins-count');
const exchangesCount = document.getElementById('exchanges-count');
const marketCap = document.getElementById('marketCap');
const marketCapChangeElement = document.getElementById('marketCapChange');
const volume = document.getElementById('volume');
const dominance = document.getElementById('dominance');

// Public repo-te push korar somoy placeholder rakho; local/live test-er somoy notun key bosao
const GEMINI_API_KEY = "YOUR_NEW_GEMINI_API_KEY";
const GEMINI_MODEL = "gemini-2.5-flash";

document.addEventListener("DOMContentLoaded", () => {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        body.id = savedTheme;
        updateIcon(savedTheme);
    }

    function updateIcon(currentTheme) {
        if (!themeToggle) return;
        if (currentTheme === 'light-theme') {
            themeToggle.classList.remove('ri-moon-line');
            themeToggle.classList.add('ri-sun-line');
        } else {
            themeToggle.classList.remove('ri-sun-line');
            themeToggle.classList.add('ri-moon-line');
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (body.id === 'light-theme') {
                body.id = 'dark-theme';
                localStorage.setItem('theme', 'dark-theme');
                updateIcon('dark-theme');
            } else {
                body.id = 'light-theme';
                localStorage.setItem('theme', 'light-theme');
                updateIcon('light-theme');
            }

            if (typeof initializeWidget === 'function') {
                initializeWidget();
            }
        });
    }

    const form = document.getElementById('searchForm');
    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();

            const searchInputEl = document.getElementById('searchInput');
            const query = searchInputEl ? searchInputEl.value.trim() : '';
            if (!query) return;

            window.location.href = `/pages/search.html?query=${encodeURIComponent(query)}`;
        });
    }

    const openMenuBtn = document.getElementById('openMenu');
    const overlay = document.querySelector('.overlay');
    const closeMenuBtn = document.getElementById('closeMenu');

    if (openMenuBtn && overlay) {
        openMenuBtn.addEventListener('click', () => {
            overlay.classList.add('show');
        });
    }

    if (closeMenuBtn && overlay) {
        closeMenuBtn.addEventListener('click', () => {
            overlay.classList.remove('show');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('show');
            }
        });
    }

    fetchGlobal();
});

function getLocalStorageData(key) {
    try {
        const storedData = localStorage.getItem(key);
        if (!storedData) return null;

        const parsedData = JSON.parse(storedData);
        if (!parsedData || typeof parsedData.timestamp !== 'number' || !parsedData.data) {
            return null;
        }

        const currentTime = Date.now();
        if (currentTime - parsedData.timestamp > 300000) {
            localStorage.removeItem(key);
            return null;
        }
        return parsedData.data;
    } catch (_) {
        return null;
    }
}

function setLocalStorageData(key, data) {
    try {
        const storedData = {
            timestamp: Date.now(),
            data: data
        };
        localStorage.setItem(key, JSON.stringify(storedData));
    } catch (_) {}
}

function setGlobalFallback() {
    if (coinsCount) coinsCount.textContent = 'N/A';
    if (exchangesCount) exchangesCount.textContent = 'N/A';
    if (marketCap) marketCap.textContent = 'N/A';
    if (marketCapChangeElement) marketCapChangeElement.textContent = 'N/A';
    if (volume) volume.textContent = 'N/A';
    if (dominance) dominance.textContent = 'BTC N/A% - ETH N/A%';
}

function fetchGlobal() {
    const localStorageKey = 'Global_Data';
    const localData = getLocalStorageData(localStorageKey);

    if (localData) {
        displayGlobalData(localData);
        return;
    }

    const options = { method: 'GET', headers: { accept: 'application/json' } };

    fetch('https://api.coingecko.com/api/v3/global', options)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const globalData = data && data.data ? data.data : null;
            if (!globalData) {
                throw new Error('Invalid global data structure');
            }
            displayGlobalData(globalData);
            setLocalStorageData(localStorageKey, globalData);
        })
        .catch(error => {
            setGlobalFallback();
            console.error(error);
        });
}

function displayGlobalData(globalData) {
    if (!globalData) return;

    if (coinsCount) coinsCount.textContent = globalData.active_cryptocurrencies || 'N/A';
    if (exchangesCount) exchangesCount.textContent = globalData.markets || 'N/A';

    if (marketCap) {
        marketCap.textContent = globalData.total_market_cap?.usd
            ? `$${(globalData.total_market_cap.usd / 1e12).toFixed(3)}T`
            : 'N/A';
    }

    const marketCapChange = globalData.market_cap_change_percentage_24h_usd;

    if (marketCapChangeElement) {
        if (typeof marketCapChange === 'number' && !Number.isNaN(marketCapChange)) {
            const changeText = `${marketCapChange.toFixed(1)}%`;
            marketCapChangeElement.innerHTML = `${changeText} <i class="${marketCapChange < 0 ? 'red' : 'green'} ri-arrow-${marketCapChange < 0 ? 'down' : 'up'}-s-fill"></i>`;
            marketCapChangeElement.style.color = marketCapChange < 0 ? 'red' : 'green';
        } else {
            marketCapChangeElement.textContent = 'N/A';
        }
    }

    if (volume) {
        volume.textContent = globalData.total_volume?.usd
            ? `$${(globalData.total_volume.usd / 1e9).toFixed(3)}B`
            : 'N/A';
    }

    if (dominance) {
        const btcDominance = globalData.market_cap_percentage?.btc
            ? `${globalData.market_cap_percentage.btc.toFixed(1)}%`
            : 'N/A';
        const ethDominance = globalData.market_cap_percentage?.eth
            ? `${globalData.market_cap_percentage.eth.toFixed(1)}%`
            : 'N/A';
        dominance.textContent = `BTC ${btcDominance} - ETH ${ethDominance}`;
    }
}

function toggleSpinner(listId, spinnerId, show) {
    const listElement = document.getElementById(listId);
    const spinnerElement = document.getElementById(spinnerId);

    if (spinnerElement) {
        spinnerElement.style.display = show ? 'block' : 'none';
    }
    if (listElement) {
        listElement.style.display = show ? 'none' : 'block';
    }
}

function createTable(headers, fixedIndex = 0) {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    table.appendChild(thead);

    const headerRow = document.createElement('tr');
    headers.forEach((header, index) => {
        const th = document.createElement('th');
        th.textContent = header;
        if (index === fixedIndex) {
            th.classList.add('table-fixed-column');
        }
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    return table;
}

function createWidget(containerId, widgetConfig, widgetSrc) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.classList.add('tradingview-widget-container__widget');
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = widgetSrc;
    script.async = true;
    script.innerHTML = JSON.stringify(widgetConfig);
    container.appendChild(script);

    setTimeout(() => {
        const copyright = document.querySelector('.tradingview-widget-copyright');
        if (copyright) {
            copyright.classList.remove('hidden');
        }
    }, 5000);
}

const scrollTopBtn = document.getElementById("scrollTop");
window.onscroll = () => {
    scrollFunction();
};

function scrollFunction() {
    if (!scrollTopBtn) return;
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        scrollTopBtn.style.display = "flex";
    } else {
        scrollTopBtn.style.display = "none";
    }
}

function scrollToTop() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}

// chat bot logic (Gemini API + History)
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

const chatHistory = [];

function addMessage(text, sender) {
    if (!chatMessages) return null;
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender);
    msgDiv.textContent = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msgDiv;
}

async function askGemini(userText) {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_NEW_GEMINI_API_KEY") {
        throw new Error("MISSING_API_KEY");
    }

    chatHistory.push({
        role: "user",
        parts: [{ text: userText }],
    });

    const recentHistory = chatHistory.slice(-16);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            systemInstruction: {
                parts: [
                    {
                        text: "You are a helpful cryptocurrency assistant for CryptoMart. Keep answers clear, concise, and accurate. You do not have access to live or real-time cryptocurrency prices. Whenever a user asks for the current or live price of a cryptocurrency, politely tell them in English to check our site (CryptoMart)ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Âsuch as the live ticker, market stats, top movers, or search/converter sectionÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Âfor the latest prices.",
                    },
                ],
            },
            contents: recentHistory,
        }),
    });

    if (!response.ok) {
        chatHistory.pop();
        let detail = "";
        try {
            const errJson = await response.json();
            detail = errJson?.error?.message ? ` - ${errJson.error.message}` : "";
        } catch (_) {}
        throw new Error(`Gemini API error: ${response.status}${detail}`);
    }

    const data = await response.json();
    const replyText =
        data?.candidates?.[0]?.content?.parts
            ?.map((part) => part.text || "")
            .join("")
            .trim() || "Sorry, I couldn't generate a response.";

    chatHistory.push({
        role: "model",
        parts: [{ text: replyText }],
    });

    return replyText;
}

if (chatForm && chatInput) {
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (!message) return;

        addMessage(message, 'user');
        chatInput.value = '';
        chatInput.disabled = true;

        const thinkingMsg = addMessage("Thinking...", 'bot');

        try {
            const reply = await askGemini(message);
            if (thinkingMsg) {
                thinkingMsg.textContent = reply;
            }
        } catch (error) {
            if (thinkingMsg) {
                thinkingMsg.textContent =
                    error.message === "MISSING_API_KEY"
                        ? "Gemini API key not connected."
                        : `Failed to connect to Gemini API (${error.message}). Please try again.`;
            }
            console.error("Gemini Chat Error:", error);
        } finally {
            chatInput.disabled = false;
            chatInput.focus();
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
    });
}
