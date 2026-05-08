import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type DishContextValue = {
  refreshKey: number;
  triggerRefresh: () => void;
};

const DishContext = createContext<DishContextValue>({
  refreshKey: 0,
  triggerRefresh: () => {},
});

export function DishProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  return (
    <DishContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </DishContext.Provider>
  );
}

export function useDishRefresh() {
  return useContext(DishContext);
}
