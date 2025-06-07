// 🟨 API 키 입력
const OPENCAGE_API_KEY = '2bd1923c563e46e8a2ed899b7fd3f128';       // ← OpenCage API 키
const OPENWEATHER_API_KEY = '5f368635c5c63428bd32ef71baf00025'; // ← OpenWeather API 키

// 지도 초기화
const map = L.map('map').setView([37.5665, 126.9780], 7); // 서울 중심

// 타일 레이어
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 현재 표시 중인 도 경계 레이어를 기억
let currentBoundaryLayer = null;

// 도별 중심 좌표
const regionCenters = {
  '경기도': [36.4138, 127.5183],
  '강원도': [35.8228, 128.1555],
  '경상북도': [35.5759, 128.5056],
  '경상남도': [34.4606, 128.2132],
  '전라북도': [35.7167, 127.1442],
  '전라남도': [33.8161, 126.4630],
  '충청북도': [36.6358, 127.4912],
  '충청남도': [35.5184, 126.8000],
  '제주도': [32.4890, 126.4983],
};

// 버튼 클릭 시 지도 이동 + 경계선 로드
function goToRegion(regionName) {
  const coords = regionCenters[regionName];
  if (!coords) {
    alert("해당 지역 정보를 찾을 수 없습니다.");
    return;
  }

  // 지도 이동
  map.setView(coords, 9);


  // GeoJSON 경계선 로드
  const geoJsonUrl = `data/${regionName}.geojson`;

  // 이전 경계 제거
  if (currentBoundaryLayer) {
    map.removeLayer(currentBoundaryLayer);
  }

  fetch(geoJsonUrl)
    .then(res => res.json())
    .then(geojson => {
      currentBoundaryLayer = L.geoJSON(geojson, {
        style: {
          color: "red",
          weight : .4,
          fill: true, // 내부 채우기 활성화
          fillColor: "red",      // 채우는 색
          fillOpacity: 0.5 
        }
      }).addTo(map);

      map.fitBounds(currentBoundaryLayer.getBounds());
    })
    .catch(err => {
      alert("경계 데이터를 불러올 수 없습니다.");
      console.error(err);
    });
}

// 클릭 이벤트: 줌 레벨에 따라 행동 분기
map.on('click', async function (e) {
  const lat = e.latlng.lat;
  const lon = e.latlng.lng;
  const currentZoom = map.getZoom();

  if (currentZoom < 13) {
    map.setView([lat, lon], currentZoom + 1); // 한 단계씩 확대
    return;
  }

  else if (currentZoom >= 13){
    map.setView([lat, lon], currentZoom); // 어느정도 확대되면 이동만
  }

  // 날씨 정보 가져오기
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=kr`;
  const addressUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;

  try {
    const [weatherRes, addressRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(addressUrl)
    ]);

    const weatherData = await weatherRes.json();
    const addressData = await addressRes.json();

    const description = weatherData.weather[0].description;
    const temp = weatherData.main.temp;
    const hum = weatherData.main.humidity;
    const icon = weatherData.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;

    const addr = addressData.address || {};
    const state = addr.state || '';
    const city = addr.city || addr.county || addr.town || '';
    const locationName = `${state} ${city}`.trim();

    const fullAddress = addressData.display_name || '';
    const trimmedAddress = fullAddress
      .split(', ')
      .filter(part => part !== '대한민국')
      .join(', ');

    const popupContent = `
      <div style="text-align:center;">
        <strong>${locationName || '알 수 없는 지역'}</strong><br>
        <small style="color:gray;">${trimmedAddress}</small><br>
        <img src="${iconUrl}" alt="${description}" /><br>
        ${description}<br>
        <b>${Math.floor(temp)}°C</b><br>
        <b>${hum}%</b>
      </div>
    `;

    L.popup()
      .setLatLng([lat, lon])
      .setContent(popupContent)
      .openOn(map);

  } catch (error) {
    console.error('에러 발생:', error);
    alert('날씨나 주소 정보를 가져올 수 없습니다.');
  }
});
