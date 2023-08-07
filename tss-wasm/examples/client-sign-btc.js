import bitcoin from 'bitcoinjs-lib';
import mempoolJS from "@mempool/mempool.js";
import { create, all, i } from 'mathjs'
import { sign } from './client-sign-tx.js';
import fs from 'fs';
import { get } from 'http';
const config = {
    number: 'BigNumber',
    precision: 20
}
const math = create(all, config);

// Read the stream
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
//create btc transaction
async function btcTransaction(to_address = 'tb1qyfszjxrtyzpt6vt3req4zeey7muvx5p02ck09a', amount = 1000) {
    //Initialize the mempool btc node
    const { bitcoin: { addresses, transactions } } = mempoolJS({
        hostname: 'mempool.space',
        network: 'testnet'
    });
    //get private key
    let key = fs.readFileSync('key-2.json');
    key = JSON.parse(key);
    let public_key = key["publicKey"];

    let pubkey_compress = compressPublicKey(Buffer.from(public_key).toString("hex"));
    let keypair = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(pubkey_compress, "hex"), network: bitcoin.networks.testnet });
    console.log("address", keypair.address)
    //get unspent outputs
    let unspent_outputs = await addresses.getAddressTxsUtxo({ address: keypair.address });
    //get address info
    let address = (await addresses.getAddress({ address: keypair.address }));
    //Create a transaction
    const tx = new bitcoin.Psbt({ network: bitcoin.networks.testnet });
    
    let inputs =  getInputs(unspent_outputs,keypair);

    tx.addInputs(inputs);

    //get unsent amount
    let unsent_amount = address.chain_stats.funded_txo_sum - address.chain_stats.spent_txo_sum;
    console.log("unsent_amount", unsent_amount);
    let fee = tx.data.inputs.length * 141 + 2 * 34 + 10;
    console.log("fee", math.subtract(unsent_amount, amount));
    tx.addOutput({
        address: to_address,
        value: amount
    });
    //add change address
    tx.addOutput({
        address: keypair.address,
        value: math.subtract(unsent_amount, amount) - 210
    })
    const __CACHE = {
        __NON_WITNESS_UTXO_TX_CACHE: [],
        __NON_WITNESS_UTXO_BUF_CACHE: [],
        __TX_IN_CACHE: {},
        __TX: tx.data.globalMap.unsignedTx.tx,
        __UNSAFE_SIGN_NONSEGWIT: false,
    };

    let hash = [];
    let signature = [];
    //get inputs hash
    for (let i = 0; i < tx.data.inputs.length; i++) {
        let psbt_hash = tx.getHashAndSighashType(tx.data.inputs, i, Buffer.from(pubkey_compress, 'hex'), __CACHE, [1])
        console.log("psbt_hash", psbt_hash.hash.toString('hex'));
        hash.push(psbt_hash.hash.toString('hex'));

    }

    //sign inputs hash
    for (const item of hash) {
        signature.push(
            new Promise(async (resolve, reject) => {
                resolve(await sign(2, "btc", item))
            })
        )
    }
     signature = await Promise.all(signature)

    console.log('hash', hash)
    console.log("signature", signature);
    //add signature
    for (let i = 0;i<signature.length;i++){
    let partialSig = [{
        pubkey: Buffer.from(pubkey_compress, 'hex'),
        signature: bitcoin.script.signature.encode(Buffer.from(signature[i], 'hex'), 1),
    }]
    tx.updateInput(i, { partialSig });
    }
    //finalize transaction
    tx.finalizeAllInputs()
    let rawTranscation = tx.extractTransaction().toHex()
    console.log("tx", rawTranscation);
    //send transaction
    const url = 'https://mempool.space/testnet/api/tx';
    let send_rawtransaction = await fetch(url, {
        method: 'post',
        body: rawTranscation,
    })
    const responseData = await readStream(send_rawtransaction.body);
    console.log("responseData", responseData);

   
}

//get tx inputs
function getInputs(unspent_outputs,keypair){
    let inputs = [];
    for (let i = 0; i < unspent_outputs.length; i++) {
       
        let input = {
            hash: unspent_outputs[i].txid,
            index: unspent_outputs[i].vout,
            witnessUtxo: {
                script: Buffer.from(keypair.output, 'hex'),
                value: unspent_outputs[i].value,
            },
            
        };
        inputs.push(input);
    }
   return inputs

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
btcTransaction()