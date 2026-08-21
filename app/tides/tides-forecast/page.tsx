"use client";

import { useState } from "react";

type GeoResult = {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country: string;
    admin1?: string;
};

type MarineData = {
    hourly: {
        time: string[];
        sea_level_height_msl: number[];
        wave_height: number[];
        wave_period: number[];
    };
    hourly_units: {
        sea_level_height_msl: string;
        wave_height: string;
        wave_period: string;
    };
    current: {
        sea_level_height_msl: number;
        wave_height: number;
        sea_surface_temperature: number;
        ocean_current_velocity: number;
    };
};

type TideExtreme = {
    time: string;
    height: number;
    type: "high" | "low";
};

// Deteksi titik puncak (high tide) dan lembah (low tide) dari deret data per jam
function findTideExtremes(
    time: string[],
    heights: number[]
): TideExtreme[] {
    const extremes: TideExtreme[] = [];

    for (let i = 1; i < heights.length - 1; i++) {
        const prev = heights[i - 1];
        const curr = heights[i];
        const next = heights[i + 1];

        if (curr > prev && curr > next) {
            extremes.push({ time: time[i], height: curr, type: "high" });
        } else if (curr < prev && curr < next) {
            extremes.push({ time: time[i], height: curr, type: "low" });
        }
    }

    return extremes;
}

// Buat path SVG sederhana dari deret tinggi air laut
function buildSvgPath(
    heights: number[],
    width: number,
    height: number,
    minVal: number,
    maxVal: number
) {
    const range = maxVal - minVal || 1;
    const stepX = width / (heights.length - 1);

    return heights
        .map((h, i) => {
            const x = i * stepX;
            const y = height - ((h - minVal) / range) * height;
            return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ");
}

export default function TidesForecastPage() {
    const [query, setQuery] = useState("Jakarta");
    const [location, setLocation] = useState<GeoResult | null>(null);
    const [marine, setMarine] = useState<MarineData | null>(null);
    const [extremes, setExtremes] = useState<TideExtreme[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setMarine(null);
        setExtremes([]);

        try {
            // 1. Geocoding: ubah nama kota jadi lat/long
            const geoRes = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
                    query
                )}&count=1&language=id&format=json`
            );
            const geoData = await geoRes.json();

            if (!geoData.results || geoData.results.length === 0) {
                setError("Lokasi tidak ditemukan. Coba nama kota pesisir lain.");
                setLoading(false);
                return;
            }

            const place: GeoResult = geoData.results[0];
            setLocation(place);

            // 2. Ambil data marine (termasuk sea_level_height_msl / tide) dari Open-Meteo
            const marineRes = await fetch(
                `https://marine-api.open-meteo.com/v1/marine?latitude=${place.latitude}&longitude=${place.longitude}` +
                `&hourly=sea_level_height_msl,wave_height,wave_period` +
                `&current=sea_level_height_msl,wave_height,sea_surface_temperature,ocean_current_velocity` +
                `&forecast_days=3&cell_selection=sea&timezone=auto`
            );

            if (!marineRes.ok) {
                setError(
                    "Data pasang-surut tidak tersedia untuk lokasi ini. Coba lokasi yang lebih dekat ke laut."
                );
                setLoading(false);
                return;
            }

            const marineData = await marineRes.json();

            if (!marineData.hourly?.sea_level_height_msl) {
                setError(
                    "Lokasi ini sepertinya jauh dari laut, data pasang-surut tidak tersedia."
                );
                setLoading(false);
                return;
            }

            setMarine(marineData);
            setExtremes(
                findTideExtremes(
                    marineData.hourly.time,
                    marineData.hourly.sea_level_height_msl
                )
            );
        } catch (err) {
            console.error(err);
            setError("Terjadi kesalahan saat mengambil data pasang-surut.");
        } finally {
            setLoading(false);
        }
    }

    const heights = marine?.hourly.sea_level_height_msl ?? [];
    const minVal = heights.length ? Math.min(...heights) : 0;
    const maxVal = heights.length ? Math.max(...heights) : 0;
    const chartWidth = 700;
    const chartHeight = 220;
    const path = heights.length
        ? buildSvgPath(heights, chartWidth, chartHeight, minVal, maxVal)
        : "";

    // Ambil hanya extremes 24 jam ke depan untuk ringkasan
    const upcomingExtremes = extremes.slice(0, 6);

    return (
        <main className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-teal-950 px-4 py-10 text-slate-100">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-800 mb-1">
                    Ramalan Pasang Surut
                </h1>
                <p className="text-slate-500 mb-6">
                    Data tinggi permukaan laut & gelombang dari{" "}
                    <a
                        href="https://open-meteo.com/en/docs/marine-weather-api"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                    >
                        Open-Meteo Marine API
                    </a>
                </p>

                <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Cari kota pesisir... (contoh: Jakarta, Surabaya, Makassar)"
                        className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-cyan-600 px-5 py-2 text-white font-medium hover:bg-cyan-700 disabled:opacity-50"
                    >
                        {loading ? "Mencari..." : "Cari"}
                    </button>
                </form>

                <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3">
                    ⚠️ Data pasang-surut ini berbasis model global (resolusi ~8 km) dan{" "}
                    <strong>tidak cocok untuk navigasi laut</strong>. Untuk keperluan
                    pelayaran, gunakan data resmi dari BMKG / Dishidros TNI AL.
                </div>

                {error && (
                    <div className="mb-6 rounded-lg bg-red-50 border border-red-200 text-red-600 px-4 py-3">
                        {error}
                    </div>
                )}

                {marine && location && (
                    <div className="space-y-6">
                        {/* Current condition */}
                        <div className="rounded-2xl bg-white shadow-md p-6">
                            <p className="text-slate-500 mb-4">
                                {location.name}
                                {location.admin1 ? `, ${location.admin1}` : ""},{" "}
                                {location.country}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                                <div>
                                    <p className="text-xs text-slate-500">Tinggi Air Laut</p>
                                    <p className="text-2xl font-bold text-cyan-700">
                                        {marine.current.sea_level_height_msl?.toFixed(2) ?? "N/A"} m
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Tinggi Gelombang</p>
                                    <p className="text-2xl font-bold text-slate-700">
                                        {marine.current.wave_height?.toFixed(1) ?? "N/A"} m
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Suhu Air Laut</p>
                                    <p className="text-2xl font-bold text-slate-700">
                                        {marine.current.sea_surface_temperature?.toFixed(1) ?? "N/A"}°C
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Arus Laut</p>
                                    <p className="text-2xl font-bold text-slate-700">
                                        {marine.current.ocean_current_velocity?.toFixed(1) ?? "N/A"} km/h
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Tide extremes (high/low) */}
                        <div className="rounded-2xl bg-white shadow-md p-6">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">
                                Estimasi Waktu Pasang & Surut
                            </h2>
                            {upcomingExtremes.length === 0 ? (
                                <p className="text-slate-500 text-sm">
                                    Tidak ada titik pasang/surut yang terdeteksi pada rentang
                                    data ini.
                                </p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {upcomingExtremes.map((ex, i) => (
                                        <div
                                            key={i}
                                            className={`rounded-lg px-4 py-3 border ${ex.type === "high"
                                                ? "bg-cyan-50 border-cyan-200"
                                                : "bg-slate-50 border-slate-200"
                                                }`}
                                        >
                                            <p className="text-xs font-medium text-slate-500">
                                                {ex.type === "high" ? "🔼 Pasang Tinggi" : "🔽 Surut"}
                                            </p>
                                            <p className="font-semibold text-slate-800">
                                                {new Date(ex.time).toLocaleString("id-ID", {
                                                    weekday: "short",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                {ex.height.toFixed(2)} m
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Chart tinggi air laut */}
                        <div className="rounded-2xl bg-white shadow-md p-6">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">
                                Grafik Tinggi Air Laut (3 Hari)
                            </h2>
                            <svg
                                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                className="w-full h-auto"
                                preserveAspectRatio="none"
                            >
                                <path
                                    d={path}
                                    fill="none"
                                    stroke="#0891b2"
                                    strokeWidth="2"
                                />
                                {/* Titik high/low */}
                                {extremes.map((ex, i) => {
                                    const idx = marine.hourly.time.indexOf(ex.time);
                                    if (idx === -1) return null;
                                    const stepX = chartWidth / (heights.length - 1);
                                    const range = maxVal - minVal || 1;
                                    const x = idx * stepX;
                                    const y =
                                        chartHeight -
                                        ((ex.height - minVal) / range) * chartHeight;
                                    return (
                                        <circle
                                            key={i}
                                            cx={x}
                                            cy={y}
                                            r={4}
                                            fill={ex.type === "high" ? "#0e7490" : "#94a3b8"}
                                        />
                                    );
                                })}
                            </svg>
                            <div className="flex justify-between text-xs text-slate-500 mt-2">
                                <span>
                                    {new Date(marine.hourly.time[0]).toLocaleDateString(
                                        "id-ID",
                                        { day: "numeric", month: "short" }
                                    )}
                                </span>
                                <span>
                                    {new Date(
                                        marine.hourly.time[marine.hourly.time.length - 1]
                                    ).toLocaleDateString("id-ID", {
                                        day: "numeric",
                                        month: "short",
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}