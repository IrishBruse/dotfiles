# PR API evidence

Use API evidence only when the diff changes API behavior.

Run real `curl` calls, or equivalent HTTP requests, against the changed endpoints.
Capture request and response output from this session.

Prefer live request/response captures over CI logs, test output, lint or build commands,
or other local check output.

## What each block shows

Show the full request a reviewer could re-run: method, path, headers that matter, and the request body.
Show the response the server returned: status code and body.

Cover the success case and at least one failure case for each changed endpoint,
for example a missing resource, invalid payload, or unauthorized call.
Note relevant behavior the calls prove, such as methods that are not registered on the route
or fields the API ignores.

Redact tokens, cookies, and personal data with an obvious placeholder such as `$TOKEN`.
Use a local or non-production host where possible, and say which environment the calls ran against
when it is not obvious.

## Body placement

Add API examples directly under the `##` section for the changed API surface, immediately after the heading.
Use the API surface name as the heading.

Use one `<details><summary>curl ...</summary>` block per request.
Name the case in the summary, for example the method, path, and short case name.
Inside the block, put the request in a fenced `bash` code block and the response,
with its status code, in a fenced code block below it.

Shape of one block:

````markdown
<details><summary>curl METHOD /path (case name)</summary>

Request:

```bash
curl -sS -X METHOD http://host/path \
  -H 'Content-Type: application/json' \
  -d '{"field":"value"}'
```

Response `200`:

```json
{"field":"value"}
```

</details>
````

Follow the request/response examples with a paragraph and 1-3 bullets explaining the behavior.
Keep `Contract changes` text-only and brief.

## Done when

Every API block sits under the section for the changed API surface.
Every block shows the request method, path, body when one is sent, and the response status and body.
Every block maps to a curl, or equivalent HTTP request, run and captured in this session.
Each changed endpoint has a success case and, where one exists, a failure case.
No block leaks a real token, cookie, or personal data.
Skip API evidence only when the diff does not change API behavior.
