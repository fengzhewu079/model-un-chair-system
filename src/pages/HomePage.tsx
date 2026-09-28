import React, { useState } from 'react';
import { faqItems, workflowSteps } from '../features/home/homeContent';

interface HomePageProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onStartDemo: () => void;
  walkthroughUrl: string | null;
}

export const HomePage: React.FC<HomePageProps> = ({ onCreateRoom, onJoinRoom, onStartDemo, walkthroughUrl }) => {
  const [activeStep, setActiveStep] = useState(2);
  const step = workflowSteps[activeStep];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-8">
        <a href="#" className="text-lg font-semibold tracking-tight">MUN Chair</a>
        <span className="text-xs text-slate-500">Free beta · No account needed</span>
      </header>
      <main className="mx-auto max-w-5xl px-5 sm:px-8">
        <section className="py-10 sm:py-12 text-center">
          <h1 className="desk-title mx-auto max-w-3xl text-4xl leading-tight sm:text-6xl">Chair your next committee.</h1>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">Speakers, motions, votes—all in one place.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={onCreateRoom} className="rounded-md bg-primary px-6 py-3 font-semibold text-white hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Create Room <span aria-hidden="true">→</span></button>
            <button type="button" onClick={onJoinRoom} className="rounded-md border border-slate-300 px-6 py-3 font-semibold hover:border-primary hover:text-primary-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Join Room</button>
            <button type="button" onClick={onStartDemo} className="px-3 py-3 font-semibold text-primary-text underline decoration-sky-200 underline-offset-4 hover:decoration-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Try demo <span aria-hidden="true">→</span></button>
          </div>
        </section>
        <section className="pb-10" aria-label="Product preview">
          <img src={step.imageSrc} alt={step.imageAlt} decoding="async" className="w-full border border-slate-200" />
          <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2" aria-label="Preview the meeting workflow">
            {workflowSteps.map((item, index) => <button key={item.id} type="button" aria-pressed={activeStep === index} onClick={() => setActiveStep(index)} className={`border-b-2 py-2 text-sm font-semibold ${activeStep === index ? 'border-primary text-primary-text' : 'border-transparent text-slate-500 hover:text-slate-900'}`}><span className="mr-2 font-mono text-xs">0{index + 1}</span>{item.label}</button>)}
          </div>
          {walkthroughUrl && <a href={walkthroughUrl} target="_blank" rel="noreferrer" className="mt-4 block text-center text-sm text-primary-text underline underline-offset-4">Watch the walkthrough</a>}
        </section>
        <section className="border-t border-slate-200 py-10" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="desk-title mb-6 text-2xl">FAQ</h2>
          {faqItems.map((item) => <details key={item.question} className="border-b border-slate-200 py-4"><summary className="cursor-pointer font-medium text-slate-800">{item.question}</summary><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{item.answer}</p></details>)}
        </section>
      </main>
      <footer className="mx-auto max-w-5xl px-5 pb-8 text-sm text-slate-500 sm:px-8">MUN Chair · A working desk for your dais.</footer>
    </div>
  );
};
