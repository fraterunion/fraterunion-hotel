export default function BookingPaymentSuccessPage() {
  return (
    <main className="min-h-screen bg-neutral-100 px-6 py-16">
      <div className="mx-auto max-w-3xl rounded-3xl border border-green-200 bg-white p-8 shadow-sm">
        <div className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-green-700">
          Payment success
        </div>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-900">
          Payment completed successfully
        </h1>

        <p className="mt-4 text-sm leading-7 text-neutral-600">
          Your payment was processed successfully. Your reservation should now be
          confirmed and reflected in the property admin panel.
        </p>
      </div>
    </main>
  );
}