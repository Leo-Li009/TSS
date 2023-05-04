use std::path::PathBuf;

use anyhow::{anyhow, Context, Result};
use futures::{SinkExt, StreamExt, TryStreamExt};
use structopt::StructOpt;

use curv::arithmetic::Converter;
use curv::BigInt;

use multi_party_ecdsa::protocols::multi_party_ecdsa::gg_2020::{
    party_i::SignatureRecid,
    state_machine::sign::{OfflineStage, SignManual},
};
use round_based::async_runtime::AsyncProtocol;
use round_based::Msg;
use wasm_bindgen::prelude::*;

use crate::client::join_computation;

#[derive(Debug, StructOpt)]
struct Cli {
    #[structopt(short, long, default_value = "http://localhost:8222/")]
    address: surf::Url,
    #[structopt(short, long, default_value = "default-signing")]
    room: String,
    // #[structopt(short, long)]
    // local_share: PathBuf,

    // #[structopt(short, long, use_delimiter(true))]
    // parties: Vec<u16>,
    // #[structopt(short, long)]
    // data_to_sign: String,
}

pub async fn sign(local_share1:PathBuf,parties:Vec<u16>,data:&[u8]) -> Result<SignatureRecid> {
    let args: Cli = Cli::from_args();
    let local_share = tokio::fs::read(local_share1)
        .await
        .context("cannot read local share")?;
    let local_share = serde_json::from_slice(&local_share).context("parse local share")?;
    let number_of_parties = parties.len();

    let (i, incoming, outgoing) =
        join_computation(args.address.clone(), &format!("{}-offline", args.room))
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

    let (_i, incoming, outgoing) = join_computation(args.address, &format!("{}-online", args.room))
        .await
        .context("join online computation")?;

    tokio::pin!(incoming);
    tokio::pin!(outgoing);
 println!("data{:?}",BigInt::from_bytes(data));
    let (signing, partial_signature) = SignManual::new(
        BigInt::from_bytes(data),
        completed_offline_stage,
    )?;
    println!("online stage completed11111111");

    outgoing
        .send(Msg {
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
    println!("partial_signatures{:?}",partial_signatures);
    let signature = signing
        .complete(&partial_signatures)
        .context("online stage failed")?;
   
    // let signature = serde_json::to_string(&signature).context("serialize signature")?;
    // println!("{}", signature);

    Ok(signature)
}
