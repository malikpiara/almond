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
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export function Home() {
  const [boards, setBoards] = useState<Board[]>([]);

  const [newPrompt, setNewPrompt] = useState(
    'What are you grateful for today?'
  );

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    store
      .init()
      .then(() => store.getBoards())
      .then(setBoards);
  }, []);

  async function handleCreate() {
    await store.createBoard(newPrompt);
    setBoards(await store.getBoards());
    setIsPopoverOpen(false);
    toast('Board created!');
  }

  return (
    <div className='max-w-4xl flex flex-col min-h-screen gap-8 px-8'>
      <h1 className='scroll-m-20 text-2xl font-medium tracking-tight text-balance text-gray-800 mt-10'>
        Your Journals
      </h1>
      <section id='boards' className='grid grid-cols-2 gap-4'>
        {boards.map((board) => (
          <Link key={board.id} to='/boards/$id' params={{ id: board.id }}>
            <Card className='rounded-md text-gray-800 w-92 h-24'>
              <CardContent>{board.prompt}</CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            size={'icon-lg'}
            className='fixed bottom-6 left-6 rounded-full cursor-pointer'
          >
            +
          </Button>
        </PopoverTrigger>
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
          <div>
            <div>
              <Input
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                className='col-span-2 h-8'
              />
            </div>
          </div>
          <Button
            className='cursor-pointer  bg-gray-700 hover:bg-gray-600 rounded-lg'
            onClick={handleCreate}
          >
            + Create New Journal
          </Button>
          <Separator className='my-4' />
          {templatePrompts.map((prompt, index) => {
            return (
              <div
                key={index}
                className='items-center grid grid-cols-3 my-2 group'
              >
                <div className='text-sm col-span-2 text-muted-foreground group-hover:text-gray-900 transition-colors'>
                  {prompt}
                </div>
                <Button
                  variant={'secondary'}
                  size={'sm'}
                  onClick={() => {
                    setNewPrompt(prompt);
                  }}
                  className='rounded-full bg-[#FFFBEA] text-[#83591e] px-5 hover:bg-amber-100 transition-colors max-w-28 justify-self-end cursor-pointer'
                >
                  Add
                </Button>
              </div>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}

const templatePrompts = [
  'What are you grateful for today?',
  'What is your priority for today?',
  'What would you like to accomplish today?',
  'What good have you done today?',
];
