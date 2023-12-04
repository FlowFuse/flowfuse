FROM node:18-alpine

WORKDIR /usr/src/forge
#COPY docker/etc/flowforge.yml /usr/src/forge/etc/flowforge.yml
COPY package.json .
COPY forge /usr/src/forge/forge/
COPY node_modules /usr/src/forge/node_modules/
COPY frontend /usr/src/forge/frontend/

ENV FLOWFORGE_HOME=/usr/src/forge
RUN mkdir -p /home/node/.npm/_cacache && chown -R node:node /home/node/.npm

EXPOSE 3000

CMD ["npm", "start"]
# CMD ["sleep", "infinity"]
