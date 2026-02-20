'use client';

import { motion } from 'framer-motion';

export default function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <img
        src="/melissa-avatar.jpg"
        alt="Melissa"
        className="w-8 h-8 rounded-full mr-2 flex-shrink-0 mt-1 object-cover"
      />
      <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-gray-400 rounded-full"
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
    </div>
  );
}
