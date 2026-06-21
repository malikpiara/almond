import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getNotifications } from '@/platform/notifications';

// Daily reminder — the spike's product lever (does a nudge raise reflection
// frequency?). Native-only; render behind isNative(). Settings persist locally.
const STORAGE_KEY = 'almond-reminder';
const DEFAULT_TIME = '20:00';

interface ReminderState {
  enabled: boolean;
  time: string; // 'HH:MM' local
}

function loadState(): ReminderState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ReminderState;
  } catch {
    /* fall through to default */
  }
  return { enabled: false, time: DEFAULT_TIME };
}

function parseTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

export function ReminderControl() {
  const [state, setState] = useState<ReminderState>(loadState);
  const notifications = getNotifications();

  const persist = (next: ReminderState) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const toggle = async () => {
    if (state.enabled) {
      persist({ ...state, enabled: false });
      await notifications.cancelDailyReminder();
      return;
    }
    const granted = await notifications.requestPermission();
    if (!granted) {
      toast.error('Allow notifications to get a daily reminder.');
      return;
    }
    persist({ ...state, enabled: true });
    await notifications.scheduleDailyReminder(parseTime(state.time));
    toast.success(`Daily reminder set for ${state.time}.`);
  };

  const changeTime = async (time: string) => {
    persist({ ...state, time });
    if (state.enabled) {
      await notifications.scheduleDailyReminder(parseTime(time));
    }
  };

  return (
    <section className='rounded-xl border border-gray-200 bg-white p-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='min-w-0'>
          <p className='font-medium text-gray-800'>Daily reminder</p>
          <p className='text-sm text-muted-foreground'>
            A gentle nudge to take a moment and reflect.
          </p>
        </div>
        <Button
          variant={state.enabled ? 'secondary' : 'default'}
          size='sm'
          className='shrink-0 cursor-pointer rounded-full'
          onClick={toggle}
        >
          {state.enabled ? 'On' : 'Turn on'}
        </Button>
      </div>

      {state.enabled && (
        <div className='mt-3 flex items-center gap-2 text-sm text-gray-700'>
          <span>Remind me at</span>
          <input
            type='time'
            value={state.time}
            onChange={(e) => changeTime(e.target.value)}
            className='rounded-md border border-gray-200 bg-white px-2 py-1'
          />
        </div>
      )}
    </section>
  );
}
