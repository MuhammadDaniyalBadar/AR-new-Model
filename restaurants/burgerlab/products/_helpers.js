/**
 * Helpers for Burger Lab product files.
 *
 * explode distance is a multiple of the model's largest dimension; layer(n)
 * spaces layers evenly from the bottom (n = 0 stays put).
 */
export const up = [0, 1, 0];
export const stepper = (step) => (n, extra = 0) => ({ direction: up, distance: step * n + extra });
