'use client';

import { useState } from 'react';
import ChatOverlay from '@/components/chat/ChatOverlay';

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <main className="min-h-svh bg-white">
      {/* Hero */}
      <section className="min-h-svh flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Logo placeholder - replace with actual Dad Insurance logo */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            Dad Insurance
          </h2>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight">
          Insurance for Dads.
        </h1>
        <p className="text-base sm:text-lg text-gray-600 mb-8 max-w-md mx-auto">
          Find affordable life insurance so your family is always protected.
        </p>
        <button
          onClick={() => setChatOpen(true)}
          className="w-full max-w-xs px-8 py-4 bg-slate-700 text-white rounded-full text-lg font-medium
                     hover:bg-slate-800 active:bg-slate-900 transition-colors duration-200
                     shadow-lg shadow-slate-700/20"
        >
          Get a Quote Now
        </button>
      </section>

      <ChatOverlay isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </main>
  );
}
