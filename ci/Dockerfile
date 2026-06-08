FROM node:24-alpine AS builder

RUN apk add --no-cache --virtual .build-deps g++ make py3-pip sqlite-dev python3

ARG KUBERNETES_DRIVER_TAG=nightly
ENV NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

RUN npm install --no-save \
        pg-hstore@^2.3.4 \
        @flowfuse/driver-kubernetes@${KUBERNETES_DRIVER_TAG}

COPY config/   ./config/
COPY frontend/ ./frontend/
COPY forge/    ./forge/
RUN npm run build

FROM node:24-alpine AS device-cache

ARG DEVICE_CACHE_SCRIPT_URL=https://raw.githubusercontent.com/FlowFuse/helm/main/flowforge-container/install-device-cache.sh
ARG CACHEBUST=0
ENV NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false

WORKDIR /build/var
RUN wget -qO install-device-cache.sh "${DEVICE_CACHE_SCRIPT_URL}" \
 && sh install-device-cache.sh \
 && rm install-device-cache.sh \
 && npm cache clean --force

FROM node:24-alpine AS prod-deps

RUN apk add --no-cache --virtual .build-deps g++ make py3-pip sqlite-dev python3

ARG KUBERNETES_DRIVER_TAG=nightly
ENV NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
 && npm install --no-save --omit=dev \
        pg-hstore@^2.3.4 \
        @flowfuse/driver-kubernetes@${KUBERNETES_DRIVER_TAG} \
 && npm cache clean --force \
 && apk del .build-deps

FROM node:24-alpine

RUN apk add --no-cache git

WORKDIR /usr/src/forge

ENV FLOWFORGE_HOME=/usr/src/forge

COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node --from=prod-deps /build/node_modules     ./node_modules
COPY --chown=node:node --from=builder   /build/forge            ./forge
COPY --chown=node:node --from=builder   /build/frontend         ./frontend
COPY --chown=node:node --from=device-cache /build/var/device/cache ./var/device/cache

USER node

EXPOSE 3000

CMD ["node", "forge/app.js"]
