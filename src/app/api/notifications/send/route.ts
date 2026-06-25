import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || 'BDlNMXIiq5y41D-x4LbdL0qPGlxubez9zg1WO9ITG4yh1FDP3BVyhva6cPQoI7S8CzU0sMoVMxaHaw8qeEw7vT8';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || 'jJ87GjGYKcmDNix6nN-lYCahaUvp1tZCy1elJGiLREg';

webpush.setVapidDetails('mailto:admin@master-ryadom.ru', VAPID_PUBLIC, VAPID_PRIVATE);

const subscriptions = ((globalThis as any).__pushSubs ??= new Map<string, any>());

export async function POST(req: NextRequest) {
  const { userId, title, body, url } = await req.json();

  if (!userId || !title) {
    return NextResponse.json({ error: 'userId and title required' }, { status: 400 });
  }

  const sub = subscriptions.get(userId);
  if (!sub) {
    return NextResponse.json({ error: 'No subscription for user' }, { status: 404 });
  }

  try {
    await webpush.sendNotification(sub, JSON.stringify({ title, body, url }));
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.statusCode === 410) {
      subscriptions.delete(userId);
    }
    return NextResponse.json({ error: 'Failed to send', details: err.message }, { status: 500 });
  }
}
