type Props = {
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
};

export default function StatusBadge({ value, tone = 'default' }: Props) {
  const toneMap = {
    default: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${toneMap[tone]}`}
    >
      {value}
    </span>
  );
}