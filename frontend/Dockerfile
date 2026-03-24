FROM node:20-bookworm-slim

WORKDIR /app/frontend

COPY package*.json ./
RUN npm ci

COPY . ./

EXPOSE 5173

CMD ["sh", "-c", "LOCK_HASH=$(sha256sum package-lock.json | cut -d ' ' -f1); STORED_HASH=$(cat node_modules/.package-lock.sha256 2>/dev/null || true); if [ \"$LOCK_HASH\" != \"$STORED_HASH\" ]; then npm ci && echo \"$LOCK_HASH\" > node_modules/.package-lock.sha256; fi; npm run dev"]
