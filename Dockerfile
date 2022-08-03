FROM rust:alpine AS hpnc
RUN cargo install hpn-client

FROM node:alpine AS builder
WORKDIR /work
COPY . .
RUN yarn install --frozen-lockfile
RUN yarn build

FROM node:alpine
WORKDIR /app
COPY --from=hpnc /usr/local/cargo/bin/hpnc /usr/local/bin
COPY --from=builder /work .
RUN yarn install --frozen-lockfile --production
CMD ["node", "build/index.js"]
