/* ============================================================
 * 宗门 · 配置加载器（ConfigLoader）
 * ------------------------------------------------------------
 * 设计目标：
 *   1) 所有可调参数外置：数值/建筑/境界/名字库/UI/资源 各一个 JSON，方便孩子/家长改
 *   2) 双击 file:// 也能玩：fetch 本地 JSON 会因 CORS 失败 -> 自动 fallback 到内嵌默认值
 *   3) 提供 validate()，字段错/缺就明确提示，不会 silent bug
 *   4) 单一入口 GameConfig 暴露：values / buildings / realms / nameLib / ui / resources
 *   5) 修改 JSON 刷新页面即生效；孩子不懂代码也能改数值试玩
 *
 * 使用方式：在 index.html head 内先 <script src="assets/config.js"></script>
 * 然后业务代码通过 window.GameConfig 读取配置
 * ============================================================ */
(function(global){
  "use strict";

  // === 内嵌默认值（Fallback，保证 file:/// 或 JSON 丢失时仍可玩） ===
  // 注意：这些默认值必须与 assets/config/*.json 完全对应。当 JSON 成功加载时会覆盖对应字段。
  const DEFAULTS = {
    values: {
      _version: "1.0",
      tickSeconds: 10,
      idleExpPerTick: 1,
      maxLevelPerRealm: 10,
      initLingshi: 80,
      offlineCapSeconds: 7200,
      storageKey: "zongmen_save_v1",
      saveFile: { exportNamePrefix: "宗门-存档", confirmResetWord: "重置" },
      produce: { basePer10s: 1.5, perLevelMul: 0.1, lingyaoPerMul: 1.0 },
      upgrade: { baseCost: 100, growthMul: 1.3 },
      exp: { baseNeed: 100, growthMul: 1.3 },
      alchemy: { recipePillPerBatch: 1, recipeLingyaoCostPerBatch: 3 },
      breakthrough: { pillBoostPerAdd: 0.1, pillBoostAddMax: 2, failBackLevelOffset: 1 },
      cangjing:  { expBoostPerLevel: 0.05 },
      quests: {
        dailyPool: [
          { id:"q_collect_ls",   type:"collect_resource", resource:"lingshi", need:300, reward:{danyao:1,contribution:10} },
          { id:"q_collect_ly",   type:"collect_resource", resource:"lingyao",need:60,  reward:{danyao:1,contribution:10} },
          { id:"q_upgrade_bld",  type:"upgrade_building", need:2, reward:{lingyao:20,contribution:15} },
          { id:"q_train_exp",    type:"exp_sum",          need:500, reward:{lingshi:100,contribution:10} },
          { id:"q_recruit_once", type:"recruit_count",    need:1, reward:{lingyao:15} }
        ],
        dailyCount: 3
      },
      discipleCapFormula: { type: "linear", base: 2, perDianLevel: 1 },
      avatar: { compress: {
        rawFileMaxKB: 8192, dataUrlMaxKB: 256, maxSide: 512, fallbackSide: 256,
        qualitySteps: [0.82, 0.6, 0.4, 0.25], fallbackQuality: 0.2
      }},
      leader: { root: 1.2, produceMul: 1.5, moraleMul: 1.1, defaultName: "小掌门", defaultAvatarImg: "assets/img/leader.jpg" },
      recruit: { cost: 50, cdBaseSeconds: 30, cdGrowthPerLevel: 0.9, cdMinSeconds: 5 }
    },
    buildings: {
      _version: "1.2",
      order: ["dian", "kuang", "zhaomu", "yaotian", "danfang", "cangjing"],
      buildingMeta: {
        dian:   { id:"dian", name:"宗门大殿", img:"assets/img/building_dian.jpg",   desc:"宗门核心，决定弟子上限与建筑等级上限", isCore:true, capRules:{discipleCap:{type:"linear",base:2,perLevel:1}},
                   position:{x:50,y:28,w:24,h:38}, labelPosition:"bottom", zIndex:50, cardStyle:{boxShadow:"0 10px 24px rgba(0,0,0,.18), 0 0 0 3px rgba(232,184,78,.35)"} },
        kuang:  { id:"kuang", name:"灵矿场",   img:"assets/img/building_kuang.jpg",  desc:"分配掌门与弟子采集灵石", workerType:"mining", slotCap:{type:"linear",base:1,perLevel:1}, produces:["lingshi"],
                   position:{x:22,y:60,w:18,h:30}, labelPosition:"right",  zIndex:40, cardStyle:{} },
        zhaomu: { id:"zhaomu", name:"招募堂",   img:"assets/img/building_zhaomu.jpg", desc:"消耗灵石招募新弟子", workerType:null,
                   position:{x:78,y:64,w:16,h:26}, labelPosition:"left",   zIndex:40, cardStyle:{} },
        yaotian:{ id:"yaotian",name:"药田",    img:"assets/img/building_yaotian.jpg",desc:"分配弟子种植灵药", workerType:"farming", slotCap:{type:"linear",base:1,perLevel:1}, produces:["lingyao"],
                   position:{x:38,y:68,w:16,h:26}, labelPosition:"bottom", zIndex:35, cardStyle:{} },
        danfang:{ id:"danfang",name:"丹房",    img:"assets/img/building_danfang.jpg",desc:"消耗灵药炼制丹药", workerType:"alchemy", slotCap:{type:"linear",base:1,perLevel:1}, produces:["danyao"], consumes:["lingyao"],
                   recipePillPerBatch:1, recipeLingyaoCostPerBatch:3,
                   position:{x:62,y:68,w:16,h:26}, labelPosition:"bottom", zIndex:35, cardStyle:{} },
        cangjing:{id:"cangjing",name:"藏经阁", img:"assets/img/building_cangjing.jpg",desc:"阅读典籍，提升全员修炼速度", workerType:null, expBoostPerLevel:0.05,
                   position:{x:50,y:58,w:14,h:22}, labelPosition:"bottom", zIndex:45, cardStyle:{} }
      }
    },
    realms: {
      _version: "1.0",
      order: ["lianqi","zhuji","jindan"],
      realms: {
        lianqi: { id:"lianqi", name:"练气", maxLevel:10, baseProduceMul:1.0, discipleAvatarImg:"assets/img/disciple_lianqi.jpg", tagColor:"gray",
                  breakthrough:{ nextRealm:"zhuji", needPill:1, needBreakthroughStone:0, baseSuccessRate:0.8 } },
        zhuji:  { id:"zhuji",  name:"筑基", maxLevel:10, baseProduceMul:2.0, discipleAvatarImg:"assets/img/disciple_zhuji.jpg",  tagColor:"cyan",
                  breakthrough:{ nextRealm:"jindan", needPill:3, needBreakthroughStone:0, baseSuccessRate:0.7 } },
        jindan: { id:"jindan", name:"金丹", maxLevel:10, baseProduceMul:4.0, discipleAvatarImg:"assets/img/disciple_jindan.jpg", tagColor:"gold",
                  breakthrough:{ nextRealm:null,    needPill:5, needBreakthroughStone:2, baseSuccessRate:0.6 } }
      }
    },
    nameLib: {
      _version: "1.0",
      surnames: ["张","王","李","赵","陈","林","周","沈","顾","苏","萧","楚","凌","叶","秦","墨","白","云","风","陆"],
      given:    ["道凡","清风","明月","云鹤","青衣","子期","长歌","无尘","若虚","观山","听雨","辞树","归尘","忘机","问渠","知秋","望舒","星河","怀瑾","漱石"]
    },
    ui: {
      _version: "1.1",
      sect: { defaultName: "无名宗门" },
      images: {
        sceneBg:      "assets/img/scene_bg.jpg",
        iconLingshi:  "assets/img/icon_lingshi.jpg",
        iconLingyao:  "assets/img/icon_lingyao.jpg",
        iconDanyao:   "assets/img/icon_danyao.jpg",
        leaderDefault:"assets/img/leader.jpg",
        discipleLianqi:"assets/img/disciple_lianqi.jpg"
      },
      themeColors: { qing:"#3FA89A", wood:"#B58A4E", gold:"#E8B84E", ink:"#3A4A5A", cloud:"#F4F7F4" },
      layoutTokens: {
        topbar_padding:"6px 10px", topbar_gap:"10px", topbar_border_width:"1.5px",
        leader_entry_scale:"1", leader_avatar_size:"32px", leader_name_size:"13px", leader_lv_size:"10px",
        sect_name_size:"15px", sect_badge_pad:"1px 6px", sect_badge_fs:"11px",
        res_pill_pad:"3px 8px", res_pill_fs:"13px", res_icon_size:"18px",
        bottombar_padding:"4px 6px", bottombar_border_w:"1.5px",
        bottombar_btn_pad:"7px 4px", bottombar_btn_fs:"12px", bottombar_btn_radius:"8px",
        bottombar_btn_margin:"0 3px", bottombar_gap:"2px",
        scene_padding:"12px 16px", scene_min_h:"0", scene_bg_fixed:true,
        building_card_pad:"6px", building_card_radius:"12px",
        building_card_border:"1.5px solid var(--line)", building_card_bg:"rgba(244,247,244,.90)",
        building_card_shadow:"0 4px 10px rgba(0,0,0,.10)",
        building_img_height:"58%", building_img_radius:"8px",
        building_name_fs:"13px", building_sub_fs:"11px", building_gap_px:"8",
        building_mode:"positional", building_default_w:"18%", building_default_h:"30%",
        modal_max_w:"440px", modal_padding:"14px 16px", modal_radius:"14px", modal_title_fs:"16px",
        btn_pad:"8px 14px", btn_radius:"8px", btn_fs:"13px",
        info_row_pad:"6px 0", info_row_fs:"13px",
        toast_bottom:"72px"
      },
      uiText: {
        bottomNav: ["弟子","建筑","背包","任务","设置"],
        buildingLockedHint: "需先升级宗门大殿",
        lingshiNotEnough:   "灵石不足",
        workerSlotsFull:    "矿场工位已满，请升级灵矿场",
        discipleCapFull:    "弟子上限已满，请先升级宗门大殿",
        recruitCooldown:    "招募冷却中，请稍候",
        renameRule:         "名字需1-6个字符",
        moraleOn:  "掌门在岗，全员 +10% ✅",
        moraleOff: "掌门未在岗",
        saveMgrTitle: "存档管理",
        saveMgrSub:   "把当前进度导出成文件分享，或从备份文件恢复，也可一键重开新档",
        exportSaveBtn: "📦 导出存档为 JSON 文件",
        exportSaveHint: "导出后会下载一个 .json 文件，可以备份到云盘或发给家长",
        importSaveBtn: "📥 从 JSON 文件导入存档",
        importSaveHint: "选择之前导出的 .json 存档，导入后会自动覆盖当前进度并刷新页面",
        importInvalid: "文件内容不是有效的宗门存档",
        importSuccess: "导入成功，正在载入进度…",
        resetSaveBtn: "🔄 重置当前存档（重开新档）",
        resetSaveHint: "会丢失现在所有进度：掌门/弟子/灵石/建筑等级全部归零（无法恢复）",
        resetConfirm: "真的要重置吗？输入【重置】二字后点确认，所有进度将无法恢复",
        resetPlaceholder: "请输入「重置」二字以确认",
        resetWrongText: "输入不符，已取消重置",
        resetDone: "宗门已重建，小掌门请继续加油 ✨",
        fileNameHint: "导出文件名（含掌门名、日期）",
        btnChooseFile: "选择存档文件…",
        settingsTitle: "宗门设置",
        yaotianName:"药田", yaotianDesc:"种植灵药，弟子分配后自动产出",
        danfangName:"丹房", danfangDesc:"消耗灵药炼制丹药",
        cangjingName:"藏经阁", cangjingDesc:"阅读典籍提升修炼速度",
        assignFarmingBtn:"▶ 分配种药", assignAlchemyBtn:"▶ 分配炼丹", assignMiningBtn:"▶ 分配采集", recallBtn:"◀ 召回",
        farmingStatus:"种药中", alchemyStatus:"炼丹中", miningStatus:"采集中", idleStatus:"空闲",
        lingyaoStock:"灵药库存：", danyaoStock:"丹药库存：",
        produceFarming:"灵药产量：", produceMining:"灵石产量：", produceAlchemy:"丹药产量：",
        workSlotLine:"工位：{X}/{Y} 人在岗",
        expBoostHint:"当前加成：+{PCT}% 全员修炼速度（藏经阁 Lv.{LV}）",
        breakthroughTitle:"突破筑基", breakthroughNeed:"消耗 1 颗丹药（基础成功率 80%）", breakthroughExtraLabel:"额外吃丹药加成",
        breakthroughRate:"突破成功率：{RATE}%（基础 80% + 加成 {EXTRA}%）",
        breakthroughConfirm:"确认突破", breakthroughDanyaoTotal:"总消耗丹药：{N} 颗",
        breakthroughSuccess:"🎉 突破成功，进入筑基境！",
        breakthroughFail:"💧 突破失败，境界小退一步，再努力修炼吧！",
        breakthroughNotReady:"需要 {N} 颗丹药才能突破",
        questsTitle:"今日任务", questsEmptyHint:"今日任务还未生成，请刷新重试",
        questsRewardBtn:"🎁 领取", questsProgressLabel:"进度：{P}/{N}",
        questsClaimed:"✅ 已领", questsDoing:"⏳ 进行中", questsContributionBadge:"宗门贡献：",
        newStageUnlockedNotice:"大殿升到 Lv.{LV}，解锁【药田/丹房/藏经阁】与【灵药/丹药】新资源！"
      }
    },
    resources: {
      _version: "1.0",
      order: ["lingshi","lingyao","danyao","tupoishi","contribution"],
      resources: {
        lingshi:      { id:"lingshi",      name:"灵石",     img:"assets/img/icon_lingshi.jpg",   initialValue:80, decimal:0, _unlockAtStage:1 },
        lingyao:      { id:"lingyao",      name:"灵药",     img:"assets/img/icon_lingyao.jpg",   initialValue:0,  decimal:0, _unlockAtStage:2 },
        danyao:       { id:"danyao",       name:"丹药",     img:"assets/img/icon_danyao.jpg",    initialValue:0,  decimal:0, _unlockAtStage:2 },
        tupoishi:     { id:"tupoishi",     name:"突破石",   img:"assets/img/icon_tupoishi.jpg",  initialValue:0,  decimal:0, _unlockAtStage:3 },
        contribution: { id:"contribution", name:"宗门贡献", img:"assets/img/icon_contribution.jpg", initialValue:0, decimal:0, _unlockAtStage:2 }
      }
    }
  };

  // === 工具：深合并（只深度合并对象/数组不拼，数组以 json 文件为准完全覆盖，避免老默认残留） ===
  function deepAssign(target, src){
    if(!src || typeof src!=="object") return target;
    if(Array.isArray(src)){
      // 数组：配置数组（建筑order、名字库、品质步长等）完全用新值覆盖
      return src;
    }
    for(const k of Object.keys(src)){
      const v = src[k];
      if(v && typeof v==="object" && !Array.isArray(v)){
        if(!target[k] || typeof target[k]!=="object") target[k] = {};
        target[k] = deepAssign(target[k], v);
      }else{
        target[k] = v;
      }
    }
    return target;
  }

  function fetchJSON(url){
    return new Promise(resolve=>{
      try{
        fetch(url, {cache:"no-store"}).then(r=>{
          if(!r.ok){ resolve({ok:false, err:"HTTP "+r.status}); return; }
          r.json().then(j=>resolve({ok:true, data:j})).catch(e=>resolve({ok:false, err:e.message||"JSON parse error"}));
        }).catch(e=>resolve({ok:false, err:e.message||"network"}));
      }catch(e){ resolve({ok:false, err:e.message||"fetch unavailable"}); }
    });
  }

  // === 校验：对加载后的配置做基础类型检查，出错则用默认值回填并收集 warning ===
  function validate(cfg){
    const warnings = [];
    const pushW = (key, expected, actual)=>warnings.push(`配置字段 ${key} 非 ${expected}（实际 ${typeof actual}），已回退默认值`);
    const num = (v, key, defVal)=>{ if(typeof v!=="number"||!isFinite(v)){ pushW(key,"number",v); return defVal; } return v; };
    const str = (v, key, defVal)=>{ if(typeof v!=="string"){ pushW(key,"string",v); return defVal; } return v; };
    const obj = (v, key)=>{ if(!v || typeof v!=="object"){ pushW(key,"object",v); return {}; } return v; };

    const V = cfg.values = obj(cfg.values, "values");
    V.tickSeconds        = num(V.tickSeconds,  "values.tickSeconds",         DEFAULTS.values.tickSeconds);
    V.idleExpPerTick     = num(V.idleExpPerTick, "values.idleExpPerTick",     DEFAULTS.values.idleExpPerTick);
    V.maxLevelPerRealm   = num(V.maxLevelPerRealm,"values.maxLevelPerRealm",  DEFAULTS.values.maxLevelPerRealm);
    V.initLingshi        = num(V.initLingshi,  "values.initLingshi",          DEFAULTS.values.initLingshi);
    V.offlineCapSeconds  = num(V.offlineCapSeconds, "values.offlineCapSeconds", DEFAULTS.values.offlineCapSeconds);
    V.storageKey         = str(V.storageKey,  "values.storageKey",           DEFAULTS.values.storageKey);
    V.produce = obj(V.produce, "values.produce");
    V.produce.basePer10s   = num(V.produce.basePer10s,   "values.produce.basePer10s",   DEFAULTS.values.produce.basePer10s);
    V.produce.perLevelMul = num(V.produce.perLevelMul,  "values.produce.perLevelMul",  DEFAULTS.values.produce.perLevelMul);
    V.produce.lingyaoPerMul = num(V.produce.lingyaoPerMul, "values.produce.lingyaoPerMul", DEFAULTS.values.produce.lingyaoPerMul);
    V.upgrade = obj(V.upgrade, "values.upgrade");
    V.upgrade.baseCost   = num(V.upgrade.baseCost,   "values.upgrade.baseCost",   DEFAULTS.values.upgrade.baseCost);
    V.upgrade.growthMul  = num(V.upgrade.growthMul,  "values.upgrade.growthMul",  DEFAULTS.values.upgrade.growthMul);
    V.exp = obj(V.exp, "values.exp");
    V.exp.baseNeed     = num(V.exp.baseNeed,     "values.exp.baseNeed",     DEFAULTS.values.exp.baseNeed);
    V.exp.growthMul    = num(V.exp.growthMul,    "values.exp.growthMul",    DEFAULTS.values.exp.growthMul);
    V.alchemy = obj(V.alchemy, "values.alchemy");
    V.alchemy.recipePillPerBatch       = num(V.alchemy.recipePillPerBatch,       "values.alchemy.recipePillPerBatch",       DEFAULTS.values.alchemy.recipePillPerBatch);
    V.alchemy.recipeLingyaoCostPerBatch= num(V.alchemy.recipeLingyaoCostPerBatch,"values.alchemy.recipeLingyaoCostPerBatch",DEFAULTS.values.alchemy.recipeLingyaoCostPerBatch);
    V.breakthrough = obj(V.breakthrough, "values.breakthrough");
    V.breakthrough.pillBoostPerAdd     = num(V.breakthrough.pillBoostPerAdd,     "values.breakthrough.pillBoostPerAdd",     DEFAULTS.values.breakthrough.pillBoostPerAdd);
    V.breakthrough.pillBoostAddMax     = num(V.breakthrough.pillBoostAddMax,     "values.breakthrough.pillBoostAddMax",     DEFAULTS.values.breakthrough.pillBoostAddMax);
    V.breakthrough.failBackLevelOffset = num(V.breakthrough.failBackLevelOffset, "values.breakthrough.failBackLevelOffset", DEFAULTS.values.breakthrough.failBackLevelOffset);
    V.cangjing = obj(V.cangjing, "values.cangjing");
    V.cangjing.expBoostPerLevel = num(V.cangjing.expBoostPerLevel, "values.cangjing.expBoostPerLevel", DEFAULTS.values.cangjing.expBoostPerLevel);
    V.quests = obj(V.quests, "values.quests");
    if(!V.quests.dailyPool || !Array.isArray(V.quests.dailyPool) || V.quests.dailyPool.length===0){
      warnings.push("values.quests.dailyPool 必须是非空数组，已回退默认值");
      V.quests.dailyPool = JSON.parse(JSON.stringify(DEFAULTS.values.quests.dailyPool));
    }
    V.quests.dailyPool.forEach((q, i)=>{
      if(!q || typeof q!=="object") return;
      q.need = num(q.need, "values.quests.dailyPool["+i+"].need", DEFAULTS.values.quests.dailyPool[i]?.need || 1);
      q.type = str(q.type, "values.quests.dailyPool["+i+"].type", "collect_resource");
      if(!q.reward || typeof q.reward!=="object") q.reward = {};
    });
    V.quests.dailyCount = num(V.quests.dailyCount, "values.quests.dailyCount", DEFAULTS.values.quests.dailyCount);
    V.avatar = obj(V.avatar, "values.avatar"); V.avatar.compress = obj(V.avatar&&V.avatar.compress, "values.avatar.compress");
    const ac = V.avatar.compress;
    ac.rawFileMaxKB   = num(ac.rawFileMaxKB,   "values.avatar.compress.rawFileMaxKB",   DEFAULTS.values.avatar.compress.rawFileMaxKB);
    ac.dataUrlMaxKB   = num(ac.dataUrlMaxKB,   "values.avatar.compress.dataUrlMaxKB",   DEFAULTS.values.avatar.compress.dataUrlMaxKB);
    ac.maxSide        = num(ac.maxSide,        "values.avatar.compress.maxSide",        DEFAULTS.values.avatar.compress.maxSide);
    ac.fallbackSide   = num(ac.fallbackSide,   "values.avatar.compress.fallbackSide",   DEFAULTS.values.avatar.compress.fallbackSide);
    ac.fallbackQuality= num(ac.fallbackQuality,"values.avatar.compress.fallbackQuality",DEFAULTS.values.avatar.compress.fallbackQuality);
    if(!Array.isArray(ac.qualitySteps)||ac.qualitySteps.length===0){
      warnings.push("values.avatar.compress.qualitySteps 必须是非空数组，已回退默认值");
      ac.qualitySteps = DEFAULTS.values.avatar.compress.qualitySteps.slice();
    }
    V.leader = obj(V.leader, "values.leader");
    V.leader.root          = num(V.leader.root,         "values.leader.root",          DEFAULTS.values.leader.root);
    V.leader.produceMul    = num(V.leader.produceMul,   "values.leader.produceMul",    DEFAULTS.values.leader.produceMul);
    V.leader.moraleMul     = num(V.leader.moraleMul,    "values.leader.moraleMul",     DEFAULTS.values.leader.moraleMul);
    V.leader.defaultName   = str(V.leader.defaultName,  "values.leader.defaultName",   DEFAULTS.values.leader.defaultName);
    V.leader.defaultAvatarImg = str(V.leader.defaultAvatarImg,"values.leader.defaultAvatarImg",DEFAULTS.values.leader.defaultAvatarImg);
    V.recruit = obj(V.recruit, "values.recruit");
    V.recruit.cost            = num(V.recruit.cost,            "values.recruit.cost",            DEFAULTS.values.recruit.cost);
    V.recruit.cdBaseSeconds   = num(V.recruit.cdBaseSeconds,   "values.recruit.cdBaseSeconds",   DEFAULTS.values.recruit.cdBaseSeconds);
    V.recruit.cdGrowthPerLevel= num(V.recruit.cdGrowthPerLevel,"values.recruit.cdGrowthPerLevel",DEFAULTS.values.recruit.cdGrowthPerLevel);
    V.recruit.cdMinSeconds    = num(V.recruit.cdMinSeconds,    "values.recruit.cdMinSeconds",    DEFAULTS.values.recruit.cdMinSeconds);
    V.discipleCapFormula = obj(V.discipleCapFormula, "values.discipleCapFormula");
    V.discipleCapFormula.type        = str(V.discipleCapFormula.type,        "values.discipleCapFormula.type",        DEFAULTS.values.discipleCapFormula.type);
    V.discipleCapFormula.base        = num(V.discipleCapFormula.base,        "values.discipleCapFormula.base",        DEFAULTS.values.discipleCapFormula.base);
    V.discipleCapFormula.perDianLevel= num(V.discipleCapFormula.perDianLevel,"values.discipleCapFormula.perDianLevel",DEFAULTS.values.discipleCapFormula.perDianLevel);
    V.saveFile = obj(V.saveFile, "values.saveFile");
    V.saveFile.exportNamePrefix  = str(V.saveFile.exportNamePrefix,  "values.saveFile.exportNamePrefix",  DEFAULTS.values.saveFile.exportNamePrefix);
    V.saveFile.confirmResetWord  = str(V.saveFile.confirmResetWord,  "values.saveFile.confirmResetWord",  DEFAULTS.values.saveFile.confirmResetWord);

    // realms
    cfg.realms = obj(cfg.realms, "realms");
    if(!Array.isArray(cfg.realms.order) || cfg.realms.order.length===0){
      warnings.push("realms.order 必须是非空数组，已回退默认值");
      cfg.realms.order = DEFAULTS.realms.order.slice();
    }
    cfg.realms.realms = obj(cfg.realms.realms, "realms.realms");
    for(const id of cfg.realms.order){
      const r = cfg.realms.realms[id] = obj(cfg.realms.realms[id], "realms.realms."+id);
      r.id = str(r.id, "realms.realms."+id+".id", id);
      r.name = str(r.name, "realms.realms."+id+".name", DEFAULTS.realms.realms[id]?.name || id);
      r.maxLevel = num(r.maxLevel, "realms.realms."+id+".maxLevel", DEFAULTS.realms.realms[id]?.maxLevel || 10);
      r.baseProduceMul = num(r.baseProduceMul, "realms.realms."+id+".baseProduceMul", DEFAULTS.realms.realms[id]?.baseProduceMul || 1);
    }

    // buildings
    cfg.buildings = obj(cfg.buildings, "buildings");
    if(!Array.isArray(cfg.buildings.order) || cfg.buildings.order.length===0){
      warnings.push("buildings.order 必须是非空数组，已回退默认值");
      cfg.buildings.order = DEFAULTS.buildings.order.slice();
    }
    cfg.buildings.buildingMeta = obj(cfg.buildings.buildingMeta, "buildings.buildingMeta");
    for(const key of cfg.buildings.order){
      const b = cfg.buildings.buildingMeta[key] = obj(cfg.buildings.buildingMeta[key], "buildings.buildingMeta."+key);
      b.id = str(b.id, "buildings.buildingMeta."+key+".id", key);
      b.name = str(b.name, "buildings.buildingMeta."+key+".name", DEFAULTS.buildings.buildingMeta[key]?.name || key);
      b.img = str(b.img,   "buildings.buildingMeta."+key+".img",  DEFAULTS.buildings.buildingMeta[key]?.img  || "");
      b.desc= str(b.desc,  "buildings.buildingMeta."+key+".desc", DEFAULTS.buildings.buildingMeta[key]?.desc || "");
      // slotCap 可选（非生产型建筑比如藏经阁没有）
      if(b.slotCap){
        const sc = b.slotCap = obj(b.slotCap, "buildings.buildingMeta."+key+".slotCap");
        const defSC = DEFAULTS.buildings.buildingMeta[key]?.slotCap || {type:"linear",base:1,perLevel:1};
        sc.type    = str(sc.type,    "buildings.buildingMeta."+key+".slotCap.type",    defSC.type);
        sc.base    = num(sc.base,    "buildings.buildingMeta."+key+".slotCap.base",    defSC.base);
        sc.perLevel= num(sc.perLevel,"buildings.buildingMeta."+key+".slotCap.perLevel",defSC.perLevel);
      }
      if(b.workerType!==null && b.workerType!==undefined){
        b.workerType = str(b.workerType, "buildings.buildingMeta."+key+".workerType", DEFAULTS.buildings.buildingMeta[key]?.workerType || null);
      }
      if(!Array.isArray(b.produces) && DEFAULTS.buildings.buildingMeta[key]?.produces) b.produces = DEFAULTS.buildings.buildingMeta[key].produces.slice();
      if(!Array.isArray(b.consumes) && DEFAULTS.buildings.buildingMeta[key]?.consumes) b.consumes = DEFAULTS.buildings.buildingMeta[key].consumes.slice();
      if(typeof b.expBoostPerLevel === "undefined" && typeof DEFAULTS.buildings.buildingMeta[key]?.expBoostPerLevel === "number"){
        b.expBoostPerLevel = DEFAULTS.buildings.buildingMeta[key].expBoostPerLevel;
      }
      if(typeof b.recipePillPerBatch === "undefined" && typeof DEFAULTS.buildings.buildingMeta[key]?.recipePillPerBatch === "number"){
        b.recipePillPerBatch = DEFAULTS.buildings.buildingMeta[key].recipePillPerBatch;
      }
      if(typeof b.recipeLingyaoCostPerBatch === "undefined" && typeof DEFAULTS.buildings.buildingMeta[key]?.recipeLingyaoCostPerBatch === "number"){
        b.recipeLingyaoCostPerBatch = DEFAULTS.buildings.buildingMeta[key].recipeLingyaoCostPerBatch;
      }
      const defP = DEFAULTS.buildings.buildingMeta[key]?.position || {x:50,y:50,w:18,h:28};
      b.position = obj(b.position, "buildings.buildingMeta."+key+".position");
      b.position.x = num(b.position.x, "buildings.buildingMeta."+key+".position.x", defP.x);
      b.position.y = num(b.position.y, "buildings.buildingMeta."+key+".position.y", defP.y);
      b.position.w = num(b.position.w, "buildings.buildingMeta."+key+".position.w", defP.w);
      b.position.h = num(b.position.h, "buildings.buildingMeta."+key+".position.h", defP.h);
      const labelDef = DEFAULTS.buildings.buildingMeta[key]?.labelPosition || "bottom";
      b.labelPosition = str(b.labelPosition, "buildings.buildingMeta."+key+".labelPosition", labelDef);
      if(!["top","bottom","left","right"].includes(b.labelPosition)) b.labelPosition = labelDef;
      b.zIndex = num(b.zIndex, "buildings.buildingMeta."+key+".zIndex", DEFAULTS.buildings.buildingMeta[key]?.zIndex || 40);
      b.cardStyle = obj(b.cardStyle, "buildings.buildingMeta."+key+".cardStyle");
    }

    // realms（额外校验 breakthrough 字段）
    for(const id of cfg.realms.order){
      const r = cfg.realms.realms[id];
      if(!r) continue;
      r.breakthrough = obj(r.breakthrough, "realms.realms."+id+".breakthrough");
      const defBT = DEFAULTS.realms.realms[id]?.breakthrough || {};
      r.breakthrough.nextRealm = typeof r.breakthrough.nextRealm==="string" || r.breakthrough.nextRealm===null
        ? r.breakthrough.nextRealm : (defBT.nextRealm ?? null);
      r.breakthrough.needPill = num(r.breakthrough.needPill, "realms.realms."+id+".breakthrough.needPill", defBT.needPill || 0);
      r.breakthrough.needBreakthroughStone = num(r.breakthrough.needBreakthroughStone, "realms.realms."+id+".breakthrough.needBreakthroughStone", defBT.needBreakthroughStone || 0);
      r.breakthrough.baseSuccessRate = num(r.breakthrough.baseSuccessRate, "realms.realms."+id+".breakthrough.baseSuccessRate", defBT.baseSuccessRate ?? 0.7);
    }

    // ui
    cfg.ui = obj(cfg.ui, "ui");
    cfg.ui.sect = obj(cfg.ui.sect, "ui.sect");
    cfg.ui.sect.defaultName = str(cfg.ui.sect.defaultName, "ui.sect.defaultName", DEFAULTS.ui.sect.defaultName);
    cfg.ui.images = obj(cfg.ui.images, "ui.images");
    cfg.ui.themeColors = obj(cfg.ui.themeColors, "ui.themeColors");
    cfg.ui.layoutTokens = obj(cfg.ui.layoutTokens, "ui.layoutTokens");
    // layoutTokens 全是 CSS 长度字符串，缺一个就从 DEFAULTS 抄回
    for(const k of Object.keys(DEFAULTS.ui.layoutTokens)){
      if(typeof cfg.ui.layoutTokens[k]!=="string" && typeof cfg.ui.layoutTokens[k]!=="number" && typeof cfg.ui.layoutTokens[k]!=="boolean"){
        cfg.ui.layoutTokens[k] = DEFAULTS.ui.layoutTokens[k];
      }
    }
    cfg.ui.uiText = obj(cfg.ui.uiText, "ui.uiText");

    // nameLib
    cfg.nameLib = obj(cfg.nameLib, "nameLib");
    if(!Array.isArray(cfg.nameLib.surnames) || cfg.nameLib.surnames.length===0){
      warnings.push("nameLib.surnames 为空，已回退默认值");
      cfg.nameLib.surnames = DEFAULTS.nameLib.surnames.slice();
    }
    if(!Array.isArray(cfg.nameLib.given) || cfg.nameLib.given.length===0){
      warnings.push("nameLib.given 为空，已回退默认值");
      cfg.nameLib.given = DEFAULTS.nameLib.given.slice();
    }

    // resources
    cfg.resources = obj(cfg.resources, "resources");

    return warnings;
  }

  // === 主入口：加载所有 JSON，合并到 cfg 对象，返回 Promise -> {cfg, sourceMap, warnings, usedFallback} ===
  async function loadAll(){
    const map = [
      ["values",    "assets/config/values.json",       "values"],
      ["buildings", "assets/config/buildings.json",    "buildings"],
      ["realms",    "assets/config/realms.json",       "realms"],
      ["nameLib",   "assets/config/name_library.json", "nameLib"],
      ["ui",        "assets/config/ui.json",           "ui"],
      ["resources", "assets/config/resources.json",    "resources"]
    ];
    const cfg = {
      values: JSON.parse(JSON.stringify(DEFAULTS.values)),
      buildings: JSON.parse(JSON.stringify(DEFAULTS.buildings)),
      realms:   JSON.parse(JSON.stringify(DEFAULTS.realms)),
      nameLib:  JSON.parse(JSON.stringify(DEFAULTS.nameLib)),
      ui:       JSON.parse(JSON.stringify(DEFAULTS.ui)),
      resources:JSON.parse(JSON.stringify(DEFAULTS.resources))
    };
    const sourceMap = {};
    let anyFailed = false;
    await Promise.all(map.map(async ([key,url,target])=>{
      const res = await fetchJSON(url);
      if(res.ok){
        cfg[target] = deepAssign(cfg[target], res.data);
        sourceMap[key] = "json:"+url;
      }else{
        anyFailed = true;
        sourceMap[key] = "fallback:embedded-defaults ("+res.err+")";
      }
    }));
    const warnings = validate(cfg);
    return { cfg, sourceMap, warnings, usedFallback: anyFailed };
  }

  // === 便捷：注入 CSS 主题变量（themeColors → --qing/…） + UI 尺寸 tokens（layoutTokens → --l-*） ===
  function injectThemeColors(colors){
    if(!colors || typeof colors!=="object") return;
    const style = document.createElement("style");
    style.setAttribute("data-zongmen-theme","1");
    const rules = [":root {"];
    for(const [k,v] of Object.entries(colors)){
      if(typeof v==="string") rules.push(`  --${k}: ${v};`);
    }
    rules.push("}");
    style.textContent = rules.join("\n");
    document.head.appendChild(style);
  }
  function injectLayoutTokens(tokens){
    if(!tokens || typeof tokens!=="object") return;
    const style = document.createElement("style");
    style.setAttribute("data-zongmen-layout","1");
    const rules = [":root {"];
    for(const [k,v] of Object.entries(tokens)){
      if(k==="_comment") continue;
      let cssVal = v;
      if(typeof v==="boolean") cssVal = v?"1":"0";
      rules.push(`  --l-${k}: ${cssVal};`);
    }
    // 额外派生几个给 JS 读取做数字判断
    rules.push(`  --l-building_mode_valid: ${String(tokens.building_mode==="positional" || tokens.building_mode==="flex" ? tokens.building_mode : "positional")};`);
    rules.push("}");
    style.textContent = rules.join("\n");
    document.head.appendChild(style);
  }

  // === 便捷：根据配置计算通用公式（供业务代码调用） ===
  function helpers(cfg){
    const V = cfg.values;
    const R = cfg.realms.realms;
    const BM = cfg.buildings.buildingMeta;
    return {
      // 弟子/掌门：每 10 秒产出（仅灵矿场 → 灵石，后续多岗位再扩充）
      producePer10s(d, realmId){
        const realm = R[realmId || d.realm] || R.lianqi;
        const base = V.produce.basePer10s * (1 + V.produce.perLevelMul*(d.level-1)) * (d.base?.root || 1) * (realm?.baseProduceMul || 1);
        return base * (d.isLeader ? V.leader.produceMul : 1);
      },
      upgradeCost(curLevel){
        return Math.floor(V.upgrade.baseCost * Math.pow(V.upgrade.growthMul, Math.max(0,curLevel-1)));
      },
      expNeeded(realmId, curLevel){
        const realm = R[realmId] || R.lianqi;
        const lv = Math.min(curLevel, realm.maxLevel-1, V.maxLevelPerRealm-1 || 10);
        return Math.floor(V.exp.baseNeed * Math.pow(V.exp.growthMul, Math.max(0,lv-1)));
      },
      discipleCap(dianLevel){
        const f = V.discipleCapFormula;
        if(f.type==="linear"){
          return f.base + f.perDianLevel * dianLevel;
        }
        return V.discipleCapFormula.base + V.discipleCapFormula.perDianLevel * dianLevel;
      },
      slotCap(buildingKey, bldLevel){
        const rule = BM[buildingKey]?.slotCap;
        if(!rule) return 1;
        if(rule.type==="linear") return rule.base + rule.perLevel * bldLevel;
        return rule.base + 1;
      },
      recruitCdSec(zhaomuLevel){
        return Math.max(
          V.recruit.cdBaseSeconds * Math.pow(V.recruit.cdGrowthPerLevel, Math.max(0,zhaomuLevel-1)),
          V.recruit.cdMinSeconds
        );
      },
      moraleMul(leaderOnDutyBool){ return leaderOnDutyBool? V.leader.moraleMul : 1; },
      // 药田：弟子/掌门每 tick 产灵药（公式和灵石一样，额外乘 lingyaoPerMul 可单独调）
      lingyaoPer10s(d, realmId){
        return this.producePer10s(d, realmId) * V.produce.lingyaoPerMul;
      },
      // 丹房：从 buildingMeta.xxx 或全局 values.alchemy 取配方（meta 优先级高方便以后单栋调）
      alchemyRecipe(buildingKey){
        const meta = BM[buildingKey||"danfang"];
        const pillPer   = typeof meta?.recipePillPerBatch === "number"        ? meta.recipePillPerBatch        : V.alchemy.recipePillPerBatch;
        const costPer   = typeof meta?.recipeLingyaoCostPerBatch === "number" ? meta.recipeLingyaoCostPerBatch : V.alchemy.recipeLingyaoCostPerBatch;
        return { pillPerBatch: pillPer, lingyaoCostPerBatch: costPer };
      },
      // 练气→筑基 等突破成功率：基础成功率 + 额外吃的丹药数 × 加成系数，最高 1.0（100%）
      breakthroughSuccessRate(realmId, extraPillAdd){
        const r = R[realmId];
        if(!r || !r.breakthrough) return 0;
        const base = r.breakthrough.baseSuccessRate;
        const add  = Math.max(0, Math.min(V.breakthrough.pillBoostAddMax, Math.floor(Number(extraPillAdd)||0)));
        const rate = base + add * V.breakthrough.pillBoostPerAdd;
        return Math.max(0, Math.min(1, rate));
      },
      // 藏经阁经验倍率（Lv.1 不加成；Lv.2 起 +5%/级）— 也接受 level 为数字的情况下 fallback 到全局 values.cangjing
      cangjingExpMul(cangjingLevel){
        const lvl = Math.max(1, Number(cangjingLevel)||1);
        // 优先读 meta.cangjing.expBoostPerLevel（建筑元数据级调，更灵活）
        const per = (typeof BM.cangjing?.expBoostPerLevel === "number") ? BM.cangjing.expBoostPerLevel
                                                                       : V.cangjing.expBoostPerLevel;
        return 1 + Math.max(0, lvl - 1) * per;
      },
      genName(){
        const sl = cfg.nameLib.surnames;
        const gl = cfg.nameLib.given;
        return sl[Math.floor(Math.random()*sl.length)] + gl[Math.floor(Math.random()*gl.length)];
      },
      maxLevel(realmId){
        const r = R[realmId];
        return r ? r.maxLevel : V.maxLevelPerRealm;
      }
    };
  }

  // === 对外暴露 ===
  global.GameConfigLoader = {
    DEFAULTS,
    loadAll,
    validate,
    injectThemeColors,
    injectLayoutTokens,
    helpers
  };
})(window);
