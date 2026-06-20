import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { store } from '@/lib/store';
import type { Board as BoardType } from '@/types';
import { Board } from '@/routes/board';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-is-mobile';

export function Home() {
  const [boards, setBoards] = useState<BoardType[]>([]);
  const [newPrompt, setNewPrompt] = useState(
    'What are you grateful for today?'
  );
  const [createOpen, setCreateOpen] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Mobile open: render the destination board first (overlay, off-screen), then
  // slide it in with a pure transform — the same render-first engine as the
  // swipe-back. The board's layout cost is paid on mount (before the animation),
  // so the slide itself stays on the compositor with no mid-transition reflow.
  const [openingId, setOpeningId] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    store
      .init()
      .then(() => store.getBoards())
      .then(setBoards);
  }, []);

  useEffect(() => {
    if (!openingId) return;
    const overlay = overlayRef.current;
    const list = listRef.current;
    // Flush the off-screen start state once (upfront), then transition to rest.
    if (overlay) void overlay.offsetWidth;
    if (overlay) {
      overlay.style.transition = 'transform 160ms var(--ease-decelerate)';
      overlay.style.transform = 'translateX(0)';
    }
    if (list) {
      list.style.transition = 'transform 160ms var(--ease-decelerate)';
      list.style.transform = 'translateX(-48px)';
    }
    const t = window.setTimeout(
      () => navigate({ to: '/boards/$id', params: { id: openingId } }),
      170
    );
    return () => window.clearTimeout(t);
  }, [openingId, navigate]);

  function openBoard(id: string) {
    setOpeningId(id);
  }

  async function handleCreate() {
    await store.createBoard(newPrompt);
    setBoards(await store.getBoards());
    setCreateOpen(false);
    toast('Journal created!');
  }

  const triggerButton = (
    <Button
      variant='outline'
      size='icon-lg'
      className='fixed bottom-6 left-6 rounded-full cursor-pointer'
      aria-label='Create a new journal'
    >
      +
    </Button>
  );

  const body = (
    <>
      <Input value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} />
      <Button
        className='cursor-pointer bg-gray-700 hover:bg-gray-600 rounded-lg'
        onClick={handleCreate}
      >
        + Create New Journal
      </Button>
      <Separator className='my-4' />
      {templatePrompts.map((prompt, index) => (
        <div key={index} className='items-center grid grid-cols-3 my-2 group'>
          <div className='text-sm col-span-2 text-muted-foreground group-hover:text-gray-900 transition-colors'>
            {prompt}
          </div>
          <Button
            variant='secondary'
            size='sm'
            onClick={() => setNewPrompt(prompt)}
            className='rounded-full bg-[#FFFBEA] text-[#83591e] px-5 hover:bg-amber-100 transition-colors max-w-28 justify-self-end cursor-pointer'
          >
            Add
          </Button>
        </div>
      ))}
    </>
  );

  return (
    <>
      <div
        ref={listRef}
        className='max-w-4xl mx-auto flex flex-col min-h-screen gap-6 px-6 sm:px-8 pb-28'
      >
        <h1 className='sticky top-0 z-10 -mx-6 sm:-mx-8 px-6 sm:px-8 py-3 bg-[#FAF9F5]/80 backdrop-blur-sm scroll-m-20 text-2xl font-medium tracking-tight text-balance text-gray-800'>
          Your Journals
        </h1>
        <section id='boards' className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          {boards.map((board) => (
            <Link
              key={board.id}
              to='/boards/$id'
              params={{ id: board.id }}
              viewTransition={isMobile ? undefined : { types: ['card-morph'] }}
              onClick={(e) => {
                if (isMobile) {
                  // Hand-rolled slide; let plain nav run under reduced motion.
                  if (
                    window.matchMedia('(prefers-reduced-motion: reduce)').matches
                  )
                    return;
                  e.preventDefault();
                  openBoard(board.id);
                } else {
                  // Desktop: tag the tapped card for the shared-element morph.
                  e.currentTarget.style.viewTransitionName = 'journal-surface';
                }
              }}
            >
              <Card className='text-gray-800 w-full min-h-24 transition-[transform,box-shadow] duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]'>
                <CardContent>{board.prompt}</CardContent>
              </Card>
            </Link>
          ))}
        </section>

        {isMobile ? (
          <Drawer open={createOpen} onOpenChange={setCreateOpen}>
            <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className='text-left'>
                <DrawerTitle>Create a new journal</DrawerTitle>
                <DrawerDescription>
                  Pick a prompt to answer daily or use one of our templates.
                </DrawerDescription>
              </DrawerHeader>
              <div className='px-4 pb-8 space-y-4'>{body}</div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Popover open={createOpen} onOpenChange={setCreateOpen}>
            <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
            <PopoverContent
              className='w-md space-y-4'
              sideOffset={5}
              alignOffset={5}
              side='top'
              align='start'
            >
              <div className='space-y-2'>
                <h4 className='leading-none font-medium'>Create a new journal</h4>
                <p className='text-muted-foreground text-sm'>
                  Pick a prompt to answer daily or use one of our templates.
                </p>
              </div>
              {body}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Mobile open: the board, pre-rendered off-screen, then slid in. */}
      {openingId && (
        <div
          ref={overlayRef}
          className='fixed inset-0 z-30'
          style={{
            transform: 'translateX(100%)',
            boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.18)',
            willChange: 'transform',
          }}
        >
          <Board boardId={openingId} />
        </div>
      )}
    </>
  );
}

const templatePrompts = [
  'What are you grateful for today?',
  'What is your priority for today?',
  'What would you like to accomplish today?',
  'What good have you done today?',
];
