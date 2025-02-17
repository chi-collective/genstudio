import re
import os
import logging
from glob import glob

REPLACEMENTS = {
    r"76\.\d+": "55",
    # Add more old->new replacements as needed
}

CSS_PATTERN = (
    rf"(@media\s+.*?)((?:min|max)-width:\s*({'|'.join(REPLACEMENTS.keys())})em)"
)
CSS_FILE_PATTERN = "main.*.min.css"


def test_css_pattern():
    # Test that the pattern matches expected CSS media queries
    test_css = "@media screen and (min-width: 76.25em) { ... }"
    match = re.search(CSS_PATTERN, test_css)
    if match:
        print("Test 1 passed: Pattern matched as expected")
        print(f"Group 1: {match.group(1)}")
        print(f"Group 2: {match.group(2)}")
        print(f"Group 3: {match.group(3)}")
    else:
        print("Test 1 failed: Pattern did not match as expected")

    # Test that the pattern doesn't match unrelated CSS
    test_css_no_match = "@media screen and (min-width: 60em) { ... }"
    match_no_match = re.search(CSS_PATTERN, test_css_no_match)
    if match_no_match is None:
        print("Test 2 passed: Pattern correctly did not match unrelated CSS")
    else:
        print("Test 2 failed: Pattern incorrectly matched unrelated CSS")


# You can call this function at the REPL to run the tests
# test_css_pattern()

log = logging.getLogger("mkdocs")


def modify_css(css_content):
    def replace_width(match):
        full_match = match.group(0)
        width_value = match.group(3)
        for old, new in REPLACEMENTS.items():
            if re.match(old, width_value):
                return full_match.replace(width_value, new)
        return full_match

    modified_content = re.sub(CSS_PATTERN, replace_width, css_content)
    match_count = len(re.findall(CSS_PATTERN, css_content))
    return modified_content, match_count


def on_post_build(config):
    css_dir = os.path.join(config["site_dir"], "assets", "stylesheets")
    css_files = glob(os.path.join(css_dir, CSS_FILE_PATTERN))

    if not css_files:
        log.warning("No matching CSS file found")
        return

    css_file = css_files[0]
    with open(css_file, "r") as f:
        content = f.read()

    modified_content, match_count = modify_css(content)

    with open(css_file, "w") as f:
        f.write(modified_content)

    log.info(f"Modified CSS file: {css_file}")
    log.info(f"Number of matches found and modified: {match_count}")
