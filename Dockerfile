FROM node:current-alpine3.15

COPY . /app
RUN cd app && npm ci --omit=dev
ENTRYPOINT ["node", "/app/src/index.js"]
