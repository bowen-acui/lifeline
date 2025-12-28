import { Lunar } from 'lunar-javascript';

try {
    const date = new Date();
    const lunar = Lunar.fromDate(date);
    console.log("Lunar Date:", lunar.toString());
    console.log("Bazi:", lunar.getEightChar().toString());
    
    // Check for Ziwei support in lunar-javascript
    // Note: lunar-javascript might not have full Ziwei built-in directly in the main class, 
    // but let's see what we can access or if we need another library.
    // Often it's used for the calendar conversion which is the basis for Ziwei.
    
    console.log("Test complete");
} catch (e) {
    console.error(e);
}
