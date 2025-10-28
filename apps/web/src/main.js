const API_BASE = 'http://localhost:4000';

const roleBadges = {
  PEKERJA: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40',
  MANDOR: 'bg-amber-500/20 text-amber-200 border border-amber-500/40',
  DIREKTUR: 'bg-blue-500/20 text-blue-200 border border-blue-500/40',
  PENGEMBANG: 'bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/40'
};

const state = {
  lastUpdated: null,
  monitoring: {
    periode: 'day',
    afdelingId: 'all',
    blokId: 'all',
    role: 'DIREKTUR',
    afdelings: [],
    aggregates: null
  },
  mill: {
    stations: [],
    aggregates: null
  },
  knowledge: {
    guides: []
  }
};

async function fetchJSON(path, fallback) {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error('Failed');
    return await res.json();
  } catch (err) {
    console.warn(`Using fallback for ${path}`, err.message);
    return fallback;
  }
}

function formatNumber(value, options = {}) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('id-ID', options).format(value);
}

function createSparkline(values) {
  const container = document.createElement('div');
  container.className = 'sparkline';
  const max = Math.max(...values, 1);
  values.forEach((v) => {
    const span = document.createElement('span');
    const height = (v / max) * 100;
    span.style.height = `${height}%`;
    container.appendChild(span);
  });
  return container;
}

function createCard({ title, subtitle, value, unit, delta, icon, accent }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'card-glow relative overflow-hidden rounded-2xl bg-slate-900/80 border border-slate-800/60';
  const content = document.createElement('div');
  content.className = 'card-content p-6 flex flex-col gap-4';

  const header = document.createElement('div');
  header.className = 'flex items-start justify-between';
  const titleGroup = document.createElement('div');
  titleGroup.innerHTML = `
    <p class="text-sm uppercase tracking-wide text-slate-400">${subtitle}</p>
    <h3 class="text-xl font-semibold text-slate-100 mt-1">${title}</h3>
  `;

  const iconWrapper = document.createElement('div');
  iconWrapper.className = `h-10 w-10 rounded-full flex items-center justify-center text-xl ${accent || 'bg-brand-500/20 text-brand-100'}`;
  iconWrapper.innerHTML = icon || '📊';

  header.appendChild(titleGroup);
  header.appendChild(iconWrapper);

  const valueRow = document.createElement('div');
  valueRow.className = 'flex items-end gap-3';
  valueRow.innerHTML = `
    <span class="text-3xl font-bold text-white">${value}${unit ? `<span class="text-lg font-medium text-slate-400 ml-1">${unit}</span>` : ''}</span>
    ${delta ? `<span class="text-sm font-medium ${delta.startsWith('-') ? 'text-rose-400' : 'text-emerald-400'}">${delta}</span>` : ''}
  `;

  content.appendChild(header);
  content.appendChild(valueRow);
  wrapper.appendChild(content);
  return wrapper;
}

function renderHeader(container) {
  container.innerHTML = `
    <header class="sticky top-0 backdrop-blur bg-slate-950/70 border-b border-white/5">
      <div class="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-6">
        <div class="flex items-center justify-between gap-6">
          <div>
            <p class="text-sm font-medium text-brand-200 uppercase">Simulasi 1 hari = 30 detik</p>
            <h1 class="text-3xl font-bold text-white mt-2">JAMRO Palm Monitoring Command Center</h1>
            <p class="text-sm text-slate-400 max-w-2xl mt-3">
              Visualisasi terpadu untuk kebun & pabrik kelapa sawit. Data realtime dari feed simulasi dan worker agregasi.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span class="px-3 py-1.5 rounded-full border border-white/10 text-xs text-slate-300">${new Date().toLocaleString('id-ID')}</span>
            <span class="px-3 py-1.5 rounded-full ${roleBadges[state.monitoring.role]} text-xs font-semibold">${state.monitoring.role}</span>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs uppercase tracking-widest text-slate-400">Periode</label>
            <select id="period-select" class="bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/60">
              <option value="day">Harian</option>
              <option value="month">Bulanan</option>
              <option value="year">Tahunan</option>
            </select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs uppercase tracking-widest text-slate-400">Afdeling</label>
            <select id="afdeling-select" class="bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"></select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs uppercase tracking-widest text-slate-400">Blok</label>
            <select id="blok-select" class="bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"></select>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs uppercase tracking-widest text-slate-400">Status Koneksi</label>
            <div class="flex items-center gap-2 text-sm text-emerald-300">
              <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 status-pulse"></span>
              <span>Live data tersambung</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  `;

  const periodSelect = container.querySelector('#period-select');
  const afdelingSelect = container.querySelector('#afdeling-select');
  const blokSelect = container.querySelector('#blok-select');

  periodSelect.value = state.monitoring.periode;
  periodSelect.addEventListener('change', async (event) => {
    state.monitoring.periode = event.target.value;
    await loadMonitoring();
    render();
  });

  afdelingSelect.innerHTML = `<option value="all">Semua Afdeling</option>`;
  state.monitoring.afdelings.forEach((afd) => {
    afdelingSelect.innerHTML += `<option value="${afd.id}">${afd.kode_unik} — ${afd.nama}</option>`;
  });
  afdelingSelect.value = state.monitoring.afdelingId;
  afdelingSelect.addEventListener('change', (event) => {
    state.monitoring.afdelingId = event.target.value;
    render();
  });

  const selectedAfdeling = state.monitoring.afdelings.find((afd) => String(afd.id) === String(state.monitoring.afdelingId));
  blokSelect.innerHTML = `<option value="all">Semua Blok</option>`;
  (selectedAfdeling?.blocks || []).forEach((blok) => {
    blokSelect.innerHTML += `<option value="${blok.id}">${blok.kode_unik} — ${blok.nama}</option>`;
  });
  blokSelect.value = state.monitoring.blokId;
  blokSelect.addEventListener('change', (event) => {
    state.monitoring.blokId = event.target.value;
    render();
  });
}

function renderKPIRow(container) {
  const wrapper = document.createElement('section');
  wrapper.className = 'max-w-7xl mx-auto px-6 py-10';
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5';
  const agg = state.monitoring.aggregates;

  const cards = [
    {
      title: `${formatNumber(agg?.tbs_total_kg ?? 0, { maximumFractionDigits: 0 })}`,
      subtitle: 'TBS Total',
      value: formatNumber(agg?.tbs_total_kg ?? 0, { maximumFractionDigits: 0 }),
      unit: 'kg',
      icon: '🥥'
    },
    {
      title: 'CPO',
      subtitle: 'Crude Palm Oil',
      value: formatNumber(agg?.cpo_total_ton ?? 0, { maximumFractionDigits: 2 }),
      unit: 'ton',
      icon: '🛢️',
      accent: 'bg-orange-500/20 text-orange-200'
    },
    {
      title: 'PKO',
      subtitle: 'Palm Kernel Oil',
      value: formatNumber(agg?.pko_total_ton ?? 0, { maximumFractionDigits: 2 }),
      unit: 'ton',
      icon: '🌰',
      accent: 'bg-amber-500/20 text-amber-100'
    },
    {
      title: 'RBDPO',
      subtitle: 'Refined Oil',
      value: formatNumber(agg?.rbdpo_total_ton ?? 0, { maximumFractionDigits: 2 }),
      unit: 'ton',
      icon: '⚗️',
      accent: 'bg-yellow-500/20 text-yellow-100'
    },
    {
      title: 'Olein',
      subtitle: 'Fractionation',
      value: formatNumber(agg?.olein_total_ton ?? 0, { maximumFractionDigits: 2 }),
      unit: 'ton',
      icon: '💧',
      accent: 'bg-sky-500/20 text-sky-100'
    },
    {
      title: 'Stearin',
      subtitle: 'Fractionation Solid',
      value: formatNumber(agg?.stearin_total_ton ?? 0, { maximumFractionDigits: 2 }),
      unit: 'ton',
      icon: '🧊',
      accent: 'bg-indigo-500/20 text-indigo-100'
    }
  ];

  cards.forEach((card) => {
    grid.appendChild(
      createCard({
        title: card.title,
        subtitle: card.subtitle,
        value: card.value,
        unit: card.unit,
        icon: card.icon,
        accent: card.accent
      })
    );
  });

  wrapper.appendChild(grid);
  container.appendChild(wrapper);
}

function renderAfdelingGrid(container) {
  const section = document.createElement('section');
  section.className = 'max-w-7xl mx-auto px-6 pb-10';
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-6';
  header.innerHTML = `
    <div>
      <h2 class="text-2xl font-semibold text-white">Monitoring Afdeling</h2>
      <p class="text-sm text-slate-400 mt-1">Status produksi, agroklimat, dan transportasi per afdeling.</p>
    </div>
    <button class="px-4 py-2 rounded-lg bg-brand-500 text-white font-medium shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition">Tambah Afdeling</button>
  `;

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6';

  const filteredAfdelings = state.monitoring.afdelings.filter((afd) => {
    if (state.monitoring.afdelingId === 'all') return true;
    return String(afd.id) === String(state.monitoring.afdelingId);
  });

  filteredAfdelings.forEach((afd) => {
    const blokCards = afd.blocks
      .filter((blok) => (state.monitoring.blokId === 'all' ? true : String(blok.id) === String(state.monitoring.blokId)))
      .map((blok) => `
        <li class="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div>
            <p class="text-sm text-slate-400">${blok.kode_unik}</p>
            <p class="font-medium text-slate-100">${blok.nama}</p>
          </div>
          <div class="text-right text-xs text-slate-400">
            <p>TBS: <span class="text-slate-200 font-semibold">${formatNumber(blok.harvest_today_kg)} kg</span></p>
            <p>Curah hujan: <span class="text-slate-200 font-semibold">${blok.weather?.rain_mm ?? '—'} mm</span></p>
          </div>
        </li>
      `)
      .join('');

    const sparkline = createSparkline(afd.harvest_trend.map((d) => d.value));

    const card = document.createElement('article');
    card.className = 'card-glow relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-white/5';
    card.innerHTML = `
      <div class="card-content p-6 flex flex-col gap-6">
        <header class="flex items-start justify-between">
          <div>
            <span class="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-brand-200">
              <span class="h-2 w-2 rounded-full bg-emerald-400 status-pulse"></span>
              Aktif
            </span>
            <h3 class="text-xl font-semibold text-white mt-2">${afd.nama}</h3>
            <p class="text-sm text-slate-400">Kode ${afd.kode_unik} • ${afd.luas_ha} ha • ${afd.blocks.length} blok</p>
          </div>
          <button class="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 border border-slate-700 hover:border-brand-500/50 transition">Detail</button>
        </header>
        <div class="grid grid-cols-2 gap-4">
          <div class="rounded-2xl bg-slate-900/60 border border-slate-800 px-4 py-3">
            <p class="text-xs uppercase text-slate-400">TBS Hari Ini</p>
            <p class="text-2xl font-bold text-white mt-1">${formatNumber(afd.harvest_today_kg)} <span class="text-sm text-slate-400 font-medium">kg</span></p>
            <p class="text-xs text-emerald-300 mt-2">${afd.delta_harvest}% dari target</p>
          </div>
          <div class="rounded-2xl bg-slate-900/60 border border-slate-800 px-4 py-3">
            <p class="text-xs uppercase text-slate-400">Curah Hujan</p>
            <p class="text-2xl font-bold text-white mt-1">${afd.weather.rain_mm} <span class="text-sm text-slate-400 font-medium">mm</span></p>
            <p class="text-xs text-sky-300 mt-2">Suhu ${afd.weather.temperature_c}°C • Kelembapan ${afd.weather.soil_moisture_pct}%</p>
          </div>
        </div>
        <div>
          <p class="text-xs uppercase tracking-widest text-slate-500 mb-3">Trend 14 Hari</p>
          <div class="rounded-2xl bg-slate-900/50 border border-slate-800 px-4 py-3"></div>
        </div>
        <div>
          <p class="text-xs uppercase tracking-widest text-slate-500 mb-3">Blok Aktif</p>
          <ul class="flex flex-col gap-3">${blokCards}</ul>
        </div>
      </div>
    `;
    card.querySelector('.rounded-2xl.bg-slate-900/50').appendChild(sparkline);
    grid.appendChild(card);
  });

  section.appendChild(header);
  section.appendChild(grid);
  container.appendChild(section);
}

function renderMillSection(container) {
  const section = document.createElement('section');
  section.className = 'max-w-7xl mx-auto px-6 pb-16';
  section.innerHTML = `
    <div class="flex items-center justify-between mb-8">
      <div>
        <h2 class="text-2xl font-semibold text-white">Monitoring Pabrik</h2>
        <p class="text-sm text-slate-400 mt-1">Stasiun proses dan KPI CPO, PKO, RBDPO, Olein, Stearin.</p>
      </div>
      <div class="flex gap-3">
        <button class="px-4 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-sm text-slate-300">Alarm Aktif</button>
        <button class="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium">Detail Pabrik</button>
      </div>
    </div>
  `;

  const metricsGrid = document.createElement('div');
  metricsGrid.className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10';
  const agg = state.mill.aggregates;

  const metricCards = [
    { title: 'Throughput', subtitle: 'Tandan masuk', value: `${formatNumber(agg?.throughput_tph ?? 0, { maximumFractionDigits: 1 })}`, unit: 'tph', icon: '🚛' },
    { title: 'OEE', subtitle: 'Overall Equipment Effectiveness', value: `${formatNumber(agg?.oee_pct ?? 0, { maximumFractionDigits: 1 })}`, unit: '%', icon: '📈', accent: 'bg-emerald-500/20 text-emerald-100' },
    { title: 'Downtime', subtitle: 'Menit kehilangan', value: `${formatNumber(agg?.downtime_minutes ?? 0)}`, unit: 'menit', icon: '⏱️', accent: 'bg-rose-500/20 text-rose-100' },
    { title: 'Energi', subtitle: 'Konsumsi listrik', value: `${formatNumber(agg?.energy_kwh ?? 0)}`, unit: 'kWh', icon: '⚡', accent: 'bg-sky-500/20 text-sky-100' }
  ];

  metricCards.forEach((card) => {
    metricsGrid.appendChild(
      createCard({
        title: card.title,
        subtitle: card.subtitle,
        value: card.value,
        unit: card.unit,
        icon: card.icon,
        accent: card.accent
      })
    );
  });

  section.appendChild(metricsGrid);

  const stationsGrid = document.createElement('div');
  stationsGrid.className = 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6';

  state.mill.stations.forEach((station) => {
    const sparkline = createSparkline(station.metrics.map((m) => m.throughput_tph));
    const tile = document.createElement('article');
    tile.className = 'card-glow relative overflow-hidden rounded-3xl bg-slate-900/70 border border-slate-800';
    tile.innerHTML = `
      <div class="card-content p-6 flex flex-col gap-5">
        <header class="flex items-start justify-between">
          <div>
            <p class="text-xs uppercase tracking-wide text-slate-400">${station.urutan.toString().padStart(2, '0')}</p>
            <h3 class="text-lg font-semibold text-white mt-1">${station.nama}</h3>
          </div>
          <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">
            <span class="h-2 w-2 rounded-full bg-emerald-400 status-pulse"></span>
            Stabil
          </span>
        </header>
        <div class="grid grid-cols-2 gap-4 text-sm text-slate-300">
          <div>
            <p class="text-slate-400">Throughput</p>
            <p class="text-lg font-semibold text-white">${formatNumber(station.metrics.at(-1)?.throughput_tph ?? 0, { maximumFractionDigits: 1 })} tph</p>
          </div>
          <div>
            <p class="text-slate-400">Rendemen</p>
            <p class="text-lg font-semibold text-white">${formatNumber(station.metrics.at(-1)?.rendemen_cpo_pct ?? 0, { maximumFractionDigits: 1 })}%</p>
          </div>
          <div>
            <p class="text-slate-400">Suhu</p>
            <p class="text-lg font-semibold text-white">${station.metrics.at(-1)?.suhu_c ?? '—'}°C</p>
          </div>
          <div>
            <p class="text-slate-400">Tekanan</p>
            <p class="text-lg font-semibold text-white">${station.metrics.at(-1)?.tekanan_bar ?? '—'} bar</p>
          </div>
        </div>
        <div class="rounded-2xl bg-slate-900/60 border border-slate-800 px-4 py-3">
          <p class="text-xs uppercase tracking-widest text-slate-500 mb-3">Trend Throughput</p>
        </div>
      </div>
    `;
    tile.querySelector('.rounded-2xl.bg-slate-900/60').appendChild(sparkline);
    stationsGrid.appendChild(tile);
  });

  section.appendChild(stationsGrid);
  container.appendChild(section);
}

function renderKnowledge(container) {
  const section = document.createElement('section');
  section.className = 'max-w-7xl mx-auto px-6 pb-20';
  section.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <article class="lg:col-span-2 card-glow relative overflow-hidden rounded-3xl bg-slate-900/80 border border-slate-800">
        <div class="card-content p-8 flex flex-col gap-5">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-semibold text-white">Panduan Budidaya</h2>
            <button class="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium">Buat Artikel</button>
          </div>
          <ul class="flex flex-col gap-4">
            ${state.knowledge.guides
              .map(
                (guide) => `
                <li class="rounded-2xl bg-slate-900/60 border border-slate-800 px-5 py-4">
                  <h3 class="text-lg font-semibold text-white">${guide.title}</h3>
                  <p class="text-sm text-slate-400">${guide.summary}</p>
                  <div class="flex items-center gap-3 text-xs text-slate-500 mt-3">
                    <span>Diperbarui ${guide.updated_at}</span>
                    <span>•</span>
                    <span>${guide.author}</span>
                  </div>
                </li>
              `)
              .join('')}
          </ul>
        </div>
      </article>
      <aside class="card-glow relative overflow-hidden rounded-3xl bg-slate-900/80 border border-slate-800">
        <div class="card-content p-8 flex flex-col gap-6">
          <div>
            <h2 class="text-xl font-semibold text-white">Norma HK & Biaya</h2>
            <p class="text-sm text-slate-400 mt-2">Ringkasan norma kerja dan biaya produksi per kategori.</p>
          </div>
          <div class="flex flex-col gap-4 text-sm text-slate-300">
            <div class="flex items-center justify-between">
              <span>Rata HK Panen</span>
              <span class="font-semibold text-white">${formatNumber(state.monitoring.aggregates?.norma_hk_panen ?? 0, { maximumFractionDigits: 1 })} HK/ha</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Cost Panen</span>
              <span class="font-semibold text-white">Rp ${formatNumber(state.monitoring.aggregates?.cost_panen ?? 0)}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Cost Pabrik</span>
              <span class="font-semibold text-white">Rp ${formatNumber(state.monitoring.aggregates?.cost_pabrik ?? 0)}</span>
            </div>
          </div>
          <button class="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-300">Unduh Laporan CSV</button>
        </div>
      </aside>
    </div>
  `;
  container.appendChild(section);
}

function renderFooter(container) {
  const footer = document.createElement('footer');
  footer.className = 'border-t border-white/5 bg-slate-950/80';
  footer.innerHTML = `
    <div class="max-w-7xl mx-auto px-6 py-8 text-xs text-slate-500 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <span>© ${new Date().getFullYear()} JAMRO Palm Intelligence Platform</span>
      <span>Simulasi percepatan waktu 1 hari : 30 detik • Websocket real-time aktif</span>
    </div>
  `;
  container.appendChild(footer);
}

function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  renderHeader(app);
  renderKPIRow(app);
  renderAfdelingGrid(app);
  renderMillSection(app);
  renderKnowledge(app);
  renderFooter(app);
}

async function loadMonitoring() {
  const [afdelings, aggregates] = await Promise.all([
    fetchJSON(`/afdelings`, getAfdelingFallback()),
    fetchJSON(`/harvest/aggregate?period=${state.monitoring.periode}`, getAggregateFallback())
  ]);
  state.monitoring.afdelings = afdelings;
  state.monitoring.aggregates = aggregates;
}

async function loadMill() {
  const [stations, aggregates] = await Promise.all([
    fetchJSON(`/pabrik/stations`, getStationFallback()),
    fetchJSON(`/pabrik/aggregate?period=${state.monitoring.periode}`, getMillAggregateFallback())
  ]);
  state.mill.stations = stations;
  state.mill.aggregates = aggregates;
}

async function loadKnowledge() {
  const guides = await fetchJSON(`/panduan`, getGuideFallback());
  state.knowledge.guides = guides;
}

function getAfdelingFallback() {
  return [1, 2, 3].map((i) => ({
    id: i,
    kode_unik: `AFD-${String.fromCharCode(64 + i)}`,
    nama: `Afdeling ${String.fromCharCode(64 + i)}`,
    luas_ha: 450 + i * 25,
    harvest_today_kg: 12000 + i * 1500,
    delta_harvest: (4 - i) * 3,
    weather: {
      rain_mm: 12 + i * 3,
      temperature_c: 28 + i,
      soil_moisture_pct: 65 + i * 2
    },
    harvest_trend: Array.from({ length: 14 }, (_, idx) => ({
      date: idx,
      value: 8000 + i * 500 + Math.random() * 1200
    })),
    blocks: Array.from({ length: 4 }, (_, idx) => ({
      id: `${i}-${idx}`,
      kode_unik: `BLK-${i}${idx + 1}`,
      nama: `Blok ${idx + 1}`,
      harvest_today_kg: 2500 + idx * 450,
      weather: {
        rain_mm: 10 + idx,
        temperature_c: 27 + idx,
        soil_moisture_pct: 60 + idx * 4
      }
    }))
  }));
}

function getAggregateFallback() {
  return {
    tbs_total_kg: 112340,
    cpo_total_ton: 89.2,
    pko_total_ton: 21.6,
    rbdpo_total_ton: 65.4,
    olein_total_ton: 34.1,
    stearin_total_ton: 18.3,
    norma_hk_panen: 18.4,
    cost_panen: 427_500_000,
    cost_pabrik: 612_800_000
  };
}

function getStationFallback() {
  const stations = [
    'Timbang',
    'Sterilizer',
    'Thresher',
    'Press',
    'Clarification',
    'Kernel (PKO)',
    'Boiler',
    'Turbin'
  ];
  return stations.map((nama, index) => ({
    id: index + 1,
    nama,
    urutan: index + 1,
    metrics: Array.from({ length: 20 }, (_, idx) => ({
      waktu: new Date(Date.now() - (20 - idx) * 30 * 1000).toISOString(),
      throughput_tph: 45 + index * 3 + Math.random() * 5,
      rendemen_cpo_pct: 22 + Math.random() * 3,
      rendemen_pko_pct: 6 + Math.random() * 1.5,
      losses_pct: 1.2 + Math.random() * 0.5,
      suhu_c: 95 + Math.random() * 5,
      tekanan_bar: 3 + Math.random() * 1.2,
      energi_kwh: 120 + Math.random() * 20
    }))
  }));
}

function getMillAggregateFallback() {
  return {
    throughput_tph: 178.5,
    oee_pct: 82.4,
    downtime_minutes: 24,
    energy_kwh: 14800
  };
}

function getGuideFallback() {
  return [
    {
      id: 1,
      title: 'Best Practice Pemupukan Musim Hujan',
      summary: 'Rangkuman dosis dan timing pemupukan pada umur tanaman 4-8 tahun dengan mempertimbangkan curah hujan tinggi.',
      updated_at: '2 hari lalu',
      author: 'Direktorat Agronomi'
    },
    {
      id: 2,
      title: 'SOP Sterilizer untuk Rendemen Optimal',
      summary: 'Checklist parameter suhu, tekanan, dan durasi rebus tandan untuk menjaga kualitas CPO dan PKO.',
      updated_at: '5 hari lalu',
      author: 'Tim Pabrik'
    }
  ];
}

async function bootstrap() {
  await Promise.all([loadMonitoring(), loadMill(), loadKnowledge()]);
  render();
  state.lastUpdated = new Date();

  setInterval(async () => {
    await Promise.all([loadMonitoring(), loadMill()]);
    render();
  }, 30_000);
}

document.addEventListener('DOMContentLoaded', bootstrap);
