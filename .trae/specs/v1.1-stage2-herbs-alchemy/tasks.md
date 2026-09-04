# 宗门 v1.1 · 实施任务清单

> 生成来源：spec.md 的 FR1~FR7 + AC-01~AC-31。每个任务的 Test Requirements(TR) 明确对应到一个或多个 AC。任务按依赖排序，优先实施 Task 1 配置层 → Task 2 数据层 → Task 3-6 功能闭环 → Task 7 UI → Task 8 兼容 & 文档。

---

## Task 1: 扩展配置文件 + ConfigLoader DEFAULTS/validate/helpers

**目标**：给所有新系统（药/丹/突破/藏/任务）的 JSON 和 config.js 加字段，完成后 `GameConfigLoader.loadAll()` 的返回值里能取到所有新常量，file:// 模式 fallback 能正常玩。

**优先级**：high（所有后续任务的前置）

**修改文件**：
- `assets/config/values.json`
- `assets/config/buildings.json`
- `assets/config.js`（DEFAULTS / validate / helpers）
- （resources.json / realms.json 目前已含 lingyao/danyao/contribution/zhuji 定义，仅需 validate 里补字段校验）

**具体改动**：
1. values.json 新增块：
   ```json
   "produce": { "lingyaoPerMul": 1.0, "_comment_zhuji_breakthrough_not_here": "" },
   "alchemy": { "recipePillPerBatch": 1, "recipeLingyaoCostPerBatch": 3 },
   "breakthrough": { "pillBoostPerAdd": 0.1, "pillBoostAddMax": 2, "failBackLevelOffset": 1 },
   "cangjing":  { "expBoostPerLevel": 0.05 },
   "quests": {
     "dailyPool": [
       { "id":"q_collect_ls",     "type":"collect_resource", "resource":"lingshi", "need":300, "reward":{"danyao":1,"contribution":10} },
       { "id":"q_collect_ly",     "type":"collect_resource", "resource":"lingyao","need":60,  "reward":{"danyao":1,"contribution":10} },
       { "id":"q_upgrade_bld",    "type":"upgrade_building", "anyLevelUpCount":2,  "need":2,   "reward":{"lingyao":20,"contribution":15} },
       { "id":"q_train_exp",      "type":"exp_sum",          "expGain":500,         "need":500, "reward":{"lingshi":100,"contribution":10} },
       { "id":"q_recruit_once",   "type":"recruit_count",    "need":1,              "reward":{"lingyao":15} }
     ],
     "dailyCount": 3
   }
   ```
   （已有 produce/exp/upgrade 块保留，不覆盖）
2. buildings.json 在 order 追加 "yaotian", "danfang", "cangjing"（保持顺序：大殿/矿场/招募堂/药田/丹房/藏经阁，6 栋布局：大殿山上、矿场左下、招募堂右下、药田左中、丹房右中、藏经阁山中偏后）。
   每个元数据按设计文档 §阶段 2 填 slotCap（linear 公式）/ workerType / produces / consumes / position / zIndex。
3. config.js：
   - DEFAULTS.values 与 JSON 对应字段一致。
   - DEFAULTS.buildings 加 3 栋建筑。
   - validate()：对 produce.lingyaoPerMul、alchemy.*、breakthrough.*、cangjing.*、quests.dailyPool[*] 做类型/范围校验，缺字段就回退 DEFAULTS。对 buildings 新 3 栋做 position/slotCap/workerType/produces 校验。
   - helpers() 新增 `lingyaoPer10s(d)`、`alchemyRecipe()`（返回 `{pillPerBatch, lingyaoCostPerBatch}`）、`breakthroughSuccessRate(realmId, extraPillAdd)`、`cangjingExpMul()`（基于 state 需要在业务层传 bld level，这里写 `(level) => 1 + (level-1) * values.cangjing.expBoostPerLevel`）。

**TR（Task-local Test Requirements）**：
- TR-1.1 (rule AC-24)：删 `assets/config/values.json`、`buildings.json` → 启动 `python -m http.server` → 控制台无红报错 → F12 `GameConfig.values.alchemy.recipePillPerBatch` === DEFAULTS 中值（1）。
- TR-1.2 (rule AC-01/AC-06)：`GameConfig.buildings.order` 包含 "yaotian", "danfang", "cangjing"；每栋的 `slotCap`/`position`/`workerType` 非空。
- TR-1.3 (rule FR6.3/AC-12)：`H.breakthroughSuccessRate("lianqi", 2)` 返回精确 `1.0`；`H.cangjingExpMul(3)` 严格等于 `1 + 2*0.05 = 1.10`。

**Status**: pending

---

## Task 2: state 层扩展 + 老存档迁移（newGame / loadGame / saveGame）

**目标**：在 index.html state 初始化和加载阶段，自动为所有 v1.2 老档补 yaotian/danfang/cangjing 建筑 state、quests state；资源 lingyao/danyao/contribution 初始值；saveGame 序列化时把新字段写进去。

**优先级**：high

**修改文件**：`index.html`（newGame 函数 / loadGame 迁移块 / state.version）

**具体改动**：
1. newGame()：
   - 新增建筑 state 分支：yaotian → {level:1, workerIds:[]}，danfang → {level:1, workerIds:[]}，cangjing → {level:1}
   - version 由 "1.2" → "1.3"
   - 资源初始化不动（tmpl.resources 按 resources order 走，已含 lingyao/danyao/贡献的初始 0）
   - 新增 quests 默认值模板：`{ date:"", list:[] }`
2. loadGame()：
   - 迁移块末尾追加：
     ```
     if(!s.buildings.yaotian) s.buildings.yaotian = tmpl.buildings.yaotian;
     if(!s.buildings.danfang) s.buildings.danfang = tmpl.buildings.danfang;
     if(!s.buildings.cangjing) s.buildings.cangjing = tmpl.buildings.cangjing;
     if(!Array.isArray(s.buildings.yaotian.workerIds)) s.buildings.yaotian.workerIds = [];
     if(!Array.isArray(s.buildings.danfang.workerIds)) s.buildings.danfang.workerIds = [];
     if(!s.quests) s.quests = { date:"", list:[] };
     // 境界兜底，realm 超出 order 就回退到第一个
     s.disciples.forEach(d => { if(!d.realm) d.realm = GameConfig.realms.order[0]; });
     if(s.leader && !s.leader.realm) s.leader.realm = GameConfig.realms.order[0];
     ```
   - tmpl.resources 用 Object.assign(tmpl.resources, s.resources)，保证新字段（贡献等）总有。
3. saveGame() 不改（直接 JSON.stringify(state)），但存前确保 quests 不为 undefined 就行。

**TR**：
- TR-2.1 (rule AC-27)：构造一个 v1.2 旧档对象（只有 buildings.dian/kuang/zhaomu，3 个弟子、灵石=250，无 quests/yaotian/danfang/cangjing）→ localStorage.setItem 后 loadGame() → 返回的 s.disciples.length === 3、资源 lingshi === 250、s.buildings.yaotian.level === 1、s.quests.list === []。
- TR-2.2 (rule FR7.3)：迁移后 s.leader.name/level/realm 三项完全等于旧档。
- TR-2.3 (rule AC-01)：新 newGame() → state.buildings.yaotian / danfang / cangjing 都存在且符合 level:1/workerIds:[]。

**Status**: pending

---

## Task 3: 药田闭环（分配→tick产灵药→离线结算→召回→升级）

**目标**：把弟子/掌门的状态机加 farming；tick() 中产出灵药；离线结算包含灵药；药田详情弹窗完整；升级增加工位。

**优先级**：high

**修改文件**：`index.html`（assignEntity / recallEntity / tick / settleOffline / renderTopbarAndResources / openBuilding("yaotian") 分支）

**具体改动**：
1. 新增 `assignToBuilding(id, buildingKey, workerStatus)` 通用函数，替换之前写死的 `assignToKuang`（把矿场/药田/丹房三种岗位用同一个函数，避免复制代码）。保留 `assignToKuang` 作为兼容别名（避免旧代码调用挂）。
2. recallEntity 泛化为 `recallEntity(id)`：根据 `d.assignTo` 去对应的 workerIds 数组删除，不再只硬编码矿场。
3. tick() 分支：新增 yaotian 工位循环 → 灵药 += `H.lingyaoPer10s(d)`。
4. settleOffline() 为灵药加同样的累计。
5. 顶栏资源渲染：按 GameConfig.resources.order + 当前大殿等级决定阶段（阶段=大殿Lv<2=1，>=2=2，>=4=3）→ `_unlockAtStage<=currentStage` 就显示；顶栏最多显示 3 种（阶段 2 只显示 lingshi / lingyao / danyao），contribution 在任务弹窗顶部显示。
6. openBuilding("yaotian") 详情页 UI：
   - 标题+图片+等级+描述+升级按钮（复用现有 b-card 样式）
   - 工位栏："X/Y 人在岗，灵药 Z/10秒"
   - 空闲弟子列表（每行人像+name+状态+"▶ 分配种药"按钮 → onClick 调用 assignToBuilding）
   - 在岗弟子列表（每行 + "◀ 召回"按钮 → recallEntity）
   - 矿场的分配/召回同样调用通用函数替换掉旧代码逻辑。

**TR**：
- TR-3.1 (rule AC-02)：游戏运行 → 有弟子 idle → openBuilding("yaotian") → 点「分配」→ d.status=="farming"、d.assignTo=="yaotian"；state.buildings.yaotian.workerIds.includes(d.id)。
- TR-3.2 (rule AC-03)：1 个练气 Lv.1 弟子在岗 → tick() 1 次 → state.resources.lingyao === +(H.lingyaoPer10s)*1。
- TR-3.3 (rule NFR1.1)：灵药 tick 后无负数（Math.floor 或 +负数都检查）。
- TR-3.4 (rule AC-05)：upgradeBuilding("yaotian") 返回 ok 后，H.slotCap("yaotian", newLv) 比 oldLv 多 1 slot。
- TR-3.5 (rule AC-04)：老档离线结算 10 分钟不抛错，lingyao 非负。
- TR-3.6 (rule FR4.4 顶栏)：大殿 Lv.1（阶段 1）顶栏只显示灵石；大殿升到 Lv.2（阶段 2）顶栏显示灵石/灵药/丹药 3 种。

**Status**: pending

---

## Task 4: 丹房闭环（分配→tick 消耗灵药产丹药→离线结算→召回→升级）

**目标**：炼丹同药田结构，但要多一步"灵药够不够就跳过"的负数保护；离线结算批次化；详情页提示消耗。

**优先级**：high

**修改文件**：`index.html`（tick 丹房分支 / settleOffline 丹房块 / openBuilding("danfang") 详情 / H.alchemyRecipe 调用）

**具体改动**：
1. tick()：
   ```
   const r = H.alchemyRecipe();
   for(const id of state.buildings.danfang.workerIds){
     if(state.resources.lingyao >= r.lingyaoCostPerBatch){
       state.resources.lingyao -= r.lingyaoCostPerBatch;
       state.resources.danyao  += r.pillPerBatch;
     }
   }
   ```
   每炼丹弟子独立判定，不统一批（方便未来丹速系数）。
2. settleOffline 丹药：
   ```
   const totalSlotsWorker = state.buildings.danfang.workerIds.length;
   const maxBatches = totalSlotsWorker * ticksOffline;
   const actualBatches = Math.min(maxBatches, Math.floor(state.resources.lingyao / r.lingyaoCostPerBatch));
   state.resources.lingyao -= actualBatches * r.lingyaoCostPerBatch;
   state.resources.danyao  += actualBatches * r.pillPerBatch;
   ```
   避免灵药变负（先算总共能做几批，再一次性扣）。
3. openBuilding("danfang") 详情：
   - "X/Y 人在岗"、"产量：丹药 A/10秒（消耗灵药 B/10秒）"
   - 「灵药库存：N / 丹药库存：M」
   - 空闲弟子「分配炼丹」/ 在岗弟子「召回」。
4. workerType = "alchemy" 加入 assignToBuilding 合法列表（mining/farming/alchemy 三态）。

**TR**：
- TR-4.1 (rule AC-07)：1 弟子炼丹、灵药=6 → tick×2 → 丹药+2、灵药 0。
- TR-4.2 (rule AC-08)：灵药 0 有炼丹弟子 tick ×5 → lingyao 始终 0，无负数。
- TR-4.3 (rule AC-10)：60 秒离线（6 tick），1 弟子炼丹，灵药 18 → 离线结算后丹药 +6、灵药 0。
- TR-4.4 (rule AC-09)：改 values.json `recipeLingyaoCostPerBatch=2, recipePillPerBatch=1` → 刷新后 tick 每弟子消耗 2。

**Status**: pending

---

## Task 5: 筑基突破（练气满级→突破按钮→成功率加成→成功/失败处理→掌门同样可突破）

**目标**：打开弟子/掌门详情 → 满级显示突破按钮 → 选额外吃几颗丹药 → 按概率处理结果。

**优先级**：high

**修改文件**：`index.html`（openLeaderDetail / openDisciples 内的弟子详情子弹窗 / 新增 openBreakthrough 函数 / UI 弹窗）

**具体改动**：
1. 新增 function `canBreakthrough(entity)` → 返回 { ok:boolean, reason:string }：
   - 当前 realm 的 maxLevel 到了没；
   - breakthrough.nextRealm 存在没；
   - 现有丹药够不够 base needPill（`needPill=1`）。
2. 详情弹窗底部：
   - 普通未满级：「修炼：Lv.X/Y exp: Z/NXX」
   - 满级 + canBreakthrough.ok：「🚀 突破到「筑基」境」按钮
   - 满级 + !canBreakthrough.ok：灰掉 + 提示原因（丹药不足）
3. 突破弹窗 openBreakthrough(entityId)：
   - 图片 + 弟子名 + 练气 Lv.10
   - 当前丹药库存：N
   - 基础需要：1 颗（+0 加成，成功率 80%）
   - 选择「额外吃 0/1/2 颗丹药」的下拉或三个按钮（上限由 breakthrough.pillBoostAddMax 控制）
   - 实时显示「突破成功率：XX%（基础 80% + YY%）/ 总共消耗 Z 颗」
   - 「确认突破」按钮 → 扣药 → Math.random() 判断成功失败 → 改 realm/level → toast → 关闭弹窗 → 重新渲染列表
4. 失败回退：level = max-1（练气 9），exp=0；消耗仍扣（温柔惩罚 AC-14）。
5. 掌门同样走突破逻辑。
6. `H.breakthroughSuccessRate()` 调用。

**TR**：
- TR-5.1 (rule AC-11)：弟子练气 Lv.10 → 弹窗里有「突破筑基」按钮；丹药 =0 → 按钮 disabled，hover 提示「需要 1 颗丹药才能突破」。
- TR-5.2 (rule AC-13)：丹药 3、选额外 2 → 100% 成功 → realm=zhuji、level=1、exp=0、丹药剩 0。
- TR-5.3 (rule AC-14)：临时把 baseSuccessRate 改 0 → 点突破 → level=9、exp=0、realm=练气、toast 有失败文案。
- TR-5.4 (rule AC-15)：筑基 Lv.1 弟子 vs 练气 Lv.1 弟子同根骨同岗 → 前者 producePer10s 是后者 2 倍。
- TR-5.5 (rule AC-31)：突破弹窗字号 / 圆角 / 配色和其它弹窗无显著割裂（即和弟子详情/设置/升级弹窗的模态框类名一致，使用统一的 `.modal / .btn / .info-row`）。

**Status**: pending

---

## Task 6: 藏经阁加成 & 日常任务系统

**目标**：两个系统合为一题因为彼此独立且"轻"。藏经阁给 exp 加成（tick 经验部分改一行）；任务需要底部导航的动作换掉 toast 占位 + 新增 state + 3 个 UI 弹窗。

**优先级**：medium

**修改文件**：`index.html`（renderBottomNav 动作[3] / tick 经验部分 / upgradeBuilding succeed 钩子 / recruit 成功钩子 / ensureDailyQuests / incQuestProgress / openQuests）

**具体改动**：
1. **藏经阁**：
   - tick 经验循环内：
     ```js
     const expMul = H.cangjingExpMul(state.buildings.cangjing.level);
     d.exp += GameConfig.values.idleExpPerTick * expMul;
     ```
   - openBuilding("cangjing") 详情 UI 显示加成说明 + 升级按钮；没有分配/召回（非生产）。
2. **任务**：
   - 替换 bottomNav[3]（任务）动作为 `()=>openQuests()`。
   - 定义 `ensureDailyQuests()`：
     ```
     const today = YYYY-MM-DD(new Date);
     if(!state.quests || state.quests.date !== today){
       state.quests = { date: today, list: shuffle(questPool).slice(0, dailyCount).map(q=>cloneQuest(q, {progress:0,claimed:false})) };
       saveGame();
     }
     ```
     在 render()、openQuests()、tick() 末尾都调用保证今天任务可用。
   - `incQuestProgress(type, deltaOrOpts)`：遍历 state.quests.list，如果 type === quest.type 且 !claimed → 对 progress 加 delta；progress = min(need, progress) → saveGame。
     - collect_resource 触发：资源 tick 增量完了累计。
     - upgrade_building 触发：upgradeBuilding() return ok 后加 1。
     - exp_sum 触发：tick 经验累加处累计 exp 增量。
     - recruit_count 触发：recruit() return ok 后加 1。
   - `openQuests()` UI：
     - 顶：今日日期 + 宗门贡献小徽章（`贡献：XXX`）
     - 每条任务卡片：标题 / 进度条 / 进度文字 / 奖励小图标预览 / 状态三态按钮（未完成=灰色"进行中" / 可领=彩色"🎁 领取" / 已领=✅"已领"灰按钮）
     - 「领取」按钮：把 quest.reward 中每一项加到 state.resources → `claimed=true` → toast 飘奖励内容 → 重绘任务弹窗。
3. renderBottomNav[3] 对应动作从 toast 改为 openQuests。

**TR**：
- TR-6.1 (rule AC-16/AC-18)：藏经阁弹窗不含"分配/召回"控件，升级前加成 +0%，升级后（Lv2）+5%。
- TR-6.2 (rule AC-17)：藏经阁升到 2 级、掌门 idle → tick 1 次 → 掌门 exp 增量 = `idleExpPerTick × 1.05`（对比 1 级 baseline 的 exp 增量多 5%）。
- TR-6.3 (rule AC-19)：底部「任务」打开后不 toast，弹出任务弹窗含 3 条任务。
- TR-6.4 (rule AC-20/AC-21)：手动给一 collect_resource 任务塞 progress=need → 出现领取按钮 → 点击 → state.resources.danyao/contribution + 奖励值，claimed=true。
- TR-6.5 (rule AC-22)：手工改 `state.quests.date = "2020-01-01"` → `ensureDailyQuests()` → list 数量变 3 且日期刷新。
- TR-6.6 (rule AC-23)：upgradeBuilding 两次，对应任务 progress=2 → 可领取。

**Status**: pending

---

## Task 7: UI 渲染 & 文案外置 & 视觉统一

**目标**：把所有新增 UI 里的中文文案挪到 ui.uiText；新建筑 position 不重叠（rubric AC-29）。

**优先级**：medium

**修改文件**：
- `assets/config/ui.json`（uiText 加 key）
- `assets/config.js DEFAULTS.ui.uiText`（同步 key）
- `index.html`（把新弹窗前缀字面字符串改成读 uiText）

**具体改动**：
1. uiText 新增：
   ```
   "yaotianName":"药田","yaotianDesc":"种植灵药，弟子分配合产出"
   ,"danfangName":"丹房","danfangDesc":"消耗灵药炼制丹药"
   ,"cangjingName":"藏经阁","cangjingDesc":"阅读典籍提升修炼速度"
   ,"assignFarmingBtn":"▶ 分配种药","assignAlchemyBtn":"▶ 分配炼丹","recallBtn":"◀ 召回"
   ,"farmingStatus":"种药中","alchemyStatus":"炼丹中","miningStatus":"采集中","idleStatus":"空闲"
   ,"lingyaoStock":"灵药库存：","danyaoStock":"丹药库存："
   ,"produceFarming":"灵药产量：","produceAlchemy":"丹药产量：（消耗灵药 X/10秒）"
   ,"expBoostHint":"当前加成：+X% 全员修炼速度（藏经阁 Lv.N）"
   ,"breakthroughTitle":"突破筑基","breakthroughNeed":"消耗 1 颗丹药（基础成功率 80%）"
   ,"breakthroughExtraLabel":"额外吃丹药加成","breakthroughRate":"突破成功率","breakthroughConfirm":"确认突破"
   ,"breakthroughSuccess":"🎉 突破成功，进入筑基境！","breakthroughFail":"💧 突破失败，境界小退一步，再努力修炼吧！"
   ,"breakthroughNotReady":"需要 X 颗丹药才能突破"
   ,"questsTitle":"今日任务","questsEmptyHint":"今日任务还未生成，请刷新重试"
   ,"questsRewardBtn":"🎁 领取","questsProgressLabel":"进度：{P}/{N}","questsClaimed":"✅ 已领","questsDoing":"⏳ 进行中","questsContributionBadge":"宗门贡献："
   ,"newStageUnlockedNotice":"大殿升级到 Lv.2，解锁【药田/丹房/藏经阁】和【灵药/丹药】新资源！"
   ```
2. 所有 Task 3/4/5/6 中新写的字符串字面量全部改成 `GameConfig.ui.uiText.xxx || "默认文案"` 读取。
3. renderBuildings 在 yaotian/danfang/cangjing 上调用的 openBuilding 里标题用 meta.name（从 buildings.json 取）——这个已经是配置化了；但内部按钮的文字（分配/召回等）用上面 uiText 新 key。
4. 新建筑 position 合理性：
   - 大殿 (50,28)、矿场(22,60)、招募堂(78,64) 不变。
   - 药田 (38,68)：矿场右侧/山脚中间（左侧弟子种药画面合理）。
   - 丹房 (62,68)：对称布局（丹炉放右侧）。
   - 藏经阁 (50,58)：大殿正下方山腰中（"藏经在大殿后下方"的古风布局）。
   - 确认这 6 个矩形（x±w/2, y±h/2, w, h）不互包含、不重叠 >20%（用数学算，AC-29 rubric 依据）。

**TR**：
- TR-7.1 (rule AC-29 数学)：6 座建筑 bounding box 两两 Jaccard 重叠度 ≤ 0.2（任一两对的交集面积 / 并集面积 ≤ 20%）。
- TR-7.2 (rule FR6.3/AC-25)：在 index.html 用 grep `\"种药\"|\"炼丹\"|\"突破\"`，结果只能在 ui.uiText.key 读取的 **fallback 默认字面量**出现（即作为 `|| "默认"` 尾部），不允许直接写成 `innerHTML = "分配种药"`。
- TR-7.3 (rule FR5.6 UI 视觉一致)：所有新弹窗的 class 都用 `.modal / .info-row / .btn`，和设置/弟子/升级弹窗同结构；不引入任何新的全局 CSS class 用于弹窗（除了任务进度条，允许加 1 个 `.quest-bar` class 给 flex 宽度）。
- TR-7.4 (rule AC-30)：药田弹窗 → 给 idle 弟子分配 → `弟子 status==="farming"`，2 步内完成，分配按钮位置显眼（在同行右侧，非折叠）。

**Status**: pending

---

## Task 8: 兼容 & 文档同步

**目标**：验证老档迁移全链路；更新 README、设计文档、配置文件总览、开发文档四处文档（和 v1.3→v1.4 的做法保持一致的章节风格）。

**优先级**：medium

**修改文件**：
- `README.md`（调参表 + 版本路线图 + 功能描述）
- `docs/设计文档.md`（版本号 v1.4 → v1.5 或直接在 v1.1 章节补实现细节。建议改版本号为 v1.5 加一条修订记录说明 v1.1 已实装，并在阶段 2 和配置表标注）
- `docs/配置文件总览.md`（在 §一 values.json / §二 buildings.json / §五 ui.json / §六 resources.json / §七 realms.json 每个对应章节补 v1.1 新增字段的字典）
- `docs/开发文档.md`（把 §一 v1.1 从「待开发」标记为「✅ 已完成」并在「计划功能」处写本次实现的 5 条功能+细节）

**具体改动要点（文档）**：
1. README.md：
   - 特性区新增「v1.1 阶段2：灵药/丹药/筑基/藏经阁/日常任务 5 条闭环」描述。
   - 调参表至少 3 条新条目：调灵药产量、调炼丹消耗、调藏经阁加成、调突破概率、调任务池。
   - 路线图 v1.1 标为 ✅ 完成。
2. 配置文件总览.md：
   - values.json 新增 §1.7 `produce` 补充 lingyaoPerMul；§1.8 `alchemy`；§1.9 `breakthrough`；§1.10 `cangjing`；§1.11 `quests.dailyPool` 完整 JSON 样例 + 改法。
   - buildings.json §二末尾补 "yaotian/danfang/cangjing" 三个元数据样例 + slotCap/workerType/produces/consumes 字段说明。
   - ui.json §五 uiText 末尾追加 24 条新文案 key 的对照表。
   - FAQ 追加 3 条 Q："怎么让药田产药更快？""突破 100% 成功要吃几颗丹药？""今天的任务我已经做完了，想重做怎么办？"（后者答：删除 localStorage.quests.date 置空或改系统日期到明天触发刷新）。
3. 设计文档.md：
   - 顶栏版本号升至 v1.5（说明：v1.4 已被 UI 精修占用，v1.1 玩法实装统一编号为 v1.5）。
   - 在阶段 2（原 § 62-74 行）段落末尾补"**已在 v1.5 实装，实现细节见开发文档 v1.1 章节**"一句，并补 5 个流程要点（分配→产药→炼丹→突破→任务领奖）。
4. 开发文档.md：
   - 把「§一 v1.1」从"待开发"改为"✅ 已完成（5 条功能）"，内容改成和 Spec §FR1-FR5 对齐的实现要点。

**TR**：
- TR-8.1 (rule AC-26)：配置文件总览.md 中出现至少以下 5 个段落标题（用 grep 验证含字符串）："alchemy"、"breakthrough"、"cangjing"、"quests.dailyPool"、"yaotian"。
- TR-8.2 (rule AC-28)：导出存档 → 重置 → 导入 → state.quests.date & state.quests.list 完全相同；state.buildings.yaotian.level 完全相同。
- TR-8.3 (rule NFR3.2)：README.md「亲子调参表」新增 3 行以上涉及 v1.1 系统的"想做什么→改哪份 JSON→改什么字段"。
- TR-8.4 (rule AC-31 补)：设计文档 §阶段 2 下增加"实现链路 5 条"段落。

**Status**: pending
