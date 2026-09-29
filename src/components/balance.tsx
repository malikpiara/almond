import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';
import { describeBalance } from '@/utils/utils';

// Within this many points of the middle, the dial settles on even: a soft
// detent so "about even" is easy to land on.
const CENTER_SNAP = 3;

/**
 * Who talked more, as a feeling: a two-sided dial from You to the other
 * person. It fills from the centre toward whoever talked more, because the
 * middle (even) is the reference point, not the left edge.
 */
export function BalanceSlider({
  value,
  onChange,
  name,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  name: string;
}) {
  const unset = value === null;
  const current = value ?? 50;
  const lo = Math.min(current, 50);
  const hi = Math.max(current, 50);

  function change([raw]: number[]) {
    const next = Math.abs(raw - 50) <= CENTER_SNAP ? 50 : raw;
    // A tiny haptic tick when you settle on even (Android; a no-op elsewhere).
    if (next === 50 && value !== 50) navigator.vibrate?.(8);
    onChange(next);
  }

  return (
    <div className='flex flex-col gap-2'>
      <SliderPrimitive.Root
        value={[current]}
        onValueChange={change}
        // Tapping the untouched dial right at the centre moves nothing, so no
        // change fires; set it here and let any real move override it.
        onPointerDown={() => {
          if (unset) onChange(50);
        }}
        min={0}
        max={100}
        step={1}
        className='relative flex h-6 w-full cursor-pointer touch-none items-center select-none'
      >
        {/* A shallow groove, so the white fill reads as the lit part. */}
        <SliderPrimitive.Track className='relative h-2 grow rounded-full bg-gray-200 shadow-[inset_0_1px_2px_rgba(17,24,39,0.08)]'>
          {!unset && (
            <span
              className='absolute inset-y-0 rounded-full bg-white ring-1 ring-inset ring-gray-300/60'
              style={{ left: `${lo}%`, width: `${hi - lo}%` }}
            />
          )}
        </SliderPrimitive.Track>
        <span
          aria-hidden
          className='pointer-events-none absolute top-1/2 left-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-gray-400'
        />
        <SliderPrimitive.Thumb
          aria-label='Who talked more'
          aria-valuetext={describeBalance(value, name)}
          // A white knob: it sits flat until the dial is set, then lifts.
          className={cn(
            'block size-5 rounded-full border bg-white outline-none transition-[border-color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50',
            unset
              ? 'border-gray-200'
              : 'border-gray-300 shadow-[0_1px_3px_rgba(17,24,39,0.18)]'
          )}
        />
      </SliderPrimitive.Root>
      <div className='flex justify-between gap-4 text-xs text-gray-500'>
        <span>You</span>
        <span className='min-w-0 truncate'>{name}</span>
      </div>
    </div>
  );
}

/** The dial in miniature, for lists: where the balance sat, at a glance. */
export function BalanceGlyph({
  value,
  name,
}: {
  value: number | null;
  name: string;
}) {
  if (value === null) return null;
  const lo = Math.min(value, 50);
  const hi = Math.max(value, 50);
  const label = describeBalance(value, name);
  return (
    <span
      role='img'
      aria-label={label}
      title={label}
      className='relative inline-block h-1.5 w-12 shrink-0 rounded-full bg-gray-200 shadow-[inset_0_1px_1px_rgba(17,24,39,0.08)]'
    >
      <span
        className='absolute inset-y-0 rounded-full bg-white'
        style={{ left: `${lo}%`, width: `${hi - lo}%` }}
      />
      <span className='absolute top-1/2 left-1/2 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-gray-400' />
      <span
        className='absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gray-300 bg-white shadow-[0_1px_2px_rgba(17,24,39,0.15)]'
        style={{ left: `${value}%` }}
      />
    </span>
  );
}
