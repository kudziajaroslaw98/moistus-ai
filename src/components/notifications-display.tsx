import React from "react";
import { NotificationState } from "@/hooks/use-notifications";

interface NotificationsDisplayProps {
  notification: NotificationState;
}

export function NotificationsDisplay({
  notification,
}: NotificationsDisplayProps) {
  if (!notification.message) return null;

  // Define base classes and conditional classes
  const baseClasses =
    "fixed bottom-5 right-5 z-[1000] max-w-sm rounded-sm p-3 shadow-lg text-sm font-medium";
  const typeClasses =
    notification.type === "success"
      ? "bg-emerald-600 text-white"
      : "bg-rose-600 text-white";

  return (
    <div
      className={`${baseClasses} ${typeClasses}`}
      role="alert" // Add accessibility role
      // Optional: Add animation classes for entry/exit
      // e.g., using framer-motion or basic CSS transitions
    >
      {notification.message}
    </div>
  );
}
