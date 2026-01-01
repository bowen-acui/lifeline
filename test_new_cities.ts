
import { getCoordinates } from './src/lib/CityLookup';

console.log("Testing new city lookup:");
const city = "唐山";
const coords = getCoordinates(city);
console.log(`${city}:`, coords);

const city2 = "徐州";
const coords2 = getCoordinates(city2);
console.log(`${city2}:`, coords2);
