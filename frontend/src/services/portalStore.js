const PREFIX = 'meditrack.portal.';

function storage() {
  return typeof window !== 'undefined' ? window.localStorage : null;
}

export function readPortalValue(key, fallbackValue) {
  const store = storage();
  if (!store) return fallbackValue;

  try {
    const raw = store.getItem(`${PREFIX}${key}`);
    if (!raw) return fallbackValue;
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

export function writePortalValue(key, value) {
  const store = storage();
  if (!store) return;
  store.setItem(`${PREFIX}${key}`, JSON.stringify(value));
}

export function readCollection(key) {
  const value = readPortalValue(key, []);
  return Array.isArray(value) ? value : [];
}

export function upsertCollectionItem(key, item) {
  const current = readCollection(key);
  const withoutItem = current.filter((existing) => existing.id !== item.id);
  const next = [item, ...withoutItem].sort((a, b) => Number(b.id) - Number(a.id));
  writePortalValue(key, next);
  return next;
}

export function appendCollectionItem(key, item) {
  const current = readCollection(key);
  const next = [item, ...current];
  writePortalValue(key, next);
  return next;
}

export function removeCollectionItem(key, id) {
  const current = readCollection(key);
  const next = current.filter((item) => item.id !== id);
  writePortalValue(key, next);
  return next;
}

export function nextPortalId(key) {
  const current = readCollection(key);
  const maxId = current.reduce((max, item) => {
    const value = Number(item?.id) || 0;
    return value > max ? value : max;
  }, 0);
  return maxId + 1;
}

export const PORTAL_KEYS = {
  CHECK_INS: 'checkIns',
  INVOICES: 'invoices',
  WALK_INS: 'walkIns',
  PRESCRIPTIONS: 'prescriptions',
  LAB_REQUESTS: 'labRequests',
  REFERRALS: 'referrals',
  MESSAGES: 'messages',
  ANNOUNCEMENTS: 'announcements',
  ROLE_PERMISSIONS: 'rolePermissions',
  CLINIC_SETTINGS: 'clinicSettings',
  PATIENT_PROFILE: 'patientProfile',
  PATIENT_BILLS: 'patientBills',
  REFILL_REQUESTS: 'refillRequests',
  AVAILABILITY: 'doctorAvailability'
};
