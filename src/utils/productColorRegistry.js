// utils/productColorRegistry.js
const COLOR_PALETTE = [
  "#2588de", 
  "#4d9351", 
  "#FB8C00", 
  "#8E24AA", 
  "#E53935", 
  "#00ACC1", 
  "#6D4C41", 
  "#3949AB", 
  "#F4511E",
  "#7eac4e",
];

const productColorMap = new Map();
let paletteIndex = 0;

/* Generate visually distinct fallback colors */

function generateHslColor(index) {
  const hue = (index * 137.508) % 360; // golden angle
  return `hsl(${hue}, 60%, 45%)`;
}

export function getProductColor(productId) {

  // Already assigned → return same color
  
  if (productColorMap.has(productId)) {
    return productColorMap.get(productId);
  }

  let color;

  // Use palette first
  if (paletteIndex < COLOR_PALETTE.length) {
    color = COLOR_PALETTE[paletteIndex];
  } else {
    // Fallback: generate infinite distinct colors
    color = generateHslColor(paletteIndex);
  }

  productColorMap.set(productId, color);
  paletteIndex++;

  return color;
}
