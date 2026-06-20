import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { store } from '@/lib/store';
import type { Board } from '@/types';
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
  const [boards, setBoards] = useState<Board[]>([]);
  const [newPrompt, setNewPrompt] = useState(
    'What are you grateful for today?'
  );
  const [createOpen, setCreateOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    store
      .init()
      .then(() => store.getBoards())
      .then(setBoards);
  }, []);

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
      <Input
        value={newPrompt}
        onChange={(e) => setNewPrompt(e.target.value)}
      />
      <Button
        className='cursor-pointer bg-gray-700 hover:bg-gray-600 rounded-lg'
        onClick={handleCreate}
      >
        + Create New Journal
      </Button>
      <Separator className='my-4' />
      {templatePrompts.map((prompt, index) => (
        <div
          key={index}
          className='items-center grid grid-cols-3 my-2 group'
        >
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
    <div className='max-w-4xl mx-auto flex flex-col min-h-screen gap-6 px-6 sm:px-8 pb-28'>
      <h1 className='sticky top-0 z-10 -mx-6 sm:-mx-8 px-6 sm:px-8 py-3 bg-[#FAF9F5]/80 backdrop-blur-sm scroll-m-20 text-2xl font-medium tracking-tight text-balance text-gray-800'>
        Your Journals
      </h1>
      <section id='boards' className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        {boards.map((board) => (
          <Link
            key={board.id}
            to='/boards/$id'
            params={{ id: board.id }}
            viewTransition={{ types: [isMobile ? 'slide-forward' : 'card-morph'] }}
            onClick={(e) => {
              // Desktop: this card morphs into the board surface. Tag only the
              // tapped card so the shared name is unique in the snapshot.
              if (!isMobile)
                e.currentTarget.style.viewTransitionName = 'journal-surface';
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
  );
}

const templatePrompts = [
  'What are you grateful for today?',
  'What is your priority for today?',
  'What would you like to accomplish today?',
  'What good have you done today?',
];
