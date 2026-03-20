import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/core/api/response';

export async function GET() {
  return NextResponse.json(
    successResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
    }),
  );
}
