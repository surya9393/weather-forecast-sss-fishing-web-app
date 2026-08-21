"use client";

import { useMemo, useState } from "react";

type MoonDay = {
    date: Date;
    phaseValue: number; // 0..1 (0 = new moon, 0.5 = full moon)
    illumination: number; // 0..100 %
    label: string;
    icon: string;
};

const SYNODIC_MONTH = 29.530588853; // rata-rata panjang siklus bulan (hari)

// Referensi new moon (bulan baru) yang diketahui: 6 Januari 2000, 18:14 UTC
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);

function getMoonPhaseValue(date: Date): number {
    const diffDays =
        (date.getTime() - KNOWN_NEW_MOON) / (1000 * 60 * 60 * 24);
    let phase = (diffDays % SYNODIC_MONTH) / SYNODIC_MONTH;
    if (phase < 0) phase += 1;
    return phase; // 0..1
}

function getIllumination(phaseValue: number): number {
    // Illuminasi mendekati bentuk (1 - cos(2*pi*phase)) / 2
    return Math.round((1 - Math.cos(2 * Math.PI * phaseValue)) * 50);
}

function getPhaseLabel(phaseValue: number): { label: string; icon: string } {
    if (phaseValue < 0.03 || phaseValue > 0.97)
        return { label: "Bulan Baru", icon: "🌑" };
    if (phaseValue < 0.22) return { label: "Sabit Awal", icon: "🌒" };
    if (phaseValue < 0.28) return { label: "Kuartal Pertama", icon: "🌓" };
    if (phaseValue < 0.47) return { label: "Cembung Awal", icon: "🌔" };
    if (phaseValue < 0.53) return { label: "Bulan Purnama", icon: "🌕" };
    if (phaseValue < 0.72) return { label: "Cembung Akhir", icon: "🌖" };
    if (phaseValue < 0.78) return { label: "Kuartal Akhir", icon: "🌗" };
    return { label: "Sabit Akhir", icon: "🌘" };
}

function buildForecast(startDate: Date, days: number): MoonDay[] {
    const result: MoonDay[] = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        d.setHours(12, 0, 0, 0); // pakai tengah hari agar representatif

        const phaseValue = getMoonPhaseValue(d);
        const illumination = getIllumination(phaseValue);
        const { label, icon } = getPhaseLabel(phaseValue);

        result.push({ date: d, phaseValue, illumination, label, icon });
    }
    return result;
}

// Cari perkiraan tanggal bulan baru & purnama berikutnya
function findNextEvent(
    from: Date,
    targetPhase: number,
    maxDays = 40
): Date | null {
    for (let i = 0; i < maxDays; i++) {
        const d = new Date(from);
        d.setDate(d.getDate() + i);
        d.setHours(0, 0, 0, 0);
        const dNext = new Date(d);
        dNext.setDate(dNext.getDate() + 1);

        const p1 = getMoonPhaseValue(d);
        const p2 = getMoonPhaseValue(dNext);

        // Deteksi saat phase melewati targetPhase (menangani wrap-around 1 -> 0)
        const crosses = (a: number, b: number, t: number) => {
            if (t === 0) {
                return a > 0.9 && b < 0.1;
            }
            return a < t && b >= t;
        };

        if (crosses(p1, p2, targetPhase)) {
            return d;
        }
    }
    return null;
}

export default function MoonPhaseForecastPage() {
    const [days, setDays] = useState(14);
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(12, 0, 0, 0);
        return d;
    }, []);

    const forecast = useMemo(() => buildForecast(today, days), [today, days]);
    const todayPhase = forecast[0];

    const nextNewMoon = useMemo(
        () => findNextEvent(today, 0),
        [today]
    );
    const nextFullMoon = useMemo(
        () => findNextEvent(today, 0.5),
        [today]
    );

    return (
        <main className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-teal-950 px-4 py-10 text-slate-100">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold mb-1">Ramalan Fase Bulan</h1>
                <p className="text-slate-400 mb-6">
                    Dihitung secara astronomis berdasarkan siklus sinodik bulan
                    (~29.53 hari) — tidak memerlukan koneksi API eksternal.
                </p>

                {/* Today's phase */}
                <div className="rounded-2xl bg-slate-800/60 border border-slate-700 shadow-md p-6 text-center mb-6">
                    <p className="text-slate-400 mb-2">
                        {today.toLocaleDateString("id-ID", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        })}
                    </p>
                    <div className="text-7xl mb-3">{todayPhase.icon}</div>
                    <p className="text-2xl font-semibold">{todayPhase.label}</p>
                    <p className="text-slate-400 mt-1">
                        Iluminasi: {todayPhase.illumination}%
                    </p>

                    <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                        <div className="rounded-lg bg-slate-900/50 px-4 py-3">
                            <p className="text-slate-400">🌑 Bulan Baru Berikutnya</p>
                            <p className="font-medium mt-1">
                                {nextNewMoon
                                    ? nextNewMoon.toLocaleDateString("id-ID", {
                                        day: "numeric",
                                        month: "long",
                                    })
                                    : "-"}
                            </p>
                        </div>
                        <div className="rounded-lg bg-slate-900/50 px-4 py-3">
                            <p className="text-slate-400">🌕 Purnama Berikutnya</p>
                            <p className="font-medium mt-1">
                                {nextFullMoon
                                    ? nextFullMoon.toLocaleDateString("id-ID", {
                                        day: "numeric",
                                        month: "long",
                                    })
                                    : "-"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 mb-4">
                    <label htmlFor="days" className="text-slate-300 text-sm">
                        Tampilkan
                    </label>
                    <select
                        id="days"
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="rounded-lg bg-slate-800 border border-slate-600 px-3 py-1.5 text-sm"
                    >
                        <option value={7}>7 hari</option>
                        <option value={14}>14 hari</option>
                        <option value={30}>30 hari</option>
                    </select>
                </div>

                {/* Forecast list */}
                <div className="rounded-2xl bg-slate-800/60 border border-slate-700 shadow-md p-6">
                    <h2 className="text-lg font-semibold mb-4">
                        Prakiraan {days} Hari
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {forecast.map((m, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between rounded-lg bg-slate-900/50 px-4 py-3"
                            >
                                <div>
                                    <p className="font-medium text-slate-200">
                                        {m.date.toLocaleDateString("id-ID", {
                                            weekday: "short",
                                            day: "numeric",
                                            month: "short",
                                        })}
                                    </p>
                                    <p className="text-xs text-slate-400">{m.label}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{m.icon}</span>
                                    <span className="text-sm text-slate-400 w-10 text-right">
                                        {m.illumination}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="text-xs text-slate-500 mt-6">
                    Catatan: Perhitungan ini adalah estimasi astronomis berbasis rata-rata
                    siklus sinodik bulan dan cukup akurat untuk keperluan umum (selisih
                    biasanya kurang dari beberapa jam). Untuk keperluan ilmiah presisi
                    tinggi, gunakan data dari lembaga astronomi resmi seperti observatorium
                    BMKG atau NASA JPL Horizons.
                </p>
            </div>
        </main>
    );
}