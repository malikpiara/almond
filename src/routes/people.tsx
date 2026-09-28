import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { store } from '@/lib/store';
import type { PersonSummary } from '@/types';
import { formatEntryDate } from '@/utils/utils';
import { useIsMobile } from '@/hooks/use-is-mobile';

export function People() {
  const [people, setPeople] = useState<PersonSummary[] | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    store
      .init()
      .then(() => store.getPeople())
      .then(setPeople);
  }, []);

  return (
    <div className='max-w-2xl mx-auto flex flex-col min-h-screen gap-2 px-4 sm:px-8 pb-28'>
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
          People
        </h1>
      </div>

      {people && people.length === 0 && (
        <p className='text-sm text-gray-500'>
          No one yet. People you mention in entries show up here.
        </p>
      )}

      {people && people.length > 0 && (
        <>
          <p className='text-sm text-gray-500'>
            {people.length === 1 ? '1 person' : `${people.length} people`}
          </p>
          <ul className='-mx-4 sm:mx-0 divide-y divide-gray-200'>
            {people.map((person) => (
              <li key={person.name}>
                <Link
                  to='/people/$name'
                  params={{ name: person.name }}
                  className='flex items-baseline gap-4 px-4 sm:px-0 py-4 cursor-pointer'
                >
                  <span className='min-w-0 flex-1 truncate text-gray-800'>
                    {person.name}
                  </span>
                  <span className='shrink-0 text-sm text-gray-500'>
                    {[
                      person.entryCount === 1
                        ? '1 entry'
                        : person.entryCount > 1
                          ? `${person.entryCount} entries`
                          : null,
                      person.logCount === 1
                        ? '1 log'
                        : person.logCount > 1
                          ? `${person.logCount} logs`
                          : null,
                      formatEntryDate(person.lastSeenAt),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
