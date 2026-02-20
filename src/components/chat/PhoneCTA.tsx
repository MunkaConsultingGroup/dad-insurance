'use client';

import { motion } from 'framer-motion';

const PPC_PHONE = process.env.NEXT_PUBLIC_PPC_PHONE || '';

function formatPhoneForTel(phone: string): string {
  return 'tel:+1' + phone.replace(/\D/g, '');
}

export default function PhoneCTA() {
  // No number configured yet - show placeholder
  if (!PPC_PHONE) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-4 mt-2"
      >
        <div className="flex items-center justify-center gap-3 w-full px-6 py-4 rounded-2xl bg-gray-200 text-gray-500 text-lg font-semibold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
          </svg>
          Coming soon
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
          A representative number will be available shortly
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-4 mt-2"
    >
      <a
        href={formatPhoneForTel(PPC_PHONE)}
        className="flex items-center justify-center gap-3 w-full px-6 py-4 rounded-2xl bg-emerald-600 text-white text-lg font-semibold
                   hover:bg-emerald-700 active:bg-emerald-800 transition-colors duration-200
                   shadow-lg shadow-emerald-600/25"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
        </svg>
        Call {PPC_PHONE}
      </a>
      <p className="text-center text-xs text-gray-400 mt-2">
        Tap to speak with a licensed representative now
      </p>
    </motion.div>
  );
}
