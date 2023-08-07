FROM rust:1.69.0

RUN mkdir /app
WORKDIR /app

COPY ./Rocket.toml ./
COPY ./Cargo.toml ./
ADD ./src ./src

RUN cargo build  --release --no-default-features  --features curv-kzen/num-bigint
CMD ./target/release/side-1
