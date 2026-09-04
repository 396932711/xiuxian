# 宗门 v1.1 · 阶段 2 生产体系拓展 规格说明

## 1. 问题 / 用户 / 目标

### 1.1 解决的问题

当前 v1.0/v1.3 版只有一条资源链（灵矿场 → 灵石），玩法闭环偏短。孩子玩 10 分钟后容易出现"弟子全部分配、大殿升到 5 级、接下来没新目标"的疲惫感。设计文档 § 阶段 2 规划了**药田 → 丹房 → 筑基突破**这个完整的二级生产链，以及藏经阁（修炼加成）+ 日常任务（引导性奖励）两个辅助系统，把游戏的可玩闭环从"3 分钟 → 升级一次大殿"拉长到"半小时 → 第一个弟子成功筑基"。

### 1.2 目标用户

* **主用户**：5-10 岁的孩子（掌门角色）——操作要直观、文字提示要短、产出要即时可感知。

* **辅助用户**：家长（调参/维护存档/协助改场景图）——所有新数值走 JSON 配置，不改代码；新增建筑的坐标摆放完全复用 v1.4 的 position 机制。

### 1.3 目标（Goals）

* G1：新增**灵药资源 + 药田建筑**，实现"分配弟子种药 → tick 自动产灵药 → 存档持久化/离线结算"完整闭环。

* G2：新增**丹药资源 + 丹房建筑**，实现"分配弟子炼丹 → 消耗灵药 → tick 自动产丹药"完整闭环。

* G3：把**境界系统从"练气 10 级封顶"扩展为"练气 10 级满 → 消耗丹药突破 → 筑基 1-10 级"**，突破有概率 + 可多吃丹药提升成功率，练气产出 × 2 跃迁至筑基产出倍率 × 2（realms.zhuji.baseProduceMul=2.0）。

* G4：新增**藏经阁**（加成类建筑）——每级提升所有弟子/掌门的修炼经验速度，数值通过 JSON 配置驱动。

* G5：新增**日常任务系统**——每日 0 点刷新 3 条任务（采灵石 / 种灵药 / 升建筑），完成后手动领奖，奖励灵药、丹药、宗门贡献（预留后续用）。

* G6：**全部配置外置化**（符合 v1.3 工程约定）：新建筑元数据进 buildings.json、新资源进 resources.json（灵药/丹药/贡献的 unlockAtStage=2，顶栏自动显示）、新公式常量进 values.json。

* G7：**向下兼容**（老存档自动迁移）：v1.0 老玩家（无药田/丹房/藏经阁 state、无资源 lingyao/danyao/contribution、无任务 state）进入游戏自动补字段不报错。

### 1.4 非目标（Non-Goals）

* ❌ 不做战斗系统 / 秘境 / 突破石（金丹境材料）——留给 v1.2 阶段 3。

* ❌ 不做弟子天赋（根骨/悟性扩展）——留给 v1.2。

* ❌ 不做"背包"实体系统——底部导航索引 2（背包）仍提示"功能将在后续版本开放"。

* ❌ 不重写 UI 框架——继续用单文件 index.html 的 DOM 字符串拼装 + 纯 CSS 变量，不引入 React/Vue。

* ❌ 不生成真实建筑图片：暂时沿用 v1.4 的占位图路径（`building_yaotian.jpg / building_danfang.jpg / building_cangjing.jpg / building_zhuji.jpg`），家长可自行替换为 AI 图。

***

## 2. 功能需求（Functional Requirements）

### FR1 灵药资源 + 药田建筑 (对应 G1)

* FR1.1 资源元数据 `resources.resources.lingyao._unlockAtStage = 2`，顶栏渲染时根据 `_unlockAtStage` 自动显示（大殿 ≥ 阶段 2 解锁大殿等级触发，具体以 `state.buildings.dian.level` 为判定：大殿 Lv2 即算进入阶段 2，顶栏显示灵药；药田本身建出后才能采集）。

* FR1.2 `buildings.order` 增加 `"yaotian"`，`buildingMeta.yaotian` 含 id/name/img/desc/workerType=farming/slotCap/produces/position/labelPosition/zIndex/cardStyle。

* FR1.3 新游戏 state，`state.buildings.yaotian = { level:1, workerIds:[] }`。

* FR1.4 弟子/掌门状态机新增 `"farming"`（分配至药田）、召回时回到 `idle`。已在矿场的弟子不能直接切到药田，必须先召回。

* FR1.5 tick() 循环增加药田工位分支：按弟子 `producePer10s(d) × 灵药单产系数`（values.produce.lingyaoPerMul，默认 1.0，可调）累加到 `state.resources.lingyao`。掌门种药不触发士气加成（士气加成仅矿场，保留 v1.0 语义）。

* FR1.6 离线结算（settleOffline）累加灵药产出。

* FR1.7 建筑详情弹窗（openBuilding("yaotian")）：展示"工位 X/Y"、"当前产量：灵药 X/10秒"、空闲弟子列表每条一个「分配种药」按钮、在岗弟子列表每条一个「召回」按钮；以及"升级药田"按钮（升级增加工位，slots 公式 linear）。

### FR2 丹药资源 + 丹房建筑 (对应 G2)

* FR2.1 资源元数据 `resources.resources.danyao._unlockAtStage = 2`，顶栏同步显示。

* FR2.2 `buildings.order` 增加 `"danfang"`，元数据 `workerType=alchemy / slotCap / produces=danyao / consumes=lingyao / recipePillPerBatch=1 / recipeLingyaoCostPerBatch=3`（消耗和产出走 JSON，可调）。

* FR2.3 state 增加 `state.buildings.danfang = { level:1, workerIds:[] }`。

* FR2.4 弟子状态机新增 `"alchemy"`。

* FR2.5 tick() 丹房分支：先看灵药够不够（`lingyao >= consume × 在岗人数 × 系数`），然后消耗灵药，再产出丹药。公式：`每个炼丹弟子每 tick 消耗 3 灵药 → 产出 1 丹药`（可配置）；灵药不足时跳过该弟子，不扣负。

* FR2.6 离线结算（settleOffline）：先按批次消耗灵药（按总批次×单批消耗，不够就砍批次数量），对应产出丹药。

* FR2.7 建筑详情弹窗：展示"工位 X/Y"、"当前产量：丹药 X/10秒（消耗灵药 Y/10秒）"、"灵药库存：N"、空闲弟子「分配炼丹」/ 在岗弟子「召回」；以及"升级丹房"按钮。

### FR3 筑基境界 + 练气→筑基丹药突破 (对应 G3)

* FR3.1 境界 UI 扩展：弟子列表、掌门详情、建筑详情的人物徽标，境界名改为「练气 Lv.X / 筑基 Lv.X」按 `state.leader.realm` 和 disciples 真实 realm 显示。

* FR3.2 当某人物（弟子/掌门）当前境界 level == `realms[realm].maxLevel`（练气 Lv.10）时，在详情弹窗中出现「🚀 突破筑基」按钮。

* FR3.3 突破规则：

  * 检查 `realmId=lianqi → breakthrough.nextRealm=zhuji`。

  * 消耗丹药数量 = `needPill=1`（基础），但用户可选择"多吃 N 颗丹药提成功"，每多 1 颗 +10% 成功率，上限 `baseSuccessRate + needPillAddMax`（值放 values.breakthrough.pillBoostPerAdd=0.1, pillBoostAddMax=2，最多额外吃 2 颗 → 80%+20%=100%）。

  * `Math.random() < (baseSuccessRate + addPill*boost)` → 成功：`realm=zhuji / level=1 / exp=0`，toast "🎉 突破成功，进入筑基境！"

  * 失败：`level 回退到 maxLevel-1（即 Lv.9） / exp=0`，消耗的丹药不返还，toast "💧 突破失败，境界小退一步，再努力修炼吧！"（温柔惩罚，不删档、不清弟子）。

* FR3.4 筑基弟子的 `producePer10s` 自动乘以 `baseProduceMul=2.0`（ConfigLoader helpers 已有逻辑，直接生效，无需新写）。

* FR3.5 练气 Lv10 但没丹药 → 突破按钮禁用 + tooltip "需要 X 颗丹药才能突破"。

* FR3.6 掌门同样可突破（掌门筑基后产出同样 ×2、根骨 1.2 保留、produceMul 1.5 保留，叠加后总产出 = 练气掌门 × 2 = 练气弟子 × 3.6，强化掌门存在感）。

### FR4 藏经阁 修炼加速加成 (对应 G4)

* FR4.1 `buildings.order` 增加 `"cangjing"`，元数据：非生产无 worker，加成规则 `expBoostPerLevel: 0.05`（藏经阁每升 1 级，所有 idle/在岗弟子和掌门每 tick 额外 exp +5%）。

* FR4.2 state `state.buildings.cangjing = { level:1 }`。

* FR4.3 打开建筑详情：显示「当前加成：+X% 全员修炼速度（藏经阁 Lv.N → 每级 +Y%）」，升级按钮走通用 upgradeBuilding。

* FR4.4 tick() 经验分支：在 `d.exp += idleExpPerTick` 之前乘 `(1 + (cangjing.level-1) × expBoostPerLevel)`。注意：非在岗（idle）也拿加成。

* FR4.5 离线结算只结算生产（灵石/灵药/丹药），经验按老 tick 逻辑（因为 exp 本身就 tick，离线会算进去），这里会自然带上藏经阁加成。

### FR5 日常任务系统 (对应 G5)

* FR5.1 state 增加 `state.quests = { date:"YYYY-MM-DD", list:[{id,targetId,progress,need,claimed,reward:{lingshi,lingyao,danyao,contribution}}] }`。

* FR5.2 每日刷新：`render()` 或任一 UI 渲染前调用 `ensureDailyQuests()`，比对本地日期 `date !== today` → 清空旧 list 生成 3 条（从任务池 `GameConfig.values.quests.dailyPool` 随机挑 3 条不重复）。

* FR5.3 任务池（在 values.json `quests.dailyPool`）：

  * `采灵石`：type="collect\_resource", resource="lingshi", need=300, reward={ danyao:1, contribution:10 }

  * `种灵药`：type="collect\_resource", resource="lingyao", need=60, reward={ danyao:1, contribution:10 }

  * `升建筑`：type="upgrade\_building", anyLevelUpCount=2, reward={ lingyao:20, contribution:15 }

  * `练弟子`：type="exp\_sum", expGain=500, reward={ lingshi:100, contribution:10 }

  * `招新弟子`：type="recruit\_count", need=1, reward={ lingyao:15 }

* FR5.4 进度累计方式：每 tick 后、招募成功后、升级成功后、突破成功后分别触发 `incQuestProgress(type, delta)`。进度不超 need。

* FR5.5 UI：底部导航索引 3（任务）从 toast 占位改为打开**日常任务弹窗**（openQuests）。弹窗：

  * 今日日期大字标头

  * 每条任务：标题 / 进度条（progress / need）/ 未完成=进度文字 / 已完成未领=🎁 按钮「领取」/ 已领取=✅。

  * 点击「领取」= 加资源 + `claimed=true` + toast 飘字 + 重绘。

* FR5.6 存档持久化 quests 字段完整，老档（无 quests）自动补 `{date:"",list:[]}`，进入页面时 ensureDailyQuests() 会重建。

### FR6 全部配置外置化 (对应 G6)

* FR6.1 所有新增常量必须在以下两个地方同时存在，保持一致：

  1. `assets/config/*.json`（HTTP 模式读取）
  2. `assets/config.js` 的 `DEFAULTS.*`（file:// 双击失败时兜底）

* FR6.2 validate() 为所有新字段做类型校验和回填：

  * buildings 的新建筑（yaotian/danfang/cangjing）的 position/slotCap/workerType/produces/consumes/expBoostPerLevel 必须校验；

  * values 新增块：`produce.lingyaoPerMul / alchemy.recipe.* / quests.* / breakthrough.* / cangjing.expBoostPerLevel`；

  * realms.breakthrough.needPillAdd\* 做数字校验。

* FR6.3 helpers() 新增：

  * `H.slotCap(buildingKey, bldLevel)` 直接扩展即可已经支持任意建筑（yaotian/danfang 有 slotCap，cangjing 没有就返回 undefined）。

  * `H.lingyaoPer10s(d)`、`H.danyaoPerBatch()`、`H.lingyaoCostPerBatch()`、`H.breakthroughSuccessRate(realmId, extraPill)`、`H.cangjingExpMul()`。

### FR7 老存档兼容 (对应 G7)

* FR7.1 `loadGame()` 迁移：

  * 缺失 `state.buildings.yaotian` → 补 `{level:1,workerIds:[]}`；

  * 缺失 `state.buildings.danfang` → 补 `{level:1,workerIds:[]}`；

  * 缺失 `state.buildings.cangjing` → 补 `{level:1}`；

  * 缺失 `state.resources.lingyao / danyao / contribution` → 用 tmpl.resources 的初始值补（Object.assign 已经补，但要明确测试）；

  * 缺失 `state.quests` → 补 `{date:"",list:[]}`；

  * 弟子/掌门缺失 realm → 补 `realm=练气`（level 超限的话：lianqi.maxLevel 就回 10 级，没超就保持）。

* FR7.2 `newGame().version` 从 1.2 → 1.3，`loadGame` 时会把没 version 字段的老档兜底迁移后自动记 1.3。

* FR7.3 迁移后**不丢旧进度**：大殿等级、弟子数组、灵石数、掌门数据、建筑 worker 数组保持不变。

***

## 3. 非功能需求（Non-Functional Requirements）

### NFR1 亲子安全 & 零挫败

* NFR1.1 **不做负数资源**：炼丹灵药不足就跳过，绝不让 lingyao/danyao 变负（rule）。

* NFR1.2 **突破失败不删档、不把弟子降境界到练气起点以下**，最差回到练气 Lv.9 + exp=0（rule）。

* NFR1.3 **所有失败操作都 toast 中文温柔提示**，没有控制台 throw 红错误（rule）。

### NFR2 单页性能（低端平板也流畅）

* NFR2.1 tick() 单次同步执行耗时 ≤ 3ms（弟子数 ≤ 50 时）。Chrome DevTools Performance 面板验证。（rubric，阈值 2/2 为 pass）

* NFR2.2 首屏启动（从 HTTP 加载到首帧渲染）≤ 800ms。（rubric，阈值 2/2，用 DevTools 或 console.time 打点验证）

### NFR3 可配置性 & 文档

* NFR3.1 全部新增的可调节数值（灵药产量系数、炼丹消耗/产出、藏经阁加成、突破 +N 颗丹药系数、任务池 100% 走 JSON，代码零硬编码）。（rule，grep `lingyaoPerMul|recipe|expBoostPerLevel|pillBoostPerAdd|dailyPool` 在 index.html 内不应出现字面量）

* NFR3.2 新增配置字段必须在《配置文件总览.md》对应章节补条目，给家长能照抄改。（rule）

* NFR3.3 设计文档在「阶段 2」小节下补充药田/丹房/藏经阁/任务/筑基突破 5 条具体流程图说明。（rule）

### NFR4 存档兼容 & 可重放

* NFR4.1 v1.0/v1.3.1 任意已有存档导入后，游戏能正常玩，老弟子数组不变（rule：import 一个 v1.2 save JSON → 弟子数不变 + 灵石数不变 + 新增 state 字段自动补默认）。

* NFR4.2 导出新档 → 重置 → 导入 → 所有新字段（quests、yaotian、cangjing、lingyao、danyao）原样回来（rule）。

### NFR5 浏览器兼容

* NFR5.1 Chrome 110+ 和 Safari 16+ 上：顶栏资源、建筑渲染、任务弹窗、突破弹窗所有视觉无错位（rubric：2/2 通过才 pass）。

***

## 4. 约束 / 依赖 / 假设 / 开放问题

### 4.1 约束

* 保持单文件前端架构（index.html + assets/），**不引入 npm/webpack/React/Vue**，避免家长本地跑项目的门槛变高。

* 图片文件 `assets/img/*.jpg` 不存在时**不能让页面报错**（浏览器会显示裂图占位，可接受；不用额外兜底 SVG，先占位让家长自行换图）。

* 所有新 UI 文案（种药/炼丹/突破/任务）走 `ui.uiText.*`，**不直接把字符串嵌在 index.html**（方便以后翻译为家乡话版本）。

### 4.2 依赖

* 现有 v1.4 已落的能力：建筑 position 坐标化、ConfigLoader 加载/注入、resources 资源顶栏渲染、bottomNav 位置语义动作表、存档导入导出带 `__zongmen_save__` 校验。

* 设计文档阶段 2 章节（第 62-74 行）作为总依据；公式细节与突破石阶段修订（筑基只用丹药、突破石等 v1.2）必须严格按设计文档 §4.1 表格第 109 行 + §突破石阶段说明执行。

### 4.3 假设

* 孩子的设备浏览器支持 `localStorage`，存储空间 ≥ 256KB。

* 本地图片 `assets/img/building_yaotian.jpg / building_danfang.jpg / building_cangjing.jpg` 先**复用现有的 kuang/zhaomu 占位**（在 fallback defaults 里给个默认 img 路径）；家长后续自行用 AI 出图后替换即可。

* 顶栏资源位最多显示 3 种（灵石、灵药、丹药）——贡献 & 突破石阶段 2 不显示（`_unlockAtStage=2` 但资源多了会顶栏拥挤，**顶栏渲染用资源 order 里 unlockAtStage ≤ 当前阶段**，阶段 2 只显示 lingshi/lingyao/danyao 三个，contribution 放任务弹窗顶部小数字展示）。

### 4.4 开放问题（Ask User）

> 以下问题默认取「A 方案」实现，如果家长有其它偏好可以在实施前改：

* Q1：**筑基失败的惩罚力度**？默认方案 A（温柔）= 回退到 maxLevel-1（练气 9 级），方案 B（严格）= 保持练气 10 级但 exp 清零。→ **默认 A**。

* Q2：**藏经阁是否允许分配弟子？** 默认方案 A（纯加成建筑，不需要弟子），方案 B（需要弟子看经书，加成更高）。→ **默认 A**。

* Q3：**日常任务奖励丹药是否在突破时给的过多？** 默认任务池每天 3 条，给 2 颗丹药 + 基础炼丹产出，3 天能给第一个弟子突破，节奏 OK。→ **默认按任务池给**。

***

## 5. 验收标准（Acceptance Criteria）

> 每个 AC 必须是 `rule` 或 `rubric` 类型之一。独立 Review 时单独再验证一遍。

### 5.1 药田 + 灵药 (FR1)

| ID    | 类型   | 描述                                                                                                                               |
| ----- | ---- | -------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | rule | 新档开局（或老档迁移后）state.buildings.yaotian 存在（level:1，workerIds:[]），index.html 能读到 `H.slotCap("yaotian", 1)` ≥1。                        |
| AC-02 | rule | 点击场景中的「药田」建筑打开弹窗，能看到"空闲弟子 → 分配种药"按钮；分配后该弟子 status === "farming"、assignTo === "yaotian"。                                          |
| AC-03 | rule | 一个练气 Lv.1 弟子在药田，手动 `tick()` 一次后 `state.resources.lingyao` 严格 **>** 0（灵药净增长，且无负数）。                                                |
| AC-04 | rule | 老档（无 yaotian 字段）导入后，调用 `settleOffline()`（模拟 10 分钟离线）不会抛异常、state.resources.lingyao 非负、老弟子数组中的人数 & 名字不变。                           |
| AC-05 | rule | 升级药田：`upgradeBuilding("yaotian")` 返回 ok，升级后 `slotCap("yaotian", newLevel) === slotCap(oldLevel) + rule.perLevel`（1 级=1，2 级=2……）。 |

### 5.2 丹房 + 丹药 (FR2)

| ID    | 类型   | 描述                                                                                                                       |
| ----- | ---- | ------------------------------------------------------------------------------------------------------------------------ |
| AC-06 | rule | state 中有 `state.buildings.danfang.level === 1`、`workerIds === []`。顶栏渲染显示「丹药」数字（大殿 ≥ Lv2 解锁）。                             |
| AC-07 | rule | 给丹房分配 1 名弟子 + 手动往 `state.resources.lingyao` 塞 6 → tick() → `lingyao` 应减 **3**，`danyao` 应加 **1**（每 tick 每弟子吃 3 灵药产 1 丹药）。 |
| AC-08 | rule | `state.resources.lingyao = 0` 且有炼丹弟子时，tick() 不抛错、lingyao 不变成负数、danyao 不增加（消耗不足跳过逻辑正确）。                                   |
| AC-09 | rule | 炼丹消耗 3、产出 1 的配置在 `values.json.alchemy.recipeLingyaoCostPerBatch=3 / recipePillPerBatch=1` 里可调；改为 2/1 刷新后 tick 消耗对得上。     |
| AC-10 | rule | 离线结算灵药/丹药：弟子在丹房在岗 60 秒（6 tick）、lingyao 初始 18 → 结算后丹药 +6、灵药 -18 =0，零剩余批次。                                                 |

### 5.3 筑基突破 (FR3)

| ID    | 类型   | 描述                                                                                                                          |
| ----- | ---- | --------------------------------------------------------------------------------------------------------------------------- |
| AC-11 | rule | 掌门/弟子达到练气 Lv.10 后，打开其详情弹窗，存在「突破筑基」按钮，点击前提示「需要 1 颗丹药」。                                                                       |
| AC-12 | rule | 丹药 1 颗时，`H.breakthroughSuccessRate("lianqi", 0) === 0.8`；多吃 2 颗时 `H.breakthroughSuccessRate("lianqi", 2) === 1.0`。          |
| AC-13 | rule | 选多吃 2 颗吃满 100% 成功：点击突破 → 人物 realm 变为「筑基」、level 回到 1、exp=0、state.resources.danyao 减少 (1+2)=3 颗。                              |
| AC-14 | rule | 失败场景（0.8 概率的 80%，用 mock seed 或者把 baseSuccessRate 临时设为 0 验证）：点击突破 → 人物 realm 仍为练气、level 回到 9、exp=0、danyao 扣但不退还、toast 有失败提示。 |
| AC-15 | rule | 筑基 Lv.1 弟子在灵矿场，tick 1 次产出的灵石 === 练气 Lv.1 同根骨弟子 × `realms.zhuji.baseProduceMul=2.0`（helpers.producePer10s 正确翻倍）。             |

### 5.4 藏经阁 (FR4)

| ID    | 类型   | 描述                                                                                                           |
| ----- | ---- | ------------------------------------------------------------------------------------------------------------ |
| AC-16 | rule | 打开藏经阁弹窗，显示「当前加成：+0% 全员修炼速度（藏经阁 Lv.1）」（默认 1 级不加成，每级 +5% 起步，第 2 级升到 +5%）。                                      |
| AC-17 | rule | 升级藏经阁到 2 级：tick() 时掌门 exp 增量 === `idleExpPerTick × (1 + (2-1) × 0.05)`（对比藏经阁 1 级 baseline 的 exp 增量可证明多了 5%）。 |
| AC-18 | rule | 藏经阁不占用工位（升级大殿无 cap 限制，除通用的「非核心建筑等级 ≤ 大殿等级」外）。                                                                |

### 5.5 日常任务 (FR5)

| ID    | 类型   | 描述                                                                                                                                          |
| ----- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-19 | rule | 底部导航第 4 个按钮（「任务」）点击后**不弹出 toast 占位**，而是打开日常任务弹窗（openQuests），显示 3 条今日任务 + 今日日期。                                                              |
| AC-20 | rule | 任务 `need=300 灵石`：往 state.resources.lingshi 加到 300+，触发 `incQuestProgress("collect_resource","lingshi", 300)` → 该任务 progress == need，按钮变「领取」。 |
| AC-21 | rule | 点击「领取」：state.resources（lingshi/lingyao/danyao/contribution 中的奖励字段）根据任务 reward 严格增加，且 `claimed=true` 后按钮不能再点。                                |
| AC-22 | rule | 改 `state.quests.date = "1999-01-01"` → 刷新后 `ensureDailyQuests()` 触发，今日任务列表被重新生成 3 条。                                                        |
| AC-23 | rule | 升一次建筑触发 `incQuestProgress("upgrade_building")`，对应任务 progress +1；两次后可领奖。                                                                     |

### 5.6 配置外置化 & 文档 (FR6 + NFR3)

| ID    | 类型   | 描述                                                                                                                                                                    |
| ----- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-24 | rule | 删 `assets/config/values.json` + `buildings.json`（模拟损坏），file:// 模式打开游戏 → **不报控制台错误**，界面正常显示建筑、资源、tick 正常产出（fallback 生效）。                                               |
| AC-25 | rule | grep `index.html` 中出现字面量：`lingyaoPerMul` / `recipeLingyaoCostPerBatch` / `expBoostPerLevel` / `pillBoostPerAdd` / `dailyPool` 全部走 `GameConfig.values.xxx`，**无裸字面数字**。 |
| AC-26 | rule | 《配置文件总览.md》新增 5 节条目：values.produce/values.alchemy/values.breakthrough/values.quests/values.cangjing/buildings yaotian/danfang/cangjing。                               |

### 5.7 兼容 & 存档 (FR7 + NFR4)

| ID    | 类型   | 描述                                                                                                                                    |
| ----- | ---- | ------------------------------------------------------------------------------------------------------------------------------------- |
| AC-27 | rule | 存档导入：把 v1.2 旧 save（只含 lingshi、3 栋建筑、3 个弟子）导入 → 弟子数组长度、每个弟子的 name/level/realm、灵石数**一模一样**，多出来的 yaotian/danfang/cangjing/quests 字段为默认值。 |
| AC-28 | rule | 导出 v1.3 新档 → localStorage `removeItem` 重置 → 导入刚才的新档 → `state.quests` 的日期 & list **原样回来**（导入导出无数据丢失）。                                  |

### 5.8 体验类（rubric）

| ID    | 类型     | 描述                                                                                                        | 及格阈值 |
| ----- | ------ | --------------------------------------------------------------------------------------------------------- | ---- |
| AC-29 | rubric | 药田/丹房/藏经阁三座新建筑在 `building.position` 坐标下和大殿/矿场/招募堂**视觉上不重叠，能一眼区分**（0=重叠压字，1=轻微重叠有遮挡，2=所有建筑完整可见不重叠）。        | ≥1   |
| AC-30 | rubric | 5 岁孩子能独立完成：「点开药田 → 给一个弟子分配种药 → 等一个 tick → 看到灵药变多」这条闭环，文字提示够短，按钮够大。（0=找不到分配按钮/文案过长，1=需家长提醒 1-2 处，2=完全独立完成） | ≥1   |
| AC-31 | rubric | 藏经阁、任务弹窗、突破弹窗这三个新弹窗的字号/圆角/配色和 v1.4 既有 UI 保持一致（0=风格明显割裂，1=一致但有小处不同，2=完全统一）                                 | ≥1   |

