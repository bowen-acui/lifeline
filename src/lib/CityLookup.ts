export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  '北京': { lat: 39.9042, lng: 116.4074 },
  'Beijing': { lat: 39.9042, lng: 116.4074 },
  '上海': { lat: 31.2304, lng: 121.4737 },
  'Shanghai': { lat: 31.2304, lng: 121.4737 },
  '广州': { lat: 23.1291, lng: 113.2644 },
  'Guangzhou': { lat: 23.1291, lng: 113.2644 },
  '深圳': { lat: 22.5431, lng: 114.0579 },
  'Shenzhen': { lat: 22.5431, lng: 114.0579 },
  '成都': { lat: 30.5728, lng: 104.0668 },
  'Chengdu': { lat: 30.5728, lng: 104.0668 },
  '杭州': { lat: 30.2741, lng: 120.1551 },
  'Hangzhou': { lat: 30.2741, lng: 120.1551 },
  '武汉': { lat: 30.5928, lng: 114.3055 },
  'Wuhan': { lat: 30.5928, lng: 114.3055 },
  '西安': { lat: 34.3416, lng: 108.9398 },
  'Xi\'an': { lat: 34.3416, lng: 108.9398 },
  '重庆': { lat: 29.5630, lng: 106.5516 },
  'Chongqing': { lat: 29.5630, lng: 106.5516 },
  '南京': { lat: 32.0603, lng: 118.7969 },
  'Nanjing': { lat: 32.0603, lng: 118.7969 },
  '天津': { lat: 39.0842, lng: 117.2009 },
  'Tianjin': { lat: 39.0842, lng: 117.2009 },
  '台北': { lat: 25.0330, lng: 121.5654 },
  'Taipei': { lat: 25.0330, lng: 121.5654 },
  '香港': { lat: 22.3193, lng: 114.1694 },
  'Hong Kong': { lat: 22.3193, lng: 114.1694 },
};

export const getCoordinates = (place: string): { lat: number; lng: number } => {
  // Simple exact match or partial match
  const key = Object.keys(CITY_COORDINATES).find(k => place.includes(k));
  if (key) {
    return CITY_COORDINATES[key];
  }
  // Default to Beijing
  return CITY_COORDINATES['北京'];
};
