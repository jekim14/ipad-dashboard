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

// Shared weather data for air quality widget (temp/humidity)
let latestWeather = { temp: null, humidity: null };

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

    // Share with air quality widget
    latestWeather.temp = current.temperature_2m;
    latestWeather.humidity = current.relative_humidity_2m;

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

// Yahoo Finance via CORS proxy
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
const STOCK_SYMBOLS = [
  { symbol: '^KS11', valueId: 'kospi-value', changeId: 'kospi-change', decimals: 2 },
  { symbol: '^KQ11', valueId: 'kosdaq-value', changeId: 'kosdaq-change', decimals: 2 },
  { symbol: '^IXIC', valueId: 'nasdaq-value', changeId: 'nasdaq-change', decimals: 2 },
];

async function fetchStockData(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  const res = await fetch(CORS_PROXY + encodeURIComponent(url));
  const data = await res.json();
  const meta = data.chart.result[0].meta;
  return {
    price: meta.regularMarketPrice,
    previousClose: meta.chartPreviousClose || meta.previousClose,
  };
}

async function fetchStocksAndFX() {
  // Fetch stock indices
  for (const s of STOCK_SYMBOLS) {
    try {
      const { price, previousClose } = await fetchStockData(s.symbol);
      const change = price - previousClose;
      updateStockRow(s.valueId, s.changeId, price, change, s.decimals);
    } catch (e) {
      // Keep existing values on error
    }
  }

  // Fetch USD/KRW (already live)
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

// ── Calendar Events (from pre-generated data/calendar.json) ──

async function fetchCalendarEvents() {
  const el = document.getElementById('today-events');

  try {
    const res = await fetch('data/calendar.json?t=' + Date.now());
    const data = await res.json();

    const items = data.events || data.items || data || [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // Filter today's events, skip workingLocation events
    const todayEvents = items.filter(item => {
      if (item.eventType === 'workingLocation') return false;
      const start = item.start?.dateTime || item.start?.date || '';
      return start.startsWith(todayStr);
    });

    if (todayEvents.length === 0) {
      el.innerHTML = '<li class="calendar-empty">일정 없음</li>';
      return;
    }

    const events = todayEvents.map(item => {
      const startStr = item.start?.dateTime || item.start?.date || '';
      let time = '종일';
      if (item.start?.dateTime) {
        const d = new Date(startStr);
        time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      }
      return { time, title: item.summary || '(제목 없음)' };
    });

    // Sort by time
    events.sort((a, b) => a.time.localeCompare(b.time));

    el.innerHTML = events.map(e => `
      <li class="calendar-event">
        <span class="event-time">${e.time}</span>
        <span class="event-title">${e.title}</span>
      </li>`).join('');
  } catch (e) {
    el.innerHTML = '<li class="calendar-empty">캘린더 데이터 없음</li>';
  }
}

fetchCalendarEvents();
setInterval(fetchCalendarEvents, 30 * 60 * 1000);

// ── Class Countdown ──────────────────────────────────

// 2026-1학기 시간표
// JS: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
const CLASS_SCHEDULE = {
  2: [ // 화요일
    { start: '11:00', end: '12:30', name: '진로탐색세미나' },
  ],
  3: [ // 수요일
    { start: '13:00', end: '14:30', name: '기능성식품학' },
    { start: '15:00', end: '16:30', name: '정밀식품학연구' },
  ],
  4: [ // 목요일
    { start: '09:00', end: '10:30', name: '술의과학문화그리고생활' },
    { start: '15:00', end: '16:30', name: '커피차그리고초콜릿' },
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

// ── Air Quality (LG ThinQ Air Purifier) ──────────────

const THINQ_CONFIG = {
  pat: 'thinqpat_0cdb10b46e1d6fbcdb16b67097012cd63865b755d91d7e1dbb8d',
  deviceId: 'c8e72fe199519837e0cfc562b8363995384d6fd38e7044c0969150994df52b3a',
  apiBase: 'https://api-kic.lgthinq.com',
  clientId: 'openclaw',
  apiKey: 'v6GFvkweNo7DK7yD3ylIZ9w52aKBU0eJ7wLXkSR3',
};

function getAirStatus(val, thresholds) {
  if (val <= thresholds[0]) return { text: '좋음', level: 1 };
  if (val <= thresholds[1]) return { text: '보통', level: 2 };
  if (val <= thresholds[2]) return { text: '나쁨', level: 3 };
  return { text: '매우나쁨', level: 4 };
}

function thinqLevelToKor(level) {
  const map = { GOOD: '좋음', MODERATE: '보통', BAD: '나쁨', UNHEALTHY: '매우나쁨',
                VERY_UNHEALTHY: '매우나쁨', HAZARDOUS: '위험' };
  return map[level] || level || '--';
}

async function fetchAirQuality() {
  try {
    // ThinQ API preflight fails (no CORS headers on OPTIONS)
    // Use pre-generated data/air.json (updated every 5min by cron)
    const res = await fetch('data/air.json?t=' + Date.now());
    if (!res.ok) throw new Error('No air data');
    const data = await res.json();
    const data = await res.json();

    // Navigate to airQualitySensor
    const sensor = data?.response?.airQualitySensor || data?.result?.airQualitySensor || data?.airQualitySensor || {};

    const pm25 = sensor.PM2 ?? '--';
    const pm10 = sensor.PM10 ?? '--';

    document.getElementById('air-pm25').textContent = pm25;
    document.getElementById('air-pm10').textContent = pm10;

    // Use ThinQ levels if available, else calculate
    const pm25Status = sensor.PM2Level
      ? thinqLevelToKor(sensor.PM2Level)
      : (typeof pm25 === 'number' ? getAirStatus(pm25, [15, 35, 75]).text : '--');
    const pm10Status = sensor.PM10Level
      ? thinqLevelToKor(sensor.PM10Level)
      : (typeof pm10 === 'number' ? getAirStatus(pm10, [30, 80, 150]).text : '--');

    document.getElementById('air-pm25-status').textContent = pm25Status;
    document.getElementById('air-pm10-status').textContent = pm10Status;

    // Overall status from totalPollutionLevel or worst of PM2/PM10
    const overallText = sensor.totalPollutionLevel
      ? thinqLevelToKor(sensor.totalPollutionLevel === 'NORMAL' ? 'GOOD' : sensor.totalPollutionLevel)
      : pm25Status;

    const levelMap = { '좋음': 1, '보통': 2, '나쁨': 3, '매우나쁨': 4, '위험': 4 };
    const worstLevel = Math.max(levelMap[pm25Status] || 1, levelMap[pm10Status] || 1);

    document.getElementById('air-status-text').textContent = overallText;
    document.getElementById('air-dot').setAttribute('data-level', worstLevel);

    // Show totalPollution as AQI-like value
    const pollution = sensor.totalPollution;
    document.getElementById('air-aqi').textContent = pollution != null
      ? `오염도 ${pollution}` : '';

    // Use temperature/humidity from weather API
    if (latestWeather.temp !== null) {
      document.getElementById('air-temp').textContent = latestWeather.temp.toFixed(1);
    }
    if (latestWeather.humidity !== null) {
      document.getElementById('air-humidity').textContent = latestWeather.humidity;
    }

    // Update timestamp
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('air-updated').textContent = `연구실 · ${hh}:${mm} 업데이트`;
  } catch (e) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('air-updated').textContent = `연구실 · ${hh}:${mm} 연결 실패`;
  }
}

// Wait briefly for weather to load first (for temp/humidity data)
setTimeout(fetchAirQuality, 2000);
setInterval(fetchAirQuality, 5 * 60 * 1000);

// ── Utility ──────────────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── YouTube (IFrame Player API + data/media.json) ────

const ytThumbGrid = document.getElementById('yt-thumb-grid');
const ytUrlInput = document.getElementById('yt-url-input');
const ytLoadBtn = document.getElementById('yt-load');
const ytControls = document.getElementById('yt-controls');
const ytNowTitle = document.getElementById('yt-now-title');
const ytNowChannel = document.getElementById('yt-now-channel');
const ytPlayPause = document.getElementById('yt-play-pause');
const ytBackToGrid = document.getElementById('yt-back-to-grid');
const ytProgressWrap = document.getElementById('yt-progress-wrap');
const ytProgressBar = document.getElementById('yt-progress-bar');
const ytTimeEl = document.getElementById('yt-time');

let ytPlayer = null;
let ytPlayerReady = false;
let ytProgressTimer = null;

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

function formatTime(sec) {
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return `${m}:${ss}`;
}

// YouTube IFrame Player API callback
window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player('yt-player', {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      playsinline: 1,
      rel: 0,
      modestbranding: 1,
      controls: 0,
    },
    events: {
      onReady: () => { ytPlayerReady = true; },
      onStateChange: onPlayerStateChange,
    },
  });
};

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    ytPlayPause.textContent = '⏸';
    startProgressUpdate();
  } else if (event.data === YT.PlayerState.PAUSED) {
    ytPlayPause.textContent = '▶';
    stopProgressUpdate();
  } else if (event.data === YT.PlayerState.ENDED) {
    ytPlayPause.textContent = '▶';
    stopProgressUpdate();
  }
}

function startProgressUpdate() {
  stopProgressUpdate();
  ytProgressTimer = setInterval(updateProgress, 500);
}

function stopProgressUpdate() {
  if (ytProgressTimer) { clearInterval(ytProgressTimer); ytProgressTimer = null; }
}

function updateProgress() {
  if (!ytPlayer || !ytPlayer.getDuration) return;
  const dur = ytPlayer.getDuration();
  const cur = ytPlayer.getCurrentTime();
  if (dur > 0) {
    ytProgressBar.style.width = ((cur / dur) * 100) + '%';
    ytTimeEl.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
  }
}

// Play a video by ID
function playVideo(videoId, title, channel) {
  if (!ytPlayerReady) return;

  ytPlayer.loadVideoById({ videoId, suggestedQuality: 'default' });
  document.getElementById('yt-player').style.display = 'block';
  ytThumbGrid.style.display = 'none';
  ytControls.style.display = 'block';

  ytNowTitle.textContent = title || videoId;
  ytNowChannel.textContent = channel || '';
}

// Show grid, hide player
function showGrid() {
  if (ytPlayer && ytPlayer.pauseVideo) ytPlayer.pauseVideo();
  document.getElementById('yt-player').style.display = 'none';
  ytThumbGrid.style.display = '';
  ytControls.style.display = 'none';
  stopProgressUpdate();
}

// Render thumbnail grid from data/media.json
async function loadMediaGrid() {
  try {
    const res = await fetch('data/media.json?t=' + Date.now());
    const data = await res.json();
    const videos = (data.videos || []).slice(0, 6); // 3x2 grid

    ytThumbGrid.innerHTML = videos.map(v =>
      `<div class="yt-thumb-item" data-id="${v.id}" data-title="${escapeHtml(v.title)}" data-channel="${escapeHtml(v.channel)}">
        <img src="${v.thumb}" alt="${escapeHtml(v.title)}" loading="lazy">
        <div class="yt-thumb-label">
          ${escapeHtml(v.title.length > 30 ? v.title.slice(0, 28) + '…' : v.title)}
          <span class="yt-thumb-ch">${escapeHtml(v.channel)}</span>
        </div>
      </div>`
    ).join('');

    ytThumbGrid.querySelectorAll('.yt-thumb-item').forEach(item => {
      item.addEventListener('click', () => {
        playVideo(item.dataset.id, item.dataset.title, item.dataset.channel);
      });
    });
  } catch (e) {
    ytThumbGrid.innerHTML = '<div style="color:#999;padding:20px;text-align:center">미디어 로드 실패</div>';
  }
}

// Controls
ytPlayPause.addEventListener('click', () => {
  if (!ytPlayer) return;
  const state = ytPlayer.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    ytPlayer.pauseVideo();
  } else {
    ytPlayer.playVideo();
  }
});

ytBackToGrid.addEventListener('click', showGrid);

// Progress bar seek
ytProgressWrap.addEventListener('click', (e) => {
  if (!ytPlayer || !ytPlayer.getDuration) return;
  const rect = ytProgressWrap.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  ytPlayer.seekTo(pct * ytPlayer.getDuration(), true);
});

// URL input
ytLoadBtn.addEventListener('click', () => {
  const url = ytUrlInput.value.trim();
  const id = extractYouTubeId(url);
  if (id) playVideo(id, url);
});

ytUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const url = ytUrlInput.value.trim();
    const id = extractYouTubeId(url);
    if (id) playVideo(id, url);
  }
});

// Initialize
loadMediaGrid();
// Refresh media grid every 30 minutes
setInterval(loadMediaGrid, 30 * 60 * 1000);
