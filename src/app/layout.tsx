import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'EasyUp Software Solution HQ - Autonomous Multi-Agent Workspace',
  description: 'Autonomous Multi-Agent AI Office for EasyUp Software Solution (Iloilo City) with Human-in-the-Loop Boss Desk',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body
        className={`${poppins.className} flex min-h-full flex-col font-sans`}
      >
        {children}
      </body>
    </html>
  )
}
