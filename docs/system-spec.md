# M-FLEM Pro (Marsh Flood Loss Estimation Model) System Specification

## 1. 系統概述 (System Overview)
M-FLEM Pro 是一套專業級工業水災損失評估與財務影響建模系統 (v10.7)。系統旨在協助風險分析師針對半導體廠房 (FAB) 與公用動力設施 (CUP) 進行垂直空間價值的精確分佈建模，並在不同淹水情境下模擬預估損失。

## 2. 技術棧 (Tech Stack)
- **前端架構**: Next.js 15 (App Router), React 19, TypeScript
- **樣式與 UI**: Tailwind CSS, ShadCN UI, Lucide Icons
- **後端與資料庫**: Firebase (Authentication, Firestore)
- **生成式 AI**: Google Genkit (Model: Gemini 2.5 Flash)
- **狀態管理**: Zustand (App Store)
- **報表匯出**: html-to-image (JPG 格式)

## 3. 使用者角色與權限 (Roles & Permissions)
| 角色 | P1-P2 (登入/配置) | P3-P5 (建模) | P6 (模擬) | 說明 |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | 全域存取 | 完整編輯 | 完整模擬 | 可管理所有公司與工廠 |
| **EDITOR** | 所屬公司存取 | 完整編輯 | 完整模擬 | 限管理所屬公司的工廠 |
| **READER** | 所屬公司存取 | **唯讀** | **完整模擬** | 僅能查看設定，但可執行模擬 |

## 4. 核心工作流 (Wizard Workflow)

### Step 1: 安全身份驗證 (Secure Authentication)
- 支援 Email 與 Security Key (密碼) 登入。
- 註冊時需指定「系統角色」與「所屬公司名稱」。

### Step 2: 組織與工廠配置 (Config)
- 根據角色過濾可存取的公司與工廠。
- **快速跳轉 (Fast Track)**：若該工廠 P5 已驗證成功 (`validationStatus == 'VALIDATED'`)，則顯示快速按鈕直達 P6，自動載入所有歷史數據。

### Step 3: 物理數據初始化 (Baseline)
- 設定座標、各類資產初始價值 (Million NTD)。
- 設定 FAB 與 CUP 的長寬、地上層數及地下層數。
- 計算總建築面積 (Plant Total Area)。

### Step 4: 空間分佈矩陣 (Spatial Refinement)
- 設定 `Facility Cleanroom Ratio` 與 `Global Tools Ratio`。
- **嚴格驗證**：每一樓層的 `Facility %` + `Cleanroom %` **總和必須精確等於 1.0**，否則禁止存檔。

### Step 5: 資產價值分佈 (Validation Matrix)
- **Facility % 計算公式**：
  - FAB 區 CR 總面積 = FAB 單一樓層面積 * (P4 各層 CR% 總和)
  - FAB 區 Non-CR 總面積 = FAB 總面積 - FAB 區 CR 總面積
  - **公式**：`[ (Fac-CR Ratio * 面積 * CR%) / Area_CR ] + [ (1 - Fac-CR Ratio * 面積 * Fac%) / (Area_NonCR + CUP 總面積) ]`
- **Tools % 計算公式**：
  - 同上邏輯，但分母不包含 CUP 面積。
- **Fixture % 計算公式**：
  - FAB 樓層：`1 / FAB 總樓層數` (平均分配)
  - CUP 樓層：`0`
- **Audit 驗證**：所有資產欄位垂直加總必須等於 1.0000 始可解鎖 P6。

### Step 6: 風險模擬與 AI 洞察 (Estimation)
- 獨立設定 **FAB L10 Height** 與 **CUP L10 Height**。
- 設定洪水高度 (Flood Height AGL)。
- **損失計算**：CUP 區設施損失率依據獨立的 CUP L10 基準計算。
- **財務彙整**：顯示 Cumulative FAB Impact、Cumulative CUP Impact 與 Site-wide Impact。
- **AI Insights**：Genkit 讀取所有財務與物理參數，生成專業風險評估敘事。

## 5. 安全與部署規則 (Security Rules)
- `plants`: 寫入限 ADMIN/EDITOR，讀取限權限內公司。
- `flood_loss_estimations`: 允許所有登入使用者 (含 READER) 建立紀錄，確保模擬可存檔。
- `user_permissions`: 僅限使用者本人或 ADMIN 存取。

---
*Last Updated: 2026-03-18*
