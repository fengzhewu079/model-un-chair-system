import React from 'react';

const queue = ['Brazil', 'China', 'Kenya'];

export const ProductPreview: React.FC = () => (
  <section
    aria-label="MUN Chair product preview"
    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-36px_rgba(15,23,42,0.35)]"
  >
    <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-900">Security Council</p>
        <p className="mt-0.5 text-xs text-slate-500">Sample committee workspace</p>
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Online Dais Members · 3
      </div>
    </div>

    <div className="grid gap-px bg-slate-200 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-px bg-slate-200">
        <div className="bg-white p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Current Speaker
          </p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-2xl font-bold text-slate-950">France</p>
              <p className="mt-1 text-sm text-slate-500">General Speakers List</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Timer</p>
              <p className="mt-1 font-mono text-4xl font-semibold tracking-tight text-blue-700">
                00:42
              </p>
            </div>
          </div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-2/3 rounded-full bg-blue-600" />
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Motions</p>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              In progress
            </span>
          </div>
          <p className="mt-3 font-semibold text-slate-900">Moderated Caucus</p>
          <p className="mt-1 text-sm text-slate-500">10 minutes · 45 seconds per speaker</p>
        </div>
      </div>

      <div className="space-y-px bg-slate-200">
        <div className="bg-white p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Speakers Queue
          </p>
          <ol className="mt-4 space-y-3">
            {queue.map((country, index) => (
              <li key={country} className="flex items-center gap-3 text-sm font-semibold text-slate-800">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500">
                  {index + 1}
                </span>
                {country}
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-white p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Voting</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              ['Yes', '12', 'text-emerald-700'],
              ['No', '2', 'text-red-600'],
              ['Abstain', '4', 'text-amber-600'],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-lg bg-slate-50 px-2 py-3">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);
