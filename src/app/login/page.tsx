'use client';

import { useRouter } from 'next/navigation';
import { LoginPage } from '@/features/auth/login-page';
import { useApp } from '@/providers/app-provider';

export default function LoginRoutePage() {
  const { login } = useApp();
  const router = useRouter();

  // Temporary handler — real auth + validation lands in OAMS-45.
  const handleSubmit = (email: string, password: string) => {
    if (!email || !password) return;
    login('admin');
    router.push('/admin/dashboard');
  };

  return <LoginPage onSubmit={handleSubmit} />;
}
