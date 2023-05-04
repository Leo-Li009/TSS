
import * as wasm from "@leo-003/cggmp-wasm";
const js = import("@leo-003/cggmp-wasm");
import fs from'fs';

const URLB = "http://127.0.0.1:8222/rooms/default-keygen/broadcast-c"
const URLG = "http://127.0.0.1:8222/rooms/default-keygen/getinfer"
const URLS = "http://127.0.0.1:8222/rooms/default-keygen/subscribe"

 let executedOnce = true;
 let executedOnce2 = true;
 let executedOnce3 = true;
let executedOnce4 = true;
let executedOnce5 = true;
let executedOnce6 = true;
let executedOnce7 = true;
let executedOnce8 = true;


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


async function boradcast(url, data) {

  console.log("data1111", data[1]);
  const response =fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data[1][0]),

  });

  // console.log('Success:', response);

}
function boradcast_round3(url, data) {
  console.log("data2222", data[1]);

  const response = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data[1][0]),

  });
  const response2 = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data[1][1]),

  });
}




async function getinfer(url, data,a) {
  const response = await fetch(url, {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
    },

  });

  const responseData = await readStream(response.body);
  // console.log('Data:', responseData);
  let r = JSON.parse(responseData);

  // K_round1(r,data);
  // K_round2(r,data)
  // K_round3(r,data)
  // K_round4(r,data)

  if (executedOnce) {
    // console.log("r0", r[0]);
    if (r[0] != null) {
      data.handleIncoming(JSON.parse(r[0]));
      data.proceed();

      executedOnce = false;
    }
  }

  if (executedOnce2) {
    console.log("r1", r[1]);
    if (r[1] != null) {
      data.handleIncoming(JSON.parse(r[1]));


      executedOnce2 = false;
    }
  }
  // let da = data.proceed()
  // console.log("broadcast[1][0].round", da)



  if (executedOnce3) {
    if (r[3] != null) {

      await boradcast(URLB, data.proceed())
     
      data.handleIncoming(JSON.parse(r[3]));
      data.proceed()
      // console.log("r",r)
      executedOnce3 = false;
    }
  }

  if (executedOnce4) {
    if (r[4] != null) {
      
      data.handleIncoming(JSON.parse(r[4]));

      executedOnce4 = false;
    }
  }

  if (executedOnce5) {
 
    if (r[7] != null) {
      boradcast_round3(URLB, data.proceed())
      data.handleIncoming(JSON.parse(r[7]));
      data.proceed()

      executedOnce5 = false;
    }
  }

  if (executedOnce6) {
    if (r[9] != null) {
      data.handleIncoming(JSON.parse(r[9]));
      executedOnce6 = false;


    }

  }
  if (executedOnce7) {
    if (r[12] != null) {
      await boradcast(URLB, data.proceed())
      data.handleIncoming(JSON.parse(r[12]));
      data.proceed();

      executedOnce7 = false;
    }
  }

  if (executedOnce8) {
    if (r[13] != null) {
      data.handleIncoming(JSON.parse(r[13]));
      data.proceed();

      let s = data.create();
      fs.writeFileSync('key-3.json', JSON.stringify(s));

      clearInterval(a)
      executedOnce8 = false;
    } else {
      return null;
    }
  }



}

async function main() {

  let p = {
    parties: 3,
    threshold: 1,
  }
  let part = {
    number: 3,
    uuid: "123",
  }

  let keygen1 = new wasm.KeyGenerator(p, part);
  let broadcast = keygen1.proceed();
  console.log("broadcast", broadcast[1][0].round);


  boradcast(URLB, broadcast);
 let a=  setInterval(() => getinfer(URLG, keygen1,a), 1000);

}

main();