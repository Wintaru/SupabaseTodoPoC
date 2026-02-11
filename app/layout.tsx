import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog'
import './globals.css'

export const metadata: Metadata = {
  title: 'Supabase + Next.js PoC',
  description: 'Proof of concept for Supabase with Next.js',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body>
        <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
      </body>
    </html>
  )
}
