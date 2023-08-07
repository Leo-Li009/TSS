use crypto::symmetriccipher::{SymmetricCipherError, self};
use crypto::buffer::{ ReadBuffer, WriteBuffer, BufferResult, self };
use crypto::aes;
use crypto::blockmodes;
use sha3::{Digest, Keccak256};

use std::process::Command;
use std::process::Stdio;
// Compute the address of an uncompressed public key (65 bytes).
pub(crate) fn address(public_key: &Vec<u8>) -> String {
    // Remove the leading 0x04
    let bytes = &public_key[1..];
    let digest = Keccak256::digest(bytes);
    let final_bytes = &digest[12..];
    format!("0x{}", hex::encode(&final_bytes))
}

pub fn aes_decrypt(key: &[u8], ciphertext: &[u8]) -> Result<Vec<u8>, symmetriccipher::SymmetricCipherError> {
    let mut decryptor =
    aes::ecb_decryptor(aes::KeySize::KeySize256, key, blockmodes::PkcsPadding);

let mut final_result = Vec::<u8>::new();
let mut read_buffer = buffer::RefReadBuffer::new(ciphertext);
let mut buffer = [0; 4096];
let mut write_buffer = buffer::RefWriteBuffer::new(&mut buffer);

loop {
    let result = decryptor.decrypt(&mut read_buffer, &mut write_buffer, true)?;
    final_result.extend(
        write_buffer
            .take_read_buffer()
            .take_remaining()
            .iter()
            .map(|&i| i),
    );
    match result {
        BufferResult::BufferUnderflow => break,
        BufferResult::BufferOverflow => {}
    }
}

Ok(final_result)

}

pub fn aes_encrypt(plaintext: &[u8], key: &[u8]) -> Result<Vec<u8>, SymmetricCipherError> {
    let mut encryptor =
        aes::ecb_encryptor(aes::KeySize::KeySize256, key, blockmodes::PkcsPadding);
    let mut final_result = Vec::<u8>::new();
    let mut read_buffer = buffer::RefReadBuffer::new(plaintext);
    let mut buffer = [0; 4096];
    let mut write_buffer = buffer::RefWriteBuffer::new(&mut buffer);

    loop {
        let result = encryptor.encrypt(&mut read_buffer, &mut write_buffer, true)?;

        final_result.extend(
            write_buffer
                .take_read_buffer()
                .take_remaining()
                .iter()
                .map(|&i| i),
        );

        match result {
            BufferResult::BufferUnderflow => break,
            BufferResult::BufferOverflow => {}
        }
    }

    Ok(final_result)
}

//enclave call kms gendatakey
 pub fn kms_call(aws_access_key_id:&str,aws_secret_access_key:&str,aws_session_token:&str) ->Vec<String>{
    let cmd = "genkey";

    let region="ap-southeast-1";
    let port = "8000";
    let output = Command::new("/app/kmstool_enclave_cli")
            .arg(cmd)
            .arg("--region")
            .arg(region)
            .arg("--proxy-port")
            .arg(port)
            .arg("--aws-access-key-id")
            .arg(aws_access_key_id)
            .arg("--aws-secret-access-key")
            .arg(aws_secret_access_key)
            .arg("--aws-session-token")
            .arg(aws_session_token)
            .arg("--key-id")
            .arg("9cf47a5c-8ac5-43b0-9e61-129e18b27e3d")
            .arg("--key-spec")
            .arg("AES-256")
            .stdout(Stdio::piped())
            .output()
            .expect("Failed to execute command");

            let result = String::from_utf8_lossy(&output.stdout);
            let mut gendatakey: Vec<String> = Vec::new();

            let plaintext_b64 = result.split(":").nth(2).map(|s| s.trim().to_string());
            if let Some(b64) = plaintext_b64 {
                gendatakey.push(b64.to_string());
            } else {
                todo!(); // Handle the case when ciphertext Base64 is not found
            }

            gendatakey
}