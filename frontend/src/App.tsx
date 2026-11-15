import { RankingTabs } from './components/RankingTabs.js';
import { ThemeToggle } from './components/ThemeToggle.js';

export function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1 className="app-title">UEFA Club and Association Rankings</h1>
        <ThemeToggle />
      </header>
      <RankingTabs />
    </main>
  );
}
