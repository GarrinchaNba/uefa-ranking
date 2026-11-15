import { useState } from 'react';

type Theme = 'dark' | 'light';
const storageKey = 'uefa-ranking-theme';

function initialTheme(): Theme {
  const stored = window.localStorage.getItem(storageKey);
  if (stored === 'light' || stored === 'dark') return stored;
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  const toggleTheme = () => {
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(storageKey, nextTheme);
    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Use ${nextTheme} theme`}
      onClick={toggleTheme}
    >
      Use {nextTheme} theme
    </button>
  );
}
