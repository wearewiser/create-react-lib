FROM node:18.4
ENV NODE_ENV=production
WORKDIR /usr/src/app
ADD ./ ./
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["node","server.js"]
