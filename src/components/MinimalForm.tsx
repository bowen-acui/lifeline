import React, { useState, useRef, useEffect } from 'react';
import { lookupCity, getCityTimezone } from '../lib/CityLookup';
import { FALLBACK_DATA, getFallbackRegions, getFallbackCities, searchCities, getCityCoordinates, getCityCoordinatesFromFallback, GeoCity, COUNTRY_CODES } from '../lib/GeoService';

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

    // Location Select State - 使用备用数据
    const [selectedCountry, setSelectedCountry] = useState<string>('');
    const [selectedRegion, setSelectedRegion] = useState<string>('');
    const [regions, setRegions] = useState<string[]>([]);
    const [cities, setCities] = useState<string[]>([]);
    
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

    // Initialize default location
    useEffect(() => {
        // 默认选中中国
        const defaultCountry = '中国';
        setSelectedCountry(defaultCountry);
        setRegions(getFallbackRegions(defaultCountry));
        
        // 默认选中直辖市 -> 北京
        const defaultRegion = '直辖市';
        setSelectedRegion(defaultRegion);
        setCities(getFallbackCities(defaultCountry, defaultRegion));
        setBirthPlace('北京');
        setLocationStatus({ valid: true, msg: '已定位: 39.90, 116.41 (Asia/Shanghai)' });
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
        const countryName = e.target.value;
        setSelectedCountry(countryName);
        setSelectedRegion('');
        setBirthPlace('');
        setLocationStatus(null);
        
        // 加载该国家的省份
        const regionList = getFallbackRegions(countryName);
        setRegions(regionList);
        setCities([]);
    };

    const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const regionName = e.target.value;
        setSelectedRegion(regionName);
        setBirthPlace('');
        setLocationStatus(null);
        
        // 加载该省份的城市
        const cityList = getFallbackCities(selectedCountry, regionName);
        setCities(cityList);
    };

    const handleCityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const city = e.target.value;
        setBirthPlace(city);
        setLocationStatus({ valid: false, msg: '正在查询坐标...' });
        
        // 1. 先尝试从 city-timezones 查找
        const coords = lookupCity(city);
        if (coords) {
             const tz = getCityTimezone(city);
             setLocationStatus({ valid: true, msg: `已定位: ${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)} (${tz})` });
             return;
        }
        
        // 2. 尝试从备用坐标数据库查找
        const fallbackCoords = getCityCoordinatesFromFallback(city);
        if (fallbackCoords) {
            setLocationStatus({ 
                valid: true, 
                msg: `已定位: ${fallbackCoords.lat.toFixed(2)}, ${fallbackCoords.lng.toFixed(2)} (${fallbackCoords.timezone})` 
            });
            return;
        }
        
        // 3. 尝试从 GeoNames API 查询
        try {
            const countryCode = COUNTRY_CODES[selectedCountry];
            const result = await getCityCoordinates(city, countryCode);
            if (result) {
                setLocationStatus({ 
                    valid: true, 
                    msg: `已定位: ${result.lat.toFixed(2)}, ${result.lng.toFixed(2)} (${result.timezone})` 
                });
            } else {
                setLocationStatus({ valid: false, msg: `未找到 ${city} 的坐标信息` });
            }
        } catch (error) {
            console.error('Failed to get city coordinates:', error);
            setLocationStatus({ valid: false, msg: `查询失败: ${city}` });
        }
    };

    // 搜索城市
    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchError('');
        setSearchResults([]);
        try {
            const results = await searchCities(searchQuery);
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

    // 选中的城市信息（用于显示）
    const [selectedCityDisplay, setSelectedCityDisplay] = useState<string>('');

    const handleSelectSearchResult = (city: GeoCity) => {
        setBirthPlace(city.name);
        // 显示选中的城市信息
        const displayText = `${city.name} (${city.adminName1}, ${city.countryName})`;
        setSelectedCityDisplay(displayText);
        setLocationStatus({ 
            valid: true, 
            msg: `已定位: ${city.lat.toFixed(2)}, ${city.lng.toFixed(2)} (${city.timezone || 'UTC'})` 
        });
        setSearchResults([]);
        setSearchQuery('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!year || !month || !day || !hour || !minute) return;

        if (!gender) {
            alert('请选择性别');
            genderRef.current?.focus();
            return;
        }

        const date = new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hour),
            Number(minute),
            0
        );
        
        if (isNaN(date.getTime())) {
            alert("日期格式无效");
            return;
        }

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
                            onClick={() => {
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
                            {/* 选中的城市显示 */}
                            {selectedCityDisplay && (
                                <div className="font-serif text-lg border-b-2 border-ink/20 py-2 bg-white/60">
                                    {selectedCityDisplay}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (searchError) setSearchError('');
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                                    placeholder="输入城市名搜索（支持中英文）"
                                    className="minimal-input flex-1"
                                />
                                <button
                                    type="button"
                                    onClick={handleSearch}
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
                                value={selectedCountry} 
                                onChange={handleCountryChange}
                                className="minimal-input w-1/3"
                            >
                                <option value="" disabled>选择国家</option>
                                {Object.keys(FALLBACK_DATA).map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>

                            <select 
                                value={selectedRegion} 
                                onChange={handleRegionChange}
                                className="minimal-input w-1/3"
                                disabled={!selectedCountry}
                            >
                                <option value="" disabled>选择省份/地区</option>
                                {regions.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>

                            <select 
                                value={birthPlace} 
                                onChange={handleCityChange}
                                className="minimal-input w-1/3"
                                disabled={!selectedRegion}
                            >
                                <option value="" disabled>选择城市</option>
                                {cities.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    {locationStatus && (
                        <div className={`text-xs mt-2 font-mono px-2 py-1 rounded ${locationStatus.valid ? 'text-green-600 bg-green-50' : 'text-amber-600 bg-amber-50'}`}>
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