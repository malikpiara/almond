'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { generateBoardId, generateEntryId } from '@/utils/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { MoreHorizontalIcon } from 'lucide-react';

type UserData = {
  boards: Board[];
  entries: Entry[];
};

type Board = {
  id: string;
  prompt: string;
  createdAt: number; // This is essentially just a timestamp.
  isDeleted: boolean;
};

type Entry = {
  id: string;
  boardId: string;
  content: string;
  timestamp: number;
  isDeleted: boolean;
};

const formSchema = z.object({
  description: z
    .string()
    .min(10, 'Your answer must be at least 10 characters.')
    .max(1000, 'Your answer must be at most 1000 characters.'),
});

export default function Form() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
    },
  });

  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    const savedData = localStorage.getItem('user-data');

    if (savedData) {
      const data: UserData = JSON.parse(savedData);
      setEntries(data.entries);
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

  function deleteEntry(id: string) {
    const savedData = localStorage.getItem('user-data');
    const userData: UserData = savedData
      ? JSON.parse(savedData)
      : { boards: [], entries: [] };

    const updatedEntries = userData.entries.map((entry) => {
      if (entry.id === id) {
        return { ...entry, isDeleted: true };
      }
      return entry;
    });

    const updatedData: UserData = {
      boards: userData.boards,
      entries: updatedEntries,
    };

    setEntries(updatedData.entries);
    localStorage.setItem('user-data', JSON.stringify(updatedData));
  }

  function onSubmit(data: z.infer<typeof formSchema>) {
    const savedData = localStorage.getItem('user-data');
    const userData: UserData = savedData
      ? JSON.parse(savedData)
      : { boards: [], entries: [] };
    const boardId = userData.boards[0].id;

    const newEntry: Entry = {
      id: generateEntryId(),
      boardId: boardId,
      content: data.description,
      // eslint-disable-next-line react-hooks/purity
      timestamp: Date.now(),
      isDeleted: false,
    };

    const updatedData: UserData = {
      boards: userData.boards,
      entries: [newEntry, ...userData.entries],
    };

    setEntries(updatedData.entries);
    localStorage.setItem('user-data', JSON.stringify(updatedData));

    toast('Entry saved!');
    form.reset();
  }

  return (
    <div className='max-w-3xl m-auto items-center justify-center flex flex-col min-h-screen gap-12'>
      <form
        id='form-rhf-demo'
        className='space-y-4 w-full'
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FieldGroup>
          <Controller
            name='description'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <h1 className='scroll-m-20 text-2xl font-medium tracking-tight text-balance text-gray-800 mt-20'>
                  What are you grateful for today?
                </h1>
                <InputGroup>
                  <InputGroupTextarea
                    {...field}
                    id='form-rhf-demo-description'
                    placeholder='Take a moment to reflect — what’s something you feel grateful for today?'
                    className='min-h-32 resize-none rounded-lg bg-white !text-lg'
                    aria-invalid={fieldState.invalid}
                  />
                </InputGroup>

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>
        <Field orientation='horizontal'>
          <Button type='submit' variant='outline' form='form-rhf-demo'>
            Submit
          </Button>
        </Field>
      </form>
      <div className='flex flex-col space-y-4 w-full'>
        {entries
          ?.filter((entry) => !entry.isDeleted)
          .map((entry) => (
            <Card key={entry.id} className='rounded-md text-gray-800'>
              <CardContent className='whitespace-pre-line'>
                {entry.content}
              </CardContent>
              <CardFooter className='text-sm opacity-60 justify-between'>
                {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                <div>
                  <DropdownMenu modal={true}>
                    <DropdownMenuTrigger asChild>
                      <Button variant='ghost' className='cursor-pointer'>
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='w-56'>
                      <DropdownMenuItem
                        className='cursor-pointer'
                        onClick={() => deleteEntry(entry.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardFooter>
            </Card>
          ))}
      </div>
    </div>
  );
}
