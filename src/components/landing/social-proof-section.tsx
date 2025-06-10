'use client';

import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'motion/react';
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Quote,
  TrendingUp,
  Users,
  Brain,
  Clock,
} from 'lucide-react';
import {
  scrollReveal,
  fadeInScale,
  staggerContainer,
  staggerItem,
  viewportSettings,
} from './animations';

const testimonials = [
  {
    id: 1,
    name: 'Sarah Chen',
    role: 'Product Manager',
    company: 'TechCorp',
    avatar: 'SC',
    content: 'Moistus AI has completely transformed how our team brainstorms and manages projects. The AI suggestions are genuinely helpful, not just gimmicks.',
    rating: 5,
  },
  {
    id: 2,
    name: 'Michael Rodriguez',
    role: 'Research Director',
    company: 'Innovation Labs',
    avatar: 'MR',
    content: 'The semantic search feature is a game-changer. I can find connections between ideas I wrote months apart. It\'s like having a second brain that never forgets.',
    rating: 5,
  },
  {
    id: 3,
    name: 'Emily Watson',
    role: 'Creative Director',
    company: 'Design Studio',
    avatar: 'EW',
    content: 'I\'ve tried every mind mapping tool out there. Moistus AI is the first one that actually helps me think better, not just organize what I already know.',
    rating: 5,
  },
  {
    id: 4,
    name: 'David Park',
    role: 'Software Architect',
    company: 'DevHub',
    avatar: 'DP',
    content: 'The ability to add code snippets and technical diagrams directly into mind maps makes this perfect for technical planning. Real-time collaboration is flawless.',
    rating: 5,
  },
];

const stats = [
  {
    id: 'users',
    value: '50K+',
    label: 'Active Users',
    icon: Users,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'maps',
    value: '2M+',
    label: 'Mind Maps Created',
    icon: Brain,
    color: 'from-violet-500 to-purple-500',
  },
  {
    id: 'productivity',
    value: '73%',
    label: 'Productivity Increase',
    icon: TrendingUp,
    color: 'from-emerald-500 to-green-500',
  },
  {
    id: 'time',
    value: '2.5h',
    label: 'Saved Per Week',
    icon: Clock,
    color: 'from-amber-500 to-orange-500',
  },
];

function StatCard({ stat, index }: { stat: typeof stats[0]; index: number }) {
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, viewportSettings);
  const Icon = stat.icon;

  return (
    <motion.div
      ref={cardRef}
      variants={staggerItem}
      custom={index}
      className="text-center"
    >
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-6">
        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} p-2.5 mb-4`}>
          <Icon className="h-full w-full text-white" />
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : {}}
          transition={{ delay: 0.2 + index * 0.1, duration: 0.5, type: 'spring' }}
          className="text-3xl font-bold text-zinc-50 mb-2"
        >
          {stat.value}
        </motion.div>
        <p className="text-sm text-zinc-400">{stat.label}</p>
      </div>
    </motion.div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: typeof testimonials[0] }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-8">
        {/* Quote icon */}
        <Quote className="h-8 w-8 text-zinc-700 mb-4" />
        
        {/* Content */}
        <p className="text-lg text-zinc-300 leading-relaxed mb-6">
          "{testimonial.content}"
        </p>
        
        {/* Rating */}
        <div className="flex gap-1 mb-6">
          {[...Array(testimonial.rating)].map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-amber-500 text-amber-500" />
          ))}
        </div>
        
        {/* Author */}
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-medium">
            {testimonial.avatar}
          </div>
          <div>
            <div className="font-medium text-zinc-50">{testimonial.name}</div>
            <div className="text-sm text-zinc-400">
              {testimonial.role} at {testimonial.company}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SocialProofSection() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, viewportSettings);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section
      ref={containerRef}
      className="relative py-24 sm:py-32 bg-zinc-950 overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

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
            className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 ring-1 ring-inset ring-amber-500/20"
          >
            <Star className="h-4 w-4" />
            Trusted by Thousands
          </motion.span>
          <motion.h2
            variants={scrollReveal}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-50"
          >
            Join the{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
              knowledge revolution
            </span>
          </motion.h2>
          <motion.p
            variants={scrollReveal}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto"
          >
            See why teams and individuals choose Moistus AI to transform their thinking process.
          </motion.p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
        >
          {stats.map((stat, index) => (
            <StatCard key={stat.id} stat={stat} index={index} />
          ))}
        </motion.div>

        {/* Testimonials Carousel */}
        <motion.div
          variants={fadeInScale}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="relative max-w-4xl mx-auto"
        >
          <div className="relative">
            <AnimatePresence mode="wait">
              <TestimonialCard
                key={currentTestimonial}
                testimonial={testimonials[currentTestimonial]}
              />
            </AnimatePresence>

            {/* Navigation buttons */}
            <button
              onClick={prevTestimonial}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full ml-4 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-5 w-5 text-zinc-400" />
            </button>
            <button
              onClick={nextTestimonial}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full mr-4 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            </button>
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentTestimonial
                    ? 'w-8 bg-blue-500'
                    : 'bg-zinc-700 hover:bg-zinc-600'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-zinc-500 mb-6">Trusted by teams at</p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-50">
            {/* Placeholder company logos - in production, replace with actual logos */}
            {['Company A', 'Company B', 'Company C', 'Company D', 'Company E'].map((company, index) => (
              <motion.div
                key={company}
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.9 + index * 0.1 }}
                className="text-zinc-600 font-medium"
              >
                {company}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}