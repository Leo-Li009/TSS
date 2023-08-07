FROM amazonlinux as enclave-signer
RUN mkdir /app

WORKDIR /app


ARG REGION_ARG=ap-southeast-1
ARG VSOCK_PORT=5000
ARG VSOCK_PROXY_PORT=8001
ENV REGION=$REGION_ARG
ENV VSOCK_PORT=5000
ENV VSOCK_PROXY_PORT=8001
RUN  yum -y install iproute socat

RUN mkdir server
RUN mkdir side-1
COPY  ./server/ ./server
COPY  ./side-1 ./side-1

COPY run.sh ./
CMD  bash /app/run.sh