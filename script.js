// ── Flip Clock ─────────────────────────────────────────

const KOREAN_DAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const KOREAN_SHORT_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

let prevDigits = { ht: '', ho: '', mt: '', mo: '' };

function updateFlipUnit(id, newVal) {
  const key = { 'hour-tens': 'ht', 'hour-ones': 'ho', 'min-tens': 'mt', 'min-ones': 'mo' }[id];
  if (prevDigits[key] === newVal) return;
  prevDigits[key] = newVal;

  const inner = document.getElementById(id + '-inner');
  const front = inner.querySelector('.flip-card-front span');
  const back = inner.querySelector('.flip-card-back span');

  back.textContent = newVal;
  inner.classList.remove('flipping');
  // Force reflow
  void inner.offsetWidth;
  inner.classList.add('flipping');

  setTimeout(() => {
    front.textContent = newVal;
    inner.classList.remove('flipping');
  }, 600);
}

function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');

  updateFlipUnit('hour-tens', h[0]);
  updateFlipUnit('hour-ones', h[1]);
  updateFlipUnit('min-tens', m[0]);
  updateFlipUnit('min-ones', m[1]);

  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const dayName = KOREAN_DAYS[now.getDay()];
  document.getElementById('date-display').textContent =
    `${year}년 ${month}월 ${day}일 ${dayName}`;
}

// Initialize clock immediately, then tick every second
updateClock();
setInterval(updateClock, 1000);

// ── Weather ────────────────────────────────────────────

const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=36.7377&longitude=127.0474&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia/Seoul&forecast_days=3';

const WMO_ICONS = {
  0: '☀', 1: '🌤', 2: '⛅', 3: '☁',
  45: '🌫', 48: '🌫',
  51: '🌦', 53: '🌦', 55: '🌧',
  61: '🌧', 63: '🌧', 65: '🌧',
  71: '🌨', 73: '🌨', 75: '❄',
  77: '❄', 80: '🌧', 81: '🌧', 82: '🌧',
  85: '🌨', 86: '🌨',
  95: '⛈', 96: '⛈', 99: '⛈',
};

const WMO_DESC = {
  0: '맑음', 1: '대체로 맑음', 2: '구름 조금', 3: '흐림',
  45: '안개', 48: '안개',
  51: '가벼운 이슬비', 53: '이슬비', 55: '이슬비',
  61: '가벼운 비', 63: '비', 65: '강한 비',
  71: '가벼운 눈', 73: '눈', 75: '강한 눈',
  77: '진눈깨비', 80: '소나기', 81: '소나기', 82: '강한 소나기',
  85: '눈보라', 86: '강한 눈보라',
  95: '뇌우', 96: '뇌우(우박)', 99: '뇌우(강한 우박)',
};

function getWeatherIcon(code) { return WMO_ICONS[code] || '☁'; }
function getWeatherDesc(code) { return WMO_DESC[code] || '알 수 없음'; }

async function fetchWeather() {
  try {
    const res = await fetch(WEATHER_URL);
    const data = await res.json();

    const current = data.current;
    document.getElementById('current-icon').textContent = getWeatherIcon(current.weather_code);
    document.getElementById('current-temp').textContent = `${Math.round(current.temperature_2m)}°`;
    document.getElementById('current-condition').textContent = getWeatherDesc(current.weather_code);
    document.getElementById('current-humidity').textContent = `습도 ${current.relative_humidity_2m}%`;
    document.getElementById('current-wind').textContent = `바람 ${current.wind_speed_10m} km/h`;

    const forecastEl = document.getElementById('weather-forecast');
    forecastEl.innerHTML = '';

    const daily = data.daily;
    for (let i = 0; i < 3; i++) {
      const date = new Date(daily.time[i] + 'T00:00:00');
      const dayName = i === 0 ? '오늘' : KOREAN_SHORT_DAYS[date.getDay()];
      const icon = getWeatherIcon(daily.weather_code[i]);
      const high = Math.round(daily.temperature_2m_max[i]);
      const low = Math.round(daily.temperature_2m_min[i]);

      forecastEl.innerHTML += `
        <div class="forecast-day">
          <span class="forecast-day-name">${dayName}</span>
          <span class="forecast-icon">${icon}</span>
          <span class="forecast-temps">
            <span class="forecast-high">${high}°</span>
            <span class="forecast-low">${low}°</span>
          </span>
        </div>`;
    }
  } catch (e) {
    document.getElementById('current-condition').textContent = '날씨를 불러올 수 없습니다';
  }
}

fetchWeather();
setInterval(fetchWeather, 30 * 60 * 1000);

// ── Calendar ───────────────────────────────────────────

function renderCalendar() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Demo events - replace with real calendar data later
  const todayEvents = [
    { time: '09:00', title: '팀 스탠드업 미팅' },
    { time: '11:00', title: '프로젝트 리뷰' },
    { time: '14:00', title: '점심 약속' },
    { time: '16:30', title: '코드 리뷰' },
  ];

  const tomorrowEvents = [
    { time: '10:00', title: '주간 회의' },
    { time: '13:00', title: '디자인 검토' },
  ];

  function renderEvents(containerId, events) {
    const el = document.getElementById(containerId);
    if (events.length === 0) {
      el.innerHTML = '<li class="calendar-empty">일정이 없습니다</li>';
      return;
    }
    el.innerHTML = events.map(e => `
      <li class="calendar-event">
        <span class="event-time">${e.time}</span>
        <span class="event-title">${e.title}</span>
      </li>`).join('');
  }

  renderEvents('today-events', todayEvents);
  renderEvents('tomorrow-events', tomorrowEvents);
}

renderCalendar();

// ── Chat ───────────────────────────────────────────────

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');

const SUNNY_RESPONSES = [
  '좋은 하루 보내세요! ☀️',
  '오늘도 화이팅이에요!',
  '무엇이든 도와드릴게요.',
  '잠시 후 다시 확인해 볼게요!',
  '알겠습니다! 메모해 둘게요.',
  '오늘 날씨가 참 좋네요.',
];

function addMessage(text, isUser) {
  const div = document.createElement('div');
  div.className = `chat-message ${isUser ? 'user-message' : 'bot-message'}`;
  div.innerHTML = `<span class="message-text">${escapeHtml(text)}</span>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  addMessage(text, true);
  chatInput.value = '';

  // Placeholder bot response
  setTimeout(() => {
    const response = SUNNY_RESPONSES[Math.floor(Math.random() * SUNNY_RESPONSES.length)];
    addMessage(response, false);
  }, 600);
}

chatSend.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});
