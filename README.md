# 🎮 Tic-Tac-Toe fullstack-developer-internship-challenge

ระบบเกม Tic-Tac-Toe แบบ Real-time Multiplayer ที่พัฒนาด้วย **Next.js 15 (App Router)**, **TypeScript**, **Prisma**, และ **PostgreSQL** เน้นประสิทธิภาพ Type Safety และการจัดการ Data Consistency ที่แม่นยำ

🔗 **Live Demo:** [https://acuitmesh-test.vercel.app/](https://acuitmesh-test.vercel.app/)
📂 **Repository:** [https://github.com/Bossanz/Acuitmesh-Test](https://github.com/Bossanz/Acuitmesh-Test)

---

## ✨ ฟีเจอร์หลัก (Key Features)

### Core Gameplay
- **Multiplayer System:** สร้างห้องและเล่นกับเพื่อนได้ทันที (Room-based)
- **Spectator Mode:** รองรับผู้เข้าชมเกม (Spectators) แบบ Real-time
- **Turn-Based Logic:** ตรวจสอบตรรกะเกมและผู้ชนะที่ฝั่ง Server 100%

### Technical Highlights (Bonus)
- **🛡️ Race Condition Protection:** ป้องกันการแย่งเดิน (Double Move) ด้วย Database Transactions
- **🎬 Replay System:** บันทึกทุก Move ลง Database สามารถดูรีเพลย์ย้อนหลังได้
- **🐳 Dockerized:** รองรับการ Deploy ผ่าน Docker Container (มี `docker-compose.yml`)
- **🎨 Modern UI:** ออกแบบด้วย Tailwind CSS (Glassmorphism) และ Framer Motion

---

## 🏗️ Architecture & Tech Stack

ระบบถูกออกแบบด้วยสถาปัตยกรรม **Stateless Serverless** บน Vercel โดยใช้ Supabase เป็น Database หลัก

- **Framework:** Next.js 15 (React Server Components & API Routes)
- **Language:** TypeScript (.ts / .tsx) - *Strict Type Checking*
- **Database ORM:** Prisma
- **Database:** PostgreSQL (Supabase Connection Pooling)
- **Styling:** Tailwind CSS

---

## 🛡️ การจัดการปัญหา Race Condition (Critical)

โจทย์สำคัญของเกม Multiplayer คือการป้องกัน **Race Condition** (เช่น ผู้เล่น 2 คนกดยิง API มาลงช่องเดียวกันพร้อมกัน)

ผมแก้ปัญหานี้ด้วย **Optimistic Concurrency Control** ผ่าน Prisma Transaction:

### 1. Atomic Database Update
ใช้เงื่อนไข `where` ในการ update เพื่อ lock row และตรวจสอบ `turn` ในคำสั่งเดียว:

```typescript
// app/api/games/[id]/move/route.ts
const updatedGame = await prisma.game.update({
  where: {
    id: gameId,
    turn: userId,           // 1. เช็คว่าเป็นตาของผู้เล่นคนนี้จริงหรือไม่
    status: 'IN_PROGRESS',  // 2. เช็คว่าเกมจบไปแล้วหรือยัง
  },
  data: {
    board: newBoardString,
    turn: nextPlayerId,     // สลับตาเดินทันที
  }
});
```
หากมี Request ซ้อนกัน Request ที่มาช้ากว่าจะไม่สามารถ update ได้เพราะ turn เปลี่ยนไปแล้ว

### 2. Database Constraint
เพิ่ม Unique Constraint ในระดับ Database Schema ที่ตาราง Move

```bash
// prisma/schema.prisma
model Move {
  ...
  @@unique([gameId, position]) // ป้องกันข้อมูลขยะในระดับ Database
}
```

## 🚀 วิธีการรันโปรเจกต์ (Local Development)
Option 1: Docker (Recommended)
```bash
# 1. Clone & Enter directory
git clone [https://github.com/Bossanz/Acuitmesh-Test.git](https://github.com/Bossanz/Acuitmesh-Test.git)
cd Acuitmesh-Test

# 2. Start Services
docker-compose up --build
```
Access: `http://localhost:3000`

Option 2: Node.js (Manual)
1. Install Dependencies
```
npm install
# or pnpm install
```
2. Setup Environment Create .env file
```
DATABASE_URL="postgresql://..." # Transaction Mode (Port 6543)
DIRECT_URL="postgresql://..."   # Session Mode (Port 5432)
JWT_SECRET="secret"
```
3. Sync Database
```
npx prisma db push
```
4. Run Dev Server
```
npm run dev
```
Developed by: นายชวการ แสนเสริม
