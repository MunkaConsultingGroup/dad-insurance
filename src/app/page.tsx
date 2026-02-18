'use client';

import { useState } from 'react';
import ChatOverlay from '@/components/chat/ChatOverlay';

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Life insurance that<br />makes sense.
        </h1>
        <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
          Get your personalized estimate in under 2 minutes.
          No spam, no sales calls until you&apos;re ready.
        </p>
        <button
          onClick={() => setChatOpen(true)}
          className="px-8 py-4 bg-slate-700 text-white rounded-full text-lg font-medium
                     hover:bg-slate-800 transition-colors duration-200 shadow-lg shadow-slate-700/20"
        >
          See My Rates
        </button>
        <p className="mt-6 text-sm text-gray-400">
          Comparing rates from 5+ top-rated carriers
        </p>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">How it works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '1', title: 'Answer a few questions', desc: 'Melissa asks about your age, health, and coverage needs. Takes about 2 minutes.' },
            { step: '2', title: 'See your rates', desc: 'Get estimated monthly rates from top-rated carriers, personalized to your profile.' },
            { step: '3', title: 'Connect with an agent', desc: 'If you like what you see, a licensed agent confirms your exact rate. No obligation.' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <ChatOverlay isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </main>
  );
}
