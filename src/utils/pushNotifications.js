import { api } from "../context/UserContext";
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export async function sendPushNotification(title, body, userId) {
  try {
    const response = await api.post(`${SERVER_URL}/api/push/send-test-push`, {
      title,
      body,
      userId
    });
    return response.data;
  } catch (error) {
    console.error('Send notification failed:', error);
    throw error;
  }
}