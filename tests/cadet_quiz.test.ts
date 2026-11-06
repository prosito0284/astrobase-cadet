import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildQuiz, CARD_QUIZ, STORM_QUIZ } from '../src/cadet/quiz.ts';
import { DECISION_CARDS } from '../src/cadet/data.ts';
import { choose, createGame } from '../src/cadet/engine.ts';
import type { CadetState } from '../src/cadet/engine.ts';

const finish = (s: CadetState, upTo = 99) => {
  while (s.status === 'playing' && s.history.length < upTo) s = choose(s, 0);
  return s;
};

describe('Cadet end-of-mission quiz', () => {
  it('every decision card has exactly one quiz question, and no orphan questions', () => {
    for (const c of DECISION_CARDS) assert.ok(CARD_QUIZ[c.id], `${c.id} has no question`);
    for (const id of Object.keys(CARD_QUIZ)) assert.ok(DECISION_CARDS.some(c => c.id === id), `${id} is not a card`);
  });

  it('every question has 3 distinct options in both languages', () => {
    for (const item of [...Object.values(CARD_QUIZ), ...STORM_QUIZ]) {
      for (const lang of ['es', 'en'] as const) {
        const opts = [item.correct, ...item.wrong].map(o => o[lang].trim());
        assert.equal(new Set(opts).size, 3, item.q.es);
        assert.ok(item.q[lang].endsWith('?'), item.q[lang]);
      }
    }
  });

  it('asks only about cards played in this game, at most 3, with the right answer index', () => {
    for (const site of ['moon', 'mars'] as const) {
      for (let seed = 1; seed <= 30; seed++) {
        const s = finish(createGame(site, seed));
        const quiz = buildQuiz(s);
        assert.ok(quiz.length >= 1 && quiz.length <= 3);
        const played = new Set(s.deck.slice(0, s.history.length).flatMap(e => (e.kind === 'card' ? [e.cardId] : [])));
        for (const q of quiz) {
          if (q.cardId) {
            assert.ok(played.has(q.cardId));
            assert.equal(q.options[q.answer], CARD_QUIZ[q.cardId].correct);
          } else {
            assert.ok(STORM_QUIZ.some(x => x.correct === q.options[q.answer]));
          }
          assert.equal(q.options.length, 3);
        }
      }
    }
  });

  it('a game lost on day 1 (only a storm) still gets a storm question', () => {
    const s = finish(createGame('moon', 4), 1);
    const quiz = buildQuiz(s);
    assert.equal(quiz.length, 1);
    assert.equal(quiz[0].cardId, undefined);
  });

  it('is deterministic per game and the correct answer is not always in the same place', () => {
    const s = finish(createGame('mars', 8));
    assert.deepEqual(buildQuiz(s), buildQuiz(s));
    const positions = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) for (const q of buildQuiz(finish(createGame('moon', seed)))) positions.add(q.answer);
    assert.deepEqual([...positions].sort(), [0, 1, 2]);
  });
});
