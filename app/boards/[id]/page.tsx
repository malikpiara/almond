'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { use, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ImportModal } from '@/components/import-modal';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { InputGroup, InputGroupTextarea } from '@/components/ui/input-group';
import {
  exportData,
  generateBoardId,
  generateEntryId,
  importData,
  selectImportFile,
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
import { ExportModal } from '@/components/export-modal';
import Link from 'next/link';
import { UserData, Board, Entry } from '@/types';

const formSchema = z.object({
  description: z
    .string()
    .min(10, 'Your answer must be at least 10 characters.')
    .max(3000, 'Your answer must be at most 3000 characters.'),
});

export default function BoardPages({ params }: { params: { id: string } }) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: '',
    },
  });

  const [boards, setBoards] = useState<Board[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);

  // @ts-expect-error: We need to refactor this and maybe create a client component for the UI stuff.
  const { id: boardId } = use(params);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const savedData = localStorage.getItem('user-data');

    if (savedData) {
      const data: UserData = JSON.parse(savedData);
      setBoards(data.boards);
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
  }, [boardId]);

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

      const boardId = foundBoard!.id; //I should fix this assertion.
      const newEntry: Entry = {
        id: generateEntryId(),
        boardId,
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
      window.location.reload(); // Reload to show the imported data
    } else {
      toast.error(result.message);
      // Modal stays open for retry
    }
  };

  const foundBoard = boards.find(
    (b: Board) => b.id === boardId && !b.isDeleted
  );

  if (!foundBoard) {
    return (
      <div className='max-w-4xl flex flex-col min-h-screen gap-8 px-8'>
        <h1 className='scroll-m-20 text-2xl font-medium tracking-tight text-balance text-gray-800 mt-20'>
          Journal not found
        </h1>
        <p className='text-gray-500'>
          The journal you requested does not exist or was deleted.
        </p>
        <Link href='/boards'>
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
                  {foundBoard.prompt}
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
          ?.filter((entry) => entry.boardId === boardId && !entry.isDeleted)
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
