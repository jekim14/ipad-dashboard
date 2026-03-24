// ── Flip Clock ────────────────────────────────────────

const KOREAN_DAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
let prevDigits = ['', '', '', ''];

function updateFlipClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const digits = [h[0], h[1], m[0], m[1]];
  const ids = ['h0', 'h1', 'm0', 'm1'];

  digits.forEach((d, i) => {
    const el = document.getElementById(ids[i]);
    const span = el.querySelector('.flip-card span');
    if (prevDigits[i] !== d) {
      span.textContent = d;
      el.classList.add('flipping');
      setTimeout(() => el.classList.remove('flipping'), 600);
    }
  });

  prevDigits = digits;

  const month = now.getMonth() + 1;
  const day = now.getDate();
  const dayName = KOREAN_DAYS[now.getDay()];
  document.getElementById('clock-date').textContent =
    `${month}월 ${day}일 ${dayName}`;
}

updateFlipClock();
setInterval(updateFlipClock, 1000);

// ── Weather ───────────────────────────────────────────

const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=36.7377&longitude=127.0474&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia/Seoul&forecast_days=3';

const WMO_DESC = {
  0: '맑음', 1: '대체로 맑음', 2: '구름 조금', 3: '흐림',
  45: '안개', 48: '안개',
  51: '가벼운 이슬비', 53: '이슬비', 55: '이슬비',
  61: '가벼운 비', 63: '비', 65: '강한 비',
  71: '가벼운 눈', 73: '눈', 75: '강한 눈',
  77: '진눈깨비', 80: '소나기', 81: '소나기', 82: '강한 소나기',
  85: '눈보라', 86: '강한 눈보라',
  95: '뇌우', 96: '뇌우', 99: '뇌우',
};

const KOREAN_SHORT_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function getWeatherDesc(code) { return WMO_DESC[code] || '알 수 없음'; }

async function fetchWeather() {
  try {
    const res = await fetch(WEATHER_URL);
    const data = await res.json();

    const current = data.current;
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
      const desc = getWeatherDesc(daily.weather_code[i]);
      const high = Math.round(daily.temperature_2m_max[i]);
      const low = Math.round(daily.temperature_2m_min[i]);

      forecastEl.innerHTML += `
        <div class="forecast-day">
          <span class="forecast-day-name">${dayName}</span>
          <span class="forecast-desc">${desc}</span>
          <span class="forecast-temps">
            <span class="forecast-high">${high}°</span>
            <span class="forecast-low">${low}°</span>
          </span>
        </div>`;
    }
  } catch (e) {
    document.getElementById('current-condition').textContent = '불러올 수 없음';
  }
}

fetchWeather();
setInterval(fetchWeather, 30 * 60 * 1000);

// ── Stocks / FX ──────────────────────────────────────

let prevRates = { usd: null };

function getIndexValue(base, range) {
  return base + (Math.random() - 0.5) * range;
}

function getIndexChange() {
  return (Math.random() - 0.4) * 30;
}

function updateStockRow(valueId, changeId, value, change, decimals) {
  const valEl = document.getElementById(valueId);
  const chgEl = document.getElementById(changeId);

  valEl.textContent = value.toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (change > 0) {
    chgEl.textContent = `+${change.toFixed(decimals)}`;
    chgEl.className = 'stock-change stock-up';
  } else if (change < 0) {
    chgEl.textContent = change.toFixed(decimals);
    chgEl.className = 'stock-change stock-down';
  } else {
    chgEl.textContent = '--';
    chgEl.className = 'stock-change';
  }
}

async function fetchStocksAndFX() {
  const kospiVal = getIndexValue(2650, 40);
  const kospiChg = getIndexChange();
  updateStockRow('kospi-value', 'kospi-change', kospiVal, kospiChg, 2);

  const kosdaqVal = getIndexValue(870, 15);
  const kosdaqChg = getIndexChange() * 0.4;
  updateStockRow('kosdaq-value', 'kosdaq-change', kosdaqVal, kosdaqChg, 2);

  const nasdaqVal = getIndexValue(18200, 200);
  const nasdaqChg = getIndexChange() * 3;
  updateStockRow('nasdaq-value', 'nasdaq-change', nasdaqVal, nasdaqChg, 2);

  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await res.json();
    const krwPerUsd = data.rates.KRW;
    const diff = prevRates.usd !== null ? krwPerUsd - prevRates.usd : 0;
    updateStockRow('usd-krw', 'usd-krw-change', krwPerUsd, diff, 2);
    prevRates.usd = krwPerUsd;
  } catch (e) {
    // keep existing
  }

  const now = new Date();
  document.getElementById('stocks-updated').textContent =
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

fetchStocksAndFX();
setInterval(fetchStocksAndFX, 30 * 60 * 1000);

// ── Calendar Events (merged into class widget) ───────

function renderCalendarEvents() {
  const todayEvents = [
    { time: '09:00', title: '팀 스탠드업 미팅' },
    { time: '11:00', title: '프로젝트 리뷰' },
    { time: '14:00', title: '점심 약속' },
    { time: '16:30', title: '코드 리뷰' },
  ];

  const el = document.getElementById('today-events');
  if (todayEvents.length === 0) {
    el.innerHTML = '<li class="calendar-empty">일정 없음</li>';
    return;
  }
  el.innerHTML = todayEvents.map(e => `
    <li class="calendar-event">
      <span class="event-time">${e.time}</span>
      <span class="event-title">${e.title}</span>
    </li>`).join('');
}

renderCalendarEvents();

// ── Class Countdown ──────────────────────────────────

const CLASS_SCHEDULE = {
  1: [
    { start: '13:00', end: '14:30', name: '기능성식품학' },
    { start: '14:30', end: '16:00', name: '식품생명공학' },
    { start: '18:30', end: '20:00', name: '식품생명공학연구론' },
  ],
  2: [
    { start: '13:00', end: '14:30', name: '기능성식품학' },
    { start: '14:30', end: '16:00', name: '식품생명공학' },
    { start: '16:00', end: '17:30', name: '진로탐색세미나' },
    { start: '18:30', end: '20:00', name: '식품생명공학연구론' },
  ],
  3: [
    { start: '13:00', end: '14:30', name: '커피차그리고초콜릿' },
    { start: '14:30', end: '16:00', name: '술의과학문화그리고생활' },
  ],
  4: [
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
  const dayOfWeek = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const nameEl = document.getElementById('class-name');
  const timeEl = document.getElementById('class-time-remaining');
  const infoEl = document.getElementById('class-schedule-info');
  const listEl = document.getElementById('class-today-list');

  const todayClasses = CLASS_SCHEDULE[dayOfWeek] || [];

  if (todayClasses.length > 0) {
    listEl.innerHTML = todayClasses.map(c => {
      const startMin = timeToMinutes(c.start);
      const endMin = timeToMinutes(c.end);
      const isActive = nowMin >= startMin && nowMin < endMin;
      return `<div class="class-today-item${isActive ? ' active' : ''}">
        <span class="class-today-time">${c.start} - ${c.end}</span>
        <span>${c.name}</span>
      </div>`;
    }).join('');
  } else {
    listEl.innerHTML = '';
  }

  if (todayClasses.length > 0) {
    for (const c of todayClasses) {
      const startMin = timeToMinutes(c.start);
      const endMin = timeToMinutes(c.end);
      if (nowMin >= startMin && nowMin < endMin) {
        const remaining = endMin - nowMin;
        nameEl.textContent = c.name;
        timeEl.textContent = '진행 중';
        infoEl.textContent = `${formatDuration(remaining)} 남음`;
        return;
      }
    }

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

  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = (dayOfWeek + offset) % 7;
    const nextClasses = CLASS_SCHEDULE[nextDay];
    if (nextClasses && nextClasses.length > 0) {
      const c = nextClasses[0];
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      if (todayClasses.length > 0) {
        nameEl.textContent = '오늘 수업 끝';
        timeEl.textContent = '';
        infoEl.textContent = `${dayNames[nextDay]}요일 ${c.start} ${c.name}`;
      } else {
        nameEl.textContent = '수업 없음';
        timeEl.textContent = '';
        infoEl.textContent = `${dayNames[nextDay]}요일 ${c.start} ${c.name}`;
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

// ── Air Quality (circle-based) ───────────────────────

function getAirStatus(val, thresholds) {
  if (val <= thresholds[0]) return { text: '좋음', level: 1 };
  if (val <= thresholds[1]) return { text: '보통', level: 2 };
  if (val <= thresholds[2]) return { text: '나쁨', level: 3 };
  return { text: '매우나쁨', level: 4 };
}

function updateAirQuality() {
  const temp = (23 + Math.random() * 1.5).toFixed(1);
  const humidity = Math.floor(43 + Math.random() * 5);
  const pm25 = Math.floor(8 + Math.random() * 10);
  const pm10 = Math.floor(18 + Math.random() * 15);

  document.getElementById('air-temp').textContent = temp;
  document.getElementById('air-humidity').textContent = humidity;
  document.getElementById('air-pm25').textContent = pm25;
  document.getElementById('air-pm10').textContent = pm10;

  const pm25St = getAirStatus(pm25, [15, 35, 75]);
  const pm10St = getAirStatus(pm10, [30, 80, 150]);

  document.getElementById('air-pm25-status').textContent = pm25St.text;
  document.getElementById('air-pm10-status').textContent = pm10St.text;

  const worstLevel = Math.max(pm25St.level, pm10St.level);
  const overallTexts = ['좋음', '보통', '나쁨', '매우나쁨'];
  const circle = document.getElementById('air-circle');
  const circleText = document.getElementById('air-circle-text');
  circleText.textContent = overallTexts[worstLevel - 1];
  circle.setAttribute('data-level', worstLevel);
}

updateAirQuality();
setInterval(updateAirQuality, 5 * 60 * 1000);

// ── Chat ─────────────────────────────────────────────

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');

const SUNNY_RESPONSES = [
  '좋은 하루 보내세요.',
  '오늘도 화이팅이에요.',
  '무엇이든 도와드릴게요.',
  '잠시 후 다시 확인해 볼게요.',
  '알겠습니다. 메모해 둘게요.',
];

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function addMessage(text, isUser) {
  const div = document.createElement('div');
  div.className = `chat-message ${isUser ? 'user-message' : 'bot-message'}`;
  div.innerHTML = `<span class="message-text">${escapeHtml(text)}</span>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
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

// ── YouTube (channel subscriptions) ──────────────────

const ytIframe = document.getElementById('yt-iframe');
const ytEmpty = document.getElementById('yt-empty');
const ytUrlInput = document.getElementById('yt-url-input');
const ytLoadBtn = document.getElementById('yt-load');
const ytNowPlaying = document.getElementById('yt-now-playing');
const ytChannelsEl = document.getElementById('yt-channels');

const YT_CHANNELS = [
  { name: '스터디윗미 Study With Me', id: 'UCaKGBFr4LOQwwQ-lJQdp1bQ', tag: 'lofi/study' },
  { name: '하루한곡', id: 'UCMxx_hBIBvbXqP08o9KcwPw', tag: 'daily music' },
  { name: '서울의봄 ASMR', id: 'UCX-USfenzQlhrEJR1zD5IYw', tag: 'ambient' },
  { name: '수학의신', id: 'UC-7H7ZImLfGF97Y_EJ0oeog', tag: 'education' },
  { name: '백종원 PAIK', id: 'UCyn-K7rZLXjGl7VXGweIlcA', tag: 'cooking' },
  { name: '국민은행 KB', id: 'UCnOfwSJHQSX-w2ghMGBtvMQ', tag: 'finance' },
];

let ytActiveChannel = null;

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

function loadYouTubeVideo(url, title) {
  const id = extractYouTubeId(url);
  if (!id) return;

  ytIframe.src = `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
  ytIframe.classList.add('visible');
  ytEmpty.classList.add('hidden');

  const displayTitle = title || url;
  ytNowPlaying.textContent = displayTitle;
  ytNowPlaying.classList.add('visible');
}

function loadChannelLatest(channelId, channelName) {
  ytActiveChannel = channelId;
  ytIframe.src = `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId)}&autoplay=1`;
  ytIframe.classList.add('visible');
  ytEmpty.classList.add('hidden');

  ytNowPlaying.textContent = channelName;
  ytNowPlaying.classList.add('visible');

  renderChannelList();
}

function renderChannelList() {
  ytChannelsEl.innerHTML = YT_CHANNELS.map(ch => {
    const isActive = ytActiveChannel === ch.id;
    return `<div class="yt-channel-item${isActive ? ' active' : ''}" data-id="${ch.id}" data-name="${escapeHtml(ch.name)}">
      <span class="yt-ch-marker">${isActive ? '\u25B8' : '\u2013'}</span>
      <span>${escapeHtml(ch.name)}</span>
    </div>`;
  }).join('');

  ytChannelsEl.querySelectorAll('.yt-channel-item').forEach(item => {
    item.addEventListener('click', () => {
      loadChannelLatest(item.dataset.id, item.dataset.name);
    });
  });
}

ytLoadBtn.addEventListener('click', () => {
  const url = ytUrlInput.value.trim();
  if (url) {
    ytActiveChannel = null;
    loadYouTubeVideo(url);
    renderChannelList();
  }
});

ytUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const url = ytUrlInput.value.trim();
    if (url) {
      ytActiveChannel = null;
      loadYouTubeVideo(url);
      renderChannelList();
    }
  }
});

renderChannelList();
