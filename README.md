# Next.js Starter Template

A production-ready starter template built with [Next.js](https://nextjs.org), [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com), [Shadcn UI](https://ui.shadcn.com), and the [Poppins](https://fonts.google.com/specimen/Poppins) font.

## Features

- **Next.js 16 (App Router)** & **React 19**
- **Google Font Poppins** (sans-serif) configured via `next/font/google`
- **Tailwind CSS v4** with OKLCH theming and dark mode support
- **Shadcn UI & Base UI** pre-configured components
- **Turbopack & React Compiler** enabled
- **Automated CI/CD Workflows**:
  - CI verification (formatting, linting, build)
  - Weekly automated Shadcn UI component updates
  - Dependabot auto-merging

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## Available Scripts

- `npm run dev`: Starts the Next.js development server.
- `npm run build`: Creates an optimized production build.
- `npm run start`: Runs the built app in production mode.
- `npm run lint`: Runs ESLint checks.
- `npm run format`: Formats code with Prettier and Tailwind plugin.
- `npm run format:check`: Verifies code formatting.

## Learn More

To learn more about the technologies used in this starter:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - modern utility-first CSS.
- [Shadcn UI Documentation](https://ui.shadcn.com) - beautifully designed components.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
