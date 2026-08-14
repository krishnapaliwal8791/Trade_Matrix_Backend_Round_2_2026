export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  code: string;
  message: string;
  reason?: string;
  suggestedFix?: string;
}

export const successResponse = <T>(data: T): SuccessResponse<T> => {
  return {
    success: true,
    data,
  };
};

export const errorResponse = (
  message: string,
  code: string,
  reason?: string,
  suggestedFix?: string
): ErrorResponse => {
  return {
    success: false,
    code,
    message,
    ...(reason && { reason }),
    ...(suggestedFix && { suggestedFix }),
  };
};
