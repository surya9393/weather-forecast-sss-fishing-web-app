import { Bebas_Neue, JetBrains_Mono } from "next/font/google";

const bebas = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export default function Home() {
  return (
    <main className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-teal-950 px-4 py-10 text-slate-100">
      {/* Logo sederhana: kail pancing */}
      <div className="grid justify-center items-center">
        <div className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-[#E8720C]">
            <path
              d="M12 2v10.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M12 12.5a4 4 0 1 0 4 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="3" r="1.5" fill="currentColor" />
          </svg>
          <span className={`${mono.variable} font-[family-name:var(--font-mono)] text-sm tracking-widest text-[#9FC4CC]`}>
            KAIL & OMBAK
          </span>
        </div>

        {/* Hero */}
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1
            className={`${bebas.variable} font-[family-name:var(--font-display)] max-w-md text-5xl sm:text-6xl leading-[0.95] tracking-wide text-[#F2ECDD]`}
          >
            Setiap lemparan kail{" "}
            <span className="text-[#E8720C]">adalah cerita</span>
          </h1>
          <p className="max-w-md text-lg leading-8 text-[#9FC4CC]">
            Temukan spot mancing terbaik, catat tangkapanmu, dan terhubung
            dengan komunitas pemancing di seluruh Indonesia — dari empang
            belakang rumah sampai laut lepas.
          </p>
        </div>

        {/* "Log tangkapan" — signature element */}
        <div
          className={`${mono.variable} font-[family-name:var(--font-mono)] w-full max-w-md rounded-lg border border-[#1C5D6E] bg-black/20 px-4 py-3 text-xs text-[#9FC4CC]`}
        >
          <p>
            <span className="text-[#E8720C]">06:42</span> — Strike terdeteksi di{" "}
            <span className="text-[#F2ECDD]">Waduk Jatiluhur</span>, Kakap 1.8kg
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">

          <a className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#E8720C] px-6 text-[#0A2530] transition-colors hover:bg-[#f5871e] md:w-auto"
            href="/fishing/fishing-forecast"
          >
            Mulai Ramalan Memancing
          </a>

          <a className="flex h-12 w-full items-center justify-center rounded-full border border-[#1C5D6E] px-6 text-[#F2ECDD] transition-colors hover:bg-white/5 md:w-auto"
            href="/weather/weather-forecast"
          >
            Lihat Ramalan Cuaca
          </a>
        </div>

        {/* Garis ombak dekoratif */}
        <svg
          className="pointer-events-none absolute bottom-0 left-0 w-full text-[#1C5D6E]/30"
          viewBox="0 0 400 40"
          preserveAspectRatio="none"
        >
          <path
            d="M0 20 Q 25 5, 50 20 T 100 20 T 150 20 T 200 20 T 250 20 T 300 20 T 350 20 T 400 20"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
          />
        </svg>
      </div>
    </main >
  );
}