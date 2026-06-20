import { Outlet } from '@tanstack/react-router';
import { Toaster } from '@/components/ui/sonner';

export function RootLayout() {
  return (
    <>
      <div className='w-3 h-screen bg-amber-200 fixed' />
      <Outlet />
      <Toaster />
    </>
  );
}
