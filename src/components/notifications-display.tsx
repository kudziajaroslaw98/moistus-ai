import { NotificationState } from "@/hooks/use-notifications";
import { cn } from "@/utils/cn";

interface NotificationsDisplayProps {
  notification: NotificationState;
}

export function NotificationsDisplay({
  notification,
}: NotificationsDisplayProps) {
  if (!notification.message) return null;

  const baseClasses =
    "fixed bottom-5 right-5 z-[1000] max-w-sm rounded-sm p-3 shadow-lg text-sm font-medium";
  const typeClasses = cn([
    notification.type === "success" && "bg-emerald-600 text-white",
    notification.type === "error" && "bg-rose-600 text-white",
    notification.type === "warning" && "bg-amber-600 text-white",
  ]);

  return (
    <div className={cn(baseClasses, typeClasses)} role="alert">
      {notification.message}
    </div>
  );
}
