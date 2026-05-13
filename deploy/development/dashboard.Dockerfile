ARG NODE_VERSION=22-alpine
FROM node:${NODE_VERSION}

WORKDIR /app

COPY source/dashboard/package*.json ./
RUN npm install

COPY source/dashboard/ .

EXPOSE 5173

CMD ["npm", "run", "dev"]
