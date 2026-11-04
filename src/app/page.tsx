import Image from 'next/image'
import { Type } from 'lucide-react'

function NextjsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 180 180" fill="none">
      <mask
        id="next-mask"
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="180"
        height="180"
      >
        <circle cx="90" cy="90" r="90" fill="white" />
        <path
          d="M149.508 157.438L69.1478 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.137 149.508 157.438Z"
          fill="black"
        />
        <rect x="115" y="54" width="12" height="72" fill="black" />
      </mask>
      <circle
        cx="90"
        cy="90"
        r="90"
        fill="currentColor"
        mask="url(#next-mask)"
      />
    </svg>
  )
}

function ReactIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="-11.5 -10.23174 23 20.46348"
      fill="none"
    >
      <circle cx="0" cy="0" r="2.05" fill="#58c4dc" />
      <g stroke="#58c4dc" strokeWidth="1" fill="none">
        <ellipse rx="11" ry="4.2" />
        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
      </g>
    </svg>
  )
}

function TypeScriptIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#3178C6" />
      <path
        d="M4.5 9h5v1.6H7.8V17H6.2v-6.4H4.5V9zm8 4.7c.5.5 1.2.8 2 .8.7 0 1.2-.2 1.5-.4.3-.3.5-.6.5-1 0-.4-.2-.7-.4-.9-.3-.2-.8-.4-1.5-.6l-.7-.2c-1-.3-1.7-.7-2.1-1.2-.4-.5-.6-1.1-.6-1.8 0-.9.4-1.7 1.1-2.2.8-.6 1.8-.9 3-.9 1 0 1.8.2 2.6.6l-.6 1.4c-.6-.4-1.3-.5-2-.5-.6 0-1.1.2-1.4.4-.3.2-.4.5-.4.8 0 .3.1.5.3.7.2.2.7.4 1.4.5l.7.2c1.1.3 1.8.8 2.2 1.3.4.5.7 1.2.7 2 0 1-.4 1.8-1.1 2.4-.8.6-1.8.9-3.1.9-1.2 0-2.2-.3-3-.9l.6-1.5z"
        fill="#FFFFFF"
      />
    </svg>
  )
}

function TailwindIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6.001 12z" />
    </svg>
  )
}

function ShadcnIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 256 256" fill="none">
      <line
        x1="208"
        y1="128"
        x2="128"
        y2="208"
        stroke="currentColor"
        strokeWidth="28"
        strokeLinecap="round"
      />
      <line
        x1="192"
        y1="40"
        x2="40"
        y2="192"
        stroke="currentColor"
        strokeWidth="28"
        strokeLinecap="round"
      />
    </svg>
  )
}

const features = [
  {
    title: 'Tailwind CSS v4',
    subtitle: 'Modern styling & tokens',
    icon: <TailwindIcon className="size-4.5 text-[#06b6d4]" />,
  },
  {
    title: 'TypeScript',
    subtitle: 'Strict type safety',
    icon: <TypeScriptIcon className="size-4.5 rounded-xs" />,
  },
  {
    title: 'Shadcn UI',
    subtitle: 'Base UI components',
    icon: <ShadcnIcon className="size-4 text-black dark:text-white" />,
  },
  {
    title: 'Next.js 16',
    subtitle: 'App Router & Turbopack',
    icon: <NextjsIcon className="size-4 text-black dark:text-white" />,
  },
  {
    title: 'React 19',
    subtitle: 'React Compiler',
    icon: <ReactIcon className="size-4.5 text-[#58c4dc]" />,
  },
  {
    title: 'Poppins Font',
    subtitle: 'Google sans-serif',
    icon: <Type className="text-primary size-4" />,
  },
]

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col items-center justify-between gap-10 bg-white px-8 py-16 sm:items-start sm:px-16 sm:py-24 dark:bg-black">
        <Image
          className="h-5 w-25 dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />

        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl leading-10 font-semibold tracking-tight text-black sm:text-4xl dark:text-zinc-50">
              Starter Template
            </h1>
            <p className="max-w-md text-base leading-7 text-zinc-600 dark:text-zinc-400">
              Get started by editing{' '}
              <code className="rounded bg-black/6 px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/8">
                src/app/page.tsx
              </code>{' '}
              file.
            </p>
          </div>

          <div className="flex w-full max-w-lg flex-col gap-3">
            <p className="text-xs font-semibold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
              What&apos;s Included
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 md:grid-cols-3">
              {features.map((item) => (
                <div
                  key={item.title}
                  className="flex items-center gap-3 rounded-xl border border-black/8 bg-black/2 p-2.5 text-left transition-colors hover:border-black/15 hover:bg-black/4 dark:border-white/12 dark:bg-white/4 dark:hover:border-white/20 dark:hover:bg-white/6"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-black/6 bg-white shadow-2xs dark:border-white/10 dark:bg-zinc-900">
                    {item.icon}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-black dark:text-zinc-100">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {item.subtitle}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="bg-foreground text-background flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 whitespace-nowrap transition-colors hover:bg-[#383838] sm:w-auto dark:hover:bg-[#ccc]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="h-3.5 w-4 dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={14}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/8 px-6 whitespace-nowrap transition-colors hover:border-transparent hover:bg-black/4 sm:w-auto dark:border-white/15 dark:hover:bg-[#1a1a1a]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  )
}
