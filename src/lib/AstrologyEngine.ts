import { Solar } from 'lunar-javascript';
import { 
  Ecliptic, 
  Body,
  GeoVector
} from 'astronomy-engine';
import { astro as ziweiAstro } from 'iztro';

// --- Types ---

export interface BaziData {
  year: string;
  month: string;
  day: string;
  hour: string;
  wuxing: string; // Simple string representation for now
}

export interface ZiweiPalace {
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  stars: { name: string; mutagen?: string }[];
}

export interface ZiweiData {
  mingGong: string;
  palaces: ZiweiPalace[];
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

const ZODIAC_SIGNS_EN = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 
  'Leo', 'Virgo', 'Libra', 'Scorpio', 
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const ZODIAC_SIGNS_CN = [
  '白羊座', '金牛座', '双子座', '巨蟹座', 
  '狮子座', '处女座', '天秤座', '天蝎座', 
  '射手座', '摩羯座', '水瓶座', '双鱼座'
];

const PLANET_NAMES_CN: Record<string, string> = {
  'Sun': '太阳',
  'Moon': '月亮',
  'Mercury': '水星',
  'Venus': '金星',
  'Mars': '火星',
  'Jupiter': '木星',
  'Saturn': '土星',
  'Uranus': '天王星',
  'Neptune': '海王星',
  'Pluto': '冥王星'
};

function getZodiacSign(longitude: number): string {
  const index = Math.floor(longitude / 30) % 12;
  return `${ZODIAC_SIGNS_EN[index]} (${ZODIAC_SIGNS_CN[index]})`;
}

function getPlanetName(body: string): string {
  return `${body} ${PLANET_NAMES_CN[body] || ''}`;
}

function toZiweiTimeIndex(date: Date): number {
  // iztro uses timeIndex 0~11 for 子~亥, and 12 for late 子时 (23:00~23:59)
  const hour = date.getHours();
  return Math.floor((hour + 1) / 2);
}

function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}-${m}-${d}`;
}

// --- Engine ---

export class AstrologyEngine {
  
  /**
   * Generate all base charts from a given date and location.
   * @param date Date object
   * @param _lat Latitude (optional, default 39.9 Beijing) - Unused in MVP Geocentric
   * @param _lng Longitude (optional, default 116.4 Beijing) - Unused in MVP Geocentric
   * @param gender Ziwei gender parameter (男/女). Default 女.
   */
  static generateBaseCharts(
    date: Date,
    _lat: number = 39.9,
    _lng: number = 116.4,
    gender: '男' | '女' = '女'
  ): BaseChartData {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const hh = date.getHours();
    const mm = date.getMinutes();
    const solar = Solar.fromYmdHms(y, m, d, hh, mm, 0);
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

    // 2. Ziwei Doushu (Real algorithm via iztro)
    const ziweiTimeIndex = toZiweiTimeIndex(date);
    const solarYmd = formatYMD(date);
    const astrolabe = ziweiAstro.bySolar(solarYmd, ziweiTimeIndex, gender, true, 'zh-CN');

    const palaces: ZiweiPalace[] = astrolabe.palaces.map((p) => {
      const stars = [...p.majorStars, ...p.minorStars, ...p.adjectiveStars]
        .map((s) => ({ name: s.name, mutagen: s.mutagen }))
        // keep stable ordering: major first (already), then minor, then adjective.
        .filter((s) => Boolean(s.name));

      return {
        name: p.name,
        heavenlyStem: p.heavenlyStem,
        earthlyBranch: p.earthlyBranch,
        stars,
      };
    });

    const ziwei: ZiweiData = {
      mingGong: `${astrolabe.earthlyBranchOfSoulPalace}`,
      palaces,
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
            name: getPlanetName(body),
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
