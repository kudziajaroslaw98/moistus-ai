import { ApiResponse } from '@/types/api-response';
import { NextResponse } from 'next/server';

export function respondSuccess<T>(
	data: T,
	status: number = 200,
	statusText?: string
): NextResponse<ApiResponse<T>> {
	return NextResponse.json<ApiResponse<T>>(
		{
			status: 'success',
			data,
			statusNumber: status,
			statusText: statusText ?? 'Success',
		},
		{ status }
	);
}

export function respondError(
	error: string,
	status: number = 500,
	statusText?: string
): NextResponse<ApiResponse<never>> {
	return NextResponse.json<ApiResponse<never>>(
		{
			status: 'error',
			error,
			statusNumber: status,
			statusText: statusText ?? 'Error',
		},
		{ status }
	);
}
