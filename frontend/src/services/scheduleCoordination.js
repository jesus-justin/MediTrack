import { PORTAL_KEYS, readCollection } from './portalStore';

function toMinutes(clockValue) {
  const [h, m] = String(clockValue || '00:00').split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function dayNameFromIso(isoDateTime) {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function slotRangeMinutes(slot) {
  const start = new Date(slot.startTime);
  const end = new Date(slot.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  return {
    day: dayNameFromIso(slot.startTime),
    start: start.getHours() * 60 + start.getMinutes(),
    end: end.getHours() * 60 + end.getMinutes()
  };
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export function getDoctorAvailabilityRules(doctorName) {
  const items = readCollection(PORTAL_KEYS.AVAILABILITY);
  const marker = String(doctorName || '').toLowerCase();
  return items.filter((entry) => String(entry.doctorDisplayName || '').toLowerCase() === marker);
}

export function applyAvailabilityToSlots(slots, doctorName) {
  const rules = getDoctorAvailabilityRules(doctorName);
  if (!rules.length) return slots;

  const normalized = rules.map((rule) => ({
    mode: rule.mode || 'AVAILABLE',
    day: String(rule.day || ''),
    start: toMinutes(rule.start),
    end: toMinutes(rule.end)
  }));

  const hasAvailableWindows = normalized.some((rule) => rule.mode === 'AVAILABLE');

  return slots.filter((slot) => {
    const range = slotRangeMinutes(slot);
    if (!range || !range.day) return false;

    const sameDayRules = normalized.filter((rule) => rule.day === range.day);
    if (!sameDayRules.length) return true;

    const availableWindows = sameDayRules.filter((rule) => rule.mode === 'AVAILABLE');
    const blockedWindows = sameDayRules.filter((rule) => rule.mode === 'BLOCKED');

    const allowedByAvailability = !hasAvailableWindows
      || availableWindows.some((rule) => range.start >= rule.start && range.end <= rule.end);

    if (!allowedByAvailability) return false;

    const blocked = blockedWindows.some((rule) => overlaps(range.start, range.end, rule.start, rule.end));
    return !blocked;
  });
}

export function getActiveAnnouncementsForRole(role) {
  const all = readCollection(PORTAL_KEYS.ANNOUNCEMENTS);
  const now = new Date();

  return all.filter((announcement) => {
    const audience = announcement.audience || 'ALL';
    const expiresAt = announcement.expiresAt ? new Date(announcement.expiresAt) : null;
    const notExpired = !expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt >= now;

    if (!notExpired) return false;
    if (audience === 'ALL') return true;
    if (audience === 'STAFF') return role === 'ADMIN' || role === 'DOCTOR' || role === 'RECEPTIONIST';
    if (audience === 'PATIENTS') return role === 'PATIENT';
    return false;
  });
}
