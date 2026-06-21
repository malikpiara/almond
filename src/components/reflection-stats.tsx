import { useEffect, useState } from 'react';
import { store } from '@/lib/store';

// The reminder→frequency read-out. North-star is frequency of reflection, so we
// surface active-days/entries this week plus the current streak, computed from
// entry timestamps. This is the before/after signal for the daily-reminder test.
interface Stats {
  activeDays: number;
  entries: number;
  streak: number;
}

const DAY = 86_400_000;
const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

function computeStats(timestamps: number[]): Stats {
  const now = Date.now();
  const recent = timestamps.filter((t) => t >= now - 7 * DAY);
  const activeDays = new Set(recent.map(dayKey)).size;

  const allDays = new Set(timestamps.map(dayKey));
  let streak = 0;
  const cursor = new Date();
  // Don't break the streak just because today's entry isn't in yet.
  if (!allDays.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  while (allDays.has(dayKey(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { activeDays, entries: recent.length, streak };
}

export function ReflectionStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    store
      .init()
      .then(() => store.snapshot())
      .then((data) =>
        setStats(
          computeStats(
            data.entries.filter((e) => !e.isDeleted).map((e) => e.timestamp)
          )
        )
      );
  }, []);

  if (!stats) return null;

  return (
    <section className='rounded-xl border border-gray-200 bg-white p-4'>
      <p className='font-medium text-gray-800'>This week</p>
      <p className='mt-1 text-sm text-muted-foreground'>
        {stats.entries} {stats.entries === 1 ? 'entry' : 'entries'} across{' '}
        {stats.activeDays} {stats.activeDays === 1 ? 'day' : 'days'}
        {stats.streak > 0 && ` · ${stats.streak}-day streak`}
      </p>
    </section>
  );
}
