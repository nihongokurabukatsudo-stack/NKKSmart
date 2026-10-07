export type MaterialExample = { japanese: string; romaji?: string; meaning?: string }
export type LearningMaterial = {
  id: string
  title: string
  category: string
  summary: string
  source: 'Kitab Suci NKK' | 'Modul tambahan belum diberikan'
  explanation: string[]
  examples: MaterialExample[]
  practice?: string[]
}

// Content below is transcribed or closely summarized from Kitab Suci NKK.
// Kotoba N5 and Kanji are intentionally left unavailable until their source modules are supplied.
export const nkkLearningMaterials: LearningMaterial[] = [
  {
    id: 'huruf-jepang', title: 'Huruf Bahasa Jepang', category: 'Huruf Jepang', source: 'Kitab Suci NKK',
    summary: 'Kenali empat sistem tulisan dan fungsi masing-masing.',
    explanation: [
      'Kitab mengenalkan Kanji, Hiragana, Katakana, dan Roomaji. Kanji berasal dari aksara Tiongkok dan digunakan bersama sistem tulisan Jepang lainnya.',
      'Hiragana adalah huruf asli Jepang. Katakana dipakai untuk kata serapan dan nama asing, termasuk nama dari Indonesia. Roomaji adalah alfabet Latin A sampai Z.',
    ],
    examples: [
      { japanese: '山', romaji: 'yama', meaning: 'Gunung' }, { japanese: '雨', romaji: 'ame', meaning: 'Hujan' },
      { japanese: 'にほんご', romaji: 'nihongo', meaning: 'Bahasa Jepang' }, { japanese: 'あおい', romaji: 'aoi', meaning: 'Biru' },
      { japanese: 'コンピューター', romaji: 'konpyuutaa', meaning: 'Komputer' }, { japanese: 'インドネシア', romaji: 'indonesia', meaning: 'Indonesia' },
    ],
  },
  {
    id: 'dakuten', title: 'Dakuten', category: 'Bunyi dan kombinasi', source: 'Kitab Suci NKK',
    summary: 'Tanda ゛ mengubah bunyi pada baris K, S, T, dan H.',
    explanation: [
      'Dakuten (゛) ditulis di kanan atas kana. Pada baris K bunyi berubah menjadi G; baris S menjadi Z; baris T menjadi D; dan baris H menjadi B.',
      'Baca pasangan berikut dengan membandingkan bunyinya. Misalnya か dibaca ka, sedangkan が dibaca ga. Bentuk dakuten juga tersedia pada Katakana.',
    ],
    examples: [
      { japanese: 'か → が', romaji: 'ka → ga' }, { japanese: 'さ → ざ', romaji: 'sa → za' },
      { japanese: 'た → だ', romaji: 'ta → da' }, { japanese: 'は → ば', romaji: 'ha → ba' },
      { japanese: 'かぜ', romaji: 'kaze', meaning: 'Angin' }, { japanese: 'しんぶん', romaji: 'shinbun', meaning: 'Koran' },
      { japanese: 'かばん', romaji: 'kaban', meaning: 'Tas' },
    ],
    practice: ['が・ぎ・ぐ・げ・ご', 'ざ・じ・ず・ぜ・ぞ', 'だ・ぢ・づ・で・ど', 'ば・び・ぶ・べ・ぼ'],
  },
  {
    id: 'handakuten', title: 'Handakuten', category: 'Bunyi dan kombinasi', source: 'Kitab Suci NKK',
    summary: 'Tanda ゜ mengubah bunyi baris H menjadi bunyi P.',
    explanation: ['Handakuten (゜) adalah lingkaran kecil di kanan atas kana baris H. Perubahannya: は・ひ・ふ・へ・ほ menjadi ぱ・ぴ・ぷ・ぺ・ぽ.'],
    examples: [{ japanese: 'は → ぱ', romaji: 'ha → pa' }, { japanese: 'ひ → ぴ', romaji: 'hi → pi' }, { japanese: 'ふ → ぷ', romaji: 'fu → pu' }, { japanese: 'へ → ぺ', romaji: 'he → pe' }, { japanese: 'ほ → ぽ', romaji: 'ho → po' }],
    practice: ['ぱ・ぴ・ぷ・ぺ・ぽ'],
  },
  {
    id: 'chouon', title: 'Chouon (vokal panjang)', category: 'Bunyi dan kombinasi', source: 'Kitab Suci NKK',
    summary: 'Vokal panjang dipertahankan saat membaca; jangan dipendekkan.',
    explanation: ['Chouon adalah bunyi vokal panjang. Latih panjang vokalnya dengan jelas, karena pemendekan bunyi dapat membuat kata terdengar berbeda.'],
    examples: [{ japanese: 'おばあさん', romaji: 'obaasan', meaning: 'Nenek' }, { japanese: 'おじいさん', romaji: 'ojiisan', meaning: 'Kakek' }],
    practice: ['Dengarkan おばあさん dan perhatikan vokal panjang ああ.', 'Dengarkan おじいさん dan perhatikan vokal panjang いい.'],
  },
  {
    id: 'sokuon', title: 'Sokuon (っ kecil)', category: 'Bunyi dan kombinasi', source: 'Kitab Suci NKK',
    summary: 'っ kecil menandai konsonan rangkap dan jeda singkat sebelum konsonan.',
    explanation: ['Sokuon ditulis memakai っ kecil di antara kana. Beri jeda singkat, lalu rangkapkan konsonan berikutnya: ki-tte, zas-shi, kek-kon. Bandingkan おっと (otto) dengan おと (oto).'],
    examples: [{ japanese: 'きって', romaji: 'kitte', meaning: 'Perangko' }, { japanese: 'ざっし', romaji: 'zasshi', meaning: 'Majalah' }, { japanese: 'けっこん', romaji: 'kekkon', meaning: 'Pernikahan' }, { japanese: 'おっと / おと', romaji: 'otto / oto', meaning: 'Suami / suara' }],
    practice: ['あさって', 'いっぷん', 'きっぷ', 'がっこう', 'そっくり', 'よっつ', 'いっぱい', 'いっかい', 'がっき'],
  },
  {
    id: 'youon', title: 'Youon (kombinasi kana)', category: 'Bunyi dan kombinasi', source: 'Kitab Suci NKK',
    summary: 'Gabungkan kana berakhiran i dengan ゃ, ゅ, atau ょ kecil.',
    explanation: ['Youon menggabungkan kana baris i—き、し、ち、に、ひ、み、り (serta bentuk bersuara yang muncul dalam contoh)—dengan や・ゆ・よ kecil. Kana kecil dibaca menyatu dengan kana sebelumnya, bukan sebagai suku kata terpisah.'],
    examples: [{ japanese: 'ひゃく', romaji: 'hyaku', meaning: 'Seratus' }, { japanese: 'りょこう', romaji: 'ryokou', meaning: 'Wisata' }, { japanese: 'しゅじん', romaji: 'shujin', meaning: 'Suami' }, { japanese: 'きゃく', romaji: 'kyaku', meaning: 'Tamu' }, { japanese: 'びょうき', romaji: 'byouki', meaning: 'Sakit' }],
    practice: ['しょくどう', 'いしゃ', 'こんしゅう', 'きょねん', 'けんきゅう', 'にんじゃ', 'ちゃいろ', 'むりょう', 'きょだい', 'にんぎょ'],
  },
  {
    id: 'kotoba', title: 'Kotoba (kosakata Kitab)', category: 'Kosakata', source: 'Kitab Suci NKK',
    summary: 'Kosakata dasar yang tercantum di dalam modul NKK.',
    explanation: ['Dengarkan dan ulangi kata Jepang, lalu tutup kolom arti untuk berlatih mengingat. Ejaan romaji dan terjemahan berikut mengikuti modul sumber; beberapa salah ketik pada sumber dipertahankan agar tidak mengubah materi secara diam-diam.'],
    examples: [
      { japanese: 'わたし', romaji: 'watashi', meaning: 'Saya' }, { japanese: 'がくせい', romaji: 'gakusei', meaning: 'Siswa' },
      { japanese: 'おんな', romaji: 'onna', meaning: 'Perempuan' }, { japanese: 'ひと', romaji: 'hito', meaning: 'Orang' },
      { japanese: 'かた', romaji: 'kata', meaning: 'Orang (halus)' }, { japanese: 'おとこ', romaji: 'otoko', meaning: 'Laki-laki' },
      { japanese: 'せんせい', romaji: 'sensei', meaning: 'Guru' }, { japanese: 'かばん', romaji: 'kaban', meaning: 'Tas' },
      { japanese: 'へや', romaji: 'heya', meaning: 'Kamar / ruangan' }, { japanese: 'かぎ', romaji: 'kagi', meaning: 'Kunci' },
      { japanese: 'とけい', romaji: 'tokei', meaning: 'Jam' }, { japanese: 'だれ', romaji: 'dare', meaning: 'Siapa' },
      { japanese: 'これ・それ・あれ', romaji: 'kore · sore · are', meaning: 'Ini · itu · itu (jauh)' },
      { japanese: 'ほん', romaji: 'hon', meaning: 'Buku' }, { japanese: 'しんぶん', romaji: 'shinbun', meaning: 'Koran' },
      { japanese: 'つくえ・いす', romaji: 'tsukue · isu', meaning: 'Meja · kursi' }, { japanese: 'えんぴつ', romaji: 'enpitsu', meaning: 'Pensil' },
      { japanese: 'ラジオ・テレビ', romaji: 'rajio · terebi', meaning: 'Radio · televisi' }, { japanese: 'にほん', romaji: 'nihon', meaning: 'Jepang' },
      { japanese: 'ちゅうごく', romaji: 'chuugoku', meaning: 'Cina' }, { japanese: 'アメリカ', romaji: 'amerika', meaning: 'Amerika' },
      { japanese: 'やまもと・ジョン・たなか', romaji: 'Yamamoto · Jhon · Tanaka', meaning: 'Nama orang dalam daftar modul' },
      { japanese: 'マレーシア・タイ・フィリピン・イギリス', romaji: 'Mareeshia · Tai · Firipin · Igirisu', meaning: 'Malaysia · Thailand · Filipina · Inggris (romaji mengikuti modul)' },
      { japanese: 'かばん・カメラ・レコード・テープ', romaji: 'kaban · kamera · rekoodo · teepu', meaning: 'Tas · kamera · rekorder · kaset' },
      { japanese: 'だれ・どなた・どれ・どの～', romaji: 'dare · donata · dore · dono~', meaning: 'Siapa · siapa (halus) · yang mana · yang mana + kata benda' },
      { japanese: 'この～・その～・あの～', romaji: 'kono~ · sono~ · ano~', meaning: 'Yang ini · yang itu · yang itu (jauh), diikuti kata benda' },
      { japanese: 'なん・はい・いいえ・どうぞ', romaji: 'nan · hai · iie · douzo', meaning: 'Apa · iya · tidak · silakan' },
      { japanese: 'みなさん・～さん・～じん・～せんせい・～ご', romaji: 'minasan · ~san · ~jin · ~sensei · ~go', meaning: 'Hadirin · sapaan nama · orang dari negara · guru · bahasa' },
      { japanese: 'じどうしゃ・じてんしゃ・たばこ・ノート', romaji: 'jidousha · jitensha · tabako · nooto', meaning: 'Mobil · sepeda (terjemahan “motor” tertulis pada sumber) · rokok · buku catatan' },
    ],
    practice: ['Bacakan kata-katanya tanpa melihat romaji.', 'Cocokkan これ、 それ、 あれ dengan artinya sesuai jarak benda dari pembicara dan lawan bicara.'],
  },
  {
    id: 'kotoba-tempat-waktu', title: 'Kosakata: tempat, sifat, dan waktu', category: 'Kosakata', source: 'Kitab Suci NKK',
    summary: 'Kosakata baru dari pelajaran “Toire wa doko desu ka”.',
    explanation: ['Kelompokkan kata berdasarkan kebutuhan dalam percakapan: lokasi, tempat di sekolah, benda/makanan, kata sifat-i, dan waktu. Dengarkan tiap kata lalu ulangi.'],
    examples: [
      { japanese: 'がっこう・きょうしつ・クラス', romaji: 'gakkou · kyoushitsu · kurasu', meaning: 'Sekolah · ruang kelas · kelas' },
      { japanese: 'しょくどう・しょっけん', romaji: 'shokudou · shokken', meaning: 'Kantin · kartu makan' },
      { japanese: 'にわ・たてもの・りょう', romaji: 'niwa · tatemono · ryou', meaning: 'Halaman · bangunan · asrama' },
      { japanese: 'びょういん・じむしつ・としょしつ・トイレ', romaji: 'byouin · jimushitsu · toshoshitsu · toire', meaning: 'Rumah sakit · kantor · ruang baca · toilet' },
      { japanese: 'パン・ぎゅうにゅう・ジュース・さかな・スープ', romaji: 'pan · gyuunyuu · juusu · sakana · suupu', meaning: 'Roti · susu · jus · ikan · sup' },
      { japanese: 'ちいさい・おおきい・たかい・やすい', romaji: 'chiisai · ookii · takai · yasui', meaning: 'Kecil · besar · tinggi/mahal · murah' },
      { japanese: 'あたらしい・ふるい・ひくい・くらい・あかるい', romaji: 'atarashii · furui · hikui · kurai · akarui', meaning: 'Baru · lama · rendah · gelap · terang' },
      { japanese: 'あかい・しろい・あおい・くろい・きいろい', romaji: 'akai · shiroi · aoi · kuroi · kiiroi', meaning: 'Merah · putih · biru · hitam · kuning' },
      { japanese: 'ここ・そこ・あそこ・どこ', romaji: 'koko · soko · asoko · doko', meaning: 'Di sini · di situ · di sana · di mana' },
      { japanese: 'いま・なんじ・～じ・～ふん・～はん', romaji: 'ima · nanji · ~ji · ~fun · ~han', meaning: 'Sekarang · jam berapa · jam · menit · setengah' },
      { japanese: 'ごふんまえ・ごふんすぎ', romaji: 'gofunmae · gofunsugi', meaning: 'Lima menit sebelum · lima menit lewat' },
      { japanese: 'ひゃく・せん・まん・ゼロ／れい', romaji: 'hyaku · sen · man · zero/rei', meaning: '100 · 1.000 · 10.000 · 0' },
      { japanese: 'そして', romaji: 'soshite', meaning: 'Kemudian / lalu' },
    ],
    practice: ['Dengarkan kosakata lokasi lalu jawab: トイレはどこですか。', 'Ucapkan jam: いま、なんじですか。', 'Buat pasangan kata benda + kata sifat, misalnya あおいかばん、たかいやま.'],
  },
  {
    id: 'latihan-menulis', title: 'Latihan menulis kana', category: 'Latihan', source: 'Kitab Suci NKK',
    summary: 'Ubah romaji menjadi hiragana dengan kosakata latihan dalam buku.',
    explanation: ['Tuliskan kana di kertas sebelum membuka jawabannya. Daftar pertama berasal dari Latihan Menulis di bagian huruf; arti dalam tanda kurung mengikuti teks sumber.'],
    examples: [
      { japanese: 'nana', romaji: 'nana', meaning: 'tujuh' }, { japanese: 'haha', romaji: 'haha', meaning: 'ibu' }, { japanese: 'nishi', romaji: 'nishi', meaning: 'barat' },
      { japanese: 'neko', romaji: 'neko', meaning: 'kucing' }, { japanese: 'fuufu', romaji: 'fuufu', meaning: 'suami-istri' }, { japanese: 'inu', romaji: 'inu', meaning: 'anjing' },
      { japanese: 'nuno', romaji: 'nuno', meaning: 'kain' }, { japanese: 'mame', romaji: 'mame', meaning: 'kacang' }, { japanese: 'mimi', romaji: 'mimi', meaning: 'telinga' },
      { japanese: 'yoyaku', romaji: 'yoyaku', meaning: 'reservasi' }, { japanese: 'mune', romaji: 'mune', meaning: 'dada' }, { japanese: 'oyu', romaji: 'oyu', meaning: 'air matang (sesuai ejaan sumber)' },
      { japanese: 'me', romaji: 'me', meaning: 'mata' }, { japanese: 'momo', romaji: 'momo', meaning: 'persik' }, { japanese: 'hayai', romaji: 'hayai', meaning: 'cepat' },
      { japanese: 'rousoku', romaji: 'rousoku', meaning: 'lilin' }, { japanese: 'ari', romaji: 'ari', meaning: 'semut' }, { japanese: 'watashi', romaji: 'watashi', meaning: 'saya' },
      { japanese: 'hon', romaji: 'hon', meaning: 'buku' }, { japanese: 'sora', romaji: 'sora', meaning: 'langit' }, { japanese: 'nihon', romaji: 'nihon', meaning: 'Jepang' },
      { japanese: 'rei', romaji: 'rei', meaning: 'nol' }, { japanese: 'wani', romaji: 'wani', meaning: 'buaya' },
      { japanese: 'ue・ookii・ai・kao・ie・akai', romaji: 'ue · ookii · ai · kao · ie · akai', meaning: 'atas · besar · cinta · wajah · rumah · merah' },
      { japanese: 'e・kikai・aoi・kuuki・ooi・ike', romaji: 'e · kikai · aoi · kuuki · ooi · ike', meaning: 'gambar · mesin · biru · udara · banyak · kolam' },
      { japanese: 'ashi・takai・sushi・chichi・sasu・tetsu', romaji: 'ashi · takai · sushi · chichi · sasu · tetsu', meaning: 'kaki · tinggi · sushi · ayah · menunjuk · besi' },
      { japanese: 'soko・tokei・ase・atsui', romaji: 'soko · tokei · ase · atsui', meaning: 'di sana · jam · keringat · panas' },
    ],
    practice: ['Tulis setiap kata dengan hiragana tanpa menyalin romaji.', 'Untuk latihan kana dasar, buka juga tabel Hiragana dan Katakana lalu tekan tiap huruf untuk melihat bacaannya dan mendengarkan audio.'],
  },
  {
    id: 'bunpou', title: 'Bunpou (pola kalimat)', category: 'Tata bahasa', source: 'Kitab Suci NKK',
    summary: 'Pola perkenalan, penyangkalan, pertanyaan, dan hubungan kata.',
    explanation: [
      'N は N です: は menandai topik kalimat dan dibaca wa. です menyatakan “adalah”. Contoh: わたしは がくせいです。 Saya adalah siswa. Catatan editor: terjemahan pada satu bagian buku menyebut “guru”, tetapi がくせい berarti siswa pada daftar kosakata buku.',
      'N は N じゃありません: bentuk negatif, berarti “bukan”. じゃ adalah bentuk percakapan; では lebih formal. N は N ですか: か di akhir membuat pertanyaan ya/tidak.',
      'も berarti “juga”. の menghubungkan dua kata benda, misalnya menyatakan kepemilikan atau afiliasi. これ・それ・あれ berdiri sendiri; この・その・あの harus diikuti kata benda. と menghubungkan kata benda “dan”.',
      'Pola lokasi: ここ・そこ・あそこ berarti di sini/di situ/di sana; どこ menanyakan lokasi. いくら menanyakan harga. Kata sifat-i dapat dinegasikan dengan mengganti い menjadi くないです.',
    ],
    examples: [
      { japanese: 'わたしは がくせいです。', romaji: 'watashi wa gakusei desu.', meaning: 'Saya adalah siswa.' },
      { japanese: 'わたしは せんせいじゃありません。', romaji: 'watashi wa sensei ja arimasen.', meaning: 'Saya bukan guru.' },
      { japanese: 'これは ほんですか。', romaji: 'kore wa hon desu ka.', meaning: 'Apakah ini buku?' },
      { japanese: 'たなかさんも にほんじんです。', romaji: 'Tanaka-san mo nihonjin desu.', meaning: 'Tanaka juga orang Jepang.' },
      { japanese: 'としょしつは どこですか。', romaji: 'toshoshitsu wa doko desu ka.', meaning: 'Di mana ruang perpustakaan?' },
      { japanese: 'このパンは いくらですか。', romaji: 'kono pan wa ikura desu ka.', meaning: 'Berapa harga roti ini?' },
      { japanese: 'おおきくないです。', romaji: 'ookiku nai desu.', meaning: 'Tidak besar.' },
    ],
    practice: ['わたし（　） がくせいです。 Pilih partikel: は・の・も・と.', 'いま、なんじですか（　）。 Pilih partikel penutup pertanyaan: は・か・の・も.', 'ここは（　）のへやですか。 Jawaban: すずきせんせいのへやです。'],
  },
  {
    id: 'kaiwa', title: 'Kaiwa (percakapan)', category: 'Percakapan', source: 'Kitab Suci NKK',
    summary: 'Latihan membaca dan mendengarkan dialog dalam modul.',
    explanation: ['Bacalah tiap baris bergantian. Perhatikan sapaan, penggunaan partikel, dan cara menjawab. Tekan tombol audio untuk mendengarkan kalimat Jepang.'],
    examples: [
      { japanese: 'はじめまして。リン・タイです。', romaji: 'Hajimemashite. Rin Tai desu.', meaning: 'Salam kenal. Saya Rin Tai.' },
      { japanese: 'おくには どちらですか。', romaji: 'Okuni wa dochira desu ka.', meaning: 'Anda berasal dari negara mana?' },
      { japanese: 'ちゅうごくです。', romaji: 'Chuugoku desu.', meaning: 'Dari Cina.' },
      { japanese: 'わたしは がくせいです。', romaji: 'Watashi wa gakusei desu.', meaning: 'Saya seorang siswa.' },
      { japanese: 'これは なんのCDですか。', romaji: 'Kore wa nan no CD desu ka.', meaning: 'Ini CD tentang apa?' },
      { japanese: 'にほんごのCDです。', romaji: 'Nihongo no CD desu.', meaning: 'CD bahasa Jepang.' },
    ],
    practice: ['Dengarkan setiap kalimat, lalu ulangi dengan intonasi yang sama.', 'Latihan pasangan: tanyakan asal negara dan jawab dengan pola ～です。'],
  },
  {
    id: 'latihan', title: 'Latihan dari Kitab', category: 'Latihan', source: 'Kitab Suci NKK',
    summary: 'Latihan baca, kosakata, kata tanya, partikel, dan kata sifat.',
    explanation: ['Kerjakan lebih dulu tanpa membuka contoh di atas. Untuk soal yang meminta jawaban sesuai konteks, gunakan contoh jawaban dari buku sebagai petunjuk dan buat kalimat lengkap.'],
    examples: [
      { japanese: 'ここは ______ のへやですか。', meaning: 'Jawaban contoh buku: すずきせんせい' },
      { japanese: 'あなたのへやは ______ へやですか。', meaning: 'Jawaban contoh buku: ちいさい' },
      { japanese: 'としょしつは ______ ですか。', meaning: 'Jawaban contoh buku: あそこ' },
      { japanese: 'いま、______ ですか。', meaning: 'Jawaban contoh buku: ９じはん' },
      { japanese: 'わたし（　） がくせいです。', meaning: 'Isi partikel. Contoh pola di modul menggunakan は.' },
      { japanese: 'たなかさん（　）やまもとさんは にほんじんです。', meaning: 'Isi partikel penghubung “dan”: と.' },
      { japanese: 'いいえ、おおきく（　）です。', meaning: 'Lengkapi bentuk negatif kata sifat-i: ない.' },
    ],
    practice: ['Baca hiragana dan katakana pada bagian latihan menulis.', 'Sebutkan romaji dan arti: きって、ざっし、けっこん、ひゃく、りょこう。', 'Jawab dengan bentuk negatif: おおきいですか。・あたらしいですか。・たかいですか。'],
  },
]

export const unavailableSupplementalMaterials: LearningMaterial[] = [
  { id: 'kotoba-n5', title: 'Kotoba N5', category: 'Modul tambahan', source: 'Modul tambahan belum diberikan', summary: 'Kosakata N5 akan ditampilkan saat modul resminya tersedia.', explanation: ['Belum ada modul Kotoba N5 yang disertakan. Materi ini sengaja tidak diisi dengan daftar buatan.'], examples: [] },
  { id: 'kanji', title: 'Kanji', category: 'Modul tambahan', source: 'Modul tambahan belum diberikan', summary: 'Materi kanji akan ditampilkan saat modul resminya tersedia.', explanation: ['Kitab Suci NKK memberi pengenalan Kanji dan contoh 山・雨, tetapi tidak memberi daftar kanji pembelajaran. Bagian modul kanji terstruktur menunggu sumber resmi agar tidak mengarang materi.'], examples: [{ japanese: '山', romaji: 'yama', meaning: 'Gunung (contoh pengenalan dalam Kitab Suci NKK)' }, { japanese: '雨', romaji: 'ame', meaning: 'Hujan (contoh pengenalan dalam Kitab Suci NKK)' }] },
]
