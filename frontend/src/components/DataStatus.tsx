import type { DataStatus as DataStatusValue } from '@uefa-ranking/contracts';

interface DataStatusProps {
  dataStatus?: DataStatusValue | null;
  error?: string | null;
  loading?: boolean;
}

const qualityLabels: Record<DataStatusValue['quality'], string> = {
  current: 'Current',
  stale: 'Stale',
  partial: 'Partial data',
  unavailable: 'Unavailable',
};

export function DataStatus({ dataStatus, error, loading = false }: DataStatusProps) {
  if (loading) {
    return <p role="status">Loading ranking data...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (!dataStatus) {
    return null;
  }

  const modeLabel = dataStatus.mode === 'mock' ? 'Mock data' : 'Live data';

  return (
    <div aria-label="Data status" className="text-sm text-slate-600">
      <p>
        <span>{modeLabel}</span>
        {' · '}
        <span>{qualityLabels[dataStatus.quality]}</span>
        {' · '}
        <span>{dataStatus.source}</span>
      </p>
      {dataStatus.mode === 'live' && dataStatus.lastSuccessfulUpdate && (
        <p>
          Last successful update:{' '}
          <time dateTime={dataStatus.lastSuccessfulUpdate}>
            {new Date(dataStatus.lastSuccessfulUpdate).toLocaleString()}
          </time>
        </p>
      )}
    </div>
  );
}
