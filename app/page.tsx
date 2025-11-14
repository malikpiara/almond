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
import { generateEntryId } from '@/utils/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { MoreHorizontalIcon } from 'lucide-react';

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
    const savedEntries = localStorage.getItem('journal-entries');
    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    }
  }, []);

  function deleteEntry(id: string) {
    const updatedEntries = entries.map((entry) => {
      if (entry.id === id) {
        return { ...entry, isDeleted: true };
      }
      return entry;
    });

    setEntries(updatedEntries);
    localStorage.setItem('journal-entries', JSON.stringify(updatedEntries));
  }

  function onSubmit(data: z.infer<typeof formSchema>) {
    const newEntry = {
      id: generateEntryId(),
      content: data.description,
      // eslint-disable-next-line react-hooks/purity
      timestamp: Date.now(),
      isDeleted: false,
    };
    const newEntries = [newEntry, ...entries];
    setEntries(newEntries); // Update React state
    localStorage.setItem('journal-entries', JSON.stringify(newEntries)); // Save to localStorage

    toast('You submitted the following values:', {
      description: (
        <pre className='bg-code text-code-foreground mt-2 w-[320px] overflow-x-auto rounded-md p-4'>
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
      position: 'bottom-right',
      classNames: {
        content: 'flex flex-col gap-2',
      },
      style: {
        '--border-radius': 'calc(var(--radius)  + 4px)',
      } as React.CSSProperties,
    });

    form.reset(); // clearing the form
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
              <CardContent>{entry.content}</CardContent>
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
