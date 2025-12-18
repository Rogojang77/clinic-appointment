import { NextRequest, NextResponse } from "next/server";
import { verifyJWT, createAccessToken, createRefreshToken } from "@/utils/jwtUtils";
import dbConnect from "@/utils/mongodb";
import UserModel from "@/models/User";

const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

/**
 * POST /api/auth/refresh
 * Refreshes the access token using a valid refresh token
 * 
 * Flow:
 * 1. Extract refresh token from HttpOnly cookie
 * 2. Verify refresh token
 * 3. Get user from database
 * 4. Issue new access token and optionally rotate refresh token
 * 5. Return new tokens
 */
export async function POST(request: NextRequest) {
  try {
    // Extract refresh token from cookie
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { message: "Refresh token not found", success: false },
        { status: 401 }
      );
    }

    // Verify refresh token
    const payload = await verifyJWT(refreshToken);
    
    if (!payload) {
      // Invalid or expired refresh token
      const response = NextResponse.json(
        { message: "Invalid or expired refresh token", success: false },
        { status: 401 }
      );
      // Clear the invalid refresh token cookie
      response.cookies.delete(REFRESH_TOKEN_COOKIE_NAME);
      return response;
    }

    // Verify user still exists in database
    await dbConnect();
    const user = await UserModel.findById(payload.id);
    
    if (!user) {
      const response = NextResponse.json(
        { message: "User not found", success: false },
        { status: 401 }
      );
      response.cookies.delete(REFRESH_TOKEN_COOKIE_NAME);
      return response;
    }

    // Create new token data
    const tokenData = {
      id: String(user._id),
      email: user.email,
      username: user.username,
      role: user.role,
      isAdmin: user.role === 'admin' || false,
    };

    // Create new access token
    const newAccessToken = await createAccessToken(tokenData);
    
    if (!newAccessToken) {
      return NextResponse.json(
        { message: "Failed to create access token", success: false },
        { status: 500 }
      );
    }

    // Optionally rotate refresh token (recommended for security)
    // This invalidates the old refresh token and issues a new one
    const newRefreshToken = await createRefreshToken(tokenData);
    
    if (!newRefreshToken) {
      return NextResponse.json(
        { message: "Failed to create refresh token", success: false },
        { status: 500 }
      );
    }

    // Create response with new access token
    const response = NextResponse.json(
      {
        message: "Token refreshed successfully",
        success: true,
        accessToken: newAccessToken,
      },
      { status: 200 }
    );

    // Set new refresh token in HttpOnly cookie
    response.cookies.set(REFRESH_TOKEN_COOKIE_NAME, newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error("Token refresh error:", error);
    const response = NextResponse.json(
      { message: "Server error during token refresh", success: false },
      { status: 500 }
    );
    response.cookies.delete(REFRESH_TOKEN_COOKIE_NAME);
    return response;
  }
}
