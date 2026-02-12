// app/api/games/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // ตรวจสอบ path ให้ถูก
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// ฟังก์ชันแกะ Token (ใช้แบบเดิมของคุณได้เลย)
async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
    const { payload } = await jwtVerify(token.value, secret);
    // แปลง payload ให้แน่ใจว่ามี userId (บางที JWT เก็บเป็น sub หรือ id)
    return { userId: payload.userId || payload.sub, username: payload.username }; 
  } catch { return null; }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // รองรับ Next.js 15
) {
  const user = await getUserFromToken();
  if (!user || !user.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params; // await params ตามมาตรฐานใหม่

  try {
    // 1. ดึงข้อมูลเกม + 💥 เพิ่ม moves (ประวัติการเดิน)
    let game = await prisma.game.findUnique({
      where: { id },
      include: { 
        player1: true, 
        player2: true,
        // 🔥 เพิ่มตรงนี้: ดึง Moves มาด้วยและเรียงตามเวลา
        moves: {
          orderBy: { createdAt: 'asc' },
        }
      },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // 2. Logic Join ห้อง (Auto-Join as Player 2)
    // ถ้ายังไม่มี P2 และคนเรียกไม่ใช่ P1 -> จับยัดเป็น P2 เลย
    if (!game.player2Id && game.player1Id !== user.userId) {
      game = await prisma.game.update({
        where: { id },
        data: { 
            player2Id: user.userId as string,
            status: 'IN_PROGRESS'
        },
        include: { 
          player1: true, 
          player2: true,
          moves: { orderBy: { createdAt: 'asc' } } // ต้อง include ให้เหมือนข้างบน
        },
      });
    }

    // 3. ส่งข้อมูลกลับ (รวม moves)
    return NextResponse.json({
      id: game.id,
      board: game.board,
      status: game.status,
      turn: game.turn,
      player1: game.player1,
      player2: game.player2,
      me: user.userId,
      winnerId: game.winnerId, // ส่งคนชนะไปด้วย (ถ้ามีใน DB)
      moves: game.moves, // 🔥 ส่ง moves กลับไปให้ Frontend ทำ Replay
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}