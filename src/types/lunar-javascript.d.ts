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

        getYearGan(): string;
        getYearZhi(): string;
        getMonthGan(): string;
        getMonthZhi(): string;
        getDayGan(): string;
        getDayZhi(): string;
        getTimeGan(): string;
        getTimeZhi(): string;

        getYearHideGan(): string[];
        getMonthHideGan(): string[];
        getDayHideGan(): string[];
        getTimeHideGan(): string[];

        getYun(gender: number): Yun;
    }

    export class Yun {
        getDaYun(): DaYun[];
    }

    export class DaYun {
        getStartYear(): number;
        getEndYear(): number;
        getStartAge(): number;
        getGanZhi(): string;
        getLiuNian(): LiuNian[];
    }

    export class LiuNian {
        getYear(): number;
        getGanZhi(): string;
    }
}
