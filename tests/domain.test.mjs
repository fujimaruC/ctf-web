import test from "node:test";
import assert from "node:assert/strict";
import {
  challengeInput,
  comparePlayers,
  flagMatches,
  safeUrl,
  username,
} from "../functions/lib/domain.js";

test("flag normalization preserves case-sensitive and legacy insensitive behavior", () => {
  assert.ok(flagMatches("  FLAG{one}  ", "FLAG{one}"));
  assert.equal(flagMatches("flag{one}", "FLAG{one}"), false);
  assert.ok(flagMatches("flag{ONE}", "FLAG{one}", true));
  assert.equal(flagMatches("FLAG{two}", "FLAG{one}", true), false);
});
test("boundary validation rejects unsafe URLs, invalid names, and fabricated scores", () => {
  assert.equal(username("  Learner_01 "), "learner_01");
  for (const value of ["ab", "<script>", "a/b", "a".repeat(21)])
    assert.throws(() => username(value));
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,x",
    "https://user:pass@example.com",
    "file:///etc/passwd",
  ])
    assert.throws(() => safeUrl(value));
  assert.equal(
    safeUrl("https://example.com/file.zip"),
    "https://example.com/file.zip",
  );
  const challenge = {
    title: "An exercise",
    description: "Read the material carefully.",
    category: "Web",
    difficulty: "Easy",
    points: 100,
    authorName: "Instructor",
    published: false,
    caseInsensitive: false,
    files: [],
    hints: [],
  };
  assert.equal(challengeInput(challenge).points, 100);
  for (const points of [-1, 0, 1.5, NaN, Infinity, "100", 10001])
    assert.throws(() => challengeInput({ ...challenge, points }));
  assert.throws(() => challengeInput({ ...challenge, category: "invented" }));
  assert.throws(() =>
    challengeInput({
      ...challenge,
      files: [{ name: "payload", url: "javascript:alert(1)" }],
    }),
  );
});
test("ranking uses every tie-breaker and a stable final UID", () => {
  const base = { points: 100, solves: 2, firstBloods: 1, displayName: "Alex" };
  const players = [
    { ...base, uid: "b" },
    { ...base, uid: "a" },
    { ...base, uid: "c", points: 101 },
    { ...base, uid: "d", solves: 3 },
    { ...base, uid: "e", firstBloods: 2 },
  ];
  assert.deepEqual(
    players.sort(comparePlayers).map((p) => p.uid),
    ["c", "d", "e", "a", "b"],
  );
});
