
import React from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';
import Footer from './Footer';
import { ScrollArea } from '@/components/ui/scroll-area';

const RootLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <ScrollArea className="flex-1">
        <main className="flex-1">
          <Outlet />
        </main>
      </ScrollArea>
      <Footer />
    </div>
  );
};

export default RootLayout;
