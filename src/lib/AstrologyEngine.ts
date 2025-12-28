import { Solar } from 'lunar-javascript';
import { 
  Ecliptic, 
  Body,
  GeoVector
} from 'astronomy-engine';

// --- Types ---

export interface BaziData {
  year: string;
  month: string;
  day: string;
  hour: string;
  wuxing: string; // Simple string representation for now
}

export interface ZiweiData {
  mingGong: string;
  mainStars: string[]; 
}

export interface WesternChartData {
  sunSign: string;
  moonSign: string;
  ascendant: string;
  planets: { name: string; sign: string; angle: number }[];
}

export interface BaseChartData {
  bazi: BaziData;
  ziwei: ZiweiData;
  western: WesternChartData;
}

// --- Helpers ---

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 
  'Leo', 'Virgo', 'Libra', 'Scorpio', 
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

function getZodiacSign(longitude: number): string {
  const index = Math.floor(longitude / 30) % 12;
  return ZODIAC_SIGNS[index];
}

// --- Engine ---

export class AstrologyEngine {
  
  /**
   * Generate all base charts from a given date and location.
   * @param date Date object
   * @param _lat Latitude (optional, default 39.9 Beijing) - Unused in MVP Geocentric
   * @param _lng Longitude (optional, default 116.4 Beijing) - Unused in MVP Geocentric
   */
  static generateBaseCharts(date: Date, _lat: number = 39.9, _lng: number = 116.4): BaseChartData {
    const solar = Solar.fromDate(date);
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();

    // 1. Bazi (Eight Characters)
    const bazi: BaziData = {
      year: eightChar.getYear(),
      month: eightChar.getMonth(),
      day: eightChar.getDay(),
      hour: eightChar.getTime(),
      wuxing: `${eightChar.getYearWuXing()} ${eightChar.getMonthWuXing()} ${eightChar.getDayWuXing()} ${eightChar.getTimeWuXing()}`
    };

    // 2. Ziwei Doushu (Simplified for MVP)
    // Note: Full Ziwei plotting is complex. For MVP we extract basic info if available 
    // or use a simplified logic based on Lunar date/time.
    // lunar-javascript has some EightChar logic but full Ziwei might need a dedicated plugin.
    // Here we simulate the structure for the UI.
    // In a real full implementation, we would calculate the Ming Gong position based on Lunar Month and Hour.
    
    const mingGong = eightChar.getMingGong();
    
    const ziwei: ZiweiData = {
      mingGong: mingGong, 
      mainStars: ["紫微", "天府"] // Placeholder
    };

    // 3. Western Astrology
    // We don't strictly need Observer for GeoVector as it's geocentric, 
    // but for Topocentric (surface) we would need it. 
    // For standard astrology, Geocentric is often used, or Topocentric for Ascendant.
    // Let's use Geocentric for planets for simplicity and stability.
    
    // Calculate Sun
    const sunVector = GeoVector(Body.Sun, date, true);
    const sunEcliptic = Ecliptic(sunVector);
    const sunSign = getZodiacSign(sunEcliptic.elon);

    // Calculate Moon
    const moonVector = GeoVector(Body.Moon, date, true);
    const moonEcliptic = Ecliptic(moonVector);
    const moonSign = getZodiacSign(moonEcliptic.elon);

    // Calculate Ascendant (Rising Sign)
    // This requires finding the point of the ecliptic that is rising at the eastern horizon.
    // A simplified approximation for MVP:
    // We can use a library function if available, or approximate.
    // astronomy-engine doesn't have a direct "getAscendant" but we can calculate the Sidereal Time.
    // For MVP, let's calculate a few major planets to show "Engineering" style data.
    
    const planets = [Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn].map(body => {
        const vec = GeoVector(body, date, true);
        const ec = Ecliptic(vec);
        return {
            name: body,
            sign: getZodiacSign(ec.elon),
            angle: Math.round(ec.elon * 100) / 100
        };
    });

    // Rough Ascendant Calculation (Sidereal Time based) - Placeholder for high precision lib
    // For now, we will leave Ascendant as "Calculated" or use a simplified lookup if needed.
    // Let's just return Sun/Moon/Planets which is enough for the "Data" look.
    
    const western: WesternChartData = {
      sunSign,
      moonSign,
      ascendant: "Calculating...", // To be implemented with precise sidereal time
      planets
    };

    return {
      bazi,
      ziwei,
      western
    };
  }
}
