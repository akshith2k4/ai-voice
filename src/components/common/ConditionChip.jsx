import StatusChip from './StatusChip';

function getConditionChipColor(condition) {
  const normalizedCondition = String(condition || '').toUpperCase();

  if (normalizedCondition === 'FRESH') return 'success';
  if (normalizedCondition === 'SOILED') return 'warning';
  if (normalizedCondition === 'HEAVY_SOILED') return 'info';
  if (normalizedCondition === 'DAMAGED') return 'error';

  return 'default';
}

export default function ConditionChip({ condition, ...props }) {
  if (!condition) return null;

  return (
    <StatusChip
      status={condition}
      color={getConditionChipColor(condition)}
      {...props}
    />
  );
}
