# Multi-stage Dockerfile for FreqLab Strategy Optimizer Web Application
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copy application source code
COPY . .

# Build the production bundle
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Install lightweight preview server or serve dist
RUN npm install -g serve

COPY --from=build /app/dist ./dist

# Expose port 3000
EXPOSE 3000

# Start static file server on port 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
