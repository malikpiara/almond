import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
import { MoreHorizontalIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useSwipeBack } from '@/hooks/use-swipe-back';
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

  const [optionsEntry, setOptionsEntry] = useState<Entry | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const isMobile = useIsMobile();
  const swipeBack = useSwipeBack(
    () => navigate({ to: '/journals' }),
    isMobile
  );

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

  const journalMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='cursor-pointer text-gray-500 h-11 w-11 sm:h-9 sm:w-9'
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
              confirm('Delete this journal? Its entries will be hidden too.')
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
  );

  return (
    <div
      className={
        isMobile
          ? 'flex flex-col min-h-screen gap-8 px-4 pb-28'
          : 'max-w-3xl m-auto items-center justify-center flex flex-col min-h-screen gap-12 px-8 pb-28'
      }
      {...swipeBack}
    >
      {isMobile ? (
        // Mobile: sticky translucent header bar.
        <div className='sticky top-0 z-10 -mx-4 px-4 py-3 flex items-center justify-between bg-[#FAF9F5]/80 backdrop-blur-sm'>
          <Link
            to='/journals'
            className='text-sm text-gray-500 hover:text-gray-800 cursor-pointer'
          >
            ← Journals
          </Link>
          {journalMenu}
        </div>
      ) : (
        // Desktop: fixed corner controls (original layout).
        <>
          <Link
            to='/journals'
            className='fixed left-6 top-4 text-sm text-gray-500 hover:text-gray-800 cursor-pointer'
          >
            ← Journals
          </Link>
          <div className='fixed right-6 top-3'>{journalMenu}</div>
        </>
      )}

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
                <h1 className='scroll-m-20 text-2xl font-medium tracking-tight text-balance text-gray-800 sm:mt-20'>
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
          <Button type='submit' variant='outline' form='form-rhf-demo'>
            Submit
          </Button>
          {isAnalyzing && (
            <span className='text-sm text-gray-500'>
              Tagging people and places…
            </span>
          )}
        </div>
      </form>

      {/* Desktop: cards (your original treatment). Mobile: full-bleed divider rows. */}
      {isMobile ? (
        <section id='entries' className='-mx-4 divide-y divide-gray-200'>
          {entries.map((entry) => (
            <article key={entry.id} className='px-4 py-5 text-gray-800'>
              <p className='whitespace-pre-line leading-relaxed'>
                {entry.content}
              </p>
              <div className='mt-2 flex items-center justify-between text-sm text-gray-400'>
                <span>
                  {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                </span>
                <Button
                  variant='ghost'
                  size='icon'
                  className='cursor-pointer h-11 w-11'
                  aria-label='Entry options'
                  onClick={() => {
                    setOptionsEntry(entry);
                    setOptionsOpen(true);
                  }}
                >
                  <MoreHorizontalIcon />
                </Button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section id='entries' className='flex flex-col gap-4'>
          {entries.map((entry) => (
            <Card key={entry.id} className='text-gray-800'>
              <CardContent>
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
                      {entry.entities?.people?.length ? (
                        <>
                          <DropdownMenuLabel>People</DropdownMenuLabel>
                          {entry.entities.people.map((person, index) => (
                            <DropdownMenuItem key={index}>
                              {person}
                            </DropdownMenuItem>
                          ))}
                        </>
                      ) : null}
                      {entry.entities?.places?.length ? (
                        <>
                          {entry.entities?.people?.length ? (
                            <DropdownMenuSeparator />
                          ) : null}
                          <DropdownMenuLabel>Places</DropdownMenuLabel>
                          {entry.entities.places.map((place, index) => (
                            <DropdownMenuItem key={index}>
                              {place}
                            </DropdownMenuItem>
                          ))}
                        </>
                      ) : null}
                      {entry.entities?.people?.length ||
                      entry.entities?.places?.length ? (
                        <DropdownMenuSeparator />
                      ) : null}
                      <DropdownMenuItem
                        className='cursor-pointer'
                        onClick={() => deleteEntry(entry.id)}
                      >
                        Delete this entry
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* Mobile-only sheet that mirrors the desktop dropdown 1:1 — same
          label, item, and separator classes; no invented styling. */}
      <Drawer open={optionsOpen} onOpenChange={setOptionsOpen}>
        <DrawerContent>
          <DrawerHeader className='sr-only'>
            <DrawerTitle>Entry options</DrawerTitle>
          </DrawerHeader>
          {optionsEntry && (
            <div className='px-4 pb-8 pt-2'>
              {optionsEntry.entities?.people?.length ? (
                <>
                  <div className='px-2 py-1.5 text-sm font-medium'>People</div>
                  {optionsEntry.entities.people.map((person, index) => (
                    <div
                      key={index}
                      className='relative flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm'
                    >
                      {person}
                    </div>
                  ))}
                </>
              ) : null}
              {optionsEntry.entities?.places?.length ? (
                <>
                  {optionsEntry.entities?.people?.length ? (
                    <div className='bg-border -mx-1 my-1 h-px' />
                  ) : null}
                  <div className='px-2 py-1.5 text-sm font-medium'>Places</div>
                  {optionsEntry.entities.places.map((place, index) => (
                    <div
                      key={index}
                      className='relative flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm'
                    >
                      {place}
                    </div>
                  ))}
                </>
              ) : null}
              {optionsEntry.entities?.people?.length ||
              optionsEntry.entities?.places?.length ? (
                <div className='bg-border -mx-1 my-1 h-px' />
              ) : null}
              <button
                type='button'
                className='relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm focus:bg-accent focus:text-accent-foreground hover:bg-accent'
                onClick={() => {
                  if (!optionsEntry) return;
                  const id = optionsEntry.id;
                  setOptionsOpen(false);
                  deleteEntry(id);
                }}
              >
                Delete this entry
              </button>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
