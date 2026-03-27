# Course Management Feature - Implementation Plan

## 需求概述

为 OpenMAIC 添加「课程」管理功能，使教师能够创建课程并将多个课堂组织到课程中。

### 核心需求
1. Course 元数据：学院、专业、课程名称、课程简介、教师姓名
2. 前端 UI：创建/编辑/删除课程
3. 生成流程：选择目标课程 → 生成课堂 → 发布到课程
4. 课程浏览：按课程查看有序的课堂列表
5. 向后兼容：现有独立课堂继续工作

## 设计原则

### 数据结构 - 索引关系而非嵌套
- Course 只存储 `classroomIds[]`，不嵌入完整 classroom 数据
- Classroom 仍然独立存储在 `data/classrooms/{id}/`
- 关系是 Course → Classroom (1:N)，通过 ID 引用

### 零破坏性
- 不修改现有 `Stage` 类型
- 不修改现有 `POST /api/classroom` 逻辑
- 现有 classroom 自动成为「独立课堂」
- 所有现有 URL 和 API 保持不变

## 实现步骤

### Phase 1: 数据模型与服务端存储

#### 1.1 新增类型定义
**文件**: `lib/types/course.ts` (新建)

```typescript
export interface Course {
  id: string;
  name: string;              // 课程名称
  college: string;           // 学院
  major: string;             // 专业
  description: string;       // 课程简介
  teacherName: string;       // 教师姓名
  classroomIds: string[];    // 有序的课堂ID列表
  createdAt: string;         // ISO 8601
  updatedAt: string;
}

export interface CourseListItem {
  id: string;
  name: string;
  college: string;
  major: string;
  description: string;
  teacherName: string;
  classroomCount: number;
  createdAt: string;
}
```

#### 1.2 服务端存储模块
**文件**: `lib/server/course-storage.ts` (新建)

实现函数：
- `persistCourse(course: Course): Promise<void>` - 原子写入
- `readCourse(id: string): Promise<Course | null>`
- `listCourses(): Promise<CourseListItem[]>` - 按 createdAt 降序
- `deleteCourse(id: string): Promise<void>`
- `addClassroomToCourse(courseId: string, classroomId: string): Promise<void>`
- `removeClassroomFromCourse(courseId: string, classroomId: string): Promise<void>`
- `reorderClassrooms(courseId: string, newOrder: string[]): Promise<void>`

存储路径：`data/courses/{courseId}.json`

#### 1.3 API 路由设计
**文件**: `app/api/course/route.ts` (新建)

```typescript
GET /api/course          → listCourses()
GET /api/course?id=xxx   → readCourse(id)
POST /api/course         → persistCourse(body)
DELETE /api/course?id=xxx → deleteCourse(id)
```

**文件**: `app/api/course/classrooms/route.ts` (新建)

```typescript
POST /api/course/classrooms    → addClassroomToCourse(courseId, classroomId)
DELETE /api/course/classrooms  → removeClassroomFromCourse(courseId, classroomId)
PUT /api/course/classrooms     → reorderClassrooms(courseId, newOrder)
```

### Phase 2: 前端状态管理

#### 2.1 Course Store
**文件**: `lib/store/course.ts` (新建)

状态：
- `courses: CourseListItem[]` - 课程列表
- `currentCourse: Course | null` - 当前编辑的课程
- `isLoading: boolean`

Actions：
- `fetchCourses()` - 从服务器加载课程列表
- `fetchCourse(id)` - 加载单个课程详情
- `createCourse(data)` - 创建新课程
- `updateCourse(id, data)` - 更新课程
- `deleteCourse(id)` - 删除课程
- `addClassroom(courseId, classroomId)` - 添加课堂到课程
- `removeClassroom(courseId, classroomId)` - 从课程移除课堂
- `reorderClassrooms(courseId, newOrder)` - 重排课堂顺序

### Phase 3: UI 组件与页面

#### 3.1 课程列表页
**文件**: `app/course/page.tsx` (新建)

功能：
- 显示所有课程的卡片列表
- 每个卡片显示：课程名、学院、专业、课堂数量
- 操作按钮：新建课程、编辑、删除
- 点击卡片进入课程详情页

#### 3.2 课程详情页
**文件**: `app/course/[id]/page.tsx` (新建)

功能：
- 显示课程元数据（可编辑）
- 显示课程内的课堂列表（可拖拽排序）
- 每个课堂显示缩略图、标题、创建时间
- 操作：添加现有课堂、生成新课堂、移除课堂、预览课堂
- 点击课堂进入播放页面

#### 3.3 课程表单组件
**文件**: `components/course/course-form.tsx` (新建)

表单字段：
- 课程名称 (name)
- 学院 (college)
- 专业 (major)
- 课程简介 (description)
- 教师姓名 (teacherName)

用于创建和编辑课程。

### Phase 4: 生成流程集成

#### 4.1 修改生成器传递 courseId
**文件**: `lib/hooks/use-scene-generator.ts`

在 `generateRemaining()` 中添加可选的 `courseId` 参数，传递给后端 API。

#### 4.2 修改发布流程
**文件**: `components/header.tsx`

`publishClassroom()` 函数：
- 如果当前在课程上下文中，调用 `POST /api/course/classrooms` 将课堂关联到课程
- 保持现有独立发布流程不变

#### 4.3 生成页面课程选择
**文件**: `app/page.tsx` 或生成表单组件

在生成表单中添加：
- 可选的"目标课程"下拉选择
- 如果选择了课程，生成后自动关联到该课程
- 如果未选择，生成独立课堂

### Phase 5: 首页修改

**文件**: `app/page.tsx`

添加 Tab 切换：
- Tab 1: 我的课程 (显示课程列表)
- Tab 2: 独立课堂 (显示未关联到任何课程的课堂)

逻辑：
- 课程 Tab：调用 `GET /api/course` 获取课程列表
- 独立课堂 Tab：调用 `GET /api/classroom`，过滤出不在任何课程中的课堂

### Phase 6: 国际化

**文件**: `locales/zh-CN.json` 和 `locales/en-US.json`

添加翻译键：
- `course.name` - 课程名称 / Course Name
- `course.college` - 学院 / College
- `course.major` - 专业 / Major
- `course.description` - 课程简介 / Description
- `course.teacherName` - 教师姓名 / Teacher Name
- `course.create` - 创建课程 / Create Course
- `course.edit` - 编辑课程 / Edit Course
- `course.delete` - 删除课程 / Delete Course
- `course.classroomCount` - 课堂数量 / Classroom Count
- `course.myCourses` - 我的课程 / My Courses
- `course.standaloneClassrooms` - 独立课堂 / Standalone Classrooms

## 验证计划

### 端到端测试流程

1. **创建课程**
   - 访问 `/course`
   - 点击"创建课程"
   - 填写表单：学院、专业、课程名称、简介、教师姓名
   - 提交，验证课程出现在列表中

2. **生成课堂到课程**
   - 在首页生成表单中选择目标课程
   - 填写课堂主题，点击生成
   - 等待生成完成
   - 验证课堂出现在课程详情页的课堂列表中

3. **课程详情管理**
   - 访问 `/course/[id]`
   - 验证课程元数据显示正确
   - 拖拽课堂重新排序
   - 点击课堂进入播放页面
   - 移除一个课堂，验证它变成独立课堂

4. **向后兼容性**
   - 访问首页"独立课堂" Tab
   - 验证现有课堂仍然可见
   - 点击播放，验证功能正常
   - 验证所有现有 API 端点仍然工作

5. **数据持久化**
   - 重启服务器
   - 验证课程和课堂关系保持不变
   - 检查 `data/courses/` 目录下的 JSON 文件格式正确

## 关键文件清单

### 新建文件 (8个)
1. `lib/types/course.ts` - 类型定义
2. `lib/server/course-storage.ts` - 服务端存储
3. `lib/store/course.ts` - 前端状态管理
4. `app/api/course/route.ts` - 课程 CRUD API
5. `app/api/course/classrooms/route.ts` - 课程-课堂关系 API
6. `app/course/page.tsx` - 课程列表页
7. `app/course/[id]/page.tsx` - 课程详情页
8. `components/course/course-form.tsx` - 课程表单组件

### 修改文件 (4个)
1. `lib/hooks/use-scene-generator.ts` - 添加 courseId 参数
2. `components/header.tsx` - 发布时关联课程
3. `app/page.tsx` - 添加 Tab 切换
4. `locales/*.json` - 国际化字符串

