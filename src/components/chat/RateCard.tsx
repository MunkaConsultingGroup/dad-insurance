'use client';

import { motion } from 'framer-motion';
import { CarrierQuote } from '@/lib/types';

interface RateCardProps {
  quotes: CarrierQuote[];
}

export default function RateCard({ quotes }: RateCardProps) {
  if (quotes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-50 rounded-xl p-4 mb-3 border border-gray-200"
      >
        <p className="text-gray-600 text-sm">
          Sorry, I couldn&apos;t find rates for your specific profile. A licensed agent can help you explore options.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3 shadow-sm"
    >
      {quotes.map((quote, idx) => (
        <div
          key={quote.carrierId}
          className={`flex items-center justify-between px-4 py-3 ${
            idx !== quotes.length - 1 ? 'border-b border-gray-100' : ''
          } ${idx === 0 ? 'bg-emerald-50' : ''}`}
        >
          <div className="flex items-center gap-3">
            {idx === 0 && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Best
              </span>
            )}
            <div>
              <p className="font-medium text-gray-900 text-sm">{quote.carrierName}</p>
              <p className="text-xs text-gray-500">AM Best: {quote.amBestRating}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-900">
              ${quote.monthlyRate.toFixed(2)}
              <span className="text-xs font-normal text-gray-500">/mo</span>
            </p>
          </div>
        </div>
      ))}
      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500">
        Estimates based on published rate data. Final rates may vary based on full underwriting.
      </div>
    </motion.div>
  );
}
