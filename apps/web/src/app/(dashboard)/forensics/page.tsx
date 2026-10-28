import { redirect } from 'next/navigation';

export default function ForensicsIndexPage(): never {
  // Redirect to the default forensic report demonstration
  redirect('/forensics/demo');
}
