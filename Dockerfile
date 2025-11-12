# ===============================
# 1️⃣ Node.js 20 이미지 사용
# ===============================
FROM node:20

# ===============================
# 2️⃣ 작업 디렉토리 설정
# ===============================
WORKDIR /app

# ===============================
# 3️⃣ 백엔드 의존성 설치
# ===============================
COPY my-backend-server/package.json ./my-backend-server/
RUN cd my-backend-server && npm install

# ===============================
# 4️⃣ 백엔드 코드 복사
# ===============================
COPY my-backend-server/ ./my-backend-server/

# ===============================
# 5️⃣ 프론트엔드 의존성 설치 및 빌드
# ===============================
COPY my-vite-app/ ./my-vite-app/

# 🔹 빌드 시 환경변수 ARG 설정
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID

# 🔹 환경변수 Docker ENV로 설정 (빌드 과정에서 Vite 접근용)
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

# ✅ 모든 프론트엔드 의존성 설치 및 빌드
RUN cd my-vite-app && npm install && npm run build

# ===============================
# 6️⃣ 프론트엔드 빌드 결과를 백엔드에 복사
# ===============================
RUN mkdir -p ./my-backend-server/dist
RUN cp -r my-vite-app/dist/* ./my-backend-server/dist/

# ===============================
# 7️⃣ 환경 설정
# ===============================
WORKDIR /app/my-backend-server
ENV PORT=4000
EXPOSE 4000

# ===============================
# 8️⃣ 서버 실행
# ===============================
CMD ["node", "server.js"]
