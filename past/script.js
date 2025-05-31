async function fetchPastWeather() {
  const location = document.getElementById("locationInput").value;
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;

  // 날짜 유효성 검사
  const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
  if (diff < 2 || diff > 9) {
    alert("기간은 최소 3일, 최대 10일까지 선택 가능합니다.");
    return;
  }

  // 1. 위치 → 좌표 변환 (Nominatim API)
  const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;
  const geoRes = await fetch(geoUrl);
  const geoData = await geoRes.json();

  if (!geoData[0]) {
    alert("위치를 찾을 수 없습니다.");
    return;
  }

  const lat = geoData[0].lat;
  const lon = geoData[0].lon;

  // 2. 과거 날씨 데이터 가져오기 (Open-Meteo)
  const weatherUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${end}&daily=temperature_2m_max,precipitation_sum,relative_humidity_2m_mean&timezone=Asia%2FSeoul`;
  const weatherRes = await fetch(weatherUrl);
  const weatherData = await weatherRes.json();

  const dates = weatherData.daily.time;
  const temps = weatherData.daily.temperature_2m_max;
  const rains = weatherData.daily.precipitation_sum;
  const humids = weatherData.daily.relative_humidity_2m_mean;

  drawChart(dates, temps, rains, humids);
}

let chart;

function drawChart(labels, temps, rains, humids) {
  const ctx = document.getElementById("weatherChart").getContext("2d");

  if (chart) {
    chart.destroy();
  }

  const datasets = [];

  if (document.getElementById("showTemp").checked) {
    datasets.push({
      label: "기온 (°C)",
      data: temps,
      borderColor: "red",
      backgroundColor: "rgba(255,0,0,0.1)",
      yAxisID: "y1"
    });
  }

  if (document.getElementById("showRain").checked) {
    datasets.push({
      label: "강수량 (mm)",
      data: rains,
      borderColor: "blue",
      backgroundColor: "rgba(0,0,255,0.1)",
      yAxisID: "y2"
    });
  }

  if (document.getElementById("showHumidity").checked) {
    datasets.push({
      label: "습도 (%)",
      data: humids,
      borderColor: "green",
      backgroundColor: "rgba(0,255,0,0.1)",
      yAxisID: "y3"
    });
  }

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      plugins: {
        datalabels: {
          anchor: 'end',
          align: 'top',
          color: 'black',
          font: {
            weight: 'bold'
          },
          formatter: value => `${value}`
        }
      },
      scales: {
        y1: {
          type: "linear",
          position: "left",
          title: { display: true, text: "기온 (°C)" }
        },
        y2: {
          type: "linear",
          position: "right",
          title: { display: true, text: "강수량 (mm)" },
          grid: { drawOnChartArea: false }
        },
        y3: {
          display: false
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}