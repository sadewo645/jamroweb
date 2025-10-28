import http from 'node:http';
import url from 'node:url';

const SIM_RATIO = parseInt(process.env.SIM_RATIO_SECONDS ?? '30', 10);

function jsonResponse(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  });
  res.end(JSON.stringify(data));
}

function getAfdelings() {
  return [1, 2, 3].map((i) => ({
    id: i,
    kode_unik: `AFD-${String.fromCharCode(64 + i)}`,
    nama: `Afdeling ${String.fromCharCode(64 + i)}`,
    lokasi: `Estate ${i}`,
    luas_ha: 450 + i * 25,
    created_at: new Date(Date.now() - i * 86_400_000).toISOString(),
    blocks: Array.from({ length: 4 }, (_, idx) => ({
      id: Number(`${i}${idx + 1}`),
      kode_unik: `BLK-${i}${idx + 1}`,
      nama: `Blok ${idx + 1}`,
      luas_ha: 50 + idx * 5,
      tahun_tanam: 2015 - idx,
      varietas: ['DxP', 'Tenera', 'Compact'][idx % 3],
      harvest_today_kg: 2500 + idx * 450,
      weather: {
        rain_mm: 10 + idx,
        temperature_c: 27 + idx,
        soil_moisture_pct: 60 + idx * 4
      },
      created_at: new Date(Date.now() - idx * 123_000_000).toISOString()
    })),
    harvest_today_kg: 12_000 + i * 1500,
    delta_harvest: (4 - i) * 3,
    weather: {
      rain_mm: 12 + i * 3,
      temperature_c: 28 + i,
      soil_moisture_pct: 65 + i * 2
    },
    harvest_trend: Array.from({ length: 14 }, (_, idx) => ({
      date: new Date(Date.now() - (14 - idx) * 86_400_000).toISOString(),
      value: 8000 + i * 500 + Math.random() * 1200
    }))
  }));
}

function getHarvestAggregate(period = 'day') {
  const multiplier = period === 'year' ? 320 : period === 'month' ? 26 : 1;
  return {
    period,
    tbs_total_kg: Math.round(112_340 * multiplier),
    cpo_total_ton: Number((89.2 * multiplier).toFixed(2)),
    pko_total_ton: Number((21.6 * multiplier).toFixed(2)),
    rbdpo_total_ton: Number((65.4 * multiplier).toFixed(2)),
    olein_total_ton: Number((34.1 * multiplier).toFixed(2)),
    stearin_total_ton: Number((18.3 * multiplier).toFixed(2)),
    norma_hk_panen: 18.4,
    cost_panen: 427_500_000 * multiplier,
    cost_pabrik: 612_800_000 * multiplier
  };
}

function getStations() {
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
      id: idx + 1,
      stasiun_id: index + 1,
      waktu: new Date(Date.now() - (20 - idx) * SIM_RATIO * 1000).toISOString(),
      throughput_tph: Number((45 + index * 3 + Math.random() * 5).toFixed(2)),
      rendemen_cpo_pct: Number((22 + Math.random() * 3).toFixed(2)),
      rendemen_pko_pct: Number((6 + Math.random() * 1.5).toFixed(2)),
      losses_pct: Number((1.2 + Math.random() * 0.5).toFixed(2)),
      suhu_c: Number((95 + Math.random() * 5).toFixed(1)),
      tekanan_bar: Number((3 + Math.random() * 1.2).toFixed(2)),
      energi_kwh: Math.round(120 + Math.random() * 20)
    }))
  }));
}

function getMillAggregate(period = 'day') {
  const factor = period === 'year' ? 320 : period === 'month' ? 26 : 1;
  return {
    period,
    throughput_tph: Number((178.5 * factor).toFixed(1)),
    oee_pct: 82.4,
    downtime_minutes: 24 * factor,
    energy_kwh: 14_800 * factor
  };
}

function getGuides() {
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

function getNormaHK() {
  return [
    { id: 1, pekerjaan: 'Panen TBS', norma_hk: 18.4, satuan: 'HK/ha', catatan: 'Sesuai target 2025', last_updated_by: 'Direktur' },
    { id: 2, pekerjaan: 'Pengangkutan', norma_hk: 6.2, satuan: 'HK/ton', catatan: 'Optimasi ritase', last_updated_by: 'Direktur' },
    { id: 3, pekerjaan: 'Pemupukan', norma_hk: 12.5, satuan: 'HK/ha', catatan: 'Menyesuaikan pola musim', last_updated_by: 'Direktur' }
  ];
}

function getCostSummary(period = 'day') {
  const factor = period === 'year' ? 320 : period === 'month' ? 26 : 1;
  return {
    period,
    categories: [
      { kategori: 'Pemupukan', total: 182_500_000 * factor },
      { kategori: 'Perawatan Jalan', total: 86_000_000 * factor },
      { kategori: 'Panen', total: 427_500_000 * factor },
      { kategori: 'Transportasi', total: 164_300_000 * factor },
      { kategori: 'Pengolahan Pabrik', total: 356_700_000 * factor },
      { kategori: 'Energi', total: 96_500_000 * factor },
      { kategori: 'Gaji', total: 228_000_000 * factor }
    ]
  };
}

const server = http.createServer((req, res) => {
  const { pathname, query } = url.parse(req.url, true);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    });
    res.end();
    return;
  }

  if (pathname === '/afdelings' && req.method === 'GET') {
    return jsonResponse(res, getAfdelings());
  }

  if (pathname === '/harvest/aggregate' && req.method === 'GET') {
    const period = query.period ?? 'day';
    return jsonResponse(res, getHarvestAggregate(period));
  }

  if (pathname === '/pabrik/stations' && req.method === 'GET') {
    return jsonResponse(res, getStations());
  }

  if (pathname === '/pabrik/aggregate' && req.method === 'GET') {
    const period = query.period ?? 'day';
    return jsonResponse(res, getMillAggregate(period));
  }

  if (pathname === '/panduan' && req.method === 'GET') {
    return jsonResponse(res, getGuides());
  }

  if (pathname === '/norma-hk' && req.method === 'GET') {
    return jsonResponse(res, getNormaHK());
  }

  if (pathname === '/cost/summary' && req.method === 'GET') {
    const period = query.period ?? 'day';
    return jsonResponse(res, getCostSummary(period));
  }

  if (pathname === '/health') {
    return jsonResponse(res, { status: 'ok', sim_ratio_seconds: SIM_RATIO, timestamp: new Date().toISOString() });
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Not found' }));
});

const PORT = process.env.PORT ?? 4000;
server.listen(PORT, () => {
  console.log(`Jamro API simulator running on http://localhost:${PORT}`);
});
