'use client';

import { lazy, Suspense } from 'react';

const ChatOverlay = lazy(() => import('@/components/chat/ChatOverlay'));

export default function Home() {
  return (
    <main className="min-h-svh bg-white">
      <Suspense fallback={<div className="fixed inset-0 z-50 bg-white" />}>
        <ChatOverlay isOpen={true} onClose={() => {}} />
      </Suspense>
    </main>
  );
}
