// app/api/games/[id]/move/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// Helper: เช็ค User
async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
    const { payload } = await jwtVerify(token.value, secret);
    return payload;
  } catch { return null; }
}

// Helper: สูตรเช็คผู้ชนะ (8 เส้นทาง)
function checkWinner(board: string[]) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // แนวนอน
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // แนวตั้ง
    [0, 4, 8], [2, 4, 6]             // แนวทแยง
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (board[a] !== '-' && board[a] === board[b] && board[a] === board[c]) {
      return board[a]; // Return 'X' or 'O'
    }
  }
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromToken();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params; // Game ID
  const { position } = await request.json(); // ตำแหน่งที่เดิน (0-8)

  try {
    // 🔥 ใช้ Transaction เพื่อกัน Race Condition (สำคัญมาก!)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock แถวนี้ไว้ก่อน (ดึงข้อมูลล่าสุด)
      const game = await tx.game.findUnique({
        where: { id },
      });

      if (!game) throw new Error('Game not found');

      // 2. Validate กติกา
      if (game.status !== 'IN_PROGRESS') throw new Error('Game is not active');
      if (game.turn !== user.userId) throw new Error('Not your turn');
      if (game.board[position] !== '-') throw new Error('Cell is occupied');

      // 3. อัปเดตกระดาน
      const isPlayer1 = game.player1Id === user.userId;
      const symbol = isPlayer1 ? 'X' : 'O';
      
      const boardArray = game.board.split('');
      boardArray[position] = symbol;
      const newBoard = boardArray.join('');

      // 4. เช็คผลแพ้ชนะ
      let newStatus = 'IN_PROGRESS';
      let winnerId = null;
      let nextTurn = game.turn; // ค่าเริ่มต้น

      const winnerSymbol = checkWinner(boardArray);
      
      if (winnerSymbol) {
        newStatus = 'FINISHED';
        winnerId = user.userId; // คนเดินปัจจุบันคือคนชนะ
      } else if (!newBoard.includes('-')) {
        newStatus = 'FINISHED'; // เสมอ (กระดานเต็ม)
      } else {
        // สลับตาเดิน (ถ้ายังไม่จบ)
        nextTurn = (game.turn === game.player1Id) ? (game.player2Id as string) : game.player1Id;
      }

      // 5. บันทึกข้อมูลลง DB (Game + Move History)
      await tx.move.create({
        data: {
          gameId: game.id,
          playerId: user.userId as string,
          position: position,
        },
      });

      const updatedGame = await tx.game.update({
        where: { id },
        data: {
          board: newBoard,
          status: newStatus,
          turn: nextTurn,
          winnerId: winnerId,
        },
      });

      return updatedGame;
    });

    return NextResponse.json(result);

  } catch (error: unknown) {
    // 1. กำหนดค่า Default เผื่อไม่ใช่ Error Object
    let errorMessage = 'An unexpected error occurred';

    // 2. เช็ค Type ว่าเป็น Error จริงไหม (Type Guard)
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    console.error("Move Error:", errorMessage);
    
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 400 }
    );
  }
}