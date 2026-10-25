export const debounceRefresh = (callback, delay = 250) => {
  let timeoutId = null;

  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      callback(...args);
      timeoutId = null;
    }, delay);
  };
};

const getInterviewIdentityValues = (entry = {}) => [
  entry.interviewerEmail,
  entry.interviewer?.email,
  entry.email,
  entry.userEmail,
  entry.hostEmail,
  entry.recipientEmail,
  entry.interviewerId?.email,
  entry.interviewerName,
  entry.interviewer?.name,
  entry.hostName,
  entry.interviewerId?.name,
].filter((value) => value !== null && value !== undefined && String(value).trim() !== '');

export const isRealInterviewInvitation = (entry = {}) => {
  if (!entry || typeof entry !== 'object') return false;

  const identityValues = getInterviewIdentityValues(entry);
  if (identityValues.length > 0) {
    return true;
  }

  const title = String(entry.title || entry.problemTitle || '').trim();
  const genericInterviewTitle = /^(interview invitation|interview scheduled|live room invitation|upcoming interview scheduled|technical round|interview session)$/i.test(title);
  return !genericInterviewTitle;
};

export const normalizeInterviewCard = (entry = {}, fallbackIndex = 0) => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const roomId = String(entry.roomId || entry.sessionId || entry._id || `room-${fallbackIndex + 1}`).trim();
  const scheduledAt = entry.scheduledAt || entry.time || entry.startedAt || entry.createdAt || new Date().toISOString();
  const interviewerEmail = entry.interviewerEmail || entry.interviewer?.email || entry.email || entry.userEmail || '';
  const interviewerName = entry.interviewerName || entry.interviewer?.name || entry.interviewer || entry.hostName || 'TBD';

  return {
    ...entry,
    _id: entry._id || entry.sessionId || roomId,
    roomId,
    status: String(entry.status || entry.state || 'scheduled').toLowerCase(),
    scheduledAt,
    title: entry.title || entry.problemTitle || 'Interview Session',
    interviewerEmail,
    interviewerName,
    candidateEmail: entry.candidateEmail || entry.recipientEmail || entry.userEmail || '',
    candidateName: entry.candidateName || entry.userName || entry.name || 'Candidate',
  };
};

export const getInterviewEntryFingerprint = (entry = {}) => {
  if (!entry || typeof entry !== 'object') return '';

  const title = String(entry.title || entry.problemTitle || entry.interviewTitle || entry.topic || '').trim().toLowerCase();
  const scheduledAt = String(entry.scheduledAt || entry.time || entry.startedAt || entry.createdAt || entry.completedDate || entry.interviewDate || entry.cancelledAt || entry.canceledAt || '').trim();
  const candidate = String(entry.candidateEmail || entry.recipientEmail || entry.userEmail || entry.email || '').trim().toLowerCase();
  const interviewer = String(entry.interviewerEmail || entry.interviewer?.email || '').trim().toLowerCase();
  const identity = String(entry.roomId || entry.sessionId || entry._id || entry.reportId || '').trim();

  return [identity, title, scheduledAt, candidate, interviewer].join('|');
};

export const dedupeInterviewEntries = (entries = []) => {
  const seen = new Set();

  return (Array.isArray(entries) ? entries : []).filter((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const key = getInterviewEntryFingerprint(entry);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const mergeUpcomingInterviews = (apiInterviews = [], storedInterviews = []) => {
  const mergedMap = new Map();

  const upsert = (entry, fallbackIndex = 0) => {
    if (!isRealInterviewInvitation(entry)) return;

    const normalized = normalizeInterviewCard(entry, fallbackIndex);
    if (!normalized) return;

    const terminalStatus = String(normalized.status || '').toLowerCase();
    const hasTerminalMarker = Boolean(normalized.cancelledAt || normalized.canceledAt || normalized.completedAt || normalized.endedAt || normalized.finishedAt || normalized.closedAt || normalized.expiredAt);
    if (['cancelled', 'canceled', 'completed', 'finished', 'ended', 'closed', 'expired', 'archived', 'submitted', 'reviewed', 'failed'].includes(terminalStatus) || hasTerminalMarker) {
      return;
    }

    const keySource = String(normalized.roomId || normalized._id || normalized.sessionId || normalized.scheduledAt || normalized.title || '').trim();
    if (!keySource) return;

    const existing = mergedMap.get(keySource);
    if (existing) {
      mergedMap.set(keySource, {
        ...existing,
        ...normalized,
        interviewerEmail: normalized.interviewerEmail || existing.interviewerEmail || '',
        interviewerName: normalized.interviewerName || existing.interviewerName || 'TBD',
        candidateEmail: normalized.candidateEmail || existing.candidateEmail || '',
        candidateName: normalized.candidateName || existing.candidateName || 'Candidate',
        title: normalized.title || existing.title || 'Interview Session',
        status: normalized.status || existing.status || 'scheduled',
        scheduledAt: normalized.scheduledAt || existing.scheduledAt || new Date().toISOString(),
      });
      return;
    }

    mergedMap.set(keySource, normalized);
  };

  const merged = [...(Array.isArray(apiInterviews) ? apiInterviews : []), ...(Array.isArray(storedInterviews) ? storedInterviews : [])]
    .filter(Boolean)
    .forEach((entry, index) => upsert(entry, index));

  return dedupeInterviewEntries(Array.from(mergedMap.values()).sort((a, b) => {
    const aTime = new Date(a.scheduledAt || 0).getTime();
    const bTime = new Date(b.scheduledAt || 0).getTime();
    return aTime - bTime;
  }));
};
