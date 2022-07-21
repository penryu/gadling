FROM rust:alpine AS hpnc
RUN cargo install hpn-client

FROM node:alpine AS builder
WORKDIR /work
COPY . .
RUN yarn install --frozen-lockfile
RUN yarn build

FROM node:alpine
WORKDIR /app
COPY --from=builder /work/build /work/package.json /work/yarn.lock ./
COPY --from=builder /work/migrations migrations/
COPY --from=hpnc /usr/local/cargo/bin/hpnc /usr/local/bin
RUN yarn install --frozen-lockfile --production
CMD ["node", "index.js"]
