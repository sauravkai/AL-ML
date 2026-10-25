import test from 'node:test';
import assert from 'node:assert/strict';
import { filterQuestionsByDifficulty } from './questionBank.js';

const bank = [
  { question: 'easy one', difficulty: 'easy' },
  { question: 'medium one', difficulty: 'medium' },
  { question: 'hard one', difficulty: 'hard' },
];

test('Junior level only includes easy questions', () => {
  assert.deepEqual(
    filterQuestionsByDifficulty(bank, 'Junior').map((q) => q.question),
    ['easy one']
  );
});

test('Senior Architect includes medium and hard questions', () => {
  const questions = filterQuestionsByDifficulty(bank, 'Senior Architect').map((q) => q.question);
  assert.deepEqual(questions, ['medium one', 'hard one']);
});

test('Staff Principal focuses on hard questions only', () => {
  assert.deepEqual(
    filterQuestionsByDifficulty(bank, 'Staff Principal').map((q) => q.question),
    ['hard one']
  );
});
