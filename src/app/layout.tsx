import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import AppShell from '@/components/AppShell';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Kinford Student Portal',
  description: 'Admin-first Student Portal for Kinford',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 min-h-screen font-sans antialiased selection:bg-[#A22538]/10 selection:text-[#A22538]">
        <AuthProvider>
          <AppShell>{children}</AppShell>
          <Toaster
            position="top-right"
            richColors
            toastOptions={{
              style: {
                borderRadius: '0.75rem',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
