import React, { useRef } from 'react';
import { faqItems } from '../features/home/homeContent';

interface HomePageProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onStartDemo: () => void;
  walkthroughUrl: string | null;
}

export const HomePage: React.FC<HomePageProps> = ({ onCreateRoom, onJoinRoom, onStartDemo, walkthroughUrl }) => {
  const faqRef = useRef<HTMLElement>(null);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="flex min-h-[100svh] flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-8">
        <a href="#" className="text-lg font-semibold tracking-tight">MUN Chair</a>
        <span className="text-xs text-slate-500">Free beta · No account needed</span>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 sm:px-8">
        <section className="flex flex-1 flex-col items-center justify-center py-16 text-center" aria-labelledby="home-heading">
          <h1 id="home-heading" className="desk-title mx-auto max-w-3xl text-5xl leading-tight sm:text-7xl">MUN Chair OS</h1>
          <p className="mt-4 text-xl leading-8 text-slate-600 sm:text-2xl">Chair your next committee.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={onCreateRoom} className="rounded-md bg-primary px-6 py-3 font-semibold text-white hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Create Room <span aria-hidden="true">→</span></button>
            <button type="button" onClick={onJoinRoom} className="rounded-md border border-slate-300 px-6 py-3 font-semibold hover:border-primary hover:text-primary-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Join Room</button>
            <button type="button" onClick={onStartDemo} className="px-3 py-3 font-semibold text-primary-text underline decoration-sky-200 underline-offset-4 hover:decoration-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Try demo <span aria-hidden="true">→</span></button>
          </div>
          {walkthroughUrl && <a href={walkthroughUrl} target="_blank" rel="noreferrer" className="mt-4 block text-sm text-primary-text underline underline-offset-4">Watch the walkthrough</a>}
        </section>
        <button type="button" onClick={() => faqRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' })} className="mx-auto flex min-h-12 flex-col items-center gap-2 px-6 pb-8 pt-4 text-sm text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label="Scroll to FAQ">
          <span>FAQ</span><span aria-hidden="true">↓</span>
        </button>
      </main>
      </div>
        <section ref={faqRef} className="border-t border-slate-200 bg-slate-50/60 px-5 py-16 sm:px-8 sm:py-24" aria-labelledby="faq-heading">
          <div className="mx-auto max-w-3xl">
          <h2 id="faq-heading" className="desk-title mb-6 text-2xl">FAQ</h2>
          {faqItems.map((item) => <details key={item.question} className="border-b border-slate-200 py-4"><summary className="cursor-pointer font-medium text-slate-800">{item.question}</summary><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{item.answer}</p></details>)}
          </div>
        </section>
      <footer className="mx-auto max-w-5xl px-5 py-8 text-sm text-slate-500 sm:px-8">MUN Chair · A working desk for your dais.</footer>
    </div>
  );
};
