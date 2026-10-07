# Resolution voting — approved design
Independent chair-operated substantive voting workspace. Direct entry from agenda; passed Close Debate offers entry, never auto-enters after presentation. Name can be typed or selected from known papers (selection is not procedural approval). Quick aggregate counts or delegate roll call. Simple majority or two-thirds; configurable abstention denominator and PV abstention restriction. Display calculation and require explicit confirmation. Save named result, rule, roster snapshot and optional ballots through existing versioned completed-history RPC; no new motion in the proposal dropdown and no backend migration. Draft is device-local, scoped to room, survives navigation/reload; records shared and exported. No veto, amendment workflow or delegate online voting in this iteration.

## 用户纠正后的入口（2026-10-06）
- 以此节取代此前独立主界面入口：Record a motion → Close Debate / Enter Voting → 通过 → 决议计票。
- 从已通过 Close Debate 动议历史详情可重新进入；Paper Presentation 不触发。
- Quick tally 与 Roll-call vote 各配小 i，悬停、聚焦或点击显示一句英文说明。
- 验证：浏览器完整通过动议进入、历史入口、两个提示；49 项回归测试与构建通过。仅预览。
