import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''

export function createClient(
  cookieStore?: ReturnType<typeof cookies> | Awaited<ReturnType<typeof cookies>>
) {
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      async getAll() {
        const resolvedStore = cookieStore ? await cookieStore : await cookies()
        return resolvedStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
            const resolvedStore = cookieStore as unknown as {
              set?: (
                name: string,
                value: string,
                options?: Record<string, unknown>
              ) => void
            }
            if (typeof resolvedStore?.set === 'function') {
              cookiesToSet.forEach(({ name, value, options }) =>
                resolvedStore.set?.(name, value, options as Record<string, unknown>)
              )
            }
        } catch {
          // Server component read-only cookie context; ignore
        }
      },
    },
  })
}
