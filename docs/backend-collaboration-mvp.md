# Model UN Chair System 多人协作后端 MVP 方案

## 1. 当前主线结论

- 当前第一轮多人协作 MVP 的后端主线是 [`collaboration_mvp.sql`](/Users/wufengzhe/Documents/Competition/MODEL%20UN/MODEL%20UN%20Chair%20OS%20CURSOR/supabase/collaboration_mvp.sql)。
- [`meetings.sql`](/Users/wufengzhe/Documents/Competition/MODEL%20UN/MODEL%20UN%20Chair%20OS%20CURSOR/supabase/meetings.sql) 和 `MeetingSnapshot` 路径保留为旧的单表整份快照存储方案，不再作为多人协作主线继续扩展。
- [`useMeetingStore.ts`](/Users/wufengzhe/Documents/Competition/MODEL%20UN/MODEL%20UN%20Chair%20OS%20CURSOR/src/store/useMeetingStore.ts) 与 [`meetingSnapshot.ts`](/Users/wufengzhe/Documents/Competition/MODEL%20UN/MODEL%20UN%20Chair%20OS%20CURSOR/src/utils/meetingSnapshot.ts) 目前仍体现旧快照心智，后续应由前端线程逐步接到新的协作 RPC contract。

## 2. 本轮目标与范围

本轮不是重做协作系统，而是把当前已经存在的协作底座补成可上线的 MVP 主线。只补以下 4 件事：

1. host 可以在设置页再次查看、隐藏、复制 PIN。
2. 系统可以表达“当前是谁正在处理这个 motion”。
3. Finish Motion 成为“处理中内容进入正式共享记录”的明确后端提交边界。
4. 明确新旧两套后端方案谁是主线，避免后续线程继续混淆。

本轮明确不做：

- 审计日志
- 最近谁改了什么
- 接管机制
- 复杂交接
- viewer 角色
- 聊天系统
- 细粒度锁
- 复杂账号体系
- 基于 anon 的协作表级 Realtime 订阅

## 3. 数据模型

### 3.1 核心表

- `meeting_rooms`
- `meeting_room_state`
- `meeting_room_members`
- `meeting_room_sessions`

### 3.2 `meeting_rooms`

用途：

- 表示一个多人协作房间。
- 复用当前 `meetingId` 心智模型。
- 承担 PIN 校验与 host PIN 再次查看能力。

关键字段：

- `id`
- `public_meeting_id`
- `access_code_hash`
- `access_code_ciphertext`
- `status`
- `host_member_id`
- `created_at`
- `updated_at`
- `last_active_at`

说明：

- `access_code_hash` 继续用于加入校验。
- `access_code_ciphertext` 用于 host 再次查看 PIN。
- `access_code_ciphertext` 不是明文裸存，而是使用 `pgcrypto` 对称加密后落库。
- 加密密钥来自数据库配置 `app.settings.collaboration_access_code_secret`，必须在部署时配置且保持稳定。
- `collaboration_mvp.sql` 现在会统一通过 helper 调用 `pgcrypto` 能力，覆盖 `gen_random_bytes`、`crypt`、`gen_salt`、`digest`、`pgp_sym_encrypt`、`pgp_sym_decrypt` 与 `gen_random_uuid`，避免 Supabase 扩展 schema 可见性导致的 `function ... does not exist` 类报错。

### 3.3 `meeting_room_state`

用途：

- 存储房间唯一的正式共享会议状态。
- 存储“当前谁在处理 motion”的最小协作提示。

关键字段：

- `room_id`
- `shared_payload`
- `version`
- `updated_by_member_id`
- `active_motion_id`
- `active_motion_operator_member_id`
- `active_motion_started_at`
- `updated_at`

说明：

- `shared_payload` 只放正式共享状态。
- `version` 只保护正式共享状态写入。
- `active_motion_*` 是最小协作提示，不是复杂锁系统，也不承载本地处理草稿。

### 3.4 `meeting_room_members`

用途：

- 存储成员主档。

关键字段：

- `id`
- `room_id`
- `display_name`
- `normalized_name`
- `role`
- `status`
- `joined_at`
- `last_active_at`
- `left_at`
- `rejoin_token_hash`
- `last_session_id`

说明：

- 当前角色只有 `host` 和 `chair`。
- 每个房间只能有一个 `host`。
- `normalized_name` 用于同房间重名约束。
- `rejoin_token_hash` 用于无账号体系下的成员恢复。

### 3.5 `meeting_room_sessions`

用途：

- 存储一次具体加入会话。

关键字段：

- `id`
- `room_id`
- `member_id`
- `client_instance_id`
- `status`
- `joined_at`
- `last_heartbeat_at`
- `disconnected_at`
- `disconnect_reason`

说明：

- 在线判断基于活跃 session，而不是只看成员表缓存列。
- 刷新页面、断网恢复都对应新的 session。

## 4. 状态边界

### 4.1 正式共享状态

以下数据属于正式共享状态，应进入 `meeting_room_state.shared_payload`：

- 会议基础信息
- 会议流程状态
- 点名结果
- 发言队列
- 当前发言人
- 时间池
- 已正式提交的动议与动议组结果
- 投票结果

### 4.2 motion 处理中内容

motion 在处理中时：

- 完整处理内容只存在于当前操作端本地。
- 不写入 `shared_payload`。
- 后端只保留一个最小提示：当前 `motionId`、当前处理者、开始时间。

这意味着：

- 处理中草稿不是共享正式记录。
- 只有点击 Finish Motion 后，才会把最终结果通过专门 RPC 提交为新的 `shared_payload`。

### 4.3 最小协作提示

后端通过 `active_motion_*` 字段表达：

- 当前是否有人在处理 motion。
- 当前处理的 `motionId` 是什么。
- 当前处理者是谁。

本轮不做：

- 细粒度锁
- 接管
- 多阶段处理中状态树
- “最近谁改了什么”

### 4.4 不进入共享存储的数据

- 字体大小
- 音量
- 静音状态
- 提示音偏好
- 个人笔记
- 笔记窗口位置与尺寸

原则：

- 共享存储只放会议事实。
- 本地偏好继续留在前端本地。

## 5. 房间、成员与 PIN 规则

### 5.1 host 创建房间

host 创建会议时，后端执行：

1. 生成或绑定 `public_meeting_id`
2. 对 PIN 做 `hash` 保存，用于加入校验
3. 对 PIN 做对称加密保存，用于 host 后续再次查看
4. 创建 `meeting_rooms`
5. 创建 `meeting_room_state`
6. 创建 host 成员记录
7. 创建 host session
8. 返回初始化 contract

### 5.2 chair 加入房间

chair 加入时必须提供：

- `public_meeting_id`
- `PIN`
- `display_name`
- `client_instance_id`
- 可选 `member_token`

校验流程：

1. 校验房间存在
2. 校验 PIN 哈希
3. 校验名字规则
4. 识别是否已有离线成员重连
5. 创建或恢复成员
6. 创建新 session
7. 返回共享状态、成员列表、在线人数、当前 active motion 提示

### 5.3 host 唯一性

同一房间只能有一个 host。

后端通过唯一索引保证：

- 每个 `room_id` 最多一个 `role = host`

### 5.4 同名加入处理

- 房间内使用 `normalized_name` 做唯一约束。
- 如果同名成员当前在线，直接拒绝加入。
- 如果同名成员离线，只有拿到该成员原始 `member_token` 才允许恢复。
- 不允许只靠“同名 + PIN”抢占旧成员身份。

### 5.5 host 再次查看 PIN

后端支持一个 host-only RPC：

- `get_collaboration_room_access_code`

合法获取条件：

- 调用者必须提供有效的 `member_id + session_id + member_token`
- 调用者必须属于目标房间
- 调用者角色必须是 `host`

后端不会：

- 在 `join` / `get_state` / `heartbeat` 返回里直接带回 PIN
- 把 PIN 暴露给 chair
- 给 anon 开表级读权限

设置页的“默认隐藏 / 点击显示 / 点击复制”都由前端完成，后端只在 host 显式触发查看动作时返回一次原始 PIN。

### 5.6 旧房间兼容

对于只存了 `access_code_hash` 的旧房间：

- `join_collaboration_room` 在成功校验 PIN 后，会在密钥已配置时懒升级写入 `access_code_ciphertext`
- 这样旧房间不需要额外迁移脚本也能逐步具备“再次查看 PIN”能力

如果旧房间尚未完成这一步，host 查看 PIN 时会收到明确错误，提示该房间需要先经历一次带 PIN 的成功重连/加入完成补写。

## 6. 在线状态与活跃规则

### 6.1 online / offline 判断

权威判断标准：

- 成员是否存在未超时的活跃 session
- `meeting_room_members.status` 只是缓存列，不是唯一真相源

当前阈值：

- 心跳间隔：15 秒
- session 超时阈值：45 秒

### 6.2 页面关闭、断网、刷新、异常退出

- 正常关闭：前端最佳努力调用 `leave`
- 刷新：新建 session，旧 session 等 heartbeat 过期
- 断网 / 异常退出：依赖 heartbeat TTL 自动掉线

### 6.3 在线人数计算

在线人数按“去重后的在线成员数”计算，而不是按 session 数计算。

## 7. motion 处理中提示与 Finish Motion 语义

### 7.1 设置或清除当前处理者

后端提供：

- `set_collaboration_motion_processing`

语义：

- 传入 `motionId` 时，设置当前处理中的 motion 与操作者
- 传入空值时，清除当前处理提示

本轮策略：

- 这是最小状态提示，不是复杂锁系统
- 但为了避免 UI 出现两个“当前处理者”，当已有其他在线成员持有该提示时，后端会拒绝覆盖
- 同一操作者可以更新自己当前的 `motionId`

### 7.2 操作者掉线后的处理

`reconcile_room_presence` 在成员掉线、heartbeat 超时或 `leave` 后会自动清掉 `active_motion_*`：

- 不保留已经离线成员的“处理中”提示
- 不做接管
- 不做复杂转移

### 7.3 Finish Motion 的正式提交边界

后端提供：

- `finish_collaboration_motion`

它是当前 MVP 中 motion 从“本地处理中”进入“正式共享记录”的唯一明确提交边界。

调用要求：

- 必须带 `public_meeting_id`
- 必须带有效的 `member_id + session_id + member_token`
- 必须带 `requested_motion_id`
- 必须带 `base_version`
- 必须带 `next_shared_payload`

后端语义：

1. 校验调用者确实是当前 `active_motion` 的操作者
2. 校验 `requested_motion_id` 与当前 `active_motion_id` 一致
3. 校验 `base_version == current_version`
4. 原子地更新 `shared_payload`
5. `version + 1`
6. 清空 `active_motion_*`
7. 返回最新正式共享状态版本与成员快照

这条规则保证：

- motion 处理中内容不会半途中被写进共享正式记录
- Finish Motion 才是正式提交
- 正式提交与清空“当前处理者”提示在同一个后端事务边界里完成
- 当 active motion 存在时，通用 `apply_collaboration_state_update` 会被后端拒绝，因此 `finish_collaboration_motion` 已经成为 motion 处理场景下进入正式共享记录的唯一合法写入路径

### 7.4 `apply_collaboration_state_update` 的定位

`apply_collaboration_state_update` 仍然保留，但它的定位是：

- 只用于当前不存在 active motion 时的正式共享状态更新
- 仍然受 `version` 保护
- 不负责表达 Finish Motion 语义
- 只要当前存在 `active_motion_*`，后端就会直接拒绝该 RPC 的 `shared_payload` 写入

换句话说：

- motion 处理中草稿不要走 `apply_collaboration_state_update`
- motion 完成提交走 `finish_collaboration_motion`
- 只要当前有人正在处理 motion，通用 shared state 写入路径就会被后端封住

## 8. Supabase 层 contract

### 8.1 受控 RPC 列表

当前多人协作 MVP 主线至少包括以下 RPC：

- `create_collaboration_room`
- `join_collaboration_room`
- `get_collaboration_room_state`
- `get_collaboration_room_access_code`
- `heartbeat_collaboration_member`
- `set_collaboration_motion_processing`
- `leave_collaboration_member`
- `apply_collaboration_state_update`
- `finish_collaboration_motion`

### 8.2 通用身份约束

除 `create_collaboration_room` 与首次 `join_collaboration_room` 外，前端都需要持有当前成员身份上下文。

其中大多数协作 RPC 直接要求：

- `memberId`
- `sessionId`
- `memberToken`

`get_collaboration_room_state` 当前是例外：

- 传 `publicMeetingId`
- 传 `sessionId`
- 传 `memberToken`
- 后端通过 `sessionId + memberToken` 反查 `memberId`

后端统一通过有效 session 与 member token 做校验，不开放协作表的 anon 直接读写。

### 8.3 初始化响应

`create_collaboration_room` 与 `join_collaboration_room` 应返回：

- `roomId`
- `publicMeetingId`
- `memberId`
- `role`
- `memberToken`
- `sessionId`
- `sharedPayload`
- `version`
- `members`
- `onlineCount`
- `activeMotion`
- `heartbeatIntervalSeconds`
- `sessionTimeoutSeconds`

`get_collaboration_room_state` 应返回：

- `roomId`
- `publicMeetingId`
- `memberId`
- `role`
- `sessionId`
- `sharedPayload`
- `version`
- `members`
- `onlineCount`
- `activeMotion`
- `heartbeatIntervalSeconds`
- `sessionTimeoutSeconds`

### 8.4 heartbeat / leave 响应

`heartbeat_collaboration_member` 与 `leave_collaboration_member` 应返回：

- `members`
- `onlineCount`
- `activeMotion`

其中 `heartbeat_collaboration_member` 还返回：

- `heartbeatIntervalSeconds`
- `sessionTimeoutSeconds`

### 8.5 motion 处理中提示响应

`set_collaboration_motion_processing` 返回：

- `roomId`
- `activeMotion`
- `members`
- `onlineCount`

### 8.6 正式共享状态写入响应

`apply_collaboration_state_update` 返回：

- `roomId`
- `version`
- `updatedAt`
- `members`
- `onlineCount`
- `activeMotion`

`finish_collaboration_motion` 返回：

- `roomId`
- `version`
- `sharedPayload`
- `updatedAt`
- `members`
- `onlineCount`
- `activeMotion`

### 8.7 PIN 查看响应

`get_collaboration_room_access_code` 返回：

- `roomId`
- `publicMeetingId`
- `accessCode`

该接口只应在 host 显式点击“显示 PIN”时调用。

### 8.8 RLS 与 anonymous access

当前 MVP 继续采用：

- 协作表开启 RLS
- 禁止 anon 直接读写协作核心表
- 前端只调用受控 RPC
- `SECURITY DEFINER` 负责 PIN、member token、session、version 校验
- 显式撤销 `PUBLIC` 对内部 helper 与协作 RPC 的默认执行权限，只把必要 RPC 授权给 `anon`

### 8.9 Realtime / Presence

Realtime 仍是后续能力，但不在本轮 SQL 中直接开放 anon 表订阅。

当前明确策略：

- 先以安全 RPC 闭环多人协作主线
- 后续再补安全的 Realtime 分发层

## 9. 旧方案与新主线的关系

### 9.1 `supabase/meetings.sql`

定位：

- 旧的单表整份会议快照存储
- 可继续保留作历史兼容或单机云备份参考
- 不是当前多人协作 MVP 主线

### 9.2 `MeetingSnapshot` 思路

定位：

- 旧前端把整份 Zustand 状态直接序列化上云的方式
- 当前仍可作为本地存储 / 旧数据兼容参考
- 不应再作为多人协作的正式共享写入模型

原因：

- 没有成员语义
- 没有在线状态
- 没有 session 绑定
- 没有版本冲突保护
- 会把本地偏好一并同步出去
- 无法表达 Finish Motion 才正式提交的边界

### 9.3 后续线程的判断标准

如果是“当前第一轮多人协作 MVP”的需求：

- 默认扩展 `collaboration_mvp.sql`
- 默认围绕协作 RPC contract 接前端
- 不再给 `public.meetings` 继续叠加多人协作能力

## 10. 给前端线程的接入要求

### 10.1 设置页

前端需要接入以下已有后端能力：

- 成员列表：`members`
- 在线人数：`onlineCount`
- 角色：`members[].role`
- 在线 / 离线：`members[].status`
- host 显示 / 隐藏 / 复制 PIN：`get_collaboration_room_access_code`

说明：

- PIN 默认隐藏
- 只有 host 点击查看时才请求后端
- chair 不应出现可查看 PIN 的入口

### 10.2 motion 处理中提示

前端需要接入：

- 进入 motion 处理页或开始处理时，调用 `set_collaboration_motion_processing(..., motionId)`
- 退出处理但未 Finish 时，调用 `set_collaboration_motion_processing(..., null)`
- 根据 `activeMotion` 在 UI 上显示“当前谁正在处理这个 motion”

### 10.3 Finish Motion

前端需要接入：

- 点击 Finish Motion 时，不再用通用保存逻辑提交处理中草稿
- 改为调用 `finish_collaboration_motion`
- 使用返回的 `sharedPayload` 与 `version` 刷新正式共享状态

### 10.4 非 motion 的正式共享更新

前端仍可继续使用：

- `apply_collaboration_state_update`

但必须遵守：

- 只提交正式共享状态
- 只能在当前不存在 `activeMotion` 时调用
- 不提交本地偏好
- 不提交 motion 处理中草稿
- 必须带 `baseVersion`
- 冲突后先拉最新状态再重试

### 10.5 旧快照路径

前端线程后续还需要处理：

- 从 [`useMeetingStore.ts`](/Users/wufengzhe/Documents/Competition/MODEL%20UN/MODEL%20UN%20Chair%20OS%20CURSOR/src/store/useMeetingStore.ts) 的旧 `public.meetings` 保存/加载路径，逐步切到协作 RPC
- 从 [`meetingSnapshot.ts`](/Users/wufengzhe/Documents/Competition/MODEL%20UN/MODEL%20UN%20Chair%20OS%20CURSOR/src/utils/meetingSnapshot.ts) 当前“整份状态序列化”心智，逐步切到“共享状态 vs 本地偏好”拆分心智

## 11. 风险与边界

当前 MVP 最需要坚持的边界：

- 不把 PIN 暴露给 chair 或任意 anon 表读取
- 不把 motion 处理中草稿写进 `shared_payload`
- 不回到整份 MeetingSnapshot 盲写上云
- 不绕过 `version` 做正式共享状态写入
- 不把 `member_token` 当成脱离 session 的万能长期凭证

当前明确留到后续阶段的内容：

- 安全的 Realtime 分发
- 审计日志
- 最近谁改了什么
- viewer 角色
- 聊天
- 接管机制
- 复杂账号体系

## 12. 最终结论

截至当前这版 SQL 与文档，`collaboration_mvp.sql` 已经可以作为当前第一轮多人协作 MVP 的正式后端主线。

`meetings.sql` 与 `MeetingSnapshot` 方案保留，但它们是旧方案，不应再作为多人协作主线继续扩展。
