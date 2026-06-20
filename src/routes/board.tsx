import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
import { MoreHorizontalIcon, ArrowLeft, Feather } from 'lucide-react';

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
import { useOpenSync } from '@/lib/sync-ui';
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
  const openSync = useOpenSync();
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
        {isMobile && openSync ? (
          <>
            <DropdownMenuItem
              className='cursor-pointer'
              onClick={() => openSync()}
            >
              Sync
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
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

  if (isMobile) {
    // Mobile: a chat-style app shell — fixed header, a column-reverse message
    // area (rests at the bottom by itself, no scroll scripting), composer footer.
    return (
      <div className='flex h-dvh flex-col' {...swipeBack}>
        <div className='shrink-0 flex items-center gap-1 bg-[#FAF9F5] px-3 py-2'>
          <Link
            to='/journals'
            aria-label='Back to journals'
            className='shrink-0 p-1 text-gray-500 hover:text-gray-800 cursor-pointer'
          >
            <ArrowLeft className='h-5 w-5' />
          </Link>
          <h1 className='min-w-0 flex-1 truncate text-center text-base font-medium text-gray-800'>
            {board.prompt}
          </h1>
          {journalMenu}
        </div>

        {/* column-reverse: newest entry (rendered first) lands at the bottom and
            the scroll naturally rests there — the chat-app trick, no JS scroll. */}
        <div
          id='entries'
          className='flex min-h-0 flex-1 flex-col-reverse overflow-y-auto px-4'
        >
          {entries.map((entry, index) => (
            <article
              key={entry.id}
              className={`py-5 text-gray-800${
                index < entries.length - 1 ? ' border-t border-gray-200' : ''
              }`}
            >
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
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='shrink-0 bg-[#FAF9F5] px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]'
        >
          <Controller
            name='description'
            control={form.control}
            render={({ field, fieldState }) => (
              <>
                {fieldState.invalid && fieldState.error && (
                  <p className='px-3 pb-1 text-sm text-destructive'>
                    {fieldState.error.message}
                  </p>
                )}
                {isAnalyzing && (
                  <p className='px-3 pb-1 text-sm text-gray-500'>
                    Tagging people and places…
                  </p>
                )}
                <div className='flex items-end gap-1.5 rounded-3xl border border-gray-200 bg-white py-1.5 pl-4 pr-1.5 focus-within:ring-2 focus-within:ring-gray-300'>
                  <textarea
                    {...field}
                    rows={1}
                    placeholder='Take a moment to reflect…'
                    aria-invalid={fieldState.invalid}
                    className='flex-1 resize-none bg-transparent py-1.5 text-base leading-snug max-h-32 [field-sizing:content] focus:outline-none'
                  />
                  <Button
                    type='submit'
                    size='icon'
                    disabled={!field.value?.trim()}
                    aria-label='Save entry'
                    className='size-9 shrink-0 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-40'
                  >
                    <Feather className='size-[18px]' />
                  </Button>
                </div>
              </>
            )}
          />
        </form>

        {/* Entry options sheet (mirrors the desktop dropdown 1:1). */}
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

  // Desktop: original centered column, fixed-corner controls, inline form, cards.
  return (
    <div className='max-w-3xl m-auto items-center justify-center flex flex-col min-h-screen gap-12 px-8 pb-28'>
      <Link
        to='/journals'
        className='fixed left-6 top-4 text-sm text-gray-500 hover:text-gray-800 cursor-pointer'
      >
        ← Journals
      </Link>
      <div className='fixed right-6 top-3'>{journalMenu}</div>

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
        <Field orientation='horizontal'>
          <Button type='submit' variant='outline' form='form-rhf-demo'>
            Submit
          </Button>
          {isAnalyzing && (
            <span className='text-sm text-gray-500 self-center'>
              Tagging people and places…
            </span>
          )}
        </Field>
      </form>

      <section id='entries' className='flex flex-col gap-4 w-full'>
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
    </div>
  );
}
