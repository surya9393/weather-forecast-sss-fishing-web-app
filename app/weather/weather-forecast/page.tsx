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

type ForecastData = {
    current: {
        temperature_2m: number;
        weather_code: number;
        wind_speed_10m: number;
        relative_humidity_2m: number;
    };
    daily: {
        time: string[];
        weather_code: number[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: number[];
    };
};

// Mapping WMO weather code ke deskripsi + emoji
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
    96: { label: "Badai Petir + Hujan Es", icon: "⛈️" },
};

function getWeatherInfo(code: number) {
    return WEATHER_CODES[code] ?? { label: "Tidak Diketahui", icon: "❓" };
}

export default function WeatherForecastPage() {
    const [query, setQuery] = useState("Jakarta");
    const [location, setLocation] = useState<GeoResult | null>(null);
    const [forecast, setForecast] = useState<ForecastData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setForecast(null);

        try {
            // 1. Geocoding: ubah nama kota jadi lat/long
            const geoRes = await fetch(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
                    query
                )}&count=1&language=id&format=json`
            );
            const geoData = await geoRes.json();

            if (!geoData.results || geoData.results.length === 0) {
                setError("Lokasi tidak ditemukan. Coba nama kota lain.");
                setLoading(false);
                return;
            }

            const place: GeoResult = geoData.results[0];
            setLocation(place);

            // 2. Ambil data forecast dari Open-Meteo
            const forecastRes = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
                `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m` +
                `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
                `&timezone=auto`
            );
            const forecastData = await forecastRes.json();

            setForecast({
                current: forecastData.current,
                daily: forecastData.daily,
            });
        } catch (err) {
            console.error(err);
            setError("Terjadi kesalahan saat mengambil data cuaca.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-linear-to-b from-sky-100 to-white px-4 py-10">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-800 mb-1">
                    Ramalan Cuaca
                </h1>
                <p className="text-slate-500 mb-6">
                    Data cuaca real-time dari{" "}
                    <a
                        href="https://open-meteo.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                    >
                        Open-Meteo
                    </a>
                </p>

                <form onSubmit={handleSearch} className="flex gap-2 mb-8">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Cari kota... (contoh: Jakarta, Bandung)"
                        className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-sky-600 px-5 py-2 text-white font-medium hover:bg-sky-700 disabled:opacity-50"
                    >
                        {loading ? "Mencari..." : "Cari"}
                    </button>
                </form>

                {error && (
                    <div className="mb-6 rounded-lg bg-red-50 border border-red-200 text-red-600 px-4 py-3">
                        {error}
                    </div>
                )}

                {forecast && location && (
                    <div className="space-y-6">
                        {/* Current weather */}
                        <div className="rounded-2xl bg-white shadow-md p-6 text-center">
                            <p className="text-slate-500">
                                {location.name}
                                {location.admin1 ? `, ${location.admin1}` : ""},{" "}
                                {location.country}
                            </p>
                            <div className="text-6xl my-3">
                                {getWeatherInfo(forecast.current.weather_code).icon}
                            </div>
                            <p className="text-5xl font-bold text-slate-800">
                                {Math.round(forecast.current.temperature_2m)}°C
                            </p>
                            <p className="text-slate-600 mt-1">
                                {getWeatherInfo(forecast.current.weather_code).label}
                            </p>
                            <div className="flex justify-center gap-6 mt-4 text-sm text-slate-500">
                                <span>💧 Kelembapan: {forecast.current.relative_humidity_2m}%</span>
                                <span>💨 Angin: {forecast.current.wind_speed_10m} km/h</span>
                            </div>
                        </div>

                        {/* 7-day forecast */}
                        <div className="rounded-2xl bg-white shadow-md p-6">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">
                                Prakiraan 7 Hari
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {forecast.daily.time.map((date, i) => {
                                    const info = getWeatherInfo(forecast.daily.weather_code[i]);
                                    return (
                                        <div
                                            key={date}
                                            className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3"
                                        >
                                            <div>
                                                <p className="font-medium text-slate-700">
                                                    {new Date(date).toLocaleDateString("id-ID", {
                                                        weekday: "long",
                                                        day: "numeric",
                                                        month: "short",
                                                    })}
                                                </p>
                                                <p className="text-xs text-slate-500">{info.label}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{info.icon}</span>
                                                <span className="text-sm text-slate-600">
                                                    {Math.round(forecast.daily.temperature_2m_min[i])}° /{" "}
                                                    {Math.round(forecast.daily.temperature_2m_max[i])}°
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main >
    );
}