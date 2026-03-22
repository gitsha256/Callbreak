'use client';

import { useSearchParams } from 'next/navigation';
import ClientWrapper from './ClientWrapper';

export default function ViewerClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (!id) {
    return <div className="p-4 text-center">No game ID provided.</div>;
  }

  return <ClientWrapper gameId={id} />;
}
