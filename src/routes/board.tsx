import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useParams } from '@tanstack/react-router';
import { MoreHorizontalIcon } from 'lucide-react';

import { ImportModal } from '@/components/import-modal';
import { ExportModal } from '@/components/export-modal';
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
import { exportData, importData, selectImportFile } from '@/utils/utils';
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
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function refresh() {
    const [b, e] = await Promise.all([
      store.getBoard(boardId),
      store.getEntries(boardId),
    ]);
    setBoard(b);
    setEntries(e);
  }

  useEffect(() => {
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
    setIsAnalyzing(true);

    try {
      // Extract entities (people/places); resolves to empty when the
      // extraction backend is unavailable, so the entry always saves.
      const entities = await extractEntities(data.description);

      await store.createEntry(boardId, data.description, entities);
      setEntries(await store.getEntries(boardId));

      toast('Entry saved!');
      form.reset();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast('Error saving entry');
    } finally {
      setIsAnalyzing(false);
    }
  }

  const handleExportConfirm = async (password: string) => {
    const result = await exportData(password);
    toast(result.message);
    setExportModalOpen(false);
  };

  const handleImportConfirm = async (password: string) => {
    if (!selectedFile) return;

    const result = await importData(selectedFile, password);

    if (result.success) {
      toast.success(result.message);
      setImportModalOpen(false);
      await refresh(); // re-read from the store instead of a full reload
    } else {
      toast.error(result.message);
      // Modal stays open for retry
    }
  };

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
        <Link to='/'>
          <Button>Back to journals</Button>
        </Link>
      </div>
    );
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
      <section id='import-export' className='fixed right-2 bottom-2'>
        <Button
          variant='ghost'
          className='cursor-pointer'
          onClick={async () => {
            const file = await selectImportFile();
            if (file) {
              setSelectedFile(file);
              setImportModalOpen(true);
            }
          }}
        >
          Import
        </Button>

        <Button
          variant='ghost'
          className='cursor-pointer'
          onClick={() => setExportModalOpen(true)}
        >
          Export
        </Button>
      </section>

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onConfirm={handleExportConfirm}
      />
      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        file={selectedFile}
        onConfirm={handleImportConfirm}
      />
    </div>
  );
}
