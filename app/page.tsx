'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { generateBoardId } from '@/utils/utils';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UserData, Board } from '@/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Boards() {
  const [boards, setBoards] = useState<Board[]>([]);

  const [newPrompt, setNewPrompt] = useState(
    'What are you grateful for today?'
  );

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem('user-data');

    if (savedData) {
      const data: UserData = JSON.parse(savedData);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBoards(data.boards);
    } else {
      // First time - create default board
      const defaultBoard: Board = {
        id: generateBoardId(),
        prompt: 'What are you grateful for today?',
        createdAt: Date.now(),
        isDeleted: false,
      };

      const initialData: UserData = {
        boards: [defaultBoard],
        entries: [],
      };

      localStorage.setItem('user-data', JSON.stringify(initialData));
    }
  }, []);
  return (
    <div className='max-w-4xl flex flex-col min-h-screen gap-8 px-8'>
      <h1 className='scroll-m-20 text-2xl font-medium tracking-tight text-balance text-gray-800 mt-20'>
        Your Journals
      </h1>
      <section id='boards' className='grid grid-cols-2 gap-4'>
        {boards
          ?.filter((board) => !board.isDeleted)
          .map((board) => (
            <Link key={board.id} href={`boards/${board.id}`}>
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
          className='w-80 space-y-4'
          sideOffset={5}
          alignOffset={5}
          side='top'
          align='start'
        >
          <div className='space-y-2'>
            <h4 className='leading-none font-medium'>Create a new journal</h4>
            <p className='text-muted-foreground text-sm'>
              Pick a prompt to answer daily.
            </p>
          </div>
          <div className='grid gap-2'>
            <div className='items-center gap-4'>
              <Input
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                className='col-span-2 h-8'
              />
            </div>
          </div>
          <Button
            className='cursor-pointer  bg-gray-700 hover:bg-gray-600'
            onClick={() => {
              const newBoard: Board = {
                id: generateBoardId(),
                prompt: newPrompt,
                createdAt: Date.now(),
                isDeleted: false,
              };

              const savedData = localStorage.getItem('user-data');
              const userData: UserData = savedData
                ? JSON.parse(savedData)
                : { boards: [], entries: [] };

              const updatedData: UserData = {
                boards: [...userData.boards, newBoard],
                entries: [...userData.entries],
              };

              setBoards(updatedData.boards);
              localStorage.setItem('user-data', JSON.stringify(updatedData));

              toast('Board created!');
            }}
          >
            + Create New Journal
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
