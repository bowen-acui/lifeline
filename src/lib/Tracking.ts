import { getAccessToken } from './AuthService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ANON_ID_KEY = 'lifeline_anon_id';
const SESSION_ID_KEY = 'lifeline_session_id';

type Position = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type TrackEventParams = {
  eventName: string;
  eventType: 'click' | 'copy' | 'share' | 'exposure' | 'page_view' | 'submit' | 'search' | 'select';
  page?: string;
  component?: string;
  element?: Element | null;
  domPath?: string;
  elementText?: string;
  elementTag?: string;
  elementId?: string;
  elementClass?: string;
  position?: Position;
  metadata?: Record<string, unknown>;
};

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function getAnonId(): string {
  try {
    const existing = localStorage.getItem(ANON_ID_KEY);
    if (existing) return existing;
    const next = generateId();
    localStorage.setItem(ANON_ID_KEY, next);
    return next;
  } catch {
    return generateId();
  }
}

function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const next = generateId();
    sessionStorage.setItem(SESSION_ID_KEY, next);
    return next;
  } catch {
    return generateId();
  }
}

function getElementPosition(element: Element): Position {
  const rect = element.getBoundingClientRect();
  return {
    top: Math.round(rect.top + window.scrollY),
    left: Math.round(rect.left + window.scrollX),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

function getDomPath(element: Element): string {
  const segments: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === 1) {
    const tag = current.tagName.toLowerCase();
    const id = current.id ? `#${current.id}` : '';
    const className = typeof current.className === 'string'
      ? current.className.trim().split(/\s+/).filter(Boolean).slice(0, 4).join('.')
      : '';
    const classSegment = className ? `.${className}` : '';

    let nth = '';
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children)
        .filter((child) => child.tagName.toLowerCase() === tag);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        nth = `:nth-of-type(${index})`;
      }
    }

    segments.unshift(`${tag}${id}${classSegment}${nth}`);
    if (tag === 'html') break;
    current = current.parentElement;
  }

  return segments.join(' > ');
}

function getElementInfo(element: Element) {
  const text = (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  return {
    domPath: getDomPath(element),
    elementText: text || undefined,
    elementTag: element.tagName.toLowerCase(),
    elementId: element.id || undefined,
    elementClass: typeof element.className === 'string' ? element.className : undefined,
    position: getElementPosition(element),
  };
}

export async function trackEvent(params: TrackEventParams): Promise<void> {
  try {
    const sessionId = getSessionId();
    const anonId = getAnonId();
    const elementInfo = params.element ? getElementInfo(params.element) : null;

    const payload = {
      eventName: params.eventName,
      eventType: params.eventType,
      page: params.page,
      component: params.component,
      domPath: params.domPath ?? elementInfo?.domPath,
      elementText: params.elementText ?? elementInfo?.elementText,
      elementTag: params.elementTag ?? elementInfo?.elementTag,
      elementId: params.elementId ?? elementInfo?.elementId,
      elementClass: params.elementClass ?? elementInfo?.elementClass,
      position: params.position ?? elementInfo?.position,
      metadata: params.metadata,
      sessionId,
      anonId,
      clientTimestamp: new Date().toISOString(),
      pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    };

    const token = await getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    await fetch(`${API_BASE_URL}/api/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (error) {
    console.warn('Tracking failed:', error);
  }
}

export function trackPageView(page: string, metadata?: Record<string, unknown>) {
  return trackEvent({
    eventName: 'page_view',
    eventType: 'page_view',
    page,
    metadata,
  });
}

export function trackExposure(element: Element, params: Omit<TrackEventParams, 'eventType' | 'element'>) {
  return trackEvent({
    ...params,
    eventType: 'exposure',
    element,
  });
}


