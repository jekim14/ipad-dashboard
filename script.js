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

// ── Stocks / FX ───────────────────────────────────────

let prevRates = { usd: null, jpy: null };

async function fetchExchangeRates() {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await res.json();

    const krwPerUsd = data.rates.KRW;
    const jpyPerUsd = data.rates.JPY;
    const krwPerJpy = krwPerUsd / jpyPerUsd;

    // USD/KRW
    const usdEl = document.getElementById('usd-krw');
    const usdChangeEl = document.getElementById('usd-krw-change');
    usdEl.textContent = krwPerUsd.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
    if (prevRates.usd !== null) {
      const diff = krwPerUsd - prevRates.usd;
      if (diff > 0) {
        usdChangeEl.textContent = `▲ ${diff.toFixed(2)}`;
        usdChangeEl.className = 'stock-change stock-up';
      } else if (diff < 0) {
        usdChangeEl.textContent = `▼ ${Math.abs(diff).toFixed(2)}`;
        usdChangeEl.className = 'stock-change stock-down';
      } else {
        usdChangeEl.textContent = '─';
        usdChangeEl.className = 'stock-change';
      }
    }
    prevRates.usd = krwPerUsd;

    // JPY/KRW (100 JPY)
    const jpyEl = document.getElementById('jpy-krw');
    const jpyChangeEl = document.getElementById('jpy-krw-change');
    const jpy100 = krwPerJpy * 100;
    jpyEl.textContent = jpy100.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
    if (prevRates.jpy !== null) {
      const diff = jpy100 - prevRates.jpy;
      if (diff > 0) {
        jpyChangeEl.textContent = `▲ ${diff.toFixed(2)}`;
        jpyChangeEl.className = 'stock-change stock-up';
      } else if (diff < 0) {
        jpyChangeEl.textContent = `▼ ${Math.abs(diff).toFixed(2)}`;
        jpyChangeEl.className = 'stock-change stock-down';
      } else {
        jpyChangeEl.textContent = '─';
        jpyChangeEl.className = 'stock-change';
      }
    }
    prevRates.jpy = jpy100;

    // Update JPY label to show it's per 100 JPY
    document.querySelector('#jpy-krw').closest('.stock-row').querySelector('.stock-label').textContent = '100JPY/KRW';

    const now = new Date();
    document.getElementById('stocks-updated').textContent =
      `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} 업데이트`;
  } catch (e) {
    document.getElementById('stocks-updated').textContent = '환율 불러오기 실패';
  }
}

fetchExchangeRates();
setInterval(fetchExchangeRates, 30 * 60 * 1000);

// ── Calendar ───────────────────────────────────────────

function renderCalendar() {
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

// ── Next Class Countdown ──────────────────────────────

const CLASS_SCHEDULE = {
  1: [ // 월요일
    { start: '13:00', end: '14:30', name: '기능성식품학' },
    { start: '14:30', end: '16:00', name: '식품생명공학' },
    { start: '18:30', end: '20:00', name: '식품생명공학연구론' },
  ],
  2: [ // 화요일
    { start: '13:00', end: '14:30', name: '기능성식품학' },
    { start: '14:30', end: '16:00', name: '식품생명공학' },
    { start: '16:00', end: '17:30', name: '진로탐색세미나' },
    { start: '18:30', end: '20:00', name: '식품생명공학연구론' },
  ],
  3: [ // 수요일
    { start: '13:00', end: '14:30', name: '커피차그리고초콜릿' },
    { start: '14:30', end: '16:00', name: '술의과학문화그리고생활' },
  ],
  4: [ // 목요일
    { start: '13:00', end: '14:30', name: '커피차그리고초콜릿' },
    { start: '14:30', end: '16:00', name: '술의과학문화그리고생활' },
  ],
};

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatDuration(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  return `${m}분`;
}

function updateClassCountdown() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const nameEl = document.getElementById('class-name');
  const timeEl = document.getElementById('class-time-remaining');
  const infoEl = document.getElementById('class-schedule-info');
  const listEl = document.getElementById('class-today-list');

  const todayClasses = CLASS_SCHEDULE[dayOfWeek] || [];

  // Render today's class list
  if (todayClasses.length > 0) {
    listEl.innerHTML = todayClasses.map(c => {
      const startMin = timeToMinutes(c.start);
      const endMin = timeToMinutes(c.end);
      const isActive = nowMin >= startMin && nowMin < endMin;
      return `<div class="class-today-item${isActive ? ' active' : ''}">
        <span class="class-today-time">${c.start}–${c.end}</span>
        <span>${c.name}</span>
      </div>`;
    }).join('');
  } else {
    listEl.innerHTML = '';
  }

  // Find current or next class
  if (todayClasses.length > 0) {
    // Check if we're in a class
    for (const c of todayClasses) {
      const startMin = timeToMinutes(c.start);
      const endMin = timeToMinutes(c.end);
      if (nowMin >= startMin && nowMin < endMin) {
        const remaining = endMin - nowMin;
        nameEl.textContent = c.name;
        timeEl.textContent = `진행 중`;
        infoEl.textContent = `${formatDuration(remaining)} 남음`;
        return;
      }
    }

    // Check for next class today
    for (const c of todayClasses) {
      const startMin = timeToMinutes(c.start);
      if (nowMin < startMin) {
        const until = startMin - nowMin;
        nameEl.textContent = c.name;
        timeEl.textContent = formatDuration(until);
        infoEl.textContent = `${c.start} 시작`;
        return;
      }
    }
  }

  // No more classes today — find next day
  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = (dayOfWeek + offset) % 7;
    const nextClasses = CLASS_SCHEDULE[nextDay];
    if (nextClasses && nextClasses.length > 0) {
      const c = nextClasses[0];
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      if (todayClasses.length > 0) {
        nameEl.textContent = '오늘 수업 끝! 🎉';
        timeEl.textContent = '';
        infoEl.textContent = `다음: ${dayNames[nextDay]}요일 ${c.start} ${c.name}`;
      } else {
        nameEl.textContent = '오늘은 수업 없음';
        timeEl.textContent = '';
        infoEl.textContent = `다음: ${dayNames[nextDay]}요일 ${c.start} ${c.name}`;
      }
      return;
    }
  }

  nameEl.textContent = '수업 없음';
  timeEl.textContent = '';
  infoEl.textContent = '';
}

updateClassCountdown();
setInterval(updateClassCountdown, 30 * 1000);

// ── Air Quality (placeholder data) ────────────────────

function updateAirQuality() {
  // Simulate slight variations in demo data
  const temp = (23 + Math.random() * 1.5).toFixed(1);
  const humidity = Math.floor(43 + Math.random() * 5);
  const pm25 = Math.floor(8 + Math.random() * 10);
  const pm10 = Math.floor(18 + Math.random() * 15);

  document.getElementById('air-temp').textContent = `${temp}°C`;
  document.getElementById('air-humidity').textContent = `${humidity}%`;

  const pm25El = document.getElementById('air-pm25');
  pm25El.innerHTML = `${pm25} <small>μg/m³</small>`;

  const pm10El = document.getElementById('air-pm10');
  pm10El.innerHTML = `${pm10} <small>μg/m³</small>`;

  // Update badges
  const pm25Badge = pm25El.closest('.air-item').querySelector('.air-badge');
  const pm10Badge = pm10El.closest('.air-item').querySelector('.air-badge');

  function getAirStatus(val, thresholds) {
    if (val <= thresholds[0]) return { text: '좋음', cls: 'air-good' };
    if (val <= thresholds[1]) return { text: '보통', cls: 'air-normal' };
    if (val <= thresholds[2]) return { text: '나쁨', cls: 'air-bad' };
    return { text: '매우나쁨', cls: 'air-bad' };
  }

  const pm25Status = getAirStatus(pm25, [15, 35, 75]);
  const pm10Status = getAirStatus(pm10, [30, 80, 150]);

  pm25Badge.textContent = pm25Status.text;
  pm25Badge.className = `air-badge ${pm25Status.cls}`;
  pm10Badge.textContent = pm10Status.text;
  pm10Badge.className = `air-badge ${pm10Status.cls}`;
}

updateAirQuality();
setInterval(updateAirQuality, 5 * 60 * 1000);

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

  setTimeout(() => {
    const response = SUNNY_RESPONSES[Math.floor(Math.random() * SUNNY_RESPONSES.length)];
    addMessage(response, false);
  }, 600);
}

chatSend.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// ── YouTube Control ───────────────────────────────────

const ytIframe = document.getElementById('yt-iframe');
const ytEmpty = document.getElementById('yt-empty');
const ytUrlInput = document.getElementById('yt-url-input');
const ytLoadBtn = document.getElementById('yt-load');
const ytRecentList = document.getElementById('yt-recent');

let ytRecent = JSON.parse(localStorage.getItem('yt-recent') || '[]');

function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function loadYouTubeVideo(url) {
  const id = extractYouTubeId(url);
  if (!id) return;

  ytIframe.src = `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
  ytIframe.classList.add('visible');
  ytEmpty.classList.add('hidden');

  // Add to recent
  const entry = { url, id, title: url };
  ytRecent = [entry, ...ytRecent.filter(r => r.id !== id)].slice(0, 3);
  localStorage.setItem('yt-recent', JSON.stringify(ytRecent));
  renderYtRecent();
}

function renderYtRecent() {
  ytRecentList.innerHTML = ytRecent.map(r =>
    `<li class="yt-recent-item" data-url="${escapeHtml(r.url)}">▶ ${escapeHtml(r.url)}</li>`
  ).join('');

  ytRecentList.querySelectorAll('.yt-recent-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.getAttribute('data-url');
      ytUrlInput.value = url;
      loadYouTubeVideo(url);
    });
  });
}

ytLoadBtn.addEventListener('click', () => {
  const url = ytUrlInput.value.trim();
  if (url) loadYouTubeVideo(url);
});

ytUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const url = ytUrlInput.value.trim();
    if (url) loadYouTubeVideo(url);
  }
});

renderYtRecent();
