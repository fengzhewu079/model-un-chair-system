import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PresentationDocument } from '../../components/PresentationDocument';
import '../../styles/presentation-document.css';
import { Button } from '../../components/Button';
import { useMeetingStore } from '../../store/useMeetingStore';
import { findMotionById } from '../../utils/motionCollaboration';
import { presentationProgress } from '../../utils/paperPresentation';
import { formatDuration } from '../../utils/duration';
import { playCompletionSound, playWarningBeeps } from '../../utils/audio';

interface Props { motionId: string; onBack: () => void }

export const PaperPresentationPage: React.FC<Props> = ({motionId, onBack}) => {
  const motion = useMeetingStore(s => findMotionById(s.motions, s.motionGroups, motionId).motion);
  const groupStatus = useMeetingStore(s => s.motionGroups.find(g => g.motions.some(m => m.id === motionId))?.status);
  const begin = useMeetingStore(s => s.beginMotionProcessing);
  const release = useMeetingStore(s => s.releaseMotionProcessing);
  const finish = useMeetingStore(s => s.finishMotionProcessing);
  const advance = useMeetingStore(s => s.advancePaperPresentation);
  const error = useMeetingStore(s => s.motionProcessingError);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const workspace = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === workspace.current);
    document.addEventListener('fullscreenchange', update);
    return () => {document.removeEventListener('fullscreenchange', update);};
  }, []);
  const toggleFullscreen = async () => {
    setFullscreenError('');
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await workspace.current?.requestFullscreen();
    } catch {setFullscreenError('Full screen is unavailable. You can still present here.');}
  };
  const clockStart = useRef<number | null>(null);
  const mounted = useRef(true);
  const completed = groupStatus === 'passed' || groupStatus === 'failed';
  const progress = motion ? presentationProgress(motion) : null;

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    if (!completed) void begin(motionId).then(ok => {if (!cancelled) setReady(ok);});
    return () => {cancelled = true; mounted.current = false;};
  }, [begin, motionId, completed]);

  // Use elapsed time, rather than counting interval callbacks, so background tabs don't drift.
  const flushClock = useCallback(() => {
    if (clockStart.current === null) return;
    const seconds = Math.floor((performance.now() - clockStart.current) / 1000);
    if (seconds < 1) return;
    clockStart.current += seconds * 1000;
    const state = useMeetingStore.getState();
    const before = findMotionById(state.motions, state.motionGroups, motionId).motion;
    if (!before || !advance(motionId, 'tick', seconds)) {
      clockStart.current = null;
      if (mounted.current) setRunning(false);
      return;
    }
    const previous = presentationProgress(before);
    if (previous.phase === 'presentation') {
      const remaining = Math.max(0, previous.remainingSeconds - seconds);
      if (!state.isMuted) {
        if (remaining === 0 && previous.remainingSeconds > 0 && state.soundAlerts.includes(0)) playCompletionSound(state.volume);
        else if (state.soundAlerts.some(t => t > 0 && previous.remainingSeconds > t && remaining <= t)) playWarningBeeps(state.volume);
      }
      if (remaining === 0) {
        clockStart.current = null;
        if (mounted.current) setRunning(false);
      }
    }
  }, [advance, motionId]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(flushClock, 250);
    return () => {window.clearInterval(timer); flushClock();};
  }, [running, flushClock]);

  const pause = () => {flushClock(); clockStart.current = null; setRunning(false);};
  const start = () => {clockStart.current = performance.now(); setRunning(true);};
  const back = async () => {
    pause(); setBusy(true);
    if (!completed) await release({motionId, silent:true});
    onBack();
  };
  const openQA = () => {pause(); advance(motionId, 'qa');};
  const finishPresentation = async () => {
    pause(); setBusy(true);
    if (await finish(motionId)) onBack();
    else setBusy(false);
  };
  const displayTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  if (!motion || !progress) return <main className="p-6"><p>Presentation not found.</p><Button onClick={onBack}>Back to session</Button></main>;
  const isQA = progress.phase === 'qa';
  const timesUp = !isQA && progress.remainingSeconds === 0;

  return <main className="paper-presentation-page">
    <header className="paper-presentation-header">
      <button className="desk-text-button" disabled={busy} onClick={() => void back()}>← Back to session</button>
      <span className="desk-eyebrow">PAPER PRESENTATION</span>
    </header>
    <div ref={workspace} className="paper-presentation-workspace">
    <div className="paper-workspace-toolbar">
      {document.fullscreenEnabled && <button className="desk-text-button" onClick={() => void toggleFullscreen()}>{fullscreen ? 'Exit full screen' : 'Full screen'}</button>}
      {fullscreenError && <p role="status">{fullscreenError}</p>}
    </div>
    <div className="paper-presentation-layout">
    <PresentationDocument key={motionId} />
    <section className="paper-presentation-content">
      <h1 className="desk-title">{motion.parameters.topic}</h1>
      <p className="paper-duration">Presentation · {formatDuration(motion.parameters.totalTime)}</p>
      {error && <p role="alert" className="motion-error">{error}</p>}
      {!ready && !completed ? <p role="status">{error ? 'Return to the session and try again.' : 'Preparing presentation…'}</p> : <>
        <div className="paper-stage-label">{completed ? 'Completed' : isQA ? 'Q&A' : 'Presentation'}</div>
        <div className="paper-clock" role="timer" aria-label={isQA ? 'Q&A elapsed time' : 'Presentation time remaining'}>{displayTime(isQA ? progress.qaElapsedSeconds : progress.remainingSeconds)}</div>
        <p className="paper-clock-caption" role="status">{completed ? (isQA ? 'Q&A elapsed' : 'Presentation time remaining') : timesUp ? 'Time’s up' : running ? (isQA ? 'Elapsed · running' : 'Remaining · running') : 'Paused'}</p>
        {!completed && <>
          <div className="paper-clock-actions">
            {!timesUp && <Button size="lg" disabled={busy} onClick={running ? pause : start}>{running ? 'Pause' : (isQA ? progress.qaElapsedSeconds > 0 : progress.remainingSeconds < (motion.parameters.totalTime ?? 0)) ? 'Resume' : isQA ? 'Start Q&A' : 'Start presentation'}</Button>}
            {!isQA && <Button size="lg" variant="secondary" className="paper-outline-button" disabled={busy} onClick={openQA}>Open Q&A</Button>}
          </div>
          <p className="paper-qa-hint">{isQA ? 'Call questions in any order. Finish when ready.' : 'Q&A is optional. Open it when the introduction ends.'}</p>
          <div className="paper-finish">
            <Button variant="secondary" className="paper-outline-button" disabled={busy} onClick={() => void finishPresentation()}>{busy ? 'Saving…' : 'Finish presentation'}</Button>
            <p>Save to completed records.</p>
          </div>
        </>}
      </>}
    </section>
    </div>
    </div>
  </main>;
};
