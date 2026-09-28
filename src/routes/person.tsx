import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useRouter } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { store } from '@/lib/store';
import type { Board, Entry, PersonLog } from '@/types';
import { formatBalance, formatDay, formatEntryDate } from '@/utils/utils';

export function Person() {
  const { name } = useParams({ from: '/people/$name' });
  const [mentions, setMentions] = useState<
    { entry: Entry; board: Board }[] | null
  >(null);
  const [logs, setLogs] = useState<PersonLog[]>([]);
  const router = useRouter();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      await store.init();
      const [entries, personLogs] = await Promise.all([
        store.getPersonEntries(name),
        store.getPersonLogsFor(name),
      ]);
      if (!active) return;
      setMentions(entries);
      setLogs(personLogs);
    })();
    return () => {
      active = false;
    };
  }, [name]);

  // Back to wherever this page was opened from (a journal, or People); a
  // direct visit has nowhere to go back to, so fall back to People.
  function goBack() {
    if (router.history.canGoBack()) router.history.back();
    else navigate({ to: '/people' });
  }

  return (
    <div className='max-w-2xl mx-auto flex flex-col min-h-screen gap-2 px-4 sm:px-8 pb-28'>
      <div className='sticky top-0 z-10 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-[#FAF9F5]/80 backdrop-blur-sm flex items-center gap-2'>
        <button
          type='button'
          onClick={goBack}
          aria-label='Back'
          className='shrink-0 p-1 -ml-1 text-gray-500 hover:text-gray-800 cursor-pointer'
        >
          <ArrowLeft className='h-5 w-5' />
        </button>
        <h1 className='min-w-0 truncate text-2xl font-medium tracking-tight text-gray-800'>
          {name}
        </h1>
      </div>

      {logs.length > 0 && (
        <section className='flex flex-col gap-1 pb-4'>
          <h2 className='text-sm text-gray-500'>
            {logs.length === 1 ? '1 log' : `${logs.length} logs`}
          </h2>
          <ul className='-mx-4 sm:mx-0 divide-y divide-gray-200'>
            {logs.map((log) => (
              <li key={log.id}>
                <Link
                  to='/log/$id'
                  params={{ id: log.id }}
                  className='flex flex-col gap-1 px-4 sm:px-0 py-4 cursor-pointer'
                >
                  <span className='flex items-baseline justify-between gap-4'>
                    <span className='text-gray-800'>{formatDay(log.day)}</span>
                    <span className='shrink-0 text-sm text-gray-500'>
                      {formatBalance(log.theirShare)}
                    </span>
                  </span>
                  {log.notes.trim() && (
                    <span className='truncate text-sm text-gray-500'>
                      {log.notes.trim().split('\n')[0]}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {mentions && (
        <p className='text-sm text-gray-500'>
          {mentions.length === 0
            ? 'No entries mention this name.'
            : mentions.length === 1
              ? '1 entry'
              : `${mentions.length} entries`}
        </p>
      )}

      {mentions && mentions.length > 0 && (
        <div className='-mx-4 sm:mx-0 divide-y divide-gray-200'>
          {mentions.map(({ entry, board }) => (
            <article key={entry.id} className='px-4 sm:px-0 py-5 text-gray-800'>
              <p className='whitespace-pre-line leading-relaxed'>
                {entry.content}
              </p>
              <div className='mt-2 text-sm text-gray-400'>
                {formatEntryDate(entry.timestamp)} · {board.prompt}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
