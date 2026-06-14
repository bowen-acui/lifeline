# syntax=docker/dockerfile:1
ARG NODE_VERSION=22.13.1

# ============ Stage 1: build frontend ============
FROM node:${NODE_VERSION}-slim AS frontend-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# 同源部署：前端用相对路径调用 /api
ENV VITE_API_URL=""
ENV VITE_NO_AUTH=true
RUN npm run build

# ============ Stage 2: build backend ============
FROM node:${NODE_VERSION}-slim AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# ============ Stage 3: runtime ============
FROM node:${NODE_VERSION}-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

# 仅安装生产依赖
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# 拷贝构建产物
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=frontend-build /app/dist ./dist

EXPOSE 3001
CMD ["node", "server/dist/index.js"]
