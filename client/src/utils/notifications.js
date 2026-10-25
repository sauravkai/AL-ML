const STORAGE_KEY = 'interview_ai_notifications';
const SCHEDULED_INTERVIEWS_KEY = 'interview_ai_scheduled_sessions';

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();

export const getStoredNotifications = () => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Unable to load notifications from storage.', error);
    return [];
  }
};

export const getNotificationsForUser = (userEmail = '') => {
  const notifications = getStoredNotifications();
  if (!userEmail) return notifications;

  const normalizedEmail = normalizeEmail(userEmail);
  return notifications.filter((item) => {
    const recipientCandidates = [
      item.recipientEmail,
      item.candidateEmail,
      item.email,
      item.userEmail,
    ];

    const hasRecipient = recipientCandidates.some((candidate) => normalizeEmail(candidate));
    if (!hasRecipient) return true;

    return recipientCandidates.some((candidate) => normalizeEmail(candidate) === normalizedEmail);
  });
};

export const getStoredScheduledInterviews = () => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(SCHEDULED_INTERVIEWS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Unable to load scheduled interviews from storage.', error);
    return [];
  }
};

export const removeScheduledInterviewFromStorage = (interviewId = '') => {
  if (!interviewId || typeof window === 'undefined') return [];

  const next = getStoredScheduledInterviews().filter((item) => {
    const storedId = String(item?.roomId || item?._id || item?.sessionId || '').trim();
    return storedId !== String(interviewId).trim();
  });

  localStorage.setItem(SCHEDULED_INTERVIEWS_KEY, JSON.stringify(next));
  return next;
};

export const getScheduledInterviewsForUser = (userEmail = '', userName = '') => {
  const normalizedEmail = normalizeEmail(userEmail);
  const normalizedName = String(userName || '').trim().toLowerCase();
  const interviews = getStoredScheduledInterviews();

  if (!normalizedEmail && !normalizedName) return interviews;

  return interviews.filter((item) => {
    const emailMatches = [
      item?.candidateEmail,
      item?.interviewerEmail,
      item?.email,
      item?.userEmail,
    ].some((candidate) => normalizeEmail(candidate) === normalizedEmail);

    const nameMatches = [
      item?.candidateName,
      item?.interviewerName,
      item?.name,
      item?.userName,
    ].some((candidate) => String(candidate || '').trim().toLowerCase() === normalizedName);

    return emailMatches || nameMatches;
  });
};

export const saveScheduledInterviewForUser = (interview = []) => {
  if (!interview || typeof interview !== 'object') return [];

  const normalizedInterview = {
    ...interview,
    roomId: interview.roomId || interview._id || `room-${Date.now()}`,
    status: interview.status || 'scheduled',
    scheduledAt: interview.scheduledAt || new Date().toISOString(),
  };

  const existing = getStoredScheduledInterviews();
  const next = [normalizedInterview, ...existing.filter((item) => String(item?.roomId || item?._id || '') !== String(normalizedInterview.roomId))].slice(0, 50);

  if (typeof window !== 'undefined') {
    localStorage.setItem(SCHEDULED_INTERVIEWS_KEY, JSON.stringify(next));
  }

  return next;
};

export const addLiveRoomNotification = (roomId, details = {}) => {
  if (!roomId || typeof window === 'undefined') return null;

  const recipientEmail = details.recipientEmail || details.candidateEmail || details.email || '';
  const normalizedRecipientEmail = normalizeEmail(recipientEmail);
  const payload = {
    id: `live-room-${roomId}-${Date.now()}`,
    type: 'live-room-invite',
    title: details.title || 'Live room invitation',
    message:
      details.message ||
      'Your interviewer has shared a live interview room link for you to join.',
    roomId,
    recipientEmail: normalizedRecipientEmail,
    candidateEmail: normalizeEmail(details.candidateEmail || recipientEmail || ''),
    email: normalizedRecipientEmail,
    userEmail: normalizedRecipientEmail,
    candidateName: details.candidateName || '',
    actionUrl: details.actionUrl || `/live-room/${roomId}`,
    createdAt: new Date().toISOString(),
    read: false,
  };

  const existing = getStoredNotifications();
  const next = [payload, ...existing.filter((item) => {
    if (item.roomId !== roomId) return true;
    if (!normalizedRecipientEmail) return false;
    return normalizeEmail(item.recipientEmail || item.candidateEmail || item.email || item.userEmail) !== normalizedRecipientEmail;
  })].slice(0, 12);

  if (details.recipientEmail || details.candidateEmail || details.email) {
    saveScheduledInterviewForUser({
      ...details,
      roomId,
      candidateEmail: details.candidateEmail || details.recipientEmail || details.email || '',
      interviewerEmail: details.interviewerEmail || '',
      candidateName: details.candidateName || '',
      title: details.title || 'Live room invitation',
      status: 'scheduled',
      scheduledAt: new Date().toISOString(),
    });
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('live-room-notification', { detail: payload }));
    window.dispatchEvent(new CustomEvent('notification-storage-sync', { detail: next }));

    if (typeof StorageEvent !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify(next) }));
    } else {
      window.dispatchEvent(new Event('storage'));
    }
  }

  return payload;
};

export const markNotificationRead = (notificationId) => {
  if (typeof window === 'undefined') return [];

  const next = getStoredNotifications().map((item) =>
    item.id === notificationId ? { ...item, read: true } : item,
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
};

export const clearNotifications = () => {
  if (typeof window === 'undefined') return [];
  localStorage.removeItem(STORAGE_KEY);
  return [];
};
