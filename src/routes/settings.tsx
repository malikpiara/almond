import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Home } from '@/routes/home';
import { isNative } from '@/platform';
import { isConnected } from '@/lib/drive';
import { getNotifications } from '@/platform/notifications';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useSwipeBack } from '@/hooks/use-swipe-back';
import { Button } from '@/components/ui/button';
import { ReflectionStats } from '@/components/reflection-stats';
import { ReminderControl } from '@/components/reminder-control';
import { PairLink } from '@/components/pair-link';

// App-level settings, kept off the main screens so the journal stays uncluttered.
// Reached via the discreet gear on Journals; same swipe-back-to-Journals gesture
// as the board, so navigation feels consistent.
export function Settings() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const swipeBack = useSwipeBack(() => navigate({ to: '/journals' }), isMobile);

  return (
    <>
      {/* Destination peek: Journals parallaxes in behind Settings during a drag. */}
      {swipeBack.peeking && (
        <div
          ref={swipeBack.peekRef}
          aria-hidden
          style={{ transform: 'translateX(-30%)' }}
          className='fixed inset-0 z-0 overflow-hidden bg-[#FAF9F5]'
        >
          <Home />
        </div>
      )}
      <div
        ref={swipeBack.ref}
        onTouchStart={swipeBack.onTouchStart}
        onTouchMove={swipeBack.onTouchMove}
        onTouchEnd={swipeBack.onTouchEnd}
        className='fixed inset-0 z-10 flex flex-col bg-[#FAF9F5] [touch-action:pan-y]'
      >
        <div className='shrink-0 flex items-center gap-2 px-6 sm:px-8 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-[#FAF9F5]'>
          <Link
            to='/journals'
            aria-label='Back to journals'
            viewTransition={{ types: ['slide-back'] }}
            className='shrink-0 p-1 text-gray-500 hover:text-gray-800 cursor-pointer'
          >
            <ArrowLeft className='h-5 w-5' />
          </Link>
          <h1 className='text-2xl font-medium tracking-tight text-gray-800'>
            Settings
          </h1>
        </div>

        <div className='flex flex-1 flex-col gap-4 overflow-y-auto px-6 sm:px-8 pb-28'>
          <ReflectionStats />
          {isNative() && !isConnected() && <PairLink />}
          {isNative() && <ReminderControl />}

          {/* Debug / testing — just for me, removed before release. */}
          {isNative() && (
            <section className='rounded-xl border border-gray-200 bg-white p-4'>
              <p className='font-medium text-gray-800'>Debug</p>
              <p className='mb-3 text-sm text-muted-foreground'>
                For testing — removed before release.
              </p>
              <Button
                variant='secondary'
                size='sm'
                className='cursor-pointer'
                onClick={() => getNotifications().sendTestNotification()}
              >
                Send test notification
              </Button>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
