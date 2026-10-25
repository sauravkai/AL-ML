import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDurationLabel, getUserScopedHistoryKey, isSessionJoinAllowed, isSessionVisibleInUpcomingList, isHistoryStatusVisible, normalizeQuestionCount, readStoredHistoryReports, removeCancelledInterviewFromState, resolveParticipantEmail, resolveParticipantName } from './sessionAccess.js';

test('completed sessions cannot be rejoined', () => {
  assert.equal(isSessionJoinAllowed('completed'), false);
  assert.equal(isSessionJoinAllowed('finished'), false);
});

test('inactive or ended items are hidden from upcoming lists', () => {
  assert.equal(isSessionVisibleInUpcomingList({ isActive: false }), false);
  assert.equal(isSessionVisibleInUpcomingList({ status: 'completed' }), false);
  assert.equal(isSessionVisibleInUpcomingList({ status: 'cancelled' }), false);
  assert.equal(isSessionVisibleInUpcomingList({ status: 'canceled' }), false);
  assert.equal(isSessionVisibleInUpcomingList({ status: 'ended' }), false);
  assert.equal(isSessionVisibleInUpcomingList({ completedAt: '2026-01-01T00:00:00Z' }), false);
  assert.equal(isSessionVisibleInUpcomingList({ type: 'login', isActive: true }), false);
  assert.equal(isSessionVisibleInUpcomingList({ type: 'logout', isActive: true }), false);
  assert.equal(isSessionVisibleInUpcomingList({ status: 'scheduled', scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() }), true);
  assert.equal(isSessionVisibleInUpcomingList({ status: 'scheduled', scheduledAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), durationMinutes: 45 }), true);
  assert.equal(isSessionVisibleInUpcomingList({ status: 'scheduled', scheduledAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), durationMinutes: 30 }), false);
  assert.equal(isSessionVisibleInUpcomingList({ status: 'scheduled', scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), sessionEnd: new Date(Date.now() - 30 * 60 * 1000).toISOString() }), false);
  assert.equal(isSessionVisibleInUpcomingList({ status: 'live' }), true);
});

test('active sessions can still be joined', () => {
  assert.equal(isSessionJoinAllowed('in-progress'), true);
  assert.equal(isSessionJoinAllowed('scheduled'), true);
  assert.equal(isSessionJoinAllowed('live'), true);
  assert.equal(isSessionJoinAllowed('cancelled'), false);
});

test('sessions are joinable only after the scheduled start time and before the active window ends', () => {
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const active = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const expired = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  assert.equal(isSessionJoinAllowed({ status: 'scheduled', scheduledAt: future, durationMinutes: 45 }), false);
  assert.equal(isSessionJoinAllowed({ status: 'scheduled', scheduledAt: active, durationMinutes: 45 }), true);
  assert.equal(isSessionJoinAllowed({ status: 'scheduled', scheduledAt: future, endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() }), false);
  assert.equal(isSessionJoinAllowed({ status: 'scheduled', scheduledAt: expired, durationMinutes: 30 }), false);
  assert.equal(isSessionJoinAllowed({ status: 'in-progress', scheduledAt: expired, durationMinutes: 30 }), false);
});

test('user-scoped history keys are isolated per account', () => {
  const first = getUserScopedHistoryKey('previousInterviewReports', { email: 'alpha@example.com' });
  const second = getUserScopedHistoryKey('previousInterviewReports', { email: 'beta@example.com' });

  assert.notEqual(first, second);
  assert.equal(first, 'previousInterviewReports_alpha_example_com');
});

test('cancelled interviews are kept in the history list and marked as cancelled', () => {
  assert.equal(isHistoryStatusVisible({ status: 'cancelled' }), true);
  assert.equal(isHistoryStatusVisible({ status: 'completed' }), true);
  assert.equal(isHistoryStatusVisible({ status: 'scheduled' }), true);
  assert.equal(isHistoryStatusVisible({ status: 'live' }), false);
});

test('cancelled interviews are removed from both active interview and session lists', () => {
  const interviews = [
    { _id: 'a', title: 'Interview A' },
    { _id: 'b', title: 'Interview B' },
  ];

  const sessions = [
    { roomId: 'a', type: 'interview' },
    { roomId: 'c', type: 'interview' },
  ];

  const result = removeCancelledInterviewFromState(interviews, sessions, 'a');

  assert.deepEqual(result.interviews, [{ _id: 'b', title: 'Interview B' }]);
  assert.deepEqual(result.sessions, [{ roomId: 'c', type: 'interview' }]);
});

test('cancelled or terminal interviews are excluded from the active dashboard list', () => {
  const interviews = [
    { _id: 'cancelled-session', status: 'cancelled', cancelledAt: new Date().toISOString() },
    { _id: 'scheduled-session', status: 'scheduled', scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
    { _id: 'completed-session', status: 'completed', completedAt: new Date().toISOString() },
  ];

  const visible = interviews.filter(isSessionVisibleInUpcomingList);
  assert.deepEqual(visible.map((item) => item._id), ['scheduled-session']);
});

test('question counts are normalized to a stable positive integer instead of random default fallbacks', () => {
  assert.equal(normalizeQuestionCount('1'), 1);
  assert.equal(normalizeQuestionCount(0, 2), 2);
  assert.equal(normalizeQuestionCount(undefined, 3), 3);
  assert.equal(normalizeQuestionCount('5.9'), 5);
  assert.equal(normalizeQuestionCount('abc', 4), 4);
});

test('report durations are normalized for both completed interviews and AI practice sessions', () => {
  assert.equal(formatDurationLabel({ durationMinutes: 45 }), '45 min');
  assert.equal(formatDurationLabel({ totalSessionTime: 5400 }), '1h 30m');
  assert.equal(formatDurationLabel({ duration: '90 min' }), '1h 30m');
  assert.equal(formatDurationLabel({ totalTime: 300, questionsAnswered: 5 }), '5 min');
  assert.equal(formatDurationLabel({}), 'N/A');
});

test('participant emails and names are resolved from nested objects as well as flat fields', () => {
  const record = {
    candidateName: 'Candidate Name',
    candidate: { email: 'candidate@gmail.com' },
    interviewer: { name: 'Jane Interviewer', email: 'jane@company.com' },
  };

  assert.equal(resolveParticipantEmail(record), 'candidate@gmail.com');
  assert.equal(resolveParticipantName(record), 'Candidate Name');
  assert.equal(resolveParticipantEmail({ interviewer: { email: 'jane@company.com' } }), 'jane@company.com');
});

test('ai practice reports are persisted and returned in the user-scoped history feed', () => {
  globalThis.localStorage = {
    store: {},
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
    },
    setItem(key, value) {
      this.store[key] = String(value);
    },
    removeItem(key) {
      delete this.store[key];
    },
  };

  const user = { email: 'alpha@example.com' };
  const report = { _id: 'ai_123', title: 'One-to-AI Practice Session', status: 'completed', overallScore: 82 };

  const aiKey = getUserScopedHistoryKey('aiPracticeReports', user);
  globalThis.localStorage.setItem(aiKey, JSON.stringify([report]));

  assert.deepEqual(readStoredHistoryReports('aiPracticeReports', user), [report]);
  assert.equal(globalThis.localStorage.getItem(aiKey), JSON.stringify([report]));
});
