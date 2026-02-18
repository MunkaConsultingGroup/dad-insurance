'use client';

import { motion } from 'framer-motion';

interface MessageBubbleProps {
  sender: 'bot' | 'user';
  text: string;
}

export default function MessageBubble({ sender, text }: MessageBubbleProps) {
  const isBot = sender === 'bot';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-3`}
    >
      {isBot && (
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-semibold mr-2 flex-shrink-0 mt-1">
          M
        </div>
      )}
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed ${
          isBot
            ? 'bg-gray-100 text-gray-800 rounded-bl-md'
            : 'bg-slate-700 text-white rounded-br-md'
        }`}
      >
        {text}
      </div>
    </motion.div>
  );
}
