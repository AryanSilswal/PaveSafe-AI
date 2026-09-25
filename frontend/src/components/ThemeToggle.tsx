"use client";

import useDarkMode from '../hooks/useDarkMode';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useDarkMode();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label="Toggle Dark Mode"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
