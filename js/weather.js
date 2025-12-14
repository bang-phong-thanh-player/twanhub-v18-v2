// weather.js
// Open-Meteo (free, no key) + Geocoding Open-Meteo
// Goal: chỉ hiển thị khi user nhập thành phố (bỏ giờ local)

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
  }

  function safeNum(n) {
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  }

  function toTimeOnly(isoStr) {
    if (!isoStr) return "—";
    // open-meteo returns "YYYY-MM-DDTHH:MM"
    const parts = String(isoStr).split("T");
    return parts[1] || isoStr;
  }

  function viWeatherText(code) {
    // Open-Meteo weathercode mapping
    // https://open-meteo.com/en/docs
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

  function saveRecentCity(query, placeLabel) {
    const item = { q: query, label: placeLabel, at: Date.now() };
    let arr = [];
    try {
      arr = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
      if (!Array.isArray(arr)) arr = [];
    } catch (_) {
      arr = [];
    }
    // remove duplicates by q (case-insensitive)
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

    // create a chips row under the form (only once)
    let chips = document.getElementById("recent-cities-chips");
    if (!chips) {
      chips = document.createElement("div");
      chips.id = "recent-cities-chips";
      chips.style.display = "flex";
      chips.style.flexWrap = "wrap";
      chips.style.gap = "6px";
      chips.style.marginTop = "8px";
      chips.style.alignItems = "center";
      cityForm.insertAdjacentElement("afterend", chips);
    }

    const recents = getRecentCities();
    if (!recents.length) {
      chips.innerHTML = "";
      return;
    }

    chips.innerHTML = "";
    recents.forEach((r) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn-ghost";
      b.style.padding = "6px 10px";
      b.style.fontSize = "12px";
      b.style.borderRadius = "999px";
      b.textContent = r.label || r.q || "Recent";
      b.addEventListener("click", () => {
        if (cityInput) cityInput.value = r.q || "";
        if (r.q) fetchWeatherForCity(r.q);
      });
      chips.appendChild(b);
    });

    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "btn-ghost";
    clearBtn.style.padding = "6px 10px";
    clearBtn.style.fontSize = "12px";
    clearBtn.style.borderRadius = "999px";
    clearBtn.textContent = "✕ Xóa recent";
    clearBtn.addEventListener("click", () => {
      try { localStorage.removeItem(RECENT_KEY); } catch (_) {}
      renderRecentChips();
    });
    chips.appendChild(clearBtn);
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
    // add more current vars for a more "pro" panel
    const weatherUrl =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature,pressure_msl` +
      `&daily=sunrise,sunset,uv_index_max` +
      `&timezone=${encodeURIComponent(timezone)}`;

    const wRes = await fetch(weatherUrl, { cache: "no-store" });
    return wRes.json();
  }

  // ====== MAIN FLOW ======
  async function fetchWeatherForCity(cityName) {
    const q = String(cityName || "").trim();
    if (!q) return;

    setLoading(true);

    try {
      const place = await geocodeCity(q);
      if (!place) {
        setLoading(false);
        if (weatherSummary) weatherSummary.textContent = "❌ Không tìm thấy thành phố. Thử gõ tiếng Anh (vd: Busan, Seoul).";
        return;
      }

      currentPlace = place;

      // set city label
      if (timeCityLabel) timeCityLabel.textContent = place.cityLabel;

      // start clock (only after choosing city)
      startClock(place.timezone);

      // fetch weather
      const wData = await fetchForecast(place.lat, place.lon, place.timezone);

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

      // richer summary text
      const parts = [];
      parts.push(`📍 ${place.cityLabel}`);
      parts.push(`• ${desc}`);
      if (temp != null) parts.push(`• ${temp.toFixed(1)}°C`);
      if (feels != null) parts.push(`• Cảm giác: ${feels.toFixed(1)}°C`);
      if (pressure != null) parts.push(`• Áp suất: ${Math.round(pressure)} hPa`);

      if (weatherSummary) weatherSummary.textContent = parts.join(" ");

      setLoading(false);

      // save recent city
      saveRecentCity(q, place.cityLabel);
    } catch (err) {
      console.error(err);
      setLoading(false);
      if (weatherSummary) weatherSummary.textContent = "❌ Không lấy được dữ liệu thời tiết (có thể do mạng/net).";
    }
  }

  function init() {
    // start with clean state (no local clock)
    clearOutputs();
    renderRecentChips();

    cityForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const city = cityInput?.value?.trim() || "";
      fetchWeatherForCity(city);
    });
  }

  return { init, fetchWeatherForCity };
})();
