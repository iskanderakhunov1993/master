import { NextResponse } from 'next/server';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || 'BDlNMXIiq5y41D-x4LbdL0qPGlxubez9zg1WO9ITG4yh1FDP3BVyhva6cPQoI7S8CzU0sMoVMxaHaw8qeEw7vT8';

export async function GET() {
  return NextResponse.json({ publicKey: VAPID_PUBLIC });
}
