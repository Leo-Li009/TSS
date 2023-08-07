ip addr add 127.0.0.1/32 dev lo

ip link set dev lo up

echo "127.0.0.1   dynamodb.ap-southeast-1.amazonaws.com" >> /etc/hosts
ls /app/
cd /app/server
/app/server/servers &
cd ../side-1
#/app/side-1/side-1 &
cd ../../
socat VSOCK-LISTEN:8222,fork,reuseaddr TCP:127.0.0.1:8222
#socat TCP-LISTEN:6379,fork,reuseaddr VSOCK-CONNECT:3:6379
                                                                