"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
    href: string;
    label: string;
    description: string;
    icon: string;
};

const NAV_ITEMS: NavItem[] = [
    {
        href: "/weather/weather-forecast",
        label: "Cuaca",
        description: "Ramalan cuaca harian",
        icon: "☀️",
    },
    {
        href: "/tides/tides-forecast",
        label: "Pasang Surut",
        description: "Tinggi air laut & gelombang",
        icon: "🌊",
    },
    {
        href: "/moon-phase/moon-phase-forecast",
        label: "Fase Bulan",
        description: "Kalender fase bulan",
        icon: "🌙",
    },
    {
        href: "/fishing/fishing-forecast",
        label: "Kalender Mancing",
        description: "Waktu terbaik memancing",
        icon: "🎣",
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Tombol buka menu, hanya tampil di layar kecil */}
            <button
                onClick={() => setOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-40 flex items-center gap-2 rounded-full bg-slate-900 text-slate-100 px-4 py-2 text-sm font-medium shadow-lg"
                aria-label="Buka menu navigasi"
            >
                <span aria-hidden>☰</span> Menu
            </button>

            {/* Overlay saat menu mobile terbuka */}
            {open && (
                <div
                    onClick={() => setOpen(false)}
                    className="lg:hidden fixed inset-0 z-40 bg-black/40"
                    aria-hidden
                />
            )}

            <aside
                className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 shrink-0
          bg-slate-900 text-slate-100 flex flex-col
          transform transition-transform duration-200 ease-out
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
            >
                <div className="px-6 pt-8 pb-6 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold">
                                Stasiun Data
                            </p>
                            <h1 className="text-xl font-bold mt-1">Prakiraan Alam</h1>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="lg:hidden text-slate-400 hover:text-slate-100 text-xl leading-none"
                            aria-label="Tutup menu navigasi"
                        >
                            ✕
                        </button>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                        Data cuaca, laut, dan langit dalam satu tempat.
                    </p>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className={`group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors
                  ${isActive
                                        ? "bg-cyan-500/10 border border-cyan-500/30"
                                        : "border border-transparent hover:bg-slate-800/70"
                                    }`}
                            >
                                <span
                                    className={`text-xl mt-0.5 ${isActive ? "" : "opacity-80"
                                        }`}
                                    aria-hidden
                                >
                                    {item.icon}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span
                                        className={`block text-sm font-semibold ${isActive ? "text-cyan-300" : "text-slate-100"
                                            }`}
                                    >
                                        {item.label}
                                    </span>
                                    <span className="block text-xs text-slate-500 truncate">
                                        {item.description}
                                    </span>
                                </span>
                                {isActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="px-6 py-4 border-t border-slate-800 text-xs text-slate-600">
                    Data cuaca &amp; laut oleh{" "}
                    <a
                        href="https://open-meteo.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-slate-400"
                    >
                        Open-Meteo
                    </a>
                </div>
            </aside>
        </>
    );
}