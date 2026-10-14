import Workbench from '@/components/workbench';
import { getVerifiedEmployee } from '@/lib/enterprise-identity';
import { operationsScope } from '@/lib/operations-domain';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const principal = await getVerifiedEmployee();
  return <Workbench previewEnabled={process.env.NODE_ENV === 'development'} canViewOperations={operationsScope(principal) !== null} />;
}
