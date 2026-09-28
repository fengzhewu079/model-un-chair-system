import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="preview-notice"><span>UI PREVIEW · Use test rooms</span><a href="https://model-un-chair-system.vercel.app" target="_blank" rel="noreferrer">Open stable version ↗</a></div>
    <App />
  </React.StrictMode>
);
