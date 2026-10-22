/* 中文 for TT Gem Swap (消消乐): the words on the page, the toasts, the canvas words and the ? panel (Kit.lang, from
   kit/lang.js). Simple words: Tommy is 5. 消消乐 is the game, 三消 three in a row, 连击 a cascade, 宝石 a gem. The kids'
   and the friends' names and the game's own name stay English. */
(function () {
  'use strict';
  const L = Kit.lang;
  L.keep(['TT Gem Swap', 'TT', 'Gem Swap', 'GEM SWAP', 'TT Gem Swap · Teddy & Tommy', 'TEDDY', 'TOMMY', 'FOXY', 'FROGGY', 'TEDDY & TOMMY',
    'Teddy & Tommy', 'Teddy', 'Tommy', 'Foxy', 'Froggy', 'Esc', 'Enter', 'Space', 'T', 'R', 'W', 'L', 'M', 'P', '1', '2', '3']);
  const TREATS = { 'ICE CREAM': '冰淇淋', WATER: '水', 'JUICE BOX': '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉' };

  L.add({
    // the menu
    'SWAP TWO GEMS. MAKE 3 IN A ROW!': '消消乐！换两颗宝石，三个连成一排！',
    PLAY: '开始', Play: '开始', 'Play (Enter)': '开始 (Enter)',
    'Who plays': '谁来玩', '1 PLAYER': '单人', '1 player (1)': '单人 (1)', 'Play a friend (2)': '和朋友比 (2)',
    '2 PLAYERS': '双人', '2 players (3)': '双人 (3)', 'Who are you?': '你是谁？', 'Teddy (W)': 'Teddy (W)', 'Tommy (W)': 'Tommy (W)',
    Level: '难度', EASY: '简单', NORMAL: '普通', 'Easy (L)': '简单 (L)', 'Normal (L)': '普通 (L)',
    'An easier level': '前一关', 'A harder level': '后一关',
    // playing
    Pause: '暂停', 'Pause (P)': '暂停 (P)', 'Sound (M)': '声音 (M)', 'Sound on or off': '声音 开 / 关',
    LEVEL: '关卡', 'MOVES LEFT': '还剩几步', MOVES: '步数', SCORE: '分数', BEST: '最好',
    'Score this much': '要拿到这么多分', 'Break all the ice': '把冰全部打碎', 'Collect this many': '要消掉这么多个',
    'Call your brother': '叫兄弟来帮忙', 'Call your brother (T)': '叫兄弟来帮忙 (T)', 'High five!': '击掌！', 'High five! (T)': '击掌！(T)',
    'HIGH FIVE! 🙌': '击掌！🙌', 'SWAP TWO GEMS!': '换两颗宝石！', 'YOUR TURN!': '轮到你啦！', 'NO MOVES LEFT! SHUFFLE!': '没有能换的啦，洗一洗！',
    '3 MOVES LEFT!': '只剩 3 步啦！', 'OUT OF MOVES!': '步数用完啦！',
    // the words that pop on the board (canvas)
    'NICE!': '不错！', 'GREAT!': '真棒！', 'SUPER!': '超级棒！', 'AMAZING!': '太厉害了！', 'FANTASTIC!': '无敌啦！',
    'ROCKET!': '火箭！', 'BOMB!': '炸弹！', 'RAINBOW!': '彩虹！', 'WOW!': '哇！',
    // the end, pause
    'NEW BEST!': '新纪录！', 'ALL 40 LEVELS DONE!': '40 关全部通过！', 'SO CLOSE! TRY AGAIN!': '就差一点点！再试一次！', 'A TIE!': '平手！',
    'GAMES WON': '赢的局数',
    Home: '主页', 'Next level': '下一关', 'NEXT LEVEL': '下一关', 'Play again': '再玩一次', 'PLAY AGAIN': '再玩一次', 'TRY AGAIN': '再试一次',
    'Keep playing': '继续玩', 'Start again': '重新开始',
    // the ? panel
    'move the frame': '移动黄框', 'pick a gem · put it down': '选一颗宝石 · 放下', 'swap the picked gem that way': '把选中的宝石往那边换',
    'call your brother (2 players: high five)': '叫兄弟来帮忙（双人：击掌）', 'this level again': '这一关重来',
    'menu: play': '菜单：开始', 'menu: 1 player · a friend · 2 players': '菜单：单人 · 和朋友比 · 双人',
    'menu: Teddy or Tommy · level': '菜单：Teddy 或 Tommy · 难度', 'menu: the starting level': '菜单：从第几关开始',
    'Swap two gems side by side to make 3 or more of the same fruit in a row. 4 in a row makes a rocket, an L or a T makes a bomb, 5 in a row makes a rainbow star. Finish the goals at the top!':
      '三消！把挨着的两颗宝石换一换，让 3 个或更多一样的水果连成一排。4 个连成一排变火箭，拐个弯（L 或 T）变炸弹，5 个连成一排变彩虹星。完成上面的任务就过关！',
    "Slide a gem onto its neighbour, or tap one gem and then the one next to it. Tap your brother's face (bottom right) and he points at a match.":
      '把宝石往旁边一滑，或者先点一颗、再点它旁边的一颗。点右下角兄弟的脸，他会指给你看哪里能消。',
  });

  // text with names and numbers in it
  L.rule(/^VS (\S+)$/, '和 $1 比');
  L.rule(/^LEVEL (\d+)$/, '第 $1 关');
  L.rule(/^LEVEL (\d+) CLEAR!$/, '第 $1 关过关啦！');
  L.rule(/^COMBO x(\d+)!$/, '$1 连击！');
  L.rule(/^BONUS \+(\d+)$/, '奖励 +$1');
  L.rule(/^(\S+) WINS!$/, '$1 赢啦！');
  L.rule(/^(\S+)'S TURN!$/, '轮到 $1 啦！');
  L.rule(/^(\S+) DONE!$/, '$1 完成！');
  L.rule(/^(\S+)'S HERE!$/, '$1 来啦！');
  L.rule(/^(\S+) (ICE CREAM|WATER|JUICE BOX|COOKIE|WATERMELON|BANANA) FROM (\S+)!$/, (m, e, item, who) => `${e} ${who} 送来的${TREATS[item]}！`);
  L.rule(/^(\S+) SAYS: SWAP THESE (\S+)!$/, '$1 说：换这两颗 $2！');
})();
