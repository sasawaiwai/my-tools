/**
 * 日付表示システム
 * 
 * 日付表示や曜日の管理、日付操作に関連する機能
 */

const dateSystem = {
    // 現在の日付を取得
    getCurrentDate: function() {
        return new Date();
    },
    
    // 日付をMM-DD形式に変換
    formatDateMMDD: function(date) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}-${day}`;
    },
    
    // 曜日を取得
    getWeekdayName: function(date) {
        const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        return weekdays[date.getDay()];
    },
    
    // 明日の日付を取得
    getNextDay: function(date) {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        return nextDate;
    },
    
    // 昨日の日付を取得
    getPreviousDay: function(date) {
        const prevDate = new Date(date);
        prevDate.setDate(prevDate.getDate() - 1);
        return prevDate;
    },
    
    // date-system.jsに追加
    getDayOfYear: function(date) {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date - start;
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    }

};