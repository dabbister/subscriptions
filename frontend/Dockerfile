FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the application source code
COPY . ./

# Expose port 3000
EXPOSE 3000

# Run Nginx
CMD ["npm",  "start"]