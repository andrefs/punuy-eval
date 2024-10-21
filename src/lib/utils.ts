/**
 * Get random elements from an array
 * Number of elements to get cannot exceed the length of the array
 * @param arr - The array to get random elements from
 * @param n - The number of elements to get
 * @returns An array of n random elements from arr
 */
export function getRandom<T>(arr: T[], n: number): T[] {
  const result = new Array(n);
  let len = arr.length;
  const taken = new Array(len);

  if (n > len) {
    n = len;
  }

  while (n--) {
    const x = Math.floor(Math.random() * len);
    result[n] = arr[x in taken ? taken[x] : x];
    taken[x] = --len in taken ? taken[len] : len;
  }

  return result;
}

/*
 * Returns a promise that resolves after a given number of milliseconds
 * @param ms - The number of milliseconds to wait
 * @returns A promise that resolves after ms milliseconds
 */
export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
