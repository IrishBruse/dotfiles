# Jest Testing — Reference

Use this file when you need to look up exact paths or patterns in the project.

## Main app (React + MSW)

| Purpose                                 | Path                                            |
| --------------------------------------- | ----------------------------------------------- |
| Setup (MSW, i18n, mocks, failOnConsole) | `src/setupTests.tsx`                            |
| API/plugin test helpers                 | `src/jestUtilities.ts`                          |
| Mock field/layout components            | `src/jestMockComponents.tsx`                    |
| Unit test example                       | `src/utils/pathUtils.test.ts`                   |
| Component test (context mocks)          | `src/components/.../FieldRenderer.test.tsx`     |
| Hook test                               | `src/hooks/.../useFormLoadAndValidate.test.tsx` |
| Integration (actRender, events)         | `src/tests/events.test.tsx`                     |
| Rule/transformer test (jest.mock deps)  | `src/.../createIsRequiredRule.test.ts`          |

## Plugin / add-on packages

| Purpose                       | Path                                  |
| ----------------------------- | ------------------------------------- |
| Setup                         | `src/setupTests.ts`                   |
| Mock event handlers for props | `src/tests/utils.ts`                  |
| Component test example        | `src/exposed/.../DFCheckbox.test.tsx` |

## Node / service packages

| Purpose     | Path             |
| ----------- | ---------------- |
| Jest config | `jest.config.ts` |
| Setup       | `jestSetup.ts`   |

## Common patterns

- **Test utilities (main app)**: `mockGET`, `mockPUT`, `mockPOST`, `mockPlugins`, `mockLoadRemotes`, `mockLoadRemote`, `actRender`, `EventListener`, `DispatchEvent`, `HardCodeStateControllerResponse`.
- **Mock components (main app)**: `MockTextInputField`, `MockLayoutComponent`, `MockFormFieldComponent`, `MockCaptureComponent`, `MockSelectField`, `MockRadioField`, etc.
- **Plugins test utils**: `mockedEventHandlers` = `{ handleChange, handleBlur, handleFocus, setFieldProperty, getFieldValue, logErrorToNR }` (all `jest.fn()`).
