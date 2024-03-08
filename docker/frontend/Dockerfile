FROM node:18-alpine
# FROM node:13.1-alpine
WORKDIR /app
COPY package.json .
RUN npm install -f
COPY . .
EXPOSE 8081
CMD ["npm", "run", "dev"]
