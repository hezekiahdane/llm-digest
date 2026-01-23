# Next.js Scalable Boilerplate (i18n + Shadcn UI)

This is a modern [Next.js](https://nextjs.org) project optimized for scalability, internationalization, and component-driven development. It features a strict folder structure and commit convention to ensure long-term maintainability.

## 🛠 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** Shadcn UI (Radix Primitives)
- **Internationalization:** `next-intl` (Supports English, Burmese, Thai)
- **Linting:** ESLint + Prettier

---

## 🚀 Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn
# or
pnpm install
```

Then, run the development server:
```bash
npm run dev
```

Open http://localhost:3000 with your browser. The app handles locale redirection automatically (e.g., visiting / redirects to /en).

📂 Project Structure
We follow a modular "Domain-Driven" inspired structure where routes are strictly separated from logic and components.

```bash
.
├── app/
│   ├── [locale]/           # 🌍 All pages live here (Dynamic Routing)
│   │   ├── layout.tsx      # Root Layout (Server Component)
│   │   └── page.tsx        # Homepage
│   └── globals.css         # 🎨 Global styles & Theme Variables
├── components/
│   └── ui/                 # 🧩 Shared Shadcn UI components (Button, Input)
├── i18n/                   # ⚙️ i18n Configuration
│   ├── request.ts          # Server-side message loading
│   └── routing.ts          # Locale definitions (en, my, th)
├── messages/               # 🗣 Translation JSON files
│   ├── en.json
│   ├── my.json
│   └── th.json
├── lib/                    # 🧰 Utility functions (cn, formatters)
├── middleware.ts           # 🚦 Locale redirection middleware
└── next.config.ts          # Next.js config with i18n plugin
```

⚠️ Critical Development Notes
Routes: Do not create pages directly in app/. All routes must be inside app/[locale]/.

Async Params: Since this project uses Next.js 15, route parameters are asynchronous. You must await params in your pages and layouts:
```bash
// Correct usage in Layout/Page
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // ...
}
```

📝 Development Guidelines
To maintain a clean history and codebase, please adhere to the following rules.

1. Commit Convention We follow the Conventional Commits specification.

Format: type(scope): description

Allowed Types
| Type | Meaning | Example |
| :--- | :--- | :--- |
| **feat** | A new feature | `feat(ui): add dark mode toggle` |
| **fix** | A bug fix | `fix(auth): resolve login redirect loop` |
| **chore** | Maintenance/Config | `chore(deps): upgrade next-intl` |
| **style** | UI/CSS changes (no logic) | `style(home): adjust hero padding` |
| **refactor** | Code change (no feature/fix) | `refactor(utils): simplify date format` |
| **test** | Adding or fixing tests | `test(auth): add unit tests for login` |
| **perf** | Performance improvements | `perf(image): optimize logo loading` |
| **build** | Build system/dependency updates | `build(npm): update lockfile` |
| **revert** | Reverting a previous commit | `revert: restore previous navbar layout` |
| **docs** | Documentation only | `docs: update readme rules` |
| **ci** | CI/CD changes | `ci: update vercel build settings` |
| **types** | TypeScript-only changes | `types(auth): tighten user session types` |
| **i18n** | Translation / localization changes | `i18n(home): add Thai hero translations` |
| **ui** | Component-level UI changes | `ui(form): add reusable form field wrapper` |
| **security** | Security-related changes | `security(auth): prevent session fixation` |
| **config** | Project configuration changes | `config(tailwind): extend color palette` |
| **deps** | Dependency updates | `deps(next): upgrade to 15.1.0` |
| **dx** | Developer experience improvements | `dx(dev): add lint-staged hooks` |
