# Resolution voting — approved design
Independent chair-operated substantive voting workspace. Direct entry from agenda; passed Close Debate offers entry, never auto-enters after presentation. Name can be typed or selected from known papers (selection is not procedural approval). Quick aggregate counts or delegate roll call. Simple majority or two-thirds; configurable abstention denominator and PV abstention restriction. Display calculation and require explicit confirmation. Save named result, rule, roster snapshot and optional ballots through existing versioned completed-history RPC; no new motion in the proposal dropdown and no backend migration. Draft is device-local, scoped to room, survives navigation/reload; records shared and exported. No veto, amendment workflow or delegate online voting in this iteration.

## 用户纠正后的入口（2026-10-06）
- 以此节取代此前独立主界面入口：Record a motion → Close Debate / Enter Voting → 通过 → 决议计票。
- 从已通过 Close Debate 动议历史详情可重新进入；Paper Presentation 不触发。
- Quick tally 与 Roll-call vote 各配小 i，悬停、聚焦或点击显示一句英文说明。
- 验证：浏览器完整通过动议进入、历史入口、两个提示；49 项回归测试与构建通过。仅预览。

## 最新确认：两个独立动议（2026-10-06）
此节取代此前合并入口的描述。Close Debate 与 Enter Voting 分开创建、表决、保存及导出。Close Debate 不打开计票页面；仅通过的 Enter Voting 打开决议计票，其历史详情可重新进入。原 Close Debate 历史保留原类型，不迁移成 Enter Voting。

## 最新确认：主席手动决定结果（2026-10-06）
- Quick tally / Roll-call vote 用一个滑动分段选择器切换，保留说明提示、键盘与点击支持。
- Pass 与 Fail 是明确独立动作；票数和逐国记录均可选，计票只提供建议。填写文件名称后，即使无出席快照、无票数，也可记录主席决定。
- 非法数字或已知出席人数上限仍校验；零人快照不等于无权手动记录结果。
- 未记录与零区分，部分唱名记录在导出中保留未记录代表，结果使用主席选择。
