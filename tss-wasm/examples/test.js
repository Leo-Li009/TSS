import { client  } from "./client-keygen copy.js";

async function main(){
    const response = await fetch("https://rpc.echooo.link:9222/rooms/" + "75736788" + "/getinfer", {
        method: 'get',
        headers: {
          'Content-Type': 'application/json',
        },
  
      });
  
      const responseData = await readStream(response.body);
      let r = JSON.parse(responseData);
      console.log("r", r);
    
    // for (let i = 0; i < 100; i++) {
    //   let   uuid = Math.floor(Math.random() * 1000000).toString();
    //   let promuse1 =await client(uuid,2);
      
    //   console.log("promuse1",promuse1);
    //   console.log("promuse.len",promuse1.length);
    //   if (promuse1.length != 2){
    //     return false;
      
    //   }
    //   console.log("i",i); 
    // }


}
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
main();        