import React, { useState } from 'react';
import { WorkflowSection } from '../components/home/WorkflowSection';
import { FaqSection } from '../components/home/FaqSection';

interface HomePageProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onStartDemo: () => void;
  walkthroughUrl: string | null;
}

const ArrowIcon = () => (
  <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
  </svg>
);

const PlayIcon = () => (
  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8.7 5.3a1 1 0 0 0-1.5.86v11.68a1 1 0 0 0 1.5.86l9.18-5.84a1 1 0 0 0 0-1.72L8.7 5.3Z" />
  </svg>
);

export const HomePage: React.FC<HomePageProps> = ({
  onCreateRoom,
  onJoinRoom,
  onStartDemo,
  walkthroughUrl,
}) => {
  const [showWalkthroughNotice, setShowWalkthroughNotice] = useState(false);

  const entryCards = [
    {
      eyebrow: 'For hosts',
      title: 'Create Committee Room',
      description: 'Create the room, add delegates, complete roll call, and invite your dais team.',
      action: 'Create Room',
      onClick: onCreateRoom,
      primary: true,
    },
    {
      eyebrow: 'For dais members',
      title: 'Join Committee Room',
      description: 'Join an existing room with your Meeting ID, PIN, and name.',
      action: 'Join Room',
      onClick: onJoinRoom,
      primary: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="#" className="text-lg font-bold tracking-tight text-slate-950">
            MUN Chair
          </a>
          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            Free beta · No login required
          </span>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-10 pt-10 sm:px-8 sm:pb-12 sm:pt-12">
          <div className="max-w-5xl">
            <h1 className="max-w-5xl text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-5xl">
              Collaborative dais workspace for Model UN committees.
            </h1>
            <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-600 sm:text-xl">
              Create a room, invite your dais team, and run roll call, speakers, motions, timers,
              and voting together.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {entryCards.map((card) => (
              <article
                key={card.title}
                className="flex min-h-[220px] flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.45)]"
              >
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                  {card.eyebrow}
                </p>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{card.title}</h2>
                <p className="mt-3 max-w-lg leading-7 text-slate-600">{card.description}</p>
                <button
                  type="button"
                  onClick={card.onClick}
                  className={`mt-auto flex h-12 items-center justify-between rounded-lg px-5 text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    card.primary
                      ? 'bg-blue-700 text-white hover:bg-blue-800'
                      : 'border border-slate-300 bg-white text-slate-900 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  {card.action}
                  <ArrowIcon />
                </button>
              </article>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-900 px-6 py-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-8">
            <div>
              <p className="text-lg font-bold">Want to explore first?</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                Open a sample committee or watch a short product walkthrough.
              </p>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:mt-0 sm:min-w-[390px] sm:flex-row">
              <button
                type="button"
                onClick={onStartDemo}
                className="h-11 flex-1 rounded-lg bg-white px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                Start Demo Session
              </button>
              {walkthroughUrl ? (
                <a
                  href={walkthroughUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 text-sm font-bold text-white transition-colors hover:border-slate-400 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <PlayIcon />
                  Watch How It Works
                </a>
              ) : (
                <button
                  type="button"
                  aria-describedby="walkthrough-status"
                  onClick={() => setShowWalkthroughNotice(true)}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 text-sm font-bold text-white transition-colors hover:border-slate-400 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <PlayIcon />
                  Watch How It Works
                </button>
              )}
            </div>
          </div>
          {!walkthroughUrl && (
            <p
              id="walkthrough-status"
              role="status"
              className={`mt-3 text-right text-sm text-slate-500 ${showWalkthroughNotice ? 'visible' : 'invisible'}`}
            >
              Walkthrough video coming soon.
            </p>
          )}
        </section>

        <WorkflowSection />
        <FaqSection />
      </main>

      <footer className="bg-[#f7f8fb] px-5 py-8 text-center text-sm text-slate-500">
        Built for chairs, vice chairs, timers, and conference staff.
      </footer>
    </div>
  );
};
