'use client';

import { useRef } from 'react';
import { motion, useInView, useScroll, useTransform } from 'motion/react';
import { 
  Shuffle, 
  FolderOpen, 
  User, 
  Users2, 
  Search, 
  Lightbulb,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import {
  scrollReveal,
  staggerContainer,
  staggerItem,
  fadeInScale,
  viewportSettings,
} from './animations';

const transformations = [
  {
    id: 'organization',
    from: {
      title: 'Scattered Ideas',
      icon: Shuffle,
      description: 'Notes everywhere, connections lost',
      color: 'text-red-500',
    },
    to: {
      title: 'Organized Knowledge',
      icon: FolderOpen,
      description: 'Everything connected and accessible',
      color: 'text-green-500',
    },
    benefits: [
      'Visual organization of thoughts',
      'Automatic categorization',
      'Smart tagging system',
    ],
  },
  {
    id: 'collaboration',
    from: {
      title: 'Solo Thinking',
      icon: User,
      description: 'Working in isolation',
      color: 'text-orange-500',
    },
    to: {
      title: 'Collaborative Innovation',
      icon: Users2,
      description: 'Building ideas together',
      color: 'text-blue-500',
    },
    benefits: [
      'Real-time collaboration',
      'Shared workspaces',
      'Team insights',
    ],
  },
  {
    id: 'discovery',
    from: {
      title: 'Lost Insights',
      icon: Search,
      description: 'Can\'t find what you wrote',
      color: 'text-yellow-500',
    },
    to: {
      title: 'Searchable Wisdom',
      icon: Lightbulb,
      description: 'Instant access to everything',
      color: 'text-violet-500',
    },
    benefits: [
      'Semantic search',
      'AI-powered discovery',
      'Cross-map connections',
    ],
  },
];

function TransformationCard({
  transformation,
  index,
}: {
  transformation: typeof transformations[0];
  index: number;
}) {
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, viewportSettings);

  return (
    <motion.div
      ref={cardRef}
      variants={staggerItem}
      custom={index}
      className="relative"
    >
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-8 h-full">
        {/* From State */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-lg bg-zinc-800/50 ${transformation.from.color}`}>
              <transformation.from.icon className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-zinc-50">
                {transformation.from.title}
              </h4>
              <p className="text-sm text-zinc-500">
                {transformation.from.description}
              </p>
            </div>
          </div>
        </div>

        {/* Animated Arrow */}
        <div className="flex justify-center my-6">
          <motion.div
            initial={{ scale: 0, rotate: 90 }}
            animate={isInView ? { scale: 1, rotate: 0 } : {}}
            transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
            className="relative"
          >
            <ArrowRight className="h-8 w-8 text-zinc-600" />
            <motion.div
              className="absolute inset-0"
              animate={isInView ? {
                x: [0, 16, 32],
                opacity: [1, 0.5, 0],
              } : {}}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
              }}
            >
              <ArrowRight className="h-8 w-8 text-blue-500" />
            </motion.div>
          </motion.div>
        </div>

        {/* To State */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-lg bg-zinc-800/50 ${transformation.to.color}`}>
              <transformation.to.icon className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-zinc-50">
                {transformation.to.title}
              </h4>
              <p className="text-sm text-zinc-400">
                {transformation.to.description}
              </p>
            </div>
          </div>
        </div>

        {/* Benefits List */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="space-y-2 mt-6 pt-6 border-t border-zinc-800"
        >
          {transformation.benefits.map((benefit, benefitIndex) => (
            <motion.div
              key={benefitIndex}
              variants={staggerItem}
              custom={benefitIndex}
              className="flex items-center gap-2 text-sm text-zinc-400"
            >
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>{benefit}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Progress Bar Animation */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-violet-500 rounded-b-2xl"
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{
            delay: 0.5 + index * 0.2,
            duration: 1,
            ease: "easeOut",
          }}
          style={{ originX: 0 }}
        />
      </div>
    </motion.div>
  );
}

export default function BenefitsSection() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, viewportSettings);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.3, 1, 1, 0.3]);

  return (
    <section
      ref={containerRef}
      className="relative py-24 sm:py-32 bg-zinc-950 overflow-hidden"
    >
      {/* Parallax Background Elements */}
      <motion.div
        style={{ y, opacity }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" />
      </motion.div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm font-medium text-green-400 ring-1 ring-inset ring-green-500/20"
          >
            <ArrowRight className="h-4 w-4" />
            Transform Your Workflow
          </motion.span>
          <motion.h2
            variants={scrollReveal}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-50"
          >
            From chaos to clarity in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-500">
              three simple steps
            </span>
          </motion.h2>
          <motion.p
            variants={scrollReveal}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto"
          >
            See how Moistus AI transforms the way you capture, organize, and discover knowledge.
          </motion.p>
        </motion.div>

        {/* Transformation Cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {transformations.map((transformation, index) => (
            <TransformationCard
              key={transformation.id}
              transformation={transformation}
              index={index}
            />
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-16 text-center"
        >
          <p className="text-lg text-zinc-400 mb-6">
            Ready to transform your thinking process?
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block"
          >
            <a
              href="/auth/sign-up"
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-8 py-4 text-base font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
            >
              Start Your Transformation
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}