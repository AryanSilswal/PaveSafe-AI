FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# We need to pass build args if we want to bake the URL in
# But Next.js handles NEXT_PUBLIC_ vars at runtime in Docker if we are careful,
# or we can just build it here. For simplicity, we just build.
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
