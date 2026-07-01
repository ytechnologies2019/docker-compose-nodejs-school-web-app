# 1. Use a lightweight Node image to keep container size minimal (~150MB)
FROM node:20

# 2. Establish the active directory inside the container
WORKDIR /usr/src/app

# 3. Copy only the package files first to optimize Docker layer caching
COPY package*.json ./

# 4. Install production dependencies cleanly (skips devDependencies)
RUN npm ci --only=production

# 5. Copy your application source code (including your new app.js)
COPY . .

# 6. Expose the port your Express app binds to
EXPOSE 3000

# 7. Execute the application
CMD ["node", "app.js"]