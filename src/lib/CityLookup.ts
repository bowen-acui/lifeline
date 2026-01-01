import cityTimezones from 'city-timezones';

// ============================================================
// 中国城市精确坐标（city-timezones 对中国城市覆盖不完整）
// ============================================================
export const CHINA_CITY_COORDINATES: Record<string, { lat: number; lng: number; timezone: string }> = {
  // 直辖市 & 特别行政区
  '北京': { lat: 39.9042, lng: 116.4074, timezone: 'Asia/Shanghai' },
  '上海': { lat: 31.2304, lng: 121.4737, timezone: 'Asia/Shanghai' },
  '天津': { lat: 39.0842, lng: 117.2009, timezone: 'Asia/Shanghai' },
  '重庆': { lat: 29.5630, lng: 106.5516, timezone: 'Asia/Shanghai' },
  '香港': { lat: 22.3193, lng: 114.1694, timezone: 'Asia/Hong_Kong' },
  '澳门': { lat: 22.1987, lng: 113.5439, timezone: 'Asia/Macau' },
  // 广东
  '广州': { lat: 23.1291, lng: 113.2644, timezone: 'Asia/Shanghai' },
  '深圳': { lat: 22.5431, lng: 114.0579, timezone: 'Asia/Shanghai' },
  '东莞': { lat: 23.0207, lng: 113.7518, timezone: 'Asia/Shanghai' },
  '佛山': { lat: 23.0218, lng: 113.1219, timezone: 'Asia/Shanghai' },
  '珠海': { lat: 22.2710, lng: 113.5767, timezone: 'Asia/Shanghai' },
  '惠州': { lat: 23.1115, lng: 114.4152, timezone: 'Asia/Shanghai' },
  '中山': { lat: 22.5176, lng: 113.3926, timezone: 'Asia/Shanghai' },
  '汕头': { lat: 23.3535, lng: 116.6820, timezone: 'Asia/Shanghai' },
  // 浙江
  '杭州': { lat: 30.2741, lng: 120.1551, timezone: 'Asia/Shanghai' },
  '宁波': { lat: 29.8683, lng: 121.5440, timezone: 'Asia/Shanghai' },
  '温州': { lat: 27.9939, lng: 120.6994, timezone: 'Asia/Shanghai' },
  '嘉兴': { lat: 30.7469, lng: 120.7555, timezone: 'Asia/Shanghai' },
  '绍兴': { lat: 29.9971, lng: 120.5853, timezone: 'Asia/Shanghai' },
  // 江苏
  '南京': { lat: 32.0603, lng: 118.7969, timezone: 'Asia/Shanghai' },
  '苏州': { lat: 31.2989, lng: 120.5853, timezone: 'Asia/Shanghai' },
  '无锡': { lat: 31.4912, lng: 120.3119, timezone: 'Asia/Shanghai' },
  '常州': { lat: 31.8105, lng: 119.9741, timezone: 'Asia/Shanghai' },
  '南通': { lat: 31.9807, lng: 120.8947, timezone: 'Asia/Shanghai' },
  // 四川
  '成都': { lat: 30.5728, lng: 104.0668, timezone: 'Asia/Shanghai' },
  '绵阳': { lat: 31.4678, lng: 104.6796, timezone: 'Asia/Shanghai' },
  // 湖北
  '武汉': { lat: 30.5928, lng: 114.3055, timezone: 'Asia/Shanghai' },
  '宜昌': { lat: 30.6918, lng: 111.2868, timezone: 'Asia/Shanghai' },
  // 湖南
  '长沙': { lat: 28.2282, lng: 112.9388, timezone: 'Asia/Shanghai' },
  // 陕西
  '西安': { lat: 34.3416, lng: 108.9398, timezone: 'Asia/Shanghai' },
  // 山东
  '济南': { lat: 36.6512, lng: 116.9972, timezone: 'Asia/Shanghai' },
  '青岛': { lat: 36.0671, lng: 120.3826, timezone: 'Asia/Shanghai' },
  // 河南
  '郑州': { lat: 34.7466, lng: 113.6254, timezone: 'Asia/Shanghai' },
  // 河北
  '石家庄': { lat: 38.0428, lng: 114.5149, timezone: 'Asia/Shanghai' },
  // 辽宁
  '沈阳': { lat: 41.8057, lng: 123.4315, timezone: 'Asia/Shanghai' },
  '大连': { lat: 38.9140, lng: 121.6147, timezone: 'Asia/Shanghai' },
  // 吉林
  '长春': { lat: 43.8171, lng: 125.3235, timezone: 'Asia/Shanghai' },
  // 黑龙江
  '哈尔滨': { lat: 45.8038, lng: 126.5349, timezone: 'Asia/Shanghai' },
  // 福建
  '福州': { lat: 26.0745, lng: 119.2965, timezone: 'Asia/Shanghai' },
  '厦门': { lat: 24.4798, lng: 118.0894, timezone: 'Asia/Shanghai' },
  // 安徽
  '合肥': { lat: 31.8206, lng: 117.2272, timezone: 'Asia/Shanghai' },
  // 江西
  '南昌': { lat: 28.6820, lng: 115.8579, timezone: 'Asia/Shanghai' },
  // 山西
  '太原': { lat: 37.8706, lng: 112.5489, timezone: 'Asia/Shanghai' },
  // 云南
  '昆明': { lat: 24.8801, lng: 102.8329, timezone: 'Asia/Shanghai' },
  // 贵州
  '贵阳': { lat: 26.6470, lng: 106.6302, timezone: 'Asia/Shanghai' },
  // 广西
  '南宁': { lat: 22.8170, lng: 108.3665, timezone: 'Asia/Shanghai' },
  // 海南
  '海口': { lat: 20.0444, lng: 110.1999, timezone: 'Asia/Shanghai' },
  '三亚': { lat: 18.2528, lng: 109.5119, timezone: 'Asia/Shanghai' },
  // 甘肃
  '兰州': { lat: 36.0611, lng: 103.8343, timezone: 'Asia/Shanghai' },
  // 内蒙古
  '呼和浩特': { lat: 40.8427, lng: 111.7490, timezone: 'Asia/Shanghai' },
  // 宁夏
  '银川': { lat: 38.4872, lng: 106.2309, timezone: 'Asia/Shanghai' },
  // 青海
  '西宁': { lat: 36.6171, lng: 101.7782, timezone: 'Asia/Shanghai' },
  // 新疆 (注意：新疆实际使用 UTC+6，但官方仍用北京时间)
  '乌鲁木齐': { lat: 43.8256, lng: 87.6168, timezone: 'Asia/Shanghai' },
  // 西藏
  '拉萨': { lat: 29.6500, lng: 91.1000, timezone: 'Asia/Shanghai' },
  // 台湾
  '台北': { lat: 25.0330, lng: 121.5654, timezone: 'Asia/Taipei' },
  '高雄': { lat: 22.6273, lng: 120.3014, timezone: 'Asia/Taipei' },
  '台中': { lat: 24.1477, lng: 120.6736, timezone: 'Asia/Taipei' },
};

// ============================================================
// 国际主要城市（使用 city-timezones 库查询，这里缓存常用的）
// ============================================================
export const INTERNATIONAL_CITY_COORDINATES: Record<string, { lat: number; lng: number; timezone: string }> = {
  // 亚洲
  '东京': { lat: 35.6762, lng: 139.6503, timezone: 'Asia/Tokyo' },
  '首尔': { lat: 37.5665, lng: 126.9780, timezone: 'Asia/Seoul' },
  '新加坡': { lat: 1.3521, lng: 103.8198, timezone: 'Asia/Singapore' },
  '曼谷': { lat: 13.7563, lng: 100.5018, timezone: 'Asia/Bangkok' },
  '吉隆坡': { lat: 3.1390, lng: 101.6869, timezone: 'Asia/Kuala_Lumpur' },
  '雅加达': { lat: -6.2088, lng: 106.8456, timezone: 'Asia/Jakarta' },
  '马尼拉': { lat: 14.5995, lng: 120.9842, timezone: 'Asia/Manila' },
  '河内': { lat: 21.0285, lng: 105.8542, timezone: 'Asia/Ho_Chi_Minh' },
  '胡志明市': { lat: 10.8231, lng: 106.6297, timezone: 'Asia/Ho_Chi_Minh' },
  '德里': { lat: 28.7041, lng: 77.1025, timezone: 'Asia/Kolkata' },
  '孟买': { lat: 19.0760, lng: 72.8777, timezone: 'Asia/Kolkata' },
  '迪拜': { lat: 25.2048, lng: 55.2708, timezone: 'Asia/Dubai' },
  // 欧洲
  '伦敦': { lat: 51.5074, lng: -0.1278, timezone: 'Europe/London' },
  '巴黎': { lat: 48.8566, lng: 2.3522, timezone: 'Europe/Paris' },
  '柏林': { lat: 52.5200, lng: 13.4050, timezone: 'Europe/Berlin' },
  '罗马': { lat: 41.9028, lng: 12.4964, timezone: 'Europe/Rome' },
  '马德里': { lat: 40.4168, lng: -3.7038, timezone: 'Europe/Madrid' },
  '阿姆斯特丹': { lat: 52.3676, lng: 4.9041, timezone: 'Europe/Amsterdam' },
  '莫斯科': { lat: 55.7558, lng: 37.6173, timezone: 'Europe/Moscow' },
  '维也纳': { lat: 48.2082, lng: 16.3738, timezone: 'Europe/Vienna' },
  '苏黎世': { lat: 47.3769, lng: 8.5417, timezone: 'Europe/Zurich' },
  // 美洲
  '纽约': { lat: 40.7128, lng: -74.0060, timezone: 'America/New_York' },
  '洛杉矶': { lat: 34.0522, lng: -118.2437, timezone: 'America/Los_Angeles' },
  '芝加哥': { lat: 41.8781, lng: -87.6298, timezone: 'America/Chicago' },
  '旧金山': { lat: 37.7749, lng: -122.4194, timezone: 'America/Los_Angeles' },
  '西雅图': { lat: 47.6062, lng: -122.3321, timezone: 'America/Los_Angeles' },
  '温哥华': { lat: 49.2827, lng: -123.1207, timezone: 'America/Vancouver' },
  '多伦多': { lat: 43.6532, lng: -79.3832, timezone: 'America/Toronto' },
  '墨西哥城': { lat: 19.4326, lng: -99.1332, timezone: 'America/Mexico_City' },
  '圣保罗': { lat: -23.5505, lng: -46.6333, timezone: 'America/Sao_Paulo' },
  '布宜诺斯艾利斯': { lat: -34.6037, lng: -58.3816, timezone: 'America/Argentina/Buenos_Aires' },
  // 大洋洲
  '悉尼': { lat: -33.8688, lng: 151.2093, timezone: 'Australia/Sydney' },
  '墨尔本': { lat: -37.8136, lng: 144.9631, timezone: 'Australia/Melbourne' },
  '奥克兰': { lat: -36.8509, lng: 174.7645, timezone: 'Pacific/Auckland' },
  // 非洲
  '开罗': { lat: 30.0444, lng: 31.2357, timezone: 'Africa/Cairo' },
  '约翰内斯堡': { lat: -26.2041, lng: 28.0473, timezone: 'Africa/Johannesburg' },
};

// 合并所有城市坐标
export const CITY_COORDINATES: Record<string, { lat: number; lng: number; timezone: string }> = {
  ...CHINA_CITY_COORDINATES,
  ...INTERNATIONAL_CITY_COORDINATES,
};

// ============================================================
// 地区层级数据
// ============================================================
export interface Region {
  name: string;
  cities: string[];
}

export interface Country {
  name: string;
  regions: Region[];
}

export const LOCATION_DATA: Country[] = [
  {
    name: "中国",
    regions: [
      { name: "直辖市/特别行政区", cities: ["北京", "上海", "天津", "重庆", "香港", "澳门"] },
      { name: "广东", cities: ["广州", "深圳", "东莞", "佛山", "珠海", "惠州", "中山", "汕头"] },
      { name: "浙江", cities: ["杭州", "宁波", "温州", "嘉兴", "绍兴"] },
      { name: "江苏", cities: ["南京", "苏州", "无锡", "常州", "南通"] },
      { name: "四川", cities: ["成都", "绵阳"] },
      { name: "湖北", cities: ["武汉", "宜昌"] },
      { name: "湖南", cities: ["长沙"] },
      { name: "陕西", cities: ["西安"] },
      { name: "山东", cities: ["济南", "青岛"] },
      { name: "河南", cities: ["郑州"] },
      { name: "河北", cities: ["石家庄"] },
      { name: "辽宁", cities: ["沈阳", "大连"] },
      { name: "吉林", cities: ["长春"] },
      { name: "黑龙江", cities: ["哈尔滨"] },
      { name: "福建", cities: ["福州", "厦门"] },
      { name: "安徽", cities: ["合肥"] },
      { name: "江西", cities: ["南昌"] },
      { name: "山西", cities: ["太原"] },
      { name: "云南", cities: ["昆明"] },
      { name: "贵州", cities: ["贵阳"] },
      { name: "广西", cities: ["南宁"] },
      { name: "海南", cities: ["海口", "三亚"] },
      { name: "甘肃", cities: ["兰州"] },
      { name: "内蒙古", cities: ["呼和浩特"] },
      { name: "宁夏", cities: ["银川"] },
      { name: "青海", cities: ["西宁"] },
      { name: "新疆", cities: ["乌鲁木齐"] },
      { name: "西藏", cities: ["拉萨"] },
      { name: "台湾", cities: ["台北", "高雄", "台中"] },
    ]
  },
  {
    name: "日本",
    regions: [
      { name: "关东", cities: ["东京"] },
    ]
  },
  {
    name: "韩国",
    regions: [
      { name: "首都圈", cities: ["首尔"] },
    ]
  },
  {
    name: "东南亚",
    regions: [
      { name: "新加坡", cities: ["新加坡"] },
      { name: "泰国", cities: ["曼谷"] },
      { name: "马来西亚", cities: ["吉隆坡"] },
      { name: "印度尼西亚", cities: ["雅加达"] },
      { name: "菲律宾", cities: ["马尼拉"] },
      { name: "越南", cities: ["河内", "胡志明市"] },
    ]
  },
  {
    name: "南亚/中东",
    regions: [
      { name: "印度", cities: ["德里", "孟买"] },
      { name: "阿联酋", cities: ["迪拜"] },
    ]
  },
  {
    name: "欧洲",
    regions: [
      { name: "英国", cities: ["伦敦"] },
      { name: "法国", cities: ["巴黎"] },
      { name: "德国", cities: ["柏林"] },
      { name: "意大利", cities: ["罗马"] },
      { name: "西班牙", cities: ["马德里"] },
      { name: "荷兰", cities: ["阿姆斯特丹"] },
      { name: "俄罗斯", cities: ["莫斯科"] },
      { name: "奥地利", cities: ["维也纳"] },
      { name: "瑞士", cities: ["苏黎世"] },
    ]
  },
  {
    name: "北美",
    regions: [
      { name: "美国东部", cities: ["纽约", "芝加哥"] },
      { name: "美国西部", cities: ["洛杉矶", "旧金山", "西雅图"] },
      { name: "加拿大", cities: ["温哥华", "多伦多"] },
      { name: "墨西哥", cities: ["墨西哥城"] },
    ]
  },
  {
    name: "南美",
    regions: [
      { name: "巴西", cities: ["圣保罗"] },
      { name: "阿根廷", cities: ["布宜诺斯艾利斯"] },
    ]
  },
  {
    name: "大洋洲",
    regions: [
      { name: "澳大利亚", cities: ["悉尼", "墨尔本"] },
      { name: "新西兰", cities: ["奥克兰"] },
    ]
  },
  {
    name: "非洲",
    regions: [
      { name: "埃及", cities: ["开罗"] },
      { name: "南非", cities: ["约翰内斯堡"] },
    ]
  },
];

// ============================================================
// 城市查询函数
// ============================================================

/**
 * 使用 city-timezones 库搜索城市（英文名）
 */
export const searchCityByEnglishName = (cityName: string): { lat: number; lng: number; timezone: string } | null => {
  const results = cityTimezones.lookupViaCity(cityName);
  if (results && results.length > 0) {
    const first = results[0];
    return {
      lat: first.lat,
      lng: first.lng,
      timezone: first.timezone,
    };
  }
  return null;
};

/**
 * 查找城市坐标（优先使用内置数据，找不到则尝试 city-timezones）
 */
export const lookupCity = (place: string): { lat: number; lng: number; timezone?: string } | null => {
  // 1. 精确匹配内置数据
  if (CITY_COORDINATES[place]) {
    return CITY_COORDINATES[place];
  }
  // 2. 部分匹配内置数据
  const key = Object.keys(CITY_COORDINATES).find(k => place.includes(k));
  if (key) {
    return CITY_COORDINATES[key];
  }
  // 3. 尝试 city-timezones（英文名）
  const fromLib = searchCityByEnglishName(place);
  if (fromLib) {
    return fromLib;
  }
  return null;
};

/**
 * 获取坐标，找不到时返回北京
 */
export const getCoordinates = (place: string): { lat: number; lng: number; timezone?: string } => {
  const coords = lookupCity(place);
  if (coords) return coords;
  return CITY_COORDINATES['北京'];
};

/**
 * 获取城市的时区（用于真太阳时计算）
 */
export const getCityTimezone = (place: string): string => {
  const coords = lookupCity(place);
  if (coords && 'timezone' in coords && coords.timezone) {
    return coords.timezone;
  }
  return 'Asia/Shanghai'; // 默认北京时间
};
