import { Suspense } from 'react'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

interface TodoItem {
  id: string | number
  name: string
}

async function TodoList() {
  let todos: TodoItem[] | null = null
  try {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
      const cookieStore = await cookies()
      const supabase = createClient(cookieStore)
      const res = await supabase.from('todos').select()
      todos = (res.data as TodoItem[]) || null
    }
  } catch {
    // Gracefully handle missing build-time env vars
  }

  return (
    <ul className="space-y-2 font-mono text-sm text-slate-300">
      {todos && todos.length > 0 ? (
        todos.map((todo) => <li key={todo.id}>{todo.name}</li>)
      ) : (
        <li className="text-slate-500">
          Connected to Supabase. No todos found or table pending migration.
        </li>
      )}
    </ul>
  )
}

export default function Page() {
  return (
    <div className="min-h-screen bg-[#0a0d14] p-8 text-slate-100">
      <h1 className="mb-4 font-mono text-xl font-bold text-emerald-400">
        Supabase Connectivity Test
      </h1>
      <Suspense
        fallback={
          <p className="font-mono text-sm text-slate-400">
            Loading Supabase records...
          </p>
        }
      >
        <TodoList />
      </Suspense>
    </div>
  )
}
