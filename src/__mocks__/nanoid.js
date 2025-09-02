// Mock implementation of nanoid for testing
let counter = 0;

export const nanoid = () => {
  return `test-id-${counter++}`;
};