'use client';

import { motion } from 'framer-motion';
import { ConversationOption } from '@/lib/types';
import OptionIcon from './OptionIcon';

interface OptionButtonsProps {
  options: ConversationOption[];
  onSelect: (value: string, label: string) => void;
  disabled?: boolean;
  selectedValue?: string;
}

export default function OptionButtons({ options, onSelect, disabled, selectedValue }: OptionButtonsProps) {
  const hasIcons = options.some((opt) => opt.icon);

  // Selected state -compact right-aligned answer chip
  if (selectedValue) {
    const selected = options.find((o) => o.value === selectedValue);
    if (!selected) return null;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="flex justify-end mb-4 mt-1"
      >
        <div className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-700 text-white text-[14px] font-medium rounded-br-md">
          {selected.icon && (
            <OptionIcon name={selected.icon} className="text-slate-300 [&_svg]:w-5 [&_svg]:h-5" />
          )}
          {selected.label}
        </div>
      </motion.div>
    );
  }

  // Icon card layout -bigger cards
  if (hasIcons) {
    const cols =
      options.length === 1 ? 'grid-cols-1 max-w-[220px] mx-auto' :
      options.length === 3 ? 'grid-cols-3' :
      'grid-cols-2';

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`grid ${cols} gap-3 mb-4 mt-2`}
      >
        {options.map((opt, i) => (
          <motion.button
            key={opt.value}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 + i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={() => onSelect(opt.value, opt.label)}
            disabled={disabled}
            className="flex flex-col items-center gap-3 px-5 py-6 rounded-2xl border-2 border-gray-200
                       text-slate-700 text-[15px] font-medium
                       hover:border-slate-700 hover:bg-slate-50
                       active:bg-slate-700 active:text-white active:border-slate-700
                       transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {opt.icon && (
              <OptionIcon name={opt.icon} className="text-slate-500" />
            )}
            <span>{opt.label}</span>
          </motion.button>
        ))}
      </motion.div>
    );
  }

  // Plain pill buttons (no icons)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-wrap gap-2 mb-4 mt-2 justify-center"
    >
      {options.map((opt, i) => (
        <motion.button
          key={opt.value}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 + i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={() => onSelect(opt.value, opt.label)}
          disabled={disabled}
          className="px-5 py-3 rounded-full border-2 border-slate-700 text-slate-700 text-[15px] font-medium
                     hover:bg-slate-700 hover:text-white active:bg-slate-800 active:text-white
                     transition-colors duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {opt.label}
        </motion.button>
      ))}
    </motion.div>
  );
}
