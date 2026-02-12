# 🔴 เปลี่ยนจาก node:18-alpine เป็น node:20-alpine
FROM node:20-alpine

# ✅ ลง openssl และ libc6-compat เพิ่ม (แก้ Warning Prisma ใน Alpine)
RUN apk add --no-cache openssl libc6-compat

# เปิดใช้งาน pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# ก๊อปปี้ไฟล์ Config
COPY package.json pnpm-lock.yaml ./

# ลง dependencies
RUN pnpm install --frozen-lockfile

# ก๊อปปี้โค้ด
COPY . .

# สร้าง Prisma Client
RUN pnpm prisma generate

# Build Next.js
RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "start"]