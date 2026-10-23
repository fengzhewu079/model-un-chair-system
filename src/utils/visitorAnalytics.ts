import type { BeforeSend } from '@vercel/analytics';

export function isAnalyticsHost(hostname: string): boolean {
  return ['munchair.com', 'www.munchair.com', 'model-un-chair-system.vercel.app'].includes(hostname);
}

// Only public page opens are measured. Never forward meeting URLs or event data.
export const sanitizePageView: BeforeSend = (event) => {
  if (event.type !== 'pageview') return null;
  try {
    const url = new URL(event.url);
    if (url.protocol !== 'https:' || !isAnalyticsHost(url.hostname) || url.pathname !== '/') return null;
    return { type: 'pageview', url: 'https://munchair.com/' };
  } catch {
    return null;
  }
};
