---
name: jest
description: Write and structure Jest tests using React Testing Library, MSW, and colocated test files. Use when adding or modifying unit tests, component tests, hook tests, or integration tests.
---

# Jest Testing

Align Jest tests with project conventions: colocated `.test` files, React Testing Library, Mock Service Worker (MSW) for network mocking, and shared setup and utilities.

## Agent Workflow

- **Baseline Check:** Before writing or modifying any code, run the existing test suite (`npm run test`) for the target module to understand the current state and establish a baseline.
- **Iterative Execution:** After adding or modifying tests or source code, immediately run the relevant tests.
- **Continuous Resolution:** If tests fail, you must analyze the console output, implement a fix, and re-run the tests. Do not stop, ask for human intervention (unless completely blocked by a missing dependency), or mark the task as complete until the tests pass successfully.

## File naming and location

- Use **`.test.ts`** or **`.test.tsx`** (not `.spec.*`).
- Colocate test files next to the module under test (e.g., `pathUtils.ts` → `pathUtils.test.ts`, `FieldRenderer.tsx` → `FieldRenderer.test.tsx`).

## Test structure

- Use **`describe()`** for the suite (function name, component name, or feature).
- Use **`it()`** or **`test()`** for each case; prefer **`it('should ...')`** for behaviour.
- Group related cases in nested `describe()` when it clarifies scope.

```ts
describe("convertToFieldPath", () => {
  it("should correctly move a single numeric index to the end of its segment", () => {
    expect(convertToFieldPath([0, "groupId", "fieldId"])).toEqual([
      "groupId",
      0,
      "fieldId",
    ]);
  });
});
```

## Formatting and styling

- Prefer ES modules (`import`/`export`) over CommonJS (`require`).
- Prefer **functional style** and **small, focused tests**; one behaviour per `it()`.
- Do not put any comments unless absolutely needed to explain the test.

## Unit tests (pure logic / utils)

- Import the function under test; no React rendering.
- Mock external modules at the **top level** with `jest.mock('modulePath', () => ({ ... }))`.
- Cast mocks to `jest.Mock` when you need to configure them: `const mockFn = someMock as jest.Mock`.
- Use **`beforeEach`** to reset or reconfigure mocks (`mockReset()`, `mockResolvedValue()`, etc.).
- Prefer **`expect(x).toEqual()`** or **`expect(x).toStrictEqual()`** for objects; **`expect(x).toBe()`** for primitives and identity.

## Component tests (React)

- Use **`render()`** from `@testing-library/react`.
- **Querying priority:** Query by accessible roles first (e.g., `screen.getByRole('button', { name: /submit/i })`, `screen.getByLabelText()`, `screen.getByText()`). Use `getByTestId` only as a last resort.
- Use **`@testing-library/jest-dom`** matchers: **`toBeInTheDocument()`**, **`toHaveTextContent()`**, **`toBeVisible()`**.

## Hook tests

- Use **`renderHook()`** from `@testing-library/react`.
- **`jest.mock()`** the hook’s dependencies (e.g. `useAppContext`); get the mock with `const mockUseX = useX as jest.Mock`.
- In **`beforeEach`**, call **`jest.clearAllMocks()`** and set **`mockUseX.mockReturnValue({ ... })`** for the scenario.
- Assert on **`result.current`** after `renderHook(() => useMyHook())`.

## Integration tests & UI Events

- Use **`@testing-library/user-event`** (`userEvent.setup()`) instead of `fireEvent` to simulate realistic user interactions (typing, clicking).
- **Avoid manual `act()` wrapping** for user events or renders, as React Testing Library handles this automatically. Only use `act()` for testing custom hooks or out-of-band state updates.
- Use **`async`/`await**` with **`waitFor`** or **`findBy\*`\*\* queries to assert on asynchronous UI updates and side effects.

## Network Mocking (MSW)

- Intercept network requests using MSW instead of mocking `fetch` or `axios` directly.
- Use `server.use(http.get('/api/path', () => HttpResponse.json({...})))` inside tests to override default handlers for specific scenarios.
- Always ensure `server.resetHandlers()` is called in an `afterEach` block to prevent test contamination.

## Conventions

- Do **not** add new global mocks in the global setup unless the whole suite needs them; prefer **`jest.mock()`** in the test file or **`mockImplementationOnce`** in a single test.
