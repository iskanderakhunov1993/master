import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

const subscriptions = ((globalThis as any).__pushSubs ??= new Map<string, any>());

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subscription } = await req.json();
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  subscriptions.set(user.id, subscription);

  return NextResponse.json({ ok: true });
}
