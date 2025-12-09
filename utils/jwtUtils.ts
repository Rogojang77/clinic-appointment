import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.SECRET!);

export async function verifyJWT(token: string) {
  try {
    // Verify the token using jose (Edge Runtime compatible)
    const { payload } = await jwtVerify(token, secret);
    return payload; // The decoded payload
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null; 
  }
}

export async function createJWT(payload: any) {
  try {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);
    return token;
  } catch (error) {
    console.error("JWT creation failed:", error);
    return null;
  }
}
