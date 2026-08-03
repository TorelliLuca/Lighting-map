import { createContext, useContext } from 'react';
import { usePushNotificationsState } from '../hooks/usePushNotifications';
import { useUser } from './UserContext';

const PushNotificationsContext = createContext(null);

export function PushNotificationsProvider({ children }) {
  const { userData } = useUser();
  const value = usePushNotificationsState({ userId: userData?.id });
  return (
    <PushNotificationsContext.Provider value={value}>
      {children}
    </PushNotificationsContext.Provider>
  );
}

export function usePushNotifications() {
  const ctx = useContext(PushNotificationsContext);
  if (!ctx) {
    throw new Error('usePushNotifications deve essere usato dentro PushNotificationsProvider');
  }
  return ctx;
}
