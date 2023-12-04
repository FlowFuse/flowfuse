FROM node:18-alpine

WORKDIR //usr/src/forge
#COPY docker/etc/flowforge.yml /usr/src/forge/etc/flowforge.yml
COPY package.json .
COPY forge /usr/src/forge/forge/
COPY node_modules /usr/src/forge/node_modules/
COPY frontend /usr/src/forgefrontend/

ENV FLOWFORGE_HOME=/usr/src/forge

EXPOSE 3000

CMD ["npm", "start"]
# CMD ["sleep", "infinity"]
