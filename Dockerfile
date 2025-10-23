# 1️⃣ 베이스 이미지 설정
FROM node:20

# 2️⃣ 작업 디렉토리 설정
WORKDIR /app

# ===============================
# 3️⃣ 백엔드 설치
# ===============================
WORKDIR /app/my-backend-server
# package.json만 복사
COPY my-backend-server/package.json ./
RUN npm install
# 백엔드 전체 복사
COPY my-backend-server/ ./

# ===============================
# 4️⃣ 프론트엔드 설치
# ===============================
WORKDIR /app/my-vite-app
# package.json만 복사
COPY my-vite-app/package.json ./
RUN npm install
# 프론트엔드 전체 복사
COPY my-vite-app/ ./
# 빌드
RUN npm run build

# ===============================
# 5️⃣ 최종 WORKDIR 및 서버 실행
# ===============================
WORKDIR /app/my-backend-server
ENV PORT=4000
EXPOSE 4000
CMD ["npm", "run", "deploy"]
