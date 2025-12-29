export function randInt(n) {
  return Math.floor(Math.random() * n);
}

export function pickRandom(arr) {
  return arr[randInt(arr.length)];
}

export function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}
