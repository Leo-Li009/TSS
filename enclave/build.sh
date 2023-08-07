ENCLAVE_DOCKER_IMAGE_NAME=enclave-tss-image
ENCLAVE_DOCKER_IMAGE_TAG=version0.1
ENCLAVE_EIF_NAME=enclave-tss.eif
ENCLAVE_NAME=enclave-tss
ENCLAVE_VSOCK_CID=555666666
ENCLAVE_MEMORY=5900
ENCLAVE_CPU_COUNT=2
DEBUG=1

cp ../../aws-nitro-enclaves-sdk-c/bin/kmstool-enclave-cli/kmstool_enclave_cli kms/
cp ../../aws-nitro-enclaves-sdk-c/bin/kmstool-enclave-cli/libnsm.so kms/

nitro-cli terminate-enclave --enclave-name $ENCLAVE_NAME

docker build . -t $ENCLAVE_DOCKER_IMAGE_NAME:$ENCLAVE_DOCKER_IMAGE_TAG

rm $ENCLAVE_EIF_NAME
nitro-cli build-enclave --docker-uri $ENCLAVE_DOCKER_IMAGE_NAME:$ENCLAVE_DOCKER_IMAGE_TAG --output-file $ENCLAVE_EIF_NAME

if ! [[ "$DEBUG" -eq 0 ]]; then
   # Debug mode
   nitro-cli run-enclave --eif-path $ENCLAVE_EIF_NAME --memory $ENCLAVE_MEMORY --cpu-count $ENCLAVE_CPU_COUNT --debug-mode --enclave-cid $ENCLAVE_VSOCK_CID --enclave-name $ENCLAVE_NAME

   # Connect console to the enclave
   nitro-cli console --enclave-name $ENCLAVE_NAME
else
   # Release mode
   nitro-cli run-enclave --eif-path $ENCLAVE_EIF_NAME --memory $ENCLAVE_MEMORY --cpu-count $ENCLAVE_CPU_COUNT --enclave-cid $ENCLAVE_VSOCK_CID --enclave-name $ENCLAVE_NAME
fi