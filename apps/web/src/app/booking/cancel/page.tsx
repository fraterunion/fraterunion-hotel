export default function BookingPaymentCancelPage() {
  return (
    <main className="min-h-screen bg-neutral-100 px-6 py-16">
      <div className="mx-auto max-w-3xl rounded-3xl border border-yellow-200 bg-white p-8 shadow-sm">
        <div className="inline-flex rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-yellow-700">
          Payment not completed
        </div>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-900">
          Payment was cancelled
        </h1>

        <p className="mt-4 text-sm leading-7 text-neutral-600">
          Your reservation is still pending. You can return and complete the payment
          later.
        </p>
      </div>
    </main>
  );
}