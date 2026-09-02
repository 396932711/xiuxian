# 《宗门》UI 资源生成指南

> 本文档用于指导 **v1.0 及后续版本** 的 UI 图片资源生成。每个资源条目含：用途、文件路径、尺寸、可直接使用的生成 prompt。可用本指南配合 AI 绘图工具批量产出，部分核心资源已由 AI 生成并存入 `/workspace/assets/img/`。

## 一、美术风格总则（所有 prompt 共用）

**风格定位**：Q 版卡通国风 · 清新明亮仙侠风，扁平化 + 柔和光影，线条圆润，无尖锐棱角，适合儿童审美。

**通用风格关键词（可作为每个 prompt 的前缀/后缀复用）**：

```
Flat Chinese xianxia Q-style cartoon illustration, soft lighting, rounded lines,
no sharp edges, child-friendly, turquoise green + wood brown + warm gold palette,
light white cloud-mist background, peaceful and bright, clean vector-like flat shading
```

**色彩规范**：

* 主色：青绿色（#3FA89A 附近）、原木色（#B58A4E 附近）、暖金色（#E8B84E 附近）

* 背景：浅白云雾（#F4F7F4 附近），柔和不刺眼

* 境界服饰色：练气=灰袍、筑基=青袍、金丹=金袍（后续版本）

**尺寸规范**：

* 场景背景：`landscape_16_9`（1280×720）

* 建筑图：`square`（1024×1024）或 `landscape_4_3`（1152×864）

* 人物立绘：`portrait_4_3`（864×1152）

* 图标：`square_hd`（1024×1024）

* UI 装饰元素：`square`（1024×1024，后续裁切）

**文件命名规范**：`{类别}_{名称}_{状态/境界}.png`，如 `building_dian.png`、`disciple_lianqi.png`、`icon_lingshi.png`

***

## 二、v1.0 资源清单

| 资源     | 文件路径                             | 尺寸               | 状态  |
| ------ | -------------------------------- | ---------------- | --- |
| 宗门场景背景 | `assets/img/scene_bg.jpg`        | landscape\_16\_9 | 已生成 |
| 宗门大殿   | `assets/img/building_dian.jpg`   | square           | 已生成 |
| 灵矿场    | `assets/img/building_kuang.jpg`  | square           | 已生成 |
| 招募堂    | `assets/img/building_zhaomu.jpg` | square           | 已生成 |
| 练气弟子立绘 | `assets/img/disciple_lianqi.jpg` | portrait\_4\_3   | 已生成 |
| 灵石图标   | `assets/img/icon_lingshi.jpg`    | square\_hd       | 已生成 |

> **格式说明**：AI 生成工具默认输出 `.jpg`，故实际文件为 `.jpg`。若需透明背景 PNG，生成后用抠图工具处理并另存为 `.png`，文件名保持一致仅换扩展名。代码中按实际扩展名引用。

***

## 三、v1.0 详细生成 Prompt

### 1. 宗门场景背景 `scene_bg.png`

```
Game background scene for a Chinese xianxia idle game: distant misty green mountains
with floating white clouds and faint glowing immortal qi particles, peaceful sect
landscape, flat Q-style cartoon illustration, soft turquoise green and warm gold
tones, light white cloud-mist in foreground, NO characters, wide landscape with
clean empty center for UI overlay, child-friendly, bright and clean, vector-like
flat shading, no text
```

尺寸：`landscape_16_9`

### 2. 宗门大殿 `building_dian.png`

```
Q-style Chinese xianxia sect main hall building, simplified upturned-eaves roof,
grand wooden architecture with warm gold accents, flat cartoon illustration, soft
lighting, turquoise green and warm gold palette, plain light background, single
centered building, game asset icon, child-friendly, no text
```

尺寸：`square`

### 3. 灵矿场 `building_kuang.png`

```
Q-style Chinese xianxia spirit mine building, small wooden pavilion beside glowing
turquoise-blue spirit ore crystals and rocks, flat cartoon illustration, soft
lighting, turquoise and wood brown palette, plain light background, single centered
building with ore feature, game asset icon, child-friendly, no text
```

尺寸：`square`

### 4. 招募堂 `building_zhaomu.png`

```
Q-style Chinese xianxia recruitment hall building, wooden hall with a hanging
scroll banner sign, warm welcoming mood, flat cartoon illustration, soft lighting,
wood brown and warm gold palette, plain light background, single centered building,
game asset icon, child-friendly, no text
```

尺寸：`square`

### 5. 练气弟子立绘 `disciple_lianqi.png`

```
Q-style two-head-ratio Chinese xianxia disciple character, simple grey taoist robe
(qi-condensation realm), cute childlike face, standing full body portrait, flat
cartoon illustration, soft lighting, plain light background, game character asset,
child-friendly, no text
```

尺寸：`portrait_4_3`

### 6. 灵石图标 `icon_lingshi.png`

```
Game resource icon: a single glowing turquoise-blue spirit stone gem with soft
inner glow, flat cartoon style, soft lighting, plain light background, centered
single object, simple and recognizable, child-friendly, no text
```

尺寸：`square_hd`

***

## 四、v1.1+ 预留资源 Prompt（待生成）

### 药田 `building_yaotian.png`（v1.1）

```
Q-style Chinese xianxia herb farm building, small wooden shed beside rows of glowing
green spirit herbs with mature plants, flat cartoon illustration, soft lighting,
turquoise green and wood brown palette, plain light background, single centered
scene, game asset icon, child-friendly, no text
```

尺寸：`square`

### 丹房 `building_danfang.png`（v1.1）

```
Q-style Chinese xianxia alchemy room building, wooden hall with a glowing round
pill furnace cauldron, faint purple pill smoke, flat cartoon illustration, soft
lighting, wood brown and warm gold palette, plain light background, single centered
building, game asset icon, child-friendly, no text
```

尺寸：`square`

### 筑基弟子立绘 `disciple_zhuji.png`（v1.1）

```
Q-style two-head-ratio Chinese xianxia disciple character, simple cyan-blue taoist
robe (foundation-building realm), cute childlike face, standing full body portrait,
flat cartoon illustration, soft lighting, plain light background, game character
asset, child-friendly, no text
```

尺寸：`portrait_4_3`

### 灵药图标 `icon_lingyao.png`（v1.1）

```
Game resource icon: a single glowing green spirit herb with luminous leaves, flat
cartoon style, soft lighting, plain light background, centered single object, simple
and recognizable, child-friendly, no text
```

尺寸：`square_hd`

### 丹药图标 `icon_danyao.png`（v1.1）

```
Game resource icon: a single round golden pill medicine with faint glow, flat
cartoon style, soft lighting, plain light background, centered single object, simple
and recognizable, child-friendly, no text
```

尺寸：`square_hd`

### 突破石图标 `icon_tupoishi.png`（v1.2）

```
Game resource icon: a single glowing amber-orange breakthrough stone rune crystal,
flat cartoon style, soft lighting, plain light background, centered single object,
simple and recognizable, child-friendly, no text
```

尺寸：`square_hd`

***

## 五、UI 装饰元素（可选，按需生成）

### 云纹装饰底纹 `ui_cloud_pattern.png`

```
Seamless Chinese cloud pattern decorative motif, soft swirling cloud lines, flat
cartoon style, very light and subtle, turquoise green outline on near-white
background, game UI ornament, child-friendly, no text
```

尺寸：`square`

### 弹窗面板底纹 `ui_panel_bg.png`

```
Chinese xianxia game UI panel background, soft semi-transparent parchment texture
with subtle cloud ornaments at corners, flat cartoon style, warm cream and light
gold, rounded corners, clean center for content, child-friendly, no text
```

尺寸：`landscape_4_3`

***

## 六、生成与使用说明

1. **生成方式**：将上述 prompt 喂给 AI 绘图工具（SDXL 系最佳），按指定尺寸产出。
2. **透明背景**：建筑图/立绘/图标建议后续抠图为透明 PNG（AI 直出多为纯色背景，可用抠图工具处理）。v1.0 可先用纯色背景，CSS 用 `border-radius` 与背景色融合。
3. **一致性**：所有资源共用第一节"通用风格关键词"，保证整包画风统一。
4. **亲子参与**：可让孩子先画草图，再把草图作为参考图喂给生成工具，代入感更强。
5. **存储位置**：所有图片置于 `/workspace/assets/img/`，代码中按相对路径 `assets/img/xxx.png` 引用。
6. **尺寸适配**：生成后按需用 CSS 缩放；图标在 UI 中通常显示为 32-64px，建筑卡片 128-256px。

