import React, { useState } from 'react';
import { faqItems, workflowSteps } from '../features/home/homeContent';

interface HomePageProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onStartDemo: () => void;
  walkthroughUrl: string | null;
}

export const HomePage: React.FC<HomePageProps> = ({ onCreateRoom, onJoinRoom, onStartDemo, walkthroughUrl }) => {
  const [activeStep, setActiveStep] = useState(0);
  const step = workflowSteps[activeStep];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-8">
        <a href="#" className="text-lg font-semibold tracking-tight">MUN Chair</a>
        <span className="text-xs text-slate-500">Free beta · No account needed</span>
      </header>
      <main className="mx-auto max-w-5xl px-5 sm:px-8">
        <section className="py-12 sm:py-16">
          <p className="mb-4 text-sm font-semibold text-blue-800">For the dais</p>
          <h1 className="desk-title max-w-2xl text-4xl leading-tight sm:text-5xl">Your committee, in order.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">Keep speakers, motions and votes together. Spend less time keeping records, and more time chairing.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={onCreateRoom} className="rounded-md bg-blue-800 px-6 py-3 font-semibold text-white hover:bg-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700">Create Room <span aria-hidden="true">→</span></button>
            <button type="button" onClick={onJoinRoom} className="rounded-md border border-slate-300 px-6 py-3 font-semibold hover:border-blue-700 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700">Join Room</button>
          </div>
          <p className="mt-3 text-sm text-slate-500">Joining a team? Have your Meeting ID and PIN ready.</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <button type="button" onClick={onStartDemo} className="font-semibold text-blue-800 underline decoration-blue-200 underline-offset-4 hover:decoration-blue-800">Try a sample committee →</button>
            {walkthroughUrl ? <a href={walkthroughUrl} target="_blank" rel="noreferrer" className="text-slate-600 underline underline-offset-4">Watch the walkthrough</a> : <span className="text-slate-500">Video walkthrough coming soon</span>}
          </div>
        </section>
        <section className="border-t border-slate-200 py-10" aria-labelledby="workflow-heading">
          <h2 id="workflow-heading" className="desk-title text-2xl">From roll call to the final vote.</h2>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2" aria-label="Preview the meeting workflow">
            {workflowSteps.map((item, index) => <button key={item.id} type="button" aria-pressed={activeStep === index} onClick={() => setActiveStep(index)} className={`border-b-2 py-2 text-sm font-semibold ${activeStep === index ? 'border-blue-800 text-blue-800' : 'border-transparent text-slate-500 hover:text-slate-900'}`}><span className="mr-2 font-mono text-xs">0{index + 1}</span>{item.label}</button>)}
          </div>
          <p className="my-4 max-w-2xl text-sm leading-6 text-slate-600">{step.description}</p>
          <img src={step.imageSrc} alt={step.imageAlt} loading="lazy" decoding="async" className="w-full rounded-md border border-slate-200" />
        </section>
        <section className="border-t border-slate-200 py-10" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="desk-title mb-6 text-2xl">A few things to know</h2>
          {faqItems.map((item) => <details key={item.question} className="border-b border-slate-200 py-4"><summary className="cursor-pointer font-medium text-slate-800">{item.question}</summary><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{item.answer}</p></details>)}
        </section>
      </main>
      <footer className="mx-auto max-w-5xl px-5 pb-8 text-sm text-slate-500 sm:px-8">MUN Chair · A working desk for your dais.</footer>
    </div>
  );
};
