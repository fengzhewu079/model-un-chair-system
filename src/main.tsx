import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { inject } from '@vercel/analytics';
import { isAnalyticsHost, sanitizePageView } from './utils/visitorAnalytics';
import './index.css';
import './styles/ui-vitality.css';

if (import.meta.env.PROD && import.meta.env.VITE_DEPLOYMENT_PREVIEW !== 'true' && isAnalyticsHost(window.location.hostname)) {
  inject({ mode: 'production', beforeSend: sanitizePageView, disableAutoTrack: true });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
