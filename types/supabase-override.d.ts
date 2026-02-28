// Temporary type override until migrations are run and types are regenerated
declare module '@/lib/supabase/client' {
  export function createClient(): any
}

declare module '@/lib/supabase/server' {
  export function createServerClient(): Promise<any>
}
