// server.js
import express from 'express';
import { createServer } from 'http';
import WebSocket, { WebSocketServer  } from 'ws';
import { Dot, Vector2 } from './dot.js';  // Import your Dot class
import { once } from 'events';
import { createCanvas, loadImage } from 'canvas';
import ffmpeg from 'fluent-ffmpeg';
import { PassThrough } from 'stream';
import fs from 'fs';
import path from 'path';

let rec = 0;

// import { stringify } from 'querystring';

const app = express();

app.use(express.static('public'));

const server = createServer(app);
const PORT = 8080;
const HOST = '127.0.0.1';

server.listen(PORT, HOST);
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error('Address in use, retrying...');
    setTimeout(() => {
    server.close();
    server.listen(PORT, HOST);
    }, 1000);
  }
});

await once(server, 'listening');

const address = server.address();

console.log(`Server listening on ${address.address}:${address.port}`);

// const address = server.address();
// const wss = new WebSocket('ws://' + HOST + ':' + PORT + '/');
const wss = new WebSocketServer({ server });

const canvasWidth   = 800;
const canvasHeight  = 600;
const canvas        = { width: canvasWidth, height: canvasHeight };
const Canvas        = createCanvas(canvasWidth, canvasHeight);
const ctx           = Canvas.getContext('2d');
let background;
await loadImage('public/canvas.png').then(image => {
  background = image;
});
let pops            = {0: 0, 1: 0, 2: 0};
Dot.clans           = {0: 'red'    , 1: 'cyan'    , 2: 'green'    };
Dot.colors          = {0: '#ff0000', 1: '#00ffff' , 2: '#00ff00'  };
Dot.dominated       = {0: [2], 1: [0], 2: [1]};
Dot.dominator       = {};
for (let clan in Dot.dominated) { Dot.dominator[clan] = [];}
for (let clan in Dot.dominated) {
    for (let dom of Dot.dominated[clan]) {
        Dot.dominator[dom].push(+clan);
    }
}
Dot.dots            = [];

const dotRadius     = 10;
const dotSpeed      = 60;
const dotTurnSpeed  = 30;
const maxPerClan    = 70;

let sending         = false; // kind of a mutex
let gameOver        = true; // game over flag
let winner          = -1;    // winner clan
let dotFrames       = [];

let lastDots = Dot.dots.map((dot) => {
  return {x: dot.pos.x, y: dot.pos.y, clan: dot.clan};
});

let handleCollisions = (deltaTime) => {
  let collided;
  let pairs;
  do {
    collided = false;
    // make a set of pairs of dots that are colliding with each other.
    pairs = new Object();
    for (let i = 0; i < Dot.dots.length; i++) {
        for (let j = i + 1; j < Dot.dots.length; j++) {
            if (Dot.dots[i].isCollidingWith(Dot.dots[j])) {
                pairs[[Dot.dots[i].id, Dot.dots[j].id].sort().join('-')] = [Dot.dots[i], Dot.dots[j]];
            }
        }
    }
    // handle the collisions
    for (let pair of Object.values(pairs)) {
      collided = true;
      // randomly selecting the order of the dots in the pair
      let i = Math.random() < 0.5 ? 0 : 1;
      let j = i === 0 ? 1 : 0;
      // handle the collision of each pair of dots
      Dot.handleCollision(pair[i], pair[j], canvas, deltaTime);
    }
  } while (collided);
}

const handlers = {updateHandler: null, sendHandler: null};

let lastTime = Date.now();
function updateDots() {
  const now = Date.now();
  const deltaTime = (now - lastTime) / 1000.0; // Convert to seconds
  lastTime = now;
  if (deltaTime > 0.25) { // maximum acceptable deltaTime
    return;
  }
  for (let dot of Dot.dots) {
      dot.move(canvas, deltaTime);
  }

  handleCollisions(deltaTime);

  if (!sending) {
    lastDots = Dot.dots.map((dot) => {
      return {x: dot.pos.x, y: dot.pos.y, clan: dot.clan};
    });
    for (let p in pops) { pops[p] = 0; }
    for (let dot of Dot.dots) { pops[dot.clan]++; }
    let count = 0;
    for (let p in pops) {
      if (pops[p] > 0) {
        winner = p;
        count++;
      }
    }
    if (count < 2) {
      gameOver = true;
      clearInterval(handlers.updateHandler);
      handlers.updateHandler = null;
    }
    sending = true;
  }
}

function gameOverClientsResponse() {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        'dots': lastDots,
        'radius': dotRadius,
        'pops': pops,
        'gameOver': true,
        'winner': winner,
        'recording': rec
      }));
    }
  });
}

async function record() {
  if (fs.existsSync('public/output.mp4')) {
    fs.unlinkSync('public/output.mp4');
  }
  if (dotFrames.length <= 0) {
    rec = null;
    return;
  }
  
  const inputStream = new PassThrough();

  const recorder = ffmpeg()
  .input(inputStream) // Read input from stdin
  .inputFormat('image2pipe') // Input format is a sequence of images from a pipe
  .inputFPS(60) // Frame rate of input
  .size(`${canvasWidth}x${canvasHeight}`) // Video size
  .output('public/output.mp4') // Output file name
  .outputFPS(30) // Output frame rate
  .videoCodec('libx264') // Video codec
  .format('mp4') // Output format
  .on('error', (err) => {
    console.error('An error occurred: ' + err.message);
  })
  .on('end', () => {
    console.log('Processing finished !');
  });

  recorder.run();

  const winFrame = dotFrames[dotFrames.length - 1];
  for (let i = 0; i < 60; i++) {
    dotFrames.push(winFrame);
  }
  let cf = 0;
  const lf = Math.round(dotFrames.length * 0.01);
  for (let frame of dotFrames) {
    cf += 1;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(background, 0, 0, canvasWidth, canvasHeight);
    for (let dot of frame) {
      ctx.fillStyle = Dot.colors[dot.clan];
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dotRadius, 0, 2 * Math.PI);
      ctx.fill();
    }
    const buffer = Canvas.toBuffer('image/png');
    inputStream.write(buffer);
    if (cf % lf === 0) {
      rec = Math.round(cf / lf);
      console.log('Frame ' + cf + ' of ' + dotFrames.length);
      gameOverClientsResponse();
    }
  }
  inputStream.end();
  // recorder.kill();
  dotFrames = [];
  rec = 'output.mp4';
}

function sendData() {
  // if (clientCount < 3) {
  //   return;
  // }
  while (!sending) {}
  dotFrames.push(lastDots);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        'dots': lastDots,
        'pops': pops,
        'radius': dotRadius
      }));
    }
  });
  sending = false;
  if (gameOver === true) {
    endGame();
  }
}

function startGame() {
  if (!gameOver) {
    return;
  }
  gameOver = false;
  winner = -1;
  Dot.dots = [];
  for (let t = 0; t < 3; t++) {
    let pop = pops[t] // = Math.round(Math.random() * 2 * 50 + 20);
    for (let i = 0; i < pop; i++) {
      let x = Math.random() * (canvasWidth  - dotRadius * 8) + 4 * dotRadius;
      let y = Math.random() * (canvasHeight - dotRadius * 8) + 4 * dotRadius;
      Dot.dots.push(new Dot(new Vector2(x, y), dotRadius, t, dotSpeed, dotTurnSpeed));
    }
  }
  lastTime = Date.now();
  if (handlers.updateHandler !== null) {
    clearInterval(handlers.sendHandler);
  }
  if (handlers.sendHandler !== null) {
    clearInterval(handlers.sendHandler);
  }
  handlers.updateHandler = setInterval(updateDots, 1000 / 240);
  handlers.sendHandler   = setInterval(sendData  , 1000 / 60);
}

function endGame() {
  gameOver = false; // stopping from starting a new game
  if (handlers.updateHandler !== null) {
    clearInterval(handlers.sendHandler);
  }
  if (handlers.sendHandler !== null) {
    clearInterval(handlers.sendHandler);
  }
  record().then(() => {
    handlers.updateHandler = null;
    handlers.sendHandler = setInterval(gameOverClientsResponse, 1000); // once a second
    setTimeout(() => {
      gameOver = true; // allow for starting a new game
    }, 5000); // wait for 5 seconds before that
  });
}

let clientCount = 0;

wss.on('connection', ws => {
  clientCount++;
  console.log('New client connected');
  ws.on('message', message => {
    const unitCounts = JSON.parse(message);
    const isValid = validateUnitCounts(unitCounts);
    if (isValid) {
      for (const clan in unitCounts) {
        pops[clan] = unitCounts[clan];
      }
      startGame();
    } else {
      console.log('Invalid unit counts');
    }
  });
  ws.on('close', () => {
    clientCount--;
    console.log('Client disconnected');
  });
});

function validateUnitCounts(unitCounts) {
  const clans = Object.keys(Dot.clans);
  for (const clan of clans) {
    if (!unitCounts.hasOwnProperty(clan) || typeof unitCounts[clan] !== 'number' || unitCounts[clan] < 1 || unitCounts[clan] > maxPerClan) {
      return false;
    }
  }
  return true;
}

endGame();
