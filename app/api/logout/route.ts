import { NextResponse } from "next/server";

export function GET(): NextResponse {
  const response = NextResponse.json({ message: "Logout Successfully!" });

  response.cookies.set("token", "", {
    path: "/",
    httpOnly: true,
    secure: false,
    maxAge: 0,
  });

  return response;
}
