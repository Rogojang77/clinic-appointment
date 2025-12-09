import bcrypt from "bcrypt";
import dbConnect from "@/utils/mongodb";
import { NextRequest, NextResponse } from "next/server";
import UserModel from "@/models/User";
import { createJWT } from "@/utils/jwtUtils";

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

      const token = await createJWT(tokenData)
      
      if (!token) {
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
  
      // Return token in response body (client will store in localStorage)
      return NextResponse.json(
        { 
          message: "Login Successfull !", 
          user: userResponse, 
          token,
          expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
        },
        { status: 200 }
      );
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
