FROM rust:1.69.0

RUN mkdir /app
WORKDIR /app

COPY ./Cargo.toml ./
COPY ./Cargo.lock ./
COPY ./rust-toolchain ./
ADD ./src ./src

RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
RUN apt update
RUN apt install clang -y

CMD wasm-pack build --target nodejs
