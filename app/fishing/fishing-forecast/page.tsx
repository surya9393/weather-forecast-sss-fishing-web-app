"use client";

import { useEffect, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GeoResult = {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    admin1?: string;
};

type TideExtreme = { time: string; height: number; type: "high" | "low" };

type DayForecast = {
    dateKey: string; // yyyy-mm-dd
    date: Date;
    weatherCode: number;
    windMax: number; // km/h
    precipProb: number; // %
    tempMax: number;
    tempMin: number;
    pressureMean: number | null; // hPa
    pressureTrend: number | null; // hPa vs previous day
    moonPhaseValue: number; // 0..1
    moonIllumination: number; // 0..100
    moonLabel: string;
    moonIcon: string;
    tideSwing: number | null; // meter, max-min in the day
    tideExtremes: TideExtreme[];
    waveHeightAvg: number | null;
    score: number; // 0..100
    moonScore: number;
    tideScore: number;
    weatherScore: number;
};

// ---------------------------------------------------------------------------
// Weather code -> label/icon
// ---------------------------------------------------------------------------

const WEATHER_CODES: Record<number, { label: string; icon: string }> = {
    0: { label: "Cerah", icon: "☀️" },
    1: { label: "Sebagian Cerah", icon: "🌤️" },
    2: { label: "Berawan Sebagian", icon: "⛅" },
    3: { label: "Berawan", icon: "☁️" },
    45: { label: "Berkabut", icon: "🌫️" },
    48: { label: "Kabut Beku", icon: "🌫️" },
    51: { label: "Gerimis Ringan", icon: "🌦️" },
    53: { label: "Gerimis", icon: "🌦️" },
    55: { label: "Gerimis Lebat", icon: "🌧️" },
    61: { label: "Hujan Ringan", icon: "🌧️" },
    63: { label: "Hujan", icon: "🌧️" },
    65: { label: "Hujan Lebat", icon: "🌧️" },
    71: { label: "Salju Ringan", icon: "🌨️" },
    73: { label: "Salju", icon: "🌨️" },
    75: { label: "Salju Lebat", icon: "❄️" },
    80: { label: "Hujan Deras Singkat", icon: "🌧️" },
    95: { label: "Badai Petir", icon: "⛈️" },
    96: { label: "Badai Petir + Es", icon: "⛈️" },
};

function getWeatherInfo(code: number) {
    return WEATHER_CODES[code] ?? { label: "Tidak Diketahui", icon: "❓" };
}

// ---------------------------------------------------------------------------
// Moon phase (astronomis, tidak butuh API)
// ---------------------------------------------------------------------------

const SYNODIC_MONTH = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);

function getMoonPhaseValue(date: Date): number {
    const diffDays = (date.getTime() - KNOWN_NEW_MOON) / (1000 * 60 * 60 * 24);
    let phase = (diffDays % SYNODIC_MONTH) / SYNODIC_MONTH;
    if (phase < 0) phase += 1;
    return phase;
}

function getIllumination(phaseValue: number): number {
    return Math.round((1 - Math.cos(2 * Math.PI * phaseValue)) * 50);
}

function getMoonLabel(phaseValue: number): { label: string; icon: string } {
    if (phaseValue < 0.03 || phaseValue > 0.97) return { label: "Bulan Baru", icon: "🌑" };
    if (phaseValue < 0.22) return { label: "Sabit Awal", icon: "🌒" };
    if (phaseValue < 0.28) return { label: "Kuartal Pertama", icon: "🌓" };
    if (phaseValue < 0.47) return { label: "Cembung Awal", icon: "🌔" };
    if (phaseValue < 0.53) return { label: "Purnama", icon: "🌕" };
    if (phaseValue < 0.72) return { label: "Cembung Akhir", icon: "🌖" };
    if (phaseValue < 0.78) return { label: "Kuartal Akhir", icon: "🌗" };
    return { label: "Sabit Akhir", icon: "🌘" };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dateKey(d: Date) {
    return d.toISOString().slice(0, 10);
}

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
}

function findExtremesForSlice(time: string[], heights: number[]): TideExtreme[] {
    const extremes: TideExtreme[] = [];
    for (let i = 1; i < heights.length - 1; i++) {
        const prev = heights[i - 1];
        const curr = heights[i];
        const next = heights[i + 1];
        if (curr > prev && curr > next) extremes.push({ time: time[i], height: curr, type: "high" });
        else if (curr < prev && curr < next) extremes.push({ time: time[i], height: curr, type: "low" });
    }
    return extremes;
}

function ratingFromScore(score: number) {
    if (score >= 80) return { label: "Sangat Baik", color: "text-emerald-400", bg: "bg-emerald-500/15", ring: "ring-emerald-500/40" };
    if (score >= 60) return { label: "Baik", color: "text-cyan-400", bg: "bg-cyan-500/15", ring: "ring-cyan-500/40" };
    if (score >= 40) return { label: "Cukup", color: "text-amber-400", bg: "bg-amber-500/15", ring: "ring-amber-500/40" };
    return { label: "Kurang", color: "text-slate-400", bg: "bg-slate-500/15", ring: "ring-slate-500/40" };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const FORECAST_DAYS = 8; // dibatasi oleh cakupan Marine API

export default function FishingCalendarPage() {
    const [query, setQuery] = useState("Jakarta");
    const [location, setLocation] = useState<GeoResult | null>(null);
    const [days, setDays] = useState<DayForecast[]>([]);
    const [selected, setSelected] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    async function loadForecast(e?: React.FormEvent) {
        e?.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setHasSearched(true);

        try {
            const geoRes = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=id&format=json`
            );
            const geoData = await geoRes.json();
            if (!geoData.results || geoData.results.length === 0) {
                setError("Lokasi tidak ditemukan. Coba nama kota pesisir lain.");
                setDays([]);
                setLoading(false);
                return;
            }
            const place: GeoResult = geoData.results[0];
            setLocation(place);

            const [weatherRes, marineRes] = await Promise.all([
                fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
                    `&hourly=pressure_msl` +
                    `&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_probability_max` +
                    `&forecast_days=${FORECAST_DAYS}&timezone=auto`
                ),
                fetch(
                    `https://marine-api.open-meteo.com/v1/marine?latitude=${place.latitude}&longitude=${place.longitude}` +
                    `&hourly=sea_level_height_msl,wave_height` +
                    `&forecast_days=${FORECAST_DAYS}&cell_selection=sea&timezone=auto`
                ),
            ]);

            const weatherData = await weatherRes.json();
            const marineOk = marineRes.ok;
            const marineData = marineOk ? await marineRes.json() : null;

            if (!weatherData.daily) {
                setError("Data cuaca tidak tersedia untuk lokasi ini.");
                setDays([]);
                setLoading(false);
                return;
            }

            // Group hourly pressure by date
            const pressureByDate = new Map<string, number[]>();
            if (weatherData.hourly?.pressure_msl) {
                weatherData.hourly.time.forEach((t: string, i: number) => {
                    const key = t.slice(0, 10);
                    const arr = pressureByDate.get(key) ?? [];
                    arr.push(weatherData.hourly.pressure_msl[i]);
                    pressureByDate.set(key, arr);
                });
            }

            // Group hourly tide/wave by date
            const tideByDate = new Map<string, { time: string[]; height: number[] }>();
            const waveByDate = new Map<string, number[]>();
            const hasTide = marineOk && marineData?.hourly?.sea_level_height_msl;
            if (hasTide) {
                marineData.hourly.time.forEach((t: string, i: number) => {
                    const key = t.slice(0, 10);
                    const tideEntry = tideByDate.get(key) ?? { time: [], height: [] };
                    tideEntry.time.push(t);
                    tideEntry.height.push(marineData.hourly.sea_level_height_msl[i]);
                    tideByDate.set(key, tideEntry);

                    const waveArr = waveByDate.get(key) ?? [];
                    if (marineData.hourly.wave_height?.[i] != null) waveArr.push(marineData.hourly.wave_height[i]);
                    waveByDate.set(key, waveArr);
                });
            }

            // Build raw days first (without scores that need dataset-wide normalization)
            const rawDays = weatherData.daily.time.map((t: string, i: number) => {
                const d = new Date(t + "T12:00:00");
                const key = t;

                const pressures = pressureByDate.get(key);
                const pressureMean = pressures && pressures.length
                    ? pressures.reduce((a, b) => a + b, 0) / pressures.length
                    : null;

                const tideEntry = tideByDate.get(key);
                let tideSwing: number | null = null;
                let tideExtremes: TideExtreme[] = [];
                if (tideEntry && tideEntry.height.length > 2) {
                    tideSwing = Math.max(...tideEntry.height) - Math.min(...tideEntry.height);
                    tideExtremes = findExtremesForSlice(tideEntry.time, tideEntry.height);
                }

                const waves = waveByDate.get(key);
                const waveHeightAvg = waves && waves.length ? waves.reduce((a, b) => a + b, 0) / waves.length : null;

                const moonPhaseValue = getMoonPhaseValue(d);
                const moonIllumination = getIllumination(moonPhaseValue);
                const { label: moonLabel, icon: moonIcon } = getMoonLabel(moonPhaseValue);

                return {
                    dateKey: key,
                    date: d,
                    weatherCode: weatherData.daily.weather_code[i],
                    windMax: weatherData.daily.wind_speed_10m_max[i],
                    precipProb: weatherData.daily.precipitation_probability_max[i],
                    tempMax: weatherData.daily.temperature_2m_max[i],
                    tempMin: weatherData.daily.temperature_2m_min[i],
                    pressureMean,
                    pressureTrend: null as number | null,
                    moonPhaseValue,
                    moonIllumination,
                    moonLabel,
                    moonIcon,
                    tideSwing,
                    tideExtremes,
                    waveHeightAvg,
                };
            });

            // Pressure trend vs previous day
            for (let i = 1; i < rawDays.length; i++) {
                if (rawDays[i].pressureMean != null && rawDays[i - 1].pressureMean != null) {
                    rawDays[i].pressureTrend = rawDays[i].pressureMean! - rawDays[i - 1].pressureMean!;
                }
            }

            // Normalize tide swing across the dataset for relative scoring
            const swings = rawDays.map((d) => d.tideSwing).filter((v): v is number => v != null);
            const minSwing = swings.length ? Math.min(...swings) : 0;
            const maxSwing = swings.length ? Math.max(...swings) : 1;

            const finalDays: DayForecast[] = rawDays.map((d) => {
                // Moon score: favor new/full moon (teori solunar)
                const moonScore = clamp(Math.abs(d.moonIllumination - 50) * 2, 0, 100);

                // Tide score: relative amplitude pergerakan air pada hari itu
                let tideScore = 50;
                if (d.tideSwing != null) {
                    tideScore = maxSwing > minSwing
                        ? ((d.tideSwing - minSwing) / (maxSwing - minSwing)) * 100
                        : 50;
                }

                // Weather score: angin rendah, hujan rendah, tekanan sedikit turun (ideal)
                const windScore = clamp(100 - d.windMax * 4, 0, 100);
                const precipScore = clamp(100 - d.precipProb, 0, 100);
                let pressureScore = 60; // netral kalau data tidak ada
                if (d.pressureTrend != null) {
                    if (d.pressureTrend <= 0 && d.pressureTrend >= -3) pressureScore = 100; // turun perlahan: ideal
                    else if (d.pressureTrend < -3) pressureScore = 45; // turun drastis: badai mendekat
                    else if (d.pressureTrend > 0 && d.pressureTrend <= 3) pressureScore = 65; // naik perlahan
                    else pressureScore = 30; // naik drastis: pasca-badai, ikan pasif
                }
                const weatherScore = (windScore + precipScore + pressureScore) / 3;

                const score = Math.round(moonScore * 0.3 + tideScore * 0.3 + weatherScore * 0.4);

                return { ...d, moonScore: Math.round(moonScore), tideScore: Math.round(tideScore), weatherScore: Math.round(weatherScore), score };
            });

            setDays(finalDays);
            setSelected(0);
        } catch (err) {
            console.error(err);
            setError("Terjadi kesalahan saat mengambil data ramalan.");
            setDays([]);
        } finally {
            setLoading(false);
        }
    }

    // Auto-load default location on first mount
    useEffect(() => {
        loadForecast();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const bestDayIndex = useMemo(() => {
        if (!days.length) return -1;
        return days.reduce((bestIdx, d, i) => (d.score > days[bestIdx].score ? i : bestIdx), 0);
    }, [days]);

    const selectedDay = days[selected];

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-teal-950 px-4 py-10 text-slate-100">
            <div className="max-w-5xl mx-auto">
                <p className="text-xs uppercase tracking-widest text-teal-400 font-semibold mb-1">
                    Solunar &middot; Pasang Surut &middot; Cuaca
                </p>
                <h1 className="text-3xl font-bold mb-1">Kalender Ramalan Memancing</h1>
                <p className="text-slate-400 mb-6 max-w-2xl">
                    Skor harian dihitung dari kombinasi fase bulan, pergerakan air pasang-surut,
                    dan kondisi cuaca &mdash; untuk membantu Anda menentukan hari terbaik melaut.
                </p>

                <form onSubmit={loadForecast} className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Cari lokasi pesisir... (contoh: Jakarta, Muara Angke)"
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-teal-600 px-5 py-2 text-white font-medium hover:bg-teal-500 disabled:opacity-50"
                    >
                        {loading ? "Memuat..." : "Cari"}
                    </button>
                </form>

                {error && (
                    <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3">
                        {error}
                    </div>
                )}

                {!error && !days.length && !loading && hasSearched && (
                    <div className="text-slate-500 text-sm">Tidak ada data untuk ditampilkan.</div>
                )}

                {days.length > 0 && location && (
                    <>
                        <p className="text-slate-400 text-sm mb-4">
                            📍 {location.name}
                            {location.admin1 ? `, ${location.admin1}` : ""}, {location.country}
                            {" · "}data {days.length} hari ke depan
                        </p>

                        {/* Best day banner */}
                        {bestDayIndex >= 0 && (
                            <button
                                onClick={() => setSelected(bestDayIndex)}
                                className="w-full text-left mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 hover:bg-emerald-500/15 transition-colors"
                            >
                                <p className="text-xs uppercase tracking-wide text-emerald-400 font-semibold mb-1">
                                    🎣 Hari Terbaik untuk Memancing
                                </p>
                                <p className="text-lg font-semibold">
                                    {days[bestDayIndex].date.toLocaleDateString("id-ID", {
                                        weekday: "long",
                                        day: "numeric",
                                        month: "long",
                                    })}{" "}
                                    <span className="text-emerald-400">— Skor {days[bestDayIndex].score}/100</span>
                                </p>
                            </button>
                        )}

                        {/* Calendar grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
                            {days.map((d, i) => {
                                const rating = ratingFromScore(d.score);
                                const isSelected = i === selected;
                                const weatherInfo = getWeatherInfo(d.weatherCode);
                                return (
                                    <button
                                        key={d.dateKey}
                                        onClick={() => setSelected(i)}
                                        className={`rounded-xl px-3 py-4 text-center border transition-all ${isSelected
                                                ? `border-teal-400 bg-teal-500/10 ring-1 ${rating.ring}`
                                                : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                                            }`}
                                    >
                                        <p className="text-[11px] text-slate-400">
                                            {d.date.toLocaleDateString("id-ID", { weekday: "short" })}
                                        </p>
                                        <p className="text-sm font-semibold mb-1">
                                            {d.date.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                        </p>
                                        <div className="text-xl mb-1">{weatherInfo.icon}</div>
                                        <div className="text-lg mb-1">{d.moonIcon}</div>
                                        <span className={`inline-block text-xs font-bold rounded-full px-2 py-0.5 ${rating.bg} ${rating.color}`}>
                                            {d.score}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Detail panel */}
                        {selectedDay && (
                            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 shadow-md p-6">
                                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                                    <div>
                                        <p className="text-slate-400 text-sm">
                                            {selectedDay.date.toLocaleDateString("id-ID", {
                                                weekday: "long",
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            })}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span
                                                className={`text-3xl font-bold ${ratingFromScore(selectedDay.score).color}`}
                                            >
                                                {selectedDay.score}
                                            </span>
                                            <span
                                                className={`text-sm font-semibold rounded-full px-3 py-1 ${ratingFromScore(selectedDay.score).bg} ${ratingFromScore(selectedDay.score).color}`}
                                            >
                                                {ratingFromScore(selectedDay.score).label}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-6 text-center">
                                        <div>
                                            <p className="text-3xl">{getWeatherInfo(selectedDay.weatherCode).icon}</p>
                                            <p className="text-xs text-slate-400 mt-1">{getWeatherInfo(selectedDay.weatherCode).label}</p>
                                        </div>
                                        <div>
                                            <p className="text-3xl">{selectedDay.moonIcon}</p>
                                            <p className="text-xs text-slate-400 mt-1">{selectedDay.moonLabel}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Score breakdown */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                    {[
                                        { label: "Fase Bulan", value: selectedDay.moonScore, note: `Iluminasi ${selectedDay.moonIllumination}%` },
                                        { label: "Pergerakan Air", value: selectedDay.tideScore, note: selectedDay.tideSwing != null ? `Amplitudo ${selectedDay.tideSwing.toFixed(2)} m` : "Data tidak tersedia" },
                                        { label: "Cuaca", value: selectedDay.weatherScore, note: `Angin ${Math.round(selectedDay.windMax)} km/h · Hujan ${selectedDay.precipProb}%` },
                                    ].map((item) => (
                                        <div key={item.label} className="rounded-xl bg-slate-800/50 px-4 py-3">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-sm text-slate-300">{item.label}</p>
                                                <p className="text-sm font-semibold text-teal-400">{item.value}</p>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-teal-500"
                                                    style={{ width: `${item.value}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">{item.note}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Tide times */}
                                <div className="mb-2">
                                    <p className="text-sm font-semibold text-slate-200 mb-2">🌊 Waktu Terbaik (Pergantian Air)</p>
                                    {selectedDay.tideExtremes.length ? (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedDay.tideExtremes.map((ex, i) => (
                                                <span
                                                    key={i}
                                                    className={`text-xs rounded-full px-3 py-1 border ${ex.type === "high"
                                                            ? "border-teal-500/30 bg-teal-500/10 text-teal-300"
                                                            : "border-slate-600 bg-slate-800 text-slate-300"
                                                        }`}
                                                >
                                                    {ex.type === "high" ? "🔼 Pasang" : "🔽 Surut"}{" "}
                                                    {new Date(ex.time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500">Data pasang-surut tidak tersedia untuk lokasi ini.</p>
                                    )}
                                </div>

                                <p className="text-xs text-slate-600 mt-4">
                                    Suhu {Math.round(selectedDay.tempMin)}–{Math.round(selectedDay.tempMax)}°C
                                    {selectedDay.waveHeightAvg != null && ` · Gelombang rata-rata ${selectedDay.waveHeightAvg.toFixed(1)} m`}
                                    {selectedDay.pressureMean != null && ` · Tekanan ${Math.round(selectedDay.pressureMean)} hPa`}
                                </p>
                            </div>
                        )}
                    </>
                )}

                <div className="mt-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs px-4 py-3">
                    ⚠️ Skor ini adalah estimasi berbasis teori solunar dan data model cuaca/laut global —
                    bukan jaminan hasil tangkapan. Kondisi lokal (arus, kejernihan air, tekanan penangkapan)
                    tetap sangat berpengaruh.
                </div>
            </div>
        </main>
    );
}