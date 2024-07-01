
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const popDisplay = document.getElementById('popDisplay');
const gameOverDisplay = document.getElementById('gameOverDisplay');
const startGamePanel = document.getElementById('startGamePanel');
const recordingDisplay = document.getElementById('recordingDisplay');
const ws = new WebSocket(`ws://${window.location.hostname}:8080`);

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  const { dots, radius, pops, gameOver, winner, recording } = data;

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the dots
  Dot.dots = dots.map(dot => new Dot(new Vector2(dot.x, dot.y), radius, dot.clan));
  let popHTML = '';
  // Display the populations
  for (let clan in pops) {
    popHTML += `<div class="popItem">
                    <span>${Dot.clans[clan]}:</span>
                    <span>${pops[clan]}</span>
                </div>`;
  }

  if (gameOver === true) {
    if (gameOverDisplay.style.display !== 'block' && winner >= 0) {
      gameOverDisplay.style.display = 'block';
      gameOverDisplay.innerHTML = `<h1 style="text-align: center;">Game Over</h1>
                                   <h2 style="text-align: center;"><span style="color: ${Dot.colors[winner]}">${Dot.clans[winner]}</span> wins!</h2>`;
    }
    if (startGamePanel.style.display !== 'block') {
      startGamePanel.style.display = 'block';
    }
    if (recordingDisplay.style.display !== 'block') {
      recordingDisplay.style.display = 'block';
    }
    if (typeof recording == 'number') {
      recordingDisplay.innerHTML = `<p><strong>Recording encoded ${recording}%</strong></p>`;
    } else if (typeof recording == 'string') {
      recordingDisplay.innerHTML = `<a href="${window.location.origin}/${recording}"><strong>Download recording!</strong></a>`;
    }
  } else {
    popDisplay.innerHTML = popHTML;
    if (gameOverDisplay.style.display !== 'none') {
      gameOverDisplay.style.display = 'none';
    }
    if (startGamePanel.style.display !== 'none') {
      startGamePanel.style.display = 'none';
    }
    if (recordingDisplay.style.display !== 'none') {
      recordingDisplay.style.display = 'none';
    }
  }

  requestAnimationFrame(animate);
};

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let dot of Dot.dots) {
    dot.draw(ctx);
  }
}

const startButton = document.getElementById('startButton');

startButton.addEventListener('click', function() {
  const N = 3; // Number of clans
  let pops = {};

  for (let i = 0; i < N; i++) {
    const clan = +document.getElementById(`pop${i}`).value;
    pops[i] = clan;
  }

  const message = JSON.stringify(pops);

  ws.send(message);
});

requestAnimationFrame(animate);
