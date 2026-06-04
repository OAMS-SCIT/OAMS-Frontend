'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  mockAssets,
  mockUsers,
  currentAdminUser,
  currentEmployeeUser,
} from '@/lib/mock-data';
import type { AppRole, Asset, AssetStatus, User } from '@/types';

interface AppContextValue {
  assets: Asset[];
  users: User[];
  role: AppRole;
  currentUser: User;
  isAuthenticated: boolean;
  login: (role: AppRole) => void;
  logout: () => void;
  setRole: (role: AppRole) => void;
  addAsset: (asset: Asset) => void;
  assignAsset: (assetId: string, employeeId: string, employeeName: string) => void;
  updateAssetStatus: (assetId: string, status: AssetStatus) => void;
  returnAsset: (assetId: string) => void;
  addUser: (user: User) => void;
  toggleUserStatus: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>(mockAssets);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [role, setRole] = useState<AppRole>('admin');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = useCallback((nextRole: AppRole) => {
    setRole(nextRole);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    setRole('admin');
    setIsAuthenticated(false);
  }, []);

  const addAsset = useCallback((asset: Asset) => {
    setAssets((prev) => [asset, ...prev]);
  }, []);

  const assignAsset = useCallback(
    (assetId: string, employeeId: string, employeeName: string) => {
      setAssets((prev) =>
        prev.map((asset) =>
          asset.id === assetId
            ? {
                ...asset,
                status: 'Assigned' as AssetStatus,
                assignedTo: employeeName,
                assignedToId: employeeId,
                assignedDate: new Date().toISOString().split('T')[0],
              }
            : asset,
        ),
      );
    },
    [],
  );

  const updateAssetStatus = useCallback((assetId: string, newStatus: AssetStatus) => {
    setAssets((prev) =>
      prev.map((asset) => {
        if (asset.id !== assetId) return asset;
        const updated = { ...asset, status: newStatus };
        if (newStatus !== 'Assigned') {
          delete updated.assignedTo;
          delete updated.assignedToId;
          delete updated.assignedDate;
        }
        return updated;
      }),
    );
  }, []);

  const returnAsset = useCallback((assetId: string) => {
    setAssets((prev) =>
      prev.map((asset) =>
        asset.id === assetId
          ? {
              ...asset,
              status: 'Available' as AssetStatus,
              returnedDate: new Date().toISOString().split('T')[0],
              assignedTo: undefined,
              assignedToId: undefined,
              assignedDate: undefined,
            }
          : asset,
      ),
    );
  }, []);

  const addUser = useCallback((user: User) => {
    setUsers((prev) => [user, ...prev]);
  }, []);

  const toggleUserStatus = useCallback((id: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === id
          ? { ...user, status: user.status === 'Active' ? 'Inactive' : 'Active' }
          : user,
      ),
    );
  }, []);

  const currentUser = role === 'admin' ? currentAdminUser : currentEmployeeUser;

  const value = useMemo(
    () => ({
      assets,
      users,
      role,
      currentUser,
      isAuthenticated,
      login,
      logout,
      setRole,
      addAsset,
      assignAsset,
      updateAssetStatus,
      returnAsset,
      addUser,
      toggleUserStatus,
    }),
    [
      assets,
      users,
      role,
      currentUser,
      isAuthenticated,
      login,
      logout,
      addAsset,
      assignAsset,
      updateAssetStatus,
      returnAsset,
      addUser,
      toggleUserStatus,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
