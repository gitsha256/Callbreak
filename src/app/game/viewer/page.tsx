// src/app/game/viewer/page.tsx
'use client';

import { Suspense } from 'react';
import ViewerClient from './ViewerClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <ViewerClient />
    </Suspense>
  );
}
