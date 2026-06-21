import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { isNative } from '@/platform';
import { isConnected } from '@/lib/drive';
import { getNotifications } from '@/platform/notifications';
import { Button } from '@/components/ui/button';
import { ReminderControl } from '@/components/reminder-control';
import { PairLink } from '@/components/pair-link';

// App-level settings, kept off the main screens so the journal stays uncluttered.
// Reached via the discreet gear on the Journals screen (native only for now).
export function Settings() {
  return (
    <div className='max-w-4xl mx-auto flex flex-col min-h-screen gap-4 px-6 sm:px-8 pb-28'>
      <div className='sticky top-0 z-10 -mx-6 sm:-mx-8 flex items-center gap-2 px-6 sm:px-8 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-[#FAF9F5]/80 backdrop-blur-sm'>
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
  );
}
