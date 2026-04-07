# OpenMAIC 用户认证与权限系统 — 测试说明

**版本：** feat/user-auth-permission  
**测试地址：** http://172.16.29.100:8002  
**日期：** 2026-04-07（修订 v2，采纳内部复审意见）

---

## 一、背景

本次测试针对新增的用户认证与角色权限系统（auth/permission）。该功能在独立分支实现，尚未合并到主分支。

**新增核心能力：**
- 账号注册 / 登录 / 退出
- 三种角色：`admin`（管理员）/ `teacher`（教师）/ `student`（学生）
- 三种账号状态：`active`（正常）/ `pending_review`（待审核）/ `disabled`（已禁用）
- 中间件登录门控：未登录用户自动跳转 `/login`
- 后端 API 全面鉴权：未授权请求返回 401/403
- 前端角色化展示：不同角色看到不同操作入口
- 管理员后台 `/admin`：用户列表、审核/禁用/删除

**表格约定：**
- `检查层级 = API`：用 curl 验证 JSON 返回值
- `检查层级 = UI`：用浏览器操作验证页面行为，预期写本地化文案（中文/英文均可）

---

## 二、测试账号

| 角色 | 用户名 | 密码 | 说明 |
|------|--------|------|------|
| admin | admin | admin123 | 系统初始管理员（首次登录自动创建） |
| student | student1 | pass123 | 已存在的学生账号 |
| teacher（待注册） | teacher_qa | qa123456 | 测试时注册 |
| student（待注册） | student_qa | qa123456 | 测试时注册 |

---

## 三、功能测试用例

### 3.1 未认证访问

| # | 检查层级 | 操作 | 预期结果 |
|---|---------|------|----------|
| T01 | API | `curl -sI http://172.16.29.100:8002/` | `HTTP/... 307`，`location: /login?from=%2F` |
| T02 | API | `curl -sI http://172.16.29.100:8002/course` | `HTTP/... 307`，`location: /login?from=%2Fcourse` |
| T03 | API | `curl -s http://172.16.29.100:8002/api/auth/me` | `{"success":false,"error":"Unauthorized"}` (401) |
| T04 | API | `curl -s -X POST http://172.16.29.100:8002/api/course` | 401 JSON |
| T05 | UI | 浏览器访问 `/login` 和 `/register` | 正常打开，无跳转 |

### 3.2 注册流程

| # | 检查层级 | 操作 | 预期结果 |
|---|---------|------|----------|
| T10 | UI+API | 注册学生：用户名 `student_qa`，密码 `qa123456`，角色 学生 | 注册成功，自动登录，跳转首页；`/api/auth/me` 返回 `{"role":"student","status":"active",...}` |
| T11 | UI+API | 注册教师：用户名 `teacher_qa`，密码 `qa123456`，角色 教师 | 注册成功，自动登录；`/api/auth/me` 返回 `{"role":"teacher","status":"pending_review",...}` |
| T12 | API | 重复注册相同用户名 `student_qa` | `{"success":false,"error":"Username already taken"}` (409) |
| T13 | API | 注册时密码 `"abc"` (少于 6 位) | `{"success":false,"error":"Password must be at least 6 characters"}` (400) |
| T14 | API | 注册时用户名 `"user@name"` (含特殊字符) | `{"success":false,"error":"username must be 3-32 characters..."}` (400) |

### 3.3 登录流程

| # | 检查层级 | 操作 | 预期结果 |
|---|---------|------|----------|
| T20 | UI+API | 用 admin / admin123 登录 | 登录成功，跳转首页；`/api/auth/me` 返回 `{"role":"admin","status":"active",...}` |
| T21 | UI | 输入正确用户名 + 错误密码登录 | 页面提示"用户名或密码错误"类文案 |
| T22 | API | `curl` 提交不存在的用户名 | `{"success":false,"error":"Invalid credentials"}` (401)（与 T21 API 返回相同，不可区分） |
| T23 | UI | 登录后刷新页面 | 仍保持登录状态（7 天 cookie） |
| T24 | UI | 点击退出，再访问首页 | 跳转 `/login` |
| T25 | UI | 访问 `/course`，被跳转到 `/login?from=%2Fcourse`，登录后 | 跳转回 `/course`，而非首页 |
| T26 | UI | 手动访问 `/login?from=//evil.com`，完成登录后 | 跳转到 `/`，不跳转到 `//evil.com` |

### 3.4 管理员功能

| # | 检查层级 | 操作 | 预期结果 |
|---|---------|------|----------|
| T30 | UI | admin 登录后，直接访问 `/admin` | 用户管理页正常打开，显示用户列表 |
| T31 | API | admin cookie：`curl /api/admin/users` | 200，返回所有已注册用户列表 |
| T32 | UI+API | 对 `teacher_qa`（pending_review）点击"通过" | 成功；`/api/admin/users` 返回该用户 `status:active, role:teacher` |
| T33 | UI | 对 `student_qa` 点击"禁用" | 成功，状态变为 `disabled` |
| T34 | UI | 用 `student_qa` 账号尝试登录（已禁用） | 页面提示"账号已被禁用"类文案（API 返回：`"Account disabled"` 403） |
| T35 | UI | 对 `student_qa` 点击"启用" | 成功，状态变回 `active` |
| T36 | API | `PUT /api/admin/users` 发送 `{"id":"<自己的id>","role":"teacher"}` | `{"success":false,"error":"Cannot demote or disable your own admin account"}` (400) |
| T37 | API | `PUT /api/admin/users` 发送 `{"id":"<自己的id>","status":"disabled"}` | `{"success":false,"error":"Cannot demote or disable your own admin account"}` (400) |
| T38 | API | `DELETE /api/admin/users?id=<自己的id>` | `{"success":false,"error":"Cannot delete your own account"}` (400) |
| T39 | UI | student 直接访问 `/admin` | 页面重定向至首页（后端返回 403，前端 JS 跳转） |
| T40 | API | student cookie：`curl /api/admin/users` | `{"success":false,"error":"Forbidden"}` (403) |

### 3.5 课程权限

| # | 检查层级 | 操作 | 预期结果 |
|---|---------|------|----------|
| T50 | UI | student 登录，访问 `/course`（环境需有已发布课程） | 无"创建课程"按钮，课程卡片上无删除图标 |
| T51 | UI | student 访问首页 courses 标签 | 无"管理课程"按钮 |
| T52 | API | student cookie：`POST /api/course` | `{"success":false,"error":"Forbidden"}` (403) |
| T53 | UI | pending_review teacher 登录，访问 `/course`（环境需有已发布课程） | 无"创建课程"按钮，无删除图标（状态未激活，等同学生） |
| T54 | UI | active teacher 登录，访问 `/course` | 可见"创建课程"按钮；自己的课程卡片有删除图标 |
| T55 | UI | active teacher 创建一门课程 | 创建成功，课程列表中显示 |
| T56 | UI | admin 登录，访问 `/course` | 可见所有课程（含其他教师的课程），可创建/删除 |
| T57 | API | student cookie：`GET /api/course` | 只返回 `status:"published"` 的课程 |

### 3.6 课室 / 媒体权限

| # | 检查层级 | 操作 | 预期结果 |
|---|---------|------|----------|
| T60 | API | student cookie：`POST /api/classroom` | `{"success":false,"error":"Forbidden"}` (403) |
| T61 | API | active teacher cookie：`POST /api/classroom` + 完整参数 | 201（参数不完整返回 400，不应是 401/403） |
| T62 | API | **无 cookie**：`GET /api/classroom/media?id=xxx&file=yyy` | `{"success":false,"error":"Unauthorized"}` (401) |
| T63 | 已知限制 | student（有 cookie）`GET /api/classroom/media?id=xxx&file=yyy` | 当前返回 200（见 K05，媒体接口不校验课室可见性） |

### 3.7 数据迁移（legacy 数据）

| # | 检查层级 | 操作 | 预期结果 |
|---|---------|------|----------|
| T70 | UI | admin 登录后，访问已有的旧课程 | 正常打开，不崩溃；课程含 ownerId 字段 |
| T71 | API | admin cookie：`GET /api/classroom?id=<旧课室id>` | 200，返回数据含 `ownerId` 和 `visibility` 字段 |

---

## 四、重点压力测试

### S01 — 时序攻击（Timing Oracle）

```bash
# 对已存在的 disabled 账号计时
time curl -s -X POST http://172.16.29.100:8002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student_qa","password":"wrongpass"}'

# 对不存在用户计时
time curl -s -X POST http://172.16.29.100:8002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"nonexistent_user_xyz","password":"wrongpass"}'
```

**预期：** 两者响应时间接近（均经过 bcrypt）。  
**已知：** disabled 路径比"不存在"路径快约 100ms（见 K01），记录时间差即可。

### S02 — 用户名大小写

```bash
# 先注册 alice
curl -s -X POST http://172.16.29.100:8002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"pass123","displayName":"Alice","role":"student"}'

# 再注册 Alice
curl -s -X POST http://172.16.29.100:8002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"Alice","password":"pass123","displayName":"Alice2","role":"student"}'
```

**当前行为：** `alice` 和 `Alice` 是两个独立账号（见 K03），记录实际返回状态码。

### S03 — 并发注册竞争

同时从两个标签页提交相同用户名注册表单。  
**预期：** 一个 201 成功，另一个 409 冲突，不应出现两个都成功。

### S04 — 课室列表枚举

```bash
curl -s -b /tmp/student.cookie http://172.16.29.100:8002/api/classroom
```

**当前行为：** 返回所有课室（含 private 课室名称和首张幻灯片信息，见 K02），记录返回内容。

### S05 — Admin 最后保护（PUT 降级）

```bash
# 先获取 admin 的用户 ID
ADMIN_ID=$(curl -s -b /tmp/admin.cookie http://172.16.29.100:8002/api/auth/me \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['user']['id'])")

# 尝试把自己降为 teacher
curl -s -b /tmp/admin.cookie -X PUT http://172.16.29.100:8002/api/admin/users \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$ADMIN_ID\",\"role\":\"teacher\"}"
```

**预期：** `{"success":false,"error":"Cannot demote or disable your own admin account"}` (400)

---

## 五、已知问题 / 不在本次测试范围

| 编号 | 描述 | 严重度 | 状态 |
|------|------|--------|------|
| K01 | disabled 账号登录存在约 100ms timing oracle（比"不存在"路径快） | Low | 已知，可接受 |
| K02 | `GET /api/classroom`（无 id 参数）对已登录用户返回全部课室（含 private） | Medium | 待后续迭代 |
| K03 | 用户名大小写敏感（`alice` / `Alice` 是不同账号） | Low | 待后续迭代 |
| K04 | `readUserByUsername` O(N) 全文件扫描（用户量大时有性能问题） | Performance | 小规模无影响 |
| K05 | `GET /api/classroom/media` 只校验登录，不校验课室 visibility；知道文件 ID 的登录用户均可读取 | Medium | 待后续迭代 |

---

## 六、测试环境准备

```bash
# 1. 确认服务正常
curl -s http://172.16.29.100:8002/api/health
# 预期: {"success":true,"status":"ok","version":"0.1.0"}

# 2. 获取 admin cookie
curl -s -c /tmp/admin.cookie -X POST http://172.16.29.100:8002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 3. 获取 student cookie
curl -s -c /tmp/student.cookie -X POST http://172.16.29.100:8002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"student1","password":"pass123"}'

# 4. 注册测试账号（T10/T11 前执行）
curl -s -X POST http://172.16.29.100:8002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"student_qa","password":"qa123456","displayName":"QA Student","role":"student"}'

curl -s -X POST http://172.16.29.100:8002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"teacher_qa","password":"qa123456","displayName":"QA Teacher","role":"teacher"}'
```

---

## 七、测试后清理

```bash
# 获取临时账号 ID
STUDENT_QA_ID=$(curl -s -b /tmp/admin.cookie \
  http://172.16.29.100:8002/api/admin/users \
  | python3 -c "import json,sys; users=json.load(sys.stdin)['users']; \
    [print(u['id']) for u in users if u['username']=='student_qa']")

TEACHER_QA_ID=$(curl -s -b /tmp/admin.cookie \
  http://172.16.29.100:8002/api/admin/users \
  | python3 -c "import json,sys; users=json.load(sys.stdin)['users']; \
    [print(u['id']) for u in users if u['username']=='teacher_qa']")

# 删除临时账号
curl -s -b /tmp/admin.cookie -X DELETE \
  "http://172.16.29.100:8002/api/admin/users?id=$STUDENT_QA_ID"
curl -s -b /tmp/admin.cookie -X DELETE \
  "http://172.16.29.100:8002/api/admin/users?id=$TEACHER_QA_ID"

# 删除 cookie 文件
rm -f /tmp/admin.cookie /tmp/student.cookie /tmp/teacher.cookie
```

---

## 八、验收标准

**必须全部通过后才能合并主分支：**

- T01–T05（未认证访问）全部通过
- T20–T26（登录流程）全部通过
- T30–T40（管理员功能，含 T36/T37/T38 API 验证）全部通过
- T50–T57（课程权限）全部通过
- T62（媒体接口无认证返回 401）通过
- S05（admin 最后保护 PUT 方式）通过

**允许带问题合并（已记录 Known Issues）：**

- K01、K02、K03、K04、K05 可在后续迭代修复，不阻塞合并
