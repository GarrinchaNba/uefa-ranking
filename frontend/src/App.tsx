import { RankingTabs } from './components/RankingTabs.js';

export function App() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-3xl font-bold">UEFA Club and Association Rankings</h1>
      <RankingTabs />
    </main>
  );
}
