import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import { store } from '@/lib/store';
import type { Board } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ResponsiveDialog } from '@/components/responsive-dialog';

export function Home() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [newPrompt, setNewPrompt] = useState(
    'What are you grateful for today?'
  );
  const [createOpen, setCreateOpen] = useState(false);

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

  return (
    <div className='max-w-4xl mx-auto flex flex-col min-h-screen gap-6 px-6 sm:px-8 pb-28'>
      <h1 className='sticky top-0 z-10 -mx-6 sm:-mx-8 px-6 sm:px-8 py-4 bg-[#FAF9F5]/80 backdrop-blur-sm scroll-m-20 text-2xl font-medium tracking-tight text-balance text-gray-800'>
        Your Journals
      </h1>
      <section id='boards' className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        {boards.map((board) => (
          <Link key={board.id} to='/boards/$id' params={{ id: board.id }}>
            <Card className='rounded-md text-gray-800 w-full h-24'>
              <CardContent>{board.prompt}</CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <Button
        variant='outline'
        size='icon-lg'
        className='fixed bottom-6 left-6 rounded-full cursor-pointer shadow-sm'
        aria-label='Create a new journal'
        onClick={() => setCreateOpen(true)}
      >
        +
      </Button>

      <ResponsiveDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title='Create a new journal'
        description='Pick a prompt to answer daily, or start from a template.'
      >
        <div className='space-y-4'>
          <Input
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            className='h-11'
            placeholder='What are you grateful for today?'
          />
          <Button
            className='w-full cursor-pointer bg-gray-700 hover:bg-gray-600'
            onClick={handleCreate}
          >
            Create journal
          </Button>

          <Separator />

          <div className='space-y-1'>
            {templatePrompts.map((prompt) => (
              <button
                key={prompt}
                type='button'
                onClick={() => setNewPrompt(prompt)}
                className='w-full flex items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer'
              >
                <span className='flex-1'>{prompt}</span>
                <span className='shrink-0 rounded-full bg-[#FFFBEA] text-[#83591e] px-3 py-1 text-xs'>
                  Use
                </span>
              </button>
            ))}
          </div>
        </div>
      </ResponsiveDialog>
    </div>
  );
}

const templatePrompts = [
  'What are you grateful for today?',
  'What is your priority for today?',
  'What would you like to accomplish today?',
  'What good have you done today?',
];
