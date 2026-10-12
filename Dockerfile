# Stage 1: Install dependencies
FROM node:20-slim AS deps
WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json* ./
# Install dependencies including linux native binaries needed for lightningcss / Tailwind v4
RUN npm install --legacy-peer-deps && npm install --no-save @tailwindcss/oxide-linux-x64-gnu@4.1.18 lightningcss-linux-x64-gnu

# Stage 2: Build the application
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Pass PUBLIC environment variables needed at build time.
# These MUST be provided by docker-compose build args or --build-arg
# (see .env.campus for campus-mode values). Never bake cloud keys here.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV GROQ_API_KEY="dummy_build_key"
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Production runner
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create standard unprivileged user
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Copy static assets and standalone server output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
