import { ApiResponse } from "@/types/api-response";
import { useState } from "react";

export default function useFetch() {
  const [isLoading, setIsLoading] = useState(false);

  async function fetchWrapper<T>(
    url: string,
    // eslint-disable-next-line no-undef
    options: RequestInit,
  ): Promise<ApiResponse<T>> {
    const internalUrl = url.startsWith("/")
      ? process.env.NEXT_PUBLIC_APP_LOCAL_HREF + url
      : url;

    const initialOptions = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    setIsLoading(true);

    const data: ApiResponse<T> = await fetch(internalUrl, {
      ...initialOptions,
      ...options,
    }).then((res) => res.json());

    setIsLoading(false);

    return data;
  }

  return { fetch: fetchWrapper, isLoading };
}
