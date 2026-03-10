---
name: jest
description: Write and structure Jest tests using React Testing Library, MSW, and colocated test files. Use when adding or modifying unit tests, component tests, hook tests, or integration tests.
---

# Jest Testing

Align Jest tests with project conventions: colocated `.test` files, React Testing Library, and shared setup and utilities.

## File naming and location

- Use **`.test.ts`** or **`.test.tsx`** (not `.spec.*`).
- Colocate test files next to the module under test (e.g. `pathUtils.ts` → `pathUtils.test.ts`, `FieldRenderer.tsx` → `FieldRenderer.test.tsx`).

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

## Unit tests (pure logic / utils)

- Import the function under test; no React rendering.
- Mock external modules at the **top level** with `jest.mock('modulePath', () => ({ ... }))`.
- Cast mocks to `jest.Mock` when you need to configure them: `const mockFn = someMock as jest.Mock`.
- Use **`beforeEach`** to reset or reconfigure mocks (`mockReset()`, `mockResolvedValue()`, etc.).
- Prefer **`expect(x).toEqual()`** or **`expect(x).toStrictEqual()`** for objects; **`expect(x).toBe()`** for primitives and identity.
- Prefer `import` over `require`

## Component tests (React)

- Use **`render()`** from `@testing-library/react`.
- Query by **`data-testid`** first: `getByTestId`, `findByTestId`, `screen.findByTestId`. Add `data-testid` on elements that tests need to find.
- Use **`@testing-library/jest-dom`** matchers: **`toBeInTheDocument()`**, **`toHaveTextContent()`**, **`toHaveDisplayValue()`**.
- Mock context providers and heavy dependencies at the top of the file with **`jest.mock('.../Context', () => ({ useXContext: () => ({ ... }) }))`**. Use a **variable** (e.g. `let mockContext`) that you reassign in individual tests to vary context per case.
- When the component needs the full app stack (plugins, API), use project helpers such as **`actRender`**, **`mockPlugins`**, **`mockLoadRemotes`**, and **`EventListener` / `DispatchEvent`** from the project’s test utilities and mock components (see reference).

## Hook tests

- Use **`renderHook()`** from `@testing-library/react`.
- **`jest.mock()`** the hook’s dependencies (e.g. `useAppContext`, `useRegistryContext`); get the mock with `const mockUseX = useX as jest.Mock`.
- In **`beforeEach`**, call **`jest.clearAllMocks()`** and set **`mockUseX.mockReturnValue({ ... })`** for the scenario.
- Assert on **`result.current`** after `renderHook(() => useMyHook())`.

## Integration tests (UI + context + events)

- Use **`actRender(ui)`** from the project’s test utilities instead of raw `render()` when the tree triggers async state updates.
- Use the project’s **mock plugins / load remotes** helpers and mock components to avoid real plugin or API loading.
- Attach listeners with **`EventListener(eventTarget, eventType, handler)`** and drive the UI with **`DispatchEvent(eventTarget, eventType, payload)`** when the project provides these helpers.
- Use **`await waitFor(() => expect(...))`** for assertions that depend on async updates; use **`screen.findByTestId()`** for elements that appear asynchronously.
- Wrap user-driven updates in **`act(() => { fireEvent.change(el, { target: { value: 'x' } }) })`** when needed for React state.

## Mocks and test utilities

- **Main app**: Use the project’s `setupTests` (e.g. MSW server, i18n mocks, `jest-fail-on-console`). Use **`server`**, **`mockGET`**, **`mockPUT`**, **`mockPOST`** from the project’s test utilities for API; use the project’s mock components (e.g. mock field/layout components) where they exist.
- **Plugin/add-on packages**: Use the project’s `setupTests` (e.g. i18n mocks, MSW passthrough). Use shared **mocked event handlers** from `src/tests/utils` (or equivalent) for component props (`handleChange`, `handleBlur`, `handleFocus`, etc.).
- **Node/service packages**: Use `jest.config` and a setup file; test environment is Node; no DOM.

## Assertions

- **DOM**: `toBeInTheDocument()`, `toHaveTextContent()`, `toHaveDisplayValue()` (jest-dom).
- **Calls**: `toHaveBeenCalledWith(expect.objectContaining({ ... }))`, `toHaveBeenCalledTimes(n)`.
- **Async**: `await waitFor(() => expect(fn).toHaveBeenCalledWith(...))`.
- **Errors**: If a test intentionally triggers console output, avoid failing the run with **`jest.spyOn(console, 'warn').mockImplementationOnce(() => {})`** (or similar) in that test only.

## Conventions

- Prefer **functional style** and **small, focused tests**; one behaviour per `it()`.
- Use **`async`/`await`** for async tests; use **`waitFor`** for assertions on side effects.
- Do **not** add new global mocks in setup unless the whole suite needs them; prefer **`jest.mock()`** in the test file or **`mockImplementationOnce`** in a single test.
- For components that accept `handleChange`/`handleBlur`/`handleFocus`, use the project’s **mocked event handlers** (or equivalent) so events are covered.

## Reference

For file paths and pattern lookup, see [reference.md](reference.md).
