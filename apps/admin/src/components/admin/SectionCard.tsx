import { ReactNode } from 'react';

type Props = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  rightSlot?: ReactNode;
};

export default function SectionCard({
  title,
  subtitle,
  children,
  rightSlot,
}: Props) {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      {(title || subtitle || rightSlot) ? (
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            {title ? (
              <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="mt-2 text-sm text-neutral-500">{subtitle}</p>
            ) : null}
          </div>
          {rightSlot ? <div>{rightSlot}</div> : null}
        </div>
      ) : null}

      {children}
    </section>
  );
}