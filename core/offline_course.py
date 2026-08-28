"""Adapt the English course so every required activity works without a network.

The normal website continues to use Python Tutor.  Desktop builds call
``apply_offline_course_adaptations`` after loading the chapters but before the
step classes are cleaned, translated, tested, and packed for Pyodide.
"""

from core import translation as t
from core.text import pages


def _replace_step_text(page_slug, step_name, old, new):
    step = getattr(pages[page_slug], step_name)
    step.text = (step.text or step.__doc__).replace(old, new)


def apply_offline_course_adaptations():
    python_tutor_page = pages["UnderstandingProgramsWithPythonTutor"]
    first_step = python_tutor_page.run_with_python_tutor
    first_step.text = """
It's time to practise using `snoop` to follow a program one line at a time.
Copy the code below into the editor and click the `snoop` button.
In the output, follow how `number` changes and watch values get appended to
`small_numbers` and `big_numbers`.

    __copyable__
    __program_indented__
    """
    first_step.expected_code_source = "snoop"
    python_tutor_page.final_text = """
The `snoop` log records the executed lines and changing values locally on this
computer. You can run it again and compare the log with the program whenever
you want to understand how a loop reached its result.
    """

    equals_page = pages["EqualsVsIs"]
    equals_page.final_text = equals_page.final_text.replace(
        "I recommend running both versions with Python Tutor to see how it visualises the difference.\n"
        "In the second case, the two variables both have arrows pointing to a single list object.\n\n",
        "In the second version, picture the two variable names as labels pointing to the same list object.\n"
        "That is why a change made through either name is visible through the other.\n\n",
    )

    modifying_step = pages["ModifyingWhileIterating"].run_broken_with_python_tutor
    modifying_step.text = """
Consider this program. It loops through a list of numbers and removes the ones smaller than 10. Or at least, it tries to.
Run it with `snoop` and follow the values of `i`, `number`, and `numbers` on each executed line.

    __copyable__
    __program_indented__

(remember that `numbers.pop(i)` removes the element from `numbers` at index `i`)
    """
    modifying_step.expected_code_source = "snoop"

    birdseye_intro = pages["IntroducingBirdseye"].first_birdseye_example
    birdseye_intro.text = (birdseye_intro.text or birdseye_intro.__doc__).replace(
        "You've seen `snoop` and Python Tutor. futurecoder comes with one last tool to analyse programs as they run, called `birdseye`.",
        "You've seen `snoop`. futurecoder also comes with a tool called `birdseye` to analyse expressions as programs run.",
    )

    nested_loop_step = pages["LoopingOverNestedLists"].nested_list_loop_python_tutor
    nested_loop_step.text = """
Now run the same program again with `birdseye`.

Open the call shown by `birdseye` and examine what `numbers` looks like and what
`numbers[0]` up to `numbers[3]` are. Look at how the `sublist` and `num`
variables advance.
    """
    nested_loop_step.expected_code_source = "birdseye"

    calls_page = pages["CallingFunctionsWithinFunctions"]
    calls_page.step_names.remove("see_stack_in_pythontutor")
    calls_birdseye = calls_page.see_stack_in_birdseye
    calls_birdseye.text = """
Each time a function is called, a new *frame* is created, which contains the local variable values
in that call and other information about what's currently happening.
When the function call completes, the frame is deleted.

The indentation and call/return lines in the `snoop` output show when these
frames are entered and left. Now run the program with `birdseye` to explore
the same nested calls visually.
    """

    _replace_step_text(
        "MoreOnReturn",
        "return_ends_whole_function",
        "If you inspect the code with `snoop` or Python tutor you can see that the function returns 2 in the first",
        "If you inspect the code with `snoop` you can see that the function returns 2 in the first",
    )

    _replace_step_text(
        "NestedListAssignment",
        "nested_assignment_two_lines",
        "There's no copying. Python Tutor is good at showing this with arrows.",
        "There's no copying: picture both variable names as labels pointing to the same list.",
    )
    _replace_step_text(
        "MakingTheBoard",
        "fix_make_board",
        " - Try running the code with Python Tutor.",
        " - Run the code with `birdseye` and inspect which inner list each expression produces.",
    )

    or_exercise = pages["IntroducingOr"].AnExercise
    or_exercise.text = (or_exercise.text or or_exercise.__doc__).replace(
        "Perhaps you feel like this:\n\n"
        "[![I now have additional questions](https://i.imgur.com/jN57tGt.png)](https://imgur.com/a/icKzI)",
        "It is completely normal if this result raises more questions at first.",
    )

    t.Terms.q_wiz_final_message = t.Terms.q_wiz_final_message.replace(
        "the `snoop`, `birdseye`, and Python Tutor debuggers",
        "the `snoop` and `birdseye` debuggers",
    )
