# PGH Collab Platform — production image (independent of AI Tracker).
# Single stage keeps the Prisma CLI + engines available so the container can
# run `prisma migrate deploy` on startup. node:20-slim (Debian) is used so the
# Prisma engine binary matches between build and runtime.
FROM node:20-slim

# Prisma needs openssl at runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install all deps (incl. prisma CLI) for the build + runtime migrations.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# build script = `prisma generate && next build`
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

# Apply pending migrations, then start Next. (Single-replica friendly; for
# multi-replica, move `migrate deploy` to a dedicated pipeline step instead.)
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
