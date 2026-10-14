import type { OperationsPrincipal } from './operations-domain';

/**
 * Integration boundary for the enterprise's verified server session.
 * Until Feishu/company identity is connected, deny access. Never read roles,
 * user IDs or OP assignments from browser headers, query strings or localStorage.
 * Replace this function with session verification + server-owned role lookup.
 */
export async function getVerifiedEmployee(): Promise<OperationsPrincipal | null> {
  return null;
}
