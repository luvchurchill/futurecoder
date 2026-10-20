import {canOpenPage, unlockedPageIndex} from "./progress";
import {readProgressSnapshot, saveProgressSnapshot} from "./progressStorage";

const slugs = ["one", "reading", "two", "three"];
const pages = Object.fromEntries(slugs.map(slug => [slug, {
  steps: slug === "reading" ? [{name: "final_text"}] : [{name: "exercise"}, {name: "final_text"}],
}]));

test("only completed prerequisites unlock lessons, including reading pages", () => {
  const progress = {reading: {step_name: "final_text"}};
  expect(canOpenPage("one", pages, slugs, progress)).toBe(true);
  expect(canOpenPage("reading", pages, slugs, progress)).toBe(false);
  progress.one = {step_name: "final_text"};
  expect(canOpenPage("reading", pages, slugs, progress)).toBe(true);
  expect(canOpenPage("two", pages, slugs, progress)).toBe(false);
  progress.reading.visited = true;
  expect(canOpenPage("two", pages, slugs, progress)).toBe(true);
  expect(canOpenPage("three", pages, slugs, progress)).toBe(false);
  expect(canOpenPage("missing", pages, slugs, progress)).toBe(false);
  expect(canOpenPage("one", pages, slugs, progress)).toBe(true);
  progress.two = progress.three = {step_name: "final_text"};
  expect(unlockedPageIndex(pages, slugs, progress)).toBe(3);
});

test("progress, page and editor are available immediately and survive a new read", () => {
  const saved = {uid: "offline", pageSlug: "two", pagesProgress: {one: {step_name: "final_text"}}, editorContent: "print(42)"};
  saveProgressSnapshot(saved);
  expect(readProgressSnapshot()).toEqual(saved);
  localStorage.setItem("futurecoder-offline-progress", "invalid json");
  expect(readProgressSnapshot()).toBe(null);
});


test("old out-of-order progress cannot unlock an unfinished prerequisite", () => {
  const progress = {three: {step_name: "final_text"}};
  expect(canOpenPage("three", pages, slugs, progress)).toBe(false);
  expect(unlockedPageIndex(pages, slugs, progress)).toBe(0);
});

test("unavailable synchronous storage leaves the IndexedDB fallback usable", () => {
  saveProgressSnapshot({uid: "offline", pagesProgress: {}});
  const write = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  expect(() => saveProgressSnapshot({uid: "offline"})).not.toThrow();
  write.mockRestore();
  expect(readProgressSnapshot()).toBe(null);
  const read = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("denied"); });
  expect(readProgressSnapshot()).toBe(null);
  read.mockRestore();
});
