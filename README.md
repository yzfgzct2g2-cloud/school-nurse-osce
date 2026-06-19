# 校護緊急救護情境評核平台

可快速勾選、計時、自動計分與留存成績的校護術科練習工具。純前端（React + TypeScript + Vite），資料存於瀏覽器 localStorage，無需後端。

## 快速開始

```bash
npm install
npm run dev      # 本機開發預覽
npm run build    # 產生 dist/（已通過 tsc 型別檢查）
npm run preview  # 預覽 build 結果
```

## 功能

- 類別（內科／外科）+ 情境下拉選單，切換即載入對應評分表
- 每情境 = 13 大項通用流程 + 該情境特殊項目（共 14 張卡片）
- 每步驟可評核：標準／不標準／錯誤／未操作；點步驟文字或勾選框可快速切換完成
- 大項可「全選標準」「清除」；全頁可「全部清除」「重新開始」
- 倒數計時 12 分鐘，可開始／暫停／繼續／結束；最後 1 分鐘畫面警示 + 提示音 + 震動（失敗不影響程式）
- 結束自動產生成績紀錄，含完成率、用時、分級、是否通過、備註
- 成績紀錄頁可檢視、逐筆刪除、清除全部、匯出 JSON／CSV（CSV 附 BOM，Excel 正體中文不亂碼）

## 分級邏輯與通過標準（可調整）

所有門檻集中在 `src/utils/emergencyScore.ts` 最上方的 `SCORING_CONFIG`：

- 大項評級：該大項錯誤步驟數 >= 1 → 不標準；>= 2 → 錯誤
- 整體分級：精熟／普通／不精熟／完全不熟（依完成率、錯誤步驟數、錯誤大項數）
- 精熟、普通視為通過；不精熟、完全不熟視為未通過
- 完成率預設 = 標準步驟數 / 總步驟數

修改該物件數值即可調整，無需動其他程式。

## 新增情境

於 `src/data/emergencyScenarios.ts` 的 `scenarioDefs` 陣列加一筆（指定 id、category、name、special 大項），通用流程會自動接上。

## 部署到 GitHub Pages

`vite.config.ts` 的 `base` 已設為 './'（相對路徑），`npm run build` 後將 `dist/` 內容推上 Pages 即可。

## 主要檔案

| 檔案 | 說明 |
| --- | --- |
| src/types/emergencyScoring.ts | TypeScript 型別 |
| src/data/emergencyScenarios.ts | 情境與步驟資料（含通用流程 builder） |
| src/utils/emergencyScore.ts | 計分與分級邏輯（含可調設定） |
| src/components/EmergencyTimer.tsx | 計時器（hook + 顯示元件） |
| src/components/EmergencyScoreSheet.tsx | 主評分頁 |
| src/components/EmergencyScoreHistory.tsx | 成績紀錄頁 |
| src/App.tsx | 頁籤切換 + localStorage 持久化 |
