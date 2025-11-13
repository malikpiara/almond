'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { useEffect, useState } from 'react';

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

  const entryList = [
    `I’m grateful Margarida is here. I can be vulnerable with her and it’s so nice to have a coworking buddy and someone important by my side.

I’m grateful I started reading and applying the ideas from the book “User Story Mapping”. And I’m grateful I managed to be humble enough to spend time with it even when I felt like I already knew everything… It just shows how much I don’t know.`,
    'OMG that Ramen yesterday. And Yuna makes that place so much better. She’s so positive and friendly. I should have tipped generously and I will next time. ',
  ];

  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const savedEntries = localStorage.getItem('journal-entries');
    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    }
  }, []);

  function onSubmit(data: z.infer<typeof formSchema>) {
    const newEntries = [data.description, ...entries]; // Calculate new array
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
          <Button
            type='submit'
            variant='outline'
            form='form-rhf-demo'
            //onClick={() => form.reset()}
          >
            Submit
          </Button>
        </Field>
      </form>
      <div className='flex flex-col space-y-4 w-full'>
        {entries?.map((entry, index) => (
          <Card key={index} className='rounded-md text-gray-800'>
            <CardContent>{entry}</CardContent>
            <CardFooter className='text-sm opacity-60'>Yesterday</CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
