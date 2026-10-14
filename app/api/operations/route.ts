import { authorizeOperations, demoOperations, isLocalOperationsPreview, operationsScope, previewPrincipal } from '@/lib/operations-domain';
import { getVerifiedEmployee } from '@/lib/enterprise-identity';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const preview = url.searchParams.get('preview');
  const localPreview = isLocalOperationsPreview(url, process.env.NODE_ENV);
  const reply = (body: unknown, status: number) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' } });
  if (preview && !localPreview) return reply({ error: '此环境不支持演示身份。' }, 403);
  const principal = preview ? previewPrincipal(preview) : await getVerifiedEmployee();
  const scope = operationsScope(principal);
  const query = {
    start: url.searchParams.get('start') ?? '2026-09',
    end: url.searchParams.get('end') ?? '2026-09',
    op: url.searchParams.get('op') ?? (scope?.kind === 'op' ? scope.op : 'all'),
  };
  const authorization = authorizeOperations(principal, query);
  if (authorization.status !== 200) return reply({ error: authorization.error }, authorization.status);
  // Real data requires a scoped enterprise repository; no fallback to demo data.
  if (!preview) return reply({ error: '经营数据源尚未接入。' }, 503);
  return reply({ mode: 'preview', data: demoOperations(principal, query) }, 200);
}
