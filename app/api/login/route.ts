import bcrypt from "bcrypt";
import dbConnect from "@/utils/mongodb";
import { NextRequest, NextResponse } from "next/server";
import UserModel from "@/models/User";
import { createAccessToken, createRefreshToken } from "@/utils/jwtUtils";

export async function POST(request: NextRequest) {
  await dbConnect();
  const { email, password } = await request.json();

  try {
    if (!email || !password) {
      return NextResponse.json(
        { message: "Please Provide Credentials !" },
        { status: 400 }
      );
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { message: "User not found!" },
        { status: 404 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
   
    if(isPasswordValid){
      const tokenData = {
        id: String(user._id),
        email: user.email,
        username: user.username,
        role: user.role,
        isAdmin: user.role === 'admin' || false
      }

      // Create both access and refresh tokens
      const accessToken = await createAccessToken(tokenData);
      const refreshToken = await createRefreshToken(tokenData);
      
      if (!accessToken || !refreshToken) {
        return NextResponse.json(
          { message: "Token creation failed" },
          { status: 500 }
        );
      }
  
      const userResponse = {
        username: user.username,
        email: user.email,
        role: user.role,
        access: user.accessSection,
        isAdmin: user.role === 'admin' || false,
      };
  
      // Create response with access token in body
      const response = NextResponse.json(
        { 
          message: "Login Successfull !", 
          user: userResponse, 
          accessToken, // Return access token in response body
          expiresIn: 15 * 60 // 15 minutes in seconds
        },
        { status: 200 }
      );

      // Set refresh token in HttpOnly cookie
      response.cookies.set('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });

      return response;
    }
    else{
      return NextResponse.json(
        { message: "Invalid Credentials" },
        { status: 404 }
      );
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}
