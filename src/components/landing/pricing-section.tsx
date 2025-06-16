'use client';

import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import {
  Check,
  X,
  Sparkles,
  Zap,
  Shield,
  Users,
  Infinity,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import {
  scrollReveal,
  fadeInScale,
  staggerContainer,
  staggerItem,
  hoverScale,
  viewportSettings,
} from './animations';

const pricingTiers = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    interval: 'forever',
    description: 'Perfect for individuals getting started',
    features: [
      { name: 'Up to 3 mind maps', included: true },
      { name: '100 nodes per map', included: true },
      { name: 'Basic AI suggestions', included: true },
      { name: 'Export to PDF', included: true },
      { name: 'Community support', included: true },
      { name: 'Real-time collaboration', included: false },
      { name: 'Advanced AI features', included: false },
      { name: 'Priority support', included: false },
    ],
    cta: 'Start Free',
    ctaLink: '/auth/sign-up',
    gradient: 'from-zinc-500 to-zinc-600',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    interval: 'per month',
    description: 'For professionals and growing teams',
    features: [
      { name: 'Unlimited mind maps', included: true },
      { name: 'Unlimited nodes', included: true },
      { name: 'Advanced AI features', included: true },
      { name: 'All export formats', included: true },
      { name: 'Real-time collaboration', included: true },
      { name: 'Version history', included: true },
      { name: 'Priority support', included: true },
      { name: 'Custom integrations', included: false },
    ],
    cta: 'Start Pro Trial',
    ctaLink: '/auth/sign-up?plan=pro',
    gradient: 'from-blue-500 to-violet-500',
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    interval: 'contact sales',
    description: 'For large organizations with custom needs',
    features: [
      { name: 'Everything in Pro', included: true },
      { name: 'Unlimited team members', included: true },
      { name: 'Custom AI training', included: true },
      { name: 'SSO & advanced security', included: true },
      { name: 'Dedicated account manager', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'SLA guarantee', included: true },
      { name: 'On-premise deployment', included: true },
    ],
    cta: 'Contact Sales',
    ctaLink: '/contact-sales',
    gradient: 'from-emerald-500 to-green-500',
    popular: false,
  },
];

function PricingCard({
  tier,
  index,
}: {
  tier: typeof pricingTiers[0];
  index: number;
}) {
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, viewportSettings);

  return (
    <motion.div
      ref={cardRef}
      variants={staggerItem}
      custom={index}
      whileHover="hover"
      className="relative h-full"
    >
      {/* Popular badge */}
      {tier.popular && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 + index * 0.1 }}
          className="absolute -top-4 left-1/2 -translate-x-1/2 z-10"
        >
          <div className="flex items-center gap-1 bg-gradient-to-r from-blue-500 to-violet-500 text-white text-sm font-medium px-4 py-1 rounded-full shadow-lg shadow-blue-500/25">
            <Sparkles className="w-3 h-3" />
            Most Popular
          </div>
        </motion.div>
      )}

      <motion.div
        variants={hoverScale}
        className={`relative h-full rounded-2xl border ${
          tier.popular
            ? 'border-blue-500/50 bg-zinc-900'
            : 'border-zinc-800 bg-zinc-900/50'
        } backdrop-blur-sm p-8 transition-all hover:border-zinc-700`}
      >
        {/* Gradient background for popular tier */}
        {tier.popular && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 pointer-events-none" />
        )}

        {/* Header */}
        <div className="relative mb-6">
          <h3 className="text-xl font-semibold text-zinc-50 mb-2">
            {tier.name}
          </h3>
          <p className="text-sm text-zinc-400">{tier.description}</p>
        </div>

        {/* Pricing */}
        <div className="relative mb-8">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-zinc-50">{tier.price}</span>
            <span className="text-zinc-400">/{tier.interval}</span>
          </div>
        </div>

        {/* Features */}
        <ul className="relative space-y-3 mb-8">
          {tier.features.map((feature, featureIndex) => (
            <motion.li
              key={featureIndex}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.1 + featureIndex * 0.05 }}
              className="flex items-center gap-3 text-sm"
            >
              {feature.included ? (
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 text-zinc-600 flex-shrink-0" />
              )}
              <span
                className={
                  feature.included ? 'text-zinc-300' : 'text-zinc-500'
                }
              >
                {feature.name}
              </span>
            </motion.li>
          ))}
        </ul>

        {/* CTA Button */}
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <a
            href={tier.ctaLink}
            className={`block w-full text-center rounded-lg px-6 py-3 font-medium transition-all ${
              tier.popular
                ? 'bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-50'
            }`}
          >
            {tier.cta}
          </a>
        </motion.div>

        {/* Hover glow effect */}
        <motion.div
          className={`absolute -inset-px rounded-2xl bg-gradient-to-br ${tier.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none`}
          initial={false}
          animate={{ opacity: 0 }}
          whileHover={{ opacity: 0.2 }}
        />
      </motion.div>
    </motion.div>
  );
}

export default function PricingSection() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, viewportSettings);

  return (
    <section
      ref={containerRef}
      id="pricing"
      className="relative py-24 sm:py-32 bg-zinc-950 overflow-hidden"
    >
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
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
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20"
          >
            <Zap className="h-4 w-4" />
            Simple Pricing
          </motion.span>
          <motion.h2
            variants={scrollReveal}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-50"
          >
            Choose the plan that{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-green-500">
              fits your needs
            </span>
          </motion.h2>
          <motion.p
            variants={scrollReveal}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            transition={{ delay: 0.1 }}
            className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto"
          >
            Start free and scale as you grow. No hidden fees, no surprises.
          </motion.p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {pricingTiers.map((tier, index) => (
            <PricingCard key={tier.id} tier={tier} index={index} />
          ))}
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Secure payment via Stripe</span>
            </div>
            <div className="flex items-center gap-2">
              <Infinity className="h-4 w-4 text-blue-500" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-500" />
              <span>Team discounts available</span>
            </div>
          </div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-8 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            <a href="/pricing-faq" className="underline-offset-4 hover:underline">
              Questions? See our pricing FAQ
            </a>
            <ArrowRight className="h-4 w-4" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}