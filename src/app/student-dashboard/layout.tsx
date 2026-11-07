import React from 'react';
import BottomNav from '@/components/BottomNav';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pb-20 md:pb-0">
      {children}
      <BottomNav />
    </div>
  );
}
