const fs = require('node:fs');
const path = require('node:path');

async function runChecks(window, courseUrl) {
  await window.loadURL(courseUrl);
  const coursePython = fs.readFileSync(path.join(__dirname, 'smoke-course.py'), 'utf8');
  const result = await window.webContents.executeJavaScript(`(async () => {
    const waitFor = async (predicate, timeoutMs = 120000) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (predicate()) return;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error('Timed out; state=' + JSON.stringify({running: state()?.running, processing: state()?.processing, error: state()?.error}) + '; terminal=' + terminal());
    };
    const terminal = () => document.querySelector('[name="react-console-emulator__content"]')?.textContent || '';
    const state = () => window.reduxStore?.getState().book;
    const input = () => document.querySelector('input[name="react-console-emulator__input"]');
    const submit = code => {
      input().value = code;
      input().dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    };
    const run = async (code, expected, timeout) => {
      await waitFor(() => input() && !input().disabled && !state()?.running);
      submit(code);
      await waitFor(() => !state()?.running && terminal().includes(expected), timeout);
      if (state().error) throw new Error(JSON.stringify(state().error));
    };
    if (!crossOriginIsolated || !('serviceWorker' in navigator)) throw new Error('Missing browser isolation');
    await run('print(123 * 456)', '56088');
    await run('print(sum(x*x for x in range(100)))', '328350');
    await run('import time; time.sleep(0.1); print("SLEEP_" + "OK")', 'SLEEP_OK');
    await run('1 / 0', 'ZeroDivisionError');
    await run('print("RECOVERY_" + "OK")', 'RECOVERY_OK');
    submit('print("INPUT_" + input())');
    await waitFor(() => state()?.running && !state()?.processing && !input()?.disabled);
    submit('roundtrip');
    await waitFor(() => !state()?.running && terminal().includes('INPUT_roundtrip'));
    await run('exec(' + ${JSON.stringify(JSON.stringify(coursePython))} + ', {})', 'COURSE_VALIDATED', 420000);
    const match = terminal().match(/COURSE_VALIDATED\\s+(\\d+)/);
    if (!match) throw new Error('Missing course test count');
    window.reduxStore.dispatch({type: 'book_SET_STATE', path: 'editorContent', value: '# desktop persistence check'});
    localStorage.setItem('futurecoder-offline-smoke', 'preserved');
    await new Promise(resolve => setTimeout(resolve, 1000));
    let blocked = false;
    try { await fetch('https://example.com/futurecoder-network-test'); } catch { blocked = true; }
    if (!blocked) throw new Error('External network request was allowed');
    return {courseCases: Number(match[1]), pageSlug: state().user.pageSlug, progress: JSON.stringify(state().user.pagesProgress), checks: ['arithmetic', 'comprehension', 'sleep', 'traceback', 'recovery', 'input', 'course-exercises', 'snoop', 'birdseye', 'network-block']};
  })()`);
  await window.loadURL(courseUrl);
  await window.webContents.executeJavaScript(`(async () => {
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      const state = window.reduxStore?.getState().book;
      if (state?.editorContent === '# desktop persistence check' &&
          state.user.pageSlug === ${JSON.stringify(result.pageSlug)} &&
          JSON.stringify(state.user.pagesProgress) === ${JSON.stringify(result.progress)} &&
          localStorage.getItem('futurecoder-offline-smoke') === 'preserved') return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Progress/editor persistence failed after reload');
  })()`);
  result.checks.push('reload-persistence');
  delete result.progress;
  delete result.pageSlug;
  return result;
}
module.exports = {runChecks};
