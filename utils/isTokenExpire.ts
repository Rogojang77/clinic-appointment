import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.SECRET!);

export const isTokenExpired = async (token: string): Promise<boolean> => {
  try {
    // Verify the token using jose (Edge Runtime compatible)
    await jwtVerify(token, secret);
    return false; // Token is valid and not expired
  } catch (err) {
    return true; // If verification fails, consider the token as expired
  }
};
