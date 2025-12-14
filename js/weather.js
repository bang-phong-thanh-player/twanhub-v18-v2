// weather.js
// Open-Meteo (free, no key) + Geocoding Open-Meteo + Air Quality (AQI)
// Goal: chỉ hiển thị khi user nhập thành phố + panel hoành tráng (icon + AQI)

window.TwanWeather = (function () {
  // ====== DOM ======
  const cityInput = document.getElementById("city-input");
  const cityForm = document.getElementById("city-form");

  const timeCityLabel = document.getElementById("time-city-label");
  const timeCurrent = document.getElementById("time-current");
  const timeDate = document.getElementById("time-date");

  const weatherSummary = document.getElementById("weather-summary");
  const weatherTemp = document.getElementById("weather-temp");
  const weatherHumidity = document.getElementById("weather-humidity");
  const weatherWind = document.getElementById("weather-wind");
  const weatherUv = document.getElementById("weather-uv");

  const sunriseEl = document.getElementById("sunrise");
  const sunsetEl = document.getElementById("sunset");

  // ====== STATE ======
  let currentPlace = null; // { cityLabel, timezone, lat, lon }
  let clockTimer = null;

  // recent cities
  const RECENT_KEY = "twanhub_recent_cities";
  const MAX_RECENT = 5;

  // ====== HELPERS ======
  function setLoading(isLoading) {
    if (!weatherSummary) return;
    if (isLoading) {
      weatherSummary.textContent = "⏳ Đang tải dữ liệu...";
      weatherSummary.dataset.loading = "1";
    } else {
      delete weatherSummary.dataset.loading;
    }
  }

  function clearOutputs() {
    if (timeCityLabel) timeCityLabel.textContent = "—";
    if (timeCurrent) timeCurrent.textContent = "--:--:--";
    if (timeDate) timeDate.textContent = "—";

    if (weatherSummary) weatherSummary.textContent = "Chưa có dữ liệu.";
    if (weatherTemp) weatherTemp.textContent = "—";
    if (weatherHumidity) weatherHumidity.textContent = "—";
    if (weatherWind) weatherWind.textContent = "—";
    if (weatherUv) weatherUv.textContent = "—";
    if (sunriseEl) sunriseEl.textContent = "—";
    if (sunsetEl) sunsetEl.textContent = "—";

    // AQI block reset (if exists)
    const aqiBadge = document.getElementById("aqi-badge");
    const aqiValue = document.getElementById("aqi-value");
    const pm25 = document.getElementById("pm25");
    const pm10 = document.getElementById("pm10");
    const aqiHint = document.getElementById("aqi-hint");
    if (aqiBadge) aqiBadge.textContent = "AQI —";
    if (aqiValue) aqiValue.textContent = "—";
    if (pm25) pm25.textContent = "—";
    if (pm10) pm10.textContent = "—";
    if (aqiHint) aqiHint.textContent = "Chưa có dữ liệu.";
  }

  function safeNum(n) {
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  }

  function toTimeOnly(isoStr) {
    if (!isoStr) return "—";
    const parts = String(isoStr).split("T");
    return parts[1] || isoStr;
  }

  function viWeatherText(code) {
    const map = {
      0: "Trời quang",
      1: "Chủ yếu quang",
      2: "Có mây rải rác",
      3: "Nhiều mây",
      45: "Sương mù",
      48: "Sương mù đóng băng",
      51: "Mưa phùn nhẹ",
      53: "Mưa phùn vừa",
      55: "Mưa phùn mạnh",
      56: "Mưa phùn lạnh nhẹ",
      57: "Mưa phùn lạnh mạnh",
      61: "Mưa nhẹ",
      63: "Mưa vừa",
      65: "Mưa lớn",
      66: "Mưa lạnh nhẹ",
      67: "Mưa lạnh mạnh",
      71: "Tuyết nhẹ",
      73: "Tuyết vừa",
      75: "Tuyết dày",
      77: "Tuyết hạt",
      80: "Mưa rào nhẹ",
      81: "Mưa rào vừa",
      82: "Mưa rào mạnh",
      85: "Mưa tuyết rào nhẹ",
      86: "Mưa tuyết rào mạnh",
      95: "Dông",
      96: "Dông kèm mưa đá nhẹ",
      99: "Dông kèm mưa đá mạnh",
    };
    return map[code] ?? "Thời tiết không xác định";
  }

  function weatherEmoji(code) {
    if (code == null) return "🌤️";
    if (code === 0) return "☀️";
    if (code === 1) return "🌤️";
    if (code === 2) return "⛅";
    if (code === 3) return "☁️";
    if (code === 45 || code === 48) return "🌫️";
    if (code >= 51 && code <= 57) return "🌦️";
    if (code >= 61 && code <= 67) return "🌧️";
    if (code >= 71 && code <= 77) return "🌨️";
    if (code >= 80 && code <= 82) return "🌧️";
    if (code === 85 || code === 86) return "🌨️";
    if (code >= 95) return "⛈️";
    return "🌤️";
  }

  function saveRecentCity(query, placeLabel) {
    const item = { q: query, label: placeLabel, at: Date.now() };
    let arr = [];
    try {
      arr = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      if (!Array.isArray(arr)) arr = [];
    } catch (_) {
      arr = [];
    }
    const lowerQ = String(query).toLowerCase();
    arr = arr.filter((x) => String(x?.q || "").toLowerCase() !== lowerQ);
    arr.unshift(item);
    arr = arr.slice(0, MAX_RECENT);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(arr));
    } catch (_) {}
    renderRecentChips();
  }

  function getRecentCities() {
    try {
      const arr = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function renderRecentChips() {
    if (!cityForm) return;

    let chips = document.getElementById("recent-cities-chips");
    if (!chips) {
      chips = document.createElement("div");
      chips.id = "recent-cities-chips";
      chips.className = "chips-row";
      cityForm.insertAdjacentElement("afterend", chips);
    }

    const recents = getRecentCities();
    chips.innerHTML = "";
    if (!recents.length) return;

    recents.forEach((r) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip-btn";
      b.textContent = r.label || r.q || "Recent";
      b.addEventListener("click", () => {
        if (cityInput) cityInput.value = r.q || "";
        if (r.q) fetchWeatherForCity(r.q);
      });
      chips.appendChild(b);
    });

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "chip-btn chip-danger";
    clearBtn.textContent = "✕ Xóa recent";
    clearBtn.addEventListener("click", () => {
      try { localStorage.removeItem(RECENT_KEY); } catch (_) {}
      renderRecentChips();
    });
    chips.appendChild(clearBtn);
  }

  function ensureAQICardExists() {
    // Insert an AQI card into the same tool-grid (after Weather card)
    const grid = document.querySelector('[data-tool-panel="time-weather"] .tool-grid');
    if (!grid) return;

    if (document.getElementById("aqi-card")) return;

    const card = document.createElement("div");
    card.className = "tool-card";
    card.id = "aqi-card";
    card.innerHTML = `
      <h3 class="tool-subtitle">🫁 Chất lượng không khí</h3>
      <div class="aqi-top">
        <div id="aqi-badge" class="aqi-badge">AQI —</div>
        <div class="aqi-big">
          <div class="aqi-label">US AQI</div>
          <div id="aqi-value" class="aqi-value">—</div>
        </div>
      </div>

      <div class="weather-row">
        <div>
          <div class="weather-label">PM2.5</div>
          <div id="pm25" class="weather-value">—</div>
        </div>
        <div>
          <div class="weather-label">PM10</div>
          <div id="pm10" class="weather-value">—</div>
        </div>
      </div>

      <p id="aqi-hint" class="tool-note">Chưa có dữ liệu.</p>
    `;

    // Insert after the 2nd card in grid (Time + Weather), else append
    const cards = grid.querySelectorAll(".tool-card");
    if (cards.length >= 2) cards[1].insertAdjacentElement("afterend", card);
    else grid.appendChild(card);
  }

  function aqiLevel(aqi) {
    if (aqi == null) return { label: "—", cls: "" };
    if (aqi <= 50) return { label: "Tốt", cls: "good" };
    if (aqi <= 100) return { label: "Trung bình", cls: "moderate" };
    if (aqi <= 150) return { label: "Kém", cls: "unhealthy-sg" };
    if (aqi <= 200) return { label: "Xấu", cls: "unhealthy" };
    if (aqi <= 300) return { label: "Rất xấu", cls: "very" };
    return { label: "Nguy hại", cls: "hazard" };
  }

  // ====== CLOCK ======
  function stopClock() {
    if (clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  }

  function startClock(timezone) {
    stopClock();
    if (!timezone) return;

    const tick = () => {
      const now = new Date();
      const timeOptions = {
        timeZone: timezone,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      };
      const dateOptions = {
        timeZone: timezone,
        weekday: "long",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      };
      if (timeCurrent) timeCurrent.textContent = now.toLocaleTimeString("vi-VN", timeOptions);
      if (timeDate) timeDate.textContent = now.toLocaleDateString("vi-VN", dateOptions);
    };

    tick();
    clockTimer = setInterval(tick, 1000);
  }

  // ====== API ======
  async function geocodeCity(cityName) {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      cityName
    )}&count=1&language=vi&format=json`;

    const geoRes = await fetch(geoUrl, { cache: "no-store" });
    const geoData = await geoRes.json();
    if (!geoData?.results?.length) return null;

    const place = geoData.results[0];
    const lat = safeNum(place.latitude);
    const lon = safeNum(place.longitude);
    const tz = place.timezone;

    if (lat == null || lon == null || !tz) return null;

    const cityLabel = `${place.name}${place.admin1 ? ", " + place.admin1 : ""}, ${place.country}`;
    return { lat, lon, timezone: tz, cityLabel };
  }

  async function fetchForecast(lat, lon, timezone) {
    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature,pressure_msl` +
      `&daily=sunrise,sunset,uv_index_max` +
      `&timezone=${encodeURIComponent(timezone)}`;

    const wRes = await fetch(weatherUrl, { cache: "no-store" });
    return wRes.json();
  }

  async function fetchAirQuality(lat, lon, timezone) {
    // using time-zone to align "current" correctly
    const url =
      `https://air-quality-api.open-meteo.com/v1/air-quality` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=us_aqi,pm2_5,pm10` +
      `&timezone=${encodeURIComponent(timezone)}`;

    const res = await fetch(url, { cache: "no-store" });
    return res.json();
  }

  // ====== MAIN FLOW ======
  async function fetchWeatherForCity(cityName) {
    const q = String(cityName || "").trim();
    if (!q) return;

    ensureAQICardExists();
    setLoading(true);

    try {
      const place = await geocodeCity(q);
      if (!place) {
        setLoading(false);
        if (weatherSummary) weatherSummary.textContent = "❌ Không tìm thấy thành phố. Thử gõ tiếng Anh (vd: Busan, Seoul).";
        return;
      }

      currentPlace = place;
      if (timeCityLabel) timeCityLabel.textContent = place.cityLabel;
      startClock(place.timezone);

      // load weather + AQI in parallel
      const [wData, aData] = await Promise.all([
        fetchForecast(place.lat, place.lon, place.timezone),
        fetchAirQuality(place.lat, place.lon, place.timezone),
      ]);

      // WEATHER
      const curr = wData?.current || {};
      const daily = wData?.daily || {};

      const temp = safeNum(curr.temperature_2m);
      const hum = safeNum(curr.relative_humidity_2m);
      const wind = safeNum(curr.wind_speed_10m);
      const code = safeNum(curr.weather_code);
      const feels = safeNum(curr.apparent_temperature);
      const pressure = safeNum(curr.pressure_msl);

      const sunrise = daily?.sunrise?.[0];
      const sunset = daily?.sunset?.[0];
      const uvMax = safeNum(daily?.uv_index_max?.[0]);

      if (weatherTemp) weatherTemp.textContent = temp != null ? `${temp.toFixed(1)}°C` : "—";
      if (weatherHumidity) weatherHumidity.textContent = hum != null ? `${Math.round(hum)}%` : "—";
      if (weatherWind) weatherWind.textContent = wind != null ? `${wind.toFixed(1)} km/h` : "—";
      if (weatherUv) weatherUv.textContent = uvMax != null ? uvMax.toFixed(1) : "—";

      if (sunriseEl) sunriseEl.textContent = toTimeOnly(sunrise);
      if (sunsetEl) sunsetEl.textContent = toTimeOnly(sunset);

      const desc = code != null ? viWeatherText(code) : "—";
      const emoji = weatherEmoji(code);

      const parts = [];
      parts.push(`📍 ${place.cityLabel}`);
      parts.push(`• ${emoji} ${desc}`);
      if (temp != null) parts.push(`• ${temp.toFixed(1)}°C`);
      if (feels != null) parts.push(`• Cảm giác: ${feels.toFixed(1)}°C`);
      if (pressure != null) parts.push(`• Áp suất: ${Math.round(pressure)} hPa`);
      if (weatherSummary) weatherSummary.textContent = parts.join(" ");

      // AQI
      const aCurr = aData?.current || {};
      const usAqi = safeNum(aCurr.us_aqi);
      const pm25v = safeNum(aCurr.pm2_5);
      const pm10v = safeNum(aCurr.pm10);

      const aqiBadge = document.getElementById("aqi-badge");
      const aqiValue = document.getElementById("aqi-value");
      const pm25 = document.getElementById("pm25");
      const pm10 = document.getElementById("pm10");
      const aqiHint = document.getElementById("aqi-hint");

      if (aqiValue) aqiValue.textContent = usAqi != null ? String(Math.round(usAqi)) : "—";
      if (pm25) pm25.textContent = pm25v != null ? `${pm25v.toFixed(1)} μg/m³` : "—";
      if (pm10) pm10.textContent = pm10v != null ? `${pm10v.toFixed(1)} μg/m³` : "—";

      if (aqiBadge) {
        const lvl = aqiLevel(usAqi);
        aqiBadge.className = `aqi-badge ${lvl.cls || ""}`;
        aqiBadge.textContent = usAqi != null ? `AQI ${Math.round(usAqi)} • ${lvl.label}` : "AQI —";
      }

      if (aqiHint) {
        if (usAqi == null) aqiHint.textContent = "Không có dữ liệu AQI ở khu vực này.";
        else {
          const lvl = aqiLevel(usAqi);
          aqiHint.textContent = `Gợi ý: mức “${lvl.label}”. Nếu AQI cao, hạn chế hoạt động ngoài trời / đeo khẩu trang.`;
        }
      }

      setLoading(false);
      saveRecentCity(q, place.cityLabel);
    } catch (err) {
      console.error(err);
      setLoading(false);
      if (weatherSummary) weatherSummary.textContent = "❌ Không lấy được dữ liệu (có thể do mạng/net).";
    }
  }

  function init() {
    clearOutputs();
    renderRecentChips();
    ensureAQICardExists();

    cityForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const city = cityInput?.value?.trim() || "";
      fetchWeatherForCity(city);
    });
  }

  return { init, fetchWeatherForCity };
})();
