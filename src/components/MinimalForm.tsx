import React, { useState, useRef, useEffect } from 'react';
import { lookupCity, getCityTimezone } from '../lib/CityLookup';
import { FALLBACK_DATA, fetchCountries, fetchRegions, fetchCities, getCityDetails, getFallbackRegions, getFallbackCities, searchCities, getCityCoordinates, getCityCoordinatesFromFallback, GeoCity, GeoCountry, GeoRegion, COUNTRY_CODES } from '../lib/GeoService';
import { trackEvent } from '../lib/Tracking';

interface MinimalFormProps {
    onSubmit: (data: { date: Date; place: string; name: string; gender: '男' | '女'; orientation?: string }) => void;
}

const MinimalForm = ({ onSubmit }: MinimalFormProps) => {
    const [year, setYear] = useState('');
    const [month, setMonth] = useState('');
    const [day, setDay] = useState('');
    const [hour, setHour] = useState('');
    const [minute, setMinute] = useState('');
    
    const [birthPlace, setBirthPlace] = useState('');
    const [name, setName] = useState('');
    const [gender, setGender] = useState<'' | '男' | '女'>('');
    const [orientation, setOrientation] = useState('');
    const [locationStatus, setLocationStatus] = useState<{valid: boolean, msg: string} | null>(null);

    // Location Select State
    const [selectedCountryCode, setSelectedCountryCode] = useState<string>('');
    const [selectedRegion, setSelectedRegion] = useState<string>('');
    const [regions, setRegions] = useState<GeoRegion[]>([]);
    const [cities, setCities] = useState<GeoCity[]>([]);
    const [countries, setCountries] = useState<GeoCountry[]>([]);
    const [dataMode, setDataMode] = useState<'api' | 'fallback'>('api');
    const [isCountriesLoading, setIsCountriesLoading] = useState(false);
    const [isRegionsLoading, setIsRegionsLoading] = useState(false);
    const [isCitiesLoading, setIsCitiesLoading] = useState(false);
    
    // 搜索模式
    const [useSearchMode, setUseSearchMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<GeoCity[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string>('');

    const yearRef = useRef<HTMLInputElement>(null);
    const monthRef = useRef<HTMLInputElement>(null);
    const dayRef = useRef<HTMLInputElement>(null);
    const hourRef = useRef<HTMLInputElement>(null);
    const minuteRef = useRef<HTMLInputElement>(null);
    const countryRef = useRef<HTMLSelectElement>(null);
    const genderRef = useRef<HTMLSelectElement>(null);
    const submitButtonRef = useRef<HTMLButtonElement>(null);

    const getFallbackCountryName = (countryCode: string) => {
        if (!countryCode) return '';
        const entry = Object.entries(COUNTRY_CODES).find(([, code]) => code === countryCode);
        return entry?.[0] ?? countryCode;
    };

    const fallbackCountryOptions = Object.keys(FALLBACK_DATA)
        .map((name) => ({
            name,
            code: COUNTRY_CODES[name] ?? name,
        }))
        .filter((item) => item.code);

    const loadFallbackRegions = (countryCode: string) => {
        const fallbackCountryName = getFallbackCountryName(countryCode);
        const regionList = getFallbackRegions(fallbackCountryName);
        setRegions(regionList.map((name) => ({ name, geonameId: 0 })));
    };

    const loadFallbackCities = (countryCode: string, regionName: string) => {
        const fallbackCountryName = getFallbackCountryName(countryCode);
        const cityList = getFallbackCities(fallbackCountryName, regionName);
        setCities(cityList.map((name) => {
            const coords = getCityCoordinatesFromFallback(name);
            return {
                name,
                adminName1: regionName,
                countryName: fallbackCountryName,
                lat: coords?.lat ?? 0,
                lng: coords?.lng ?? 0,
                timezone: coords?.timezone ?? 'UTC',
            };
        }));
    };

    const loadRegions = async (countryCode: string) => {
        setIsRegionsLoading(true);
        setRegions([]);
        setSelectedRegion('');
        setCities([]);
        setBirthPlace('');
        setLocationStatus(null);

        if (dataMode === 'fallback') {
            loadFallbackRegions(countryCode);
            setIsRegionsLoading(false);
            return;
        }

        const regionList = await fetchRegions(countryCode, countryCode === 'CN' ? 'zh' : undefined);
        setRegions(regionList);
        setIsRegionsLoading(false);

        if (regionList.length === 0) {
            setLocationStatus({ valid: false, msg: '未找到该国家的地区列表，请使用搜索兜底' });
        }
    };

    const loadCities = async (regionName: string) => {
        setIsCitiesLoading(true);
        setCities([]);
        setBirthPlace('');
        setLocationStatus(null);

        if (dataMode === 'fallback') {
            loadFallbackCities(selectedCountryCode, regionName);
            setIsCitiesLoading(false);
            return;
        }

        const region = regions.find((r) => r.name === regionName);
        if (!region?.geonameId) {
            setIsCitiesLoading(false);
            setLocationStatus({ valid: false, msg: '未找到该地区的城市列表，请使用搜索兜底' });
            return;
        }

        const cityList = await fetchCities(region.geonameId, selectedCountryCode === 'CN' ? 'zh' : undefined);
        setCities(cityList);
        setIsCitiesLoading(false);

        if (cityList.length === 0) {
            setLocationStatus({ valid: false, msg: '未找到该地区的城市列表，请使用搜索兜底' });
        }
    };

    // Initialize default location
    useEffect(() => {
        const initializeLocation = async () => {
            setIsCountriesLoading(true);
            const apiCountries = await fetchCountries('zh');
            setIsCountriesLoading(false);

            if (apiCountries.length > 0) {
                setCountries(apiCountries);
                setDataMode('api');
                const defaultCountryCode = 'CN';
                const availableDefault = apiCountries.find((c) => c.code === defaultCountryCode);
                const initialCountryCode = availableDefault?.code ?? apiCountries[0]?.code ?? '';
                setSelectedCountryCode(initialCountryCode);
                void loadRegions(initialCountryCode);
                return;
            }

            setDataMode('fallback');
            const fallbackCountryCode = COUNTRY_CODES['中国'] ?? 'CN';
            setSelectedCountryCode(fallbackCountryCode);
            loadFallbackRegions(fallbackCountryCode);

            const defaultRegion = '直辖市';
            setSelectedRegion(defaultRegion);
            loadFallbackCities(fallbackCountryCode, defaultRegion);
            setBirthPlace('北京');
            setLocationStatus({ valid: true, msg: '已定位: 39.90, 116.41 (Asia/Shanghai)' });
        };

        void initializeLocation();
    }, []);

    const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val.length <= 4) setYear(val);
        if (val.length === 4) monthRef.current?.focus();
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val.length <= 2) setMonth(val);
        if (val.length === 2) dayRef.current?.focus();
    };

    const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val.length <= 2) setDay(val);
        if (val.length === 2) hourRef.current?.focus();
    };

    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val.length <= 2) setHour(val);
        if (val.length === 2) minuteRef.current?.focus();
    };

    const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val.length <= 2) setMinute(val);
        if (val.length === 2) countryRef.current?.focus();
    };

    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const countryCode = e.target.value;
        setSelectedCountryCode(countryCode);
        setSelectedRegion('');
        setBirthPlace('');
        setLocationStatus(null);
        setSearchResults([]);
        setSearchError('');

        if (dataMode === 'fallback') {
            loadFallbackRegions(countryCode);
            setCities([]);
            return;
        }

        void loadRegions(countryCode);
    };

    const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const regionName = e.target.value;
        setSelectedRegion(regionName);
        setBirthPlace('');
        setLocationStatus(null);

        void loadCities(regionName);
    };

    const handleCityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const cityName = e.target.value;
        setBirthPlace(cityName);
        setLocationStatus({ valid: false, msg: '正在查询坐标...' });

        if (dataMode === 'api') {
            const selectedCity = cities.find((city) => city.name === cityName);
            if (selectedCity) {
                let timezone = selectedCity.timezone;
                if (!timezone || timezone === 'UTC') {
                    const details = await getCityDetails(selectedCity.lat, selectedCity.lng);
                    timezone = details?.timezone ?? timezone ?? 'UTC';
                }
                setLocationStatus({ 
                    valid: true, 
                    msg: `已定位: ${selectedCity.lat.toFixed(2)}, ${selectedCity.lng.toFixed(2)} (${timezone})` 
                });
                return;
            }
        }

        // 备用模式：先尝试从 city-timezones 查找
        const coords = lookupCity(cityName);
        if (coords) {
            const tz = getCityTimezone(cityName);
            setLocationStatus({ valid: true, msg: `已定位: ${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)} (${tz})` });
            return;
        }

        // 尝试从备用坐标数据库查找
        const fallbackCoords = getCityCoordinatesFromFallback(cityName);
        if (fallbackCoords) {
            setLocationStatus({ 
                valid: true, 
                msg: `已定位: ${fallbackCoords.lat.toFixed(2)}, ${fallbackCoords.lng.toFixed(2)} (${fallbackCoords.timezone})` 
            });
            return;
        }

        // 尝试从 GeoNames API 查询
        try {
            const countryCode = selectedCountryCode || undefined;
            const result = await getCityCoordinates(cityName, countryCode);
            if (result) {
                setLocationStatus({ 
                    valid: true, 
                    msg: `已定位: ${result.lat.toFixed(2)}, ${result.lng.toFixed(2)} (${result.timezone})` 
                });
            } else {
                setLocationStatus({ valid: false, msg: `未找到 ${cityName} 的坐标信息` });
            }
        } catch (error) {
            console.error('Failed to get city coordinates:', error);
            setLocationStatus({ valid: false, msg: `查询失败: ${cityName}` });
        }
    };

    // 搜索城市
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchError('');
        setSearchResults([]);
        try {
            const results = await searchCities(searchQuery, selectedCountryCode || undefined);
            if (results.length === 0) {
                setSearchError('未找到匹配的城市，请尝试其他关键词');
            } else {
                setSearchResults(results);
            }
        } catch (error) {
            console.error('Search failed:', error);
            setSearchError('搜索失败，请检查网络连接或稍后重试');
        }
        setIsSearching(false);
    };

    const handleSelectSearchResult = (city: GeoCity) => {
        setBirthPlace(city.name);
        // 显示选中的城市信息
        const displayText = `${city.name} (${city.adminName1}, ${city.countryName})`;
        setSearchQuery(displayText);
        setLocationStatus({ 
            valid: true, 
            msg: `已定位: ${city.lat.toFixed(2)}, ${city.lng.toFixed(2)} (${city.timezone || 'UTC'})` 
        });
        setSearchResults([]);
        void trackEvent({
            eventName: 'select_city_result',
            eventType: 'select',
            page: 'input',
            component: 'MinimalForm',
            metadata: {
                city: city.name,
                region: city.adminName1,
                country: city.countryName,
            },
        });
    };

    const isValidDate = (y: number, m: number, d: number, h: number, min: number) => {
        if (y < 1900 || y > new Date().getFullYear()) return false;
        if (m < 1 || m > 12) return false;
        if (h < 0 || h > 23) return false;
        if (min < 0 || min > 59) return false;
        const date = new Date(y, m - 1, d, h, min, 0);
        return (
            date.getFullYear() === y &&
            date.getMonth() === m - 1 &&
            date.getDate() === d &&
            date.getHours() === h &&
            date.getMinutes() === min
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!year || !month || !day || !hour || !minute) return;

        if (!gender) {
            alert('请选择性别');
            genderRef.current?.focus();
            return;
        }

        const y = Number(year);
        const m = Number(month);
        const d = Number(day);
        const h = Number(hour);
        const min = Number(minute);

        if (!isValidDate(y, m, d, h, min)) {
            alert('生日时间无效，请检查年月日时分范围');
            return;
        }

        const date = new Date(y, m - 1, d, h, min, 0);

        void trackEvent({
            eventName: 'generate_chart_matrix',
            eventType: 'submit',
            page: 'input',
            component: 'MinimalForm',
            element: submitButtonRef.current ?? e.currentTarget,
            metadata: {
                hasName: Boolean(name.trim()),
                hasOrientation: Boolean(orientation.trim()),
                hasSearchMode: useSearchMode,
            },
        });

        onSubmit({
            date,
            place: birthPlace || '北京',
            name,
            gender,
            orientation: orientation.trim() ? orientation.trim() : undefined,
        });
    };

    const inputBaseClass = "bg-transparent border-b-2 border-ink/20 py-2 px-0 focus:outline-none focus:border-accent transition-all font-mono text-lg rounded-none text-center hover:border-ink/30";

    return (
        <form onSubmit={handleSubmit} className="space-y-12 py-8 px-6">
            <div className="space-y-8">
                <div className="group">
                    <label className="block text-xs font-serif text-ink/40 mb-3 uppercase tracking-widest group-focus-within:text-accent transition-colors">出生时间 (Time of Origin)</label>
                    <div className="flex flex-wrap gap-2 items-center">
                        <input
                            ref={yearRef}
                            type="text"
                            value={year}
                            onChange={handleYearChange}
                            placeholder="YYYY"
                            className={`${inputBaseClass} w-20`}
                            maxLength={4}
                        />
                        <span className="text-ink/40">/</span>
                        <input
                            ref={monthRef}
                            type="text"
                            value={month}
                            onChange={handleMonthChange}
                            placeholder="MM"
                            className={`${inputBaseClass} w-12`}
                            maxLength={2}
                        />
                        <span className="text-ink/40">/</span>
                        <input
                            ref={dayRef}
                            type="text"
                            value={day}
                            onChange={handleDayChange}
                            placeholder="DD"
                            className={`${inputBaseClass} w-12`}
                            maxLength={2}
                        />
                        <span className="text-ink/40 ml-2">@</span>
                        <input
                            ref={hourRef}
                            type="text"
                            value={hour}
                            onChange={handleHourChange}
                            placeholder="HH"
                            className={`${inputBaseClass} w-12`}
                            maxLength={2}
                        />
                        <span className="text-ink/40">:</span>
                        <input
                            ref={minuteRef}
                            type="text"
                            value={minute}
                            onChange={handleMinuteChange}
                            placeholder="mm"
                            className={`${inputBaseClass} w-12`}
                            maxLength={2}
                        />
                    </div>
                </div>
                
                <div className="group">
                    <div className="flex items-center justify-between mb-3">
                        <label htmlFor="birthPlace" className="block text-xs font-serif text-ink/40 uppercase tracking-widest group-focus-within:text-accent transition-colors">出生地点 (Coordinates)</label>
                        <button 
                            type="button"
                            onClick={(e) => {
                                const nextMode = !useSearchMode;
                                void trackEvent({
                                    eventName: 'toggle_city_search',
                                    eventType: 'click',
                                    page: 'input',
                                    component: 'MinimalForm',
                                    element: e.currentTarget,
                                    metadata: {
                                        nextMode: nextMode ? 'search' : 'select',
                                    },
                                });
                                setUseSearchMode(!useSearchMode);
                                setSearchError('');
                                setSearchResults([]);
                            }}
                            className="text-xs text-accent hover:text-accent/80 font-mono px-2 py-1 bg-accent/5 hover:bg-accent/10 transition-all"
                        >
                            {useSearchMode ? '← 返回选择' : '搜索城市 →'}
                        </button>
                    </div>
                    
                    {useSearchMode ? (
                        // 搜索模式
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (searchError) setSearchError('');
                                        if (searchResults.length > 0) setSearchResults([]);
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                                    placeholder="输入城市名搜索（支持中英文）"
                                    className="minimal-input flex-1"
                                />
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        void trackEvent({
                                            eventName: 'search_city',
                                            eventType: 'search',
                                            page: 'input',
                                            component: 'MinimalForm',
                                            element: e.currentTarget,
                                            metadata: {
                                                query: searchQuery.trim(),
                                            },
                                        });
                                        handleSearch();
                                    }}
                                    disabled={isSearching}
                                    className="px-4 py-2 bg-paper border border-ink/20 text-xs font-mono hover:border-accent transition-all disabled:opacity-50"
                                >
                                    {isSearching ? '搜索中...' : '搜索'}
                                </button>
                            </div>
                            {searchError && (
                                <div className="text-xs text-amber-600 font-mono">
                                    {searchError}
                                </div>
                            )}
                            {searchResults.length > 0 && (
                                <div className="bg-paper border border-ink/10 max-h-48 overflow-y-auto">
                                    {searchResults.map((city, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleSelectSearchResult(city)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent/10 transition-colors border-b border-ink/5 last:border-0"
                                        >
                                            <span className="font-medium">{city.name}</span>
                                            <span className="text-ink/40 ml-2 text-xs">{city.adminName1}, {city.countryName}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        // 下拉选择模式
                        <div className="flex gap-4">
                            <select 
                                ref={countryRef}
                                value={selectedCountryCode} 
                                onChange={handleCountryChange}
                                className="minimal-input w-1/3"
                                disabled={isCountriesLoading}
                            >
                                <option value="" disabled>{isCountriesLoading ? '国家加载中...' : '选择国家'}</option>
                                {(dataMode === 'api' ? countries : fallbackCountryOptions).map((country) => (
                                    <option key={country.code} value={country.code}>
                                        {country.name}
                                    </option>
                                ))}
                            </select>

                            <select 
                                value={selectedRegion} 
                                onChange={handleRegionChange}
                                className="minimal-input w-1/3"
                                disabled={!selectedCountryCode || isRegionsLoading}
                            >
                                <option value="" disabled>{isRegionsLoading ? '地区加载中...' : '选择省份/地区'}</option>
                                {regions.map((region) => (
                                    <option key={`${region.name}-${region.geonameId}`} value={region.name}>
                                        {region.name}
                                    </option>
                                ))}
                            </select>

                            <select 
                                value={birthPlace} 
                                onChange={handleCityChange}
                                className="minimal-input w-1/3"
                                disabled={!selectedRegion || isCitiesLoading}
                            >
                                <option value="" disabled>{isCitiesLoading ? '城市加载中...' : '选择城市'}</option>
                                {cities.map((city) => (
                                    <option key={`${city.name}-${city.lat}-${city.lng}`} value={city.name}>
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    {locationStatus && (
                        <div className={`text-xs mt-2 font-mono px-2 py-1 rounded ${locationStatus.valid ? 'text-green-600' : 'text-amber-600 bg-amber-50'}`}>
                            {locationStatus.msg}
                        </div>
                    )}
                </div>

                <div className="group">
                    <div className="flex items-end gap-4">
                        <div className="flex-1">
                            <label htmlFor="gender" className="block text-xs font-serif text-ink/40 mb-2 uppercase tracking-widest group-focus-within:text-accent transition-colors">出生性别 (Gender) *</label>
                            <select
                                ref={genderRef}
                                id="gender"
                                value={gender}
                                onChange={(e) => setGender(e.target.value as '' | '男' | '女')}
                                className="minimal-input w-full"
                                required
                            >
                                <option value="" disabled>请选择</option>
                                <option value="女">女</option>
                                <option value="男">男</option>
                            </select>
                        </div>

                        <div className="flex-1">
                            <label htmlFor="orientation" className="block text-xs font-serif text-ink/40 mb-2 uppercase tracking-widest group-focus-within:text-accent transition-colors">性取向 (Orientation - Optional)</label>
                            <select
                                id="orientation"
                                value={orientation}
                                onChange={(e) => setOrientation(e.target.value)}
                                className="minimal-input w-full"
                            >
                                <option value="">不填/不确定/不透露</option>
                                <option value="异性恋">异性恋</option>
                                <option value="同性恋">同性恋</option>
                                <option value="双性恋">双性恋</option>
                                <option value="泛性恋">泛性恋</option>
                                <option value="无性恋">无性恋</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="group">
                    <label htmlFor="name" className="block text-xs font-serif text-ink/40 mb-2 uppercase tracking-widest group-focus-within:text-accent transition-colors">姓名 (Identity - Optional)</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="您的姓名"
                        className="minimal-input placeholder:text-ink/10 w-full"
                    />
                </div>
            </div>

            <div className="pt-8 flex justify-end">
                <button
                    type="submit"
                    disabled={!year || !month || !day || !hour || !minute || !gender}
                    ref={submitButtonRef}
                    className="btn-primary group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <span className="relative z-10">生成命盘矩阵</span>
                    <div className="absolute inset-0 bg-accent transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300 ease-out -z-0"></div>
                </button>
            </div>
        </form>
    );
};

export default MinimalForm;