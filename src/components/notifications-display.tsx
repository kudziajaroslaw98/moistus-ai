import { NotificationState } from "@/hooks/use-notifications";

interface NotificationsDisplayProps {
  notification: NotificationState;
}

export function NotificationsDisplay({
  notification,
}: NotificationsDisplayProps) {
  if (!notification.message) return null;

  const baseClasses =
    "fixed bottom-5 right-5 z-[1000] max-w-sm rounded-sm p-3 shadow-lg text-sm font-medium";
  const typeClasses =
    notification.type === "success"
      ? "bg-emerald-600 text-white"
      : "bg-rose-600 text-white";

  return (
    <div className={`${baseClasses} ${typeClasses}`} role="alert">
      {notification.message}
    </div>
  );
}
