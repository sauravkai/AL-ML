import test from 'node:test';
import assert from 'node:assert/strict';
import { debounceRefresh, mergeUpcomingInterviews } from './dashboardInterviews.js';

test('merges live API interviews with stored scheduled interviews for the same user', () => {
  const apiInterviews = [
    { _id: 'a1', roomId: 'room-1', title: 'Backend Round', scheduledAt: '2026-10-23T12:00:00Z', interviewerEmail: 'alex@company.com', status: 'scheduled' },
  ];

  const storedInterviews = [
    { _id: 'b2', roomId: 'room-2', title: 'Frontend Round', scheduledAt: '2026-10-23T14:00:00Z', interviewerEmail: 'bea@company.com', status: 'scheduled' },
    { _id: 'a1', roomId: 'room-1', title: 'Backend Round', scheduledAt: '2026-10-23T12:00:00Z', interviewerEmail: 'alex@company.com', status: 'scheduled' },
  ];

  const merged = mergeUpcomingInterviews(apiInterviews, storedInterviews);
  assert.equal(merged.length, 2);
  assert.deepEqual(
    merged.map((entry) => entry.roomId),
    ['room-1', 'room-2']
  );
  assert.equal(merged[1].interviewerEmail, 'bea@company.com');
});

test('filters generic demo invite entries with no real interviewer metadata', () => {
  const apiInterviews = [
    { _id: 'real-1', roomId: 'room-real-1', title: 'Technical Round', scheduledAt: '2026-10-23T12:00:00Z', interviewerName: 'Alicia Stone', interviewerEmail: 'alicia@company.com', status: 'scheduled', questionCount: 6 },
  ];

  const storedInterviews = [
    { _id: 'demo-1', roomId: 'room-demo-1', title: 'Interview Invitation', scheduledAt: '2026-10-23T14:00:00Z', status: 'scheduled', candidateEmail: 'candidate@example.com', questionCount: 0 },
    { _id: 'real-2', roomId: 'room-real-2', title: 'System Design', scheduledAt: '2026-10-23T15:00:00Z', interviewerName: 'Brandon Lee', interviewerEmail: 'brandon@company.com', status: 'scheduled', questionCount: 8 },
  ];

  const merged = mergeUpcomingInterviews(apiInterviews, storedInterviews);
  assert.deepEqual(
    merged.map((entry) => entry.roomId),
    ['room-real-1', 'room-real-2']
  );
  assert.ok(merged.every((entry) => entry.interviewerEmail || entry.interviewerName));
});

test('ignores cancelled items even when stale scheduled data is still present', () => {
  const apiInterviews = [
    { _id: 'active-1', roomId: 'room-active-1', title: 'Live round', scheduledAt: '2026-10-24T12:00:00Z', interviewerEmail: 'alex@company.com', status: 'scheduled' },
  ];

  const storedInterviews = [
    { _id: 'cancelled-1', roomId: 'room-cancelled-1', title: 'Cancelled round', scheduledAt: '2026-10-23T18:00:00Z', interviewerEmail: 'zoe@company.com', status: 'cancelled', cancelledAt: '2026-10-23T18:05:00Z' },
    { _id: 'active-1', roomId: 'room-active-1', title: 'Live round', scheduledAt: '2026-10-24T12:00:00Z', interviewerEmail: 'alex@company.com', status: 'scheduled' },
  ];

  const merged = mergeUpcomingInterviews(apiInterviews, storedInterviews);
  assert.deepEqual(
    merged.map((entry) => entry.roomId),
    ['room-active-1']
  );
});

test('debounces repeated refresh requests to avoid repeated API bursts', async () => {
  let refreshCount = 0;
  const debounced = debounceRefresh(() => {
    refreshCount += 1;
  }, 20);

  debounced();
  debounced();
  debounced();

  await new Promise((resolve) => setTimeout(resolve, 80));

  assert.equal(refreshCount, 1);
});
