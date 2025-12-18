import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest): NextResponse {
  // Create response
  const response = NextResponse.json({ 
    message: "Logout Successfully!",
    success: true 
  });

  // Clear refresh token cookie
  response.cookies.delete('refresh_token');
  
  // Also clear it with explicit settings to ensure it's removed
  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0, // Expire immediately
    path: '/',
  });

  // Client will handle removing access token from localStorage
  return response;
}
