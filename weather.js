// weather.js
// Dùng Open-Meteo (free, không cần API key)

window.TwanWeather = (function () {
  let currentCity = null;
  let currentTimezone = null;

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

  async function fetchWeatherForCity(cityName) {
    if (!cityName) return;

    try {
      // geocoding
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        cityName
      )}&count=1&language=vi&format=json`;

      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();
      if (!geoData || !geoData.results || !geoData.results.length) {
        weatherSummary.textContent = "Không tìm thấy thành phố.";
        return;
      }

      const place = geoData.results[0];
      const { latitude, longitude, timezone, name, country } = place;
      currentCity = `${name}, ${country}`;
      currentTimezone = timezone;

      timeCityLabel.textContent = currentCity;

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=sunrise,sunset,uv_index_max&timezone=${encodeURIComponent(
        timezone
      )}`;

      const wRes = await fetch(weatherUrl);
      const wData = await wRes.json();

      const curr = wData.current;
      const daily = wData.daily;

      const temp = curr?.temperature_2m;
      const hum = curr?.relative_humidity_2m;
      const wind = curr?.wind_speed_10m;

      const sunrise = daily?.sunrise?.[0];
      const sunset = daily?.sunset?.[0];
      const uvMax = daily?.uv_index_max?.[0];

      weatherTemp.textContent =
        typeof temp === "number" ? `${temp.toFixed(1)}°C` : "—";
      weatherHumidity.textContent =
        typeof hum === "number" ? `${hum}%` : "—";
      weatherWind.textContent =
        typeof wind === "number" ? `${wind.toFixed(1)} km/h` : "—";
      weatherUv.textContent =
        typeof uvMax === "number" ? uvMax.toFixed(1) : "—";

      if (sunrise) sunriseEl.textContent = sunrise.split("T")[1] || sunrise;
      if (sunset) sunsetEl.textContent = sunset.split("T")[1] || sunset;

      weatherSummary.textContent = `Thời tiết hiện tại tại ${currentCity}.`;
    } catch (err) {
      console.error(err);
      weatherSummary.textContent = "Không lấy được dữ liệu thời tiết.";
    }
  }

  function startClockLoop() {
    function tick() {
      if (!currentTimezone) {
        // nếu chưa chọn city, hiển thị giờ local
        const now = new Date();
        timeCityLabel.textContent = "Giờ máy (local)";
        timeCurrent.textContent = now.toLocaleTimeString("vi-VN");
        timeDate.textContent = now.toLocaleDateString("vi-VN", {
          weekday: "long",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      } else {
        const now = new Date();
        const options = {
          timeZone: currentTimezone,
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        };
        const dateOptions = {
          timeZone: currentTimezone,
          weekday: "long",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        };
        timeCurrent.textContent = now.toLocaleTimeString("vi-VN", options);
        timeDate.textContent = now.toLocaleDateString("vi-VN", dateOptions);
      }
      requestAnimationFrame(() => {
        setTimeout(tick, 1000);
      });
    }
    tick();
  }

  function init() {
    cityForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      const city = cityInput.value.trim();
      fetchWeatherForCity(city);
    });

    startClockLoop();
  }

  return { init, fetchWeatherForCity };
})();