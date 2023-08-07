import * as wasm from "@leo-003/cggmp-wasm";
import fs from 'fs';
import bitcoin from "bitcoinjs-lib";
// import workerData from'worker_threads';
// const URLROOMS = "https://rpc.echooo.link:9222/rooms/"
// const URLUUID = "https://rpc.echooo.link:9222/uuid/"
// const URLKEYGEN = "https://rpc.echooo.link:9222/keygen/"
// const URL = "https://rpc.echooo.link:9222/"
const URL = "http://127.0.0.1:8222/"
const URLROOMS = "http://127.0.0.1:8222/rooms/"
const URLUUID = "http://127.0.0.1:8222/uuid/"
const URLKEYGEN = "http://127.0.0.1:8222/keygen/"

//const URLROOMS = "http://18.136.207.27:8222/rooms/"

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
  await fetch(url + room_id + "/broadcast-c", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data[1][0]),

  });

}
console.log("workerData")

async function boradcastRound3(url, data, room_id) {

  await fetch(url + room_id + "/broadcast-c", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data[1][1]),

  });
  await fetch(url + room_id + "/broadcast-c", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data[1][0]),

  });
}

// Sleep for given number of ms
async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Get Infer to execute the key generation
async function getInfer(url, data, room_id, side_id) {
  let round = 1;
  let total_round = 4;
  let num_sices = 3;
  let processed = Array(total_round);
  let num_received = 0;
  let max_retry = 100;
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
    const response = await fetch(url + room_id + "/getinfer", {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
      },

    });

    const response_data = await readStream(response.body);
    let r = JSON.parse(response_data);
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

      data.handleIncoming(rr);
      let bc = data.proceed();

      processed[rr.round - 1][rr.sender - 1] = true;
      round = rr.round;

      num_received++;
      // Check for this round, do we have all the slices?
      if (round < total_round && num_received + 1 == num_sices) {
        if (round == 2) {

          await boradcastRound3(URLROOMS, bc, room_id);

        } else {
          await boradcast(URLROOMS, bc, room_id);
        }
        num_received = 0;
      } else if (round == total_round && num_received + 1 == num_sices) {
        // we have reached the last slice
        let s = data.create();
        //compute the btc address
        let public_key = s['publicKey'];
        let pubkey_compress = compressPublicKey(Buffer.from(public_key).toString("hex"));
        let addr_test = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(pubkey_compress, 'hex'), network: bitcoin.networks.testnet });
        let addr_main=bitcoin.payments.p2wpkh({ pubkey: Buffer.from(pubkey_compress, 'hex'), network: bitcoin.networks.bitcoin });
        s['btc_main_address'] = addr_main.address;
        s['btc_test_address'] = addr_test.address;
        fs.writeFileSync('key-' + side_id + '.json', JSON.stringify(s));
        console.log("s.evm_address", s['address'], side_id)
        console.log("s.btc_main_address", s['btc_main_address'])
        console.log("s.btc_test_address", s['btc_test_address'])
        return JSON.stringify(s);
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

// Compress the public key
function compressPublicKey(uncompressed_pubKey) {
  const prefix_byte = uncompressed_pubKey.slice(0, 2);
  const xCoord = uncompressed_pubKey.slice(2, 66);
  const yCoord = uncompressed_pubKey.slice(66);
  const prefix = parseInt(yCoord, 16) % 2 === 0 ? '02' : '03';

  const compressed_pubKey = prefix + xCoord;
  return compressed_pubKey;
}

function sendKeygen(room_id = 0) {

  let id = room_id != '' ? room_id : Math.floor(Math.random() * 10000000).toString();
  let room = {
    room_id: id,

  }
  // const response1 = fetch("https://rpc.echooo.link:9112/keygen", {
  const response1 = fetch("http://127.0.0.1:8222/keygen", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(room)

  });
  return id;

}

async function updateUuid(uuid, room_id) {

  const response = await fetch(URLUUID + uuid + "/update", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(room_id),

  });
  if (response.status == 200) {
    return true;
  } else {
    return false;
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

  let r = JSON.parse(responseData);
  console.log("r", r);
  return JSON.parse(r[0]);
}

export async function client(side = 2, uuid = "123123") {

  let room_id = 1;
  let a;
 
  // uuid = Math.floor(Math.random() * 100000).toString();
  console.log("uuid", uuid);
  let side_id = Number(side);

  let p = {
    parties: 3,
    threshold: 1,
  }

  let part = {
    number: side_id,
    uuid: uuid,
  }
  if (side_id == 2) {
    console.log("side_id", side_id);
    room_id = sendKeygen();
    console.log("room_id-2 ", room_id);
    let result = await updateUuid(part.uuid, room_id);
    console.log("result", result);
    if (result) {
      a = client(3, part.uuid);
    } else {
      console.log("updateUuid failed");
      return;
    }

  } else {
    //await sleep();
    // This wait is necessary for side-2 to update the uuid
    room_id = await getRoomid(part.uuid);
    console.log("room_id-3", room_id);
  }

  let keygen1 = new wasm.KeyGenerator(p, part);
  let broadcast = keygen1.proceed();
  await boradcast(URLROOMS, broadcast, room_id);

  let b = await getInfer(URLROOMS, keygen1, room_id, side_id);
  if (a == undefined) {
    return [b]
  } else {

    return [await a, b]
  }
}
client();