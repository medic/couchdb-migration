FROM node:16.18.1-alpine3.16

COPY . /app
RUN cd app && npm ci --omit=dev && npm link
