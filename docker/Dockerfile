FROM node:18-alpine

WORKDIR /app
COPY docker/etc/flowforge.yml /app/etc/flowforge.yml
COPY package.json .
COPY forge /app/forge/
COPY node_modules /app/node_modules/
COPY frontend /app/frontend/

ENV FLOWFORGE_HOME=/app

EXPOSE 3000

# CMD ["npm", "start"]
CMD ["sleep", "infinity"]
