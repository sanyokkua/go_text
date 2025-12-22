# Agent Rules: TypeScript, ReactJS & HTML/CSS Best Practices

## TypeScript Core Rules
1. Enable strict typing with `strict: true` in tsconfig.json including `noImplicitAny`, `strictNullChecks`, `exactOptionalPropertyTypes`, and `noEmitOnError` flags.
2. Never use `any`; use `unknown` instead when type is uncertain, especially in error handling: `catch (error: unknown) {}`.
3. Prefer interfaces over type aliases for object shapes when possible, and define types externally rather than inline.
4. Use `readonly` modifiers for immutable properties and arrays to enforce immutability.
5. Apply proper generics with constraints and leverage TypeScript utility types (`Partial`, `Required`, `Pick`, `Omit`, `Record`).

## ReactJS Component Rules
6. Components must be properly typed using `React.FC<Props>` pattern with explicit props interfaces.
7. Every component must have a `displayName` property for better debugging and profiling.
8. Keep components small, focused, and predictable - they should do one thing well.
9. Use discriminated unions with exhaustiveness checking for complex conditional rendering logic.
10. Implement proper error boundaries and avoid using `// @ts-ignore` without explanatory comments.

## HTML & CSS Rules
11. Write semantic HTML with proper element selection (`<article>`, `<section>`, `<nav>` instead of generic `<div>`).
12. CSS must follow BEM (Block Element Modifier) methodology or similar consistent naming convention for maintainability.
13. Avoid inline styles; use CSS modules or scoped stylesheets with descriptive class names.
14. Implement responsive design using CSS custom properties (variables) for consistent theming and spacing.
15. Never use `!important` except in extremely rare, documented cases; refactor specificity issues instead.

## Code Quality & Architecture
16. Apply Kent Beck's four rules of Simple Design: run all tests, eliminate duplication, express programmer intent, minimize classes/methods.
17. Functions must do one thing at one level of abstraction; limit arguments to 3 or fewer where possible.
18. Prefer polymorphism over complex conditional logic; extract try/catch blocks into separate functions to reduce noise.
19. Organize imports in strict order: built-in → external → internal → parent → sibling → index, with alphabetical sorting within groups.
20. Use nullish coalescing (`??`) and optional chaining (`?.`) operators appropriately; prefix unused variables with underscore.

## Documentation & Maintenance
21. Comments must explain why, not what - code should be self-documenting through clear naming and structure.
22. Delete commented-out code immediately; use version control for historical reference.
23. Apply consistent formatting using Prettier with ESLint integration; enforce rules via pre-commit hooks.
24. Create comprehensive unit tests for all business logic with 80%+ coverage; test components in isolation.
25. Refactor continuously - never allow code rot to begin; apply YAGNI principle and avoid premature optimization.

## Redux & State Management
26. Use Redux Toolkit (RTK) with typed slices; leverage `createAsyncThunk` with proper error typing.
27. Implement selector patterns with memoization; avoid direct state access outside of selectors.
28. Keep action creators focused on single responsibilities; use payload factories for complex data structures.