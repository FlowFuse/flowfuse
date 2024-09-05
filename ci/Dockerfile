FROM node:18-alpine AS builder

RUN apk add --no-cache --virtual build-base g++ make py3-pip sqlite-dev python3

ARG kubernetes_driver_tag=nightly

WORKDIR /build
COPY package.json /build
COPY config/ /build/config/
COPY frontend/ /build/frontend/
COPY forge/ /build/forge/
RUN npm install --no-audit --no-fund pg-hstore@^2.3.4 && \
    npm install --no-audit --no-fund @flowfuse/driver-kubernetes@$(kubernetes_driver_tag) && \
    npm install --no-audit --no-fund && \    
    npm run build


FROM node:18-alpine

WORKDIR /usr/src/forge
COPY package.json .
COPY --from=builder /build/forge /usr/src/forge/forge/
COPY --from=builder /build/node_modules /usr/src/forge/node_modules/
COPY --from=builder /build/frontend /usr/src/forge/frontend/

ENV FLOWFORGE_HOME=/usr/src/forge

EXPOSE 3000

CMD [ "node", "forge/app.js"]
