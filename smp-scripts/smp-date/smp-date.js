//== code for foo_spider_monkey_panel v1.2.2 or higher ==

window.DefineScript('smp-date',
    {
        version: '1.0.0',
        author: 'tomato111'
    }
);
include(fb.ProfilePath + 'smp-scripts\\common\\lib.js');


//Year  %YYYY% [4 digits]
//Year  %YY% [2]
//Year  %Y%
//Month %MM% [2]
//Month %M%
//Month %ME% [en - full]
//Month %Me% [en - short]
//Month %DD% [2]
//Month %D%

//Hour   %hh% [2]
//Hour   %h%
//Minute %mm% [2]
//Minute %m%
//Second %ss% [2]
//Second %s%

//Weekday %WE% [en - full]
//Weekday %We% [en - short]
//Weekday %WJ% [ja - full]
//Weekday %Wj% [ja - short]


//=======================
//= Properties Object ===
//=======================
const Prop = new function () {

    this.Style = {
        _format: window.GetProperty('Style._format', '%YYYY%-%MM%-%DD% %hh%:%mm%:%ss% (%We%)'),
        Color:
        {
            _0_Default: window.GetProperty('Style.Color._0_Default', 'RGBA(0,0,0,255)'),
            _1_Year: window.GetProperty('Style.Color._1_Year', 'RGBA(0,0,0,255)'),
            _2_Month: window.GetProperty('Style.Color._2_Month', 'RGBA(0,0,0,255)'),
            _3_Day: window.GetProperty('Style.Color._3_Day', 'RGBA(0,0,0,255)'),
            _4_Hour: window.GetProperty('Style.Color._4_Hour', 'RGBA(0,0,0,255)'),
            _5_Minute: window.GetProperty('Style.Color._5_Minute', 'RGBA(0,0,0,255)'),
            _6_Second: window.GetProperty('Style.Color._6_Second', 'RGBA(0,0,0,255)'),
            _7_DayOfWeek: window.GetProperty('Style.Color._7_DayOfWeek', 'RGBA(0,0,0,255)'),
            _8_DayOfWeek_sat: window.GetProperty('Style.Color._8_DayOfWeek_sat', 'RGBA(0,0,200,255)'),
            _9_DayOfWeek_sun: window.GetProperty('Style.Color._9_DayOfWeek_sun', 'RGBA(200,0,0,255)'),
            Background: window.GetProperty('Style.Color.Background', 'RGBA(255,255,255,255)')
        },
        Font_Family: window.GetProperty('Style.Font_Family', 'Arial'),
        Font_Size: window.GetProperty('Style.Font_Size', 14),
        Font_Bold: window.GetProperty('Style.Font_Bold', false)
    };

};

//=======================
//= Global ==============
//=======================

Function.prototype.interval = function (time, ...args) {
    this.clearInterval();
    this.$$interval_timerid$$ = window.SetInterval(() => {
        this(...args);
    }, time);
};

Function.prototype.clearInterval = function () {
    window.ClearInterval(this.$$interval_timerid$$);
};

function RGBA(r, g, b, a) {
    let res = 0xff000000 | (r << 16) | (g << 8) | (b);
    if (a !== undefined) res = (res & 0x00ffffff) | (a << 24);
    return res;
}


//=======================
//= SMP_Date Object =====
//=======================

const SMP_Date = new function () {
    let timer_count, date_now, appliedArr = [],
        font, color = [];

    const timer = function () {
        timer_count++;
        if (date_now.getSeconds() + timer_count === 60) {
            setDate();
            window.Repaint();
        }
        else
            format.isContain_Second && window.Repaint();
    };

    const setDate = function () {
        timer_count = 0;
        date_now = new Date();
        appliedArr = format.applyDate(date_now);
    };

    const format = new ParseFormat(Prop.Style._format);


    this.start = function () {
        const fontfamily = ['Arial', 'Tahoma', 'Meiryo', 'Segoe UI', 'MS Gothic'];
        fontfamily.unshift(Prop.Style.Font_Family);
        for (const name of fontfamily) {
            if (utils.CheckFont(name)) {
                window.SetProperty('Style.Font_Family', Prop.Style.Font_Family = name);
                break;
            }
        }

        font = gdi.Font(Prop.Style.Font_Family, Prop.Style.Font_Size, Number(Prop.Style.Font_Bold));

        for (const name in Prop.Style.Color) {
            color[name] = RGBA(...Prop.Style.Color[name].split(',').map((item) => Number(item.replace(/\D/g, ''))));
        }

        setDate();
        window.Repaint();
        timer.interval(1000);
    };

    this.on_paint = function (gr, x, y) {

        gr.FillSolidRect(-1, -1, window.Width + 2, window.Height + 2, color['Background']);

        for (let i = 0; i < appliedArr.length; i++) {
            const textObj = appliedArr[i];
            let text = textObj.value.toString();
            if (textObj.type === '_6_Second') {
                switch (format.dataArr[i].value) {
                    case '%ss%': text = ('0' + (Number(text) + timer_count)).slice(-2); break;
                    case '%s%': text = (Number(text) + timer_count).toString(); break;
                }
            }

            gr.DrawString(text, font, color[textObj.type], x, y, window.Width, window.Height, 0);
            x += gr.MeasureString(text, font, 0, 0, window.Width, window.Height, 0x00000800).Width; // 0x00000800 means MeasureTrailingSpaces
        }
    };

    // Constructor
    function ParseFormat(formatText) {
        this.dataArr = [];
        this.isContain_Second = false;

        let idx = 0, result;
        const type = { YYYY: '_1_Year', YY: '_1_Year', Y: '_1_Year', MM: '_2_Month', ME: '_2_Month', Me: '_2_Month', M: '_2_Month', DD: '_3_Day', D: '_3_Day', hh: '_4_Hour', h: '_4_Hour', mm: '_5_Minute', m: '_5_Minute', ss: '_6_Second', s: '_6_Second', WJ: '_7_DayOfWeek', Wj: '_7_DayOfWeek', WE: '_7_DayOfWeek', We: '_7_DayOfWeek' };
        const re = /%(?:YYYY|YY|Y|MM|ME|Me|M|DD|D|hh|h|mm|m|ss|s|WJ|Wj|WE|We)%/g;
        while ((result = re.exec(formatText)) !== null) {
            if (idx !== result.index) {
                this.dataArr.push({ value: formatText.substring(idx, result.index), type: '_0_Default' });
            }
            this.dataArr.push({ value: result[0], type: type[result[0].slice(1, -1)] });
            if (this.dataArr[this.dataArr.length - 1].type === '_6_Second')
                this.isContain_Second = true;
            idx = re.lastIndex;
        }
        if (idx !== formatText.length)
            this.dataArr.push({ value: formatText.substring(idx, formatText.length), type: '_0_Default' });
    }
    ParseFormat.prototype.applyDate = function (dateObj) {
        const result = this.dataArr.map((item) => {
            const textObj = { value: item.value, type: item.type };
            switch (item.value) {
                case '%YYYY%': textObj.value = dateObj.getFullYear(); break;
                case '%YY%': textObj.value = dateObj.getFullYear().toString().slice(2); break;
                case '%Y%': textObj.value = Number(dateObj.getFullYear().toString().slice(2)); break;
                case '%MM%': textObj.value = ('0' + (dateObj.getMonth() + 1)).slice(-2); break;
                case '%M%': textObj.value = dateObj.getMonth() + 1; break;
                case '%ME%': textObj.value = monthToString(dateObj.getMonth(), false); break;
                case '%Me%': textObj.value = monthToString(dateObj.getMonth(), true); break;
                case '%DD%': textObj.value = ('0' + dateObj.getDate()).slice(-2); break;
                case '%D%': textObj.value = dateObj.getDate(); break;
                case '%hh%': textObj.value = ('0' + dateObj.getHours()).slice(-2); break;
                case '%h%': textObj.value = dateObj.getHours(); break;
                case '%mm%': textObj.value = ('0' + dateObj.getMinutes()).slice(-2); break;
                case '%m%': textObj.value = dateObj.getMinutes(); break;
                case '%ss%': textObj.value = ('0' + dateObj.getSeconds()).slice(-2); break;
                case '%s%': textObj.value = dateObj.getSeconds(); break;
                case '%WE%': textObj.value = dayToString(dateObj.getDay(), false, 'en'); textObj.type = getDayColor(dateObj.getDay()); break;
                case '%We%': textObj.value = dayToString(dateObj.getDay(), true, 'en'); textObj.type = getDayColor(dateObj.getDay()); break;
                case '%WJ%': textObj.value = dayToString(dateObj.getDay(), false, 'ja'); textObj.type = getDayColor(dateObj.getDay()); break;
                case '%Wj%': textObj.value = dayToString(dateObj.getDay(), true, 'ja'); textObj.type = getDayColor(dateObj.getDay()); break;
            }
            return textObj;
        });

        function monthToString(num, shorter) {
            if (shorter)
                return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][num];
            else
                return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][num];
        }

        function dayToString(num, shorter, lang) {
            if (shorter)
                switch (lang) {
                    case 'en': return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][num];
                    case 'ja': return ['日', '月', '火', '水', '木', '金', '土'][num];
                }
            else
                switch (lang) {
                    case 'en': return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][num];
                    case 'ja': return ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][num];
                }
        }

        function getDayColor(num, i) {
            if (num === 0)
                return '_9_DayOfWeek_sun';
            else if (num === 6)
                return '_8_DayOfWeek_sat';
            else
                return '_7_DayOfWeek';
        }

        return result;
    };
    // End Constructor 

    this.start();
}();


//========================
//= Callback Function ====
//========================
function on_paint(gr) {
    gr.SetTextRenderingHint(5);
    SMP_Date.on_paint(gr, 4, 4);
}

//EOF