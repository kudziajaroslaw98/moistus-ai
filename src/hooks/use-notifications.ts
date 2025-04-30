import { useState, useCallback } from "react";

export type NotificationType = "success" | "error";

export interface NotificationState {
  message: string | null;
  type: NotificationType | null;
}

export type ShowNotification = (
  message: string,
  type: NotificationType,
  duration?: number,
) => void;

export function useNotifications() {
  const [notification, setNotification] = useState<NotificationState>({
    message: null,
    type: null,
  });

  const showNotification = useCallback(
    (message: string, type: NotificationType, duration: number = 5000) => {
      setNotification({ message, type });
      setTimeout(() => {
        setNotification({ message: null, type: null });
      }, duration);
      // Consider returning the timer clear function if needed, though often not necessary here.
    },
    [],
  );

  return { notification, showNotification };
}
