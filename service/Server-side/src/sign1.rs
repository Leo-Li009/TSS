
use anyhow::{anyhow, Context, Result};
use futures::{SinkExt, StreamExt, TryStreamExt};
use curv::arithmetic::Converter;
use curv::BigInt;
use rocket::serde::json::Json;
use structopt::StructOpt;
use redis::Commands;
use multi_party_ecdsa::protocols::multi_party_ecdsa::gg_2020::{
    party_i::SignatureRecid,
    state_machine::sign::{OfflineStage, SignManual},
};
use serde_json::Value;
use reqwest::header::HeaderMap;
use round_based::async_runtime::AsyncProtocol;
use round_based::Msg;
use web3::signing;
use serde::{Serialize, Deserialize};
use crate::utils::aes_decrypt;
use crate::client::join_computation;

const ETHEREUM_HEADER : &str= "\x19Ethereum Signed Message:\n";


#[derive(Serialize, Deserialize)]
struct Signature {
    r: String,
    s: String,
    v: u8,
}

#[derive(Debug, StructOpt)]
struct Cli {
    #[structopt(short, long, default_value = "http://localhost:8222/")]
    address: surf::Url,
    // #[structopt(short, long, default_value = "default-signing")]
    // room: String,
    // #[structopt(short, long)]
    // local_share: PathBuf,

    // #[structopt(short, long, use_delimiter(true))]
    // parties: Vec<u16>,
    // #[structopt(short, long)]
    // data_to_sign: String,
}

async fn get_key(address:String)->String{

    let url = "http://127.0.0.1:8222/key/".to_owned()+&address+"/get";
     let send=reqwest::Client::new();
     let mut headers = HeaderMap::new();
     headers.insert("Content-Type", "application/json".parse().unwrap());
     let result =send.get(url).headers(headers).send().await.unwrap();
     let response_body = result.text().await.unwrap();
     println!("response_body{:?}",response_body);
     response_body
 }
 
 async fn get_datakey(address:String)->String{
      let url = "http://127.0.0.1:8111/get_datakey";
     let send=reqwest::Client::new();
     let mut headers = HeaderMap::new();
     headers.insert("Content-Type", "application/json".parse().unwrap());
     let result=send.post(url).headers(headers).body(address.to_owned()).send().await.unwrap();
     let response_body = result.text().await.unwrap();
     let json: Value = serde_json::from_str(&response_body).unwrap();
    let encrypted_data = json["encrypted_data"].as_str().unwrap().to_string();
   
    encrypted_data
 }
 
 async fn insert_key(signature:String){
 
      let url = "http://127.0.0.1:8111/insert_key";
     let send=reqwest::Client::new();
     let mut headers = HeaderMap::new();
     headers.insert("Content-Type", "application/json".parse().unwrap());
     
     let _=send.post(url).headers(headers).body(signature).send().await;
 
 }
pub async fn sign(room_id:String,address:String,message:String,rlp:String) -> Result<SignatureRecid> {

    let mut data:[u8; 32] =  [0; 32];
    let parties = [1,2].to_vec();
   
   // let plainkey = get_key(address.clone()).await;
  //  let datakey = get_datakey(address).await;

   // let base64_plainkey = base64::decode(plainkey.as_bytes()).unwrap();
   // let base64_datakey = base64::decode(datakey).unwrap();
   // let local_share = aes_decrypt(&base64_plainkey,&base64_datakey).unwrap();
   let local_share = tokio::fs::read("key-1.json")
   .await
   .context("cannot read local share")?;
    if message.is_empty(){
         let bytes = hex::decode(&rlp).unwrap();
        data=bytes.get(..32).unwrap_or(&[0;32]).try_into().unwrap();
       
        println!("data: {:?}", data);

    }else {
        let length_str = message.len().to_string();
        println!("length_str: {:?}", length_str);
        let header = ETHEREUM_HEADER.to_owned()+&length_str+&message;
        data = signing::keccak256(&header.as_bytes());
        println!("data: {:?}", data);
    };
    

    let args: Cli = Cli::from_args();
   
    let local_share = serde_json::from_slice(&local_share).context("parse local share")?;
    let number_of_parties = parties.len();

    let (i, incoming, outgoing) =
        join_computation(args.address.clone(), &format!("{}-offline", room_id))
            .await
            .context("join offline computation")?;

    let incoming = incoming.fuse();
    tokio::pin!(incoming);
    tokio::pin!(outgoing);
    println!("i am here:{:?}",i);

    let signing = OfflineStage::new(i, parties, local_share)?;
    println!("offline stage completed");
    let completed_offline_stage = AsyncProtocol::new(signing, incoming, outgoing)
        .run()
        .await
        .map_err(|e| anyhow!("protocol execution terminated with error: {}", e))?;
    println!("online stage completed");

    let (_i, incoming, outgoing) = join_computation(args.address, &format!("{}-online", room_id))
        .await
        .context("join online computation")?;

    tokio::pin!(incoming);
    tokio::pin!(outgoing);
    let (signing, partial_signature) = SignManual::new(
        BigInt::from_bytes(&data),
        completed_offline_stage,
    )?;
    println!("online stage completed11111111");

    outgoing
        .send(Msg {
            round:7,
            sender: i,
            receiver: None,
            body: partial_signature,
        })
        .await?;

    let partial_signatures: Vec<_> = incoming
        .take(number_of_parties - 1)
        .map_ok(|msg| msg.body)
        .try_collect()
        .await?;
   
    let signature = signing
        .complete(&partial_signatures)
        .context("online stage failed")?;
   
    let json_string = serde_json::to_string(&signature).unwrap();
//    if validate {
//     insert_key(json_string).await;
// }
    Ok(signature)
}
