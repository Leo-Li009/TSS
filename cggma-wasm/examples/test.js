
import * as wasm from "@leo-003/cggmp-wasm";
import fs from'fs';
const URLB = "http://127.0.0.1:8222/rooms/default-keygen/broadcast-c"
const URLG = "http://127.0.0.1:8222/rooms/default-keygen/getinfer"

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

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body:JSON.stringify(data[1][0]),

  });

 // console.log('Success:', response);
  const responseData = await readStream(response.body);
  console.log('Data-b:', responseData);


}

 function boradcast_round3(url, data) {
  console.log("data2222", data[1]);
  const response = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body:JSON.stringify(data[1][0]),

  });
  const response2 = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body:JSON.stringify(data[1][1]),

  });



}


async function getinfer(url, data, broadcast) {
  const response = await fetch(url, {
    method: 'get',
    headers: {
      'Content-Type': 'application/json',
    },

  });

  const responseData = await readStream(response.body);
 // console.log('Data-g:', responseData);
  let r = JSON.parse(responseData);



  if (executedOnce) {
    if (r[0] != null) {
      
     data.handleIncoming(JSON.parse(r[0]));
      data.proceed();

      executedOnce = false;
    }
  }

  if (executedOnce2) {
   // console.log("r2", r[2]);
    if (r[2] != null) {
      data.handleIncoming(JSON.parse(r[2]));
    
      executedOnce2 = false;
    } 
  }
  
    console.log("3")
    if (executedOnce3) {
      if (r[3] != null) {
        await boradcast(URLB, data.proceed())
       // console.log("r3", r[3]);
        data.handleIncoming(JSON.parse(r[3]));
      //  console.log("r",r)

        data.proceed()
        executedOnce3 = false;
      }
    }
    console.log("4")
    if (executedOnce4) {
      if (r[5] != null) {
       // console.log("r4", r[4]);
        data.handleIncoming(JSON.parse(r[5]));
        executedOnce4 = false;
      } 
    }
    console.log("5")

   
    
      if (executedOnce5) {
      console.log("r6", r[6]);
        if (r[6] != null) {
         boradcast_round3(URLB,data.proceed() )
        // await boradcast_round3(URLB, data.proceed())
          
          data.handleIncoming(JSON.parse(r[6]));
          data.proceed();
          executedOnce5 = false;
        }
      }
      
       // console.log("r66666", r);
      //  console.log("r8", r[11]);

      if (executedOnce6) {
        
        if (r[11] != null) {
          console.log("r11", r[11]);
         // console.log("r",r)
          data.handleIncoming(JSON.parse(r[11]));
          executedOnce6 = false;
        
      }}
    
   
     
      if (executedOnce7) {
        if (r[12] != null) {
          await boradcast(URLB, data.proceed())
          //console.log("r", r);
          console.log("r12", r[12]);
          data.handleIncoming(JSON.parse(r[12]));
          data.proceed();
          executedOnce7 = false;
        }
      }

      if (executedOnce8) {
        if (r[14] != null) {
          data.handleIncoming(JSON.parse(r[14]));
          data.proceed();

          let s = data.create();
          fs.writeFileSync('key-2.json', JSON.stringify(s));
    
          clearInterval(a)
          
          executedOnce8 = false;
        } else {
          return null;
        }
      }

    }


  async function main() {


    console.log("Hello fromJavaScript!");

    let p = {
      parties: 3,
      threshold: 1,
    }
    let part = {
      number: 2,
      uuid: "123",
    }
    let keygen1 = new wasm.KeyGenerator(p, part);
    let broadcast = keygen1.proceed();
    console.log("broadcast", broadcast[1][0].round);

    await boradcast(URLB, broadcast)
    let a= setInterval(() => getinfer(URLG, keygen1,a), 1000);



  }
  main();