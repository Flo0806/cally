import type { FetchOptions } from "ofetch";
import { useClientId } from "~/composables/useClientId";

export interface ApiIssue {
  path: string;
  message: string;
}

// One error shape for the UI: message to show, issues to attach to fields
export class ApiError extends Error {
  status: number;
  issues: ApiIssue[];

  constructor(message: string, status: number, issues: ApiIssue[] = []) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

function toApiError(error: unknown): ApiError {
  const e = error as {
    statusCode?: number;
    data?: { message?: string; data?: { issues?: ApiIssue[] } };
  };
  const status = e.statusCode ?? 0;
  const issues = e.data?.data?.issues ?? [];
  const message =
    status === 0 ? "Keine Verbindung zum Server" : (e.data?.message ?? "Anfrage fehlgeschlagen");
  return new ApiError(message, status, issues);
}

// Imperative calls from event handlers: create, update, delete. During SSR the request's
// cookies must travel along, otherwise our own API sees no session. Plain ofetch options:
// the route typed $fetch signature is too deep for TypeScript once there are many routes.
export async function api<T>(url: string, options?: FetchOptions): Promise<T> {
  const fetcher = (import.meta.server ? useRequestFetch() : $fetch) as (
    url: string,
    options?: FetchOptions,
  ) => Promise<unknown>;
  // Tag our writes, the live stream echoes the tag so this device can ignore itself
  const clientId = import.meta.client ? useClientId().value : "";
  const headers = clientId ? { ...options?.headers, "x-cally-client": clientId } : options?.headers;
  try {
    return (await fetcher(url, { ...options, headers })) as T;
  } catch (error) {
    throw toApiError(error);
  }
}

// Data for rendering, SSR aware. Route typed: the response type comes from the server handler.
export const useApi = useFetch;
