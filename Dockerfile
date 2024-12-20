# Base image: Alpine with Node.js 20
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy application code to the working directory
COPY . .

# Install dependencies
RUN npm install

# Specify the default command to run your Node.js application
CMD ["node", "dist/index.js"]