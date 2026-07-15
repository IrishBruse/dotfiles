# PR API evidence

Use API evidence only when the diff changes API behavior.

Run real `curl` calls, or equivalent HTTP requests, against the changed endpoints.
Capture request and response output from this session.

Do not put CI logs, test output, lint or build commands, dev-server logs, or other local check output in the PR body.

## Body placement

Add API examples directly under the `##` section for the changed API surface, immediately after the heading.
Use the API surface name as the heading, not `## API details`.
Do not create a separate verification section.

Use one `<details><summary>curl ...</summary>` block per request.
Put the captured response inside a fenced code block.
Follow the request/response examples with a paragraph and 1-3 bullets explaining the behavior.
Keep `Contract changes` text-only and brief.

Apply the updated body with `gh pr edit`.

## Done when

Every API block sits under the section for the changed API surface.
Every block maps to a curl, or equivalent HTTP request, run and captured in this session.
Skip API evidence only when the diff does not change API behavior.
