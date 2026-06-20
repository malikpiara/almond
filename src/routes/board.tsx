import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
import { MoreHorizontalIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { InputGroup, InputGroupTextarea } from '@/components/ui/input-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { store } from '@/lib/store';
import { extractEntities } from '@/lib/api';
import type { Board as BoardType, Entry } from '@/types';

const formSchema = z.object({
  description: z
    .string()
    .min(10, 'Your answer must be at least 10 characters.')
    .max(3000, 'Your answer must be at most 3000 characters.'),
});

export function Board() {
  const { id: boardId } = useParams({ from: '/boards/$id' });
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
    },
  });

  const [board, setBoard] = useState<BoardType | undefined>(undefined);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    localStorage.setItem('almond-last-board', boardId); // land-in-writing
    let active = true;
    (async () => {
      await store.init();
      const [b, e] = await Promise.all([
        store.getBoard(boardId),
        store.getEntries(boardId),
      ]);
      if (!active) return;
      setBoard(b);
      setEntries(e);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [boardId]);

  async function deleteEntry(id: string) {
    await store.deleteEntry(id);
    setEntries(await store.getEntries(boardId));
  }

  async function onSubmit(data: z.infer<typeof formSchema>) {
    const content = data.description;
    try {
      // Save first — instant reward, no waiting on the AI.
      const entry = await store.createEntry(boardId, content);
      setEntries(await store.getEntries(boardId));
      toast('Entry saved!');
      form.reset();

      // Enrich with people/places in the background; patch the entry when it
      // lands. extractEntities never throws (empty on failure).
      setIsAnalyzing(true);
      void extractEntities(content)
        .then(async (entities) => {
          if (entities.people.length || entities.places.length) {
            await store.setEntryEntities(entry.id, entities);
            setEntries(await store.getEntries(boardId));
          }
        })
        .finally(() => setIsAnalyzing(false));
    } catch (error) {
      console.error('Error saving entry:', error);
      toast('Error saving entry');
    }
  }

  if (loading) {
    return null;
  }

  if (!board) {
    return (
      <div className='max-w-4xl flex flex-col min-h-screen gap-8 px-8'>
        <h1 className='scroll-m-20 text-2xl font-medium tracking-tight text-balance text-gray-800 mt-20'>
          Journal not found
        </h1>
        <p className='text-gray-500'>
          The journal you requested does not exist or was deleted.
        </p>
        <Link to='/journals'>
          <Button>Back to journals</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className='max-w-3xl m-auto items-center justify-center flex flex-col min-h-screen gap-12'>
      <Link
        to='/journals'
        className='fixed left-6 top-4 text-sm text-gray-500 hover:text-gray-800 cursor-pointer'
      >
        ← Journals
      </Link>
      <div className='fixed right-6 top-3'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              className='cursor-pointer text-gray-500'
              aria-label='Journal options'
            >
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem
              className='cursor-pointer'
              onClick={async () => {
                if (
                  confirm(
                    'Delete this journal? Its entries will be hidden too.'
                  )
                ) {
                  await store.deleteBoard(boardId);
                  navigate({ to: '/journals' });
                }
              }}
            >
              Delete this journal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
                  {board.prompt}
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
          <Button type='submit' variant='outline' form='form-rhf-demo'>
            Submit
          </Button>
          {isAnalyzing && (
            <span className='text-sm text-gray-500 self-center'>
              Tagging people &amp; places…
            </span>
          )}
        </Field>
      </form>
      <section id='entries' className='flex flex-col space-y-4 w-full'>
        {entries.map((entry) => (
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
                      <DropdownMenuItem key={index}>{person}</DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Places</DropdownMenuLabel>

                    {entry.entities?.places?.map((places, index) => (
                      <DropdownMenuItem key={index}>{places}</DropdownMenuItem>
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
    </div>
  );
}
