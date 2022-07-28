//== code for foo_spider_monkey_panel v1.2.2 or higher ==

window.DefinePanel('smp-cover',
    {
        version: '1.1.1',
        author: 'tomato111',
        features: { drag_n_drop: true }
    }
);
include(fb.ProfilePath + 'smp-scripts\\common\\lib.js');


const fs = new ActiveXObject('Scripting.FileSystemObject'); // File System Object
const ws = new ActiveXObject('WScript.Shell'); // WScript Shell Object
const scriptName = 'smp-cover';
const scriptDir = fb.ProfilePath + 'smp-scripts\\smp-cover\\';
const MF_SEPARATOR = 0x00000800;
const MF_STRING = 0x00000000;
const MF_GRAYED = 0x00000001;
const MF_CHECKED = 0x00000008;
const MF_UNCHECKED = 0x00000000;
const VK_SHIFT = 0x10;
const VK_CONTROL = 0x11;
const VK_ALT = 0x12;

let ww, wh;
let isDragging = false;


//=======================
//= Properties Object ===
//=======================
const Prop = new function () {

    const allowedValue = (val, type, min, max, def) => {
        if (typeof val !== type)
            val = def;
        else if (type === "number") {
            if (val < min)
                val = min;
            else if (val > max)
                val = max;
        }
        else if (type === "string") {
            if (!val)
                val = def;
        }
        return val;
    };

    //==Panel====
    this.Panel = {
        Path: window.GetProperty('Panel.Path', '<front>||<back>||$directory_path(%path%)\\*.*'), // Separate paths by "||"
        FollowCursor: window.GetProperty('Panel.FollowCursor', 1), // 0: Never, 1: When not playing, 2: Always
        Lang: window.GetProperty('Panel.Language', '').toLowerCase(),
        ViewerPath: window.GetProperty('Panel.ViewerPath', ''),
        HideConf: window.GetProperty('Panel.HideConfigureMenu', false),
        BackgroundColor: window.GetProperty('Panel.BackgroundColor', 'RGBA(0,0,0,255)'),
        DragDropToPlaylist: window.GetProperty('Panel.DragDropToPlaylist', 'Dropped Items'), // Add dropped items to playlist. TitleFormatting is available
        ExcludeFileName: window.GetProperty('Panel.ExcludeFileName', '').split('||').map(name => name.toLowerCase()), // Separate paths by "||"
        FilerCommand: window.GetProperty('Panel.FilerCommand', '')
    };

    window.SetProperty('Panel.FollowCursor', this.Panel.FollowCursor = allowedValue(this.Panel.FollowCursor, 'number', 0, 2, 1));

    if (/^RGBA\(.+?\)$/.test(this.Panel.BackgroundColor))
        this.Panel.BackgroundColor = eval(RegExp.lastMatch);


    //==Cycle====
    this.Cycle = {
        Pause: window.GetProperty('Cycle.Pause', false),
        Interval: window.GetProperty('Cycle.Interval', 10000),
        AutoPauseWhenFollowCursor: window.GetProperty('Cycle.AutoPauseWhenFollowCursor', true),
        Animation: {
            Duration: window.GetProperty('Cycle.Animation.Duration', 400)
        },
        Shuffle: window.GetProperty('Cycle.Shuffle', 0) // 0: Disable, 1...: shuffle on and after {num}
    };

    window.SetProperty('Cycle.Interval', this.Cycle.Interval = allowedValue(this.Cycle.Interval, 'number', 2000, Infinity, 10000));
    window.SetProperty('Cycle.Animation.Duration', this.Cycle.Animation.Duration = allowedValue(this.Cycle.Animation.Duration, 'number', 100, this.Cycle.Interval, 400));
    window.SetProperty('Cycle.Shuffle', this.Cycle.Shuffle = allowedValue(this.Cycle.Shuffle, 'number', 0, Infinity, 0));


    //==Image====
    this.Image = {
        NoCoverPath: window.GetProperty('Image.NoCoverPath', ''),
        Stretch: window.GetProperty('Image.Stretch', false),
        Margin: window.GetProperty('Image.Margin', '6,6,6,6'), // Margin between Panel and Image
        SubstitutedPath: window.GetProperty('Image.SubstitutedPath', ''), // Open substituted path when do 'View With External Viewer' on embed cover
        AlignLeft: window.GetProperty('Image.AlignLeft', false),
        AlignBottom: window.GetProperty('Image.AlignBottom', false),
        Case: {
            Enable: window.GetProperty('Image.Case.Enable', true),
            AdjustSize: window.GetProperty('Image.Case.AdjustSize', '4,4,4,4'), // Relative with cover image. Separate with comma, like "5,5,5,5". (left,up,right,down)
            Path: window.GetProperty('Image.Case.Path', ''),
            FixedSizeMode: window.GetProperty('Image.Case.FixedSizeMode', false),
            FixedSize: window.GetProperty('Image.Case.FixedSize', '0,0,ww,wh') // Separate with comma, like "0,0,200,150". (x,y,w,h)
        },
        Reflect: {
            Enable: window.GetProperty('Image.Reflect.Enable', true),
            Ratio: window.GetProperty('Image.Reflect.Ratio', 0.15),
            Distance: window.GetProperty('Image.Reflect.Distance', 6)
        }
    };

    if (!this.Image.Margin)
        window.SetProperty('Image.Margin', this.Image.Margin = '6,6,6,6');
    if (!this.Image.Case.AdjustSize)
        window.SetProperty('Image.Case.AdjustSize', this.Image.Case.AdjustSize = '0,0,0,0');
    if (!this.Image.Case.FixedSize)
        window.SetProperty('Image.Case.FixedSize', this.Image.Case.FixedSize = '0,0,ww,wh');
    window.SetProperty('Image.Reflect.Ratio', this.Image.Reflect.Ratio = allowedValue(this.Image.Reflect.Ratio, 'number', 0.05, 0.50, 0.15));
    window.SetProperty('Image.Reflect.Distance', this.Image.Reflect.Distance = allowedValue(this.Image.Reflect.Distance, 'number', 0, Infinity, 6));

    if (this.Image.Case.Path && !/^[a-z]:\\./i.test(this.Image.Case.Path))
        this.Image.Case.Path = fb.ProfilePath + this.Image.Case.Path;
};


//=======================
//= Load Language =======
//=======================

const Lang = {

    Messages: {},
    Label: {},

    load: function (path) {

        const languages = utils.Glob(path + '*.ini');
        const definedLang = languages.map((item) => fs.GetBaseName(item));

        if (!Prop.Panel.Lang || !definedLang.includes(Prop.Panel.Lang)) {
            let lang = prompt(`Please input menu language.\n"${definedLang.join('", "')}" is available.`, scriptName, 'en');
            if (!definedLang.includes(lang))
                lang = 'en';
            window.SetProperty('Panel.Language', Prop.Panel.Lang = lang);
        }

        const defaultIni = new Ini(path + 'default', 'UTF-8');
        const langIni = new Ini(path + Prop.Panel.Lang + '.ini', 'UTF-8');

        if (!defaultIni.items.get('Message') || !defaultIni.items.get('Label'))
            throw new Error(`Faild to load default language file. (${scriptName})`);


        ((def, lang) => {
            let tmp0 = def.get('Message') || new Map();
            let tmp1 = lang.get('Message') || new Map();
            const typelist = { conf: 36, warn: 48, info: 64 };

            for (const [name, value] of tmp0) {
                const _type = name.split('_')[0].toLowerCase();
                this.Messages[name] = new Message(tmp1.get(name) || value, scriptName, typelist[_type] || 0);
            }

            tmp0 = def.get('Label') || new Map();
            tmp1 = lang.get('Label') || new Map();

            for (const [name, value] of tmp0) {
                this.Label[name] = tmp1.get(name) || value;
            }

        })(defaultIni.items, langIni.items);

    }
};

Lang.load(scriptDir + 'languages\\');


//========================
//= Define Image Loader ==
//========================
const ImageLoader = new function () {

    const ImgsCacheCapacity = 30;
    const ImgsCache = [];

    ImgsCache.Store = function (path, img, reflImg) {
        this.unshift({ path, img, reflImg });
        this.length = Math.min(this.length, ImgsCacheCapacity);
    };
    ImgsCache.SearchFor = function (path, noCache) {
        let result;
        this.some((item, idx) => {
            if (item.path === path) {
                result = this.splice(idx, 1).pop();
                return true;
            }
        });
        result && !noCache && this.unshift(result); // Reposition forward
        return !noCache && result;
    };

    const createReflImg = (img, ratio_applied_h) => {
        img = rotateImg(img, 6);

        const h = ratio_applied_h / (1 - Prop.Image.Reflect.Ratio);
        const reflH = h - ratio_applied_h;
        img = img.Clone(0, 0, img.Width, Math.min(reflH, img.Height));

        const maskImg = gdi.CreateImage(img.Width, img.Height);
        const gr = maskImg.GetGraphics();
        gr.FillGradRect(0, 0, maskImg.Width, maskImg.Height, 90, RGBA(144, 144, 144), RGBA(255, 255, 255), 1.0);
        maskImg.ReleaseGraphics(gr);

        img.ApplyMask(maskImg);
        return img;
    };


    this.getImg = function (path, dstW, dstH, noCache) {
        if (!path) return;

        const artIdRE = [/>front>$/, />back>$/, />disc>$/, />icon>$/, />artist>$/];
        let result = ImgsCache.SearchFor(path, noCache);
        let img, reflImg;

        if (!result) {
            if (path.startsWith('<')) { // Embed image
                const art_id = artIdRE.findIndex((re) => re.test(path));
                img = utils.GetAlbumArtEmbedded(path.match(/^<(.+?)>/)[1], Math.max(art_id, 0));
            }
            else
                img = gdi.Image(path);


            if (img) {
                if (dstW && dstH) { // キャッシュに格納する前にリサイズ
                    const size = calcImgSize(img, dstW, dstH, Prop.Image.Stretch);
                    img = img.Resize(size.width, size.height, 7);
                }
                if (Prop.Image.Reflect.Enable)
                    reflImg = createReflImg(img, dstH);
                result = { path, img, reflImg };
                ImgsCache.Store(path, img, reflImg);
            }
        }

        return result;
    };

    this.clearCache = function () {
        ImgsCache.length = 0;
    };

}();


//========================
//= Define Path Checker ==
//========================
const PathChecker = new function () {

    const PathCacheCapacity = 100;
    const PathsCache = [];

    PathsCache.Store = function (path, files) {
        this.unshift({ path, files });
        this.length = Math.min(this.length, PathCacheCapacity);
    };
    PathsCache.SearchFor = function (path) {
        let result = {};
        this.some((item, index) => {
            if (item.path === path) {
                result = this.splice(index, 1).pop();
                return true;
            }
        });
        this.unshift(result); // Reposition forward
        return result.files || [];
    };

    const isSupportedType = (path) => ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(path.split('.').pop().toLowerCase());

    const parsePathFormat = (format, metadb) => {
        const artIdRE = [/<(?=front>)/gi, /<(?=back>)/gi, /<(?=disc>)/gi, /<(?=icon>)/gi, /<(?=artist>)/gi];
        let paths;
        if (metadb) {
            paths = fb.TitleFormat(format).EvalWithMetadb(metadb);
            for (const re of artIdRE) {
                paths = paths.replace(re, '<' + metadb.RawPath + '>');
            }
        }
        return paths;
    };

    this.getImgFilePaths = function (paths, metadb) {
        const allImgFilePaths = [];
        allImgFilePaths.srcStr = parsePathFormat(paths, metadb);

        const src_arr = allImgFilePaths.srcStr.split('||');

        for (const src of src_arr) {
            let results = PathsCache.SearchFor(src);
            if (!results.length) {
                if (src.startsWith('<')) { // embed cover
                    results.push(src);
                } else if (!src.includes('*') && !src.includes('?')) { // not wildcard
                    isSupportedType(src) && results.push(src);
                } else { // wildcard
                    utils.Glob(src).forEach((path) => { isSupportedType(path) && results.push(path); });
                }

                if (results.length)
                    PathsCache.Store(src, results);
            }

            for (; ;) {
                if (results.length <= 32766) { // 引数制限を回避
                    allImgFilePaths.push(...results); break;
                }
                else
                    allImgFilePaths.push(...results.splice(0, 32766));
            }
        }

        return allImgFilePaths;
    };

    this.clearCache = function () {
        PathsCache.length = 0;
    };

}();


//========================
//= Define Display Style =
//========================
const Display = new function () {
    let margin = Prop.Image.Margin.split(/\s*,\s*/).map((item) => Number(item));
    margin = { top: margin[1], left: margin[0], bottom: margin[3], right: margin[2] };
    let width, height;

    const refreshInterval = 30; // [ms]
    const step = Math.min(Math.ceil(255 * refreshInterval / Prop.Cycle.Animation.Duration), 255); // 255 / (Prop.Cycle.Animation.Duration / refreshInterval)
    const caseImg = gdi.Image(Prop.Image.Case.Path || scriptDir + 'images\\case.png');
    const caseRel = Prop.Image.Case.AdjustSize.split(/\s*,\s*/).map((item) => Number(item));

    let opacity = 255;
    let currImgPath, currImg, currSize;
    let newImg, newSize;
    let currReflImg, newReflImg, caseFixedSize;

    const onTimer = () => {
        if (!newImg)
            return;
        if (opacity > 0) {
            opacity = Math.max(opacity - step, 0);
        } else {
            onTimer.clearInterval();
            currImg = newImg;
            currSize = newSize;
            currReflImg = newReflImg;
            newImg = newSize = newReflImg = null;
            opacity = 255;
        }
        window.Repaint();
    };


    this.changeImage = function (path) {
        const result = ImageLoader.getImg(path, width, height);
        if (!result) { // キャッシュ含めて画像が読み込めない場合
            return false;
        }
        else if (path === currImgPath) {
            return true;
        }
        else {
            //console2("::get", path);
            currImgPath = path;
            newImg = result.img;
            newSize = calcImgSize(result.img, width, height, Prop.Image.Stretch); // キャッシュから取得した場合は必ずしもGetImgで指定したサイズで返ってくる訳ではないので表示用に計算する
            if (Prop.Image.Reflect.Enable || Prop.Image.AlignBottom)
                newSize.y *= 2; // set to bottom alignment
            if (Prop.Image.AlignLeft)
                newSize.x = 0;
            newReflImg = result.reflImg;
            opacity = 255;
            onTimer.interval(refreshInterval);
            return true;
        }
    };

    this.refresh = function () {
        const result = ImageLoader.getImg(currImgPath, width, height, true); // fourth arg: no cache
        if (result) {
            onTimer.clearInterval();
            newImg = newSize = newReflImg = null;
            opacity = 255;
            currImg = result.img;
            currSize = calcImgSize(result.img, width, height, Prop.Image.Stretch);
            if (Prop.Image.Reflect.Enable || Prop.Image.AlignBottom)
                currSize.y *= 2; // set to bottom alignment
            if (Prop.Image.AlignLeft)
                currSize.x = 0;
            currReflImg = result.reflImg;
            window.Repaint();
        }
    };

    this.onResize = function (ww, wh) {
        width = ww - margin.left - margin.right;
        height = wh - margin.top - margin.bottom;
        if (Prop.Image.Reflect.Enable)
            height *= 1 - Prop.Image.Reflect.Ratio;

        if (currImg) {
            currSize = calcImgSize(currImg, width, height, Prop.Image.Stretch);
            if (Prop.Image.Reflect.Enable || Prop.Image.AlignBottom)
                currSize.y *= 2; // set to bottom alignment
            if (Prop.Image.AlignLeft)
                currSize.x = 0;
        }
        if (newImg) {
            newSize = calcImgSize(newImg, width, height, Prop.Image.Stretch);
            if (Prop.Image.Reflect.Enable || Prop.Image.AlignBottom)
                newSize.y *= 2; // set to bottom alignment
            if (Prop.Image.AlignLeft)
                newSize.x = 0;
        }

        caseFixedSize = Prop.Image.Case.FixedSize.split(/\s*,\s*/).map((item) => item.replace('ww', ww).replace('wh', wh));
    };

    this.onPaint = function (gr) {
        if (currImg) {
            gr.DrawImage(currImg, margin.left + currSize.x, margin.top + currSize.y, currSize.width, currSize.height, 0, 0, currImg.Width, currImg.Height, 0, opacity);
            if (Prop.Image.Reflect.Enable) {
                gr.DrawImage(currReflImg, margin.left + currSize.x, margin.top + currSize.y + currSize.height + Prop.Image.Reflect.Distance, currSize.width, currReflImg.Height, 0, 0, currReflImg.Width, currReflImg.Height, 0, opacity);
            }
        }
        if (newImg) {
            gr.DrawImage(newImg, margin.left + newSize.x, margin.top + newSize.y, newSize.width, newSize.height, 0, 0, newImg.Width, newImg.Height, 0, 255 - opacity);
            if (Prop.Image.Reflect.Enable) {
                gr.DrawImage(newReflImg, margin.left + newSize.x, margin.top + newSize.y + newSize.height + Prop.Image.Reflect.Distance, newSize.width, newReflImg.Height, 0, 0, newReflImg.Width, newReflImg.Height, 0, 255 - opacity);
            }
        }
        const size = newSize || currSize;
        if (Prop.Image.Case.Enable && size && caseImg) {
            if (Prop.Image.Case.FixedSizeMode)
                gr.DrawImage(caseImg, caseFixedSize[0], caseFixedSize[1], caseFixedSize[2], caseFixedSize[3], 0, 0, caseImg.Width, caseImg.Height, 0, 255);
            else
                gr.DrawImage(caseImg, margin.left + size.x - caseRel[0], margin.top + size.y - caseRel[1], size.width + caseRel[0] + caseRel[2], size.height + caseRel[1] + caseRel[3], 0, 0, caseImg.Width, caseImg.Height, 0, 255);
        }
    };

}();


//========================
//= Define Controller ====
//========================
const Controller = new function () {
    let currImgPaths = [];
    let currImgPath;
    let currImgIdx = 0;
    const noCoverPath = Prop.Image.NoCoverPath || scriptDir + 'images\\nocover.png';

    const changeImg = function (arg) {
        switch (arg) {
            case 2: 	// Last
                currImgIdx = currImgPaths.length - 1;
                break;
            case 1: 	// Next
                currImgIdx = currImgIdx + 1 < currImgPaths.length ? currImgIdx + 1 : 0;
                break;
            case -1: 	// Previous
                currImgIdx = currImgIdx - 1 >= 0 ? currImgIdx - 1 : currImgPaths.length - 1;
                break;
            case -2: 	// First
                currImgIdx = 0;
                break;
            default:
                currImgIdx = Math.min(currImgIdx, currImgPaths.length - 1);
        }

        if (currImgPaths.length) {
            currImgPath = currImgPaths[currImgIdx];
            //console2("::try", currImgIdx, currImgPath);
            if (!Display.changeImage(currImgPath)) {
                currImgPaths.splice(currImgIdx, 1); // 表示出来なかったパスは削除
                changeImg(); // retry
            }
        }
        else {
            currImgPath = noCoverPath;
            Display.changeImage(currImgPath);
        }
    };

    const onTimer = () => {
        this.next();
    };

    const resetTimer = function () {
        !Prop.Cycle.Pause && onTimer.interval(Prop.Cycle.Interval);
    };


    this.play = function () {
        window.SetProperty('Cycle.Pause', Prop.Cycle.Pause = false);
        resetTimer();
    };

    this.pause = function () {
        window.SetProperty('Cycle.Pause', Prop.Cycle.Pause = true);
        onTimer.clearInterval();
    };

    this.next = function () {
        resetTimer();
        changeImg(1);
    };

    this.previous = function () {
        resetTimer();
        changeImg(-1);
    };

    this.first = function () {
        resetTimer();
        changeImg(-2);
    };

    this.last = function () {
        resetTimer();
        changeImg(2);
    };

    this.onNewTrack = function (metadb, followcur) {
        if (!metadb) return;

        const newImgPaths = PathChecker.getImgFilePaths(Prop.Panel.Path, metadb);

        if (currImgPaths.srcStr !== newImgPaths.srcStr) {
            currImgPaths = newImgPaths.filter(path => !Prop.Panel.ExcludeFileName.includes(path.split('\\').pop().toLowerCase()));
            currImgPaths.srcStr = newImgPaths.srcStr;
            Prop.Cycle.Shuffle && shuffleArray(currImgPaths, Prop.Cycle.Shuffle - 1);
            resetTimer();
            changeImg(-2);
        }

        if (followcur && Prop.Cycle.AutoPauseWhenFollowCursor) // 設定が有効なら自動サイクルを一時停止
            onTimer.clearInterval();
        else
            resetTimer();
    };

    this.onStop = function (reason) {
        if (reason !== 2) { // 2: Starting another track
            onTimer.clearInterval();
            currImgPaths = [];
            changeImg(-2);
        }
    };

    this.getCurrImgPaths = function () {
        return currImgPaths;
    };

    this.getCurrImgPath = function () {
        return currImgPath;
    };

}();


//========================
//= Define Menu Object ===
//========================
const Menu = new CustomMenu();

(() => {
    //=============
    // main menu items
    //=============
    const menu_smp_cover = [
        {
            Flag: MF_STRING,
            Caption: () => Prop.Cycle.Pause ? Lang.Label.ResumeCycle : Lang.Label.PauseCycle,
            Func: () => { Prop.Cycle.Pause ? Controller.play() : Controller.pause(); }
        },
        {
            Flag: () => Controller.getCurrImgPaths().length >= 2 ? MF_STRING : MF_GRAYED,
            Caption: Lang.Label.FirstImage,
            Func: () => { Controller.first(); }
        },
        {
            Flag: () => Controller.getCurrImgPaths().length >= 2 ? MF_STRING : MF_GRAYED,
            Caption: Lang.Label.LastImage,
            Func: () => { Controller.last(); }
        },
        {
            Flag: () => Controller.getCurrImgPaths().length ? MF_STRING : MF_GRAYED,
            Caption: Lang.Label.OpenWithViewer,
            Func: () => {
                let path = Controller.getCurrImgPath();
                if (path.startsWith('<')) {
                    if (Prop.Image.SubstitutedPath) {
                        if (fb.GetFocusItem() && (Prop.Panel.FollowCursor === 2 || (Prop.Panel.FollowCursor === 1 && !fb.IsPlaying)))
                            path = fb.TitleFormat(Prop.Image.SubstitutedPath).EvalWithMetadb(fb.GetFocusItem());
                        else
                            path = fb.TitleFormat(Prop.Image.SubstitutedPath).Eval();

                        Lang.Messages.info_EmbedImage.fbpopup();
                    }
                    else
                        path = null;
                }

                if (path) {
                    if (!Prop.Panel.ViewerPath)
                        execCommand(`"${path}"`);
                    else
                        execCommand(`"${Prop.Panel.ViewerPath}" ${path}`);
                }
            },
            ItemId: 'OpenWithViewer'
        },
        {
            Flag: () => Prop.Panel.FilerCommand ? (Controller.getCurrImgPaths().length ? MF_STRING : MF_GRAYED) : null,
            Caption: Lang.Label.OpenWithFiler,
            Func: () => {
                const path = Controller.getCurrImgPath().match(/^(?:<file:\/\/)?([^>]+)/)[1];
                execCommand(Prop.Panel.FilerCommand.replace(/\${imgPath}/g, path));
            }
        },
        {
            Flag: () => Controller.getCurrImgPaths().length ? MF_STRING : MF_GRAYED,
            Caption: Lang.Label.OpenFolder,
            Func: () => {
                const path = Controller.getCurrImgPath().match(/^(?:<file:\/\/)?([^>]+)/)[1];
                execCommand('explorer.exe /select,' + path);
            }
        },
        {
            Flag: MF_SEPARATOR
        },
        {
            Flag: MF_GRAYED,
            Caption: Lang.Label.FollowCursor
        },
        {
            Flag: () => Prop.Panel.FollowCursor === 1 ? MF_CHECKED : MF_UNCHECKED,
            Caption: '  ' + Lang.Label.FC_WhenNotPlaying,
            Func: () => {
                window.SetProperty('Panel.FollowCursor', Prop.Panel.FollowCursor = 1);
                if (fb.IsPlaying)
                    on_playback_new_track(fb.GetNowPlaying());
                else
                    on_item_focus_change();
            }
        },
        {
            Flag: () => Prop.Panel.FollowCursor === 2 ? MF_CHECKED : MF_UNCHECKED,
            Caption: '  ' + Lang.Label.FC_Always,
            Func: () => {
                window.SetProperty('Panel.FollowCursor', Prop.Panel.FollowCursor = 2);
                on_item_focus_change();
            }
        },
        {
            Flag: () => Prop.Panel.FollowCursor === 0 ? MF_CHECKED : MF_UNCHECKED,
            Caption: '  ' + Lang.Label.FC_Never,
            Func: () => {
                window.SetProperty('Panel.FollowCursor', Prop.Panel.FollowCursor = 0);
                if (fb.IsPlaying)
                    on_playback_new_track(fb.GetNowPlaying());
                else
                    on_playback_stop(0);
            }
        },
        {
            Flag: MF_SEPARATOR
        },
        {
            Flag: () => Prop.Image.Case.Enable ? MF_CHECKED : MF_UNCHECKED,
            Caption: Lang.Label.ShowCase,
            Func: () => {
                window.SetProperty('Image.Case.Enable', Prop.Image.Case.Enable = !Prop.Image.Case.Enable);
                window.Repaint();
            }
        },
        {
            Flag: () => Prop.Image.Reflect.Enable ? MF_CHECKED : MF_UNCHECKED,
            Caption: Lang.Label.ShowReflection,
            Func: () => {
                window.SetProperty('Image.Reflect.Enable', Prop.Image.Reflect.Enable = !Prop.Image.Reflect.Enable);
                on_size();
                ImageLoader.clearCache();
                Display.refresh();
            }
        },
        {
            Flag: () => Prop.Image.Stretch ? MF_CHECKED : MF_UNCHECKED,
            Caption: Lang.Label.ImageStretching,
            Func: () => {
                window.SetProperty('Image.Stretch', Prop.Image.Stretch = !Prop.Image.Stretch);
                Display.refresh();
            }
        },
        {
            Flag: () => Prop.Image.AlignLeft ? MF_CHECKED : MF_UNCHECKED,
            Caption: Lang.Label.AlignLeft,
            Func: () => {
                window.SetProperty('Image.AlignLeft', Prop.Image.AlignLeft = !Prop.Image.AlignLeft);
                Display.refresh();
            }
        },
        {
            Flag: () => Prop.Image.AlignBottom ? MF_CHECKED : MF_UNCHECKED,
            Caption: Lang.Label.AlignBottom,
            Func: () => {
                window.SetProperty('Image.AlignBottom', Prop.Image.AlignBottom = !Prop.Image.AlignBottom);
                Display.refresh();
            }
        },
        {
            Flag: MF_SEPARATOR
        },
        {
            Flag: () => Controller.getCurrImgPaths().length && !Controller.getCurrImgPath().startsWith('<') ? MF_STRING : MF_GRAYED,
            Caption: Lang.Label.DeleteImage,
            Func: () => {
                sendToRecycleBin(Controller.getCurrImgPath());
                Display.refresh(); // キャッシュから削除
                Controller.next();
            }
        },
        {
            Flag: MF_SEPARATOR
        },
        {
            Flag: () => Controller.getCurrImgPaths().length ? MF_STRING : MF_GRAYED,
            Caption: Lang.Label.RefreshImage,
            Func: () => { Display.refresh(); }
        },
        {
            Flag: MF_STRING,
            Caption: Lang.Label.ClearCache,
            Func: () => {
                ImageLoader.clearCache();
                PathChecker.clearCache();
            }
        },
        {
            Flag: MF_SEPARATOR
        },
        {
            Flag: MF_STRING,
            Caption: Lang.Label.Prop,
            Func: () => { window.ShowProperties(); }
        },
        {
            Flag: MF_STRING,
            Caption: Lang.Label.Help,
            Func: () => { execCommand('https://ashiato1.blog.fc2.com/blog-entry-160.html'); }
        },
        {
            Flag: () => Prop.Panel.HideConf ? null : MF_STRING,
            Caption: Lang.Label.Conf,
            Func: () => { window.ShowConfigure(); }
        }
    ];


    //========
    // resister
    //========
    Menu.register({
        id: 'smp-cover',
        items: menu_smp_cover
    });

    Menu.defaultId = () => 'smp-cover';

})();


//========================
//== onLoad ==============
//========================

(() => {
    on_size();
    on_playback_stop(0);
    if (fb.IsPlaying)
        on_playback_new_track(fb.GetNowPlaying());
}).timeout(200); // Delay loading for stability


//========================
//= Callback Function ====
//========================
function on_paint(gr) {
    if (isDragging)
        gr.FillSolidRect(-1, -1, ww + 2, wh + 2, RGBA(193, 219, 252));
    else if (Prop.Panel.BackgroundColor)
        gr.FillSolidRect(-1, -1, ww + 2, wh + 2, Prop.Panel.BackgroundColor);
    gr.SetSmoothingMode(2);
    gr.SetInterpolationMode(7);

    Display.onPaint(gr);
}

function on_size() {
    if (!window.Width || !window.Height)
        return;
    ww = window.Width;
    wh = window.Height;
    Display.onResize(ww, wh);
}

function on_item_focus_change() {
    if (Prop.Panel.FollowCursor === 2 || (Prop.Panel.FollowCursor === 1 && !fb.IsPlaying))
        fb.GetFocusItem() && Controller.onNewTrack(fb.GetFocusItem(), true);
}

function on_playback_new_track(metadb) {
    if (Prop.Panel.FollowCursor <= 1)
        Controller.onNewTrack(metadb);
}

function on_playback_stop(reason) {
    if (reason !== 2) {
        if (Prop.Panel.FollowCursor === 0 || !fb.GetFocusItem())
            Controller.onStop(reason);
        else
            on_item_focus_change();
    }
}

function on_mouse_wheel(delta) {
    if (delta > 0)
        Controller.previous();
    else
        Controller.next();
}

function on_mouse_rbtn_up(x, y, mask) {
    if (utils.IsKeyPressed(VK_SHIFT))
        return;
    else {
        Menu.build();
        Menu.show(x, y);
        return true; // prevent default menu
    }
}

function on_mouse_lbtn_dblclk(x, y, mask) {
    Menu.doCommandByItemId('OpenWithViewer');
}

function on_mouse_mbtn_down(x, y, mask) {
    Menu.doCommandByItemId('OpenWithViewer');
}

function on_drag_enter(action) {
    isDragging = true;
    window.Repaint();

    let playlist_name = '';
    const metadb = fb.GetFocusItem();
    if (!metadb)
        playlist_name = Prop.Panel.DragDropToPlaylist;
    else
        playlist_name = fb.TitleFormat(Prop.Panel.DragDropToPlaylist).EvalWithMetadb(metadb);

    action.Text = `Add To Playlist "${playlist_name || 'New Playlist'}"`;
}

function on_drag_leave() {
    isDragging = false;
    window.Repaint();
}

function on_drag_drop(action) {
    let playlist_name = '';
    const metadb = fb.GetFocusItem();

    if (!metadb) // TFを評価できないのでそのまま使用(foobar外からドロップかつプレイリストが空っぽ等)
        playlist_name = Prop.Panel.DragDropToPlaylist;
    else
        playlist_name = fb.TitleFormat(Prop.Panel.DragDropToPlaylist).EvalWithMetadb(metadb);

    let idx = -1;
    for (let i = 0; i < plman.PlaylistCount; i++) {
        if (plman.GetPlaylistName(i) === playlist_name) {
            idx = i;
            break;
        }
    }

    if (idx === -1)
        idx = plman.CreatePlaylist(plman.PlaylistCount, playlist_name);

    on_drag_leave(); // on_drag_dropイベントの発生時にはon_drag_leaveが呼ばれない

    action.Effect = 1; // 1:DROPEFFECT_COPY
    action.Playlist = idx;
    action.ToSelect = false;
}

//EOF