import { useEffect, useEffectEvent, useState } from 'react';
import { Link, useNavigate, useParams, useRouter } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { store } from '@/lib/store';
import type { PersonLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { describeBalance, formatDay } from '@/utils/utils';
import { BalanceSlider } from '@/components/balance';
import { cn } from '@/lib/utils';

export function Log() {
  const { id } = useParams({ from: '/log/$id' });
  const [log, setLog] = useState<PersonLog | null | undefined>(undefined);
  const [theirShare, setTheirShare] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [dirty, setDirty] = useState(false);
  const router = useRouter();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      await store.init();
      const found = await store.getPersonLog(id);
      if (!active) return;
      setLog(found ?? null);
      setTheirShare(found?.theirShare ?? null);
      setNotes(found?.notes ?? '');
    })();
    return () => {
      active = false;
    };
  }, [id]);

  // Edits save shortly after you stop (dragging the dial changes it on every
  // pixel), and right away when you leave or the app goes to the background.
  const save = useEffectEvent(() => {
    if (!dirty) return;
    setDirty(false);
    void store.updatePersonLog(id, { theirShare, notes });
  });

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(save, 400);
    return () => window.clearTimeout(timer);
  }, [dirty, theirShare, notes]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') save();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      save();
    };
  }, []);

  function changeShare(value: number | null) {
    setTheirShare(value);
    setDirty(true);
  }

  function changeNotes(value: string) {
    setNotes(value);
    setDirty(true);
  }

  // Back to wherever this card was opened from (Today, or a person's page);
  // a direct visit falls back to Today.
  function goBack() {
    if (router.history.canGoBack()) router.history.back();
    else navigate({ to: '/today' });
  }

  async function remove() {
    setDirty(false);
    await store.deletePersonLog(id);
    goBack();
  }

  return (
    <div className='max-w-2xl mx-auto flex flex-col min-h-screen gap-6 px-4 sm:px-8 pb-28'>
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
          {log?.person}
        </h1>
      </div>

      {log === null && (
        <p className='text-sm text-gray-500'>This log doesn’t exist anymore.</p>
      )}

      {log && (
        <>
          <p className='-mt-4 text-sm text-gray-500'>
            {formatDay(log.day)} ·{' '}
            <Link
              to='/people/$name'
              params={{ name: log.person }}
              className='hover:text-gray-800 underline-offset-2 hover:underline'
            >
              View {log.person}
            </Link>
          </p>

          <section className='flex flex-col gap-3'>
            <div className='flex flex-col gap-1'>
              <span className='text-sm text-gray-500'>Who talked more?</span>
              <div className='flex items-baseline justify-between gap-4'>
                <p
                  aria-live='polite'
                  className={cn(
                    'text-base',
                    theirShare === null
                      ? 'text-gray-500'
                      : 'font-medium text-gray-800'
                  )}
                >
                  {describeBalance(theirShare, log.person)}
                </p>
                {theirShare !== null && (
                  <button
                    type='button'
                    onClick={() => changeShare(null)}
                    className='shrink-0 text-sm text-gray-500 hover:text-gray-800 cursor-pointer'
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <BalanceSlider
              value={theirShare}
              onChange={changeShare}
              name={log.person}
            />
          </section>

          <section className='flex flex-col gap-2'>
            <label htmlFor='notes' className='text-sm text-gray-500'>
              Notes
            </label>
            <Textarea
              id='notes'
              value={notes}
              onChange={(e) => changeNotes(e.target.value)}
              placeholder='What do you want to remember, ask or follow up on?'
              className='min-h-32 bg-white leading-relaxed sm:text-lg md:text-lg'
            />
          </section>

          <Button
            variant='ghost'
            onClick={() => void remove()}
            className='self-start -ml-3 text-gray-500 cursor-pointer'
          >
            Remove this log
          </Button>
        </>
      )}
    </div>
  );
}
