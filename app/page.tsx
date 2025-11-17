'use client';

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
import {
  ExportData,
  generateBoardId,
  generateEntryId,
  ImportData,
} from '@/utils/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  entities?: {
    people: string[];
    places: string[];
  };
};

const formSchema = z.object({
  description: z
    .string()
    .min(10, 'Your answer must be at least 10 characters.')
    .max(3000, 'Your answer must be at most 3000 characters.'),
});

export default function Form() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
    },
  });

  const [entries, setEntries] = useState<Entry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsAnalyzing(true);

    try {
      // Extract entities from the journal entry
      const response = await fetch('/api/extract-entities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: data.description }),
      });

      const entities = await response.json();

      const savedData = localStorage.getItem('user-data');
      const userData: UserData = savedData
        ? JSON.parse(savedData)
        : { boards: [], entries: [] };
      const boardId = userData.boards[0].id;

      const newEntry: Entry = {
        id: generateEntryId(),
        boardId: boardId,
        content: data.description,
        timestamp: Date.now(),
        isDeleted: false,
        entities: {
          people: entities.people || [],
          places: entities.places || [],
        },
      };

      const updatedData: UserData = {
        boards: userData.boards,
        entries: [newEntry, ...userData.entries],
      };

      setEntries(updatedData.entries);
      localStorage.setItem('user-data', JSON.stringify(updatedData));

      toast('Entry saved!');
      form.reset();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast('Error saving entry');
    } finally {
      setIsAnalyzing(false);
    }
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
                    placeholder={`Take a moment to reflect — what's something you feel grateful for today?`}
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
          <Button
            type='submit'
            variant='outline'
            form='form-rhf-demo'
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing...' : 'Submit'}
          </Button>
        </Field>
      </form>
      <section id='entries' className='flex flex-col space-y-4 w-full'>
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
                      <DropdownMenuLabel>People</DropdownMenuLabel>

                      {entry.entities?.people?.map((person, index) => (
                        <DropdownMenuItem key={index}>
                          {person}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Places</DropdownMenuLabel>

                      {entry.entities?.places?.map((places, index) => (
                        <DropdownMenuItem key={index}>
                          {places}
                        </DropdownMenuItem>
                      ))}

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        className='cursor-pointer'
                        onClick={() => deleteEntry(entry.id)}
                      >
                        Delete this entry
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardFooter>
            </Card>
          ))}
      </section>
      <section id='import-export' className='fixed right-2 bottom-2'>
        <Button
          variant='ghost'
          className='cursor-pointer'
          onClick={() => ImportData()}
        >
          Import
        </Button>

        <Button
          variant='ghost'
          className='cursor-pointer'
          onClick={async () => {
            const result = await ExportData();
            toast(result.message);
          }}
        >
          Export
        </Button>
      </section>
    </div>
  );
}
