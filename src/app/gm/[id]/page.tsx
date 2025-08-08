import GmView from '@/components/gm-view';

export const dynamic = 'force-dynamic';

export default function GMPage({ params }: { params: { id: string } }) {
  return <GmView sessionId={params.id} />;
}
