FROM node:20-bookworm-slim

ARG NPM_REGISTRY=
ARG NPM_FETCH_RETRIES=5
ARG NPM_FETCH_RETRY_FACTOR=2
ARG NPM_FETCH_RETRY_MINTIMEOUT=20000
ARG NPM_FETCH_RETRY_MAXTIMEOUT=120000

WORKDIR /app/frontend

COPY package*.json ./
RUN if [ -n "${NPM_REGISTRY}" ]; then \
      npm config set registry "${NPM_REGISTRY}"; \
    fi \
    && npm config set fetch-retries "${NPM_FETCH_RETRIES}" \
    && npm config set fetch-retry-factor "${NPM_FETCH_RETRY_FACTOR}" \
    && npm config set fetch-retry-mintimeout "${NPM_FETCH_RETRY_MINTIMEOUT}" \
    && npm config set fetch-retry-maxtimeout "${NPM_FETCH_RETRY_MAXTIMEOUT}" \
    && npm ci --no-audit --fund=false

COPY . ./

EXPOSE 5173

CMD ["npm", "run", "dev"]
