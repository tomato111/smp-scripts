//== code for foo_spider_monkey_panel v1.2.2 or higher ==

window.DefinePanel('smp-popup-history',
    {
        version: '1.0.0',
        author: 'tomato111'
    }
);


//=======================
//= Properties Object ===
//=======================
const Prop = new function () {

    this.Menu = {
        ItemName: window.GetProperty('Menu.ItemName', '%title%'),
        MaxSize: window.GetProperty('Menu.MaxSize', 25)
    };

    this.Style = {
        Color: {
            Background: eval(window.GetProperty('Style.Color.Background', 'RGBA(0,0,0,50)'))
        }
    };

};


//=======================
//= Global ==============
//=======================

const MF_STRING = 0x00000000;
const MF_GRAYED = 0x00000001;
const MF_CHECKED = 0x00000008;
const MF_SEPARATOR = 0x00000800;

function RGBA(r, g, b, a) {
    let res = 0xff000000 | (r << 16) | (g << 8) | (b);
    if (a !== undefined) res = (res & 0x00ffffff) | (a << 24);
    return res;
}


//=======================
//= SMP_History Object ==
//=======================
const SMP_History = new function () {
    let history_items, history_index_data, _menu;

    this.on_paint = function (gr) {
        gr.FillSolidRect(-1, -1, window.Width + 2, window.Height + 2, Prop.Style.Color.Background);
    };

    this.init = function () {
        history_items = [];
        history_index_data = [];
        restoreHistory();
        if (fb.IsPlaying) {
            const playlistName = plman.GetPlaylistName(plman.PlayingPlaylist);
            buildHistoryMenu(fb.GetNowPlaying(), plman.PlayingPlaylist, playlistName);
        }
        else
            buildHistoryMenu();
    };

    this.add = function (metadb, playlistIdx) {
        const playlistName = plman.GetPlaylistName(playlistIdx);

        for (const item of history_items) {
            if (metadb.Compare(item.metadb) && (item.playlistIdx === playlistIdx || item.playlistName === playlistName)) {
                buildHistoryMenu(metadb, playlistIdx, playlistName);
                return;
            }
        }

        history_items.unshift(new Info(metadb, playlistIdx, playlistName));
        history_index_data.unshift(
            [
                playlistIdx,
                playlistName,
                Math.floor(metadb.Length * 1000)
            ]
        );

        history_items.length = Math.min(history_items.length, Prop.Menu.MaxSize);
        history_index_data.length = history_items.length;

        window.SetProperty('SystemData', history_index_data.join('^'));
        buildHistoryMenu(metadb, playlistIdx, playlistName);
    };

    this.clear = function (x, y) {
        const ret =
            buildMenu([
                { Flag: MF_GRAYED, Caption: 'Clear list?' },
                { Flag: MF_SEPARATOR },
                { Flag: MF_STRING, Caption: 'OK' },
                { Flag: MF_STRING, Caption: 'Cancel' }
            ]).TrackPopupMenu(x, y);
        if (ret === 3) {
            history_items = [];
            history_index_data = [];
            window.SetProperty('SystemData', '');
            buildHistoryMenu();
        }
    };

    this.popup = function (x, y) {
        const ret = _menu.TrackPopupMenu(x, y);
        if (ret === history_items.length + 2)
            this.clear(x, y);
        else if (ret !== 0)
            history_items[ret - 1].doCommand();
    };


    const restoreHistory = () => {
        const str = window.GetProperty('SystemData');
        if (!str) {
            return;
        }

        const caches = {};
        history_index_data = str.split('^').map((item) => item.split(',').map((elem) => isFinite(elem) ? Number(elem) : elem));
        for (let i = 0; i < history_index_data.length;) {

            const playlistName = history_index_data[i][1];
            const playlistIdx = plman.FindPlaylist(playlistName) !== -1 ? plman.FindPlaylist(playlistName) : history_index_data[i][0];
            const playbackLength = history_index_data[i][2];

            let handleList = caches[playlistIdx];
            if (!handleList) {
                handleList = plman.GetPlaylistItems(playlistIdx);
                handleList.length = handleList.Count;
                handleList = caches[playlistIdx] = Array.from(handleList);
            }
            const result = handleList.find((item) => Math.floor(item.Length * 1000) === playbackLength);

            if (result) {
                history_items.push(new Info(result, playlistIdx, playlistName));
                i++;
            }
            else
                history_index_data.splice(i, 1);
        }

        history_items.length = Math.min(history_items.length, Prop.Menu.MaxSize);
        history_index_data.length = history_items.length;

        window.SetProperty('SystemData', history_index_data.join('^'));
    };

    const buildHistoryMenu = (metadb, playlistIdx, playlistName) => {
        const menu_items = [];
        if (history_items.length) {
            for (const item of history_items) {
                let flag = MF_STRING;
                if (metadb)
                    flag = metadb.Compare(item.metadb) && (item.playlistIdx === playlistIdx || item.playlistName === playlistName) ? MF_CHECKED : MF_STRING;
                menu_items.push(
                    {
                        Flag: flag,
                        Caption: item.name
                    }
                );
            }
            menu_items.push(
                {
                    Flag: MF_SEPARATOR
                },
                {
                    Flag: MF_STRING,
                    Caption: '(Clear)'
                }
            );
        }
        else {
            menu_items.push(
                {
                    Flag: MF_GRAYED,
                    Caption: '(Empty)'
                }
            );
        }

        _menu = buildMenu(menu_items);
    };

    const buildMenu = (items) => {
        let idx = 1;
        const _menu = window.CreatePopupMenu();
        for (const item of items) {
            _menu.AppendMenuItem(item.Flag, idx++, item.Caption);
        }
        return _menu;
    };

    // Constructor
    function Info(metadb, playlistIdx, playlistName) {
        this.metadb = metadb;
        this.name = fb.TitleFormat(Prop.Menu.ItemName).EvalWithMetadb(metadb);
        this.playlistIdx = playlistIdx;
        this.playlistName = playlistName;
    }
    Info.prototype.doCommand = function () {
        let playlistIdx = plman.FindPlaylist(this.playlistName);
        plman.SetPlaylistFocusItemByHandle(playlistIdx, this.metadb);

        let itemIndex = plman.GetPlaylistFocusItemIndex(playlistIdx);
        if (itemIndex === -1) {
            playlistIdx = this.playlistIdx;
            plman.SetPlaylistFocusItemByHandle(playlistIdx, this.metadb);
            itemIndex = plman.GetPlaylistFocusItemIndex(playlistIdx);
        }

        if (itemIndex !== -1) {
            plman.ActivePlaylist = playlistIdx;
            plman.ClearPlaylistSelection(playlistIdx);
            plman.SetPlaylistSelectionSingle(playlistIdx, itemIndex, true);
            plman.ExecutePlaylistDefaultAction(playlistIdx, itemIndex);
        }
        else
            fb.ShowPopupMessage('The item is not found in playlist.', window.Name, 0);
    };
    // End Constructor

    this.init();
}();


//========================
//= Callback Function ====
//========================
function on_paint(gr) {
    SMP_History.on_paint(gr);
}

function on_playback_new_track(metadb) {
    SMP_History.add(metadb, plman.PlayingPlaylist);
}

function on_mouse_lbtn_down(x, y, mask) {
    SMP_History.popup(x + 1, y);
}

function on_mouse_lbtn_dblclk(x, y, mask) {
    on_mouse_lbtn_down(x, y, mask);
}

//EOF