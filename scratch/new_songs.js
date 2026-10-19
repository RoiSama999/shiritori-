const fs = require('fs');

const NEW_SONGS = [
  {
    "ytId": "bMXeS_G4XnQ",
    "title": "Bocchi the Rock! (ぼっち・ざ・ろっく!)",
    "song": "Seishun Complex (青春コンプレックス) · 結束バンド",
    "lyric": "暗闇を照らす光はないけれど 息を吸い込んで歌い続ける",
    "romaji": "Kurayami wo terasu hikari wa nai keredo iki wo suikonde utaitsuzukeru",
    "viet": "Dù chẳng có ánh sáng nào soi rọi màn đêm u tối, tôi vẫn hít sâu một hơi và tiếp tục cất tiếng hát",
    "blank": {
      "q": "暗闇を照らす _____ はないけれど",
      "a": "光",
      "hint": "ひかり = ánh sáng"
    },
    "clue": "Cô bé Hitori Gotoh hướng nội lập ban nhạc Kessoku Band. Từ khóa: 青春 (thanh xuân), 結束 (gắn kết)",
    "category": "Hot Mới 2023-2026",
    "vocab": [
      { "kanji": "暗闇", "kana": "くらやみ", "mean": "bóng tối, màn đêm" },
      { "kanji": "光", "kana": "ひかり", "mean": "ánh sáng" },
      { "kanji": "歌う", "kana": "うたう", "mean": "hát, ca hát" }
    ]
  },
  {
    "ytId": "60YQ2gVj5c4",
    "title": "Frieren: Beyond Journey's End (葬送のフリーレン)",
    "song": "Anytime Anywhere · milet",
    "lyric": "涙も言葉も溢れ出してしまうから 私はここで歌う",
    "romaji": "Namida mo kotoba mo afuredashite shimau kara watashi wa koko de utau",
    "viet": "Bởi nước mắt và những lời nghẹn ngào chực trào tuôn rơi, nên tôi sẽ đứng tại nơi này và hát",
    "blank": {
      "q": "_____ も言葉も溢れ出してしまうから",
      "a": "涙",
      "hint": "なみだ = giọt nước mắt"
    },
    "clue": "Pháp sư elf Frieren du hành ngàn năm hồi tưởng lại người bạn Himmel. Từ khóa: 魔法 (phép thuật), 旅 (hành trình)",
    "category": "Hot Mới 2023-2026",
    "vocab": [
      { "kanji": "涙", "kana": "なみだ", "mean": "nước mắt" },
      { "kanji": "言葉", "kana": "ことば", "mean": "lời nói, từ ngữ" },
      { "kanji": "溢れる", "kana": "あふれる", "mean": "tràn ngập, tuôn trào" }
    ]
  },
  {
    "ytId": "CgkZ7MvWUAA",
    "title": "Demon Slayer: Kimetsu no Yaiba (鬼滅の刃)",
    "song": "Gurenge (紅蓮華) · LiSA",
    "lyric": "強くなれる理由を知った 僕を連れて進め",
    "romaji": "Tsuyoku nareru riyuu wo shitta boku wo tsurete susume",
    "viet": "Tôi đã thấu hiểu lý do để trở nên mạnh mẽ hơn, hãy dẫn lối và cùng tôi tiến về phía trước",
    "blank": {
      "q": "_____ なれる理由を知った",
      "a": "強く",
      "hint": "つよく = mạnh mẽ"
    },
    "clue": "Tanjiro mang theo em gái Nezuko gia nhập Sát Quỷ Đội. Từ khóa: 鬼 (quỷ), 刀 (kiếm), 家族 (gia đình)",
    "category": "Shonen Chiến Đấu",
    "vocab": [
      { "kanji": "強い", "kana": "つよい", "mean": "mạnh mẽ, kiên cường" },
      { "kanji": "理由", "kana": "りゆう", "mean": "lý do, nguyên nhân" },
      { "kanji": "進む", "kana": "すすむ", "mean": "tiến lên, phát triển" }
    ]
  },
  {
    "ytId": "_mA_t_6fV5E",
    "title": "Dan Da Dan (ダンダダン)",
    "song": "Otonoke (オトノケ) · Creepy Nuts",
    "lyric": "怪奇現象 跳ね回る鼓動が止まらない",
    "romaji": "Kaiki genshou hanemawaru kodou ga tomaranai",
    "viet": "Hiện tượng siêu nhiên kỳ bí, nhịp đập con tim dồn dập nhảy múa chẳng thể nào dừng lại",
    "blank": {
      "q": "_____ 跳ね回る鼓動が止まらない",
      "a": "怪奇現象",
      "hint": "かいきげんしょう = hiện tượng kỳ bí"
    },
    "clue": "Cô gái tin vào ma quỷ gặp chàng trai tin vào người ngoài hành tinh. Từ khóa: 宇宙人 (người ngoài hành tinh), 幽霊 (hồn ma)",
    "category": "Hot Mới 2023-2026",
    "vocab": [
      { "kanji": "現象", "kana": "げんしょう", "mean": "hiện tượng" },
      { "kanji": "鼓動", "kana": "こどう", "mean": "nhịp tim, nhịp đập" },
      { "kanji": "止まる", "kana": "とまる", "mean": "dừng lại" }
    ]
  },
  {
    "ytId": "2S4qGKmzBJE",
    "title": "Attack on Titan (進撃の巨人 The Final)",
    "song": "The Rumbling · SiM",
    "lyric": "Rumbling, Rumbling, it's coming! 自由のために戦い続ける",
    "romaji": "Rumbling, Rumbling, it's coming! Jiyuu no tame ni tatakaitsuzukeru",
    "viet": "Rung chuyển trời đất, nó đang ùa tới! Vì tự do, chúng ta sẽ không ngừng chiến đấu",
    "blank": {
      "q": "_____ のために戦い続ける",
      "a": "自由",
      "hint": "じゆう = tự do"
    },
    "clue": "Eren Jaeger giải phóng hàng triệu Titan kích hoạt Rung Chấn. Từ khóa: 自由 (tự do), 巨人 (khổng lồ)",
    "category": "Shonen Chiến Đấu",
    "vocab": [
      { "kanji": "自由", "kana": "じゆう", "mean": "tự do" },
      { "kanji": "戦う", "kana": "たたかう", "mean": "chiến đấu" },
      { "kanji": "壁", "kana": "かべ", "mean": "bức tường, tường thành" }
    ]
  },
  {
    "ytId": "faqmNf_fZlE",
    "title": "Hunter x Hunter (ハンター×ハンター)",
    "song": "departure! · 小野正利",
    "lyric": "大地を踏みしめて 君は目覚めていく 新しい世界へ",
    "romaji": "Daichi wo fumishimete kimi wa mezamete iku atarashii sekai he",
    "viet": "Vững bước đạp trên mặt đất bao la, bạn dần thức tỉnh và hướng tới một thế giới hoàn toàn mới",
    "blank": {
      "q": "大地を踏みしめて 君は _____ いく",
      "a": "目覚めて",
      "hint": "めざめて = thức tỉnh"
    },
    "clue": "Cậu bé Gon Freecss rời đảo Cá Voi thi Hunter tìm cha. Từ khóa: 冒険 (phiêu lưu), 仲間 (đồng đội)",
    "category": "Huyền Thoại Bất Hủ",
    "vocab": [
      { "kanji": "大地", "kana": "だいち", "mean": "mặt đất, đất liền" },
      { "kanji": "世界", "kana": "せかい", "mean": "thế giới" },
      { "kanji": "新しい", "kana": "あたらしい", "mean": "mới mẻ" }
    ]
  },
  {
    "ytId": "o6wtDPVkKqI",
    "title": "Neon Genesis Evangelion (新世紀エヴァンゲリオン)",
    "song": "A Cruel Angel's Thesis (残酷な天使のテーゼ) · 高橋洋子",
    "lyric": "残酷な天使のテーゼ 少年よ 神話になれ",
    "romaji": "Zankoku na tenshi no teeze shounen yo shinwa ni nare",
    "viet": "Bản luận cương của thiên sứ tàn nhẫn, hỡi chàng trai trẻ hãy trở thành một huyền thoại",
    "blank": {
      "q": "少年よ _____ になれ",
      "a": "神話",
      "hint": "しんわ = thần thoại / huyền thoại"
    },
    "clue": "Shinji lái Eva Unit-01 chiến đấu chống Thiên Thần bảo vệ Tokyo-3. Từ khóa: 天使 (thiên thần), 未来 (tương lai)",
    "category": "Huyền Thoại Bất Hủ",
    "vocab": [
      { "kanji": "天使", "kana": "てんし", "mean": "thiên thần, thiên sứ" },
      { "kanji": "少年", "kana": "しょうねん", "mean": "chàng trai, thiếu niên" },
      { "kanji": "神話", "kana": "しんわ", "mean": "thần thoại" }
    ]
  },
  {
    "ytId": "p9fyw73c8z0",
    "title": "Kaiju No. 8 (怪獣8号)",
    "song": "Abyss · YUNGBLUD",
    "lyric": "深淵の中で叫ぶ声 決して諦めはしない",
    "romaji": "Shin'en no naka de sakebu koe kesshite akirame wa shinai",
    "viet": "Tiếng thét vang lên từ tận đáy sâu vực thẳm, quyết tâm không bao giờ từ bỏ ước mơ",
    "blank": {
      "q": "決して _____ はしない",
      "a": "諦め",
      "hint": "あきらめ = từ bỏ, bỏ cuộc"
    },
    "clue": "Kafka Hibino nuốt phải ký sinh trùng biến thành Kaiju Số 8. Từ khóa: 怪獣 (quái thú)",
    "category": "Hot Mới 2023-2026",
    "vocab": [
      { "kanji": "深淵", "kana": "しんえん", "mean": "vực sâu, vực thẳm" },
      { "kanji": "声", "kana": "こえ", "mean": "tiếng nói, giọng nói" },
      { "kanji": "諦める", "kana": "あきらめる", "mean": "từ bỏ" }
    ]
  },
  {
    "ytId": "yq7E1uRkQvo",
    "title": "Spy x Family S2 (SPY×FAMILY)",
    "song": "Kura Kura (クラクラ) · Ado",
    "lyric": "秘密だらけの日常 クラクラするほど愛おしい",
    "romaji": "Himitsu darake no nichijou kurakura suru hodo itooshii",
    "viet": "Cuộc sống thường nhật tràn ngập những bí mật giấu kín, đáng yêu đến mức khiến ta chóng mặt say đắm",
    "blank": {
      "q": "_____ だらけの日常 クラクラする",
      "a": "秘密",
      "hint": "ひみつ = bí mật"
    },
    "clue": "Gia đình Forger gồm điệp viên Loid, sát thủ Yor và bé Anya. Từ khóa: 秘密 (bí mật), 家族 (gia đình)",
    "category": "Hot Mới 2023-2026",
    "vocab": [
      { "kanji": "秘密", "kana": "ひみつ", "mean": "bí mật" },
      { "kanji": "日常", "kana": "にちじょう", "mean": "ngày thường, thường nhật" },
      { "kanji": "愛しい", "kana": "いとしい", "mean": "đáng yêu, yêu dấu" }
    ]
  },
  {
    "ytId": "a-eXpBq4b2Q",
    "title": "Solo Leveling (俺だけレベルアップな件)",
    "song": "LEveL · SawanoHiroyuki[nZk]:TXT",
    "lyric": "限界を超えて目指す場所へ 覚醒の瞬間が今始まる",
    "romaji": "Genkai wo koete mezasu basho he kakusei no shunkan ga ima hajimaru",
    "viet": "Vượt qua mọi giới hạn để vươn tới đỉnh cao, khoảnh khắc thức tỉnh bắt đầu ngay lúc này",
    "blank": {
      "q": "_____ を超えて目指す場所へ",
      "a": "限界",
      "hint": "げんかい = giới hạn"
    },
    "clue": "Thợ săn Sung Jin-woo nhận bảng nhiệm vụ thăng cấp vô hạn. Từ khóa: 覚醒 (thức tỉnh), 限界 (giới hạn)",
    "category": "Hot Mới 2023-2026",
    "vocab": [
      { "kanji": "限界", "kana": "げんかい", "mean": "giới hạn" },
      { "kanji": "覚醒", "kana": "かくせい", "mean": "thức tỉnh" },
      { "kanji": "瞬間", "kana": "しゅんかん", "mean": "khoảnh khắc" }
    ]
  },
  {
    "ytId": "p9L3ZgN5VHQ",
    "title": "【推しの子】 S2 (Oshi no Ko)",
    "song": "Fatal (ファタール) · GEMN",
    "lyric": "運命の鎖に縛られて 狂おしい愛を演じきる",
    "romaji": "Unmei no kusari ni shibararete kuruoshii ai wo enjikiru",
    "viet": "Bị trói buộc bởi xiềng xích định mệnh nghiệt ngã, diễn trọn vẹn vở kịch tình yêu cuồng si",
    "blank": {
      "q": "_____ の鎖に縛られて",
      "a": "運命",
      "hint": "うんめい = vận mệnh / định mệnh"
    },
    "clue": "Vở kịch Tokyo Blade hé lộ mưu đồ trả thù của Aqua. Từ khóa: 運命 (định mệnh), 芝居 (kịch)",
    "category": "Hot Mới 2023-2026",
    "vocab": [
      { "kanji": "運命", "kana": "うんめい", "mean": "vận mệnh, số phận" },
      { "kanji": "鎖", "kana": "くさり", "mean": "dây xích, xiềng xích" },
      { "kanji": "愛", "kana": "あい", "mean": "tình yêu" }
    ]
  },
  {
    "ytId": "a2GujJZfXpg",
    "title": "Your Name (君の名は。)",
    "song": "Nandemonaiya (なんでもないや) · RADWIMPS",
    "lyric": "もう少しだけでいい あと少しだけでいい もう少しだけくっついていようか",
    "romaji": "Mou sukoshi dake de ii ato sukoshi dake de ii mou sukoshi dake kuttsuite iyou ka",
    "viet": "Chỉ cần thêm một chút nữa thôi, xin hãy để ta được ở bên cạnh nhau thêm chút nữa",
    "blank": {
      "q": "もう _____ だけでいい あと少しだけでいい",
      "a": "少し",
      "hint": "すこし = một chút / một ít"
    },
    "clue": "Taki và Mitsuha hoán đổi thân xác vượt qua không gian và thời gian. Từ khóa: 夢 (giấc mơ), 約束 (lời hứa)",
    "category": "Nhẹ Nhàng & Ballad",
    "vocab": [
      { "kanji": "少し", "kana": "すこし", "mean": "một chút, ít" },
      { "kanji": "時間", "kana": "じかん", "mean": "thời gian" },
      { "kanji": "名前", "kana": "なまえ", "mean": "tên gọi" }
    ]
  },
  {
    "ytId": "7cPrnZ5-kE0",
    "title": "Digimon Adventure (デジモン)",
    "song": "Butter-Fly · 和田光司 (Kouji Wada)",
    "lyric": "無限大な夢のあとの 何もない世の中じゃ",
    "romaji": "Mugendai na yume no ato no nanimo nai yononaka ja",
    "viet": "Sau những giấc mơ vô hạn bao la, trong một thế giới dường như chẳng còn lại gì",
    "blank": {
      "q": "_____ な夢のあとの 何もない世の中じゃ",
      "a": "無限大",
      "hint": "むげんだい = vô hạn"
    },
    "clue": "Những đứa trẻ được chọn lạc vào Digital World cùng Digimon. Từ khóa: 夢 (ước mơ), 冒険 (phiêu lưu)",
    "category": "Huyền Thoại Bất Hủ",
    "vocab": [
      { "kanji": "夢", "kana": "ゆめ", "mean": "giấc mơ, ước mơ" },
      { "kanji": "無限", "kana": "むげん", "mean": "vô hạn, vô tận" },
      { "kanji": "飛ぶ", "kana": "とぶ", "mean": "bay lượn" }
    ]
  },
  {
    "ytId": "a_9-Hk_Cg1k",
    "title": "Chainsaw Man (チェンソーマン ED4)",
    "song": "Chu, Tayousei. (ちゅ、多様性。) · あの (ano)",
    "lyric": "Get on Chu! ゲロチュー 多様性 恋する乙女は無敵",
    "romaji": "Get on Chu! Gerochuu tayousei koi suru otome wa muteki",
    "viet": "Get on Chu! Đa dạng muôn màu, cô gái khi đang yêu là bất khả chiến bại",
    "blank": {
      "q": "恋する乙女は _____ だ",
      "a": "無敵",
      "hint": "むてき = vô địch, không có đối thủ"
    },
    "clue": "Himeno và nụ hôn quán nhậu với Denji. Từ khóa: 多様性 (tính đa dạng), 悪魔 (quỷ)",
    "category": "Hot Mới 2023-2026",
    "vocab": [
      { "kanji": "多様性", "kana": "たようせい", "mean": "tính đa dạng" },
      { "kanji": "無敵", "kana": "むてき", "mean": "vô địch, bất bại" },
      { "kanji": "乙女", "kana": "おとめ", "mean": "thiếu nữ, cô gái" }
    ]
  }
];

console.log('Total new songs:', NEW_SONGS.length);
