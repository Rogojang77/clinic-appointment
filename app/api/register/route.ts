import bcrypt from "bcrypt";
import UserModel from "@/models/User";
import dbConnect from "@/utils/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  await dbConnect();
  const { email, password, username } = await request.json();

  try {
    if (!email || !password || !username) {
      return NextResponse.json(
        { message: "Please Provide Credentials !" },
        { status: 400 }
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        {
          message: "Invalid Email Format",
        },
        {
          status: 400,
        }
      );
    }
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        {
          message: "User already exist, please login",
        },
        { status: 400 }
      );
    }
    const hashPassword = await bcrypt.hash(password, 10); 
    const newUser = new UserModel({email,password: hashPassword, username}); 
    await newUser.save(); 
    return NextResponse.json({message: "User create Successfully !"})

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}
