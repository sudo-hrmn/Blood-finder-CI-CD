# Stage 1: Build the React app
FROM node:20-alpine AS build

WORKDIR /app

# copy dependency files
COPY package*.json ./

# install dependencies
RUN npm ci

# copy project files
COPY . .

# build the React project
RUN npm run build


# Stage 2: Serve using Nginx
FROM nginx:alpine

# copy build files to nginx
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]