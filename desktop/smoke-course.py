"""Exercise the bundled course inside the actual packaged WebAssembly runtime."""
import random
import core.utils
from core.checker import FullRunner, check_entry
from core.text import load_chapters, step_test_entries
from core.utils import make_test_input_callback

core.utils.TESTING = True
random.seed(0)
list(load_chapters())
runner = FullRunner(filename='/desktop_validation.py')
count = 0
sources = set()
for page, step, substep, entry in step_test_entries():
    input_callback = make_test_input_callback(step.stdin_input)

    def callback(event_type, data):
        if event_type == 'input':
            return input_callback(data)

    step.pre_run(runner)
    response = check_entry(entry, callback, runner)
    assert not response.get('error'), (page.__name__, step.__name__, response)
    assert response['passed'] == (substep == step), (page.__name__, step.__name__, response)
    sources.add(entry['source'])
    count += 1
assert count >= 100, count
assert 'snoop' in sources and 'birdseye' in sources, sources
print('COURSE_' + 'VALIDATED', count, sorted(sources))
