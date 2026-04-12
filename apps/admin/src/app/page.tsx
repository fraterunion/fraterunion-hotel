import { hotelConfig, hotelLocationLine } from '@fraterunion/config';

export default function Page() {
  return (
    <main className="min-h-screen bg-neutral-100 p-8 text-neutral-900">
      <h1 className="text-2xl font-semibold tracking-tight">{hotelConfig.hotelName}</h1>
      <p className="mt-2 text-sm text-neutral-600">{hotelLocationLine()}</p>
      <p className="mt-6 text-sm text-neutral-600">
        Admin app is available after sign-in. Use the login flow to open the operations console.
      </p>
    </main>
  );
}
