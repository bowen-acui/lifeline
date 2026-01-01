
import cityTimezones from 'city-timezones';

console.log("Checking city-timezones data sample:");
const sample = cityTimezones.lookupViaCity("Beijing");
console.log("Beijing:", sample);

const sample2 = cityTimezones.lookupViaCity("Shanghai");
console.log("Shanghai:", sample2);

const sample3 = cityTimezones.lookupViaCity("Hangzhou");
console.log("Hangzhou:", sample3);

// Check if it supports Chinese characters
const sampleCN = cityTimezones.lookupViaCity("北京");
console.log("北京:", sampleCN);
