import { describe, expect, test } from "bun:test";
import { findWordBackward, findWordForward } from "../srcs/word-navigation.ts";
import {
  findWordBackward as piFindWordBackward,
  findWordForward as piFindWordForward,
  type WordNavigationOptions,
} from "@earendil-works/pi-tui/dist/word-navigation.js";

function compare(text: string, cursor: number, options?: WordNavigationOptions) {
  expect(findWordBackward(text, cursor, options)).toBe(piFindWordBackward(text, cursor, options));
  expect(findWordForward(text, cursor, options)).toBe(piFindWordForward(text, cursor, options));
}

const markerAtomic: WordNavigationOptions = {
  isAtomicSegment: (segment) => segment.startsWith("[paste #"),
};

const urlSegmenter = new Intl.Segmenter(undefined, { granularity: "word" });
const urlAtomic: WordNavigationOptions = {
  segment: (text) => urlSegmenter.segment(text),
  isAtomicSegment: (segment) => segment.startsWith("http"),
};

describe("word-navigation parity with pi-tui", () => {
  describe("fixed boundary cases", () => {
    const cases: Array<[string, number]> = [
      ["", 0],
      ["", 3],
      ["   ", 0],
      ["   ", 1],
      ["   ", 3],
      ["hello world", 0],
      ["hello world", 2],
      ["hello world", 5],
      ["hello world", 6],
      ["hello world", 11],
      ["hello world", 14],
      ["foo-bar", 1],
      ["foo-bar", 3],
      ["foo-bar", 4],
      ["(hello)", 2],
      ["(hello)", 5],
      ["a,b.c", 1],
      ["a,b.c", 2],
      ["don't stop", 6],
      ["你好世界", 0],
      ["你好世界", 2],
      ["你好世界", 6],
      ["hello世界", 3],
      ["hello世界", 7],
      ["a👋b", 0],
      ["a👋b", 2],
      ["a👋b", 3],
      ["👨‍👩‍👧‍👦 hi", 0],
      ["👨‍👩‍👧‍👦 hi", 4],
      ["x1y2 z3", 3],
      ["x1y2 z3", 5],
      ["a\tb c", 1],
      ["a\tb c", 3],
      ["\n\nhello", 2],
      ["hello\nworld", 5],
      ["hello\nworld", 6],
    ];
    for (const [text, cursor] of cases) {
      test(`"${text}" @ ${cursor}`, () => compare(text, cursor));
    }
  });

  test("paste-marker atomic option matches", () => {
    const text = "a [paste #1 5 chars] b";
    for (const cursor of [0, 1, 5, 10, 15, 20, 22]) {
      compare(text, cursor, markerAtomic);
    }
  });

  test("custom segment + atomic option matches", () => {
    const text = "visit http://example.com now";
    for (const cursor of [0, 5, 6, 11, 16, 25, 29]) {
      compare(text, cursor, urlAtomic);
    }
  });

  test("random fuzz matches (500 texts × 3 cursors × 3 option sets)", () => {
    let seed = 0x9e3779b9;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    const pick = <T,>(items: T[]): T => items[Math.floor(rand() * items.length)];

    const atoms = [
      "foo", "bar", "a", "hello", "world", "foo-bar", "x1y2", "don't", "(tag)", "a,b",
      " ", "  ", "\t", "\n",
      "你好", "世界", "测试",
      "👋", "😀", "🚀",
      "[paste #1 5 chars]", "[paste #2 +3 lines]",
      ".", ",", "!", "?", "(", ")", ":", ";", "'", "\"", "-", "_", "/", "\\",
      "*", "+", "=", "#", "@", "$", "%", "^", "&", "~", "`",
    ];

    for (let i = 0; i < 500; i++) {
      const length = 1 + Math.floor(rand() * 40);
      let text = "";
      while (text.length < length) text += pick(atoms);
      text = text.slice(0, length);
      for (let j = 0; j < 3; j++) {
        const cursor = Math.floor(rand() * (text.length + 3));
        compare(text, cursor);
        compare(text, cursor, markerAtomic);
        compare(text, cursor, urlAtomic);
      }
    }
  });
});
