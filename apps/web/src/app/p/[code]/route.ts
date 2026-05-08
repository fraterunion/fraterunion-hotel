import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? '';

  let stripeUrl: string;
  try {
    const res = await fetch(`${apiBase}/public/short-links/${code}`, {
      cache: 'no-store',
    });

    if (res.status === 404) {
      return new NextResponse('Link not found', { status: 404 });
    }
    if (res.status === 410) {
      return new NextResponse('Link expired', { status: 410 });
    }
    if (!res.ok) {
      return new NextResponse('Error resolving link', { status: 502 });
    }

    const data = (await res.json()) as { stripeUrl: string };
    stripeUrl = data.stripeUrl;
  } catch {
    return new NextResponse('Service unavailable', { status: 503 });
  }

  // TODO: add CHECKOUT_LINK_CLICKED analytics event here (Phase 2)
  return NextResponse.redirect(stripeUrl, { status: 302 });
}
