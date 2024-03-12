# Build hpnc
FROM rust:alpine AS hpnc
RUN cargo install hpn

# Build bot
FROM node:alpine AS builder
WORKDIR /work
COPY . .
RUN yarn install --frozen-lockfile
RUN yarn build

# Combine ingredients
FROM node:alpine
WORKDIR /app

ENV TZ=US/Pacific
RUN apk add --no-cache tzdata
RUN cp /usr/share/zoneinfo/US/Pacific /etc/localtime

COPY words /usr/share/dict/words

COPY --from=hpnc /usr/local/cargo/bin/hpnc /usr/local/bin
COPY --from=builder /work/package.json .
COPY --from=builder /work/build build

# Only non-production modules in final image; cuts image size by ~50%
RUN yarn install --frozen-lockfile --production

CMD ["node", "build/index.js"]
