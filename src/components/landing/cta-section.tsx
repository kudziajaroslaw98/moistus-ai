'use client';

import { useState, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowRight,
  CheckCircle,
  Mail,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react';
import {
  scrollReveal,
  fadeInScale,
  heroButtonReveal,
  viewportSettings,
  pulse,
} from './animations';

// Email validation schema
const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type EmailFormData = z.infer<typeof emailSchema>;

export default function CTASection() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, viewportSettings);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const onSubmit = async (data: EmailFormData) => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In production, this would make an actual API call
    console.log('Email submitted:', data.email);
    
    setIsSubmitting(false);
    setIsSuccess(true);
    reset();
    
    // Reset success state after 5 seconds
    setTimeout(() => setIsSuccess(false), 5000);
  };

  const benefits = [
    { icon: Zap, text: 'Start free, upgrade anytime' },
    { icon: Shield, text: 'No credit card required' },
    { icon: CheckCircle, text: '14-day free trial' },
  ];

  return (
    <section
      ref={containerRef}
      className="relative py-24 sm:py-32 bg-zinc-950 overflow-hidden"
    >
      {/* Background elements */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-500/20 via-violet-500/20 to-transparent rounded-full blur-3xl"
        />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500/10 to-violet-500/10 px-4 py-2 text-sm font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20 mb-8"
          >
            <Sparkles className="h-4 w-4" />
            Limited Time Offer
          </motion.div>

          {/* Headline */}
          <motion.h2
            variants={scrollReveal}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-50 mb-4"
          >
            Ready to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-violet-500">
              amplify your thinking?
            </span>
          </motion.h2>

          {/* Subheadline */}
          <motion.p
            variants={scrollReveal}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            transition={{ delay: 0.1 }}
            className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10"
          >
            Join thousands of thinkers, creators, and teams who use Moistus AI to transform their ideas into actionable knowledge.
          </motion.p>

          {/* Form */}
          <motion.div
            variants={fadeInScale}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            transition={{ delay: 0.2 }}
            className="max-w-md mx-auto mb-8"
          >
            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400"
              >
                <CheckCircle className="h-5 w-5" />
                <span>Success! Check your email to get started.</span>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="relative">
                <div className="relative">
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="Enter your email"
                    className="w-full px-6 py-4 pr-36 text-base bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-zinc-100 placeholder-zinc-500 transition-all"
                    disabled={isSubmitting}
                  />
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 pointer-events-none" />
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    variants={pulse}
                    animate="animate"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-violet-500 text-white font-medium rounded-md hover:shadow-lg hover:shadow-blue-500/25 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="h-5 w-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <span className="flex items-center gap-2">
                        Get Started
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </motion.button>
                </div>
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-sm text-red-400 text-left"
                  >
                    {errors.email.message}
                  </motion.p>
                )}
              </form>
            )}
          </motion.div>

          {/* Benefits */}
          <motion.div
            variants={heroButtonReveal}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-center gap-2"
              >
                <benefit.icon className="h-4 w-4 text-green-500" />
                <span>{benefit.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Alternative CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.6 }}
            className="mt-12 pt-12 border-t border-zinc-800"
          >
            <p className="text-zinc-400 mb-4">
              Want to see it in action first?
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-block"
            >
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                Watch demo
                <ArrowRight className="h-4 w-4" />
              </a>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Decorative elements */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-violet-500/20 rounded-full blur-xl"
        />
        <motion.div
          animate={{
            y: [0, 20, 0],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute bottom-20 right-10 w-32 h-32 bg-gradient-to-br from-violet-500/20 to-pink-500/20 rounded-full blur-xl"
        />
      </div>
    </section>
  );
}