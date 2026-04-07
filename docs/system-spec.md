# M-FLEM Pro (Marsh Flood Loss Estimation Model) 系統規格書 v11.0

## 1. 系統概述 (System Overview)
M-FLEM Pro 是一套針對半導體與高科技工廠設計的專業級工業水災損失評估建模系統。系統透過垂直空間（樓層）的資產價值分佈建模，協助風險工程師在不同淹水情境下精確預估財務影響。

### 核心視覺識別 (Visual Identity)
- **啟動畫面 (Splash Screen)**：進入應用程式時會顯示高階動畫，包含中心化的 **Shield (護盾)** 圖標脈動動畫以及字母追蹤擴張的品牌文字 "M-FLEM PRO"。
- **配色規範**：以深藍寶石色 (#1A46A6) 為主調，搭配亮青色 (#3CC7E7) 作為互動元素與焦點色。
- **字體**：全系統採用 'Inter' 無襯線字體，確保高數據密度下的閱讀清晰度。

## 2. 技術架構 (Tech Stack)
- **架構框架**：Next.js 16 (App Router), React 19, TypeScript
- **樣式引擎**：Tailwind CSS (Vanilla CSS 擴展), ShadCN UI, Lucide Icons
- **後端整合**：Firebase (Authentication, Firestore NoSQL)
- **狀態管理**：Zustand (全域應用狀態存取)
- **報表匯出**：
    - **Excel (.xlsx)**：支援跨步驟數據匯總與詳細損失計算。
    - **影像 (JPG)**：使用 `html-to-image` 擷取即時分析面板。

## 3. 使用者與存取權限 (Permissions Mode)
| 角色 | P1-P2 (登入/配置) | P3-P5 (建模) | STEP6 (模擬與匯出) |
| :--- | :--- | :--- | :--- |
| **ADMIN** | 全域存取 / 管理使用者 | 完整編輯 | 完整模擬與報表匯出 |
| **EDITOR** | 所屬公司存取 | 完整編輯 | 完整模擬與報表匯出 |
| **READER** | 所屬公司存取 | **唯讀** / 自動計算 | **完整模擬**與報表匯出 |

## 4. 核心工作流 (The Wizard Journey)

### Step 1: 安全身份驗證 (Authentication)
- 分析師需透過經授權的 Email 與 Security Key 登錄。
- 專屬「終端機存取 (Terminal Access)」介面。

### Step 2: 組織與工廠配置 (Site Configuration)
- **快速通關 (Fast Track to STEP6)**：
    - 若工廠狀態為 `VALIDATED`（已驗證），系統會從 Firestore (`building_value_ratios`) 自動抓取歷史垂直分佈矩陣。
    - 按下「Fast Pass to STEP6」按鈕即可跳過中間步驟，直接進行損害模擬。

### Step 3: 物理數據初始化 (Physical Baseline)
- 定義工廠基本地理位置與 FAB/CUP 結構。
- **輸入項**：地上層數 (Al)、地下層數 (Bl)、廠房長寬。
- **資產初始價值 (M NTD)**：Building、Facility、Tools、Fixture、Stock。

### Step 4: 空間價值分佈 (Spatial Refinement)
- 設定 `Cleanroom (無塵室)` 在不同樓層的佔比（CR%）。
- **驗證規則**：每一樓層的 `Facility %` + `Cleanroom %` 之和必須精確等於 1.0 (100%)。

### Step 5: 資產分配矩陣驗證 (Matrix Validation)
- **自動化分配 (Audit Mode)**：根據 P4 的 CR% 分佈，自動計算每一層的 Facility 和 Tools 目標分配率。
- **關鍵加總規則**：
    - Building Column Sum = 1.0000
    - Facility Column Sum = 1.0000
    - Tools Column Sum = 1.0000
    - Fixture Column Sum = 1.0000
    - Stock Column Sum ≤ 1.0000 (通常集中於 FAB-L10)
- **狀態鎖定**：加總誤差必須在 0.001 內，系統始可鎖定矩陣並開啟模擬權限。

### Step 6: 風險模擬與匯出 (Risk Analysis - STEP6)
- **水災情境模擬**：動態調整洪水高度 (Flood Height AGL)，系統自動對比 FAB/CUP L10 高度基準。
- **損失計算公式**：`LOSS = 該樓層資產價值 * (該類別損失比例 / 100)`。
- **AI 智能洞察**：Genkit 結合當前財務模型與風險參數，生成專業的評估敘事。
- **報表匯出系統**：
    - **Excel**：將 P2-P6 的所有原始配置、矩陣分佈、以及「詳細損害計算結果」完整匯出為試算表。

## 5. 資料存儲模型 (Data Collections)
- `plants`: 存儲工廠物理規格與基礎價值。
- `building_value_ratios`: 核心矩陣分佈數據，包含驗證狀態。
- `flood_loss_estimations`: 存儲模擬歷史紀錄與匯總損失金額。
- `user_permissions`: 使用者角色與所屬公司映射。

---
*文件更新日期：2026-04-07*
*版本：v11.0 Professional Edition*
