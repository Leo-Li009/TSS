// // main.js

import { Worker } from 'worker_threads';
const username = "test";

// 创建第一个线程
const worker1 = new Worker('./client-keygen.js',{workerData: { side:2, username}});
worker1.on('message', (result) => {
  console.log('Thread 1:', result);
});

// 创建第二个线程
const worker2 = new Worker('./client-keygen.js',{workerData: {side:3, username}});
worker2.on('message', (result) => {
  console.log('Thread 2:', result);
});
