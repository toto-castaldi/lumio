function setup() {
  createCanvas(400, 400);
  noLoop();
}

function draw() {
  background(255);
  
  let cx = width / 2;
  let cy = height / 2;
  
  // Lumio palette - 3 colors
  let amber = color(255, 167, 38);
  let coral = color(255, 112, 97);
  let violet = color(156, 104, 212);
  
  noStroke();
  
  let radius = 80;
  let third = TWO_PI / 3;
  
  // Core circle - 3 color segments
  fill(amber);
  arc(cx, cy, radius * 2, radius * 2, -HALF_PI, -HALF_PI + third);
  
  fill(coral);
  arc(cx, cy, radius * 2, radius * 2, -HALF_PI + third, -HALF_PI + third * 2);
  
  fill(violet);
  arc(cx, cy, radius * 2, radius * 2, -HALF_PI + third * 2, -HALF_PI + third * 3);
  
  // 3 geometric rays
  let rayLength = 45;
  let rayWidth = 24;
  let rayOffset = radius + 15;
  
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
  
  // Signature: horizontal line at bottom
  stroke(40);
  strokeWeight(6);
  strokeCap(ROUND);
  line(100, 330, 300, 330);
}