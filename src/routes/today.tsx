import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { store } from '@/lib/store';
import type { PersonLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dayKey, formatBalance, formatDay } from '@/utils/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';

export function Today() {
  // The day this screen was opened on, fixed for its lifetime.
  const [today] = useState(() => dayKey(Date.now()));
  const [logs, setLogs] = useState<PersonLog[] | null>(null);
  const [known, setKnown] = useState<string[]>([]);
  const [mentioned, setMentioned] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [version, setVersion] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    let active = true;
    (async () => {
      await store.init();
      const [all, people, mentionedToday] = await Promise.all([
        store.getPersonLogs(),
        store.getPeople(),
        store.getPeopleMentionedOn(today),
      ]);
      if (!active) return;
      setLogs(all);
      setKnown(people.map((p) => p.name));
      setMentioned(mentionedToday);
    })();
    return () => {
      active = false;
    };
  }, [today, version]);

  async function add(person: string) {
    const trimmed = person.trim();
    if (!trimmed) return;
    await store.logPerson(trimmed, today);
    setName('');
    setVersion((v) => v + 1);
  }

  const todays = (logs ?? [])
    .filter((l) => l.day === today)
    .sort((a, b) => a.createdAt - b.createdAt);
  const suggestions = mentioned.filter(
    (n) => !todays.some((l) => l.person === n)
  );
  const earlierDays: [string, PersonLog[]][] = [];
  for (const log of logs ?? []) {
    if (log.day === today) continue;
    const group = earlierDays.find(([day]) => day === log.day);
    if (group) group[1].push(log);
    else earlierDays.push([log.day, [log]]);
  }

  return (
    <div className='max-w-2xl mx-auto flex flex-col min-h-screen gap-4 px-4 sm:px-8 pb-28'>
      <div className='sticky top-0 z-10 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-[#FAF9F5]/80 backdrop-blur-sm flex items-center gap-2'>
        <Link
          to='/journals'
          aria-label='Back to journals'
          viewTransition={isMobile ? { types: ['slide-back'] } : undefined}
          className='shrink-0 p-1 -ml-1 text-gray-500 hover:text-gray-800 cursor-pointer'
        >
          <ArrowLeft className='h-5 w-5' />
        </Link>
        <h1 className='text-2xl font-medium tracking-tight text-balance text-gray-800'>
          Today
        </h1>
      </div>

      <form
        className='flex gap-2'
        onSubmit={(e) => {
          e.preventDefault();
          void add(name);
        }}
      >
        <Input
          list='known-people'
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='Who did you spend time with?'
          aria-label='Add a person'
          autoComplete='off'
          className='bg-white'
        />
        <Button type='submit' variant='outline' className='cursor-pointer'>
          Add
        </Button>
      </form>
      <datalist id='known-people'>
        {known.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {suggestions.length > 0 && (
        <div className='flex flex-wrap items-center gap-2'>
          <span className='text-sm text-gray-500'>In today’s entries:</span>
          {suggestions.map((n) => (
            <Button
              key={n}
              variant='secondary'
              size='sm'
              onClick={() => void add(n)}
              className='rounded-full bg-[#FFFBEA] text-[#83591e] hover:bg-amber-100 cursor-pointer'
            >
              + {n}
            </Button>
          ))}
        </div>
      )}

      {logs && todays.length === 0 && (
        <p className='text-sm text-gray-500'>No one logged today yet.</p>
      )}
      {todays.length > 0 && <LogList logs={todays} />}

      {earlierDays.map(([day, dayLogs]) => (
        <section key={day} className='flex flex-col gap-1 pt-4'>
          <h2 className='text-sm font-medium text-gray-500'>{formatDay(day)}</h2>
          <LogList logs={dayLogs} />
        </section>
      ))}
    </div>
  );
}

function LogList({ logs }: { logs: PersonLog[] }) {
  return (
    <ul className='-mx-4 sm:mx-0 divide-y divide-gray-200'>
      {logs.map((log) => (
        <li key={log.id}>
          <Link
            to='/log/$id'
            params={{ id: log.id }}
            className='flex items-baseline gap-4 px-4 sm:px-0 py-4 cursor-pointer'
          >
            <span className='min-w-0 flex-1 truncate text-gray-800'>
              {log.person}
            </span>
            <span className='shrink-0 text-sm text-gray-500'>
              {formatBalance(log.theirShare)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
