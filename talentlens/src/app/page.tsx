import { redirect } from 'next/navigation';

// Root → redirect to HR dashboard (middleware handles auth)
export default function Home() {
  redirect('/dashboard');
}
