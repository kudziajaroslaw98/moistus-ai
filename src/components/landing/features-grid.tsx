'use client';

import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import {
  Sparkles,
  Users,
  Search,
  Layers,
  FolderTree,
  Share2,
  Brain,
  Zap,
  Shield,
} from 'lucide-react';
import {
  featureCard,
  staggerContainer,
  hoverScale,
  viewportSettings,
} from './animations';

const features = [
  {
    id: 'ai-suggestions',
    title: 'AI-Powered Suggestions',
    description:
      'Get intelligent recommendations for connections, content, and insights as you build your mind maps.',
    icon: Sparkles,
    gradient: 'from-blue-500 to-cyan-500',
    span: 'col-span-1 md:col-span-2',
  },
  {
    id: 'realtime-collab',
    title: 'Real-time Collaboration',
    description:
      'Work together seamlessly with your team. See changes instantly, comment, and build ideas together.',
    icon: Users,
    gradient: 'from-violet-500 to-purple-500',
    span: 'col-span-1',
  },
  {
    id: 'semantic-search',
    title: 'Semantic Search',
    description:
      'Find anything in your knowledge base using natural language. Our AI understands context, not just keywords.',
    icon: Search,
    gradient: 'from-amber-500 to-orange-500',
    span: 'col-span-1',
  },
  {
    id: 'multimodal',
    title: 'Multi-modal Content',
    description:
      'Add text, images, code snippets, tasks, and more. Express ideas in the format that works best.',
    icon: Layers,
    gradient: 'from-emerald-500 to-green-500',
    span: 'col-span-1 md:col-span-2',
  },
  {
    id: 'smart-org',
    title: 'Smart Organization',
    description:
      'Auto-categorize, tag, and structure your thoughts. Let AI help organize your knowledge effortlessly.',
    icon: FolderTree,
    gradient: 'from-pink-500 to-rose-500',
    span: 'col-span-1',
  },
  {
    id: 'export',
    title: 'Export Anywhere',
    description:
      'Transform your mind maps into documents, presentations, or integrate with your favorite tools.',
    icon: Share2,
    gradient: 'from-indigo-500 to-blue-500',
    span: 'col-span-1',
  },
];

const additionalFeatures = [
  { icon: Brain, label: 'AI Understanding' },
  { icon: Zap, label: 'Lightning Fast' },
  { icon: Shield, label: 'Enterprise Security' },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: typeof features[0];
  index: number;
}) {
  const Icon = feature.icon;

  return (
    <motion.div
      variants={featureCard}
      custom={index}
      whileHover="hover"
      whileTap="tap"
      className={`${feature.span} group relative`}
    >
      <motion.div
        variants={hoverScale}
        className="relative h-full rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-8 overflow-hidden transition-colors hover:border-zinc-700"
      >
        {/* Background gradient on hover */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
        />

        {/* Icon */}
        <div className="relative mb-6">
          <div
            className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} p-2.5 shadow-lg`}
          >
            <Icon className="h-full w-full text-white" />
          </div>
          <motion.div
            className={`absolute inset-0 h-12 w-12 rounded-xl bg-gradient-to-br ${feature.gradient} blur-xl opacity-50`}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 1,
            }}
          />
        </div>

        {/* Content */}
        <h3 className="relative mb-3 text-xl font-semibold text-zinc-50">
          {feature.title}
        </h3>
        <p className="relative text-zinc-400 leading-relaxed">
          {feature.description}
        </p>

        {/* Hover effect glow */}
        <motion.div
          className="absolute -inset-px rounded-2xl bg-gradient-to-br from-blue-500/20 via-violet-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
          initial={false}
          animate={{
            opacity: 0,
          }}
          whileHover={{
            opacity: 1,
          }}
        />
      </motion.div>
    </motion.div>
  );
}

export default function FeaturesGrid() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, viewportSettings);

  return (
    <section
      ref={containerRef}
      id="features"
      className="relative py-24 sm:py-32 bg-zinc-950 overflow-hidden"
    >
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
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
            className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20"
          >
            <Sparkles className="h-4 w-4" />
            Powerful Features
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-50"
          >
            Everything you need to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-violet-500">
              amplify your thinking
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto"
          >
            Moistus AI combines cutting-edge AI technology with intuitive design
            to create the ultimate knowledge management platform.
          </motion.p>
        </motion.div>

        {/* Features grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <FeatureCard key={feature.id} feature={feature} index={index} />
          ))}
        </motion.div>

        {/* Additional features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-16 text-center"
        >
          <p className="text-zinc-400 mb-8">And much more...</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {additionalFeatures.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.9 + index * 0.1, duration: 0.5 }}
                className="flex items-center gap-3 text-zinc-500"
              >
                <item.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}