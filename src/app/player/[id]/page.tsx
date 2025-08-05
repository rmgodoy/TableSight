import PlayerView from '@/components/player-view';

export default function PlayerPage({ params }: { params: { id: string } }) {
  return <PlayerView sessionId={params.id} />;
}
