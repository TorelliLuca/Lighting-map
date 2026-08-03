import { api } from '../context/UserContext';

/**
 * Invia una notifica push mirata.
 * Preferisci townHallName (staff del comune) oppure userIds.
 */
export async function sendPushNotification({
  title,
  body,
  townHallName,
  userIds,
  userId,
  url,
} = {}) {
  const payload = {
    title,
    body,
    url,
  };

  if (townHallName) {
    payload.townHallName = townHallName;
  } else if (Array.isArray(userIds) && userIds.length > 0) {
    payload.userIds = userIds;
  } else if (userId) {
    payload.userIds = [userId];
  }

  const response = await api.post('/api/push/send', payload);
  return response.data;
}
