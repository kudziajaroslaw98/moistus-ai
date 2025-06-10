'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Twitter,
  Github,
  Linkedin,
  Youtube,
  Mail,
  ArrowRight,
} from 'lucide-react';

const footerLinks = {
  product: [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Changelog', href: '/changelog' },
    { name: 'Roadmap', href: '/roadmap' },
  ],
  company: [
    { name: 'About', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Careers', href: '/careers' },
    { name: 'Press', href: '/press' },
    { name: 'Contact', href: '/contact' },
  ],
  resources: [
    { name: 'Documentation', href: '/docs' },
    { name: 'Help Center', href: '/help' },
    { name: 'Community', href: '/community' },
    { name: 'Templates', href: '/templates' },
    { name: 'API', href: '/api' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Cookie Policy', href: '/cookies' },
    { name: 'Security', href: '/security' },
  ],
};

const socialLinks = [
  { name: 'Twitter', href: 'https://twitter.com/moistusai', icon: Twitter },
  { name: 'GitHub', href: 'https://github.com/moistusai', icon: Github },
  { name: 'LinkedIn', href: 'https://linkedin.com/company/moistusai', icon: Linkedin },
  { name: 'YouTube', href: 'https://youtube.com/@moistusai', icon: Youtube },
];

export default function Footer() {
  return (
    <footer className="relative bg-zinc-950 border-t border-zinc-800">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-t from-blue-500/10 via-violet-500/10 to-transparent rounded-full blur-3xl opacity-50" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-12 lg:py-16">
          {/* Top section with logo and newsletter */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pb-12 border-b border-zinc-800">
            {/* Logo and description */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500" />
                <span className="text-xl font-bold text-zinc-50">Moistus AI</span>
              </div>
              <p className="text-zinc-400 max-w-md">
                Transform your thoughts into connected knowledge with AI-powered mind mapping. 
                Organize ideas, collaborate in real-time, and discover insights.
              </p>
            </div>

            {/* Newsletter signup */}
            <div className="lg:ml-auto">
              <h3 className="text-sm font-semibold text-zinc-50 mb-4">
                Stay updated
              </h3>
              <p className="text-sm text-zinc-400 mb-4">
                Get the latest updates on features and improvements.
              </p>
              <form className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full px-4 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-zinc-100 placeholder-zinc-500"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-violet-500 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-shadow"
                >
                  Subscribe
                </motion.button>
              </form>
            </div>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12">
            {/* Product */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-50 mb-4">Product</h3>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-50 mb-4">Company</h3>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-50 mb-4">Resources</h3>
              <ul className="space-y-3">
                {footerLinks.resources.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-50 mb-4">Legal</h3>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom section */}
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-zinc-800">
            {/* Copyright */}
            <p className="text-sm text-zinc-500 mb-4 md:mb-0">
              © {new Date().getFullYear()} Moistus AI. All rights reserved.
            </p>

            {/* Social links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <motion.a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 text-zinc-500 hover:text-zinc-50 transition-colors"
                    aria-label={social.name}
                  >
                    <Icon className="h-5 w-5" />
                  </motion.a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}