---
name: visual-match
description: Screenshot the app and compare against a target before replying. Use for design mocks, current vs target pairs, or visual layout defects.
---

# visual-match

The user pastes a screenshot and asks for a visual fix.
Guessing at the change and replying costs the user another round trip to look at the result.
This skill makes the agent render the change and check it, so the user sees a verified result.

Load the `browser` skill for `agent-browser` command detail.

## When this applies

Apply when the request names a visible property: padding, margin, alignment, size, color, border,
icon, font, or a mock to match.
Apply when the user sends a "current vs target" image pair.

Skip when the change has no rendered surface, such as build config or types.

## Two modes

Pick the mode before capturing, because the comparison method differs.

**Mock mode** - the target is a design image, a Figma export, or a screenshot of a different app.
Pixel diffing is meaningless here because size, content, and data all differ.
Compare by reading both images and listing named differences.

**Regression mode** - the target is an earlier screenshot of this same page and viewport.
Use `agent-browser diff screenshot` for a measured pixel delta.

## Loop

1. **Resolve the target.** Save the user's image to `/tmp/visual-match/target.png`.
   Ask for the URL and the exact route or interaction that reaches the state when it is not obvious.

2. **Pin the viewport.** A moving viewport makes every comparison unreliable.

   ```bash
   SESSION=visual-match
   agent-browser --session $SESSION open http://localhost:5173/your/route
   agent-browser --session $SESSION set viewport 1440 900 2
   agent-browser --session $SESSION wait --load networkidle
   ```

3. **Capture the current state**, scoped to the element under discussion so the difference is
   visible rather than lost in a full page.

   ```bash
   agent-browser --session $SESSION screenshot "[data-testid=prototype-card]" /tmp/visual-match/before.png
   ```

   Use `--full` only when the request concerns whole-page layout.

4. **Compare and name the gaps.** Read `target.png` and `before.png`.
   Write a short list of concrete differences, each with a direction and an estimated amount,
   for example "card padding is about 8px tighter than the target" or "the bin icon is missing".
   In regression mode get the measured delta first:

   ```bash
   agent-browser --session $SESSION diff screenshot \
     --baseline /tmp/visual-match/target.png \
     --output /tmp/visual-match/diff.png \
     --selector "[data-testid=prototype-card]"
   ```

5. **Fix the whole list in one edit pass.** Fixing one difference per iteration is the slow path
   the user already pays for by hand.

6. **Re-capture and re-compare.** Wait for the dev server to apply the change before capturing,
   otherwise the screenshot shows the old state.

   ```bash
   agent-browser --session $SESSION wait --load networkidle
   agent-browser --session $SESSION screenshot "[data-testid=prototype-card]" /tmp/visual-match/after-1.png
   ```

7. **Repeat from step 4** while differences remain and the budget allows.

8. **Close the session** with `agent-browser --session $SESSION close`.

## Iteration budget

Run at most 4 capture-and-fix cycles.
Stop earlier when a cycle produces no visible improvement, because that means the change is not
reaching the rendered element.

On stopping, reply with the remaining differences, the last screenshot path, and the reason the
loop ended. A partial result the user can see beats a claim the user has to check.

## Reporting

State what now matches and what does not, and give the path to the final screenshot.
Claim a match only from an image captured after the final edit.
Never describe a visual result that was not captured in this session.

## When the loop cannot run

Report the blocker and fall back to a single best-effort edit when:

- no dev server is reachable and the user cannot give a URL
- login or MFA blocks the route
- the element only appears after a state the browser cannot reach

Say which of these happened, so the user knows the change is unverified.

## Common failure causes

- **Screenshot looks unchanged.** The dev server had not rebuilt. Wait for network idle, or reload
  the page, then capture again.
- **Element not found.** The selector went stale after a re-render. Take `snapshot -i` again and
  reselect.
- **Diff is entirely red in regression mode.** Viewport or device scale changed between captures.
  Re-pin the viewport and rebuild the baseline.
- **Colors differ everywhere.** The app is in a different theme than the target. Match the theme
  with `set media dark` or `set media light` before comparing.
