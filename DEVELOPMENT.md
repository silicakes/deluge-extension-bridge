# Development Guide

## Prerequisites

- **Node.js** >= 21.1.0 (the project is regularly tested with the latest LTS release).
- **Yarn** >= 4.5.0 – the repo uses the lock-file generated by Yarn.

You can install Yarn globally with:

```bash
corepack enable
yarn set version stable
```

> **Why Yarn?** Vite's blazing-fast dev server combined with Yarn's parallel installation makes the feedback loop as short as possible. Using the same package-manager across the team also guarantees reproducible installs thanks to `yarn.lock`.

---

## Getting the code

```bash
git clone https://github.com/silicakes/deluge-extensions.git # or your fork
cd deluge-extensions
```

---

## Installing dependencies

```bash
yarn install
```

All required packages (production & dev) will be pulled as defined in `package.json`.

---

## Running a development server

```bash
yarn dev
```

This command starts the Vite dev-server with hot-module-replacement (HMR). By default you can open

```
http://localhost:5173
```

in your browser. Any file save will trigger an instant refresh.

If port 5173 is taken Vite will pick the next free port and print it to the console.

---

## Static type-checking

```bash
yarn typecheck
```

Runs the TypeScript compiler in **no-emit** mode to make sure the codebase type-checks.

---

## Running the test-suite

```bash
yarn test          # one-off
# or
yarn test:watch    # watch-mode with Vitest
```

The project uses [Vitest](https://vitest.dev/) which has first-class Vite integration and extremely fast cold-starts.

See `cypress.config.js` for E2E testing setup using Cypress.

---

## Building a production bundle

```bash
yarn build
```

1. First the TypeScript project references are compiled (see `tsconfig.*.json`).
2. Afterwards Vite produces an optimised, minified bundle in the `dist/` folder.

> **Tip :** To inspect the production bundle locally run `yarn preview` which serves the files from `dist/` with the same configuration Vercel/GitHub-Pages would use.

---

## Repo layout

```
.
├── public/          # Static assets copied as-is
├── src/             # Application source code
│   ├── components/  # Preact components
│   ├── hooks/       # Custom hooks
│   ├── commands/    # SySex over USB commands
│   ├── styles/      # Tailwind styles / global css
│   └── …
├── styles/          # Tailwind base & utilities
├── dist/            # (generated) production build output
├── cypress/         # E2E tests
├── vite.config.ts   # Vite, Preact & Tailwind configuration
├── tailwind.config.js
├── cypress.config.js # Cypress configuration
└── package.json
```

---

## Linting & formatting

The repo relies on Prettier for code-formatting. Most editors pick up the configuration automatically. You can enforce the formatting with:

```bash
npx prettier --write .
```

ESLint is configured. You can run the linter with:

```bash
yarn lint
```

---

## IDE support

When using VS Code we recommend installing the following extensions:

- **Prettier – Code formatter**
- **Tailwind CSS IntelliSense**
- **ESLint**
- **Typescript React (TSX)** (built-in)

---

## Troubleshooting

| Issue                             | Fix                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| "Command not found: yarn"         | `corepack enable` (Node ≥16.13)                                                             |
| Changed deps are not reflected    | Stop the dev-server and run `yarn dev` again – Vite occasionally caches aggressively        |
| Preact fast-refresh stops working | Make sure you are on the latest Node LTS & the `@preact/preset-vite` plugin is up-to-date   |
| ESLint issues                     | Run `yarn lint` to see errors, many can be fixed with editor integrations or `eslint --fix` |

---

### Have questions?

Feel free to open an issue or start a discussion on GitHub. Happy hacking! 🎉
