import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
import { MoreHorizontalIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
      <div className='max-w-2xl mx-auto flex flex-col min-h-screen justify-center gap-6 px-6 sm:px-8'>
        <h1 className='scroll-m-20 text-2xl font-medium tracking-tight text-balance text-gray-800'>
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
    <div className='max-w-2xl mx-auto flex flex-col min-h-screen gap-8 px-4 sm:px-8 pb-28'>
      <div className='sticky top-0 z-10 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 flex items-center justify-between bg-[#FAF9F5]/80 backdrop-blur-sm'>
        <Link
          to='/journals'
          className='text-sm text-gray-500 hover:text-gray-800 cursor-pointer py-2 pr-2'
        >
          ← Journals
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
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
                <h1 className='scroll-m-20 text-xl sm:text-2xl font-medium tracking-tight text-balance text-gray-800'>
                  {board.prompt}
                </h1>
                <InputGroup>
                  <InputGroupTextarea
                    {...field}
                    id='form-rhf-demo-description'
                    placeholder='Take a moment to reflect…'
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
        <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
          <Button
            type='submit'
            form='form-rhf-demo'
            className='w-full sm:w-auto cursor-pointer bg-gray-700 hover:bg-gray-600'
          >
            Submit
          </Button>
          {isAnalyzing && (
            <span className='text-sm text-gray-500'>
              Tagging people &amp; places…
            </span>
          )}
        </div>
      </form>

      <section id='entries' className='divide-y divide-gray-200'>
        {entries.map((entry) => (
          <article key={entry.id} className='py-5 text-gray-800'>
            <p className='whitespace-pre-line leading-relaxed'>
              {entry.content}
            </p>
            <div className='mt-2 flex items-center justify-between text-sm text-gray-400'>
              <span>
                {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
              </span>
              <DropdownMenu modal={true}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='cursor-pointer h-8 w-8'
                    aria-label='Entry options'
                  >
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
                  {entry.entities?.places?.map((place, index) => (
                    <DropdownMenuItem key={index}>{place}</DropdownMenuItem>
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
          </article>
        ))}
      </section>
    </div>
  );
}
