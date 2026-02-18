'use client';

import { motion } from 'framer-motion';
import { ConversationOption } from '@/lib/types';

interface OptionButtonsProps {
  options: ConversationOption[];
  onSelect: (value: string, label: string) => void;
  disabled?: boolean;
}

export default function OptionButtons({ options, onSelect, disabled }: OptionButtonsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-wrap gap-2 mb-3 justify-end"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value, opt.label)}
          disabled={disabled}
          className="px-4 py-2 rounded-full border-2 border-slate-700 text-slate-700 text-sm font-medium
                     hover:bg-slate-700 hover:text-white transition-colors duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {opt.label}
        </button>
      ))}
    </motion.div>
  );
}
