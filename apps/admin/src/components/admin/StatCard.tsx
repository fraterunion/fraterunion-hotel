type Props = {
  label: string;
  value: string | number;
  helper?: string;
};

export default function StatCard({ label, value, helper }: Props) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight text-neutral-900">
        {value}
      </p>
      {helper ? (
        <p className="mt-3 text-sm text-neutral-500">{helper}</p>
      ) : null}
    </div>
  );
}