mod client;
mod keygen1;
mod sign1;
mod tx;
pub mod keyrecovery;
use keygen1 as other_keygen;
use keyrecovery as other_keyrecovery;
use rocket::figment::value;
use sign1 as other_sign;
use std::io;
use std::path::PathBuf;
use std::str::FromStr;
use tx as other_tx;
use web3::signing::Signature;
use web3::types::{H256, U256};
use web3::{transports::Http, Web3};

#[tokio::main]
async fn main() {
    loop {
        println!("Welcome to MPC GG20 program!");
        println!("Please choose an option:");
        println!("1. Generate keypair");
        println!("2. Sign message");
        println!("3. Refresh keypair");

        let mut input = String::new();
        io::stdin()
            .read_line(&mut input)
            .expect("Failed to read input");

        let option: u32 = input.trim().parse().expect("Invalid input");

        match option {
            1 => {
                println!("Please enter index:");
                let mut input = String::new();
                io::stdin()
                    .read_line(&mut input)
                    .expect("Failed to read input");
                let index: u16 = input.trim().parse().expect("Invalid index");

                println!("Please enter output file path:");
                let mut output = String::new();
                io::stdin()
                    .read_line(&mut output)
                    .expect("Failed to read input");
                let a = PathBuf::from(output.trim());
                other_keygen::keygen(a, index).await;
            }
            2 => {
                println!("Please enter local share file path:");
                let mut input = String::new();
                io::stdin()
                    .read_line(&mut input)
                    .expect("Failed to read input");
                let local_share = PathBuf::from(input.trim());

                println!("Please enter comma-separated list of parties:");
                let mut input = String::new();
                io::stdin()
                    .read_line(&mut input)
                    .expect("Failed to read input");
                let parties: Vec<u16> = input
                    .trim()
                    .split(',')
                    .map(|s| s.parse().unwrap())
                    .collect();
                println!("{:?}", parties);

                // println!("Please enter toAddress:");
                // let mut input = String::new();
                // io::stdin()
                //     .read_line(&mut input)
                //     .expect("Failed to read input");
                // let address = input.trim();
                // println!("{:?}", address);

                // println!("Please enter value :");
                // let mut input = String::new();
                // io::stdin()
                //     .read_line(&mut input)
                //     .expect("Failed to read input");
                // let ether = f64::from_str(input.trim()).unwrap();
                // let wei = (ether * 1e18).round() as u64;
                // let value = U256::from(wei).to_string();
                // println!("{:?}", value);

                // println!("Please enter nonce :");
                // let mut input = String::new();
                // io::stdin()
                //     .read_line(&mut input)
                //     .expect("Failed to read input");
                // let nonce = input.trim();
                // println!("{:?}", nonce);

                // println!("Please enter gas:");
                // let mut input = String::new();
                // io::stdin()
                //     .read_line(&mut input)
                //     .expect("Failed to read input");
                // let gas = input.trim();
                // println!("{:?}", gas);

                // println!("Please enter gasprice:");
                // let mut input = String::new();
                // io::stdin()
                //     .read_line(&mut input)
                //     .expect("Failed to read input");
                // let gasprice = input.trim();
                // println!("{:?}", gasprice);

                // println!("Please enter chainID:");
                // let mut input = String::new();
                // io::stdin()
                //     .read_line(&mut input)
                //     .expect("Failed to read input");
                // let chain_id = input.trim().parse().expect("Invalid number");
                // println!("{:?}", chain_id);

                println!("Please enter data:");
                let mut input = String::new();
                io::stdin()
                    .read_line(&mut input)
                    .expect("Failed to read input");
                let data = input.trim();
                println!("{:?}", data.as_bytes());

                // let t = other_tx::Transaction::from(
                //     nonce,
                //     address,
                //     &value,
                //     gas,
                //     gasprice,
                //     data.as_bytes().to_vec(),
                // );
                // println!("{:?}", t.sighash(chain_id));

                // let sig = other_sign::sign(local_share, parties, &t.sighash(chain_id))
                //     .await
                //     .unwrap();

                let sig = other_sign::sign(local_share, parties, data.as_bytes())
                     .await
                     .unwrap();
                   // println!("data-s{:?}",data.as_bytes());
                println!(
                    "signature {{ r:0x{}, s:0x{}, v:{} }}",
                    hex::encode(sig.r.to_bytes().as_ref()),
                    hex::encode(sig.s.to_bytes().as_ref()),
                    sig.recid,
                );
                // println!(
                //     "signature {{ r:0x{}, s:0x{}, v:{} }}",
                //     hex::encode(sig.r.to_bytes().as_ref()),
                //     hex::encode(sig.s.to_bytes().as_ref()),
                //     sig.recid,
                // );
                // let v = match chain_id {
                //     0 => sig.recid as u64 + 27,
                //     _ => sig.recid as u64 + 35 + chain_id * 2,
                // };

                // let signed = t.encode(
                //     chain_id,
                //     Some(&Signature {
                //         r: H256::from_slice(sig.r.to_bytes().as_ref()),
                //         s: H256::from_slice(sig.s.to_bytes().as_ref()),
                //         v,
                //     }),
                // );

                // println!("raw transaction: 0x{}", hex::encode(signed));

                // let http_transport = Http::from_str(
                //     "http://Bastion-goerli-595491602.ap-southeast-1.elb.amazonaws.com:8221",
                // )
                // .unwrap();
                // let web3 = Web3::new(http_transport);

                // // 已签名的交易数据
                // let signed_transaction_data = hex::encode(signed); 

                // // 发送已签名的交易
                // let transaction_hash = web3
                //     .eth()
                //     .send_raw_transaction(signed_transaction_data.parse()?)
                //     .await?;

                // println!("Transaction sent, hash: {:?}", transaction_hash);
            }
            3 => {
                println!("Please enter local share file path:");
                // let mut input = String::new();
                // io::stdin()
                //     .read_line(&mut input)
                //     .expect("Failed to read input");
                // let local_share = PathBuf::from(input.trim());

                // println!("Please enter comma-separated list of parties:");
                // let mut input = String::new();
                // io::stdin()
                //     .read_line(&mut input)
                //     .expect("Failed to read input");
                // let parties: Vec<u16> = input
                //     .trim()
                //     .split(',')
                //     .map(|s| s.parse().unwrap())
                //     .collect();
                // println!("{:?}", parties);

                // println!("Please enter index:");
                // let mut input = String::new();
                // io::stdin()
                //     .read_line(&mut input)
                //     .expect("Failed to read input");
                // let index: u16 = input.trim().parse().expect("Invalid index");

                // other_keyrecovery::refresh(local_share,index).await;

            },
            4 => break,
            _ => println!("Invalid option"),
        }
    }
    //   ok(())
}
