// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose'; 
import { cookies } from 'next/headers'; 

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // 1. หา User ใน Database
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // 2. เช็ครหัสผ่าน
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // 3. สร้าง JWT Token
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'default_secret_key'
    );
    
    const token = await new SignJWT({ userId: user.id, username: user.username })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h') 
      .sign(secret);

    // 4. ฝัง Token ลงใน Cookie (HttpOnly)
    // 🔥 แก้ตรงนี้: ใส่ await หน้า cookies()
    const cookieStore = await cookies();

    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 วัน
      path: '/',
    });

    return NextResponse.json({ message: 'Login successful', userId: user.id });

  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}