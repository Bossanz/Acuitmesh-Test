// app/api/games/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// ฟังก์ชันช่วยเช็ค User จาก Token (Reuse ได้)
async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
    const { payload } = await jwtVerify(token.value, secret);
    return payload; // { userId, username }
  } catch (err) {
    return null;
  }
}

// POST: สร้างห้องใหม่
export async function POST() {
  const user = await getUserFromToken();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // สร้างห้อง โดยให้คนสร้างเป็น Player 1 (X)
    const newGame = await prisma.game.create({
      data: {
        player1Id: user.userId as string,
        status: 'WAITING',
        turn: user.userId as string, // ให้คนสร้างเริ่มก่อน (หรือจะ Random ก็ได้)
      },
    });

    return NextResponse.json({ gameId: newGame.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}