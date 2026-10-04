import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDay, shiftDay, todayKey } from '@/utils/utils';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';

type Props = {
  value: string; // yyyy-MM-dd
  onChange: (day: string) => void;
  /** Class for the day label (size, colour). The control inherits it. */
  className?: string;
  /** Start as a plain label and show the arrows once tapped. For rows where
   *  always-visible arrows would be noise (entry cards, a log's date line). */
  armOnTap?: boolean;
};

/**
 * "Which day is this?" as a dial you nudge: ‹ Today ›. Built on shadcn's
 * ButtonGroup (one role="group", joined focus handling) with ghost buttons so
 * it reads as text until hovered. Tap the label to jump back to today. Used
 * for the composer's writing day, an entry's date, a log's date, and the
 * Today screen's day.
 */
export function DayControl({ value, onChange, className, armOnTap }: Props) {
  const [armed, setArmed] = useState(!armOnTap);
  const today = todayKey();
  return (
    <ButtonGroup aria-label='Day' className={cn('-ml-2 items-center', className)}>
      {armed && (
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          aria-label='Previous day'
          className='cursor-pointer [color:inherit] [&_svg]:size-[1em]'
          onClick={() => onChange(shiftDay(value, -1))}
        >
          <ChevronLeft />
        </Button>
      )}
      <Button
        type='button'
        variant='ghost'
        size='sm'
        className='h-auto cursor-pointer px-2 py-1 [color:inherit] [font-size:inherit] [font-weight:inherit] [letter-spacing:inherit]'
        title={armed && value !== today ? 'Back to today' : undefined}
        onClick={() => {
          if (!armed) setArmed(true);
          else if (value !== today) onChange(today);
          else if (armOnTap) setArmed(false);
        }}
      >
        {formatDay(value)}
      </Button>
      {armed && (
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          aria-label='Next day'
          className='cursor-pointer [color:inherit] [&_svg]:size-[1em]'
          disabled={value >= today}
          onClick={() => onChange(shiftDay(value, 1))}
        >
          <ChevronRight />
        </Button>
      )}
    </ButtonGroup>
  );
}
