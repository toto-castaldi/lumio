let showWhiteBackground = false;

function setup() {
  createCanvas(400, 400);
  noLoop();
}

function draw() {
  // Transparent background
  clear();

  let cx = width / 2;
  let cy = height / 2;

  // Lumio palette - 3 colors
  let amber = color(255, 167, 38);
  let coral = color(255, 112, 97);
  let violet = color(156, 104, 212);

  noStroke();

  // White circle background (toggle with 'b' key)
  if (showWhiteBackground) {
    fill(255);
    ellipse(cx, cy, 400, 400);
  }

  let radius = 100;
  let third = TWO_PI / 3;

  // Core circle - 3 color segments
  fill(amber);
  arc(cx, cy, radius * 2, radius * 2, -HALF_PI, -HALF_PI + third);

  fill(coral);
  arc(cx, cy, radius * 2, radius * 2, -HALF_PI + third, -HALF_PI + third * 2);

  fill(violet);
  arc(cx, cy, radius * 2, radius * 2, -HALF_PI + third * 2, -HALF_PI + third * 3);

  // 3 geometric rays (15px gap from circle, touch edge at 200)
  let rayLength = 85;
  let rayWidth = 24;
  let rayOffset = radius + 15; // 115

  fill(amber);
  push();
  translate(cx, cy);
  rotate(-HALF_PI);
  rect(rayOffset, -rayWidth/2, rayLength, rayWidth, 6);
  pop();

  fill(coral);
  push();
  translate(cx, cy);
  rotate(-HALF_PI + third);
  rect(rayOffset, -rayWidth/2, rayLength, rayWidth, 6);
  pop();

  fill(violet);
  push();
  translate(cx, cy);
  rotate(-HALF_PI + third * 2);
  rect(rayOffset, -rayWidth/2, rayLength, rayWidth, 6);
  pop();

  // Signature line
  stroke(40);
  strokeWeight(6);
  strokeCap(ROUND);
  line(100, 330, 300, 330);
}

function keyPressed() {
  if (key === 'b' || key === 'B') {
    showWhiteBackground = !showWhiteBackground;
    redraw();
  }
}
