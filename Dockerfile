FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY patchhub-backend-package.json package.json
COPY patchhub-backend-server.js server.js
COPY patchhub-backend-database.js database.js

# Copy routes
RUN mkdir -p routes
COPY patchhub-routes-auth.js routes/auth.js
COPY patchhub-routes-contacts.js routes/contacts.js
COPY patchhub-routes-campaigns.js routes/campaigns.js
COPY patchhub-routes-analytics.js routes/analytics.js

# Install dependencies
RUN npm install

# Create necessary directories
RUN mkdir -p uploads data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["npm", "start"]
