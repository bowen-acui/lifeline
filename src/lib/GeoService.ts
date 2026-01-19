/**
 * 地理位置服务
 * 使用 GeoNames 免费 API 查询城市
 * 备用：使用内置数据
 */

// GeoNames 免费 API (需要注册账号，这里使用 demo 账号测试)
const GEONAMES_USERNAME = 'susu7729'; // 生产环境应替换为自己的账号

export interface GeoCity {
  name: string;
  adminName1: string; // 省/州
  countryName: string;
  lat: number;
  lng: number;
  timezone: string;
}

export interface GeoRegion {
  name: string;
  geonameId: number;
}

export interface GeoCountry {
  name: string;
  code: string;
  geonameId: number;
}

/**
 * 获取全球国家列表
 */
export async function fetchCountries(): Promise<GeoCountry[]> {
  try {
    const url = `https://secure.geonames.org/countryInfoJSON?username=${GEONAMES_USERNAME}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch countries');
    const data = await response.json();

    if (data.geonames) {
      return data.geonames
        .map((item: any) => ({
          name: item.countryName,
          code: item.countryCode,
          geonameId: item.geonameId,
        }))
        .filter((item: GeoCountry) => item.name && item.code)
        .sort((a: GeoCountry, b: GeoCountry) => a.name.localeCompare(b.name));
    }
    return [];
  } catch (error) {
    console.error('fetchCountries error:', error);
    return [];
  }
}

// 常用国家代码映射
export const COUNTRY_CODES: Record<string, string> = {
  '中国': 'CN',
  '日本': 'JP',
  '韩国': 'KR',
  '新加坡': 'SG',
  '泰国': 'TH',
  '马来西亚': 'MY',
  '印度尼西亚': 'ID',
  '菲律宾': 'PH',
  '越南': 'VN',
  '印度': 'IN',
  '阿联酋': 'AE',
  '英国': 'GB',
  '法国': 'FR',
  '德国': 'DE',
  '意大利': 'IT',
  '西班牙': 'ES',
  '荷兰': 'NL',
  '俄罗斯': 'RU',
  '奥地利': 'AT',
  '瑞士': 'CH',
  '美国': 'US',
  '加拿大': 'CA',
  '墨西哥': 'MX',
  '巴西': 'BR',
  '阿根廷': 'AR',
  '澳大利亚': 'AU',
  '新西兰': 'NZ',
  '埃及': 'EG',
  '南非': 'ZA',
};

// 国家中文名列表
export const COUNTRIES = Object.keys(COUNTRY_CODES);

/**
 * 获取国家的一级行政区（省/州）
 */
export async function fetchRegions(countryCode: string, lang?: string): Promise<GeoRegion[]> {
  try {
    let url = `https://secure.geonames.org/childrenJSON?geonameId=${await getCountryGeonameId(countryCode)}&username=${GEONAMES_USERNAME}`;
    if (lang) {
      url += `&lang=${encodeURIComponent(lang)}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch regions');
    const data = await response.json();
    
    if (data.geonames) {
      return data.geonames.map((item: any) => ({
        name: item.name,
        geonameId: item.geonameId,
      }));
    }
    return [];
  } catch (error) {
    console.error('fetchRegions error:', error);
    return [];
  }
}

/**
 * 获取地区的城市列表
 */
export async function fetchCities(regionGeonameId: number, lang?: string): Promise<GeoCity[]> {
  try {
    let url = `https://secure.geonames.org/childrenJSON?geonameId=${regionGeonameId}&username=${GEONAMES_USERNAME}`;
    if (lang) {
      url += `&lang=${encodeURIComponent(lang)}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch cities');
    const data = await response.json();
    
    if (data.geonames) {
      // 获取时区信息需要额外调用
      return data.geonames.map((item: any) => ({
        name: item.name,
        adminName1: item.adminName1 || '',
        countryName: item.countryName || '',
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lng),
        timezone: '', // 需要单独查询
      }));
    }
    return [];
  } catch (error) {
    console.error('fetchCities error:', error);
    return [];
  }
}

/**
 * 搜索城市（模糊搜索）
 * 先尝试 GeoNames API，失败则从本地数据库搜索
 */
export async function searchCities(query: string, countryCode?: string): Promise<GeoCity[]> {
  try {
    let url = `https://secure.geonames.org/searchJSON?q=${encodeURIComponent(query)}&maxRows=10&featureClass=P&username=${GEONAMES_USERNAME}`;
    if (countryCode) {
      url += `&country=${countryCode}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to search cities');
    const data = await response.json();
    
    // 检查是否有错误状态（如账号未启用、超限额等）
    if (data.status) {
      console.warn('GeoNames API error:', data.status.message);
      // API 失败，使用本地搜索
      return searchCitiesLocally(query);
    }
    
    if (data.geonames && data.geonames.length > 0) {
      return data.geonames.map((item: any) => ({
        name: item.name,
        adminName1: item.adminName1 || '',
        countryName: item.countryName || '',
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lng),
        timezone: item.timezone?.timeZoneId || 'UTC',
      }));
    }
    
    // API 返回空结果，尝试本地搜索
    return searchCitiesLocally(query);
  } catch (error) {
    console.error('searchCities error:', error);
    // API 失败，使用本地搜索
    return searchCitiesLocally(query);
  }
}

/**
 * 从本地数据库搜索城市
 */
function searchCitiesLocally(query: string): GeoCity[] {
  const normalizedQuery = query.toLowerCase().trim();
  const results: GeoCity[] = [];
  
  // 在 CITY_COORDINATES 中搜索
  for (const [cityName, coords] of Object.entries(CITY_COORDINATES)) {
    if (cityName.toLowerCase().includes(normalizedQuery) || 
        normalizedQuery.includes(cityName.toLowerCase())) {
      results.push({
        name: cityName,
        adminName1: '',
        countryName: '本地数据',
        lat: coords.lat,
        lng: coords.lng,
        timezone: coords.timezone,
      });
    }
  }
  
  // 在 FALLBACK_DATA 中搜索
  for (const [country, regions] of Object.entries(FALLBACK_DATA)) {
    for (const [region, cities] of Object.entries(regions)) {
      for (const city of cities) {
        if (city.toLowerCase().includes(normalizedQuery) || 
            normalizedQuery.includes(city.toLowerCase())) {
          // 检查是否已经在结果中
          if (!results.some(r => r.name === city)) {
            // 尝试从 CITY_COORDINATES 获取坐标
            const coords = CITY_COORDINATES[city];
            if (coords) {
              results.push({
                name: city,
                adminName1: region,
                countryName: country,
                lat: coords.lat,
                lng: coords.lng,
                timezone: coords.timezone,
              });
            } else {
              // 没有坐标数据，但仍然返回城市名
              results.push({
                name: city,
                adminName1: region,
                countryName: country,
                lat: 0,
                lng: 0,
                timezone: 'UTC',
              });
            }
          }
        }
      }
    }
  }
  
  return results.slice(0, 10); // 限制返回 10 个结果
}

/**
 * 根据城市名和国家查询城市坐标和时区
 */
export async function getCityCoordinates(cityName: string, countryCode?: string): Promise<GeoCity | null> {
  try {
    let url = `https://secure.geonames.org/searchJSON?q=${encodeURIComponent(cityName)}&maxRows=1&featureClass=P&username=${GEONAMES_USERNAME}`;
    if (countryCode) {
      url += `&country=${countryCode}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to search city');
    const data = await response.json();
    
    if (data.geonames && data.geonames.length > 0) {
      const item = data.geonames[0];
      return {
        name: item.name,
        adminName1: item.adminName1 || '',
        countryName: item.countryName || '',
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lng),
        timezone: item.timezone?.timeZoneId || 'UTC',
      };
    }
    return null;
  } catch (error) {
    console.error('getCityCoordinates error:', error);
    return null;
  }
}

/**
 * 获取城市详细信息（包括时区）
 */
export async function getCityDetails(lat: number, lng: number): Promise<{ timezone: string } | null> {
  try {
    const url = `https://secure.geonames.org/timezoneJSON?lat=${lat}&lng=${lng}&username=${GEONAMES_USERNAME}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to get timezone');
    const data = await response.json();
    
    return {
      timezone: data.timezoneId || 'UTC',
    };
  } catch (error) {
    console.error('getCityDetails error:', error);
    return null;
  }
}

// 缓存国家 geonameId
const countryGeonameIdCache: Record<string, number> = {
  'CN': 1814991,
  'JP': 1861060,
  'KR': 1835841,
  'US': 6252001,
  'GB': 2635167,
  'FR': 3017382,
  'DE': 2921044,
  'AU': 2077456,
};

async function getCountryGeonameId(countryCode: string): Promise<number> {
  if (countryGeonameIdCache[countryCode]) {
    return countryGeonameIdCache[countryCode];
  }
  
  try {
    const url = `https://secure.geonames.org/countryInfoJSON?country=${countryCode}&username=${GEONAMES_USERNAME}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.geonames && data.geonames.length > 0) {
      const geonameId = data.geonames[0].geonameId;
      countryGeonameIdCache[countryCode] = geonameId;
      return geonameId;
    }
  } catch (error) {
    console.error('getCountryGeonameId error:', error);
  }
  
  return 0;
}

// ============================================================
// 内置备用数据（当 API 不可用时使用）
// ============================================================

export const FALLBACK_DATA: Record<string, Record<string, string[]>> = {
  '中国': {
    '直辖市': ['北京', '上海', '天津', '重庆'],
    '特别行政区': ['香港', '澳门'],
    '广东': ['广州', '深圳', '东莞', '佛山', '珠海', '惠州', '中山', '汕头'],
    '浙江': ['杭州', '宁波', '温州', '嘉兴', '绍兴', '金华', '台州'],
    '江苏': ['南京', '苏州', '无锡', '常州', '南通', '徐州', '扬州'],
    '四川': ['成都', '绵阳', '宜宾', '南充', '泸州', '乐山'],
    '湖北': ['武汉', '宜昌', '襄阳', '荆州', '黄石'],
    '湖南': ['长沙', '株洲', '衡阳', '岳阳', '常德'],
    '陕西': ['西安', '宝鸡', '咸阳', '延安', '榆林'],
    '山东': ['济南', '青岛', '烟台', '潍坊', '淄博', '济宁'],
    '河南': ['郑州', '洛阳', '开封', '南阳', '安阳'],
    '河北': ['石家庄', '唐山', '保定', '邯郸', '秦皇岛'],
    '辽宁': ['沈阳', '大连', '鞍山', '抚顺'],
    '吉林': ['长春', '吉林市', '延吉', '四平'],
    '黑龙江': ['哈尔滨', '齐齐哈尔', '大庆', '牡丹江'],
    '福建': ['福州', '厦门', '泉州', '漳州', '莆田'],
    '安徽': ['合肥', '芜湖', '蚌埠', '淮南', '马鞍山'],
    '江西': ['南昌', '赣州', '九江', '景德镇'],
    '山西': ['太原', '大同', '长治', '晋中'],
    '云南': ['昆明', '大理', '丽江', '曲靖'],
    '贵州': ['贵阳', '遵义', '六盘水', '毕节'],
    '广西': ['南宁', '桂林', '柳州', '北海'],
    '海南': ['海口', '三亚'],
    '甘肃': ['兰州', '天水', '酒泉', '敦煌'],
    '内蒙古': ['呼和浩特', '包头', '鄂尔多斯', '赤峰'],
    '宁夏': ['银川'],
    '青海': ['西宁', '格尔木'],
    '新疆': ['乌鲁木齐', '喀什', '吐鲁番', '克拉玛依'],
    '西藏': ['拉萨', '日喀则', '林芝'],
    '台湾': ['台北', '高雄', '台中', '台南'],
  },
  '日本': {
    '北海道': ['札幌', '函馆', '旭川'],
    '东北': ['仙台', '盛冈', '秋田', '山形', '福岛'],
    '关东': ['东京', '横滨', '川崎', '千叶', '宇都宫'],
    '中部': ['名古屋', '静冈', '长野'],
    '近畿': ['大阪', '京都', '神户', '奈良', '和歌山'],
    '中国地区': ['广岛', '冈山', '松江'],
    '四国': ['高松', '德岛', '松山', '高知'],
    '九州': ['福冈', '北九州', '长崎', '熊本', '大分', '宫崎', '鹿儿岛'],
    '冲绳': ['那霸'],
  },
  '韩国': {
    '首都圈': ['首尔', '仁川', '水原', '城南'],
    '江原道': ['春川', '江陵', '原州'],
    '庆尚道': ['釜山', '大邱', '蔚山', '浦项', '庆州'],
    '全罗道': ['光州', '全州', '木浦', '丽水'],
    '忠清道': ['大田', '清州', '天安'],
    '济州': ['济州市'],
  },
  '美国': {
    '东北部': ['纽约', '波士顿', '费城', '华盛顿'],
    '东南部': ['迈阿密', '亚特兰大', '奥兰多', '夏洛特'],
    '中西部': ['芝加哥', '底特律', '明尼阿波利斯', '克利夫兰'],
    '西南部': ['休斯顿', '达拉斯', '圣安东尼奥', '菲尼克斯', '丹佛'],
    '西部': ['洛杉矶', '旧金山', '西雅图', '拉斯维加斯', '波特兰', '圣迭戈'],
  },
  '英国': {
    '英格兰': ['伦敦', '曼彻斯特', '伯明翰', '利物浦', '利兹', '布里斯托'],
    '苏格兰': ['爱丁堡', '格拉斯哥'],
    '威尔士': ['加的夫'],
    '北爱尔兰': ['贝尔法斯特'],
  },
  '法国': {
    '法兰西岛': ['巴黎'],
    '普罗旺斯': ['马赛', '尼斯', '戛纳'],
    '奥弗涅-罗纳-阿尔卑斯': ['里昂', '格勒诺布尔'],
    '新阿基坦': ['波尔多', '图卢兹'],
    '布列塔尼': ['雷恩', '南特'],
  },
  '德国': {
    '巴伐利亚': ['慕尼黑', '纽伦堡'],
    '北威州': ['科隆', '杜塞尔多夫', '多特蒙德'],
    '黑森州': ['法兰克福', '威斯巴登'],
    '柏林': ['柏林'],
    '汉堡': ['汉堡'],
  },
  '澳大利亚': {
    '新南威尔士': ['悉尼', '纽卡斯尔'],
    '维多利亚': ['墨尔本'],
    '昆士兰': ['布里斯班', '黄金海岸', '凯恩斯'],
    '西澳大利亚': ['珀斯'],
    '南澳大利亚': ['阿德莱德'],
  },
  '加拿大': {
    '安大略': ['多伦多', '渥太华', '汉密尔顿'],
    '魁北克': ['蒙特利尔', '魁北克市'],
    '不列颠哥伦比亚': ['温哥华', '维多利亚'],
    '阿尔伯塔': ['卡尔加里', '埃德蒙顿'],
  },
  '新加坡': {
    '新加坡': ['新加坡'],
  },
  '泰国': {
    '中部': ['曼谷', '芭提雅'],
    '北部': ['清迈', '清莱'],
    '南部': ['普吉', '苏梅岛', '甲米'],
  },
  '马来西亚': {
    '联邦直辖区': ['吉隆坡'],
    '雪兰莪': ['莎阿南', '八打灵再也'],
    '槟城': ['乔治市'],
    '沙巴': ['亚庇'],
  },
  '印度': {
    '德里': ['新德里'],
    '马哈拉施特拉': ['孟买', '浦那'],
    '卡纳塔克': ['班加罗尔'],
    '泰米尔纳德': ['金奈'],
    '西孟加拉': ['加尔各答'],
  },
  '俄罗斯': {
    '中央': ['莫斯科'],
    '西北': ['圣彼得堡'],
    '乌拉尔': ['叶卡捷琳堡'],
    '西伯利亚': ['新西伯利亚', '伊尔库茨克'],
    '远东': ['符拉迪沃斯托克', '哈巴罗夫斯克'],
  },
};

/**
 * 城市坐标备用数据库
 * 当 GeoNames API 无法查询或查询失败时使用
 */
export const CITY_COORDINATES: Record<string, { lat: number; lng: number; timezone: string }> = {
  // 泰国
  '苏梅岛': { lat: 9.5357, lng: 100.0629, timezone: 'Asia/Bangkok' },
  '普吉': { lat: 7.8804, lng: 98.3923, timezone: 'Asia/Bangkok' },
  '甲米': { lat: 8.0863, lng: 98.9063, timezone: 'Asia/Bangkok' },
  '曼谷': { lat: 13.7563, lng: 100.5018, timezone: 'Asia/Bangkok' },
  '芭提雅': { lat: 12.9236, lng: 100.8825, timezone: 'Asia/Bangkok' },
  '清迈': { lat: 18.7883, lng: 98.9853, timezone: 'Asia/Bangkok' },
  '清莱': { lat: 19.9105, lng: 99.8406, timezone: 'Asia/Bangkok' },
  
  // 日本
  '东京': { lat: 35.6762, lng: 139.6503, timezone: 'Asia/Tokyo' },
  '大阪': { lat: 34.6937, lng: 135.5023, timezone: 'Asia/Tokyo' },
  '京都': { lat: 35.0116, lng: 135.7681, timezone: 'Asia/Tokyo' },
  '札幌': { lat: 43.0642, lng: 141.3469, timezone: 'Asia/Tokyo' },
  '福冈': { lat: 33.5904, lng: 130.4017, timezone: 'Asia/Tokyo' },
  '那霸': { lat: 26.2124, lng: 127.6809, timezone: 'Asia/Tokyo' },
  
  // 中国
  '北京': { lat: 39.9042, lng: 116.4074, timezone: 'Asia/Shanghai' },
  '上海': { lat: 31.2304, lng: 121.4737, timezone: 'Asia/Shanghai' },
  '天津': { lat: 39.3434, lng: 117.3616, timezone: 'Asia/Shanghai' },
  '重庆': { lat: 29.4316, lng: 106.9123, timezone: 'Asia/Shanghai' },
  '广州': { lat: 23.1291, lng: 113.2644, timezone: 'Asia/Shanghai' },
  '深圳': { lat: 22.5431, lng: 114.0579, timezone: 'Asia/Shanghai' },
  '成都': { lat: 30.5728, lng: 104.0668, timezone: 'Asia/Shanghai' },
  '杭州': { lat: 30.2741, lng: 120.1551, timezone: 'Asia/Shanghai' },
  '武汉': { lat: 30.5928, lng: 114.3055, timezone: 'Asia/Shanghai' },
  '西安': { lat: 34.3416, lng: 108.9398, timezone: 'Asia/Shanghai' },
  '南京': { lat: 32.0603, lng: 118.7969, timezone: 'Asia/Shanghai' },
  '苏州': { lat: 31.2989, lng: 120.5853, timezone: 'Asia/Shanghai' },
  '东莞': { lat: 23.0209, lng: 113.7518, timezone: 'Asia/Shanghai' },
  '佛山': { lat: 23.0218, lng: 113.1219, timezone: 'Asia/Shanghai' },
  '长沙': { lat: 28.2282, lng: 112.9388, timezone: 'Asia/Shanghai' },
  '郑州': { lat: 34.7466, lng: 113.6253, timezone: 'Asia/Shanghai' },
  '济南': { lat: 36.6512, lng: 117.1208, timezone: 'Asia/Shanghai' },
  '青岛': { lat: 36.0671, lng: 120.3826, timezone: 'Asia/Shanghai' },
  '厦门': { lat: 24.4798, lng: 118.0894, timezone: 'Asia/Shanghai' },
  '昆明': { lat: 25.0406, lng: 102.7123, timezone: 'Asia/Shanghai' },
  '香港': { lat: 22.3193, lng: 114.1694, timezone: 'Asia/Hong_Kong' },
  '澳门': { lat: 22.1987, lng: 113.5439, timezone: 'Asia/Macau' },
  '台北': { lat: 25.0330, lng: 121.5654, timezone: 'Asia/Taipei' },
  '高雄': { lat: 22.6273, lng: 120.3014, timezone: 'Asia/Taipei' },
};

/**
 * 获取内置备用数据的省份列表
 */
export function getFallbackRegions(country: string): string[] {
  return Object.keys(FALLBACK_DATA[country] || {});
}

/**
 * 获取内置备用数据的城市列表
 */
export function getFallbackCities(country: string, region: string): string[] {
  return FALLBACK_DATA[country]?.[region] || [];
}

/**
 * 从备用数据库获取城市坐标
 */
export function getCityCoordinatesFromFallback(cityName: string): { lat: number; lng: number; timezone: string } | null {
  return CITY_COORDINATES[cityName] || null;
}
