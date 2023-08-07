import * as wasm from "@leo-003/cggmp-wasm"
const URL = "https://rpc.echooo.link:9222/rooms/"
const URLUUID = "https://rpc.echooo.link:9222/uuid/"

async function readStream (stream) {
  const reader = stream.getReader()
  let data = ''

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        break
      }
      data += new TextDecoder().decode(value)
    }
  } catch (error) {
    console.error('Error reading stream:', error)
  } finally {
    reader.releaseLock()
  }

  return data
}

async function boradcast (url, data, room_id) {

  const response = await fetch(url + room_id + "/broadcast-c", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data[1][0]),

  })

}

async function boradcast_round3 (url, data, room_id) {

  const response =await fetch(url + room_id + "/broadcast-c", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data[1][1]),

  })
  const response2 =await fetch(url + room_id + "/broadcast-c", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data[1][0]),

  })

}

// Sleep for given number of ms
async function sleep (ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

// Get Infer to execute the key generation
async function getinfer (url, data, room_id, side_id) {
  let round = 1
  let total_round = 4
  let num_sices = 3
  let processed = Array(total_round)
  let num_received = 0
  let max_retry = 100
  let current_try = 0

  // Initialize the tracking 2D array
  for (let i = 0; i < total_round; i++) {
    processed[i] = Array(num_sices)
    for (let j = 0; j < num_sices; j++) {
      processed[i][j] = false
    }
  }

  // Broadcast the first slice
  while (true) {
    const response = await fetch(url + room_id + "/getinfer", {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
      },

    })

    const responseData = await readStream(response.body)
    let r = JSON.parse(responseData)
    for (let i = 0; i < r.length; i++) {
      let rr
      try {
        rr = JSON.parse(r[i])
      } catch (error) {
        continue
      }

      // Skip checking if this is null
      if (rr == null) continue

      if (rr == '') continue

      // Skip checking if this is previous round
      if (rr.round < round) continue

      // Skip checking if this is sent by this side
      if (rr.sender == side_id) continue

      // Skip checking if this not targeting this side
      if (rr.receiver != undefined && rr.receiver != side_id && rr.receiver != null) continue

      // Skip checking if this is already processed
      if (processed[rr.round - 1][rr.sender - 1]) continue

      // Now we should forward this to the underlying to process
      //
      data.handleIncoming(rr)
      let bc = data.proceed()
      processed[rr.round - 1][rr.sender - 1] = true
      round = rr.round
      num_received++
      // Check for this round, do we have all the slices?
      if (round < total_round && num_received + 1 == num_sices) {
        if (round == 2) {
          await boradcast_round3(URL, bc, room_id)
        } else {
          await boradcast(URL, bc, room_id)
        }
        num_received = 0
      } else if (round == total_round && num_received + 1 == num_sices) {
        // we have reached the last slice
        let s = data.create()
        return s

      }

    }

    // Sleep before checking again
    await sleep(100)

    // We only try max_rety and then give up
    if (++current_try >= max_retry) {
      console.log('********Time out in trying*****!')
      break
    }
  }
}

function send_keygen (room_id = 0) {
  let url = "https://rpc.echooo.link:9112/keygen"
  let id = room_id != '' ? room_id : Math.floor(Math.random() * 100000000).toString()
  let room = {
    room_id: id,
  }
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(room)

  })
  return id

}

async function updateuuid (uuid, room_id) {

  const response = await fetch(URLUUID + uuid + "/update", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(room_id),

  
  })
  
  if (response.status == 200){
    return true;
  }else{
    return false;
  }

}

async function getroomid (uuid) {
  console.log("uuid", uuid);
  const response = await fetch(URLUUID + uuid + "/get", {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
    },

  })
  const responseData = await readStream(response.body)
  let r = JSON.parse(responseData)
  
  return JSON.parse(r[0])
}

let keysArray = []

 export async function client (uuid, side) {
 
  let d = await createKey(uuid, side)
  console.log("d",d);
  return d
}

 async function createKey (uuid, side) {
  let room_id = 1
  let side_id = Number(side)
  let a ;
  let p = {
    parties: 3,
    threshold: 1,
  }

  let part = {
    number: side_id,
    uuid,
  }
  console.log(`room_id = ${room_id} side_id = ${side}`)

  if (side_id == 2) {
    room_id = send_keygen()
    console.log(`room_id = ${room_id} side_id = ${side}`)

    let result = await updateuuid(uuid, room_id)
    console.log("result2342343",result);
    if(result) {
      console.log("no result",side_id);
      a=createKey(uuid, 3)
    }else{
      console.log("updateUuid failed");
      return
    }
  } else {
    // This wait is necessary for side-2 to update the uuid
    // await sleep(2000)
    room_id = await getroomid(part.uuid)
  }

  let keygen1 = new wasm.KeyGenerator(p, part)
  let broadcast = keygen1.proceed()
  await boradcast(URL, broadcast, room_id)
  let b =await getinfer(URL, keygen1, room_id, side_id)
  
 if(a==undefined){
  return b
 }else{

  return[await a,b]
 }
  // return await getinfer(URL, keygen1, room_id, side_id)
}