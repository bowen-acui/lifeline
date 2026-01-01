
export const EXTRA_CHINESE_CITIES: Record<string, { lat: number; lng: number; timezone: string }> = {
  // 河北
  '唐山': { lat: 39.6301, lng: 118.1802, timezone: 'Asia/Shanghai' },
  '保定': { lat: 38.8738, lng: 115.4648, timezone: 'Asia/Shanghai' },
  '邯郸': { lat: 36.6256, lng: 114.5391, timezone: 'Asia/Shanghai' },
  '秦皇岛': { lat: 39.9354, lng: 119.6005, timezone: 'Asia/Shanghai' },
  '张家口': { lat: 40.8244, lng: 114.8858, timezone: 'Asia/Shanghai' },
  '承德': { lat: 40.9762, lng: 117.9624, timezone: 'Asia/Shanghai' },
  '沧州': { lat: 38.3045, lng: 116.8388, timezone: 'Asia/Shanghai' },
  '廊坊': { lat: 39.5380, lng: 116.6837, timezone: 'Asia/Shanghai' },
  '衡水': { lat: 37.7390, lng: 115.6739, timezone: 'Asia/Shanghai' },
  '邢台': { lat: 37.0706, lng: 114.5048, timezone: 'Asia/Shanghai' },

  // 山西
  '大同': { lat: 40.0768, lng: 113.3001, timezone: 'Asia/Shanghai' },
  '长治': { lat: 36.1954, lng: 113.1163, timezone: 'Asia/Shanghai' },
  '晋中': { lat: 37.6870, lng: 112.7527, timezone: 'Asia/Shanghai' },
  '运城': { lat: 35.0264, lng: 111.0073, timezone: 'Asia/Shanghai' },
  '临汾': { lat: 36.0880, lng: 111.5190, timezone: 'Asia/Shanghai' },

  // 内蒙古
  '包头': { lat: 40.6579, lng: 109.8403, timezone: 'Asia/Shanghai' },
  '鄂尔多斯': { lat: 39.6083, lng: 109.7813, timezone: 'Asia/Shanghai' },
  '赤峰': { lat: 42.2683, lng: 118.9638, timezone: 'Asia/Shanghai' },
  '通辽': { lat: 43.6137, lng: 122.2692, timezone: 'Asia/Shanghai' },
  '呼伦贝尔': { lat: 49.2116, lng: 119.7658, timezone: 'Asia/Shanghai' },

  // 辽宁
  '鞍山': { lat: 41.1078, lng: 122.9944, timezone: 'Asia/Shanghai' },
  '抚顺': { lat: 41.8808, lng: 123.9572, timezone: 'Asia/Shanghai' },
  '本溪': { lat: 41.2941, lng: 123.7666, timezone: 'Asia/Shanghai' },
  '丹东': { lat: 40.1242, lng: 124.3541, timezone: 'Asia/Shanghai' },
  '锦州': { lat: 41.0951, lng: 121.1270, timezone: 'Asia/Shanghai' },
  '营口': { lat: 40.6674, lng: 122.2326, timezone: 'Asia/Shanghai' },

  // 吉林
  '吉林市': { lat: 43.8378, lng: 126.5494, timezone: 'Asia/Shanghai' },
  '延吉': { lat: 42.9068, lng: 129.5076, timezone: 'Asia/Shanghai' },
  '四平': { lat: 43.1664, lng: 124.3504, timezone: 'Asia/Shanghai' },
  '通化': { lat: 41.7284, lng: 125.9396, timezone: 'Asia/Shanghai' },

  // 黑龙江
  '齐齐哈尔': { lat: 47.3543, lng: 123.9181, timezone: 'Asia/Shanghai' },
  '大庆': { lat: 46.5871, lng: 125.1038, timezone: 'Asia/Shanghai' },
  '牡丹江': { lat: 44.5765, lng: 129.6332, timezone: 'Asia/Shanghai' },
  '佳木斯': { lat: 46.8020, lng: 130.3199, timezone: 'Asia/Shanghai' },

  // 江苏
  '徐州': { lat: 34.2048, lng: 117.2841, timezone: 'Asia/Shanghai' },
  '扬州': { lat: 32.3942, lng: 119.4129, timezone: 'Asia/Shanghai' },
  '镇江': { lat: 32.1878, lng: 119.4258, timezone: 'Asia/Shanghai' },
  '泰州': { lat: 32.4555, lng: 119.9234, timezone: 'Asia/Shanghai' },
  '盐城': { lat: 33.3473, lng: 120.1636, timezone: 'Asia/Shanghai' },
  '连云港': { lat: 34.5967, lng: 119.2216, timezone: 'Asia/Shanghai' },
  '淮安': { lat: 33.6104, lng: 119.0153, timezone: 'Asia/Shanghai' },
  '宿迁': { lat: 33.9630, lng: 118.2752, timezone: 'Asia/Shanghai' },

  // 浙江
  '金华': { lat: 29.0790, lng: 119.6474, timezone: 'Asia/Shanghai' },
  '台州': { lat: 28.6564, lng: 121.4208, timezone: 'Asia/Shanghai' }, // Taizhou, Zhejiang
  '湖州': { lat: 30.8930, lng: 120.0868, timezone: 'Asia/Shanghai' },
  '衢州': { lat: 28.9358, lng: 118.8891, timezone: 'Asia/Shanghai' },
  '丽水': { lat: 28.4676, lng: 119.9228, timezone: 'Asia/Shanghai' },
  '舟山': { lat: 29.9857, lng: 122.2078, timezone: 'Asia/Shanghai' },

  // 安徽
  '芜湖': { lat: 31.3528, lng: 118.4329, timezone: 'Asia/Shanghai' },
  '蚌埠': { lat: 32.9163, lng: 117.3897, timezone: 'Asia/Shanghai' },
  '淮南': { lat: 32.6255, lng: 116.9965, timezone: 'Asia/Shanghai' },
  '马鞍山': { lat: 31.6700, lng: 118.5067, timezone: 'Asia/Shanghai' },
  '安庆': { lat: 30.5351, lng: 117.1159, timezone: 'Asia/Shanghai' },
  '黄山': { lat: 29.7147, lng: 118.3375, timezone: 'Asia/Shanghai' },
  '阜阳': { lat: 32.8901, lng: 115.8142, timezone: 'Asia/Shanghai' },

  // 福建
  '泉州': { lat: 24.8741, lng: 118.6757, timezone: 'Asia/Shanghai' },
  '漳州': { lat: 24.5130, lng: 117.6474, timezone: 'Asia/Shanghai' },
  '莆田': { lat: 25.4541, lng: 119.0076, timezone: 'Asia/Shanghai' },
  '宁德': { lat: 26.6656, lng: 119.5479, timezone: 'Asia/Shanghai' },
  '龙岩': { lat: 25.0751, lng: 117.0179, timezone: 'Asia/Shanghai' },
  '三明': { lat: 26.2634, lng: 117.6386, timezone: 'Asia/Shanghai' },
  '南平': { lat: 26.6418, lng: 118.1777, timezone: 'Asia/Shanghai' },

  // 江西
  '赣州': { lat: 25.8311, lng: 114.9347, timezone: 'Asia/Shanghai' },
  '九江': { lat: 29.7051, lng: 116.0019, timezone: 'Asia/Shanghai' },
  '景德镇': { lat: 29.2690, lng: 117.1782, timezone: 'Asia/Shanghai' },
  '上饶': { lat: 28.4548, lng: 117.9436, timezone: 'Asia/Shanghai' },
  '宜春': { lat: 27.8158, lng: 114.4168, timezone: 'Asia/Shanghai' },

  // 山东
  '烟台': { lat: 37.4638, lng: 121.4479, timezone: 'Asia/Shanghai' },
  '潍坊': { lat: 36.7068, lng: 119.1617, timezone: 'Asia/Shanghai' },
  '淄博': { lat: 36.8135, lng: 118.0550, timezone: 'Asia/Shanghai' },
  '济宁': { lat: 35.4149, lng: 116.5872, timezone: 'Asia/Shanghai' },
  '临沂': { lat: 35.1047, lng: 118.3564, timezone: 'Asia/Shanghai' },
  '威海': { lat: 37.5131, lng: 122.1204, timezone: 'Asia/Shanghai' },
  '日照': { lat: 35.4164, lng: 119.5269, timezone: 'Asia/Shanghai' },
  '泰安': { lat: 36.2002, lng: 117.0870, timezone: 'Asia/Shanghai' },
  '东营': { lat: 37.4341, lng: 118.6747, timezone: 'Asia/Shanghai' },
  '德州': { lat: 37.4353, lng: 116.3575, timezone: 'Asia/Shanghai' },
  '聊城': { lat: 36.4567, lng: 115.9854, timezone: 'Asia/Shanghai' },
  '菏泽': { lat: 35.2338, lng: 115.4807, timezone: 'Asia/Shanghai' },

  // 河南
  '洛阳': { lat: 34.6181, lng: 112.4540, timezone: 'Asia/Shanghai' },
  '开封': { lat: 34.7973, lng: 114.3076, timezone: 'Asia/Shanghai' },
  '南阳': { lat: 32.9908, lng: 112.5283, timezone: 'Asia/Shanghai' },
  '安阳': { lat: 36.0980, lng: 114.3925, timezone: 'Asia/Shanghai' },
  '新乡': { lat: 35.3030, lng: 113.9268, timezone: 'Asia/Shanghai' },
  '许昌': { lat: 34.0355, lng: 113.8526, timezone: 'Asia/Shanghai' },
  '平顶山': { lat: 33.7661, lng: 113.1928, timezone: 'Asia/Shanghai' },
  '焦作': { lat: 35.2159, lng: 113.2418, timezone: 'Asia/Shanghai' },
  '商丘': { lat: 34.4134, lng: 115.6564, timezone: 'Asia/Shanghai' },
  '信阳': { lat: 32.1470, lng: 114.0913, timezone: 'Asia/Shanghai' },

  // 湖北
  '襄阳': { lat: 32.0082, lng: 112.1224, timezone: 'Asia/Shanghai' },
  '荆州': { lat: 30.3352, lng: 112.2419, timezone: 'Asia/Shanghai' },
  '黄石': { lat: 30.2007, lng: 115.0413, timezone: 'Asia/Shanghai' },
  '十堰': { lat: 32.6475, lng: 110.7993, timezone: 'Asia/Shanghai' },
  '孝感': { lat: 30.9168, lng: 113.9553, timezone: 'Asia/Shanghai' },
  '荆门': { lat: 31.0354, lng: 112.1994, timezone: 'Asia/Shanghai' },
  '恩施': { lat: 30.2728, lng: 109.4869, timezone: 'Asia/Shanghai' },

  // 湖南
  '株洲': { lat: 27.8274, lng: 113.1338, timezone: 'Asia/Shanghai' },
  '衡阳': { lat: 26.8968, lng: 112.5725, timezone: 'Asia/Shanghai' },
  '岳阳': { lat: 29.3567, lng: 113.1289, timezone: 'Asia/Shanghai' },
  '常德': { lat: 29.0316, lng: 111.6985, timezone: 'Asia/Shanghai' },
  '张家界': { lat: 29.1170, lng: 110.4792, timezone: 'Asia/Shanghai' },
  '郴州': { lat: 25.7705, lng: 113.0147, timezone: 'Asia/Shanghai' },
  '邵阳': { lat: 27.2389, lng: 111.4693, timezone: 'Asia/Shanghai' },
  '怀化': { lat: 27.5500, lng: 109.9985, timezone: 'Asia/Shanghai' },

  // 广东
  '江门': { lat: 22.5787, lng: 113.0816, timezone: 'Asia/Shanghai' },
  '湛江': { lat: 21.2707, lng: 110.3594, timezone: 'Asia/Shanghai' },
  '茂名': { lat: 21.6628, lng: 110.9254, timezone: 'Asia/Shanghai' },
  '肇庆': { lat: 23.0472, lng: 112.4651, timezone: 'Asia/Shanghai' },
  '韶关': { lat: 24.8104, lng: 113.5975, timezone: 'Asia/Shanghai' },
  '梅州': { lat: 24.2886, lng: 116.1225, timezone: 'Asia/Shanghai' },
  '清远': { lat: 23.6817, lng: 113.0560, timezone: 'Asia/Shanghai' },
  '阳江': { lat: 21.8569, lng: 111.9827, timezone: 'Asia/Shanghai' },
  '潮州': { lat: 23.6569, lng: 116.6226, timezone: 'Asia/Shanghai' },
  '揭阳': { lat: 23.5253, lng: 116.3729, timezone: 'Asia/Shanghai' },

  // 广西
  '桂林': { lat: 25.2736, lng: 110.2902, timezone: 'Asia/Shanghai' },
  '柳州': { lat: 24.3255, lng: 109.4160, timezone: 'Asia/Shanghai' },
  '北海': { lat: 21.4812, lng: 109.1191, timezone: 'Asia/Shanghai' },
  '梧州': { lat: 23.4770, lng: 111.2791, timezone: 'Asia/Shanghai' },
  '玉林': { lat: 22.6366, lng: 110.1653, timezone: 'Asia/Shanghai' },
  '百色': { lat: 23.9040, lng: 106.6163, timezone: 'Asia/Shanghai' },

  // 四川
  '宜宾': { lat: 28.7518, lng: 104.6419, timezone: 'Asia/Shanghai' },
  '南充': { lat: 30.7991, lng: 106.0829, timezone: 'Asia/Shanghai' },
  '泸州': { lat: 28.8724, lng: 105.4423, timezone: 'Asia/Shanghai' },
  '乐山': { lat: 29.5521, lng: 103.7656, timezone: 'Asia/Shanghai' },
  '德阳': { lat: 31.1271, lng: 104.3979, timezone: 'Asia/Shanghai' },
  '攀枝花': { lat: 26.5823, lng: 101.7186, timezone: 'Asia/Shanghai' },
  '达州': { lat: 31.2096, lng: 107.4680, timezone: 'Asia/Shanghai' },
  '广元': { lat: 32.4417, lng: 105.8434, timezone: 'Asia/Shanghai' },
  '西昌': { lat: 27.8964, lng: 102.2631, timezone: 'Asia/Shanghai' },

  // 贵州
  '遵义': { lat: 27.7263, lng: 106.9272, timezone: 'Asia/Shanghai' },
  '六盘水': { lat: 26.5927, lng: 104.8302, timezone: 'Asia/Shanghai' },
  '毕节': { lat: 27.3017, lng: 105.2905, timezone: 'Asia/Shanghai' },
  '安顺': { lat: 26.2531, lng: 105.9476, timezone: 'Asia/Shanghai' },
  '凯里': { lat: 26.5901, lng: 107.9854, timezone: 'Asia/Shanghai' },

  // 云南
  '大理': { lat: 25.6065, lng: 100.2676, timezone: 'Asia/Shanghai' },
  '丽江': { lat: 26.8550, lng: 100.2257, timezone: 'Asia/Shanghai' },
  '景洪': { lat: 22.0017, lng: 100.7979, timezone: 'Asia/Shanghai' }, // 西双版纳
  '曲靖': { lat: 25.4900, lng: 103.7962, timezone: 'Asia/Shanghai' },
  '玉溪': { lat: 24.3520, lng: 102.5439, timezone: 'Asia/Shanghai' },
  '保山': { lat: 25.1118, lng: 99.1618, timezone: 'Asia/Shanghai' },
  '香格里拉': { lat: 27.8269, lng: 99.7072, timezone: 'Asia/Shanghai' },

  // 西藏
  '日喀则': { lat: 29.2675, lng: 88.8849, timezone: 'Asia/Shanghai' },
  '林芝': { lat: 29.6491, lng: 94.3624, timezone: 'Asia/Shanghai' },
  '昌都': { lat: 31.1409, lng: 97.1708, timezone: 'Asia/Shanghai' },
  '那曲': { lat: 31.4760, lng: 92.0522, timezone: 'Asia/Shanghai' },
  '阿里': { lat: 32.5011, lng: 80.1055, timezone: 'Asia/Shanghai' }, // 狮泉河

  // 陕西
  '宝鸡': { lat: 34.3619, lng: 107.2375, timezone: 'Asia/Shanghai' },
  '咸阳': { lat: 34.3296, lng: 108.7090, timezone: 'Asia/Shanghai' },
  '延安': { lat: 36.5854, lng: 109.4897, timezone: 'Asia/Shanghai' },
  '榆林': { lat: 38.2853, lng: 109.7347, timezone: 'Asia/Shanghai' },
  '汉中': { lat: 33.0676, lng: 107.0236, timezone: 'Asia/Shanghai' },
  '安康': { lat: 32.6849, lng: 109.0293, timezone: 'Asia/Shanghai' },

  // 甘肃
  '天水': { lat: 34.5809, lng: 105.7250, timezone: 'Asia/Shanghai' },
  '酒泉': { lat: 39.7324, lng: 98.4945, timezone: 'Asia/Shanghai' },
  '张掖': { lat: 38.9255, lng: 100.4498, timezone: 'Asia/Shanghai' },
  '武威': { lat: 37.9283, lng: 102.6380, timezone: 'Asia/Shanghai' },
  '敦煌': { lat: 40.1421, lng: 94.6620, timezone: 'Asia/Shanghai' },
  '嘉峪关': { lat: 39.8165, lng: 98.2892, timezone: 'Asia/Shanghai' },

  // 青海
  '格尔木': { lat: 36.4024, lng: 94.9033, timezone: 'Asia/Shanghai' },
  '德令哈': { lat: 37.3694, lng: 97.3609, timezone: 'Asia/Shanghai' },
  '玉树': { lat: 33.0058, lng: 97.0133, timezone: 'Asia/Shanghai' },

  // 新疆 (使用 Asia/Urumqi 以反映当地作息，或 Asia/Shanghai 官方时间)
  '喀什': { lat: 39.4704, lng: 75.9898, timezone: 'Asia/Urumqi' },
  '库尔勒': { lat: 41.7641, lng: 86.1453, timezone: 'Asia/Urumqi' },
  '吐鲁番': { lat: 42.9513, lng: 89.1895, timezone: 'Asia/Urumqi' },
  '克拉玛依': { lat: 45.5798, lng: 84.8893, timezone: 'Asia/Urumqi' },
  '伊宁': { lat: 43.9168, lng: 81.3242, timezone: 'Asia/Urumqi' },
  '石河子': { lat: 44.3054, lng: 86.0332, timezone: 'Asia/Urumqi' },
  '哈密': { lat: 42.8185, lng: 93.5151, timezone: 'Asia/Urumqi' },
  '阿克苏': { lat: 41.1688, lng: 80.2606, timezone: 'Asia/Urumqi' },
  '和田': { lat: 37.1142, lng: 79.9222, timezone: 'Asia/Urumqi' },
  '阿勒泰': { lat: 47.8449, lng: 88.1396, timezone: 'Asia/Urumqi' },

  // 台湾
  '台南': { lat: 22.9997, lng: 120.2270, timezone: 'Asia/Taipei' },
  '新竹': { lat: 24.8138, lng: 120.9675, timezone: 'Asia/Taipei' },
  '花莲': { lat: 23.9872, lng: 121.6016, timezone: 'Asia/Taipei' },
  '基隆': { lat: 25.1276, lng: 121.7392, timezone: 'Asia/Taipei' },
  '嘉义': { lat: 23.4801, lng: 120.4491, timezone: 'Asia/Taipei' },
};
