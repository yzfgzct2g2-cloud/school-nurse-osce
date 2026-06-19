// ============================================================
// 校護緊急救護情境評分表 - 情境資料
// ------------------------------------------------------------
// 結構說明：
//   每個情境 = 通用流程（依內外科略有差異）+ 該情境特殊項目。
//   要新增情境時，於對應陣列 push 一筆，呼叫 buildScenario 即可。
// ============================================================
import type { Category, Scenario, ScenarioSection } from '../types/emergencyScoring';

/** 小工具：由標題與步驟文字陣列產生一個大項（自動編步驟 id） */
function section(
  id: string,
  title: string,
  steps: string[],
  special = false,
): ScenarioSection {
  return {
    id,
    title,
    special,
    steps: steps.map((text, i) => ({ id: `s${i + 1}`, text })),
  };
}

// ------------------------------------------------------------
// 通用流程基底（所有情境共用）
// 第 12 項「二度評估」內外科不同，故以 category 動態產生。
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
      '請人協助撥打 119', '通知校方行政人員', '協助聯繫家長',
    ]),
    section('c05-intro', '自我介紹', [
      '表明自己是學校護理師', '告知正在進行緊急評估',
    ]),
    section('c06-primary', '初步評估', ['意識', '呼吸道', '呼吸', '循環']),
    section('c07-adjunct', '輔助檢查', [
      '血壓', '血氧', '體溫', '視情境加入血糖、辛辛那提、中風量表等',
    ]),
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
// 情境定義表（特殊項目）
// 要新增情境：在此陣列加一筆即可。
// ------------------------------------------------------------
interface ScenarioDef {
  id: string;
  category: Category;
  name: string;
  /** 特殊項目大項（會接在通用流程之後） */
  special: ScenarioSection;
}

const scenarioDefs: ScenarioDef[] = [
  // ===== 內科 =====
  {
    id: 'med-hypoglycemia',
    category: '內科',
    name: '低血糖',
    special: section('sp-hypo', '低血糖特殊處置', [
      '優先測血糖',
      '若血糖低於 70 mg/dL 且意識清楚可吞嚥，給予 15 公克快速糖分',
      '15 分鐘後再次測血糖',
      '若意識不清或無法吞嚥，避免口服，啟動 119',
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
      '使用學生自備吸入劑',
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
      '執行辛辛那提或 FAST',
      'Face 微笑',
      'Arm 雙手平舉',
      'Speech 說話',
      'Time 發作時間',
    ], true),
  },
  {
    id: 'med-cpr',
    category: '內科',
    name: 'CPR',
    special: section('sp-cpr', 'CPR 特殊處置', [
      '判斷無意識',
      '確認呼吸及脈搏 10 秒內',
      '請人打 119 並拿 AED',
      '胸外按壓位置正確',
      '速率每分鐘 100 至 120 次',
      '深度 5 至 6 公分',
      '胸回彈',
      '減少中斷',
      '按壓與吹氣 30:2',
      'AED 開、貼、插、電',
      '電擊時確認無人碰觸',
      '2 分鐘或 5 循環後重新評估',
    ], true),
  },
  {
    id: 'med-choking',
    category: '內科',
    name: '異物梗塞',
    special: section('sp-choke', '異物梗塞特殊處置', [
      '區分輕度與重度哽塞',
      '輕度鼓勵咳嗽',
      '重度執行 5 次背部拍擊',
      '5 次腹部推壓',
      '5+5 交替',
      '若失去意識，安全放倒並啟動 CPR',
      '檢查口中異物，不盲挖',
    ], true),
  },

  // ===== 外科 =====
  {
    id: 'surg-fall-fracture',
    category: '外科',
    name: '高處墜落骨折',
    special: section('sp-fall', '高處墜落骨折特殊處置', [
      '頸椎限移',
      '評估大出血',
      '評估意識',
      '評估呼吸道',
      '評估呼吸',
      '評估循環',
      '評估失能 GCS、瞳孔、四肢活動',
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
      '維持頭頸軀幹一直線',
      '頸椎限移',
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
      '不可拔除穿刺物',
      '固定穿刺物',
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
      'X 大出血',
      'C 頸椎限移',
      'C 意識',
      'A 呼吸道',
      'B 呼吸',
      'C 循環',
      'D 失能',
      'E 暴露與保暖',
    ], true),
  },
];

/** 把通用流程 + 特殊項目組成完整情境 */
function buildScenario(def: ScenarioDef): Scenario {
  return {
    id: def.id,
    category: def.category,
    name: def.name,
    sections: [...buildCommonSections(def.category), def.special],
  };
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
