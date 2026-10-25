import test from 'node:test';
import assert from 'node:assert/strict';

import { getCanonicalSolvedCount } from './dashboardStats.js';

test('does not inflate solved count when a stale local progress value exceeds the server count', () => {
  const count = getCanonicalSolvedCount({
    user: { stats: { problemsSolved: 1 } },
    solvedHistory: [{ problemTitle: 'Two Sum', date: '2024-01-01' }],
    localSolvedProgress: 2,
  });

  assert.equal(count, 1);
});

test('uses the server-count as the source of truth when it is present and valid', () => {
  const count = getCanonicalSolvedCount({
    user: { stats: { problemsSolved: 3 } },
    solvedHistory: [{ problemTitle: 'Two Sum', date: '2024-01-01' }],
    localSolvedProgress: 1,
  });

  assert.equal(count, 3);
});

test('deduplicates repeated accepted attempts for the same problem when local history does not include a problemId', () => {
  const count = getCanonicalSolvedCount({
    user: { stats: { problemsSolved: 1 } },
    solvedHistory: [
      { problemTitle: 'Two Sum', date: '2024-01-01', solvedAt: '2024-01-01T09:00:00.000Z' },
      { problemTitle: 'Two Sum', date: '2024-01-02', solvedAt: '2024-01-02T09:00:00.000Z' },
      { problemTitle: 'Two Sum', date: '2024-01-03', solvedAt: '2024-01-03T09:00:00.000Z' },
    ],
    localSolvedProgress: 3,
  });

  assert.equal(count, 1);
});

test('deduplicates same-problem entries even when one version stores the id and another stores only the title', () => {
  const count = getCanonicalSolvedCount({
    user: { stats: { problemsSolved: 1 } },
    solvedHistory: [
      { problemId: 'p-42', problemTitle: 'Two Sum', date: '2024-01-01', solvedAt: '2024-01-01T09:00:00.000Z' },
      { title: 'Two Sum', date: '2024-01-02', solvedAt: '2024-01-02T09:00:00.000Z' },
    ],
    localSolvedProgress: 2,
  });

  assert.equal(count, 1);
});
