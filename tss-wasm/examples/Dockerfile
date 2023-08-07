FROM node:18

RUN mkdir -p /app/node_modules

WORKDIR /app


COPY ./client-keygen.js ./
COPY ./package.json ./
ADD ./node_modules/@leo-003 ./node_modules

RUN npm i

CMD node ./client-keygen.js $SIDE_ID $USERNAME
