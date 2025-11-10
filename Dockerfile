FROM node:20

WORKDIR /app

# -------------------------------
# 1. 백엔드 의존성 설치
# -------------------------------
COPY my-backend-server/package*.json ./my-backend-server/
RUN cd my-backend-server && npm install

COPY my-backend-server/ ./my-backend-server/

# -------------------------------
# 2. 프론트엔드 의존성 설치 및 빌드
# -------------------------------
COPY my-vite-app/package*.json ./my-vite-app/
RUN cd my-vite-app && npm install

COPY my-vite-app/ ./my-vite-app/
RUN cd my-vite-app && npm run build

# -------------------------------
# 3. 빌드 결과 백엔드로 복사
# -------------------------------
RUN mkdir -p ./my-backend-server/dist
RUN cp -r my-vite-app/dist/* ./my-backend-server/dist/

# -------------------------------
# 4. 환경 설정 및 서버 실행
# -------------------------------
WORKDIR /app/my-backend-server
ENV PORT=4000
ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "server.js"]
