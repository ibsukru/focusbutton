import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { FocusButton } from '@focusbutton/ui';

function Popup() {
  return (
    <ThemeProvider attribute="class">
      <div className="container">
        <FocusButton />
      </div>
    </ThemeProvider>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Popup />);
