import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

const isPlaceholderUrl =
  !supabaseUrl ||
  supabaseUrl.includes('your-project-ref') ||
  !supabaseUrl.startsWith('http');

const isPlaceholderKey =
  !supabaseAnonKey || supabaseAnonKey.includes('your-supabase-anon');

export const isSupabaseConfigured = !isPlaceholderUrl && !isPlaceholderKey;

const REST_READ_TIMEOUT_MS = 12000;

function fetchWithReadTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = (init?.method || 'GET').toUpperCase();
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const isRestRead =
    (method === 'GET' || method === 'HEAD') && urlStr.includes('/rest/v1/');

  if (!isRestRead || typeof AbortController === 'undefined') {
    return fetch(input, init);
  }

  const controller = new AbortController();
  const callerSignal = init?.signal;
  if (callerSignal?.aborted) {
    controller.abort(callerSignal.reason);
  } else if (callerSignal) {
    callerSignal.addEventListener('abort', () => controller.abort(callerSignal.reason), {
      once: true,
    });
  }

  const timer = setTimeout(() => controller.abort(new Error('Request timeout')), REST_READ_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        fetch: fetchWithReadTimeout,
      },
    })
  : null;

export function getSupabaseClientOrThrow(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    );
  }
  return supabase;
}
