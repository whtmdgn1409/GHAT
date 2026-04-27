export const ALLOWED_EVENTS = new Set([
  'video_room_joined',
  'game_panel_opened',
  'game_created',
  'game_started',
  'round_started',
  'guess_submitted',
  'round_completed',
  'game_completed',
  'vocab_mastered',
  'vocab_missed'
]);

const BLOCKED_PII_KEYS = new Set(['email', 'phone', 'name', 'message_raw']);

export function validateAnalyticsEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return { ok: false, reason: 'ANALYTICS_EVENT_INVALID', details: 'events must be non-empty array' };
  }

  for (const event of events) {
    if (!ALLOWED_EVENTS.has(event.eventName)) {
      return { ok: false, reason: 'ANALYTICS_EVENT_INVALID', details: `unknown eventName: ${event.eventName}` };
    }
    if (!event.eventTime || Number.isNaN(Date.parse(event.eventTime))) {
      return { ok: false, reason: 'ANALYTICS_EVENT_INVALID', details: 'eventTime must be ISO-8601' };
    }
    if (event.params && typeof event.params === 'object') {
      for (const key of Object.keys(event.params)) {
        if (BLOCKED_PII_KEYS.has(key)) {
          return { ok: false, reason: 'ANALYTICS_EVENT_INVALID', details: `PII key not allowed: ${key}` };
        }
        const value = event.params[key];
        if (value && typeof value === 'object') {
          return { ok: false, reason: 'ANALYTICS_EVENT_INVALID', details: 'params must be flattened' };
        }
      }
    }
  }

  return { ok: true };
}
