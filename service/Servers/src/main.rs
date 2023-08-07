use std::collections::hash_map::{Entry, HashMap};
use std::sync::{
    atomic::{AtomicU16, Ordering},
    Arc,
};


use std::vec;
use redis::Commands;
use rocket_cors::{Cors,AllowedHeaders, AllowedOrigins, CorsOptions};
use reqwest::header::HeaderMap;
use futures::Stream;
use rocket::data::ToByteUnit;

use rocket::http::Status;
use rocket::request::{FromRequest, Outcome, Request};
use rocket::response::stream::{stream, Event, EventStream};
use rocket::serde::json::Json;
use rocket::State;
use serde::{Deserialize, Serialize};
use tokio::sync::{Notify, RwLock};


#[derive(Serialize, Deserialize, Debug)]
pub struct MessageGet {
    pub side: String,
    pub username : String
}
#[derive(Serialize, Deserialize, Debug)]
pub struct MessageRemove {
    pub username : String
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MessageSet {
    pub side : String,
    pub username : String,
    pub key: String,
   
}

#[rocket::get("/rooms/<room_id>/subscribe")]
async fn subscribe(
    db: &State<Db>,
    mut shutdown: rocket::Shutdown,
    last_seen_msg: LastEventId,
    room_id: &str,
) -> EventStream<impl Stream<Item = Event>> {
    println!("subscribing to room {}", room_id);
    let room = db.get_room_or_create_empty(room_id).await;
    let mut subscription = room.subscribe(last_seen_msg.0);
    EventStream::from(stream! {
        loop {
            let (id, msg) = tokio::select! {
                message = subscription.next() => {
                   
                    message},
                _ = &mut shutdown => return,
            };
            yield Event::data(msg)
                .event("new-message")
                .id(id.to_string())
        }
    })
}


#[rocket::post("/rooms/<room_id>/issue_unique_idx")]
async fn issue_idx(db: &State<Db>, room_id: &str) -> Json<IssuedUniqueIdx> {
    let room = db.get_room_or_create_empty(room_id).await;
    let idx = room.issue_unique_idx();
    Json::from(IssuedUniqueIdx { unique_idx: idx })
}

#[rocket::post("/rooms/<room_id>/broadcast", data = "<message>")]
async fn broadcast(db: &State<Db>, room_id: &str, message: String) -> Status {
    let room = db.get_room_or_create_empty(room_id).await;
    
//println!("room-id{}",room_id);
    room.publish(message).await;
  //  println!("room:{:?}",room.messages.read().await);
   
    Status::Ok
}

#[rocket::get("/rooms/<room_id>/getinfer")]
async fn getinfer(db: &State<Db>, room_id: &str,_last_seen_msg: LastEventId,) -> Json<Vec<String>>{
    let room = db.get_room_or_create_empty(room_id).await;
    
    //println!("room:{:?}",room.messages.read().await);
  let x= room.messages.read().await.to_vec();
  Json(x)
}


#[rocket::post("/rooms/<room_id>/broadcast-c", data = "<message>")]
async fn broadcast_c(db: &State<Db>, room_id: &str, message: String) -> Status {
    
    let room = db.get_room_or_create_empty(room_id).await;
  //  println!("room-id-c{}",room_id);
    //let mut subs=room.clone().subscribe(last_seen_msg.0);
    let _t = room.subscribers.fetch_add(1, Ordering::SeqCst);
   
    room.publish(message).await;
    println!("room-c:{:?}",room.messages.read().await);
    Status::Ok
}


#[rocket::post("/keygen", data = "<message>")]
async fn keygen(message:String){
    let url = "http://127.0.0.1:8000/keygen";
    // let message = {
    //     room_id:message.room_id,
    // };
    let send=reqwest::Client::new();
    let mut headers = HeaderMap::new();
   
    headers.insert("Content-Type", "application/json".parse().unwrap());
    let _=send.post(url).headers(headers).body(message).send().await;
}

#[rocket::post("/sign",data="<message>")]
async fn sign(message:&[u8]){
  
    let url = "http://127.0.0.1:8000/sign";
    let send=reqwest::Client::new();
    let mut headers = HeaderMap::new();
    headers.insert("Content-Type", "application/json".parse().unwrap());
    let _=send.post(url).headers(headers).body(message.to_owned()).send().await;
}

#[rocket::post("/uuid/<uuid>/update",data="<message>")]
async fn update_uuid(db: &State<Db>,uuid:&str,message:String){
    let uuid = db.get_uuid_or_create_empty(uuid).await;
   
        uuid.deleted().await;
       
    
    uuid.publish(message).await;
    println!("room:xxxxxxxxxxxxx:{:?}",uuid.messages.read().await);
}

#[rocket::post("/redis/set",data="<message_set>")]
async fn redis_set(message_set:Json<MessageSet>){
    let url = "redis://127.0.0.1/";
    let redis = redis::Client::open(url).unwrap();
    let mut con = redis.get_connection().unwrap();
    let _ : () = con.hset(
        message_set.username.clone(),
        "key-".to_owned()+&message_set.side,
        message_set.key.clone()).unwrap();
}

#[rocket::post("/redis/get",data="<message_get>")]
async fn redis_get(message_get:Json<MessageGet>)->Json<String>{
    let url = "redis://127.0.0.1/";
    let redis = redis::Client::open(url).unwrap();
    let mut con = redis.get_connection().unwrap();
    let exits : bool=  con.exists(message_get.username.clone()).unwrap();
    if exits {
        let key : String = con.hget(message_get.username.clone(),"key-".to_owned()+&message_get.side).unwrap();
        Json(key)
    }else {
        Json(exits.to_string())
    }   
}
#[rocket::post("/redis/remove",data="<message_remove>")]
async fn redis_remove(message_remove:Json<MessageRemove>)->Json<String>{
    let url = "redis://127.0.0.1/";
    let redis = redis::Client::open(url).unwrap();
    let mut con = redis.get_connection().unwrap();
    let exits : bool=  con.exists(message_remove.username.clone()).unwrap();
    if exits {
       let _ :() = con.del(message_remove.username.clone()).unwrap();
        Json("successful removed".to_string())
    }else {
        Json("null".to_string())
    }   
}

#[rocket::get("/uuid/<uuid>/get")]
async fn get_roomid(db: &State<Db>,uuid:&str)->Json<Vec<String>>{
    let room = db.get_uuid_or_create_empty(uuid).await;
    let x= room.messages.read().await.to_vec();
   
    Json(x)
}

fn create_cors() -> Cors {
    let allowed_origins = AllowedOrigins::all(); // 允许任何来源

    CorsOptions {
        allowed_origins,

        //allowed_methods: ,
        allowed_headers: AllowedHeaders::all(),
        allow_credentials: true, // 支持凭据（例如，cookies）
        ..Default::default()
    }
    .to_cors()
    .expect("error while building CORS")
}


struct Db {
    rooms: RwLock<HashMap<String, Arc<Room>>>,
}
#[derive(Debug)]
struct Room {
    messages: RwLock<Vec<String>>,
    message_appeared: Notify,
    subscribers: AtomicU16,
    next_idx: AtomicU16,
}

impl Db {
    pub fn empty() -> Self {
        Self {
            rooms: RwLock::new(HashMap::new()),
        }
    }
    pub async fn get_uuid_or_create_empty(&self, room_id: &str) -> Arc<Room> {
        let rooms = self.rooms.read().await;
        if let Some(room) = rooms.get(room_id) {
            // If no one is watching this room - we need to clean it up first
          return room.clone();
        }
        drop(rooms);

        let mut rooms = self.rooms.write().await;
        match rooms.entry(room_id.to_owned()) {
            Entry::Occupied(entry) if !entry.get().is_abandoned() => entry.get().clone(),
            Entry::Occupied(entry) => {
                let room = Arc::new(Room::empty());
                *entry.into_mut() = room.clone();
                room
            }
            Entry::Vacant(entry) => entry.insert(Arc::new(Room::empty())).clone(),
        }
    }


    

    pub async fn get_room_or_create_empty(&self, room_id: &str) -> Arc<Room> {
        let rooms = self.rooms.read().await;
        if let Some(room) = rooms.get(room_id) {
            // If no one is watching this room - we need to clean it up first
            if !room.is_abandoned() {
                return room.clone();
            }
        }
        drop(rooms);

        let mut rooms = self.rooms.write().await;
        match rooms.entry(room_id.to_owned()) {
            Entry::Occupied(entry) if !entry.get().is_abandoned() => entry.get().clone(),
            Entry::Occupied(entry) => {
                let room = Arc::new(Room::empty());
                *entry.into_mut() = room.clone();
                room
            }
            Entry::Vacant(entry) => entry.insert(Arc::new(Room::empty())).clone(),
        }
    }
}

impl Room {
    pub fn empty() -> Self {
        Self {
            messages: RwLock::new(vec![]),
            message_appeared: Notify::new(),
            subscribers: AtomicU16::new(0),
            next_idx: AtomicU16::new(1),
        }
    }

    pub async fn publish(self: &Arc<Self>, message: String) {
        let mut messages = self.messages.write().await;
        messages.push(message);
        self.message_appeared.notify_waiters();
    }

    pub async fn deleted (self: &Arc<Self>) {
        let mut messages = self.messages.write().await;
        if messages.len()>0{
            messages.remove(0);
        }
        self.message_appeared.notify_waiters();
    }

    pub fn subscribe(self: Arc<Self>, last_seen_msg: Option<u16>) -> Subscription {
        self.subscribers.fetch_add(1, Ordering::SeqCst);
        Subscription {
            room: self,
            next_event: last_seen_msg.map(|i| i + 1).unwrap_or(0),
        }
    }

    pub fn is_abandoned(&self) -> bool {
        self.subscribers.load(Ordering::SeqCst) == 0
    }

    pub fn issue_unique_idx(&self) -> u16 {
        self.next_idx.fetch_add(1, Ordering::Relaxed)
    }
}

struct Subscription {
    room: Arc<Room>,
    next_event: u16,
}

impl Subscription {
    pub async fn next(&mut self) -> (u16, String) {
        loop {
            let history = self.room.messages.read().await;
            if let Some(msg) = history.get(usize::from(self.next_event)) {
                let event_id = self.next_event;
                self.next_event = event_id + 1;
                return (event_id, msg.clone());
            }
            let notification = self.room.message_appeared.notified();
            drop(history);
            notification.await;
        }
    }
}

impl Drop for Subscription {
    fn drop(&mut self) {
        self.room.subscribers.fetch_sub(1, Ordering::SeqCst);
    }
}

/// Represents a header Last-Event-ID
struct LastEventId(Option<u16>);

#[rocket::async_trait]
impl<'r> FromRequest<'r> for LastEventId {
    type Error = &'static str;

    async fn from_request(request: &'r Request<'_>) -> Outcome<Self, Self::Error> {
        let header = request
            .headers()
            .get_one("Last-Event-ID")
            .map(|id| id.parse::<u16>());
        match header {
            Some(Ok(last_seen_msg)) => Outcome::Success(LastEventId(Some(last_seen_msg))),
            Some(Err(_parse_err)) => {
                Outcome::Failure((Status::BadRequest, "last seen msg id is not valid"))
            }
            None => Outcome::Success(LastEventId(None)),
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
struct IssuedUniqueIdx {
    unique_idx: u16,
}


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {

   
    let figment = rocket::Config::figment().merge((
        "limits",
        rocket::data::Limits::new().limit("string", 100.megabytes()),
    ));
    
    rocket::custom(figment)
        .attach(create_cors())
        .mount("/", rocket::routes![
            subscribe, 
            issue_idx, 
            broadcast,
            broadcast_c,
            getinfer,
            keygen,
            sign,
            get_roomid,
            update_uuid,
            redis_get,
            redis_set,
            redis_remove
            ])
        .manage(Db::empty())
        .launch()
        .await?;
    Ok(())
}
