'use client';

import { LoginPage } from '@/features/auth/login-page';
import { useApp } from '@/providers/app-provider';

export default function LoginRoutePage() {
  const { login } = useApp();
  return <LoginPage onLogin={login} />;
}
