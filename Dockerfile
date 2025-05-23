FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN rm -rf dist && pnpm build

EXPOSE ${PORT:-3000}

CMD ["pnpm", "start"] 