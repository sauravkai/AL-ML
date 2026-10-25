export const DIFFICULTY_LEVEL_TO_TAGS = Object.freeze({
  Junior: ['easy'],
  Medium: ['easy', 'medium'],
  'Senior Architect': ['medium', 'hard'],
  'Staff Principal': ['hard'],
});

export function filterQuestionsByDifficulty(questions = [], selectedDifficulty = 'Medium') {
  const allowedTags = DIFFICULTY_LEVEL_TO_TAGS[selectedDifficulty] || DIFFICULTY_LEVEL_TO_TAGS.Medium;

  if (!Array.isArray(questions) || questions.length === 0) {
    return [];
  }

  const normalized = questions.filter((question) => {
    const difficulty = String(question?.difficulty || '').toLowerCase();
    return allowedTags.includes(difficulty);
  });

  return normalized.length > 0 ? normalized : questions;
}
