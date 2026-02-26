FROM node:22-alpine

WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies inside the image using legacy peers as requested
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Expose the standard Vite port
EXPOSE 5173

# Start Vite with --host 0.0.0.0 so it's accessible from your browser
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]