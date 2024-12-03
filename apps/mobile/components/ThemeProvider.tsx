import React from 'react';
import { Theme, ThemeContext } from '../theme'; // Assuming you have a theme context

interface ThemeProviderProps {
  children: React.ReactNode;
  value?: 'light' | 'dark';
}

export function ThemeProvider({ children, value = 'light' }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
