declare module 'lunar-javascript' {
    export class Solar {
        static fromDate(date: Date): Solar;
        static fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): Solar;
        getLunar(): Lunar;
    }

    export class Lunar {
        static fromDate(date: Date): Lunar;
        getEightChar(): EightChar;
        toString(): string;
    }

    export class EightChar {
        getYear(): string;
        getMonth(): string;
        getDay(): string;
        getTime(): string;
        getYearWuXing(): string;
        getMonthWuXing(): string;
        getDayWuXing(): string;
        getTimeWuXing(): string;
        getMingGong(): string;
    }
}
