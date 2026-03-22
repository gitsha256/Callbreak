'use client';

import dynamic from 'next/dynamic';

const GameViewer = dynamic(() => import('./GameViewer'), {
  ssr: false, // CSR only
});

export default function ClientWrapper({ gameId }: { gameId: string }) {
  return <GameViewer id={gameId} />;
}
