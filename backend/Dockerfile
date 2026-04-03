FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=120

ARG APT_MIRROR_URL=
ARG PIP_INDEX_URL=
ARG PIP_EXTRA_INDEX_URL=
ARG PIP_TRUSTED_HOST=

WORKDIR /app/backend

RUN if [ -n "${APT_MIRROR_URL}" ]; then \
      if [ -f /etc/apt/sources.list ]; then \
        sed -ri "s|https?://[^ ]+|${APT_MIRROR_URL}|g" /etc/apt/sources.list; \
      fi; \
      if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
        sed -ri "s|^URIs:[[:space:]]+https?://[^ ]+|URIs: ${APT_MIRROR_URL}|g" /etc/apt/sources.list.d/debian.sources; \
      fi; \
    fi \
    && apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN if [ -n "${PIP_INDEX_URL}" ]; then \
      pip config set global.index-url "${PIP_INDEX_URL}"; \
    fi \
    && if [ -n "${PIP_EXTRA_INDEX_URL}" ]; then \
      pip config set global.extra-index-url "${PIP_EXTRA_INDEX_URL}"; \
    fi \
    && if [ -n "${PIP_TRUSTED_HOST}" ]; then \
      pip config set global.trusted-host "${PIP_TRUSTED_HOST}"; \
    fi \
    && pip install --no-cache-dir --retries 5 -r requirements.txt

COPY . ./

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]
