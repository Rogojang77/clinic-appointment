import { NextResponse } from "next/server";

export function GET(): NextResponse {
  // Token is stored client-side in localStorage, so we just return success
  // The client will handle removing the token
  return NextResponse.json({ 
    message: "Logout Successfully!",
    success: true 
  });
}
