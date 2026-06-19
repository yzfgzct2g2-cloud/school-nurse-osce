// ============================================================
// 校護緊急救護情境評分表 - 情境資料 v1.1.0
// ------------------------------------------------------------
// 結構：通用流程 + 特殊處置（順序：輔助檢查→特殊→SAMPLE→後續）
//        CPR / 異物梗塞 使用 customSections 完全獨立流程
// ============================================================
import type { Category, Scenario, ScenarioSection, ScenarioStep } from '../types/emergencyScoring';

/** StepInput：可以直接給字串，或給物件以標記 critical */
type StepInput = string | Omit<ScenarioStep, 'id'>;

/** 小工具：由標題與步驟陣列產生一個大項（自動編步驟 id） */
function section(
  id: string,
  title: string,
  steps: StepInput[],
  special = false,
): ScenarioSection {
  return {
    id,
    title,
    special,
    steps: steps.map((s, i) => {
      if (typeof s === 'string') {
        return { id: `s${i + 1}`, text: s };
      }
      return { id: `s${i + 1}`, ...s };
    }),
  };
}

// ------------------------------------------------------------
// 通用流程基底（所有標準情境共用，共 13 大項）
// 第 12 項「二度評估」內外科不同，故以 category 動態產生。
// 特殊處置插入在 index 7（輔助檢查之後、SAMPLE 之前）。
// ------------------------------------------------------------
function buildCommonSections(category: Category): ScenarioSection[] {
  const secondarySurvey =
    category === '內科'
      ? section('c12-secondary', '二度評估（內科：頭頸胸腹四肢）', [
          '頭部', '頸部', '胸部', '腹部', '四肢',
        ])
      : section('c12-secondary', '二度評估（外科：頭頸胸腹骨盆四肢）', [
          '頭部', '頸部', '胸部', '腹部', '骨盆', '四肢',
        ]);

  return [
    section('c01-arrival', '接獲通知／抵達現場', ['接獲通知並儘速抵達現場']),
    section('c02-protect', '自我保護', [
      '確認現場環境安全', '戴口罩', '戴手套', '必要時護目鏡或其他防護',
    ]),
    section('c03-triage', '檢傷分類', [
      '確認現場只有一名患者', '疏散圍觀同學', '維持現場安全秩序', '通報學務處或相關行政人員',
    ]),
    section('c04-critical', '危急判斷', [
      { text: '請人協助撥打 119', critical: true },
      '通知校方行政人員',
      '協助聯繫家長',
    ]),
    section('c05-intro', '自我介紹', [
      '表明自己是學校護理師', '告知正在進行緊急評估',
    ]),
    section('c06-primary', '初步評估', [
      { text: '意識', critical: true },
      { text: '呼吸道', critical: true },
      { text: '呼吸', critical: true },
      { text: '循環', critical: true },
    ]),
    section('c07-adjunct', '輔助檢查', [
      '血壓', '血氧', '體溫', '視情境加入血糖、辛辛那提、中風量表等',
    ]),
    // ↑ index 0–6  特殊處置將插在此之後（index 7）
    section('c08-sample', '病史詢問 SAMPLE', [
      '主訴（Signs/Symptoms）',
      '之前在做什麼',
      '最後一次進食（Last meal）',
      '過去病史（Past history）',
      '目前用藥（Medication）',
      '過敏史（Allergy）',
      '其他不舒服',
    ]),
    section('c09-judge', '病情整體判斷', [
      '是否需緊急送醫', '是否等待 119 交接',
    ]),
    section('c10-handover', '119 交接', [
      '已完成初步評估', '已完成必要處置', '交代目前生命徵象', '交代病史與處置',
    ]),
    section('c11-vitals', '八大生命徵象', [
      '意識', '呼吸', '脈搏', '血壓', '瞳孔', '體溫', '膚色', '血氧濃度',
    ]),
    secondarySurvey,
    section('c13-followup', '校方後續', [
      '校內人力調度至醫院與家長碰面或隨行救護車',
      '事故或災因調查',
      '事後檢討與預防措施改善',
      '學生衛教或心理輔導',
      '協助家長辦理學生保險理賠',
    ]),
  ];
}

// ------------------------------------------------------------
// 情境定義表
// ------------------------------------------------------------
interface ScenarioDef {
  id: string;
  category: Category;
  name: string;
  /** 標準情境：特殊大項（插在 輔助檢查 之後） */
  special?: ScenarioSection;
  /** 完全自訂流程（CPR / 異物梗塞） */
  customSections?: ScenarioSection[];
}

const scenarioDefs: ScenarioDef[] = [
  // ===== 內科 =====
  {
    id: 'med-hypoglycemia',
    category: '內科',
    name: '低血糖',
    special: section('sp-hypo', '低血糖特殊處置', [
      { text: '優先測血糖', critical: true },
      '若血糖低於 70 mg/dL 且意識清楚可吞嚥，給予 15 公克快速糖分',
      '15 分鐘後再次測血糖',
      { text: '若意識不清或無法吞嚥，避免口服，啟動 119', critical: true },
      '依個別健康照護計畫或醫囑評估升糖素',
    ], true),
  },
  {
    id: 'med-asthma',
    category: '內科',
    name: '氣喘',
    special: section('sp-asthma', '氣喘特殊處置', [
      '協助採坐姿或身體微前傾',
      '放慢呼吸',
      { text: '使用學生自備吸入劑', critical: true },
      '搖勻吸入器',
      '深吐氣',
      '含住吸嘴',
      '按壓並慢慢吸氣',
      '閉氣約 10 秒',
      '評估症狀是否緩解',
    ], true),
  },
  {
    id: 'med-chestpain',
    category: '內科',
    name: '胸悶痛',
    special: section('sp-chest', '胸悶痛特殊處置', [
      '詢問疼痛性質',
      '詢問是否轉移',
      '詢問嚴重度',
      '詢問開始時間',
      '評估休息後是否緩解',
      '若有醫囑可依醫囑協助 NTG',
    ], true),
  },
  {
    id: 'med-stroke',
    category: '內科',
    name: '中風',
    special: section('sp-stroke', '中風特殊評估（辛辛那提／FAST）', [
      { text: '執行辛辛那提或 FAST', critical: true },
      { text: 'Face 微笑', critical: true },
      { text: 'Arm 雙手平舉', critical: true },
      { text: 'Speech 說話', critical: true },
      { text: 'Time 記錄發作時間', critical: true },
    ], true),
  },

  // CPR — 完全獨立流程
  {
    id: 'med-cpr',
    category: '內科',
    name: 'CPR',
    customSections: [
      section('cpr-01', '接獲通知', ['接獲通知並儘速抵達現場']),
      section('cpr-02', '自我保護', [
        '確認現場環境安全', '戴口罩', '戴手套',
      ]),
      section('cpr-03', '確認患者反應', [
        { text: '拍肩並大聲呼喚確認意識', critical: true },
        { text: '大聲呼救', critical: true },
      ]),
      section('cpr-04', '啟動緊急系統', [
        { text: '請旁人撥打 119', critical: true },
        { text: '請旁人取得 AED', critical: true },
      ]),
      section('cpr-05', '確認呼吸與脈搏（10 秒內）', [
        { text: '觀察胸部起伏（呼吸）', critical: true },
        { text: '觸摸頸動脈（脈搏）', critical: true },
        { text: '10 秒內完成判斷', critical: true },
      ]),
      section('cpr-06', '胸外按壓', [
        { text: '按壓位置正確（胸骨下半段）', critical: true },
        { text: '深度 5～6 公分', critical: true },
        { text: '速率 100～120 次／分鐘', critical: true },
        { text: '胸壁完全回彈', critical: true },
        { text: '減少中斷（每次中斷 <10 秒）', critical: true },
      ]),
      section('cpr-07', '人工呼吸', [
        { text: '開啟呼吸道（壓額抬下巴）', critical: true },
        '每口氣約 1 秒，見胸起伏',
        { text: '按壓與吹氣比 30:2', critical: true },
      ]),
      section('cpr-08', 'AED 操作', [
        { text: '開：開啟 AED 電源', critical: true },
        { text: '貼：貼上電擊貼片（位置正確）', critical: true },
        { text: '插：插入連接線', critical: true },
        { text: '電：依機器指示進行電擊', critical: true },
        { text: '電擊前確認無人接觸患者', critical: true },
      ]),
      section('cpr-09', '重新評估', [
        { text: '2 分鐘或 5 循環後重新評估', critical: true },
        '再次確認呼吸與脈搏',
      ]),
      section('cpr-10', 'ROSC 後處置', [
        { text: '安置復甦姿勢（側臥）', critical: false },
        '持續監測生命徵象',
        '保持呼吸道通暢',
      ]),
      section('cpr-11', '119 交接', [
        '已完成初步評估與 CPR',
        '說明 AED 電擊次數與時間',
        '交代目前生命徵象',
        '交代病史與處置過程',
      ]),
      section('cpr-12', '校方後續', [
        '校內人力調度至醫院與家長碰面或隨行救護車',
        '事故或災因調查',
        '事後檢討與預防措施改善',
        '學生衛教或心理輔導',
        '協助家長辦理學生保險理賠',
      ]),
    ],
  },

  // 異物梗塞 — 完全獨立流程
  {
    id: 'med-choking',
    category: '內科',
    name: '異物梗塞',
    customSections: [
      section('chk-01', '接獲通知', ['接獲通知並儘速抵達現場']),
      section('chk-02', '自我保護', [
        '確認現場環境安全', '戴口罩', '戴手套',
      ]),
      section('chk-03', '嚴重度判斷', [
        { text: '詢問是否能說話', critical: true },
        { text: '詢問是否能有效咳嗽', critical: true },
        { text: '觀察是否有掐喉徵象（V 字手勢）', critical: true },
        { text: '觀察是否有發紺', critical: true },
      ]),
      section('chk-04', '輕度處置（可說話／可咳嗽）', [
        '確認為輕度梗塞',
        { text: '鼓勵患者持續用力咳嗽', critical: true },
        '持續觀察是否惡化為重度',
      ]),
      section('chk-05', '重度處置（無法說話／無法有效咳嗽）', [
        { text: '確認為重度梗塞，立即啟動處置', critical: true },
        { text: '5 次背部拍擊（肩胛骨之間）', critical: true },
        { text: '5 次腹部推壓（Heimlich 手法）', critical: true },
        { text: '5＋5 交替持續直到異物排出或失去意識', critical: true },
      ]),
      section('chk-06', '失去意識後處置', [
        { text: '安全放倒患者', critical: true },
        { text: '請人撥打 119', critical: true },
        { text: '啟動 CPR 流程', critical: true },
        { text: '每次開啟呼吸道時檢查口中異物', critical: true },
        { text: '不盲目挖喉（禁止盲挖）', critical: true },
      ]),
      section('chk-07', '119 交接', [
        '已完成初步評估',
        '說明梗塞程度與處置過程',
        '交代目前生命徵象',
        '交代是否已進行 CPR',
      ]),
      section('chk-08', '校方後續', [
        '校內人力調度至醫院與家長碰面或隨行救護車',
        '事故或災因調查',
        '事後檢討與預防措施改善',
        '學生衛教',
        '協助家長辦理學生保險理賠',
      ]),
    ],
  },

  // ===== 外科 =====
  {
    id: 'surg-fall-fracture',
    category: '外科',
    name: '高處墜落骨折',
    special: section('sp-fall', '高處墜落骨折特殊處置', [
      { text: '頸椎限移', critical: true },
      { text: '評估大出血', critical: true },
      '評估意識',
      '評估呼吸道',
      '評估呼吸',
      '評估循環',
      '評估失能（GCS、瞳孔、四肢活動）',
      '暴露檢查頭頸胸腹骨盆四肢',
      '骨折處理前後需評估脈搏、感覺、運動',
      '保暖',
      '預防休克',
    ], true),
  },
  {
    id: 'surg-neck-injury',
    category: '外科',
    name: '頸部受傷',
    special: section('sp-neck', '頸部受傷特殊處置', [
      '從腳側靠近',
      '要求患者眼睛看前方不要轉頭',
      { text: '維持頭頸軀幹一直線', critical: true },
      { text: '頸椎限移', critical: true },
      '測量下巴至肩線距離',
      '調整適當頸圈',
      '戴頸圈後重新確認是否合適',
      '避免增加顱內壓，必要時抬高頭部',
    ], true),
  },
  {
    id: 'surg-puncture',
    category: '外科',
    name: '穿刺傷',
    special: section('sp-punc', '穿刺傷特殊處置', [
      { text: '不可拔除穿刺物', critical: true },
      { text: '固定穿刺物', critical: true },
      '控制周邊出血',
      '評估遠端脈搏、感覺、運動',
      '若胸部穿刺傷，需評估呼吸、氣管偏移、頸靜脈怒張、皮下氣腫',
      '觀察休克徵象',
    ], true),
  },
  {
    id: 'surg-other-trauma',
    category: '外科',
    name: '其他外傷',
    special: section('sp-other', '其他外傷（外科通用 XABCDE）', [
      { text: 'X 大出血', critical: true },
      { text: 'C 頸椎限移', critical: true },
      'C 意識',
      'A 呼吸道',
      'B 呼吸',
      'C 循環',
      'D 失能',
      'E 暴露與保暖',
    ], true),
  },
];

/** 把通用流程 + 特殊處置（插入正確位置）or 自訂流程 組成完整情境 */
function buildScenario(def: ScenarioDef): Scenario {
  let sections: ScenarioSection[];

  if (def.customSections) {
    sections = def.customSections;
  } else {
    const common = buildCommonSections(def.category);
    if (def.special) {
      // 特殊處置插在 index 7（輔助檢查之後、SAMPLE 之前）
      sections = [...common.slice(0, 7), def.special, ...common.slice(7)];
    } else {
      sections = common;
    }
  }

  return { id: def.id, category: def.category, name: def.name, sections };
}

/** 所有情境（已組裝完成） */
export const scenarios: Scenario[] = scenarioDefs.map(buildScenario);

/** 依類別取得情境清單（給下拉選單用） */
export function scenariosByCategory(category: Category): Scenario[] {
  return scenarios.filter((s) => s.category === category);
}

/** 依 id 取得情境 */
export function getScenario(id: string): Scenario | undefined {
  return scenarios.find((s) => s.id === id);
}

/** 所有類別 */
export const categories: Category[] = ['內科', '外科'];
