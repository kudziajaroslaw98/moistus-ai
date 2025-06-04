export type ApiResponse<T> =
  | {
      status: "success";
      data: T;
      statusNumber?: number;
      statusText?: string;
    }
  | {
      status: "error";
      error: string;
      statusNumber?: number;
      statusText?: string;
    };
