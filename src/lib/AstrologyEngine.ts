import { Solar } from 'lunar-javascript';
import { 
  Ecliptic, 
  Body,
  GeoVector
} from 'astronomy-engine';
import { astro as ziweiAstro } from 'iztro';

// --- Types ---

export interface DaYunData {
  startYear: number;
  endYear: number;
  startAge: number;
  ganZhi: string;
}

export interface BaziData {
  year: string;
  month: string;
  day: string;
  hour: string;
  wuxing: string;
  
  // Detailed Pillars
  yearGan: string;
  yearZhi: string;
  monthGan: string;
  monthZhi: string;
  dayGan: string;
  dayZhi: string;
  hourGan: string;
  hourZhi: string;

  // Main Stars (Ten Gods of Stems)
  yearShiShen: string;
  monthShiShen: string;
  dayShiShen: string; // Day Master
  hourShiShen: string;

  // Hidden Stems
  yearHideGan: string[];
  monthHideGan: string[];
  dayHideGan: string[];
  hourHideGan: string[];

  // Sub Stars (Ten Gods of Hidden Stems)
  yearHideShiShen: string[];
  monthHideShiShen: string[];
  dayHideShiShen: string[];
  hourHideShiShen: string[];

  // Cycles
  daYun: DaYunData[];

  // Wu Xing Statistics
  wuxingCount: { [key: string]: number };
  dayMasterElement: string;
  naYin: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
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
  sunAngle: number;
  moonAngle: number;
  sunElement: string;
  moonElement: string;
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

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

const STEM_ELEMENTS: Record<string, string> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水'
};

const ZODIAC_ELEMENTS: Record<string, string> = {
  'Aries': '火', 'Leo': '火', 'Sagittarius': '火',
  'Taurus': '土', 'Virgo': '土', 'Capricorn': '土',
  'Gemini': '风', 'Libra': '风', 'Aquarius': '风',
  'Cancer': '水', 'Scorpio': '水', 'Pisces': '水'
};

function getZodiacElement(signStr: string): string {
  for (const [sign, element] of Object.entries(ZODIAC_ELEMENTS)) {
    if (signStr.includes(sign)) return element;
  }
  return '';
}

function calculateWuxingCount(eightChar: any): { [key: string]: number } {
  const wuxingStr = `${eightChar.getYearWuXing()} ${eightChar.getMonthWuXing()} ${eightChar.getDayWuXing()} ${eightChar.getTimeWuXing()}`;
  const count: { [key: string]: number } = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  for (const char of wuxingStr) {
    if (count[char] !== undefined) {
      count[char]++;
    }
  }
  return count;
}

function calculateShiShen(dayMaster: string, target: string): string {
  if (!dayMaster || !target) return '';
  
  const dmIdx = STEMS.indexOf(dayMaster);
  const tIdx = STEMS.indexOf(target);
  if (dmIdx === -1 || tIdx === -1) return '';

  const dmEl = Math.floor(dmIdx / 2);
  const tEl = Math.floor(tIdx / 2);
  const dmPol = dmIdx % 2;
  const tPol = tIdx % 2;
  const samePol = dmPol === tPol;

  // 0: Same, 1: Output, 2: Wealth, 3: Power, 4: Resource
  const rel = (tEl - dmEl + 5) % 5;
  
  if (rel === 0) return samePol ? '比肩' : '劫财';
  if (rel === 1) return samePol ? '食神' : '伤官';
  if (rel === 2) return samePol ? '偏财' : '正财';
  if (rel === 3) return samePol ? '七杀' : '正官';
  if (rel === 4) return samePol ? '偏印' : '正印';
  
  return '';
}

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
    const dayMaster = eightChar.getDayGan();
    
    // Hidden Stems
    const yearHideGan = eightChar.getYearHideGan();
    const monthHideGan = eightChar.getMonthHideGan();
    const dayHideGan = eightChar.getDayHideGan();
    const hourHideGan = eightChar.getTimeHideGan();

    // Da Yun
    const yun = eightChar.getYun(gender === '男' ? 1 : 0);
    const daYunList = yun.getDaYun();
    const daYunData: DaYunData[] = daYunList.slice(0, 8).map(dy => ({
        startYear: dy.getStartYear(),
        endYear: dy.getEndYear(),
        startAge: dy.getStartAge(),
        ganZhi: dy.getGanZhi()
    }));

    const bazi: BaziData = {
      year: eightChar.getYear(),
      month: eightChar.getMonth(),
      day: eightChar.getDay(),
      hour: eightChar.getTime(),
      wuxing: `${eightChar.getYearWuXing()} ${eightChar.getMonthWuXing()} ${eightChar.getDayWuXing()} ${eightChar.getTimeWuXing()}`,
      
      yearGan: eightChar.getYearGan(),
      yearZhi: eightChar.getYearZhi(),
      monthGan: eightChar.getMonthGan(),
      monthZhi: eightChar.getMonthZhi(),
      dayGan: eightChar.getDayGan(),
      dayZhi: eightChar.getDayZhi(),
      hourGan: eightChar.getTimeGan(),
      hourZhi: eightChar.getTimeZhi(),

      yearShiShen: calculateShiShen(dayMaster, eightChar.getYearGan()),
      monthShiShen: calculateShiShen(dayMaster, eightChar.getMonthGan()),
      dayShiShen: '日主',
      hourShiShen: calculateShiShen(dayMaster, eightChar.getTimeGan()),

      yearHideGan,
      monthHideGan,
      dayHideGan,
      hourHideGan,

      yearHideShiShen: yearHideGan.map(g => calculateShiShen(dayMaster, g)),
      monthHideShiShen: monthHideGan.map(g => calculateShiShen(dayMaster, g)),
      dayHideShiShen: dayHideGan.map(g => calculateShiShen(dayMaster, g)),
      hourHideShiShen: hourHideGan.map(g => calculateShiShen(dayMaster, g)),

      daYun: daYunData,

      // Wu Xing Statistics
      wuxingCount: calculateWuxingCount(eightChar),
      dayMasterElement: STEM_ELEMENTS[dayMaster] || '',
      naYin: {
        year: eightChar.getYearNaYin(),
        month: eightChar.getMonthNaYin(),
        day: eightChar.getDayNaYin(),
        hour: eightChar.getTimeNaYin()
      }
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
      planets,
      sunAngle: Math.round(sunEcliptic.elon * 100) / 100,
      moonAngle: Math.round(moonEcliptic.elon * 100) / 100,
      sunElement: getZodiacElement(sunSign),
      moonElement: getZodiacElement(moonSign)
    };

    return {
      bazi,
      ziwei,
      western
    };
  }
}
