import { redirect } from 'next/navigation';

export default function HomePage(): never {
  // Directly enter the dashboard application
  redirect('/hacks');
}
