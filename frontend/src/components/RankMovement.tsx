type Props = { movement: number | null };

export function RankMovement({ movement }: Props) {
  if (movement === null) {
    return <span className="movement-unavailable" aria-label="Movement unavailable">Unavailable</span>;
  }
  const distance = Math.abs(movement);
  const places = distance === 1 ? 'place' : 'places';
  const label = movement > 0 ? `Up ${distance} ${places}`
    : movement < 0 ? `Down ${distance} ${places}` : 'Unchanged';
  return (
    <span
      className={movement > 0 ? 'movement-up' : movement < 0 ? 'movement-down' : 'movement-same'}
      aria-label={label}
    >
      {movement > 0 ? `+${movement}` : movement}
    </span>
  );
}
