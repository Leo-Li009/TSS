import * as wasm from "@leo-003/cggmp-wasm";
import { ethers } from 'ethers';
import { Buffer } from "buffer";
import { error } from "console";
import fs from'fs';

const URLROOMS = "https://rpc.echooo.link:9333/rooms/"
const URLUUID = "https://rpc.echooo.link:9333/uuid/"
const URLKEYGEN = "https://rpc.echooo.link:9333/keygen/"
const URL = "https://rpc.echooo.link:9333/"
// const URL = "http://127.0.0.1:8222/"
//  const URLROOMS = "http://127.0.0.1:8222/rooms/"
//  const URLUUID = "http://127.0.0.1:8222/uuid/"
// const URL = "http://18.136.207.27:8222/"
// const URLROOMS = "http://18.136.207.27:8222/rooms/"
// const URLUUID = "http://18.136.207.27:8222/uuid/"
// const URLKEYGEN = "http://18.136.207.27:8222/keygen/"



const ETHEREUM_HEADER= '\x19Ethereum Signed Message:\n';

async function readStream(stream) {
  const reader = stream.getReader();
  let data = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      data += new TextDecoder().decode(value);
    }
  } catch (error) {
    console.error('Error reading stream:', error);
  } finally {
    reader.releaseLock();
  }

  return data;
}

async function boradcast(url, data, room_id) {
  console.log("data", room_id)
  await fetch(url + room_id + "-offline/broadcast-c", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data[1][0]),

  });

}

async function boradcastOn(url, data, room_id, side_id) {
  let body = {
    "round": 7,
    "sender": side_id,
    "receiver": null,
    "body": data
  }
  await fetch(url + room_id + "-online/broadcast-c", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)

  });
}
function boradcastRound2(url, data, room_id) {

  fetch(url + room_id + "-offline/broadcast-c", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data[1][0]),

  });
  // const response2 = fetch(url+room_id+"/broadcast-c", {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify(data[1][1]),

  // });
}


// Sleep for given number of ms
async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Get Infer to execute the key generation
async function getInfer(url, data, room_id, side_id, message) {
  let round = 1;
  let total_round = 7;
  let num_sices = 2;
  let processed = Array(total_round);
  let num_received = 0;
  let max_retry = 30;
  let current_try = 0;

  // Initialize the tracking 2D array
  for (let i = 0; i < total_round; i++) {
    processed[i] = Array(num_sices);
    for (let j = 0; j < num_sices; j++) {
      processed[i][j] = false;
    }
  }

  // Broadcast the first slice
  while (true) {
    let response = await fetch(url + room_id + "-offline/getinfer", {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
      },

    });
    //Get final round information
    if (round == 6) {
      console.log("response666", round)
      response = await fetch(url + room_id + "-online/getinfer", {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
        },

      });
    }

    const responseData = await readStream(response.body);
    let r = JSON.parse(responseData);

    for (let i = 0; i < r.length; i++) {
      let rr;
      try {
        rr = JSON.parse(r[i]);
      } catch (error) {
        continue;
      }

      // Skip checking if this is null
      if (rr == null) continue;

      if (rr == '') continue;

      // Skip checking if this is previous round
      if (rr.round < round) continue;

      // Skip checking if this is sent by this side
      if (rr.sender == side_id) continue;

      // Skip checking if this not targeting this side
      if (rr.receiver != undefined && rr.receiver != side_id && rr.receiver != null) continue;

      // Skip checking if this is already processed
      if (processed[rr.round - 1][rr.sender - 1]) continue;

      // Now we should forward this to the underlying to process
      // The first 6 rounds are offline, the last round 7 is online
      if (rr.round < 7) {
        data.handleIncoming(rr);
        let bc = data.proceed();
        processed[rr.round - 1][rr.sender - 1] = true;
        round = rr.round;
        num_received++;

        // Check for this round, do we have all the slices?
        if (round < total_round && num_received + 1 == num_sices) {
          // Round 2 will generate num_sices-1 messages

          await boradcast(URLROOMS, bc, room_id);

          num_received = 0;

        } else if (round == total_round && num_received + 1 == num_sices) {
          return;
        }
      } else {

        let da = data.partial(message);
        await boradcastOn(URLROOMS, da, room_id, side_id);
        let sign = data.create(rr);
        return sign;
      }

    }

    // Sleep before checking again
    await sleep(50);

    // We only try max_rety and then give up
    if (++current_try >= max_retry) {
      console.log('********Time out in trying*****!');
      break;
    }
  }
}

async function sendSign(message,rlp,address,room_id = 0,) {

  let id = room_id != '' ? room_id : Math.floor(Math.random() * 1000).toString();
  console.log("id", id)
  let room = {
    room_id: id,
    address: address,
    message: message,
    rlp: rlp,
  }
  const response1 = fetch("https://rpc.echooo.link:9112/"+"sign", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(room)

  });
  return id;

}

async function updateUuid(uuid, room_id) {

  fetch(URLUUID + uuid + "/update", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(room_id),

  });

}
async function insertKey(signatured,address) {
  let insert_key = {
    signature:signatured,
    address: address,
  }
  let response = await fetch("https://rpc.echooo.link:9112/"+"insert_key"  , {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(insert_key),

  });

  if (response) {
    if (response.ok) {
      const data = await response.json();
      console.log("成功的响应:", data);
      console.log("成功的响应:", response.ok);
    } else {
      console.error("响应错误:", response.status);
    }
  } else {
    console.error("请求出错，未返回响应");
  }

}

async function getRoomid(uuid) {
  const response = await fetch(URLUUID + uuid + "/get", {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
    },

  });
  const responseData = await readStream(response.body);
  console.log(responseData);
  let r = JSON.parse(responseData);
  return JSON.parse(r[0]);
}
async function get_nonce(address){
  console.log("address",address)
  let get_nonce = {
    address:address
  }
  
  const response =await fetch("https://rpc.echooo.link:9112/"+"get_nonce", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(get_nonce),
  });
  const responseData = await readStream(response.body);
  let nonce = JSON.parse(responseData);
  console.log("nonce",nonce["nonce"]);
  return nonce["nonce"];
}

async function sign_message() {
  console.time("round1")
  let room_id = 1;
  let side_id = Number(process.argv[2]);
  let insert_key = process.argv[3];

 
  let key = fs.readFileSync('key-2.json');
  key = JSON.parse(key);
  let key_2 = key["localKey"];;
  let signAddress = key["address"]
  let message = "0"
  if(insert_key){
   message = await get_nonce(signAddress);
}
console.log("message",message);
 
  const message_bytes = ethers.utils.toUtf8Bytes(ETHEREUM_HEADER + message.length.toString()+message);
  const message_hash = ethers.utils.keccak256(message_bytes);
  const hex = message_hash.slice(2);

  const buffer = Buffer.from(hex, 'hex');
  const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  console.log("uint8Array",uint8Array);


  let participants = [1, 2]

  let part = {
    number: side_id,
    uuid: "123",
  }

  if (side_id == 2) {

    room_id =await sendSign(message,"",signAddress);
 console.log(room_id);
    await updateUuid(part.uuid, room_id);

  } else {
    // This wait is necessary for side-2 to update the uuid
    await sleep(50);
    room_id = await getRoomid(part.uuid);
  }

  let sign = new wasm.Signer(side_id, participants, key_2);
  let broadcast = sign.proceed();
  await boradcast(URLROOMS, broadcast, room_id);

  let signature = await getInfer(URLROOMS, sign, room_id, side_id, uint8Array,signAddress);

  let r = signature["signature"]["r"]["scalar"];
  let s = signature["signature"]["s"]["scalar"];
  let v = signature["signature"]["recid"] + 27;
  let signatured = '0x' + r + s + v.toString(16);
  console.timeEnd("round1")
  //验证签名
  const recoveredAddress = ethers.utils.recoverAddress(message_hash, { v:`0x${v}`, r:`0x${r}`, s:`0x${s}` });
  if(ethers.utils.getAddress(recoveredAddress) == ethers.utils.getAddress(signAddress)) {
    console.log("sign message success signature:",signatured);
  }else{
    console.log("sign message fail");
  }
  if (insert_key){

    console.log("insert key");
    await insertKey(signatured, signAddress);
  }
 

}
sign_message();