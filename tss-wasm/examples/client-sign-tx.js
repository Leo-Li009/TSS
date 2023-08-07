import * as wasm from "@leo-003/cggmp-wasm";
import { utils, providers, ethers } from 'ethers';
import { Buffer } from "buffer";
import fs from 'fs';


// const URLROOMS = "https://rpc.echooo.link:9333/rooms/"
// const URLUUID = "https://rpc.echooo.link:9333/uuid/"
// const URLKEYGEN = "https://rpc.echooo.link:9333/keygen/"
// const URL = "https://rpc.echooo.link:9333/"
const URL = "http://127.0.0.1:8222/"
const URLROOMS = "http://127.0.0.1:8222/rooms/"
const URLUUID = "http://127.0.0.1:8222/uuid/"


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
  console.log("data1111-2222", data[1]);
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
  console.log("data1111-2222", body);
  const response = await fetch(url + room_id + "-online/broadcast-c", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)

  });
}
function boradcastRound2(url, data, room_id) {

  const response = fetch(url + room_id + "-offline/broadcast-c", {
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
        console.log("rr", rr);
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
    await sleep(5000);

    // We only try max_rety and then give up
    if (++current_try >= max_retry) {
      console.log('********Time out in trying*****!');
      break;
    }
  }
}

function sendSign(message, rlp, address, room_id = 0) {

  let id = room_id != '' ? room_id : Math.floor(Math.random() * 10000000).toString();
  let room = {
    room_id: id,
    address: address,
    message: message,
    rlp: rlp,
  }
  console.log("room", room);
  // const response1 = fetch("https://rpc.echooo.link:9112/"+"sign", {
  const response1 = fetch("http://127.0.0.1:8222/" + "sign", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(room)

  });
  return id;

}

async function updateUuid(uuid, room_id) {

  const response = fetch(URLUUID + uuid + "/update", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(room_id),

  });

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


export async function sign(side=2,network="btc",hash_btc='') {
  let provider = new providers.JsonRpcProvider("http://bastion-goerli-595491602.ap-southeast-1.elb.amazonaws.com:8201")
  let room_id = 1;
  let key = fs.readFileSync('key-2.json');
  let hash = '';
  let side_id =Number(side); 
  let key_json = JSON.parse(key);
  let key_2 = key_json["localKey"];
  let signAddress = key_json["address"]
  console.log("signAddress", signAddress);
  let message_s = {
    to: '0x283e016104717B0EE8ea718D4E90815734101E19',
    value: ethers.utils.parseEther('0'),
    nonce: 0,
    chainId: 5,
    type: 2,
  }

  const tx_pop = new ethers.Wallet("8ad8852cbb75fb89c07806414cab1c24d9eb304acc4b22bce3fbf7ed20561720", provider)
  let tx_pop1 = await tx_pop.populateTransaction(message_s)
 

  delete tx_pop1.from
  tx_pop1.gasLimit = await tx_pop.estimateGas(tx_pop1)

  let nonce = await provider.getTransactionCount(signAddress)

  tx_pop1.nonce = nonce


  const tx = ethers.utils.serializeTransaction(tx_pop1);
  console.log("tx", tx);
  let tx_hex = tx.slice(2);
  console.log("tx_hex", tx_hex.length);

  let message_hash = ethers.utils.keccak256(tx);

  hash = message_hash.slice(2);
  if (network == "btc") {
    hash = hash_btc;
  }
  console.log("hash", hash);
  const buffer = Buffer.from(hash, 'hex');;
  const uint8Array = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  console.log("uint8Array", uint8Array);

  let participants = [1, 2]

  let part = {
    number: side_id,
    uuid: "123",
  }

  room_id = sendSign("", hash, signAddress);

  await updateUuid(part.uuid, room_id);

  // } else {
  //   // This wait is necessary for side-2 to update the uuid
  //   await sleep(50);
  //   room_id = await getRoomid(part.uuid);
  // }
  console.log("side_id", side_id);
  let sign = new wasm.Signer(side_id, participants, key_2);
  let broadcast = sign.proceed();
  await boradcast(URLROOMS, broadcast, room_id);
  
  let signature = await getInfer(URLROOMS, sign, room_id, side_id, uint8Array);

  let r = signature["signature"]["r"]["scalar"];
  let s = signature["signature"]["s"]["scalar"];
  let v = signature["signature"]["recid"] + 27;


  let signed = r + s +v;
  console.log("signed", signed);
  return r+s;
  process.exit(0);
  let serializedTx = ethers.utils.serializeTransaction(tx_pop1, signed);
  //  print(serializedTx);

  let result = await provider.sendTransaction(serializedTx);
  console.log("data", await provider.getTransaction("0x32b45f860279bd47e5b66730fb8d0037188a3a9e84a316f8113b0bfe65066ae2"));
  console.log("result", result);
}
sign();