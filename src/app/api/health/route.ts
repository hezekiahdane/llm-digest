import { NextResponse } from 'next/server';
import { successResponse } from '@/types/api';

export async function GET() {
  return NextResponse.json(
    successResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
    }),
  );
}
