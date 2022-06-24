FROM node:18 AS builder
WORKDIR /build
COPY . .
RUN yarn install --frozen-lockfile && yarn build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /build/dist/index.js hob.js
CMD ["node", "hob.js"]

