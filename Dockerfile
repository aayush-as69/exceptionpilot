FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

FROM deps AS build
ENV NEXT_TELEMETRY_DISABLED=1
ENV APP_ENV=production
ENV DEMO_MODE=false
ENV SEED_ON_START=false
ENV APP_ORIGIN=https://build.invalid
ENV DATABASE_URL=postgresql://build-only:build-only@127.0.0.1:5432/build-only
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV APP_ENV=production
ENV DEMO_MODE=false
ENV SEED_ON_START=false
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN addgroup -S pilot && adduser -S pilot -G pilot
COPY --from=build --chown=pilot:pilot /app/.next/standalone ./
COPY --from=build --chown=pilot:pilot /app/.next/static ./.next/static
COPY --from=build --chown=pilot:pilot /app/public ./public
USER pilot
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
