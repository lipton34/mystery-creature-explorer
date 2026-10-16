# 川辺の画像レイヤー確認版

## 素材
- `background.png`: 空・遠景の森・対岸・小川。モリルなし。
- `tail.png`: 背景透過の尾と付け根。左に先端、右に太い付け根。独立して左から右へ移動。
- `foreground.png`: 背景透過の木・枝葉・根元。尾より手前に合成。

合計約5.4MBのPNG。画像生成の内蔵ツールで作成。手描き調の2枚目の合意済みコンセプトを参照し、別々の素材として生成したもの。元絵を機械的に切り抜いたわけではなく、構図の完全一致は保証しない。実行時に重ねてサイズ・位置を調整する。

ゲーム用の実ファイルはこのディレクトリに保存し、外部URLやCodex固有の保存先には依存しない。透過部分と背景にモリルが焼き込まれていないことを実際の合成表示で確認する。

## 現在の制約
川辺の手前〜目撃地点の東向き付近だけに適用する2.5D試作。遠景・尾・前景の平面を別の奥行きに配置し、カメラの位置・向きから列ごとに投影する。方向転換や適用範囲の端では仮図形へ連続的に切り替える。360度の完成背景、床・水面の完全な3D再構築、素材境界の最終仕上げ、全ステージへの展開、実機の速度最適化は対象外。

`?view=first-person&art=geometry` は同じ地形・操作・判定の仮図形版。通常の `?view=first-person` と比較できる。

## 生成プロンプト
参照画像: この会話で合意した2枚目の手描き調の川辺コンセプト。内蔵画像生成ツールを使用し、背景は不透明、尾と前景はtransparent_background=true。

### 背景

Use case: precise-object-edit. Edit the supplied hand-painted game concept into the BACKGROUND PLATE for a layered first-person adventure game. Preserve the sunny warm hand-painted 2D style, open blue sky, distant woodland, sparkling turquoise stream across the lower half, far bank and eye-level viewpoint. Remove the dinosaur completely, reconstruct the forest naturally behind it. Also remove the large close tree framing the left edge and the two prominent near-to-middle tree trunks in the center and right; reconstruct the scene behind them so those trees can later be separate foreground overlays. Leave distant trees, sunlit low far-bank shrubs, natural stones and water. The central middle third should be relatively open so an independent large tail sprite can pass across the far bank later. No creatures, tail, people, UI, text, arrows, no checkerboard. Landscape 16:9 opaque background, one seamless painted scene. This must be a real game backdrop, not a collage of layers. Keep the reference's hand-painted texture and bright airy atmosphere.

### 前景

Use case: background-extraction / game-layer asset. Use the supplied painting as style and framing reference. Create a genuinely TRANSPARENT PNG foreground tree layer, 16:9 landscape, same eye-level perspective and warm sunlight / painterly bark and leaves. Include ONLY three full-height tree trunks with irregular sunlit leafy crowns at the top, and a small amount of low far-bank shrubs/rocks at their roots. Tree 1 at 12% canvas width, tree 2 at 53%, tree 3 at 91%. Trunks extend from top edge to ground at 59% canvas height, each trunk about 4% of canvas width. Leaves mainly along top edge, do not create a low dark ceiling. The intervening gaps between trunks must be genuinely transparent and wide; especially a clear horizontal sightline at canvas height 25%-48% through which a separate enormous tail will move. Everything below 66% height must be transparent so the stream backdrop remains visible. No dinosaur or tail, no water, no sky, no far forest, no opaque scenery painted into the gaps, no ground plane, no text or frame. This is a single aligned cutout layer to be composited over a separate forest/stream painting, NOT a whole scene and NOT a picture on a checkerboard. Keep delicate natural alpha edges.

### 尾

Use case: background-extraction / game sprite. Reference image is STYLE and CREATURE reference only. Create an isolated long muscular tyrannosaur-like tail on a genuinely transparent background, very wide landscape canvas about 3:1. Tail trails horizontally toward LEFT: thin pointed tip at left, heavy thick root at right, subtle low dorsal ridges, deep blue-green forest skin with olive sunlit upper planes and warm muted lighter underside. Confident hand-painted 2D adventure game brushwork exactly like the reference, simplified readable scales, not a photograph, not chibi. Tail fills the central 75% of canvas height and nearly the full width; entire thin tip fully inside left border. Gentle shallow natural curve, no curled or vertical tip. At the RIGHT edge, show only a small attached rear-haunch region extending naturally beyond the top and right borders, so the root is NOT a severed stump; the rest of the creature is outside the image. No head, legs, arms, eyes or full body. This is one usable transparent sprite that will slide left-to-right behind separate trees. No trees, leaves, water, ground, shadows cast onto a floor, landscape, UI, text or opaque background. Preserve convincing three-dimensional muscular volume in painterly form. Do not include a second tail or multiple views.

