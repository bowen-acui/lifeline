import React, { useState } from 'react';

interface MinimalFormProps {
    onSubmit: (data: { date: Date; place: string; name: string }) => void;
}

const MinimalForm = ({ onSubmit }: MinimalFormProps) => {
    const [birthDate, setBirthDate] = useState('');
    const [birthTime, setBirthTime] = useState('');
    const [birthPlace, setBirthPlace] = useState('');
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!birthDate || !birthTime) return;
        
        const date = new Date(`${birthDate}T${birthTime}`);
        onSubmit({ date, place: birthPlace, name });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-12 py-8">
            <div className="space-y-8">
                <div className="group">
                    <label htmlFor="birthDate" className="block text-xs font-mono text-ink/40 mb-2 uppercase tracking-widest group-focus-within:text-accent transition-colors">出生日期 (Date of Origin)</label>
                    <div className="flex gap-4">
                        <input
                            type="date"
                            id="birthDate"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            required
                            className="minimal-input"
                        />
                        <input
                            type="time"
                            value={birthTime}
                            onChange={(e) => setBirthTime(e.target.value)}
                            required
                            className="minimal-input"
                        />
                    </div>
                </div>
                
                <div className="group">
                    <label htmlFor="birthPlace" className="block text-xs font-mono text-ink/40 mb-2 uppercase tracking-widest group-focus-within:text-accent transition-colors">出生地点 (Coordinates)</label>
                    <input
                        type="text"
                        id="birthPlace"
                        value={birthPlace}
                        onChange={(e) => setBirthPlace(e.target.value)}
                        placeholder="例如：北京"
                        className="minimal-input placeholder:text-ink/10"
                    />
                </div>

                <div className="group">
                    <label htmlFor="name" className="block text-xs font-mono text-ink/40 mb-2 uppercase tracking-widest group-focus-within:text-accent transition-colors">姓名 (Identity - Optional)</label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="您的姓名"
                        className="minimal-input placeholder:text-ink/10"
                    />
                </div>
            </div>

            <div className="pt-8 flex justify-end">
                <button type="submit" className="btn-primary group relative overflow-hidden">
                    <span className="relative z-10">生成命盘矩阵</span>
                    <div className="absolute inset-0 bg-accent transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300 ease-out -z-0"></div>
                </button>
            </div>
        </form>
    );
};

export default MinimalForm;