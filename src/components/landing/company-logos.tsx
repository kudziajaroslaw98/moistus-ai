'use client';

import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { fadeIn, staggerContainer, staggerItem } from './animations';

// Placeholder company data - in production, replace with actual logos
const companies = [
  { id: 1, name: 'TechCorp', logo: '🏢' },
  { id: 2, name: 'InnovateLabs', logo: '🔬' },
  { id: 3, name: 'DesignStudio', logo: '🎨' },
  { id: 4, name: 'DataFlow', logo: '📊' },
  { id: 5, name: 'CloudBase', logo: '☁️' },
  { id: 6, name: 'DevHub', logo: '💻' },
];

export default function CompanyLogos() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={containerRef}
      variants={fadeIn}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className="mt-20 pt-20 border-t border-zinc-800"
    >
      <motion.p
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center text-sm text-zinc-500 mb-8"
      >
        Trusted by innovative teams worldwide
      </motion.p>
      
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        className="grid grid-cols-3 md:grid-cols-6 gap-8 items-center justify-items-center"
      >
        {companies.map((company, index) => (
          <motion.div
            key={company.id}
            variants={staggerItem}
            custom={index}
            className="group relative"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
            >
              {/* Logo placeholder - replace with actual logo images */}
              <div className="text-4xl mb-1">{company.logo}</div>
              <span className="text-xs text-zinc-600 font-medium">
                {company.name}
              </span>
            </motion.div>
            
            {/* Hover glow effect */}
            <motion.div
              className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-blue-500/20 to-violet-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"
              initial={{ scale: 0.8 }}
              whileHover={{ scale: 1.2 }}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Optional: Infinite scroll animation for mobile */}
      <motion.div
        className="mt-12 md:hidden overflow-hidden"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 0.5 }}
      >
        <motion.div
          className="flex gap-8 items-center"
          animate={{
            x: [0, -50 * companies.length],
          }}
          transition={{
            x: {
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            },
          }}
        >
          {/* Duplicate for seamless loop */}
          {[...companies, ...companies].map((company, index) => (
            <div
              key={`${company.id}-${index}`}
              className="flex flex-col items-center gap-2 opacity-50 min-w-[100px]"
            >
              <div className="text-3xl">{company.logo}</div>
              <span className="text-xs text-zinc-600 font-medium whitespace-nowrap">
                {company.name}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}