import React, { useEffect, useRef, useState } from 'react';
import { faqItems } from '../features/home/homeContent';
import { HomeAtlas } from '../components/HomeAtlas';
import '../styles/home-vitality.css';

interface HomePageProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onStartDemo: () => void;
  walkthroughUrl: string | null;
}

export const HomePage: React.FC<HomePageProps> = ({ onCreateRoom, onJoinRoom, onStartDemo, walkthroughUrl }) => {
  const faqRef = useRef<HTMLElement>(null);
  const [motionPaused, setMotionPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  const scrollToFaq = () => faqRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });

  return (
    <div className="home-editorial" data-motion-paused={motionPaused || reducedMotion}>
      {import.meta.env.VITE_DEPLOYMENT_PREVIEW === 'true' && <aside className="preview-notice" aria-label="Preview version">
        <span>SEO PREVIEW · Use test rooms</span><a href="https://munchair.com/" target="_blank" rel="noreferrer">Open live version ↗</a>
      </aside>}
      <div className="home-cover">
        <header className="home-masthead">
          <a href="#" className="home-wordmark" aria-label="MUN Chair home">
            <img src="/brand-emblem.png" width="48" height="48" alt="" className="home-brand-emblem" />
            MUN Chair
          </a>
          <span className="home-beta">Free beta · No account needed</span>
        </header>
        <main className="home-cover-main">
          <HomeAtlas />
          <section className="home-introduction" aria-labelledby="home-heading">
            <p className="home-kicker">Model United Nations</p>
            <h1 id="home-heading" className="home-title">MUN<span>Chair OS<span className="home-title-stop">.</span></span></h1>
            <p className="home-tagline">Chair your next committee.</p>
            <div className="home-entry-actions">
              <button type="button" onClick={onCreateRoom} className="home-enter">Create Room <span aria-hidden="true">↗</span></button>
              <button type="button" onClick={onJoinRoom} className="home-join-room">Join Room <span aria-hidden="true">→</span></button>
            </div>
            <button type="button" onClick={onStartDemo} className="home-try-demo">Try demo <span aria-hidden="true">→</span></button>
            <p className="home-contact-line"><span>Feedback &amp; collaboration</span><a href="mailto:fengzhewu079@gmail.com">fengzhewu079@gmail.com</a></p>
            {walkthroughUrl && <a href={walkthroughUrl} target="_blank" rel="noreferrer" className="home-walkthrough-link">Watch the walkthrough ↗</a>}
          </section>
        </main>
        <div className="home-cover-bottom">
          <button type="button" className="home-faq-link" onClick={scrollToFaq}>FAQ <span aria-hidden="true">↓</span></button>
          <span className="home-tool-summary">Speakers <span>·</span> Motions <span>·</span> Votes</span>
          {!reducedMotion && <button type="button" className="home-motion-control" onClick={() => setMotionPaused(paused => !paused)} aria-pressed={motionPaused} aria-label={motionPaused ? 'Resume background motion' : 'Pause background motion'}>
            <svg viewBox="0 0 16 16" aria-hidden="true">{motionPaused ? <path d="m5 3 7 5-7 5Z" /> : <><path d="M5 3v10" /><path d="M11 3v10" /></>}</svg>
            <span>{motionPaused ? 'Motion paused' : 'Pause motion'}</span>
          </button>}
        </div>
      </div>
      <section className="home-overview" aria-labelledby="overview-heading">
        <div className="home-overview-heading"><p className="home-kicker">One workspace</p><h2 id="overview-heading">Free Model UN chairing software<span>.</span></h2></div>
        <dl className="home-overview-list">
          <div><dt>Attendance &amp; co-chairs</dt><dd>Take roll call and work with your dais in one room.</dd></div>
          <div><dt>Speakers &amp; motions</dt><dd>Manage speaker lists, timers and motions without switching tools.</dd></div>
          <div><dt>Paper presentations &amp; voting</dt><dd>Present documents, record votes and export meeting records.</dd></div>
        </dl>
      </section>
      <section ref={faqRef} className="home-questions" aria-labelledby="faq-heading">
        <div className="home-questions-heading"><p className="home-kicker">Good to know</p><h2 id="faq-heading">FAQ<span>.</span></h2></div>
        <div className="home-questions-list">{faqItems.map(item => <details key={item.question}>
          <summary>{item.question}<span className="faq-indicator" aria-hidden="true">+</span></summary>
          <p>{item.answer}</p>
        </details>)}</div>
      </section>
      <footer className="home-colophon">
        <div><span className="home-colophon-brand">MUN Chair</span><p>Independent tool for Model UN.</p></div>
        <nav aria-label="Footer"><a href="/privacy.html">Privacy</a><a href="mailto:fengzhewu079@gmail.com">Contact ↗</a></nav>
      </footer>
    </div>
  );
};
