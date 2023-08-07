mod client;
mod keygen1;
mod sign1;
mod tx;
mod utils;
pub mod keyrecovery;
use keygen1 as other_keygen;
use rocket::serde::json::Json;
use sign1 as other_sign;
use rocket::data::ToByteUnit;
use rocket::serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct MessageKeygen {
    pub room_id: String,
    // access_key_id: String,
    // secret_access_key: String,
    // token: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MessageSign {
    pub room_id: String,
    pub address : String,
    pub message: String,
    pub rlp    : String,
  //  pub vaildate :bool,
   
}

#[rocket::post("/sign",data="<message>")]
 async fn sign(message: Json<MessageSign>){
    
    let _ =other_sign::sign(
        message.room_id.clone(),
        message.address.clone(),
        message.message.clone(),
        message.rlp.clone()).await;
       // message.vaildate).await;
}

#[rocket::post("/keygen",data="<message>")]
 async fn keygen(message: Json<MessageKeygen>){
    //let access_key_id = &message.access_key_id;
   // let secret_access_key = &message.secret_access_key;
   // let token = &message.token;
    let _ = other_keygen::keygen(
        message.room_id.clone(),
        //access_key_id,
        //secret_access_key,
        //token,
    ).await;
}


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    
    let figment = rocket::Config::figment().merge((
        "limits",
        rocket::data::Limits::new().limit("string", 100.megabytes()),
    ));
    rocket::custom(figment)
    .mount("/", rocket::routes![keygen,sign])
   
    .launch()
    .await?;
Ok(())

}
