// 🟨 API 키 입력
const OPENCAGE_API_KEY = '2bd1923c563e46e8a2ed899b7fd3f128';       // ← OpenCage API 키
const OPENWEATHER_API_KEY = '5f368635c5c63428bd32ef71baf00025'; // ← OpenWeather API 키

// 지도 초기화
const map = L.map('map').setView([37.5665, 126.9780], 8); // 서울 중심

// 타일 레이어
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 클릭 이벤트
map.on('click', async function (e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;
  const infoDiv = document.getElementById('info');

  infoDiv.innerHTML = `<p>위도: ${lat.toFixed(5)}, 경도: ${lng.toFixed(5)}</p><p>주소 조회 중...</p>`;

  try {
    // 주소 얻기 (Reverse Geocoding)
    const geoRes = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPENCAGE_API_KEY}&language=ko`);
    const geoData = await geoRes.json();
    const components = geoData.results[0].components;
    const address = geoData.results[0].formatted;

    // 날씨 정보
    const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=kr`);
    const weatherData = await weatherRes.json();

    const weatherDescription = weatherData.weather[0].description;
    const temp = weatherData.main.temp;
    const city = weatherData.name;

    infoDiv.innerHTML = `
      <h3>📍 위치 정보</h3>
      <p><strong>주소:</strong> ${address}</p>
      <p><strong>행정구역:</strong> ${components.state_district || components.city || components.town || '정보 없음'}</p>
      <h3>🌦️ 날씨 정보</h3>
      <p><strong>지역:</strong> ${city}</p>
      <p><strong>날씨:</strong> ${weatherDescription}</p>
      <p><strong>기온:</strong> ${temp}℃</p>
    `;
  } catch (err) {
    console.error(err);
    infoDiv.innerHTML = "<p>오류가 발생했습니다. 콘솔을 확인해 주세요.</p>";
  }
});

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
          weight: 2,
          fill: false // 내부 색 없음
        }
      }).addTo(map);

      map.fitBounds(currentBoundaryLayer.getBounds());
    })
    .catch(err => {
      alert("경계 데이터를 불러올 수 없습니다.");
      console.error(err);
    });
}

// 클릭 시 날씨 정보 가져오기 + 팝업 띄우기
map.on('click', async function (e) {
  const lat = e.latlng.lat;
  const lon = e.latlng.lng;

  const weatherApiKey = '5f368635c5c63428bd32ef71baf00025';
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric&lang=kr`;
  const addressUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;

  try {
    // 두 API 동시 호출
    const [weatherRes, addressRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(addressUrl)
    ]);

    const weatherData = await weatherRes.json();
    const addressData = await addressRes.json();

    const description = weatherData.weather[0].description;
    const temp = weatherData.main.temp;
    const icon = weatherData.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;

    // 주소 정보 처리
  const addr = addressData.address || {};
  const state = addr.state || '';
  const city = addr.city || addr.county || addr.town || '';
  const locationName = `${state} ${city}`.trim();

  const fullAddress = addressData.display_name || '';
  const trimmedAddress = fullAddress
   .split(', ')
   .filter(part => part !== '대한민국')  // ← 여기!
   .join(', ');

  const popupContent = `
   <div style="text-align:center;">
     <strong>${locationName || '알 수 없는 지역'}</strong><br>
     <small style="color:gray;">${trimmedAddress}</small><br>
      <img src="${iconUrl}" alt="${description}" /><br>
      ${description}<br>
      <b>${temp}°C</b>
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