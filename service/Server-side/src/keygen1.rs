use anyhow::{anyhow, Context, Result};
use futures::StreamExt;
use structopt::StructOpt;
use reqwest::header::HeaderMap;

use multi_party_ecdsa::protocols::multi_party_ecdsa::gg_2020::state_machine::keygen::Keygen;
use round_based::async_runtime::AsyncProtocol;
use crate::utils::{kms_call,aes_encrypt,address};
use serde::{Serialize, Deserialize};
use crate::client::join_computation;


#[derive(Serialize, Deserialize)]
struct RequestData {
    address:String,
    nonce: String,
    encrypted_data: String,
    encrypted_key: String,
}
#[derive(Debug, StructOpt)]
struct Cli {
    #[structopt(short, long, default_value = "http://localhost:8222/")]
    address: surf::Url,
    // #[structopt(short, long, default_value = "default-keygen")]
    // room: String,
    // #[structopt(short, long,default_value ="key-1.json")]
    // output: PathBuf,

     #[structopt(short, long,default_value = "1")]
     index: u16,
    #[structopt(short, long,default_value = "1")]
    threshold: u16,
    #[structopt(short, long,default_value = "3")]
    number_of_parties: u16,
}

async fn storage_key (message:String){

    println!("message:{:?}",message);
       let url = "http://127.0.0.1:8222/storage_key";
       let send=reqwest::Client::new();
       let mut headers = HeaderMap::new();
       headers.insert("Content-Type", "application/json".parse().unwrap());
       let _=send.post(url).headers(headers).body(message.to_owned()).send().await;
   }

pub async fn keygen(room_id:String) -> Result<()> {
  
   // let i = 1;
   // let url = Url::parse("http://localhost:8222/").unwrap();
   println!("keygen-start");

 // let gendatakey =  kms_call(aws_access_key_id,aws_secret_access_key,aws_session_token);
 // let plaintext_key = &gendatakey[1];
 // let ciphertext_key = &gendatakey[0];
    
    let args: Cli = Cli::from_args();

    //  let redis = redis::Client::open("redis://127.0.0.1/").unwrap();
    //  let mut con = redis.get_connection().unwrap();
    

    let (_i, incoming, outgoing) = join_computation(args.address,&room_id)
        .await
        .context("join computation")?;
    println!("incoming: ");

    let incoming = incoming.fuse();
    tokio::pin!(incoming);
    tokio::pin!(outgoing);

    let keygen = Keygen::new(args.index, args.threshold, args.number_of_parties)?;
    println!("keygen: {:?}", keygen);
    
    let output = AsyncProtocol::new(keygen, incoming, outgoing)
        .run()
        .await
        .map_err(|e| anyhow!("protocol execution terminated with error: {}", e))?;
    println!("output: {:?}", output);
    let address = address(&output.public_key().to_bytes(false).to_vec());
   
    let output = serde_json::to_vec_pretty(&output).context("serialize output")?;
   // let base64_key = base64::decode(plaintext_key.as_bytes()).unwrap();
    // println!("output: {:?}", output);  
   
   // let ciphertext_data = aes_encrypt(output.as_slice(),&base64_key).unwrap();
   
//    let redis_data = RequestData {
//     address:address.clone(),
//     nonce:rand::random::<u32>().to_string(),
//     encrypted_data: base64::encode(ciphertext_data),
//     encrypted_key: ciphertext_key.to_string(),
    
//     };
  //  let message = serde_json::to_string(&redis_data).unwrap();
    //storage_key(message);
    let mut output_file = tokio::fs::OpenOptions::new()
    .write(true)
    .create_new(true)
    .open("key-1.json")
    .await
    .context("cannot create output file")?;
    tokio::io::copy(&mut output.as_slice(), &mut output_file)
    .await
    .context("save output to file")?;

    Ok(())
}
