// weather.js (PRO)
// - Open-Meteo Forecast (free, no key)
// - Open-Meteo Geocoding (free)
// - Open-Meteo Air Quality (free)
// Features: Recent cities chips + Weather icon + AQI badge
// Note: Nếu chưa chọn city -> không hiện giờ máy (đúng yêu cầu tối giản)

window.TwanWeather = (function () {
  const RECENT_KEY = "twanhub_recent_cities";
  const MAX_RECENT = 10;

  let current = {
    cityLabel: null,
    timezone: null,
    latitude: null,
    longitude: null,
  };

  // ===== DOM =====
  const cityInput = document.getElementById("city-input");
  const cityForm = document.getElementById("city-form");
  const recentWrap = document.getElementById("recent-cities");

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

  // AQI
  const aqiBadge = document.getElementById("aqi-badge");
  const aqiValue = document.getElementById("aqi-value");
  const aqiPM25 = document.getElementById("aqi-pm25");
  const aqiPM10 = document.getElementById("aqi-pm10");
  const aqiO3 = document.getElementById("aqi-o3");
  const aqiNO2 = document.getElementById("aqi-no2");
  const aqiNote = document.getElementById("aqi-note");

  // ===== helpers =====
  const toast = (m) => window.TwanToast?.show?.(m);

  function safeJSONParse(raw, fallback) {
    try { return JSON.parse(raw); } catch (_) { return fallback; }
  }

  function loadRecent() {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = safeJSONParse(raw, []);
    return Array.isArray(arr) ? arr : [];
  }

  function saveRecent(list) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT))); } catch (_) {}
  }

  function upsertRecent(item) {
    const list = loadRecent();
    const key = `${item.name}|${item.country}|${item.timezone}`;
    const filtered = list.filter(x => `${x.name}|${x.country}|${x.timezone}` !== key);
    filtered.unshift(item);
    saveRecent(filtered);
    renderRecent();
  }

  function renderRecent() {
    if (!recentWrap) return;
    const list = loadRecent();
    recentWrap.innerHTML = "";

    if (!list.length) {
      const tip = document.createElement("div");
      tip.className = "tool-note";
      tip.textContent = "Recent: chưa có. Nhập 1 thành phố rồi bấm Cập nhật vị trí.";
      recentWrap.appendChild(tip);
      return;
    }

    list.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip-btn";
      b.textContent = `${c.name}`;
      b.title = `${c.name}, ${c.country}`;
      b.addEventListener("click", () => {
        if (cityInput) cityInput.value = c.name;
        applyCity({
          cityLabel: `${c.name}, ${c.country}`,
          timezone: c.timezone,
          latitude: c.latitude,
          longitude: c.longitude,
        });
        fetchAll();
        toast?.(`📍 ${c.name}`);
      });
      recentWrap.appendChild(b);
    });
  }

  function setEmptyState() {
    if (timeCityLabel) timeCityLabel.textContent = "Chưa chọn vị trí";
    if (timeCurrent) timeCurrent.textContent = "--:--:--";
    if (timeDate) timeDate.textContent = "—";

    if (weatherSummary) weatherSummary.textContent = "Nhập thành phố để xem thời tiết.";
    if (weatherTemp) weatherTemp.textContent = "—";
    if (weatherHumidity) weatherHumidity.textContent = "—";
    if (weatherWind) weatherWind.textContent = "—";
    if (weatherUv) weatherUv.textContent = "—";
    if (sunriseEl) sunriseEl.textContent = "—";
    if (sunsetEl) sunsetEl.textContent = "—";

    if (aqiBadge) { aqiBadge.textContent = "—"; aqiBadge.className = "aqi-badge"; }
    if (aqiValue) aqiValue.textContent = "—";
    if (aqiPM25) aqiPM25.textContent = "—";
    if (aqiPM10) aqiPM10.textContent = "—";
    if (aqiO3) aqiO3.textContent = "—";
    if (aqiNO2) aqiNO2.textContent = "—";
    if (aqiNote) aqiNote.textContent = "Nhập thành phố để lấy AQI.";
  }

  function applyCity({ cityLabel, timezone, latitude, longitude }) {
    current.cityLabel = cityLabel;
    current.timezone = timezone;
    current.latitude = latitude;
    current.longitude = longitude;

    if (timeCityLabel) timeCityLabel.textContent = cityLabel || "—";
  }

  function iconFromWeatherCode(code) {
    // Simple emoji mapping (đủ “pro vibe” mà gọn)
    // https://open-meteo.com/en/docs (weather_code)
    const c = Number(code);
    if ([0].includes(c)) return "☀️";
    if ([1,2].includes(c)) return "🌤️";
    if ([3].includes(c)) return "☁️";
    if ([45,48].includes(c)) return "🌫️";
    if ([51,53,55].includes(c)) return "🌦️";
    if ([56,57].includes(c)) return "🌧️";
    if ([61,63,65].includes(c)) return "🌧️";
    if ([66,67].includes(c)) return "🌧️";
    if ([71,73,75,77].includes(c)) return "🌨️";
    if ([80,81,82].includes(c)) return "🌧️";
    if ([85,86].includes(c)) return "🌨️";
    if ([95].includes(c)) return "⛈️";
    if ([96,99].includes(c)) return "⛈️";
    return "🌡️";
  }

  function aqiCategory(usAQI) {
    const v = Number(usAQI);
    if (!Number.isFinite(v)) return { label: "—", cls: "" };
    if (v <= 50) return { label: "Good", cls: "good" };
    if (v <= 100) return { label: "Moderate", cls: "moderate" };
    if (v <= 150) return { label: "Unhealthy (SG)", cls: "unhealthy-sg" };
    if (v <= 200) return { label: "Unhealthy", cls: "unhealthy" };
    if (v <= 300) return { label: "Very Unhealthy", cls: "very" };
    return { label: "Hazardous", cls: "hazard" };
  }

  function formatTimeForTZ(isoOrDate, tz) {
    try {
      const d = (isoOrDate instanceof Date) ? isoOrDate : new Date(isoOrDate);
      return d.toLocaleTimeString("vi-VN", { timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit" });
    } catch (_) {
      return "—";
    }
  }

  // ===== fetch: geocoding =====
  async function geocode(cityName) {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=vi&format=json`;
    const geoRes = await fetch(geoUrl, { cache: "no-store" });
    const geoData = await geoRes.json();

    if (!geoData?.results?.length) return null;

    const place = geoData.results[0];
    return {
      name: place.name,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: place.timezone,
    };
  }

  // ===== fetch: forecast =====
  async function fetchForecast() {
    const { latitude, longitude, timezone } = current;
    if (!latitude || !longitude || !timezone) return null;

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
      `&daily=sunrise,sunset,uv_index_max` +
      `&timezone=${encodeURIComponent(timezone)}`;

    const res = await fetch(url, { cache: "no-store" });
    return await res.json();
  }

  // ===== fetch: air quality =====
  async function fetchAirQuality() {
    const { latitude, longitude, timezone } = current;
    if (!latitude || !longitude || !timezone) return null;

    const url =
      `https://air-quality-api.open-meteo.com/v1/air-quality` +
      `?latitude=${latitude}&longitude=${longitude}` +
      `&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide` +
      `&timezone=${encodeURIComponent(timezone)}`;

    const res = await fetch(url, { cache: "no-store" });
    return await res.json();
  }

  function renderForecast(wData) {
    const curr = wData?.current;
    const daily = wData?.daily;

    const temp = curr?.temperature_2m;
    const hum = curr?.relative_humidity_2m;
    const wind = curr?.wind_speed_10m;
    const code = curr?.weather_code;

    const sunrise = daily?.sunrise?.[0];
    const sunset = daily?.sunset?.[0];
    const uvMax = daily?.uv_index_max?.[0];

    if (weatherTemp) weatherTemp.textContent = Number.isFinite(temp) ? `${temp.toFixed(1)}°C` : "—";
    if (weatherHumidity) weatherHumidity.textContent = Number.isFinite(hum) ? `${hum}%` : "—";
    if (weatherWind) weatherWind.textContent = Number.isFinite(wind) ? `${wind.toFixed(1)} km/h` : "—";
    if (weatherUv) weatherUv.textContent = Number.isFinite(uvMax) ? uvMax.toFixed(1) : "—";

    if (sunriseEl) sunriseEl.textContent = sunrise ? formatTimeForTZ(sunrise, current.timezone) : "—";
    if (sunsetEl) sunsetEl.textContent = sunset ? formatTimeForTZ(sunset, current.timezone) : "—";

    const icon = iconFromWeatherCode(code);
    if (weatherSummary) weatherSummary.textContent = `${icon} Thời tiết tại ${current.cityLabel || "—"}`;
  }

  function renderAirQuality(aData) {
    const c = aData?.current;
    const usAQI = c?.us_aqi;

    const cat = aqiCategory(usAQI);

    if (aqiBadge) {
      aqiBadge.textContent = cat.label;
      aqiBadge.className = `aqi-badge ${cat.cls || ""}`.trim();
    }
    if (aqiValue) aqiValue.textContent = Number.isFinite(usAQI) ? String(Math.round(usAQI)) : "—";

    const pm25 = c?.pm2_5;
    const pm10 = c?.pm10;
    const o3 = c?.ozone;
    const no2 = c?.nitrogen_dioxide;

    if (aqiPM25) aqiPM25.textContent = Number.isFinite(pm25) ? `${pm25.toFixed(1)}` : "—";
    if (aqiPM10) aqiPM10.textContent = Number.isFinite(pm10) ? `${pm10.toFixed(1)}` : "—";
    if (aqiO3) aqiO3.textContent = Number.isFinite(o3) ? `${o3.toFixed(1)}` : "—";
    if (aqiNO2) aqiNO2.textContent = Number.isFinite(no2) ? `${no2.toFixed(1)}` : "—";

    if (aqiNote) {
      if (Number.isFinite(usAQI)) aqiNote.textContent = `AQI realtime tại ${current.cityLabel || "—"}`;
      else aqiNote.textContent = "Không lấy được AQI (thử lại / đổi thành phố).";
    }
  }

  // ===== clock loop (only when city is selected) =====
  let clockTimer = 0;
  function startClockLoop() {
    clearInterval(clockTimer);

    clockTimer = setInterval(() => {
      if (!current.timezone) return;

      const now = new Date();
      const timeStr = now.toLocaleTimeString("vi-VN", {
        timeZone: current.timezone,
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const dateStr = now.toLocaleDateString("vi-VN", {
        timeZone: current.timezone,
        weekday: "long",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      if (timeCurrent) timeCurrent.textContent = timeStr;
      if (timeDate) timeDate.textContent = dateStr;
    }, 1000);
  }

  async function fetchAll() {
    if (!current.latitude || !current.longitude || !current.timezone) return;

    try {
      if (weatherSummary) weatherSummary.textContent = "⏳ Đang tải thời tiết...";
      if (aqiNote) aqiNote.textContent = "⏳ Đang tải AQI...";

      const [wData, aData] = await Promise.all([
        fetchForecast(),
        fetchAirQuality(),
      ]);

      if (wData) renderForecast(wData);
      else if (weatherSummary) weatherSummary.textContent = "Không lấy được thời tiết.";

      if (aData) renderAirQuality(aData);
      else if (aqiNote) aqiNote.textContent = "Không lấy được AQI.";

      startClockLoop();
    } catch (err) {
      console.error(err);
      if (weatherSummary) weatherSummary.textContent = "❌ Không lấy được dữ liệu (net).";
      if (aqiNote) aqiNote.textContent = "❌ AQI lỗi (net).";
    }
  }

  async function fetchWeatherForCity(cityName) {
    const name = String(cityName || "").trim();
    if (!name) return;

    try {
      const place = await geocode(name);
      if (!place) {
        if (weatherSummary) weatherSummary.textContent = "❌ Không tìm thấy thành phố.";
        toast?.("Không tìm thấy thành phố 😅");
        return;
      }

      applyCity({
        cityLabel: `${place.name}, ${place.country}`,
        timezone: place.timezone,
        latitude: place.latitude,
        longitude: place.longitude,
      });

      upsertRecent({
        name: place.name,
        country: place.country,
        timezone: place.timezone,
        latitude: place.latitude,
        longitude: place.longitude,
      });

      await fetchAll();
    } catch (err) {
      console.error(err);
      if (weatherSummary) weatherSummary.textContent = "❌ Lỗi lấy vị trí/thời tiết.";
    }
  }

  function init() {
    renderRecent();
    setEmptyState();

    cityForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const city = cityInput?.value?.trim() || "";
      fetchWeatherForCity(city);
    });
  }

  return { init, fetchWeatherForCity };
})();
