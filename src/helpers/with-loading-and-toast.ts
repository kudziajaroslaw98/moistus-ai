import useAppStore from "@/contexts/mind-map/mind-map-store";
import type { LoadingStates } from "@/contexts/mind-map/slices/loading-state-slice";
import { toast } from "sonner";

function withLoadingAndToast<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (...args: any[]) => Promise<any>,
>(
  action: T,
  loadingKey: keyof LoadingStates,
  options?: {
    initialMessage?: string;
    errorMessage?: string;
    successMessage?: string;
  },
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args) => {
    const { setLoadingStates } = useAppStore.getState();
    const toastId = toast.loading(options?.initialMessage || "Loading...");

    setLoadingStates({ [loadingKey]: true });

    try {
      // Explicitly pass toastId as the last argument
      const res = await action(...args, toastId);
      toast.success(options?.successMessage || "Success!", { id: toastId });

      return res;
    } catch (e) {
      console.error(`Error in ${String(loadingKey)}:`, e);
      toast.error(
        e instanceof Error
          ? e.message
          : options?.errorMessage || "An error occurred.",
        { id: toastId },
      );
    } finally {
      setLoadingStates({ [loadingKey]: false });
    }
  };
}

export default withLoadingAndToast;
