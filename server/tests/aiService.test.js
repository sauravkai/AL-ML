import test from 'node:test';
import assert from 'node:assert/strict';

import { generateAIQuestion } from '../src/services/aiService.js';

test('generateAIQuestion keeps SQL & DB questions in the SQL domain instead of falling back to Node.js', async () => {
  const result = await generateAIQuestion({ topic: 'SQL & DB', difficulty: 'Senior Architect', questionCount: 1 });

  assert.equal(typeof result.question, 'string');
  assert.match(result.question.toLowerCase(), /index|transaction|sql|database/);
  assert.doesNotMatch(result.question.toLowerCase(), /node\.js|event loop|stream|cluster/);
});

test('generateAIQuestion keeps Java questions in the Java domain', async () => {
  const result = await generateAIQuestion({ topic: 'Java', difficulty: 'Senior Architect', questionCount: 1 });

  assert.equal(typeof result.question, 'string');
  assert.match(result.question.toLowerCase(), /java|thread|volatile|concurrent|equals|hashmap/);
  assert.doesNotMatch(result.question.toLowerCase(), /node\.js|react|database|system design/);
});
