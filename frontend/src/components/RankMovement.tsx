type Props = { movement: number | null };

export function RankMovement({ movement }: Props) {
  if (movement === null) {
    return <span aria-label="Movement unavailable">Unavailable</span>;
  }
  const distance = Math.abs(movement);
  const places = distance === 1 ? 'place' : 'places';
  const label = movement > 0 ? `Up ${distance} ${places}`
    : movement < 0 ? `Down ${distance} ${places}` : 'Unchanged';
  return (
    <span
      className={movement > 0 ? 'text-green-700' : movement < 0 ? 'text-red-700' : ''}
      aria-label={label}
    >
      {movement > 0 ? `+${movement}` : movement}
    </span>
  );
}
