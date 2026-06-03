import React, { createContext, useContext, useState } from 'react';

interface ViewAsAccount {
  id: string;
  name: string;
  access_type: 'read_only' | 'read_write';
}

interface ViewAsContextType {
  viewAs: ViewAsAccount | null;
  setViewAs: (account: ViewAsAccount | null) => void;
  isReadOnly: boolean;
}

const ViewAsContext = createContext<ViewAsContextType>({
  viewAs: null,
  setViewAs: () => {},
  isReadOnly: false,
});

export function ViewAsProvider({ children }: { children: React.ReactNode }) {
  const [viewAs, setViewAsState] = useState<ViewAsAccount | null>(() => {
    try {
      const stored = localStorage.getItem('kuki_view_as');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setViewAs = (account: ViewAsAccount | null) => {
    setViewAsState(account);
    if (account) {
      localStorage.setItem('kuki_view_as', JSON.stringify(account));
    } else {
      localStorage.removeItem('kuki_view_as');
    }
  };

  return (
    <ViewAsContext.Provider value={{ viewAs, setViewAs, isReadOnly: viewAs?.access_type === 'read_only' }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export const useViewAs = () => useContext(ViewAsContext);
