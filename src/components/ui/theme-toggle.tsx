'use client'

import { motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/theme-context'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative p-3 cute-rounded cute-glow bg-card hover:bg-accent transition-all duration-300 group"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{
          rotate: theme === 'dark' ? 180 : 0,
          scale: theme === 'dark' ? 0.8 : 1,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="relative w-5 h-5"
      >
        {theme === 'light' ? (
          <Sun className="w-5 h-5 text-cute-pink group-hover:cute-text-glow transition-all duration-300" />
        ) : (
          <Moon className="w-5 h-5 text-cute-cyan group-hover:cute-text-glow transition-all duration-300" />
        )}
      </motion.div>
      
      {/* Cute sparkle effect */}
      <motion.div
        className="absolute -top-1 -right-1 w-2 h-2 bg-cute-pink rounded-full opacity-0 group-hover:opacity-100"
        animate={{
          scale: [0, 1, 0],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: 0.2,
        }}
      />
      <motion.div
        className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-cute-cyan rounded-full opacity-0 group-hover:opacity-100"
        animate={{
          scale: [0, 1, 0],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: 0.8,
        }}
      />
    </motion.button>
  )
}