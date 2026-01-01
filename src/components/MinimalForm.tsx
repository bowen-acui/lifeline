import React, { useState, useRef, useEffect } from 'react';
import { lookupCity, LOCATION_DATA, Country, Region, getCityTimezone } from '../lib/CityLookup';

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
    const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
    const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);

    const yearRef = useRef<HTMLInputElement>(null);
    const monthRef = useRef<HTMLInputElement>(null);
    const dayRef = useRef<HTMLInputElement>(null);
    const hourRef = useRef<HTMLInputElement>(null);
    const minuteRef = useRef<HTMLInputElement>(null);
    const countryRef = useRef<HTMLSelectElement>(null);
    const genderRef = useRef<HTMLSelectElement>(null);

    // Initialize default location
    useEffect(() => {
        if (LOCATION_DATA.length > 0) {
             const china = LOCATION_DATA.find(c => c.name === '中国');
             if (china) {
                 setSelectedCountry(china);
                 const beijingRegion = china.regions.find(r => r.cities.includes('北京'));
                 if (beijingRegion) {
                     setSelectedRegion(beijingRegion);
                     setBirthPlace('北京');
                     setLocationStatus({ valid: true, msg: '已定位: 39.90, 116.41 (Asia/Shanghai)' });
                 }
             }
        }
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
        const country = LOCATION_DATA.find(c => c.name === countryName) || null;
        setSelectedCountry(country);
        setSelectedRegion(null);
        setBirthPlace('');
        setLocationStatus(null);
    };

    const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const regionName = e.target.value;
        if (!selectedCountry) return;
        const region = selectedCountry.regions.find(r => r.name === regionName) || null;
        setSelectedRegion(region);
        setBirthPlace('');
        setLocationStatus(null);
    };

    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const city = e.target.value;
        setBirthPlace(city);
        
        const coords = lookupCity(city);
        if (coords) {
             const tz = getCityTimezone(city);
             setLocationStatus({ valid: true, msg: `已定位: ${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)} (${tz})` });
        } else {
             setLocationStatus(null);
        }
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

    const inputBaseClass = "bg-transparent border-b border-ink/20 py-2 px-0 focus:outline-none focus:border-accent transition-colors font-mono text-lg rounded-none text-center";

    return (
        <form onSubmit={handleSubmit} className="space-y-12 py-8">
            <div className="space-y-8">
                <div className="group">
                    <label className="block text-xs font-mono text-ink/40 mb-2 uppercase tracking-widest group-focus-within:text-accent transition-colors">出生时间 (Time of Origin)</label>
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
                    <label htmlFor="birthPlace" className="block text-xs font-mono text-ink/40 mb-2 uppercase tracking-widest group-focus-within:text-accent transition-colors">出生地点 (Coordinates)</label>
                    <div className="flex gap-4">
                        <select 
                            ref={countryRef}
                            value={selectedCountry?.name || ''} 
                            onChange={handleCountryChange}
                            className="minimal-input w-1/3"
                        >
                            <option value="" disabled>选择国家/地区</option>
                            {LOCATION_DATA.map(c => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                        </select>

                        <select 
                            value={selectedRegion?.name || ''} 
                            onChange={handleRegionChange}
                            className="minimal-input w-1/3"
                            disabled={!selectedCountry}
                        >
                            <option value="" disabled>选择省份/区域</option>
                            {selectedCountry?.regions.map(r => (
                                <option key={r.name} value={r.name}>{r.name}</option>
                            ))}
                        </select>

                        <select 
                            value={birthPlace} 
                            onChange={handleCityChange}
                            className="minimal-input w-1/3"
                            disabled={!selectedRegion}
                        >
                            <option value="" disabled>选择城市</option>
                            {selectedRegion?.cities.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    {locationStatus && (
                        <div className={`text-xs mt-2 font-mono ${locationStatus.valid ? 'text-green-600' : 'text-amber-600'}`}>
                            {locationStatus.msg}
                        </div>
                    )}
                </div>

                <div className="group">
                    <div className="flex items-end gap-4">
                        <div className="flex-1">
                            <label htmlFor="gender" className="block text-xs font-mono text-ink/40 mb-2 uppercase tracking-widest group-focus-within:text-accent transition-colors">出生性别 (Gender) *</label>
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
                            <label htmlFor="orientation" className="block text-xs font-mono text-ink/40 mb-2 uppercase tracking-widest group-focus-within:text-accent transition-colors">性取向 (Orientation - Optional)</label>
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
                    <label htmlFor="name" className="block text-xs font-mono text-ink/40 mb-2 uppercase tracking-widest group-focus-within:text-accent transition-colors">姓名 (Identity - Optional)</label>
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