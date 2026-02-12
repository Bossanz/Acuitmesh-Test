// app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    // 1. รับข้อมูลจากหน้าบ้าน
    const body = await request.json();
    const { username, password } = body;

    // 2. ตรวจสอบข้อมูลเบื้องต้น
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // 3. เช็คว่ามี User นี้หรือยัง?
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 } // 409 Conflict
      );
    }

    // 4. เข้ารหัส Password (ห้ามเก็บสดเด็ดขาด!)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. บันทึกลง Database
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    });

    // 6. ส่งผลลัพธ์กลับ (ไม่ส่ง password กลับไปนะ)
    return NextResponse.json(
      { message: 'User created successfully', userId: newUser.id },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}