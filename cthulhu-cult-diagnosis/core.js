// ================================================================
// 神格データ (16タイプ) — オリジナルのまま、変更しないこと
// ================================================================
const gods = [
  { name: "クトゥルフ", typeName: "眠れる終末を待つ信徒", catch: "あなたはすでに知っている。終わりが来ることを。", tendency: "巨大な存在への畏敬を抱き、終末の到来を静かに待ち続けることに安らぎを覚える。深海の夢を見たことがある、と言われても否定できない。", role: "夢を通じた啓示の受信者。終末が訪れたとき、最初に目覚め、最初に海へ向かう者として選ばれている。", doom: "待ちすぎて、現実に戻る理由を完全に失ってしまう。", good: "ヨグ＝ソトース", bad: "ニャルラトテップ", skills: "〈夢見る〉〈航法〉〈水泳〉", ritual: "満月の夜、海辺で眠りにつく。目覚めたとき、あなたは少しだけ変わっている。", sns: "クトゥルフ神話TRPG狂信者診断、やってみた\n\n結果：「眠れる終末を待つ信徒」\n終わりを知り、海を眺め、ただ静かに待ちます。\n\n#狂信者適性診断 #クトゥルフ神話TRPG" },
  { name: "ダゴン／ヒュドラ", typeName: "血と海に還る共同体信者", catch: "血は水よりも濃い。そして海よりも深い。", tendency: "血族の絆と土地への帰属意識が人一倍強い。閉じた共同体の中にこそ本当の安心があると感じており、「余所者」という言葉を口にするとき少し目が細くなる。", role: "共同体の結束を保つ番人。儀式の夜、誰よりも先に海へ入る者として知られている。", doom: "仲間を守ろうとするうちに、自分が何者かを忘れていく。", good: "クトゥルフ", bad: "イタクァ", skills: "〈説得〉〈水泳〉〈自然〉", ritual: "集落の者たちと夜の海へ向かう。誰も帰り道を気にしない夜に限って、海が温かい。", sns: "クトゥルフ神話TRPG狂信者診断、やってみた\n\n結果：「血と海に還る共同体信者」\n血筋と海と仲間たちのもとへ還ります。\n\n#狂信者適性診断 #クトゥルフ神話TRPG" },
  { name: "ニャルラトテップ", typeName: "混乱を広げる扇動者", catch: "あなたは舞台の外から見ていたはずなのに、いつの間にか演者になっていた。", tendency: "人を試すことに愉悦を覚え、混沌を観察する楽しさに惹かれる。仮面をつけた自由こそが本当の自由だと信じている節がある。", role: "扇動者。集団の均衡を崩す言葉を一つだけ静かに投げ込み、どこまで広がるか面白そうに見届ける。", doom: "最終的に、自分が何を信じていたのかわからなくなる。", good: "イゴーロナク", bad: "イグ", skills: "〈心理学〉〈変装〉〈言いくるめ〉", ritual: "人が集まる場所で、ひとつだけ嘘をつく。真実のように語って、どこまで広がるかを楽しむ。", sns: "クトゥルフ神話TRPG狂信者診断、やってみた\n\n結果：「混乱を広げる扇動者」\n混沌を愛し、仮面をつけ、人を試します。\n\n#狂信者適性診断 #クトゥルフ神話TRPG" },
  { name: "ヨグ＝ソトース", typeName: "門を開く禁知の術者", catch: "門は開いていた。あなたが気づいていなかっただけで。", tendency: "知識への渇望と禁忌の研究に強く惹かれる。時間と空間の境界、そして「知ってはいけない理由」にこそ興味を持つ。", role: "禁術の研究者。誰も読めない文書を解読し、誰も試みなかった術を静かに実行する者。", doom: "知ってしまった後、知らなかった頃には二度と戻れない。", good: "クトゥルフ", bad: "ノーデンス", skills: "〈図書館〉〈オカルト〉〈クトゥルフ神話〉", ritual: "深夜の書斎で、「決して読んではいけない」と言われた書のページを静かに開く。", sns: "クトゥルフ神話TRPG狂信者診断、やってみた\n\n結果：「門を開く禁知の術者」\n門を開き、境界を越え、知ってはならないことを知ります。\n\n#狂信者適性診断 #クトゥルフ神話TRPG" },
  { name: "シュブ＝ニグラス", typeName: "生命と群れの祝祭信者", catch: "生きること、増えること、満ちること。それが信仰の形。", tendency: "生命力への崇敬と祝祭の歓喜に強く惹かれる。群れの中にいるとき、自分が最もよく生きていると感じる。", role: "生命の礼賛者。森の祭りで叫び、踊り、増えゆくものを心から祝福する者。", doom: "自分が群れの一部になりすぎて、個としての自分が静かに消えていく。", good: "ダゴン／ヒュドラ", bad: "ツァトゥグァ", skills: "〈自然〉〈医学〉〈説得〉", ritual: "深夜の森で、仲間たちと焚き火を囲んで夜明けまで歌う。声が嗄れるまで。", sns: "クトゥルフ神話TRPG狂信者診断、やってみた\n\n結果：「生命と群れの祝祭信者」\n生命と祝祭と繁栄を心から愛します。\n\n#狂信者適性診断 #クトゥルフ神話TRPG" },
  { name: "イグ", typeName: "蛇と掟を重んじる戒律信者", catch: "掟を破ったのは誰だ。イグは覚えている。", tendency: "古い掟への敬意と血筋への誇りを持つ。禁忌を犯した者に対して、静かに、しかし確実に使命感を燃やす。", role: "戒律の執行者。古い約束が破られた時、音もなく現れ、然るべき結末を見届ける者。", doom: "誰かを裁き続けていたはずが、気づけば自分が裁かれる側になっている。", good: "ガタノソア", bad: "ニャルラトテップ", skills: "〈博物学〉〈目星〉〈法律〉", ritual: "蛇が棲む場所を訪れ、古い約束を声に出して一つ一つ確認する。蛇は聞いている。", sns: "クトゥルフ神話TRPG狂信者診断、やってみた\n\n結果：「蛇と掟を重んじる戒律信者」\n掟は守るもの。破れば必ず報いがある。\n\n#狂信者適性診断 #クトゥルフ神話TRPG" },
  { name: "ツァトゥグァ", typeName: "地下で怠惰に祀る享楽信者", catch: "動かなくていい。信仰は、静かにそこにある。", tendency: "怠惰を肯定し、快適な地下空間を愛する。眠ることを崇高な行為と捉えており、「明日でいい」という言葉を人生の哲学にしている。", role: "神に仕える怠惰な守護者。儀式は最小限、でも確実に、そして静かに行う。それで十分だ。", doom: "あまりに快適すぎて、外に出る理由を完全に、永遠に失ってしまう。", good: "グラーキ", bad: "シュブ＝ニグラス", skills: "〈図書館〉〈回避〉〈隠れる〉", ritual: "地下室で灯りを一つだけつけて、何もせずにただそこにいる。それが最高の信仰。", sns: "クトゥルフ神話TRPG狂信者診断、やってみた\n\n結果：「地下で怠惰に祀る享楽信者」\n怠惰こそ悟り。地下でただ待ちます。\n\n#狂信者適性診断 #クトゥルフ神話TRPG" },
  { name: "グラーキ", typeName: "黙示録を記す湖畔の信者", catch: "静かな湖は、すべてを記録している。", tendency: "記録と観察への強い欲求を持ち、秘密の文書を集めることに静かな喜びを感じる。じわじわと侵食していく何かを好む。", role: "黙示録の書記。誰も知らない真実を書き留め、湖の底で永遠に保管し続ける者。", doom: "知りすぎて、誰にも何も話せなくなる。", good: "ヨグ＝ソトース", bad: "ハスター", skills: "〈図書館〉〈歴史〉〈心理学〉", ritual: "湖畔で日記をつける。書いた内容は、翌朝には少しだけ変わっている。", sns: "クトゥルフ神話TRPG狂信者診断、やってみた\n\n結果：「黙示録を記す湖畔の信者」\nすべてを記録し、静かな湖の畔で待ちます。\n\n#狂信者適性診断 #クトゥルフ神話TRPG" },
  { name: "ハスター", typeName: "黄衣と舞台に魅入られた審美信者", catch: "美しく滅ぶなら、それは幸いなことだ。", tendency: "芸術と演劇への強い執着を持ち、破滅的な物語の美しさに心から惹かれる。仮面と真の顔の狭間を生きることを好む。", role: "破滅の審美家。最後の幕が下りる瞬間を、誰よりも美しく演出する者。", doom: "あまりに完璧に演じすぎて、自分の本心がどこにあったか見失ってしまう。", good: "ニャルラトテップ", bad: "グラーキ", skills: "〈芸術〉〈説得〉〈変装〉", ritual: "黄色い衣をまとい、誰もいない舞台で一人芝居を演じる。観客はいない方が美しい。", sns: "クトゥルフ神話TRPG狂信者診断、やってみた\n\n結果：「黄衣と舞台に魅入られた審美信者」\n美しく生き、美しく滅びます。\n\n#狂信者適性診断 #クトゥルフ神話TRPG" },
  { name: "ガタノソア", typeName: "見てはいけない神を畏れる犠牲信者", catch: "見てはいけない。だが、あなたは見てしまうだろう。", tendency: "禁忌の重さを誰よりも深く知っており、古代神殿と犠牲の意味を静かに理解している。「なぜ禁じられているのか」を問い続ける。", role: "犠牲の供物係。神の前に立ち、目を閉じたまま夜明けまで祈り続ける唯一の者として。", doom: "禁忌を守るために、全てを捧げすぎてしまう。", good: "イグ", bad: "ニャルラトテップ", skills: "〈考古学〉〈オカルト〉〈歴史〉", ritual: "古い神殿の最深部まで進み、目を閉じたまま夜明けまで祈る。何も見ない。", sns: "クトゥルフ神話TRPG狂信者診断、やってみた\n\n結果：「見てはいけない神を畏れる犠牲信者」\n禁忌を守り、ひたすら畏れ、ただ捧げます。\n\n#狂信者適性診断 #クトゥルフ神話TRPG" },
  { name: "ボクルグ", typeName: "滅びた都市の水神を祀る復讐信者", catch: "失われた者たちの嘆きは、まだ水底に響いている。", tendency: "忘れられた神や失われた民への強い共感を持つ。誰も覚えていない名前を、自分だけは覚えている。", role: "忘れられたものの代弁者。水辺で儀式を行い、消えた者たちの名を一人ずつ呼ぶ。", doom: "過去への執着が強すぎて、現在に生きることができなくなる。", good: "グラーキ", bad: "チャウグナー・フォーン", skills: "〈歴史〉〈考古学〉〈水泳〉", ritual: "廃墟となった水辺で、失われた者たちの名を一人ずつ声に出して呼ぶ。", sns: "クトゥルフ神話TRPG狂信者診断、やってみた\n\n結果：「滅びた都市の水神を祀る復讐信者」\n忘れられたものを悼み、水底で待ちます。\n\n#狂信者適性診断 #クトゥルフ神話TRPG" },
  { name: "イゴーロナク", typeName: "禁書に堕ちる欲望信者", catch: "禁書には、あなたが見ないようにしていた自分が書いてある。", tendency: "禁書と隠された本性への興味を持ち、見て見ぬふりをやめることで自由になれると信じている。欲望を認めることを恐れない。", role: "本性の解放者。自分の中にある欲望を正直に認め、仮面を静かに外す勇気を持つ者。", doom: "解放しすぎて、歯止めがどこにあったかを忘れてしまう。", good: "ニャルラトテップ", bad: "イグ", skills: "〈心理学〉〈図書館〉〈オカルト〉", ritual: "誰にも見せていない日記に、本当のことだけを書く夜。それが信仰の第一歩。", sns: "クトゥルフ神話TRPG狂信者診断、やってみた\n\n結果：「禁書に堕ちる欲望信者」\n禁書を読み、本性を正面から見つめます。\n\n#狂信者適性診断 #クトゥルフ神話TRPG" },
  { name: "アイホート", typeName: "契約と巣に取り込まれる宿主型信者", catch: "契約は対等ではない。でも、あなたはサインした。", tendency: "契約と選択の重さを深く知っており、逃げ道のない取引の中にある種の誠実さを感じる。約束は守られなければならないと、心の底から思っている。", role: "契約の仲介者。取引を成立させ、条件を記憶し、その履行を静かに見届ける者。", doom: "契約に縛られすぎて、自分がいつから何を望んでいたのかを忘れる。", good: "ヨグ＝ソトース", bad: "ノーデンス", skills: "〈法律〉〈交渉〉〈心理学〉", ritual: "深夜に、誰かと約束を交わす。その約束は必ず守られなければならない。", sns: "クトゥルフ神話TRPG狂信者診断、やってみた\n\n結果：「契約と巣に取り込まれる宿主型信者」\n契約を結び、全てを抱えて生きます。\n\n#狂信者適性診断 #クトゥルフ神話TRPG" },
  { name: "チャウグナー・フォーン", typeName: "古代偶像に仕える搾取型信者", catch: "古代の偶像の前では、あなたも供物に過ぎない。", tendency: "古い偶像への崇拝と支配・長寿への欲求を持つ。静かな圧迫感の中にある安心を知っている。奪われているとわかっていても、そこを離れられない。", role: "偶像の世話人。古い神に仕え、その力の一部をわずかに受け取りながら生き続ける者。", doom: "崇拝し続けるうちに、自分が少しずつ奪われていることに気づかない。", good: "ガタノソア", bad: "ボクルグ", skills: "〈考古学〉〈オカルト〉〈医学〉", ritual: "古い彫像の前に、何かを静かに置いていく。翌日には必ず消えている。", sns: "クトゥルフ神話TRPG狂信者診断、やってみた\n\n結果：「古代偶像に仕える搾取型信者」\n偶像に仕え、力を受け取り、長く生きます。\n\n#狂信者適性診断 #クトゥルフ神話TRPG" },
  { name: "イタクァ", typeName: "極寒と孤独に呼ばれる放浪信者", catch: "孤独は罰ではない。選ばれた者の証だ。", tendency: "孤独と寒さの中にある自由に惹かれる。追放された者への共感と、誰もいない場所への純粋な憧れがある。", role: "放浪の伝令。どこにも属さず、どこへでも行けることを誇りとする者。", doom: "孤独に慣れすぎて、人の温かさに二度と戻れなくなる。", good: "イグ", bad: "シュブ＝ニグラス", skills: "〈航法〉〈自然〉〈生存〉", ritual: "誰もいない場所で、風の音だけを聞きながら夜明けまで立ちつくす。", sns: "クトゥルフ神話TRPG狂信者診断、やってみた\n\n結果：「極寒と孤独に呼ばれる放浪信者」\n孤独と寒さの中にのみ、自由を見ます。\n\n#狂信者適性診断 #クトゥルフ神話TRPG" },
  { name: "ノーデンス", typeName: "闇に抗う旧神の導かれし者", catch: "深淵を見た。でも、あなたはまだここにいる。", tendency: "神話の深淵を覗きながら堕ちきらない意志を持つ。助けること、抗うこと、夢と海の境界で案内することに意味を感じる。", role: "あなたは狂信者ではありません。ただし、神話から逃げられるわけでもありません。夢と海の境界に立ち続ける、例外の者。", doom: "抗い続けることで、気づかないうちに静かに消耗していく。", good: "グラーキ", bad: "ヨグ＝ソトース", skills: "〈精神分析〉〈医学〉〈オカルト〉", ritual: "夢の中で何かに抗う。目覚めたとき、何かを掴んでいる気がする。毎朝。", sns: "クトゥルフ神話TRPG狂信者診断、やってみた\n\n結果：「闇に抗う旧神の導かれし者」\n狂信者ではない。でも神話からは逃げられない。\n\n#狂信者適性診断 #クトゥルフ神話TRPG" }
];

// ================================================================
// 質問データ (14問) — オリジナルのまま
// ================================================================
const questions = [
  { q: "深夜、見知らぬ扉を見つけた。あなたはどうする？", choices: [
    { text: "迷わず開ける", scores: {3:2, 2:1} },
    { text: "じっくり観察してから開ける", scores: {3:1, 7:2} },
    { text: "メモだけして立ち去る", scores: {7:1, 15:2} },
    { text: "気にせず通り過ぎる", scores: {6:1, 14:2} } ] },
  { q: "あなたが最も落ち着く場所は？", choices: [
    { text: "海辺、波の音の中", scores: {0:2, 1:1, 10:1} },
    { text: "古い図書館や書斎", scores: {3:2, 11:1} },
    { text: "深い森の奥", scores: {4:2, 5:1} },
    { text: "暗い地下室や洞窟", scores: {6:2, 7:1} } ] },
  { q: "禁じられた本が目の前にある。どうする？", choices: [
    { text: "構わず読む", scores: {3:2, 11:2} },
    { text: "誰かに渡して反応を見る", scores: {2:2, 12:1} },
    { text: "読まず、記録だけして保管する", scores: {7:2, 9:1} },
    { text: "そっと元の場所に戻す", scores: {15:2, 5:1} } ] },
  { q: "世界の終わりが明日来ると知ってしまった。あなたは？", choices: [
    { text: "眠って静かに迎える", scores: {0:2, 6:2} },
    { text: "人々に知らせて騒ぎ立てる", scores: {2:2, 8:1} },
    { text: "一人で儀式を行う", scores: {3:1, 4:2, 10:1} },
    { text: "誰かを守ろうとする", scores: {15:2, 1:1} } ] },
  { q: "信仰に最も必要なものは、何だと思う？", choices: [
    { text: "仲間や血族への帰属感", scores: {1:2, 4:1} },
    { text: "知識と終わりなき探求心", scores: {3:2, 7:1} },
    { text: "美的感性と表現力", scores: {8:2, 11:1} },
    { text: "契約と相互の利益", scores: {13:2, 12:1} } ] },
  { q: "誰かを救えるが、自分は戻れなくなる。どうする？", choices: [
    { text: "迷わず助ける", scores: {15:2, 9:2} },
    { text: "条件次第で考える", scores: {12:2, 2:1} },
    { text: "遠くから見守るだけにする", scores: {0:1, 7:2} },
    { text: "自分を優先する", scores: {14:2, 6:1} } ] },
  { q: "あなたの怒りに火をつけるのは？", choices: [
    { text: "約束や掟を破られること", scores: {5:2, 1:1} },
    { text: "退屈と無意味な日常", scores: {2:2, 6:1} },
    { text: "美や芸術を踏みにじられること", scores: {8:2, 11:1} },
    { text: "孤立させられること", scores: {14:2, 10:2} } ] },
  { q: "夢についてどう思う？", choices: [
    { text: "夢は未来への予言だ", scores: {0:2, 3:1} },
    { text: "夢は現実から逃れる場所", scores: {6:2, 14:1} },
    { text: "夢で人に影響を与えたい", scores: {2:2, 7:1} },
    { text: "夢と現実の区別がほぼない", scores: {8:2, 11:1} } ] },
  { q: "集団と個人、どちらが大切？", choices: [
    { text: "集団こそがすべて", scores: {1:2, 4:2, 10:1} },
    { text: "個人の意志が最優先", scores: {5:2, 14:1} },
    { text: "集団を外から動かしたい", scores: {2:1, 12:2} },
    { text: "状況次第、臨機応変に", scores: {15:1, 7:1, 13:1} } ] },
  { q: "掟や規則についてどう思う？", choices: [
    { text: "守るべきものだ", scores: {5:2, 9:2} },
    { text: "知った上で意図的に破る", scores: {3:1, 11:2} },
    { text: "あまり興味がない", scores: {6:2, 0:1} },
    { text: "自分が作る立場でいたい", scores: {13:2, 2:1} } ] },
  { q: "あなたが最も恐れるものは？", choices: [
    { text: "忘れ去られること", scores: {10:2, 7:1} },
    { text: "何も知らないまま終わること", scores: {3:2, 11:1} },
    { text: "老いや衰えること", scores: {13:2, 0:1} },
    { text: "孤独になること", scores: {1:2, 4:1} } ] },
  { q: "儀式を行うとしたら、どんな形で？", choices: [
    { text: "海辺で、月明かりの下で", scores: {0:2, 1:1} },
    { text: "森で、仲間たちと賑やかに", scores: {4:2, 15:1} },
    { text: "深夜の書斎で、一人静かに", scores: {3:2, 7:1} },
    { text: "廃墟で、炎を囲んで", scores: {10:2, 8:1} } ] },
  { q: "神話の世界での役割、あなたに合うのは？", choices: [
    { text: "預言者・先導者", scores: {0:2, 3:1} },
    { text: "道化・扇動者", scores: {2:2, 8:1} },
    { text: "番人・戒律の守り手", scores: {5:2, 9:2} },
    { text: "記録者・観察者", scores: {7:2, 6:1} } ] },
  { q: "もし神に何かを求めるとしたら？", choices: [
    { text: "終わりの安らぎと解放", scores: {0:2, 6:2} },
    { text: "誰も知らぬ禁断の知識", scores: {3:2, 11:1} },
    { text: "混沌と予測不能な面白さ", scores: {2:2, 12:2} },
    { text: "力と長寿", scores: {13:2, 9:2} } ] }
];

// ================================================================
// 共通エンジン
//   ・HTML側に以下のフックを期待する：
//   ・renderChoice(text, index, onClick) → 各案ごとに上書き可能
//   ・renderQuestionExtra(q, currentIndex, total) → 案D 等で見出し装飾
// ================================================================
let scores = new Array(16).fill(0);
let currentQ = 0;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function startDiagnosis() {
  scores = new Array(16).fill(0);
  currentQ = 0;
  renderQuestion();
  showScreen('screen-question');
}

function renderQuestion() {
  const total = questions.length;
  const q = questions[currentQ];
  const pct = (currentQ / total) * 100;

  const progressLabel = document.getElementById('progress-label');
  const progressFill  = document.getElementById('progress-fill');
  const qNum  = document.getElementById('q-num');
  const qText = document.getElementById('q-text');
  if (progressLabel) progressLabel.textContent = `${currentQ + 1} / ${total}`;
  if (progressFill)  progressFill.style.width  = `${pct}%`;
  if (qNum)  qNum.textContent  = `問 ${String(currentQ + 1).padStart(2, '0')}`;
  if (qText) qText.textContent = q.q;

  if (typeof renderQuestionExtra === 'function') {
    renderQuestionExtra(q, currentQ, total);
  }

  const container = document.getElementById('choices');
  container.innerHTML = '';
  q.choices.forEach((choice, i) => {
    const node = (typeof renderChoice === 'function')
      ? renderChoice(choice.text, i, () => selectChoice(choice.scores))
      : defaultRenderChoice(choice.text, i, () => selectChoice(choice.scores));
    container.appendChild(node);
  });
}

function defaultRenderChoice(text, i, onClick) {
  const labels = ['Ａ', 'Ｂ', 'Ｃ', 'Ｄ'];
  const btn = document.createElement('button');
  btn.className = 'choice-btn';
  btn.innerHTML = `<span class="choice-prefix">${labels[i]}</span>${text}`;
  btn.onclick = onClick;
  return btn;
}

function selectChoice(scoreMap) {
  for (const [idx, pts] of Object.entries(scoreMap)) {
    scores[parseInt(idx)] += pts;
  }
  currentQ++;
  if (currentQ >= questions.length) {
    showResult();
  } else {
    renderQuestion();
  }
}

function calcResultIdx() {
  let maxScore = -1;
  let resultIdx = 0;
  scores.forEach((s, i) => {
    if (s > maxScore) { maxScore = s; resultIdx = i; }
  });
  return resultIdx;
}

function showResult() {
  const idx = calcResultIdx();
  const god = gods[idx];
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('r-deity', god.name);
  set('r-typename', god.typeName);
  set('r-catch', `「${god.catch}」`);
  set('r-tendency', god.tendency);
  set('r-role', god.role);
  set('r-doom', god.doom);
  set('r-good', god.good);
  set('r-bad', god.bad);
  set('r-skills', god.skills);
  set('r-ritual', god.ritual);
  set('r-sns', god.sns);

  if (typeof onResultRendered === 'function') {
    onResultRendered(god, idx);
  }
  showScreen('screen-result');
}

function copySNS() {
  const text = document.getElementById('r-sns').textContent;
  toClipboard(text, 'msg-sns');
}
function copyFullResult() {
  const god = gods[calcResultIdx()];
  const lines = [
    '【クトゥルフ神話TRPG 狂信者適性診断】', '',
    `神格：${god.name}`,
    `タイプ：${god.typeName}`, '',
    `「${god.catch}」`, '',
    `信仰傾向：${god.tendency}`,
    `役割：${god.role}`,
    `破滅ポイント：${god.doom}`, '',
    `相性のいい神格：${god.good}`,
    `相性の悪い神格：${god.bad}`,
    `おすすめ技能：${god.skills}`, '',
    `儀式：${god.ritual}`,
  ];
  toClipboard(lines.join('\n'), 'msg-full');
}
function toClipboard(text, msgId) {
  const show = () => {
    const el = document.getElementById(msgId);
    if (!el) return;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2000);
  };
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(show).catch(() => fallbackCopy(text, show));
  } else {
    fallbackCopy(text, show);
  }
}
function fallbackCopy(text, callback) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
  if (callback) callback();
}
function restart() {
  scores = new Array(16).fill(0);
  currentQ = 0;
  showScreen('screen-title');
}
