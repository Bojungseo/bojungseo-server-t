FROM node:20

# -------------------------------
# 1. 전체 작업 디렉토리 설정
# -------------------------------
WORKDIR /app

# -------------------------------
# 2. 백엔드 의존성 설치
# -------------------------------
COPY my-backend-server/package*.json ./my-backend-server/
WORKDIR /app/my-backend-server
RUN npm ci

COPY my-backend-server/ ./my-backend-server/

# -------------------------------
# 3. 프론트엔드 의존성 설치 및 빌드
# -------------------------------
WORKDIR /app/my-vite-app
COPY my-vite-app/package*.json ./
RUN npm ci

# react-calendar가 dependencies에 없으면 여기서 설치
RUN npm install react-calendar

COPY my-vite-app/ ./
RUN npm run build

# -------------------------------
# 4. 빌드 결과를 백엔드 dist로 복사
# -------------------------------
RUN mkdir -p /app/my-backend-server/dist
RUN cp -r /app/my-vite-app/dist/* /app/my-backend-server/dist/

# -------------------------------
# 5. 환경 설정 및 서버 실행
# -------------------------------
WORKDIR /app/my-backend-server
ENV PORT=4000
ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "server.js"]
