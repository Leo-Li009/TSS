use anyhow::{anyhow, Context, Result};
use futures::StreamExt;

use std::path::PathBuf;
use structopt::StructOpt;

use multi_party_ecdsa::protocols::multi_party_ecdsa::gg_2020::state_machine::keygen::Keygen;
use round_based::async_runtime::AsyncProtocol;
use wasm_bindgen::prelude::*;

use crate::client::join_computation;

#[derive(Debug, StructOpt)]
struct Cli {
    #[structopt(short, long, default_value = "http://localhost:8222/")]
    address: surf::Url,
    #[structopt(short, long, default_value = "default-keygen")]
    room: String,
    // #[structopt(short, long)]
    // output: PathBuf,

    // #[structopt(short, long)]
    // index: u16,
    // #[structopt(short, long)]
    // threshold: u16,
    // #[structopt(short, long)]
    // number_of_parties: u16,
}

pub async fn keygen(output:PathBuf,index:u16) -> Result<()> {
    let t = 1;
    let n = 3;
   // let i = 1;
   // let url = Url::parse("http://localhost:8222/").unwrap();
    let args: Cli = Cli::from_args();
    let mut output_file = tokio::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(output)
        .await
        .context("cannot create output file")?;

    let (_i, incoming, outgoing) = join_computation(args.address,&args.room)
        .await
        .context("join computation")?;
    // while let Some(item) = incoming. .await {
    //     println!("Item: {}", item);
    // }

    let incoming = incoming.fuse();
    tokio::pin!(incoming);
    tokio::pin!(outgoing);

    let keygen = Keygen::new(index, t, n)?;
    println!("keygen: {:?}", keygen);
    
    // println!("incoming: {:?}", incoming.next());
    // println!("outgoing: {:?}", outgoing);
    let output = AsyncProtocol::new(keygen, incoming, outgoing)
        .run()
        .await
        .map_err(|e| anyhow!("protocol execution terminated with error: {}", e))?;
    println!("output: {:?}", output);
    let output = serde_json::to_vec_pretty(&output).context("serialize output")?;
    tokio::io::copy(&mut output.as_slice(), &mut output_file)
        .await
        .context("save output to file")?;

    Ok(())
}
