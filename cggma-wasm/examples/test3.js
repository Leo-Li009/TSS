import * as wasm from "@leo-003/cggmp-wasm";
import fs from'fs';
const URLB = "http://127.0.0.1:8222/rooms/default-signing-offline/broadcast-c"
const URLG = "http://127.0.0.1:8222/rooms/default-signing-offline/getinfer"
const URLG_ON = "http://127.0.0.1:8222/rooms/default-signing-online/getinfer"
const URLB_ON="http://127.0.0.1:8222/rooms/default-signing-online/broadcast-c"

let executedOnce = true;
let executedOnce2 = true;
 let executedOnce3 = true;
 let executedOnce4 = true;
 let executedOnce5 = true;
 let executedOnce6 = true;
// let executedOnce7 = true;
// let executedOnce8 = true;


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


function boradcast(url, data) {
 console.log("data2222", data);
  const response = fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body:JSON.stringify(data[1][0]),

  });

  

  console.log('Success:', response);



}
async function boradcast_on(url,data){
  let body= {
    "sender":2,
    "receiver":null,
    "body":data
  }
  console.log("body",body);
  const response =await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body:JSON.stringify(body)

  });

  console.log('Success:', response);
}

async function getinfer(url,data,a,message){
    const response = await fetch(url, {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
        },
    
      });
      const get =await fetch(URLG_ON, {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
        },
    
      });
    
      const responseData = await readStream(response.body);
      // console.log('Data:', responseData);
      let r = JSON.parse(responseData);

      if (executedOnce) {
        // console.log("r0", r[0]);
        if (r[0] != null) {
          data.handleIncoming(JSON.parse(r[0]));    
          executedOnce = false;
        }
      }
    
      if (executedOnce2) {
        console.log("r2", r[2]);
        if (r[2] != null) {
            let da=data.proceed();
            console.log("da",da);
         boradcast(URLB,da);

          data.handleIncoming(JSON.parse(r[2]));
    
          executedOnce2 = false;
        }
      }
      if (executedOnce3) {
        console.log("r4", r[4]);
        if (r[4] != null) {
        boradcast(URLB,data.proceed());
          data.handleIncoming(JSON.parse(r[4]));
    
          executedOnce3 = false;
        }
      }
      if (executedOnce4) {
        console.log("r6", r[6]);
        if (r[6] != null) {
        boradcast(URLB,data.proceed());
          data.handleIncoming(JSON.parse(r[6]));
    
          executedOnce4 = false;
        }
      }
      if (executedOnce5) {
        console.log("r8", r[8]);
        if (r[8] != null) {
        boradcast(URLB,data.proceed());
          data.handleIncoming(JSON.parse(r[8]));
    
          executedOnce5 = false;
        }
      }
      if (executedOnce6) {
        console.log("r10", r[10]);
        if (r[10] != null) {
        boradcast(URLB,data.proceed());
          data.handleIncoming(JSON.parse(r[10]));
          data.proceed()
        //   let da=data.partial(message);
        //  console.log(da);
        //  boradcast_on(URLB_ON,da);
          
          executedOnce6 = false;
        }
      }

   

      const getData = await readStream(get.body);
      // console.log('Data:', responseData);
      let g = JSON.parse(getData);
      console.log("g",g);

    if(g[0] != null){
      let da=data.partial(message);
      console.log(da);
      boradcast_on(URLB_ON,da);

      
      let g1=JSON.parse(g[0]);
      console.log("g1",g1);
      let g2 = JSON.stringify(g1); 
      console.log("g2",g2);
      // let k = new wasm.keccak256(g1);
      // console.log("k",k);
      console.log(data.create(g1));
      clearImmediate(a);
    }  
}


function stringToByte(str) {
    var bytes = new Array();
    var len, c;
    len = str.length;
    for (var i = 0; i < len; i++) {
        c = str.charCodeAt(i);
        if (c >= 0x010000 && c <= 0x10FFFF) {
            bytes.push(((c >> 18) & 0x07) | 0xF0);
            bytes.push(((c >> 12) & 0x3F) | 0x80);
            bytes.push(((c >> 6) & 0x3F) | 0x80);
            bytes.push((c & 0x3F) | 0x80);
        } else if (c >= 0x000800 && c <= 0x00FFFF) {
            bytes.push(((c >> 12) & 0x0F) | 0xE0);
            bytes.push(((c >> 6) & 0x3F) | 0x80);
            bytes.push((c & 0x3F) | 0x80);
        } else if (c >= 0x000080 && c <= 0x0007FF) {
            bytes.push(((c >> 6) & 0x1F) | 0xC0);
            bytes.push((c & 0x3F) | 0x80);
        } else {
            bytes.push(c & 0xFF);
        }
    }
    return bytes;
}
async function main(){
    let aa='hello';
    let message=stringToByte(aa);
    console.log("message",message);
    let key =fs.readFileSync("key-2.json");
    let key1 =JSON.parse(key);
    let  participants=[1,2]
    
   let sign = new wasm.Signer(2,participants,key1["localKey"]);
   let broadcast = sign.proceed();
  // let me={"sender":1,"receiver":null,"body":{"curve":"secp256k1","scalar":"819f9e811191efe5ec2df3212e43648157818f225b28fcf2abfa5c433ea9189e"}}
  // console.log("me",JSON.stringify(me));
  
  //  let test= sign.create(me);
   //let broadcast2=sign.partial(message);
   console.log("boradcast",broadcast[1]);
   boradcast(URLB,broadcast);
 //  boradcast(URLB_ON,broadcast2);
   let a=  setInterval(() => getinfer(URLG, sign,a,message), 1000);
   
}
main();