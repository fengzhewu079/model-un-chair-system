import React from 'react';
import { ProductPreview } from '../components/home/ProductPreview';

interface DemoCommitteePageProps {
  onBack: () => void;
  onCreateRoom: () => void;
}

export const DemoCommitteePage: React.FC<DemoCommitteePageProps> = ({ onBack, onCreateRoom }) => (
  <div className="min-h-screen bg-[#f7f8fb] text-slate-950">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <button type="button" onClick={onBack} className="text-lg font-bold tracking-tight text-slate-950">
          MUN Chair
        </button>
        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
          Demo Committee · Sample data only
        </span>
      </div>
    </header>

    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Local preview</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">See the dais workspace.</h1>
          <p className="mt-4 leading-7 text-slate-600">
            This static sample shows the committee tools without creating a room or changing your
            real meeting data.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-bold text-slate-900 hover:bg-slate-50"
          >
            Back Home
          </button>
          <button
            type="button"
            onClick={onCreateRoom}
            className="h-11 rounded-lg bg-blue-700 px-5 text-sm font-bold text-white hover:bg-blue-800"
          >
            Create Real Room
          </button>
        </div>
      </div>

      <div className="mt-10">
        <ProductPreview />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ['1', 'Host sets up', 'Create the room, add delegates, and complete roll call.'],
          ['2', 'Dais joins', 'Share the Meeting ID and PIN with your chair team.'],
          ['3', 'Run together', 'Manage speakers, motions, timers, and voting in one room.'],
        ].map(([number, title, description]) => (
          <div key={number} className="rounded-xl border border-slate-200 bg-white p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
              {number}
            </span>
            <h2 className="mt-4 font-bold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>
        ))}
      </div>
    </main>
  </div>
);
