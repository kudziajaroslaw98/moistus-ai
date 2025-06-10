'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { navLinkUnderline, fadeIn, staggerContainer, staggerItem } from './animations';

const navigation = [
  { name: 'Features', href: '#features' },
  { name: 'How It Works', href: '#how-it-works' },
  { name: 'Pricing', href: '#pricing' },
  { name: 'About', href: '#about' },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 100], [0.8, 1]);
  const headerBlur = useTransform(scrollY, [0, 100], [8, 12]);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <motion.div
          style={{
            backgroundColor: hasScrolled ? 'rgba(9, 9, 11, 0.8)' : 'rgba(9, 9, 11, 0.6)',
            backdropFilter: `blur(${hasScrolled ? 12 : 8}px)`,
          }}
          className="border-b border-zinc-800/50 transition-colors duration-300"
        >
          <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Logo */}
              <motion.div
                className="flex items-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link href="/" className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500" />
                  <span className="text-xl font-bold text-zinc-50">Moistus AI</span>
                </Link>
              </motion.div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex md:items-center md:space-x-8">
                {navigation.map((item) => (
                  <motion.div
                    key={item.name}
                    className="relative"
                    initial="rest"
                    whileHover="hover"
                    animate="rest"
                  >
                    <a
                      href={item.href}
                      className="text-sm font-medium text-zinc-300 hover:text-zinc-50 transition-colors"
                    >
                      {item.name}
                    </a>
                    <motion.div
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-violet-500"
                      variants={navLinkUnderline}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Desktop CTA Buttons */}
              <div className="hidden md:flex md:items-center md:space-x-4">
                <Link
                  href="/auth/sign-in"
                  className="text-sm font-medium text-zinc-300 hover:text-zinc-50 transition-colors"
                >
                  Sign In
                </Link>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link
                    href="/auth/sign-up"
                    className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-shadow"
                  >
                    Get Started Free
                  </Link>
                </motion.div>
              </div>

              {/* Mobile Menu Button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 transition-colors"
                aria-expanded={isMenuOpen}
                aria-label="Toggle navigation menu"
              >
                <AnimatePresence mode="wait">
                  {isMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="h-6 w-6" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu className="h-6 w-6" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </nav>
        </motion.div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-zinc-900 shadow-2xl md:hidden"
            >
              <div className="flex h-16 items-center justify-between px-4">
                <span className="text-xl font-bold text-zinc-50">Menu</span>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsMenuOpen(false)}
                  className="inline-flex items-center justify-center rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-6 w-6" />
                </motion.button>
              </div>

              <motion.nav
                className="px-4 py-6"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <div className="space-y-4">
                  {navigation.map((item, index) => (
                    <motion.div
                      key={item.name}
                      variants={staggerItem}
                      custom={index}
                    >
                      <a
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="block py-2 text-lg font-medium text-zinc-300 hover:text-zinc-50 transition-colors"
                      >
                        {item.name}
                      </a>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  className="mt-8 space-y-4 border-t border-zinc-800 pt-8"
                  variants={staggerItem}
                  custom={navigation.length}
                >
                  <Link
                    href="/auth/sign-in"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full rounded-lg border border-zinc-700 py-3 text-center text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/sign-up"
                    onClick={() => setIsMenuOpen(false)}
                    className="block w-full rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 py-3 text-center text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-shadow"
                  >
                    Get Started Free
                  </Link>
                </motion.div>
              </motion.nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}