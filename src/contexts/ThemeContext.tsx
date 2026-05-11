import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface ThemeColors {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  gradient: string;
  gradientFrom: string;
  gradientTo: string;
  ring: string;
  text: string;
  hex: {
    primary: string;
    light: string;
    dark: string;
  };
}

interface ThemeContextType {
  colors: ThemeColors;
  isEmployer: boolean;
  isRecordHolder: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const blueTheme: ThemeColors = {
  primary: 'bg-blue-600',
  primaryHover: 'hover:bg-blue-700',
  primaryLight: 'bg-blue-50',
  primaryDark: 'bg-blue-900',
  gradient: 'from-blue-600 to-blue-700',
  gradientFrom: 'from-blue-600',
  gradientTo: 'to-blue-700',
  ring: 'ring-blue-500',
  text: 'text-blue-600',
  hex: {
    primary: '#2563eb',
    light: '#eff6ff',
    dark: '#1e3a8a'
  }
};

const greenTheme: ThemeColors = {
  primary: 'bg-[#00A12E]',
  primaryHover: 'hover:bg-[#008A26]',
  primaryLight: 'bg-[#E6F7EC]',
  primaryDark: 'bg-[#007020]',
  gradient: 'from-[#00A12E] to-[#008A26]',
  gradientFrom: 'from-[#00A12E]',
  gradientTo: 'to-[#008A26]',
  ring: 'ring-[#00A12E]',
  text: 'text-[#00A12E]',
  hex: {
    primary: '#00A12E',
    light: '#E6F7EC',
    dark: '#007020'
  }
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profile } = useAuth();

  const isRecordHolder = profile?.account_type === 'record_holder';
  const isEmployer = profile?.role === 'employer';
  const colors = blueTheme;

  return (
    <ThemeContext.Provider value={{ colors, isEmployer, isRecordHolder }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
