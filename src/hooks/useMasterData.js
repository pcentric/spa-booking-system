// Hook to consume MasterDataContext
import { useContext } from 'react';
import MasterDataContext from '../contexts/MasterDataContext';

export function useMasterData() {
  const context = useContext(MasterDataContext);
  if (!context) {
    throw new Error('useMasterData must be used within MasterDataProvider');
  }
  return context;
}

export default useMasterData;
