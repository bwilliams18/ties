FROM nginx:latest

# Install Node.js
RUN apt-get update
RUN apt-get install -y nodejs npm



RUN mkdir /app
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY . /app
RUN npm install
# RUN sentry-cli releases new $COMMIT_HASH
RUN npm run build


# Use the official Nginx image from the Docker Hub


# Remove the default configuration file
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom configuration file to the container
COPY proxy.conf /etc/nginx/conf.d/

# Expose port 80
EXPOSE 80
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Run Nginx in the foreground
CMD ["/start.sh"]