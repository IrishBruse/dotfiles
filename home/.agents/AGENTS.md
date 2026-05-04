---
description: Global
globs: ["**/*"]
alwaysApply: true
---

# Personal Preferences

## Typescript

- Use `unknown` over `any` unless absolutely required. Less strict in unit tests about this
- Prefer type over interface: Use types for definitions unless declaration merging is specifically required.
- Explicit return types: Always define return types for exported functions to improve readability and catch errors early.

## Code

- Use early returns to reduce nesting and indentation
- Prioritize code readability over clever or "dry" abstractions
- Use existing utility functions where applicable

## Markdown

- When writting documents keep the language concise
- Instead of unicode symbols e.g. em dashes (`—`), dots `…`, quotes (`“`, `”`), emojis (`🚀`, `🛠️` `🧪` `👋`), arrows **prefer** `-` `"` `'` `_` `->` `<-` `...`
- Prefer normal english ascii symbols
- Prefer headings over tables when the table would only have 2 columns

## Commands

- Dont run the dev server or any command that are probably already running as a watcher just assume it is, unless requested
- Always verify your work with check/linting commands e.g. `npm run lint`

## Responses

- Omit needless words: Remove filler phrases and keep sentences direct
- Pattern: `[thing] [action] [reason]. [next step].`
