import React, { useState } from "react";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { sendPushNotification } from "../utils/pushNotifications";

export default function TempNotifyComponent({ title, body }) {
  const [isLoading, setIsLoading] = useState(false);
  const [titles, setTitles] = useState(title);
  let isPushReady = false;
  try{
    isPushReady = usePushNotifications(); // Setup una sola volta

  }catch(error){
    console.error('Error in TempNotifyComponent:', error);
    setTitles('Errore di setup');
  }

  const handleSendNotification = async () => {
    if (!isPushReady) {
      console.warn('Push notifications not ready');
      return;
    }

    setIsLoading(true);
    try {
      const userId = localStorage.getItem("userData") 
        ? JSON.parse(localStorage.getItem("userData")).id 
        : null;
      
      await sendPushNotification(titles, body, userId);
    } catch (error) {
      console.error('Failed to send notification:', error);
      setTitles(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  const handleClick = () => {
    setTitles("Cliccato!");
    handleSendNotification();
  }

  return (
    <div>
      <button
        className="absolute bottom-40 w-40 z-[9999] right-100 h-50  bg-blue-600 text-white px-2"
        onClick={handleClick}
        disabled={!isPushReady || isLoading}
      >
        {isLoading ? 'Invio...' : titles}
      </button>
    </div>
  );
}