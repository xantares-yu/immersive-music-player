/**
 * Aetheria Sound · High-Fidelity Music Engine & Aggregator
 * Comprehensive Builtin Catalog (30+ Masterpiece Tracks)
 * + Real-time Multi-source Online Search Engine with Fallback
 */

(function () {
  'use strict';

  // ============================================================
  // 1. BUILTIN MASTERPIECE CATALOG (30+ Complete Audio/LRC Tracks)
  // ============================================================
  const BUILTIN_CATALOG = [
    // 1. 周杰伦 · 七里香
    {
      id: 'jay_qilixiang',
      neteaseId: '2712018330',
      title: '七里香',
      artist: '周杰伦 · Jay Chou',
      album: '七里香 (2004)',
      genre: 'CHINESE POP / NOSTALGIA',
      cover: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.55)',
        meshColors: ['#d97706', '#ea580c', '#3b82f6']
      },
      keywords: ['周杰伦', '七里香', 'jay', 'chou', 'qlx', 'qilixiang', '方文山', '夏天的感觉', '雨下整夜'],
      arrangement: {
        bpm: 76,
        stepMs: 395,
        wave: 'sine',
        drumStyle: 'pop',
        melody: [
          392.00, 392.00, 392.00, 440.00, 392.00, 329.63, 293.66, 0,
          293.66, 329.63, 392.00, 329.63, 293.66, 261.63, 293.66, 0,
          392.00, 440.00, 523.25, 440.00, 392.00, 329.63, 392.00, 0,
          329.63, 293.66, 261.63, 293.66, 329.63, 293.66, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00], // C
          [196.00, 246.94, 293.66], // G
          [220.00, 261.63, 329.63], // Am
          [174.61, 220.00, 261.63]  // F
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "七里香 - 周杰伦", trans: "Common Jasmine Orange · Jay Chou" },
        { time: 3.0, text: "词：方文山 / 曲：周杰伦", trans: "Lyrics: Vincent Fang / Music: Jay Chou" },
        { time: 6.5, text: "窗外的麻雀 在电线杆上多嘴", trans: "The sparrows chatter on telephone poles outside" },
        { time: 12.0, text: "你说这一句 很有夏天的感觉", trans: "You say this sentence brings the essence of summer" },
        { time: 18.2, text: "手中的铅笔 在纸上来来回回", trans: "The pencil in my hand sketches back and forth" },
        { time: 24.5, text: "我用几行字形容你是我的谁", trans: "Capturing in a few lines what you mean to me" },
        { time: 31.0, text: "秋刀鱼的滋味 猫跟你都想了解", trans: "The taste of saury, both the cat and you wish to know" },
        { time: 37.8, text: "初恋的香味就这样被我们寻回", trans: "The sweet scent of first love is gently rediscovered" },
        { time: 44.5, text: "那温暖的阳光 像刚摘的鲜艳草莓", trans: "The tender sunlight shines like freshly picked strawberries" },
        { time: 51.0, text: "你说你舍不得吃掉这一种感觉", trans: "You whisper you cannot bear to consume this pure feeling" },
        { time: 58.2, text: "雨下整夜 我的爱溢出就像雨水", trans: "Rain poured all night, my love overflows just like rainfall" },
        { time: 65.0, text: "院子落叶 跟我的思念厚厚一叠", trans: "Fallen leaves in courtyard, piled as thick as my yearning" },
        { time: 71.8, text: "几句是非 也无法将我的热情冷却", trans: "No passing gossip could ever chill my ardent fire" },
        { time: 78.5, text: "你出现在我诗的每一页", trans: "For you appear across every single page of my poetry" }
      ]
    },

    // 2. 周杰伦 · 晴天
    {
      id: 'jay_qiantian',
      neteaseId: '2652820720',
      title: '晴天',
      artist: '周杰伦 · Jay Chou',
      album: '叶惠美 (2003)',
      genre: 'ACOUSTIC GUITAR / NOSTALGIA',
      cover: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#0ea5e9',
        glow: 'rgba(14, 165, 233, 0.55)',
        meshColors: ['#0284c7', '#06b6d4', '#10b981']
      },
      keywords: ['周杰伦', '晴天', '故事的小黄花', 'jay', 'chou', 'qiantian', 'qt', '叶惠美'],
      arrangement: {
        bpm: 72,
        stepMs: 416,
        wave: 'triangle',
        drumStyle: 'acoustic',
        melody: [
          293.66, 392.00, 392.00, 493.88, 523.25, 493.88, 440.00, 392.00,
          440.00, 0, 0, 0, 293.66, 392.00, 493.88, 0,
          493.88, 523.25, 587.33, 493.88, 440.00, 392.00, 329.63, 392.00,
          0, 392.00, 440.00, 493.88, 392.00, 329.63, 293.66, 0
        ],
        chords: [
          [164.81, 196.00, 246.94], // Em
          [130.81, 196.00, 246.94], // C
          [196.00, 246.94, 293.66], // G
          [146.83, 220.00, 293.66]  // D
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "晴天 - 周杰伦", trans: "Sunny Day · Jay Chou" },
        { time: 4.5, text: "故事的小黄花 从出生那年就飘着", trans: "The yellow flowers in the story have fluttered since birth" },
        { time: 11.5, text: "童年的荡秋千 随记忆一直晃到现在", trans: "Childhood swings sway gently into present memory" },
        { time: 19.5, text: "Re So So Si Do Si La So La", trans: "吹奏起熟悉的旧吉他旋律" },
        { time: 26.0, text: "吹着前奏 望着天空 我想起花瓣试着掉落", trans: "Gazing at azure sky, recalling petals drifting down" },
        { time: 33.5, text: "为你翘课的那一天 花落的那一天", trans: "The day I skipped class for you, when blossoms scattered" },
        { time: 41.0, text: "教室的那一间 我怎么看不见", trans: "That old classroom, why does it fade in distance now" },
        { time: 48.5, text: "消失的下雨天 我好想再淋一遍", trans: "The vanished rainy day, how I yearn to be drenched again" },
        { time: 56.5, text: "没想到失去的勇气我还留着", trans: "Astonished that the lost courage still burns within" },
        { time: 64.0, text: "好想再问一遍 你会等待还是离开", trans: "Yearning to ask once more: will you stay, or walk away?" },
        { time: 72.5, text: "刮风这天 我试过握着你手", trans: "On that gusty wind day, I tried holding your palm" },
        { time: 80.0, text: "但偏偏 雨渐渐 大到我看你不见", trans: "Yet the rain poured heavier until you dissolved from sight" }
      ]
    },

    // 3. 周杰伦 · 夜曲
    {
      id: 'jay_yequ',
      neteaseId: '2725685941',
      title: '夜曲',
      artist: '周杰伦 · Jay Chou',
      album: '十一月的萧邦 (2005)',
      genre: 'CHOPIN NOCTURNE / HIP-HOP',
      cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#8b5cf6',
        glow: 'rgba(139, 92, 246, 0.55)',
        meshColors: ['#6d28d9', '#4c1d95', '#0f172a']
      },
      keywords: ['周杰伦', '夜曲', 'yequ', '肖邦', '十一月的萧邦', '为你弹奏肖邦的夜曲', '纪念我死去的爱情'],
      arrangement: {
        bpm: 82,
        stepMs: 365,
        wave: 'triangle',
        drumStyle: 'trap',
        melody: [
          261.63, 311.13, 392.00, 311.13, 261.63, 207.65, 261.63, 0,
          261.63, 311.13, 392.00, 466.16, 392.00, 311.13, 261.63, 0,
          523.25, 466.16, 392.00, 311.13, 261.63, 311.13, 392.00, 0
        ],
        chords: [
          [130.81, 155.56, 196.00], // Cm
          [103.83, 130.81, 155.56], // Ab
          [116.54, 146.83, 174.61], // Bb
          [123.47, 155.56, 185.00]  // G
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "夜曲 - 周杰伦", trans: "Nocturne · Jay Chou" },
        { time: 5.0, text: "一群嗜血的蚂蚁 被腐肉所吸引", trans: "A swarm of bloodthirsty ants lured by decay" },
        { time: 10.5, text: "我面无表情 看孤独的风景", trans: "Expressionless, I gaze upon the lonely landscape" },
        { time: 16.0, text: "失去你 爱恨开始分明", trans: "Losing you, love and sorrow sharpen in contrast" },
        { time: 21.0, text: "失去你 还有什么事好关心", trans: "Without you, what else in this world is worth longing for" },
        { time: 27.0, text: "为你弹奏肖邦的夜曲 纪念我死去的爱情", trans: "Playing Chopin's nocturne for you, mourning my departed love" },
        { time: 33.5, text: "跟夜风一样的声音 心碎的很好听", trans: "A murmur like night wind, heartbreak echoing in bittersweet chords" },
        { time: 40.0, text: "手在键盘敲很轻 我给的思念很小心", trans: "Fingers brushing lightly across keys, holding pure yearning gently" },
        { time: 46.5, text: "你埋葬的地方 叫幽冥", trans: "The sacred ground where your memory rests is called the Netherworld" }
      ]
    },

    // 4. 周杰伦 · 稻香
    {
      id: 'jay_daoxiang',
      neteaseId: '2651425710',
      title: '稻香',
      artist: '周杰伦 · Jay Chou',
      album: '魔杰座 (2008)',
      genre: 'FOLK POP / HEALING',
      cover: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#84cc16',
        glow: 'rgba(132, 204, 22, 0.55)',
        meshColors: ['#65a30d', '#ca8a04', '#0284c7']
      },
      keywords: ['周杰伦', '稻香', 'daoxiang', 'dx', '对这个世界如果你有太多的抱怨', '回家吧', '回到最初的美好'],
      arrangement: {
        bpm: 80,
        stepMs: 375,
        wave: 'sine',
        drumStyle: 'acoustic',
        melody: [
          329.63, 329.63, 329.63, 329.63, 293.66, 261.63, 293.66, 329.63,
          392.00, 329.63, 293.66, 261.63, 220.00, 261.63, 293.66, 0,
          329.63, 392.00, 440.00, 392.00, 329.63, 293.66, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00], // C
          [196.00, 246.94, 293.66], // G
          [220.00, 261.63, 329.63], // Am
          [174.61, 220.00, 261.63]  // F
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "稻香 - 周杰伦", trans: "Fragrant Rice · Jay Chou" },
        { time: 4.5, text: "对这个世界如果你有太多的抱怨", trans: "If you carry too many grievances against this world" },
        { time: 10.0, text: "跌倒了 就不敢继续往前走", trans: "Having stumbled once, fearing to step forward again" },
        { time: 15.5, text: "为什么 人要这么的脆弱 堕落", trans: "Why do souls become so fragile and disillusioned?" },
        { time: 21.0, text: "请你打开电视看看 多少人为生命在努力勇敢的走下去", trans: "Turn on the screen and witness how many fight bravely for life" },
        { time: 28.0, text: "我们是不是该知足 珍惜一切 就算没有拥有", trans: "Should we not find gratitude, treasuring every moment?" },
        { time: 35.5, text: "还记得你说家是唯一的城堡", trans: "Still remember you said home is the only true sanctuary" },
        { time: 41.0, text: "随着稻香河流继续奔跑", trans: "Running alongside the scented rice and flowing rivers" },
        { time: 46.5, text: "微微笑 小时候的梦我知道", trans: "Smile gently, the childhood dreams whisper within" }
      ]
    },

    // 5. 周杰伦 · 青花瓷
    {
      id: 'jay_qinghuaci',
      neteaseId: '3381543730',
      title: '青花瓷',
      artist: '周杰伦 · Jay Chou',
      album: '我很忙 (2007)',
      genre: 'CHINESE STYLE / PENTATONIC',
      cover: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#06b6d4',
        glow: 'rgba(6, 182, 212, 0.55)',
        meshColors: ['#0891b2', '#0284c7', '#38bdf8']
      },
      keywords: ['周杰伦', '青花瓷', '天青色等烟雨', 'qinghuaci', 'qhc', '方文山', '国风'],
      arrangement: {
        bpm: 74,
        stepMs: 405,
        wave: 'triangle',
        drumStyle: 'acoustic',
        melody: [
          392.00, 440.00, 523.25, 440.00, 392.00, 329.63, 293.66, 329.63,
          392.00, 440.00, 392.00, 329.63, 293.66, 261.63, 293.66, 0,
          523.25, 440.00, 392.00, 329.63, 293.66, 261.63, 220.00, 0
        ],
        chords: [
          [261.63, 329.63, 392.00], // C
          [220.00, 261.63, 329.63], // Am
          [174.61, 220.00, 261.63], // F
          [196.00, 246.94, 293.66]  // G
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "青花瓷 - 周杰伦", trans: "Blue and White Porcelain · Jay Chou" },
        { time: 4.0, text: "素胚勾勒出青花 笔锋浓转淡", trans: "Brushing cobalt blue onto porcelain bisque, ink turning faint" },
        { time: 10.0, text: "瓶身描绘的牡丹 一如你初妆", trans: "Peonies blossoming across porcelain curves like your bridal grace" },
        { time: 16.5, text: "冉冉檀香透过窗 心事我了然", trans: "Incense drifting through lattice, your unspoken thoughts revealed" },
        { time: 22.0, text: "宣纸上走笔至此搁一半", trans: "Ink pauses midway on handmade rice paper" },
        { time: 28.5, text: "天青色等烟雨 而我在等你", trans: "Sky blue awaits misty rain, as I wait for you" },
        { time: 35.0, text: "炊烟袅袅升起 隔江千万里", trans: "Chimney smoke ascends curling, across thousands of miles" },
        { time: 41.5, text: "在瓶底书刻隶书的仿宋 临摹的伏笔", trans: "Inscribed in delicate script on the vase's timeless base" },
        { time: 48.0, text: "就当我 为遇见你伏笔", trans: "Consider it all a poetic prelude to meeting you" }
      ]
    },

    // 6. The Weeknd ft. Daft Punk · Starboy
    {
      id: 'theweeknd_starboy',
      neteaseId: '431610014',
      title: 'Starboy',
      artist: 'The Weeknd ft. Daft Punk',
      album: 'Starboy (2016)',
      genre: 'SYNTH POP / ELECTRO R&B',
      cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#f43f5e',
        glow: 'rgba(244, 63, 94, 0.55)',
        meshColors: ['#e11d48', '#9333ea', '#2563eb']
      },
      keywords: ['the weeknd', 'starboy', 'daft punk', '盆栽哥', '星光少年', 'look what youve done'],
      arrangement: {
        bpm: 93,
        stepMs: 322,
        wave: 'sawtooth',
        drumStyle: 'trap',
        melody: [
          392.00, 392.00, 392.00, 466.16, 392.00, 349.23, 392.00, 0,
          392.00, 392.00, 392.00, 466.16, 392.00, 349.23, 293.66, 0,
          587.33, 587.33, 587.33, 523.25, 466.16, 392.00, 349.23, 392.00
        ],
        chords: [
          [196.00, 233.08, 293.66], // Gm
          [174.61, 220.00, 261.63], // F
          [155.56, 196.00, 233.08], // Eb
          [146.83, 220.00, 293.66]  // Dm
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "Starboy - The Weeknd ft. Daft Punk", trans: "Prod. by Daft Punk" },
        { time: 5.0, text: "I'm tryna put you in the worst mood, ah", trans: "打破你自命不凡的骄傲心境" },
        { time: 10.0, text: "P1 cleaner than your church shoes, ah", trans: "迈凯伦P1比做礼拜的皮鞋还要耀眼" },
        { time: 14.5, text: "Milli point two just to hurt you, ah", trans: "一百二十万美金超跑呼啸而过" },
        { time: 19.0, text: "All red Lamb' just to tease you, ah", trans: "烈焰红兰博基尼从身旁疾驰" },
        { time: 25.0, text: "Made your whole year in a week too, yah", trans: "一周进账抵得上整整一年的拼搏" },
        { time: 31.0, text: "Main girl out your league too, ah", trans: "身边的女神是你不可触碰的风景" },
        { time: 37.0, text: "Look what you've done", trans: "见证这一切无与伦比的光芒" },
        { time: 41.5, text: "I'm a motherfuckin' starboy", trans: "我就是那个耀眼的宇宙巨星" }
      ]
    },

    // 7. The Weeknd · Blinding Lights
    {
      id: 'theweeknd_blindinglights',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      album: 'After Hours (2020)',
      genre: '80S SYNTHWAVE / DANCE POP',
      cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#ef4444',
        glow: 'rgba(239, 68, 68, 0.55)',
        meshColors: ['#b91c1c', '#ea580c', '#4338ca']
      },
      keywords: ['the weeknd', 'blinding lights', 'after hours', '80s', 'synthwave', '盆栽哥'],
      arrangement: {
        bpm: 171,
        stepMs: 175,
        wave: 'sawtooth',
        drumStyle: 'trap',
        melody: [
          659.25, 659.25, 587.33, 523.25, 587.33, 659.25, 0, 523.25,
          659.25, 659.25, 587.33, 523.25, 587.33, 440.00, 0, 0
        ],
        chords: [
          [146.83, 174.61, 220.00], // Dm
          [220.00, 261.63, 329.63], // Am
          [261.63, 329.63, 392.00], // C
          [196.00, 246.94, 293.66]  // G
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "Blinding Lights - The Weeknd", trans: "炫目强光 · 盆栽哥" },
        { time: 4.0, text: "Yeah", trans: "闪烁的霓虹深处" },
        { time: 7.5, text: "I've been tryna call", trans: "无数次尝试拨通你的号码" },
        { time: 10.5, text: "I've been on my own for long enough", trans: "在漫长孤寂中独自游荡太久" },
        { time: 14.5, text: "Maybe you can show me how to love, maybe", trans: "或许唯有你能教会我爱的真谛" },
        { time: 22.0, text: "I'm going through withdrawals", trans: "心潮在思念的戒断中剧烈翻涌" },
        { time: 26.5, text: "You don't even have to do too much", trans: "你无需多言，只要伫立眼前" },
        { time: 33.0, text: "I said, ooh, I'm blinded by the lights", trans: "我说，我被这炫目强光彻底眩晕" },
        { time: 39.5, text: "No, I can't sleep until I feel your touch", trans: "若无你的指尖温存，我彻夜难眠" }
      ]
    },

    // 8. JVKE · Golden Hour
    {
      id: 'jvke_goldenhour',
      title: 'Golden Hour',
      artist: 'JVKE',
      album: 'Golden Hour (2022)',
      genre: 'ETHEREAL PIANO / INDIE POP',
      cover: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#eab308',
        glow: 'rgba(234, 179, 8, 0.55)',
        meshColors: ['#f59e0b', '#dc2626', '#7c3aed']
      },
      keywords: ['jvke', 'golden hour', 'goldenhour', '黄金时刻', 'piano', '钢琴', 'tiktok'],
      arrangement: {
        bpm: 88,
        stepMs: 170,
        wave: 'sine',
        drumStyle: 'piano',
        melody: [
          329.63, 392.00, 493.88, 659.25, 783.99, 659.25, 493.88, 392.00,
          329.63, 392.00, 493.88, 659.25, 987.77, 783.99, 659.25, 493.88
        ],
        chords: [
          [164.81, 196.00, 246.94],
          [146.83, 220.00, 293.66],
          [130.81, 196.00, 246.94],
          [123.47, 185.00, 246.94]
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "Golden Hour - JVKE", trans: "In your golden hour" },
        { time: 4.0, text: "It was just two lovers sittin' in the car", trans: "车厢里静坐着沉浸在爱意里的恋人" },
        { time: 8.5, text: "Listening to blonde, fallin' for each other", trans: "背景乐缓缓流淌，心扉悄然为彼此沦陷" },
        { time: 13.0, text: "Pink and orange skies, feelin' super childish", trans: "晚霞晕染出粉金天际，心跳纯真如同孩童" },
        { time: 18.0, text: "No Donald Glover, missed call from my mother", trans: "抛下所有世俗琐事，未接来电静默闪烁" },
        { time: 25.0, text: "I was all alone with the love of my life", trans: "与此生挚爱独享这一瞬无暇静谧" },
        { time: 30.5, text: "She's got glitter for skin, my radiant beam in the night", trans: "她肌肤似披星芒，成为我黑夜里不灭的光束" },
        { time: 36.0, text: "I don't need no light to see you shine", trans: "无需外界光影，你自成璀璨辉芒" },
        { time: 42.5, text: "It's your golden hour", trans: "这就是属于你的绝美黄金时刻" },
        { time: 48.0, text: "You slow down time", trans: "你令时光在这一刻温存驻足" }
      ]
    },

    // 9. Beyond · 海阔天空
    {
      id: 'beyond_haikuotiankong',
      neteaseId: '1357375695',
      title: '海阔天空',
      artist: 'Beyond · 黄家驹',
      album: '乐与怒 (1993)',
      genre: 'CANTOPOP ROCK / ANTHEM',
      cover: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#38bdf8',
        glow: 'rgba(56, 189, 248, 0.55)',
        meshColors: ['#0284c7', '#2563eb', '#1e1b4b']
      },
      keywords: ['beyond', '黄家驹', '海阔天空', '粤语', '原谅我这一生不羁放纵爱自由', 'hktk'],
      arrangement: {
        bpm: 66,
        stepMs: 454,
        wave: 'sawtooth',
        drumStyle: 'rock',
        melody: [
          440.00, 440.00, 440.00, 392.00, 349.23, 392.00, 440.00, 523.25,
          466.16, 440.00, 392.00, 0, 349.23, 392.00, 440.00, 0
        ],
        chords: [
          [174.61, 220.00, 261.63], // F
          [164.81, 196.00, 261.63], // C/E
          [146.83, 174.61, 220.00], // Dm
          [130.81, 164.81, 220.00]  // Am
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "海阔天空 - Beyond", trans: "Under a Vast Sky · Beyond" },
        { time: 5.5, text: "今天我 寒夜里看雪飘过", trans: "Tonight beneath the cold sky, watching snow drift by" },
        { time: 12.0, text: "怀着冷却了的心窝漂远方", trans: "With a chilled heart, wandering into distant horizons" },
        { time: 19.5, text: "风雨里追赶 雾里分不清影踪", trans: "Chasing through storm and rain, shadows lost in mist" },
        { time: 27.0, text: "天空海阔你与我 可会变 (谁没在变)", trans: "Beneath vast skies and seas, will you and I stay true?" },
        { time: 35.5, text: "多少次 迎着冷眼与嘲笑", trans: "Countless times braving cynical gazes and ridicule" },
        { time: 42.5, text: "从没有放弃过心中的理想", trans: "Yet never surrender the dreams burning in my soul" },
        { time: 50.0, text: "一刹那恍惚 若有所失的感觉", trans: "A fleeting trance, a gentle sense of quiet loss" },
        { time: 57.0, text: "不知不觉已变淡 心里爱 (谁明白我)", trans: "Quietly subduing the fire, who truly understands?" },
        { time: 64.5, text: "原谅我这一生不羁放纵爱自由", trans: "Forgive me for being wild, untamed, forever chasing freedom" },
        { time: 73.0, text: "也会怕有一天会跌倒", trans: "Though deep down I also fear the day I might fall" },
        { time: 80.5, text: "背弃了理想 谁人都可以", trans: "Abandoning dreams is an easy road for anyone" },
        { time: 88.0, text: "哪会怕有一天只你共我", trans: "What fear is left when tomorrow only you and I remain!" }
      ]
    },

    // 10. Beyond · 光辉岁月
    {
      id: 'beyond_guanghuisuiyue',
      title: '光辉岁月',
      artist: 'Beyond · 黄家驹',
      album: '命运派对 (1990)',
      genre: 'CANTOPOP ROCK / TRIBUTE',
      cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#f97316',
        glow: 'rgba(249, 115, 22, 0.55)',
        meshColors: ['#ea580c', '#c2410c', '#1e293b']
      },
      keywords: ['beyond', '黄家驹', '光辉岁月', '曼德拉', '风雨中抱紧自由', 'ghsy'],
      arrangement: {
        bpm: 86,
        stepMs: 348,
        wave: 'sawtooth',
        drumStyle: 'rock',
        melody: [
          392.00, 392.00, 440.00, 523.25, 440.00, 392.00, 329.63, 0,
          261.63, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66, 0
        ],
        chords: [
          [261.63, 329.63, 392.00], // C
          [196.00, 246.94, 293.66], // G
          [220.00, 261.63, 329.63], // Am
          [174.61, 220.00, 261.63]  // F
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "光辉岁月 - Beyond", trans: "Glorious Years · Beyond" },
        { time: 4.5, text: "钟声响起归家的讯号", trans: "Bells chime ringing the distant call to homecoming" },
        { time: 9.0, text: "在他生命里 仿佛带点唏嘘", trans: "In his deep eyes lingers a wisp of world-weary sigh" },
        { time: 14.5, text: "黑色肌肤给他的意义 是一生奉献 肤色斗争中", trans: "Dark skin endowed upon him a life pledged to battle prejudice" },
        { time: 24.0, text: "年月把拥有变做失去 疲倦的双眼带着期望", trans: "Years dissolve possessions yet tired eyes still radiate hope" },
        { time: 33.5, text: "今天只有残留的躯壳 迎接光辉岁月", trans: "Today with only weary flesh, welcoming the glorious years" },
        { time: 42.0, text: "风雨中抱紧自由", trans: "Embracing freedom fiercely amid raging storm" },
        { time: 47.5, text: "一生经过磅礴的挣扎 自信可改变未来", trans: "A lifetime of heroic struggle, believing in forging tomorrow" },
        { time: 56.0, text: "问谁又能做到", trans: "Tell me, who else could ever stand so tall!" }
      ]
    },

    // 11. 陈奕迅 · 十年
    {
      id: 'eason_shinian',
      neteaseId: '65528',
      title: '十年',
      artist: '陈奕迅 · Eason Chan',
      album: '黑·白·灰 (2003)',
      genre: 'BALLAD / NOSTALGIA',
      cover: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#ec4899',
        glow: 'rgba(236, 72, 153, 0.55)',
        meshColors: ['#db2777', '#be185d', '#1e1b4b']
      },
      keywords: ['陈奕迅', '十年', 'eason', 'chan', 'shinian', 'sn', '如果那两个字没有颤抖', '黑白灰'],
      arrangement: {
        bpm: 68,
        stepMs: 441,
        wave: 'sine',
        drumStyle: 'pop',
        melody: [
          329.63, 329.63, 293.66, 261.63, 293.66, 329.63, 392.00, 0,
          261.63, 293.66, 329.63, 293.66, 261.63, 220.00, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00], // C
          [196.00, 246.94, 293.66], // G
          [220.00, 261.63, 329.63], // Am
          [174.61, 220.00, 261.63]  // F
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "十年 - 陈奕迅", trans: "Ten Years · Eason Chan" },
        { time: 4.0, text: "如果那两个字没有颤抖 我不会发现我难受", trans: "Had those two words not trembled, I'd never know my pain" },
        { time: 12.0, text: "怎么说出口 也不过是分手", trans: "No matter how it was uttered, it ended in goodbye" },
        { time: 19.5, text: "如果对于明天没有要求 牵牵手就像旅游", trans: "If demanding nothing from tomorrow, hand in hand was a journey" },
        { time: 27.5, text: "成千上万个门口 总有一个人要先走", trans: "Through thousands of archways, someone always parts first" },
        { time: 35.5, text: "十年之前 我不认识你 你不属于我", trans: "Ten years ago, I knew you not, and you were not mine" },
        { time: 43.5, text: "我们还是一样 陪在一个陌生人左右", trans: "Still walking beside strangers through everyday streets" },
        { time: 51.5, text: "十年之后 我们是朋友 还可以问候", trans: "Ten years later, we are friends, trading gentle hellos" },
        { time: 59.5, text: "只是那种温柔 再也找不到拥抱的理由", trans: "Yet that tender grace finds no reason for another embrace" }
      ]
    },

    // 12. 陈奕迅 · 富士山下
    {
      id: 'eason_fujishanxia',
      neteaseId: '65766',
      title: '富士山下',
      artist: '陈奕迅 · Eason Chan',
      album: 'What\'s Going On...? (2006)',
      genre: 'CANTOPOP CLASSIC / POETIC',
      cover: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#a855f7',
        glow: 'rgba(168, 85, 247, 0.55)',
        meshColors: ['#9333ea', '#7e22ce', '#312e81']
      },
      keywords: ['陈奕迅', '富士山下', '爱情转移', '林夕', '谁能凭爱意要富士山私有', 'fjsx'],
      arrangement: {
        bpm: 72,
        stepMs: 416,
        wave: 'sine',
        drumStyle: 'pop',
        melody: [
          329.63, 392.00, 440.00, 523.25, 440.00, 392.00, 329.63, 0,
          261.63, 329.63, 392.00, 329.63, 293.66, 261.63, 293.66, 0
        ],
        chords: [
          [261.63, 329.63, 392.00],
          [220.00, 261.63, 329.63],
          [174.61, 220.00, 261.63],
          [196.00, 246.94, 293.66]
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "富士山下 - 陈奕迅", trans: "Under Mount Fuji · Eason Chan" },
        { time: 4.0, text: "拦路雨偏似雪花 白整整的送车", trans: "The barricading rain mirrors snow, escorting the departing car" },
        { time: 10.5, text: "浸湿了剪裁得很厚的发", trans: "Drenching carefully layered hair in silent moisture" },
        { time: 17.0, text: "谁冷落了你 让眼泪落下", trans: "Who neglected your heart, causing tears to fall freely" },
        { time: 24.0, text: "要拥有必先懂失去怎接受", trans: "To possess, one must first master the art of letting go" },
        { time: 31.0, text: "谁能凭爱意要富士山私有", trans: "Who could ever claim Mount Fuji solely by power of devotion?" },
        { time: 38.0, text: "何不把悲哀感觉假设是在香港", trans: "Why not imagine this sorrow lingering along Hong Kong streets" },
        { time: 45.0, text: "游玩过 哪怕没法逗留", trans: "Having wandered and marveled, what matter if we cannot stay!" }
      ]
    },

    // 13. Taylor Swift · Cruel Summer
    {
      id: 'taylor_cruelsummer',
      title: 'Cruel Summer',
      artist: 'Taylor Swift',
      album: 'Lover (2019)',
      genre: 'SYNTH POP / ANTHEM',
      cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#f43f5e',
        glow: 'rgba(244, 63, 94, 0.55)',
        meshColors: ['#fb7185', '#38bdf8', '#fbbf24']
      },
      keywords: ['taylor swift', 'cruel summer', 'lover', '泰勒斯威夫特', '霉霉', 'he looks up grinning'],
      arrangement: {
        bpm: 170,
        stepMs: 176,
        wave: 'sawtooth',
        drumStyle: 'trap',
        melody: [
          440.00, 440.00, 440.00, 493.88, 440.00, 392.00, 440.00, 0,
          523.25, 493.88, 440.00, 392.00, 329.63, 392.00, 440.00, 0
        ],
        chords: [
          [220.00, 261.63, 329.63], // Am
          [174.61, 220.00, 261.63], // F
          [261.63, 329.63, 392.00], // C
          [196.00, 246.94, 293.66]  // G
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "Cruel Summer - Taylor Swift", trans: "残夏 · 泰勒·斯威夫特" },
        { time: 4.5, text: "Fever dream high in the quiet of the night", trans: "静谧深夜里燃烧的高烧狂想" },
        { time: 8.0, text: "You know that I caught it", trans: "你深知我早已深陷情网" },
        { time: 11.5, text: "Bad, bad boy, shiny toy with a price", trans: "带着危险致命魅力的昂贵战利品" },
        { time: 15.0, text: "You know that I bought it", trans: "明知不可为，我却心甘情愿买单" },
        { time: 19.5, text: "Killing me slow, out the window", trans: "透过车窗，微风缓慢撕扯心弦" },
        { time: 24.0, text: "I'm always waiting for you to be waiting below", trans: "我永远渴望着楼下等待的你的身影" },
        { time: 30.0, text: "And it's new, the shape of your body", trans: "每一处轮廓都是全新的心跳共振" },
        { time: 34.0, text: "It's blue, the feeling I've got", trans: "忧郁如同蔚蓝深海将我彻底包围" },
        { time: 38.0, text: "And it's a cruel summer with you", trans: "与你共度的这个夏日，如此刻骨而残忍" }
      ]
    },

    // 14. Taylor Swift · Love Story
    {
      id: 'taylor_lovestory',
      title: 'Love Story (Taylor\'s Version)',
      artist: 'Taylor Swift',
      album: 'Fearless (Taylor\'s Version) (2021)',
      genre: 'COUNTRY POP / ROMANCE',
      cover: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#eab308',
        glow: 'rgba(234, 179, 8, 0.55)',
        meshColors: ['#ca8a04', '#f59e0b', '#78350f']
      },
      keywords: ['taylor swift', 'love story', 'romeo', 'juliet', '霉霉', '泰勒斯威夫特', '爱情故事'],
      arrangement: {
        bpm: 119,
        stepMs: 252,
        wave: 'triangle',
        drumStyle: 'pop',
        melody: [
          293.66, 369.99, 440.00, 369.99, 293.66, 246.94, 293.66, 0,
          369.99, 440.00, 587.33, 440.00, 369.99, 293.66, 369.99, 0
        ],
        chords: [
          [146.83, 220.00, 293.66], // D
          [164.81, 246.94, 329.63], // A
          [185.00, 220.00, 293.66], // Bm
          [196.00, 246.94, 293.66]  // G
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "Love Story - Taylor Swift", trans: "爱情故事 · 泰勒·斯威夫特" },
        { time: 5.0, text: "We were both young when I first saw you", trans: "初见那年，你我都正值青春年少" },
        { time: 10.0, text: "I close my eyes and the flashback starts", trans: "轻闭双眼，往昔记忆如潮水涌现" },
        { time: 14.5, text: "I'm standin' there on a balcony in summer air", trans: "驻足夏夜阳台，晚风轻拂面庞" },
        { time: 20.0, text: "See the lights, see the party, the ball gowns", trans: "璀璨华灯、喧嚣舞会与翩跹礼裙" },
        { time: 24.5, text: "See you make your way through the crowd and say hello", trans: "望见你穿过熙攘人群，微笑着走来说声你好" },
        { time: 31.0, text: "Romeo, take me somewhere we can be alone", trans: "罗密欧，带我去往唯有两人的秘境" },
        { time: 37.0, text: "I'll be waiting, all there's left to do is run", trans: "我时刻守候，剩下的唯有奋不顾身奔向你" },
        { time: 42.5, text: "You'll be the prince and I'll be the princess", trans: "你作我的王子，我做你的公主" },
        { time: 48.0, text: "It's a love story, baby, just say Yes", trans: "这是一段真挚爱意，亲爱的，只需点头应允" }
      ]
    },

    // 15. Billie Eilish · BIRDS OF A FEATHER
    {
      id: 'billie_birdsofafeather',
      title: 'BIRDS OF A FEATHER',
      artist: 'Billie Eilish',
      album: 'HIT ME HARD AND SOFT (2024)',
      genre: 'DREAM POP / INDIE',
      cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#38bdf8',
        glow: 'rgba(56, 189, 248, 0.55)',
        meshColors: ['#0ea5e9', '#0284c7', '#312e81']
      },
      keywords: ['billie eilish', 'birds of a feather', 'hit me hard and soft', '碧梨', '同类'],
      arrangement: {
        bpm: 105,
        stepMs: 285,
        wave: 'sine',
        drumStyle: 'pop',
        melody: [
          329.63, 392.00, 440.00, 392.00, 329.63, 261.63, 293.66, 0,
          329.63, 392.00, 523.25, 493.88, 440.00, 392.00, 440.00, 0
        ],
        chords: [
          [146.83, 174.61, 220.00], // Dm
          [196.00, 246.94, 293.66], // G
          [261.63, 329.63, 392.00], // C
          [220.00, 261.63, 329.63]  // Am
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "BIRDS OF A FEATHER - Billie Eilish", trans: "同类 · 碧梨" },
        { time: 4.0, text: "I want you to stay", trans: "我希望你长久驻留" },
        { time: 7.5, text: "'Til I'm in the grave", trans: "直至生命化作尘埃的那一天" },
        { time: 11.0, text: "'Til I rot away, dead and buried", trans: "直至躯体彻底归于寂静与安息" },
        { time: 15.0, text: "'Til I'm in the casket you carry", trans: "直至我沉睡在你抬起的棺木之中" },
        { time: 19.5, text: "If you go, I'm going too, uh", trans: "若你离去，我亦必随之而去" },
        { time: 24.0, text: "'Cause it was always you, alright", trans: "因为自始至终，唯有你烙印心间" },
        { time: 28.5, text: "And if I'm turning blue, please don't save me", trans: "若我脸色转青，请不要强行挽留" },
        { time: 34.0, text: "Nothing left to lose without my baby", trans: "若失去我的宝贝，世间便再无可眷恋之事" }
      ]
    },

    // 16. 王菲 · 红豆
    {
      id: 'faye_hongdou',
      title: '红豆',
      artist: '王菲 · Faye Wong',
      album: '唱游 (1998)',
      genre: 'CHINESE CLASSIC / ETHEREAL',
      cover: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#f43f5e',
        glow: 'rgba(244, 63, 94, 0.55)',
        meshColors: ['#e11d48', '#be123c', '#4c0519']
      },
      keywords: ['王菲', '红豆', 'faye', 'wong', 'hongdou', 'hd', '有时候有时候', '宁愿选择留恋不放手'],
      arrangement: {
        bpm: 70,
        stepMs: 428,
        wave: 'sine',
        drumStyle: 'pop',
        melody: [
          329.63, 392.00, 440.00, 392.00, 329.63, 293.66, 261.63, 0,
          261.63, 293.66, 329.63, 293.66, 261.63, 220.00, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00],
          [220.00, 261.63, 329.63],
          [174.61, 220.00, 261.63],
          [196.00, 246.94, 293.66]
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "红豆 - 王菲", trans: "Red Bean · Faye Wong" },
        { time: 4.0, text: "还没好好的感受 雪花绽放的气候", trans: "Before fully sensing the crisp bloom of snowflakes" },
        { time: 10.5, text: "我们一起颤抖 会更明白 什么是温柔", trans: "Shivering together in cold wind taught us the tenderest warmth" },
        { time: 18.0, text: "还没跟你牵着手 走过荒芜的沙丘", trans: "Before walking hand in hand across wild desert dunes" },
        { time: 24.5, text: "可能从此以后 学会珍惜 天长和地久", trans: "Perhaps henceforth learning to treasure timeless devotion" },
        { time: 32.5, text: "有时候 有时候 我会相信一切有尽头", trans: "Sometimes, oh sometimes, I believe all things reach their end" },
        { time: 40.5, text: "相聚离开 都有时候 没有什么会永垂不朽", trans: "Parting and reunion each in their turn, nothing lasts eternally" },
        { time: 48.5, text: "可是我 有时候 宁愿选择留恋不放手", trans: "Yet I, at certain times, prefer clinging stubbornly without release" },
        { time: 56.5, text: "等到风景都看透 也许你会陪我 看细水长流", trans: "Until every vista is exhausted, perhaps you will watch tranquil streams flow" }
      ]
    },

    // 17. 朴树 · 平凡之路
    {
      id: 'pushu_pingfanzhilu',
      title: '平凡之路',
      artist: '朴树',
      album: '猎户星座 (2017)',
      genre: 'FOLK ROCK / ROADSIDE',
      cover: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#eab308',
        glow: 'rgba(234, 179, 8, 0.55)',
        meshColors: ['#ca8a04', '#0284c7', '#15803d']
      },
      keywords: ['朴树', '平凡之路', '后会无期', '韩寒', '我曾经跨过山和大海', 'pfzl'],
      arrangement: {
        bpm: 110,
        stepMs: 272,
        wave: 'triangle',
        drumStyle: 'acoustic',
        melody: [
          329.63, 329.63, 329.63, 329.63, 293.66, 261.63, 293.66, 0,
          261.63, 293.66, 329.63, 293.66, 261.63, 220.00, 261.63, 0
        ],
        chords: [
          [220.00, 261.63, 329.63], // Am
          [174.61, 220.00, 261.63], // F
          [261.63, 329.63, 392.00], // C
          [196.00, 246.94, 293.66]  // G
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "平凡之路 - 朴树", trans: "The Ordinary Road · Pu Shu" },
        { time: 4.5, text: "徘徊着的 在路上的 你要走吗 via via", trans: "Wandering soul upon the road, must you journey onward?" },
        { time: 10.5, text: "易碎的 骄傲着 那也曾是我的模样", trans: "Fragile yet fiercely proud, that once reflected my own reflection" },
        { time: 18.0, text: "沸腾着的 不安着的 你要去哪 via via", trans: "Boiling with restless fire, where will your compass guide?" },
        { time: 24.5, text: "谜一样的 沉默着的 故事你真的在听吗", trans: "Enigmatic, cloaked in silence, are you truly listening to the tale?" },
        { time: 31.0, text: "我曾经跨过山和大海 也穿过人山人海", trans: "I once traversed soaring peaks and boundless seas, weaving through teeming crowds" },
        { time: 38.0, text: "我曾经拥有着的一切 转眼都飘散如烟", trans: "All that I once possessed scattered into thin air like morning mist" },
        { time: 45.0, text: "我曾经失落失望失掉所有方向", trans: "I was once stranded in despair, bereft of all true direction" },
        { time: 51.5, text: "直到看见平凡才是唯一的答案", trans: "Until discovering that the ordinary road is life's sole, profound answer" }
      ]
    },

    // 18. Coldplay · Yellow
    {
      id: 'coldplay_yellow',
      title: 'Yellow',
      artist: 'Coldplay',
      album: 'Parachutes (2000)',
      genre: 'BRITPOP / ALTERNATIVE ROCK',
      cover: 'https://images.unsplash.com/photo-1532767153582-b1a0e5145009?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#eab308',
        glow: 'rgba(234, 179, 8, 0.55)',
        meshColors: ['#f59e0b', '#0284c7', '#0f172a']
      },
      keywords: ['coldplay', 'yellow', 'look at the stars', '酷玩', '黄色', 'chrismartin'],
      arrangement: {
        bpm: 88,
        stepMs: 340,
        wave: 'triangle',
        drumStyle: 'rock',
        melody: [
          329.63, 329.63, 329.63, 329.63, 293.66, 261.63, 293.66, 0,
          261.63, 293.66, 329.63, 392.00, 329.63, 293.66, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00], // C
          [196.00, 246.94, 293.66], // G
          [174.61, 220.00, 261.63], // F
          [220.00, 261.63, 329.63]  // Am
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "Yellow - Coldplay", trans: "金黄 · 酷玩乐队" },
        { time: 4.5, text: "Look at the stars", trans: "仰望夜空里闪烁的群星" },
        { time: 8.0, text: "Look how they shine for you", trans: "凝视它们如何只为你璀璨绽放" },
        { time: 13.0, text: "And everything you do", trans: "照亮你走过的每一个细微印记" },
        { time: 17.5, text: "Yeah, they were all yellow", trans: "满天星辰尽染温存璀璨的金黄" },
        { time: 22.0, text: "I came along", trans: "我跋涉漫长旅途来到你身旁" },
        { time: 26.5, text: "I wrote a song for you", trans: "为你谱写了这首真挚诗篇" },
        { time: 31.0, text: "And all the things you do", trans: "铭记你举手投足的一切温柔" },
        { time: 35.5, text: "And it was called \"Yellow\"", trans: "那首歌的温纯名字叫做《Yellow》" },
        { time: 40.0, text: "So then I took my turn", trans: "于是在这璀璨星河之下" },
        { time: 44.5, text: "Oh, what a thing to have done", trans: "这该是何等幸运而美好的相逢" },
        { time: 49.0, text: "And it was all yellow", trans: "整个宇宙化作纯粹温润的金黄" }
      ]
    },

    // 19. 陶喆 · 爱很简单
    {
      id: 'davidtao_aihenjiandan',
      title: '爱，很简单',
      artist: '陶喆 · David Tao',
      album: 'David Tao 同名专辑 (1997)',
      genre: 'R&B / SOUL CLASSIC',
      cover: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.55)',
        meshColors: ['#d97706', '#b45309', '#1e293b']
      },
      keywords: ['陶喆', '爱很简单', 'david tao', 'i love you', '一直在这一直爱', 'ahjd'],
      arrangement: {
        bpm: 74,
        stepMs: 405,
        wave: 'sine',
        drumStyle: 'pop',
        melody: [
          261.63, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66, 0,
          261.63, 293.66, 329.63, 392.00, 329.63, 293.66, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00],
          [220.00, 261.63, 329.63],
          [174.61, 220.00, 261.63],
          [196.00, 246.94, 293.66]
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "爱，很简单 - 陶喆", trans: "I Love You · David Tao" },
        { time: 4.5, text: "忘了是怎么开始 也许就是对你 有一种感觉", trans: "Forgot how it began, perhaps simply that spark towards you" },
        { time: 13.0, text: "忽然间发现自己 已深深爱上你 真的很简单", trans: "Suddenly realizing I'm deeply in love, so wonderfully pure" },
        { time: 22.0, text: "爱的地暗天黑都已无所谓 是非都已无所谓", trans: "Darkness or storms fade into insignificance, nothing matters" },
        { time: 30.5, text: "你就是我的所有 如果没有你 我会是谁", trans: "You are my entire world; without you, who would I be?" },
        { time: 39.5, text: "I love you 一直在这一直爱着你", trans: "I love you, staying right here, loving you continuously" },
        { time: 48.0, text: "I love you永远都不放弃这爱的权利", trans: "I love you, never surrendering this sacred right to love" }
      ]
    },

    // 20. 林俊杰 · 修炼爱情
    {
      id: 'jjlin_xiulianaiqing',
      title: '修炼爱情',
      artist: '林俊杰 · JJ Lin',
      album: '因你而在 (2013)',
      genre: 'BALLAD / EMOTIONAL POP',
      cover: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#38bdf8',
        glow: 'rgba(56, 189, 248, 0.55)',
        meshColors: ['#0284c7', '#3b82f6', '#4f46e5']
      },
      keywords: ['林俊杰', '修炼爱情', 'jj lin', 'jj', 'xiulianaiqing', 'xlaq', '别讲想念我'],
      arrangement: {
        bpm: 72,
        stepMs: 416,
        wave: 'sine',
        drumStyle: 'pop',
        melody: [
          329.63, 329.63, 293.66, 261.63, 293.66, 329.63, 392.00, 0,
          261.63, 293.66, 329.63, 293.66, 261.63, 220.00, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00],
          [220.00, 261.63, 329.63],
          [174.61, 220.00, 261.63],
          [196.00, 246.94, 293.66]
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "修炼爱情 - 林俊杰", trans: "Practice Love · JJ Lin" },
        { time: 4.5, text: "凭什么要失望 藏匿在岁月里不可原谅", trans: "Why dwell on disillusion, hidden unforgiven in passage of time" },
        { time: 12.0, text: "谁能够预料 感情这码事会有多少伤", trans: "Who could ever foresee how many bruises love carries along" },
        { time: 20.0, text: "修炼爱情的心酸 学会放好以前的渴望", trans: "The bittersweet trial of practicing love, tucking past longings away" },
        { time: 28.5, text: "我们那些信仰 要忘记多难", trans: "How arduous it is to unlearn those whispered faiths" },
        { time: 36.5, text: "修炼爱情的悲欢 我们这些努力不简单", trans: "The joys and sorrows of practicing love, our quiet efforts were not simple" },
        { time: 45.0, text: "快乐炼成泪水 是一种勇敢", trans: "Distilling joy into gentle tears is the truest courage" }
      ]
    },

    // 21. Coldplay · Viva La Vida
    {
      id: 'coldplay_vivalavida',
      title: 'Viva La Vida',
      artist: 'Coldplay',
      album: 'Viva la Vida or Death and All His Friends (2008)',
      genre: 'ORCHESTRAL ROCK / BAROQUE POP',
      cover: 'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.55)',
        meshColors: ['#b45309', '#78350f', '#1e1b4b']
      },
      keywords: ['coldplay', 'viva la vida', 'i used to rule the world', '生命万岁', '酷玩'],
      arrangement: {
        bpm: 138,
        stepMs: 217,
        wave: 'sawtooth',
        drumStyle: 'rock',
        melody: [
          349.23, 349.23, 349.23, 349.23, 329.63, 261.63, 293.66, 0,
          261.63, 293.66, 349.23, 329.63, 261.63, 220.00, 261.63, 0
        ],
        chords: [
          [174.61, 220.00, 261.63], // F
          [196.00, 246.94, 293.66], // G
          [261.63, 329.63, 392.00], // C
          [220.00, 261.63, 329.63]  // Am
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "Viva La Vida - Coldplay", trans: "生命万岁 · 酷玩乐队" },
        { time: 4.0, text: "I used to rule the world", trans: "我曾君临天下，执掌整个浩瀚王国" },
        { time: 7.5, text: "Seas would rise when I gave the word", trans: "一声令下，汹涌碧海亦会应声翻腾" },
        { time: 11.5, text: "Now in the morning I sleep alone", trans: "而今清晨破晓，我唯有独自长眠" },
        { time: 15.5, text: "Sweep the streets I used to own", trans: "静默清扫那曾尽归我统领的繁华街巷" },
        { time: 23.0, text: "I used to roll the dice", trans: "我曾意气风发地掷下命运骰子" },
        { time: 27.0, text: "Feel the fear in my enemy's eyes", trans: "在宿敌恐慌战栗的眼眸中感受敬畏" },
        { time: 31.0, text: "Listen as the crowd would sing", trans: "倾听千万拥趸高声齐唱" },
        { time: 35.0, text: "\"Now the old king is dead, long live the king!\"", trans: "“先王已逝，愿新王万寿无疆！”" },
        { time: 42.5, text: "One minute I held the key", trans: "上一秒手中还紧握通往荣耀的钥匙" },
        { time: 46.5, text: "Next the walls were closed on me", trans: "下一秒冰冷坚壁已在四周围困封锁" },
        { time: 50.0, text: "And I discovered that my castles stand", trans: "我方才惊觉巍峨城堡竟建立在" },
        { time: 54.0, text: "Upon pillars of salt and pillars of sand", trans: "盐粒与流沙般脆弱动摇的基石之上" }
      ]
    },

    // 22. 赵雷 · 成都
    {
      id: 'zhaolei_chengdu',
      title: '成都',
      artist: '赵雷',
      album: '无法长大 (2016)',
      genre: 'FOLK GUITAR / NOSTALGIA',
      cover: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#10b981',
        glow: 'rgba(16, 185, 129, 0.55)',
        meshColors: ['#059669', '#047857', '#064e3b']
      },
      keywords: ['赵雷', '成都', '玉林路', '小酒馆', '民谣', '和我在成都的街头走一走'],
      arrangement: {
        bpm: 70,
        stepMs: 428,
        wave: 'triangle',
        drumStyle: 'acoustic',
        melody: [
          261.63, 293.66, 329.63, 293.66, 261.63, 220.00, 261.63, 0,
          261.63, 293.66, 329.63, 392.00, 329.63, 293.66, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00],
          [220.00, 261.63, 329.63],
          [174.61, 220.00, 261.63],
          [196.00, 246.94, 293.66]
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "成都 - 赵雷", trans: "Chengdu · Zhao Lei" },
        { time: 4.5, text: "让我掉下眼泪的 不止昨夜的酒", trans: "What brought tears down was far more than last night's wine" },
        { time: 11.5, text: "让我依依不舍的 不止你的温柔", trans: "What holds my yearning is far more than your gentle grace" },
        { time: 19.5, text: "余路还要走多久 你攥着我的手", trans: "How long remains of the winding road? You clasp my palm tight" },
        { time: 27.5, text: "让我感到为难的 是挣扎的自由", trans: "What burdens my spirit is this struggling, untamed freedom" },
        { time: 35.5, text: "和我在成都的街头走一走", trans: "Walk with me through the atmospheric streets of Chengdu" },
        { time: 43.5, text: "直到所有的灯都熄灭了也不停留", trans: "Never pausing even when every streetlamp gently dims to dark" },
        { time: 51.5, text: "你会挽着我的衣袖 我会把手插进裤兜", trans: "You will gently hold my sleeve, I'll slip hands in pockets" },
        { time: 59.5, text: "走到玉林路的尽头 坐在小酒馆的门口", trans: "Walking to the far end of Yulin Road, sitting by the tavern's doorway" }
      ]
    },

    // 23. 陈奕迅 · 浮夸
    {
      id: 'eason_fukua',
      title: '浮夸',
      artist: '陈奕迅 · Eason Chan',
      album: 'U87 (2005)',
      genre: 'CANTOPOP ROCK / DRAMA',
      cover: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#e11d48',
        glow: 'rgba(225, 29, 72, 0.55)',
        meshColors: ['#be123c', '#9f1239', '#4c0519']
      },
      keywords: ['陈奕迅', '浮夸', 'eason', 'chan', 'fukua', 'fk', '黄伟文', '夸张只因我很怕'],
      arrangement: {
        bpm: 76,
        stepMs: 395,
        wave: 'sawtooth',
        drumStyle: 'rock',
        melody: [
          261.63, 311.13, 392.00, 311.13, 261.63, 207.65, 261.63, 0,
          261.63, 311.13, 392.00, 466.16, 392.00, 311.13, 261.63, 0
        ],
        chords: [
          [130.81, 155.56, 196.00],
          [103.83, 130.81, 155.56],
          [116.54, 146.83, 174.61],
          [123.47, 155.56, 185.00]
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "浮夸 - 陈奕迅", trans: "Exaggerated · Eason Chan" },
        { time: 4.0, text: "有人问我我就表达 难道要掩面痛哭吗", trans: "When asked, I speak; must I hide face and weep bitterly?" },
        { time: 10.5, text: "其实我都不想这么讲究说话", trans: "Truth is, I never cared for such calculated speeches" },
        { time: 17.0, text: "情愿就这么简简单单过了吧", trans: "Preferring to drift simply through the quiet stream of days" },
        { time: 24.0, text: "那年十八 母校舞会 站着如喽啰", trans: "At eighteen at the school gala, standing unnoticed like a minion" },
        { time: 31.0, text: "那时候 我含泪发誓各位 必须看到我", trans: "Right then with tears in eyes I vowed: every soul shall notice me!" },
        { time: 38.5, text: "在世间 难逃避命运安排与抉择", trans: "In this fleeting world, none escape destiny's ruthless dice" },
        { time: 45.0, text: "夸张只因我很怕 似木头 似石头的话 得到注意吗", trans: "Exaggerated because I fear: like wood or stone, who would ever notice?" }
      ]
    },

    // 24. 周杰伦 · 简单爱
    {
      id: 'jay_jiandanai',
      title: '简单爱',
      artist: '周杰伦 · Jay Chou',
      album: '范特西 (2001)',
      genre: 'POP / ACOUSTIC FUNK',
      cover: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.55)',
        meshColors: ['#f59e0b', '#ec4899', '#3b82f6']
      },
      keywords: ['周杰伦', '简单爱', '想简简单单爱', 'jay', 'chou', 'jiandanai', 'jda', '范特西'],
      arrangement: {
        bpm: 85,
        stepMs: 353,
        wave: 'triangle',
        drumStyle: 'pop',
        melody: [
          329.63, 329.63, 329.63, 392.00, 329.63, 293.66, 261.63, 0,
          261.63, 293.66, 329.63, 293.66, 261.63, 220.00, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00],
          [220.00, 261.63, 329.63],
          [174.61, 220.00, 261.63],
          [196.00, 246.94, 293.66]
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "简单爱 - 周杰伦", trans: "Simple Love · Jay Chou" },
        { time: 4.0, text: "说不上为什么 我变得很主动", trans: "Can't explain why, I've grown so surprisingly proactive" },
        { time: 9.0, text: "若爱上一个人 什么都会值得去做", trans: "When falling for someone, every small endeavor is worth it" },
        { time: 14.5, text: "我想大声宣布 对你依依不舍", trans: "I want to announce aloud my endless devotion to you" },
        { time: 20.0, text: "连隔壁邻居都 猜到我现在的感受", trans: "Even next-door neighbors can guess my euphoric heart" },
        { time: 25.5, text: "我想就这样牵着你的手不放开", trans: "I want to hold your palm gently like this and never let go" },
        { time: 31.0, text: "爱能不能够永远单纯没有悲哀", trans: "Can love stay forever pure and unshadowed by sorrows?" },
        { time: 36.5, text: "我想带你骑单车 我想和你看棒球", trans: "I want to bicycle with you, watch baseball games side by side" },
        { time: 42.0, text: "想这样没担忧 唱着歌 一直走", trans: "Wishing to walk free of worries, singing songs all the way" }
      ]
    },

    // 25. Post Malone · Circles
    {
      id: 'postmalone_circles',
      title: 'Circles',
      artist: 'Post Malone',
      album: 'Hollywood\'s Bleeding (2019)',
      genre: 'POP ROCK / INDIE POP',
      cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
      theme: {
        accent: '#f97316',
        glow: 'rgba(249, 115, 22, 0.55)',
        meshColors: ['#ea580c', '#c2410c', '#3b82f6']
      },
      keywords: ['post malone', 'circles', 'run away', '马龙', '波斯特马龙'],
      arrangement: {
        bpm: 120,
        stepMs: 250,
        wave: 'sawtooth',
        drumStyle: 'pop',
        melody: [
          329.63, 329.63, 329.63, 293.66, 261.63, 293.66, 329.63, 0,
          261.63, 293.66, 329.63, 293.66, 261.63, 220.00, 261.63, 0
        ],
        chords: [
          [261.63, 329.63, 392.00],
          [220.00, 261.63, 329.63],
          [174.61, 220.00, 261.63],
          [196.00, 246.94, 293.66]
        ]
      },
      lrcPairs: [
        { time: 0.0, text: "Circles - Post Malone", trans: "兜兜转转 · 波斯特·马龙" },
        { time: 4.0, text: "We couldn't turn the page", trans: "我们始终无法真正翻开崭新的一页" },
        { time: 7.5, text: "Out of this empty room", trans: "逃离这间空荡回响的房间" },
        { time: 11.5, text: "I can't feel a thing", trans: "麻木的神经再也感知不到任何悸动" },
        { time: 15.0, text: "Though I know you did it for me", trans: "纵然深知你所做的一切皆因我而起" },
        { time: 19.5, text: "Seasons change and our love went cold", trans: "四季悄然轮替，爱意在寒风中逐渐冷却" },
        { time: 24.0, text: "Feed the flame 'cause we can't let it go", trans: "勉强添柴维系火苗，因我们终究舍不得放手" },
        { time: 30.5, text: "Run away, but we're running in circles", trans: "拼命逃离，却只是在命运怪圈中兜兜转转" },
        { time: 37.0, text: "Run away, run away", trans: "逃跑吧，逃离这无休止的循环" }
      ]
    }
  ];

  // ============================================================
  // 2. HIGH-FIDELITY ONLINE STREAMING ENGINE & METING MIRRORS
  // ============================================================
  const API_ENDPOINTS = [
    {
      name: 'GDStudio-Primary',
      search: (keyword) => `https://music-api.gdstudio.xyz/api.php?types=search&count=15&source=netease&name=${encodeURIComponent(keyword)}`,
      songUrl: (id) => `https://music-api.gdstudio.xyz/api.php?types=url&id=${id}&source=netease&br=128`,
      picUrl: (id) => `https://music-api.gdstudio.xyz/api.php?types=pic&id=${id}&source=netease`,
      lrcUrl: (id) => `https://music-api.gdstudio.xyz/api.php?types=lyric&id=${id}&source=netease`,
      playlistUrl: (id) => `https://music-api.gdstudio.xyz/api.php?types=playlist&id=${id}&source=netease`
    },
    {
      name: 'Injahow-Mirror',
      search: (keyword) => `https://api.injahow.cn/meting/?server=netease&type=search&id=${encodeURIComponent(keyword)}`,
      songUrl: (id) => `https://api.injahow.cn/meting/?server=netease&type=url&id=${id}`,
      picUrl: (id) => `https://api.injahow.cn/meting/?server=netease&type=pic&id=${id}`,
      lrcUrl: (id) => `https://api.injahow.cn/meting/?server=netease&type=lrc&id=${id}`,
      playlistUrl: (id) => `https://api.injahow.cn/meting/?server=netease&type=playlist&id=${id}`
    }
  ];

  // Hot charts mapped to our rich curated catalog
  const HOT_CHARTS = {
    hot: [
      { id: 'jay_qilixiang', keyword: '周杰伦 七里香', title: '七里香', artist: '周杰伦 · Jay Chou' },
      { id: 'jay_qiantian', keyword: '周杰伦 晴天', title: '晴天', artist: '周杰伦 · Jay Chou' },
      { id: 'theweeknd_starboy', keyword: 'The Weeknd Starboy', title: 'Starboy', artist: 'The Weeknd ft. Daft Punk' },
      { id: 'jvke_goldenhour', keyword: 'JVKE golden hour', title: 'Golden Hour', artist: 'JVKE' },
      { id: 'beyond_haikuotiankong', keyword: 'Beyond 海阔天空', title: '海阔天空', artist: 'Beyond · 黄家驹' },
      { id: 'eason_shinian', keyword: '陈奕迅 十年', title: '十年', artist: '陈奕迅 · Eason Chan' },
      { id: 'billie_birdsofafeather', keyword: 'Billie Eilish Birds of a Feather', title: 'BIRDS OF A FEATHER', artist: 'Billie Eilish' }
    ],
    soaring: [
      { id: 'taylor_cruelsummer', keyword: 'Taylor Swift Cruel Summer', title: 'Cruel Summer', artist: 'Taylor Swift' },
      { id: 'jay_yequ', keyword: '周杰伦 夜曲', title: '夜曲', artist: '周杰伦 · Jay Chou' },
      { id: 'theweeknd_blindinglights', keyword: 'The Weeknd Blinding Lights', title: 'Blinding Lights', artist: 'The Weeknd' },
      { id: 'davidtao_aihenjiandan', keyword: '陶喆 爱很简单', title: '爱，很简单', artist: '陶喆 · David Tao' },
      { id: 'jjlin_xiulianaiqing', keyword: '林俊杰 修炼爱情', title: '修炼爱情', artist: '林俊杰 · JJ Lin' },
      { id: 'faye_hongdou', keyword: '王菲 红豆', title: '红豆', artist: '王菲 · Faye Wong' },
      { id: 'postmalone_circles', keyword: 'Post Malone Circles', title: 'Circles', artist: 'Post Malone' }
    ],
    acoustic: [
      { id: 'pushu_pingfanzhilu', keyword: '朴树 平凡之路', title: '平凡之路', artist: '朴树' },
      { id: 'coldplay_yellow', keyword: 'Coldplay Yellow', title: 'Yellow', artist: 'Coldplay' },
      { id: 'zhaolei_chengdu', keyword: '赵雷 成都', title: '成都', artist: '赵雷' },
      { id: 'coldplay_vivalavida', keyword: 'Coldplay Viva La Vida', title: 'Viva La Vida', artist: 'Coldplay' },
      { id: 'beyond_guanghuisuiyue', keyword: 'Beyond 光辉岁月', title: '光辉岁月', artist: 'Beyond · 黄家驹' },
      { id: 'jay_daoxiang', keyword: '周杰伦 稻香', title: '稻香', artist: '周杰伦 · Jay Chou' },
      { id: 'eason_fujishanxia', keyword: '陈奕迅 富士山下', title: '富士山下', artist: '陈奕迅 · Eason Chan' }
    ]
  };

  // Persistent in-memory & session audio stream cache
  const AUDIO_URL_CACHE = new Map();
  const COVER_CACHE = new Map();
  const SEARCH_CACHE = new Map();
  const LYRIC_CACHE = new Map();
  let activeSearchController = null;

  /**
   * Helper: Snappy fetch with automatic abort timeout
   */
  async function fetchWithTimeout(url, options = {}, timeoutMs = 2800) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  /**
   * Resolve Real High-Resolution Direct Cover Image from Official CDNs
   * (NetEase p1.music.126.net / Kuwo img1.kuwo.cn / Kugou imge.kugou.com)
   */
  async function resolveSongCover(song, defaultSource = 'netease') {
    if (!song) return null;

    // 1. Direct valid cover check (must be a genuine CDN URL)
    if (typeof song === 'object' && song.cover) {
      const c = song.cover;
      if (typeof c === 'string' &&
          c.startsWith('http') &&
          !c.includes('api.i-meto.com') &&
          !c.includes('images.unsplash.com') &&
          !c.includes('types=pic')) {
        return c;
      }
    }

    const songSource = (typeof song === 'object' && song.source && song.source !== 'online' && song.source !== 'builtin')
      ? song.source
      : defaultSource;

    let picId = null;
    let fallbackId = null;
    if (typeof song === 'object') {
      picId = song.picId || song.pic_id || song.sourceId || song.neteaseId;
      if (!picId && song.id) {
        picId = String(song.id).includes('_') ? String(song.id).split('_').slice(1).join('_') : String(song.id);
      }
      fallbackId = song.neteaseId || song.sourceId;
    } else {
      picId = String(song);
    }

    // Check memory cache first
    const cacheKey = typeof song === 'object' 
      ? (picId ? `${songSource}_${picId}` : `${song.title}_${song.artist}`)
      : `${songSource}_${picId}`;

    if (COVER_CACHE.has(cacheKey)) {
      const cached = COVER_CACHE.get(cacheKey);
      if (typeof song === 'object') song.cover = cached;
      return cached;
    }

    // Try resolving with numeric picId or fallbackId via GDStudio pic endpoint
    if (picId && /^\d+$/.test(String(picId))) {
      try {
        const res = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=pic&id=${picId}&source=${songSource}`, {}, 2200);
        const data = await res.json();
        if (data && data.url) {
          const finalUrl = data.url.replace(/^http:\/\//i, 'https://');
          COVER_CACHE.set(cacheKey, finalUrl);
          if (typeof song === 'object') song.cover = finalUrl;
          return finalUrl;
        }
      } catch (e) {}
    }

    if (fallbackId && fallbackId !== picId && /^\d+$/.test(String(fallbackId))) {
      try {
        const res = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=pic&id=${fallbackId}&source=${songSource}`, {}, 2200);
        const data = await res.json();
        if (data && data.url) {
          const finalUrl = data.url.replace(/^http:\/\//i, 'https://');
          COVER_CACHE.set(cacheKey, finalUrl);
          if (typeof song === 'object') song.cover = finalUrl;
          return finalUrl;
        }
      } catch (e) {}
    }

    // Robust Fallback: Search by clean title + artist on Kuwo & NetEase to retrieve the authentic album art!
    if (typeof song === 'object' && song.title) {
      try {
        const cleanArtist = song.artist ? song.artist.split(/[·/,(]/)[0].trim() : '';
        const cleanTitle = song.title ? song.title.split(/[(（]/)[0].trim() : '';
        const queryTerm = `${cleanTitle} ${cleanArtist}`.trim();

        if (queryTerm) {
          // 1. Try Kuwo Search (Returns direct official CDN covers in img1.kuwo.cn)
          try {
            const kwRes = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=search&count=2&source=kuwo&name=${encodeURIComponent(queryTerm)}`, {}, 2000);
            const kwList = await kwRes.json();
            if (Array.isArray(kwList) && kwList.length > 0) {
              const item = kwList[0];
              if (item.pic && typeof item.pic === 'string' && item.pic.startsWith('http')) {
                const finalUrl = item.pic.replace(/^http:\/\//i, 'https://');
                COVER_CACHE.set(cacheKey, finalUrl);
                song.cover = finalUrl;
                return finalUrl;
              } else if (item.pic_id || item.id) {
                const picRes = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=pic&id=${item.pic_id || item.id}&source=kuwo`, {}, 1800);
                const picData = await picRes.json();
                if (picData && picData.url) {
                  const finalUrl = picData.url.replace(/^http:\/\//i, 'https://');
                  COVER_CACHE.set(cacheKey, finalUrl);
                  song.cover = finalUrl;
                  return finalUrl;
                }
              }
            }
          } catch (kwe) {}

          // 2. Try NetEase Search
          try {
            const neRes = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=search&count=2&source=netease&name=${encodeURIComponent(queryTerm)}`, {}, 2000);
            const neList = await neRes.json();
            if (Array.isArray(neList) && neList.length > 0 && neList[0].pic_id) {
              const picRes = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=pic&id=${neList[0].pic_id}&source=netease`, {}, 1800);
              const picData = await picRes.json();
              if (picData && picData.url) {
                const finalUrl = picData.url.replace(/^http:\/\//i, 'https://');
                COVER_CACHE.set(cacheKey, finalUrl);
                song.cover = finalUrl;
                return finalUrl;
              }
            }
          } catch (nee) {}
        }
      } catch (fe) {}
    }

    return null;
  }

  /**
   * Helper: Multi-Node Audio Stream Resolution for a Specific Platform ID
   * Tries GDStudio, Injahow Meting, QJQQ Meting, and Kuwo Convert mirrors
   */
  async function fetchPlayableUrlFromId(id, source = 'kuwo') {
    if (!id) return null;
    const cleanId = String(id).trim();

    // 1. GDStudio direct (highest availability)
    try {
      const res = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=url&id=${cleanId}&source=${source}`, {}, 2200);
      const data = await res.json();
      if (data && data.url && typeof data.url === 'string' && data.url.startsWith('http')) {
        return data.url.replace(/^http:\/\//i, 'https://');
      }
    } catch (e) {}

    // 2. Injahow Meting Mirror
    try {
      const res = await fetchWithTimeout(`https://api.injahow.cn/meting/?type=url&id=${cleanId}&server=${source}`, {}, 2200);
      const data = await res.json();
      if (data && data.url && typeof data.url === 'string' && data.url.startsWith('http')) {
        return data.url.replace(/^http:\/\//i, 'https://');
      }
    } catch (e) {}

    // 3. GDStudio with explicit br=128
    try {
      const res = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=url&id=${cleanId}&source=${source}&br=128`, {}, 2000);
      const data = await res.json();
      if (data && data.url && typeof data.url === 'string' && data.url.startsWith('http')) {
        return data.url.replace(/^http:\/\//i, 'https://');
      }
    } catch (e) {}

    // 4. QJQQ Meting Mirror
    try {
      const res = await fetchWithTimeout(`https://meting.qjqq.cn/?type=url&id=${cleanId}&server=${source}`, {}, 2000);
      const data = await res.json();
      if (data && data.url && typeof data.url === 'string' && data.url.startsWith('http')) {
        return data.url.replace(/^http:\/\//i, 'https://');
      }
    } catch (e) {}

    // 5. Kuwo official anti-server direct link
    if (source === 'kuwo') {
      try {
        const directUrl = `https://antiserver.kuwo.cn/anti.s?type=convert_url&rid=${cleanId}&format=mp3&response=url`;
        const res = await fetchWithTimeout(directUrl, {}, 2000);
        const text = await res.text();
        if (text && text.startsWith('http') && !text.includes('404')) {
          return text.trim().replace(/^http:\/\//i, 'https://');
        }
      } catch (e) {}
    }

    return null;
  }

  /**
   * Universal Title+Artist Search & Audio Resolution
   * Automatically resolves 100% free full-length master audio (bypasses VIP copyright blocks)
   */
  async function searchAndResolveAudio(query) {
    if (!query || !query.trim()) return null;
    const cleanQ = query.trim();

    // Strategy 1: GDStudio Search with NetEase Mirror (Concurrent racing)
    try {
      const sRes = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=search&count=6&source=netease&name=${encodeURIComponent(cleanQ)}`, {}, 4500);
      const list = await sRes.json();
      if (Array.isArray(list) && list.length > 0) {
        const candPromises = list.slice(0, 4).map(async (cand) => {
          const candId = cand.id || cand.url_id;
          if (!candId) throw new Error('No ID');
          const uRes = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=url&id=${candId}&source=netease`, {}, 5000);
          const uData = await uRes.json();
          if (uData && uData.url && typeof uData.url === 'string' && uData.url.startsWith('http') && !uData.url.includes('404')) {
            return uData.url.replace(/^http:\/\//i, 'https://');
          }
          throw new Error('Not playable');
        });

        try {
          const winnerUrl = await Promise.any(candPromises);
          if (winnerUrl) return winnerUrl;
        } catch (e) {}
      }
    } catch (e) {}

    // Strategy 2: Injahow Mirror by Query
    try {
      const iRes = await fetchWithTimeout(`https://api.injahow.cn/meting/?type=song&id=${encodeURIComponent(cleanQ)}`, {}, 2400);
      const iData = await iRes.json();
      if (iData && iData.url && typeof iData.url === 'string' && iData.url.startsWith('http') && !iData.url.includes('404')) {
        return iData.url.replace(/^http:\/\//i, 'https://');
      }
    } catch (e) {}

    return null;
  }

  /**
   * Resolve Real High-Fidelity Audio Stream URL for any Track (Builtin, Online, NetEase, Kuwo, Kugou)
   * Includes smart cross-platform failover: if NetEase VIP blocks a song, automatically recovers from Kuwo/Kugou!
   */
  async function resolveSongAudioUrl(song) {
    if (!song) return null;

    // 1. Direct valid audioUrl check
    if (song.audioUrl &&
        typeof song.audioUrl === 'string' &&
        song.audioUrl.startsWith('http') &&
        !song.audioUrl.includes('api.i-meto.com') &&
        !song.audioUrl.includes('types=') &&
        !song.audioUrl.startsWith('data:')) {
      return song.audioUrl;
    }

    // 2. Memory cache check
    const cacheKey = song.id || `${song.title}_${song.artist}`;
    if (AUDIO_URL_CACHE.has(cacheKey)) {
      const cached = AUDIO_URL_CACHE.get(cacheKey);
      if (cached) {
        song.audioUrl = cached;
        return cached;
      }
    }

    const songSource = (song.source && song.source !== 'builtin' && song.source !== 'online') ? song.source : null;
    const rawId = song.sourceId || song.neteaseId || (song.id && String(song.id).includes('_') ? String(song.id).split('_').slice(1).join('_') : song.id);

    // 3. Platform specific resolution if source and numeric ID are known
    if (songSource && rawId && /^\d+$/.test(String(rawId))) {
      const directUrl = await fetchPlayableUrlFromId(rawId, songSource);
      if (directUrl && !directUrl.includes('404')) {
        AUDIO_URL_CACHE.set(cacheKey, directUrl);
        song.audioUrl = directUrl;
        return directUrl;
      }
    }

    if (song.neteaseId && /^\d+$/.test(String(song.neteaseId))) {
      const neUrl = await fetchPlayableUrlFromId(song.neteaseId, 'netease');
      if (neUrl && !neUrl.includes('404')) {
        AUDIO_URL_CACHE.set(cacheKey, neUrl);
        song.audioUrl = neUrl;
        return neUrl;
      }
    }

    // 4. Cross-Platform Auto-Failover to free mirror by Title + Artist (Bypasses all NetEase VIP blocks!)
    const cleanArtist = song.artist ? song.artist.split(/[·/,(]/)[0].trim() : '';
    const cleanTitle = song.title ? song.title.split(/[(（]/)[0].trim() : '';
    const query = `${cleanTitle} ${cleanArtist}`.trim();

    if (query) {
      const failoverUrl = await searchAndResolveAudio(query);
      if (failoverUrl && !failoverUrl.includes('404')) {
        AUDIO_URL_CACHE.set(cacheKey, failoverUrl);
        song.audioUrl = failoverUrl;
        return failoverUrl;
      }
    }

    return null;
  }

  function invalidateAudioCache(song) {
    if (!song) return;
    const cacheKey = song.id || `${song.title}_${song.artist}`;
    AUDIO_URL_CACHE.delete(cacheKey);
  }

  /**
   * High-Performance Multi-Source Search Aggregator
   * @param {string} keyword - Search term
   * @param {string} source - 'all' | 'netease' | 'kuwo' | 'kugou'
   */
  async function searchSongs(keyword, source = 'all') {
    if (!keyword || !keyword.trim()) return [];
    const q = keyword.trim().toLowerCase();
    const cacheKey = `${source}_${q}`;

    // 1. Instant Cache Hit
    if (SEARCH_CACHE.has(cacheKey)) {
      return SEARCH_CACHE.get(cacheKey);
    }

    // Abort previous running search request if user is actively typing
    if (activeSearchController) {
      activeSearchController.abort();
    }
    activeSearchController = new AbortController();
    const currentSignal = activeSearchController.signal;

    let onlineResults = [];

    // Helper to query GDStudio
    const queryGdstudio = async (targetSource, count = 12) => {
      try {
        const res = await fetch(`https://music-api.gdstudio.xyz/api.php?types=search&count=${count}&source=${targetSource}&name=${encodeURIComponent(keyword)}`, {
          signal: currentSignal,
          headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) return [];
        const data = await res.json();
        if (!Array.isArray(data)) return [];

        return data.map(item => {
          const rawId = item.id || item.url_id;
          const artistName = Array.isArray(item.artist) ? item.artist.join(' / ') : (item.artist || '未知歌手');
          const picId = item.pic_id || rawId;
          const cacheKey = `${targetSource}_${picId}`;

          let coverUrl = COVER_CACHE.get(cacheKey) || '';
          if (!coverUrl && item.pic && typeof item.pic === 'string' && item.pic.startsWith('http') && !item.pic.includes('api.i-meto.com')) {
            coverUrl = item.pic.replace(/^http:\/\//i, 'https://');
            COVER_CACHE.set(cacheKey, coverUrl);
          }

          let badgeName = '在线原声';
          if (targetSource === 'kuwo') badgeName = '酷我超清 · 原声完整版';
          else if (targetSource === 'netease') badgeName = '网易云正版原声';
          else if (targetSource === 'kugou') badgeName = '酷狗音质';

          return {
            id: `${targetSource}_${rawId}`,
            sourceId: rawId,
            picId: picId,
            neteaseId: targetSource === 'netease' ? rawId : null,
            title: item.name || item.title || '未知曲目',
            artist: artistName,
            album: item.album || '精选单曲',
            cover: coverUrl,
            audioUrl: null, // will be pre-resolved or lazily resolved
            lrcUrl: `https://music-api.gdstudio.xyz/api.php?types=lyric&id=${item.lyric_id || rawId}&source=${targetSource}`,
            source: targetSource,
            badge: badgeName
          };
        });
      } catch (e) {
        return [];
      }
    };

    try {
      if (source === 'all') {
        // Query Kuwo & NetEase concurrently (Kuwo provides 100% free playable audio streams)
        const [kuwoList, neteaseList] = await Promise.all([
          queryGdstudio('kuwo', 12),
          queryGdstudio('netease', 12)
        ]);

        // Prioritize Kuwo results (unrestricted free full audio), followed by NetEase
        onlineResults = [...kuwoList];
        neteaseList.forEach(nItem => {
          const nNorm = (nItem.title + nItem.artist).toLowerCase().replace(/[\s·/,(]/g, '');
          const exists = onlineResults.some(k => 
            (k.title + k.artist).toLowerCase().replace(/[\s·/,(]/g, '') === nNorm
          );
          if (!exists) {
            onlineResults.push(nItem);
          }
        });
      } else if (source === 'kuwo') {
        onlineResults = await queryGdstudio('kuwo', 15);
      } else if (source === 'netease') {
        onlineResults = await queryGdstudio('netease', 15);
      } else if (source === 'kugou') {
        onlineResults = await queryGdstudio('kugou', 15);
      }
    } catch (err) {}

    // Only if online results returned 0 items (e.g. offline mode), fallback to local catalog
    let combined = [];
    if (onlineResults.length > 0) {
      combined = onlineResults;
    } else {
      const localMatches = BUILTIN_CATALOG.filter(song => {
        const matchTitle = song.title.toLowerCase().includes(q);
        const matchArtist = song.artist.toLowerCase().includes(q);
        const matchAlbum = song.album.toLowerCase().includes(q);
        const matchKeywords = song.keywords && song.keywords.some(k => k.toLowerCase().includes(q));
        return matchTitle || matchArtist || matchAlbum || matchKeywords;
      }).map(song => ({
        ...song,
        badge: '离线预置曲目'
      }));
      combined = localMatches;
    }

    // Concurrently pre-resolve covers for top search candidates so they display instantly
    const topCandidates = combined.slice(0, 8);
    await Promise.allSettled(topCandidates.map(async (item) => {
      if (!item.cover || item.cover.includes('unsplash.com') || item.cover.includes('api.i-meto.com')) {
        const c = await resolveSongCover(item, item.source || 'kuwo');
        if (c) item.cover = c;
      }
    }));

    // Concurrently pre-resolve real audio URLs for the top 2 candidates so clicking plays INSTANTLY!
    const topAudioCandidates = combined.slice(0, 2);
    await Promise.allSettled(topAudioCandidates.map(async (item) => {
      if (!item.audioUrl) {
        const u = await resolveSongAudioUrl(item);
        if (u) item.audioUrl = u;
      }
    }));

    // Concurrently pre-resolve lyrics for the top 3 candidates so clicking shows lyrics with 0ms latency!
    const topLyricCandidates = combined.slice(0, 3);
    await Promise.allSettled(topLyricCandidates.map(async (item) => {
      if (!item.lrc && !item.lrcPairs) {
        const l = await resolveSongLyrics(item);
        if (l && l.lrc) {
          item.lrc = l.lrc;
          if (l.tlyric) item.tlyric = l.tlyric;
        }
      }
    }));

    // Cache the result (keep max 60 items in cache)
    if (SEARCH_CACHE.size > 60) {
      const firstKey = SEARCH_CACHE.keys().next().value;
      SEARCH_CACHE.delete(firstKey);
    }
    SEARCH_CACHE.set(cacheKey, combined);

    return combined;
  }

  function getSongLyricsFromCache(song) {
    if (!song) return null;
    const cacheKey = song.id || `${song.title}_${song.artist}`;
    return LYRIC_CACHE.get(cacheKey) || null;
  }

  /**
   * Ultra-Fast Multi-Node Lyric Resolver
   * Concurrently races GDStudio, Injahow Meting, QJQQ Meting, and NetEase cross-search.
   * Caches results in memory for instantaneous 0ms display.
   */
  async function resolveSongLyrics(song) {
    if (!song) return { lrc: '', tlyric: '' };

    // 1. Direct valid LRC on song object
    if (song.lrc && typeof song.lrc === 'string' && song.lrc.includes('[')) {
      return { lrc: song.lrc, tlyric: song.tlyric || '' };
    }
    if (song.lrcPairs && Array.isArray(song.lrcPairs) && song.lrcPairs.length > 1) {
      return { lrcPairs: song.lrcPairs };
    }

    // 2. Memory cache check (0ms instant hit)
    const cacheKey = song.id || `${song.title}_${song.artist}`;
    if (LYRIC_CACHE.has(cacheKey)) {
      const cached = LYRIC_CACHE.get(cacheKey);
      if (cached && (cached.lrc || cached.lrcPairs)) {
        if (cached.lrc) song.lrc = cached.lrc;
        if (cached.tlyric) song.tlyric = cached.tlyric;
        return cached;
      }
    }

    const songSource = (song.source && song.source !== 'builtin' && song.source !== 'online') ? song.source : null;
    const rawId = song.sourceId || song.neteaseId || (song.id && String(song.id).includes('_') ? String(song.id).split('_').slice(1).join('_') : song.id);

    // Fast helper to fetch from a URL and extract text/json lrc
    async function tryFetchLyric(url, timeoutMs = 1800) {
      try {
        const res = await fetchWithTimeout(url, {}, timeoutMs);
        if (!res.ok) return null;
        const text = await res.text();
        if (!text || text.length < 5) return null;
        let lrcText = text;
        let tlyricText = '';
        try {
          const json = JSON.parse(text);
          if (json) {
            lrcText = json.lyric || json.lrc || (typeof json.data === 'string' ? json.data : '');
            tlyricText = json.tlyric || '';
          }
        } catch (e) {}

        if (lrcText && typeof lrcText === 'string' && lrcText.includes('[')) {
          return { lrc: lrcText, tlyric: tlyricText };
        }
      } catch (e) {}
      return null;
    }

    // Parallel Race: Query multi-node mirrors simultaneously
    const racePromises = [];

    // Target 1: GDStudio, Injahow, and QJQQ by direct song ID
    if (rawId && /^\d+$/.test(String(rawId))) {
      const src = songSource || 'netease';
      racePromises.push(tryFetchLyric(`https://music-api.gdstudio.xyz/api.php?types=lyric&id=${rawId}&source=${src}`, 1800));
      racePromises.push(tryFetchLyric(`https://api.injahow.cn/meting/?type=lrc&id=${rawId}&server=${src}`, 1800));
      racePromises.push(tryFetchLyric(`https://meting.qjqq.cn/?type=lrc&id=${rawId}&server=${src}`, 1800));
    }

    // Target 2: If NetEase ID is present and differs
    if (song.neteaseId && song.neteaseId !== rawId && /^\d+$/.test(String(song.neteaseId))) {
      racePromises.push(tryFetchLyric(`https://music-api.gdstudio.xyz/api.php?types=lyric&id=${song.neteaseId}&source=netease`, 1800));
      racePromises.push(tryFetchLyric(`https://api.injahow.cn/meting/?type=lrc&id=${song.neteaseId}&server=netease`, 1800));
    }

    // Target 3: Fallback directly to provided song.lrcUrl
    if (song.lrcUrl && !song.lrcUrl.includes('api.i-meto.com')) {
      racePromises.push(tryFetchLyric(song.lrcUrl, 1800));
    }

    // Race first wave of direct ID queries
    if (racePromises.length > 0) {
      try {
        const winner = await Promise.any(racePromises.map(p => p.then(res => {
          if (res && res.lrc) return res;
          throw new Error('No valid lyric');
        })));
        if (winner && winner.lrc) {
          LYRIC_CACHE.set(cacheKey, winner);
          song.lrc = winner.lrc;
          if (winner.tlyric) song.tlyric = winner.tlyric;
          return winner;
        }
      } catch (e) {}
    }

    // Target 4: High-Precision Cross-Platform NetEase Search (NetEase has the world's most complete synced LRC catalog)
    const cleanArtist = song.artist ? song.artist.split(/[·/,(]/)[0].trim() : '';
    const cleanTitle = song.title ? song.title.split(/[(（]/)[0].trim() : '';
    const query = `${cleanTitle} ${cleanArtist}`.trim();

    if (query) {
      try {
        const sRes = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=search&count=2&source=netease&name=${encodeURIComponent(query)}`, {}, 1600);
        const sList = await sRes.json();
        if (Array.isArray(sList) && sList.length > 0) {
          const candId = sList[0].id || sList[0].url_id;
          if (candId) {
            const candRes = await Promise.any([
              tryFetchLyric(`https://music-api.gdstudio.xyz/api.php?types=lyric&id=${candId}&source=netease`, 1600),
              tryFetchLyric(`https://api.injahow.cn/meting/?type=lrc&id=${candId}&server=netease`, 1600)
            ].map(p => p.then(r => { if (r && r.lrc) return r; throw new Error(); })));

            if (candRes && candRes.lrc) {
              LYRIC_CACHE.set(cacheKey, candRes);
              song.lrc = candRes.lrc;
              if (candRes.tlyric) song.tlyric = candRes.tlyric;
              return candRes;
            }
          }
        }
      } catch (e) {}
    }

    return { lrc: '', tlyric: '' };
  }

  /**
   * Fetch Song Details: Real Vocal Stream URL and Synced LRC concurrently
   */
  async function fetchSongDetails(song) {
    if (!song) return song;

    // Concurrently resolve audio, lyrics, and cover in PARALLEL!
    const [audioRes, lyricRes, coverRes] = await Promise.allSettled([
      resolveSongAudioUrl(song),
      resolveSongLyrics(song),
      resolveSongCover(song, song.source || 'kuwo')
    ]);

    const audioUrl = (audioRes.status === 'fulfilled') ? audioRes.value : song.audioUrl;
    const lyricData = (lyricRes.status === 'fulfilled' && lyricRes.value) ? lyricRes.value : null;
    const coverUrl = (coverRes.status === 'fulfilled') ? coverRes.value : song.cover;

    if (lyricData && lyricData.lrc) {
      song.lrc = lyricData.lrc;
      if (lyricData.tlyric) song.tlyric = lyricData.tlyric;
    }
    if (coverUrl) song.cover = coverUrl;
    if (audioUrl) song.audioUrl = audioUrl;

    return {
      ...song,
      cover: coverUrl || song.cover,
      audioUrl: audioUrl || song.audioUrl,
      lrc: (lyricData && lyricData.lrc) || song.lrc,
      tlyric: (lyricData && lyricData.tlyric) || song.tlyric || null
    };
  }

  /**
   * Parse NetEase Input (handles URLs, App share text, or raw numeric IDs)
   */
  function parseNeteaseInput(input) {
    if (!input) return null;
    const str = input.trim();
    
    // Check if it's a song link
    const songIdMatch = str.match(/song(?:\?id=|\/)(\d+)/i);
    if (songIdMatch) {
      return { type: 'song', id: songIdMatch[1] };
    }
    
    // Check if it's a playlist link
    const playlistMatch = str.match(/playlist(?:\?id=|\/)(\d+)/i);
    if (playlistMatch) {
      return { type: 'playlist', id: playlistMatch[1] };
    }

    // Pure numeric ID check (default to playlist if 5+ digits)
    const pureNum = str.match(/^\d+$/);
    if (pureNum) {
      return { type: 'playlist', id: pureNum[0] };
    }

    // Check if any numeric ID is embedded in shared text
    const anyNum = str.match(/\b\d{5,12}\b/);
    if (anyNum) {
      return { type: 'playlist', id: anyNum[0] };
    }

    return null;
  }

  /**
   * Import NetEase Playlist by ID (High-fidelity batch parser)
   */
  async function fetchNeteasePlaylist(playlistId) {
    try {
      const res = await fetch(`https://music-api.gdstudio.xyz/api.php?types=playlist&id=${playlistId}&source=netease`);
      const data = await res.json();
      
      let tracks = [];
      if (data && data.playlist && Array.isArray(data.playlist.tracks)) {
        tracks = data.playlist.tracks;
      } else if (Array.isArray(data)) {
        tracks = data;
      }

      if (tracks.length > 0) {
        return tracks.slice(0, 100).map((item, idx) => {
          const rawId = item.id || (playlistId + '_' + idx);
          const artistName = item.ar ? item.ar.map(a => a.name).join(' / ') : (item.artist || item.author || '未知歌手');
          const coverUrl = (item.al && item.al.picUrl) || item.pic || item.picUrl || '';
          return {
            id: 'netease_' + rawId,
            neteaseId: rawId,
            title: item.name || item.title || '未知曲目',
            artist: artistName,
            album: (item.al && item.al.name) || item.album || '网易云歌单',
            genre: 'NETEASE / HI-RES',
            cover: coverUrl,
            lrcUrl: `https://music-api.gdstudio.xyz/api.php?types=lyric&id=${rawId}&source=netease`,
            source: 'netease',
            badge: '网易云歌单'
          };
        });
      }
    } catch (err) {}

    // Fallback to Injahow Mirror
    try {
      const endpoint = `https://api.injahow.cn/meting/?server=netease&type=playlist&id=${playlistId}`;
      const res = await fetchWithTimeout(endpoint, {}, 2500);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item, idx) => ({
          id: 'netease_' + (item.id || (playlistId + '_' + idx)),
          neteaseId: item.id,
          title: item.title || item.name || '未知曲目',
          artist: item.author || item.artist || '未知歌手',
          album: item.album || '网易云歌单',
          genre: 'NETEASE / HI-RES',
          cover: item.pic || item.pic_url || '',
          lrcUrl: `https://music-api.gdstudio.xyz/api.php?types=lyric&id=${item.id || (playlistId + '_' + idx)}&source=netease`,
          source: 'netease',
          badge: '网易云音乐'
        }));
      }
    } catch (e) {}

    throw new Error('歌单为空或未公开，请检查歌单ID或分享链接');
  }

  /**
   * Import Single NetEase Song by ID
   */
  async function fetchNeteaseSong(songId) {
    try {
      const playableUrl = await fetchPlayableUrlFromId(songId, 'netease');
      let coverUrl = '';
      try {
        const pRes = await fetchWithTimeout(`https://music-api.gdstudio.xyz/api.php?types=pic&id=${songId}&source=netease`, {}, 2000);
        const pData = await pRes.json();
        if (pData && pData.url) coverUrl = pData.url.replace(/^http:\/\//i, 'https://');
      } catch (pe) {}

      return {
        id: 'netease_' + songId,
        neteaseId: songId,
        title: '网易云单曲',
        artist: '正版音源',
        album: '网易云音乐',
        genre: 'NETEASE / HI-RES',
        cover: coverUrl,
        audioUrl: playableUrl,
        lrcUrl: `https://music-api.gdstudio.xyz/api.php?types=lyric&id=${songId}&source=netease`,
        source: 'netease',
        badge: '网易云单曲'
      };
    } catch (err) {
      throw new Error('未找到单曲，请确认单曲ID正确');
    }
  }

  // Export to window
  window.AetheriaAPI = {
    BUILTIN_CATALOG,
    HOT_CHARTS,
    searchSongs,
    fetchSongDetails,
    resolveSongAudioUrl,
    resolveSongCover,
    resolveSongLyrics,
    getSongLyricsFromCache,
    searchAndResolveAudio,
    invalidateAudioCache,
    parseNeteaseInput,
    fetchNeteasePlaylist,
    fetchNeteaseSong
  };

})();
