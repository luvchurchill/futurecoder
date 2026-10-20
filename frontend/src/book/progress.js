// The first unfinished page is the furthest page a student may open.
export function unlockedPageIndex(pages, slugs, progress) {
  const unfinished = slugs.findIndex(slug => {
    const steps = pages[slug].steps;
    return progress[slug]?.step_name !== steps[steps.length - 1].name ||
      (steps.length === 1 && !progress[slug]?.visited);
  });
  return unfinished < 0 ? slugs.length - 1 : unfinished;
}

export function canOpenPage(slug, pages, slugs, progress) {
  const index = slugs.indexOf(slug);
  return index >= 0 && index <= unlockedPageIndex(pages, slugs, progress);
}
