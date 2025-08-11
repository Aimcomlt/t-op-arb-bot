FROM node:20-slim

WORKDIR /app

COPY package.json ./

RUN npm install --omit=dev

COPY dist ./dist

EXPOSE 8080
EXPOSE 9108

CMD ["node", "dist/index.js"]
