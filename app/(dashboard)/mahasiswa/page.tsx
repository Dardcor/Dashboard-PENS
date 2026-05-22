'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MahasiswaRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/mahasiswa/beranda');
  }, [router]);

  return null;
}
