# Use a Bun image as the base
FROM oven/bun:1.1.40

# Set the working directory in the container
WORKDIR /app

# Copy package.json, tsconfig.json, and src to the working directory
COPY package.json tsconfig.json src ./ 

# Install dependencies
RUN bun install


# Copy the rest of the application code
COPY . .

RUN bun prisma generate

# Expose the port your Hono app will listen on
EXPOSE 3001

# Start the app
CMD ["bun", "run", "src/index.ts"]
