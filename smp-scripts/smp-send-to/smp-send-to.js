//== code for foo_spider_monkey_panel v1.2.2 or higher ==

window.DefineScript('smp-send-to',
    {
        version: '1.0.0',
        author: 'tomato111'
    }
);

/* Description */
/* If the file you tried to play has the specified extension, send it to an external player. */


//=======================
//= Properties Object ===
//=======================
const Prop = new function () {

    this.Panel = {
        Enable: window.GetProperty('Panel.Enable', true),
        Extension: window.GetProperty('Panel.Extension', 'avi,flv,mkv,mpg,mp4,wmv')
    };

    if (!this.Panel.Extension)
        window.SetProperty('Panel.Extension', this.Panel.Extension = 'avi,flv,mkv,mpg,mp4,wmv');


    this.Player = {};
    for (const ext of this.Panel.Extension.split(/\s*,\s*/)) {
        this.Player[ext.toUpperCase()] = window.GetProperty(`Player.${ext.toUpperCase()}`, '');
    }

    this.Style = {
        Color: {
            Background: window.GetProperty('Style.Color.Background', 'RGBA(255,255,255,50)')
        }
    };
    this.Style.Color.Background = RGBA(...this.Style.Color.Background.split(',').map((item) => Number(item.replace(/\D/g, ''))));

};


//=======================
//= Global ==============
//=======================

const sa = new ActiveXObject('Shell.Application');
const extArr = Prop.Panel.Extension.split(/\s*,\s*/).map((item) => item.toUpperCase());

function LaunchPlayer(ext, arg) {
    const a = arg.charAt(0);
    if (a !== '"')
        arg = `"${arg}"`;

    let player = Prop.Player[ext];
    if (!player) {
        player = arg;
        arg = null;
    }

    sa.ShellExecute(player, arg, '', '', 1);
}

function RGBA(r, g, b, a) {
    let res = 0xff000000 | (r << 16) | (g << 8) | (b);
    if (a !== undefined) res = (res & 0x00ffffff) | (a << 24);
    return res;
}


//========================
//= Callback Function ====
//========================
function on_paint(gr) {
    const text = Prop.Panel.Enable ? 'SendTo' : 'NotSend';
    const font = gdi.Font('Segoe UI', 13, 0);
    const color = Prop.Panel.Enable ? RGBA(0, 128, 0) : RGBA(128, 0, 0);

    gr.FillSolidRect(-1, -1, window.Width + 2, window.Height + 2, Prop.Style.Color.Background);
    gr.GdiDrawText(text, font, color, 4, 2, window.Width, window.Height, 0x00000000);
}

function on_playback_new_track(metadb) {
    if (Prop.Panel.Enable) {
        const ext = metadb.Path.split('.').pop().toUpperCase();
        if (extArr.includes(ext)) {
            !fb.IsPaused && fb.Pause(); // 自動で次の曲に遷移する場合は on_playback_starting() が呼ばれない（一瞬再生されてしまう）
            LaunchPlayer(ext, metadb.Path);
        }
        else
            fb.IsPaused && window.SetTimeout(() => { fb.IsPaused && fb.Pause(); }, 50);
    }
}

function on_playback_starting(cmd, is_paused) {
    Prop.Panel.Enable && !is_paused && fb.Pause();
}

function on_mouse_lbtn_down(x, y, mask) {
    window.SetProperty('Panel.Enable', Prop.Panel.Enable = !Prop.Panel.Enable);
    window.Repaint();
}

function on_mouse_lbtn_dblclk(x, y, mask) {
    on_mouse_lbtn_down(x, y, mask);
}

//EOF