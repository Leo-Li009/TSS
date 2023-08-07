// use anyhow::{anyhow, Context, Result};
// use futures::StreamExt;

// use structopt::StructOpt;

// use std::path::PathBuf;
// use round_based::async_runtime::AsyncProtocol;
// use std::collections::HashMap;

// use crate::client::join_computation;

// #[derive(Debug, StructOpt)]
// struct Cli {
//     #[structopt(short, long, default_value = "http://localhost:8222/")]
//     address: surf::Url,
//     #[structopt(short, long, default_value = "default-keygen")]
//     room: String,
//     // #[structopt(short, long)]
//     // output: PathBuf,

//     // #[structopt(short, long)]
//     // index: u16,
//     // #[structopt(short, long)]
//     // threshold: u16,
//     // #[structopt(short, long)]
//     // number_of_parties: u16,
// }
// #[no_mangle]
// pub async fn refresh(local_share1:PathBuf,index:u16) -> Result<()> {
//     let args: Cli = Cli::from_args();
//     let local_share = tokio::fs::read(local_share1)
//         .await
//         .context("cannot read local share")?;
//     let local_share = serde_json::from_slice(&local_share).context("parse local share")?;
//     let mut old_to_new_map:HashMap<u16,u16> = HashMap::new();
//     old_to_new_map.insert(1, 2);
    
//     let (i, incoming, outgoing) =join_computation(args.address.clone(), &args.room)
//         .await
//         .context("join offline computation")?;
  
  
//     // join_computation(args.address.clone(), &format!("{}-offline", args.room))
//     //     .await
//     //     .context("join offline computation")?;

// let incoming = incoming.fuse();
// tokio::pin!(incoming);
// tokio::pin!(outgoing);
// let refresh= refresh::state_machine::KeyRefresh::new(local_share, Some(index), &old_to_new_map, 2,3)?;
// let local_sharet = AsyncProtocol::new(refresh, incoming, outgoing)
//     .run()
//     .await
//     .map_err(|e| anyhow!("protocol execution terminated with error: {}", e))?;
// tokio::fs::write(local_share1, serde_json::to_vec(&local_sharet)?)
//     .await
//     .context("save output to file")?;

// Ok(())


// }