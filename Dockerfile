# Base image: Alpine with Node.js 20
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Install dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm install

# Copy application code to the working directory
COPY src ./
COPY LICENSE ./
COPY README.md ./
COPY tsconfig.json ./

# Build NodeJS application
RUN npm run nodejs:clean
RUN npm run nodejs:build

# Specify the default command to run your Node.js application
CMD ["node", "dist/index.js"]