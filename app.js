// 개인용 할 일 관리 앱.
// 구성: 데이터 계층(localStorage CRUD) → 렌더링 계층(목록/진행률 그리기)
//       → 상호작용 계층(폼 제출, 클릭 등 이벤트 처리 → 데이터 변경 → 재렌더링)

// ===== 데이터 계층 (Data Layer) =====

const STORAGE_KEY = "todos";
const ACTIVE_FILTER_KEY = "activeFilter";

/**
 * 저장된 카테고리 필터를 반환한다. 저장된 값이 없으면 "all".
 * @returns {"all"|"work"|"personal"|"study"}
 */
function getActiveFilter() {
  return localStorage.getItem(ACTIVE_FILTER_KEY) || "all";
}

/**
 * 카테고리 필터를 localStorage에 저장한다.
 * @param {"all"|"work"|"personal"|"study"} filter
 */
function saveActiveFilter(filter) {
  localStorage.setItem(ACTIVE_FILTER_KEY, filter);
}

/**
 * 저장된 전체 할 일 목록을 반환한다. 저장된 값이 없으면 빈 배열을 반환한다.
 * @returns {Array<Object>}
 */
function getTodos() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 할 일 목록 전체를 localStorage에 저장한다.
 * @param {Array<Object>} todos
 */
function saveTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

/**
 * 고유 id를 생성한다.
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * 새 할 일을 생성하여 저장하고, 생성된 항목을 반환한다.
 * @param {string} title
 * @param {"work"|"personal"|"study"} category
 * @param {string|null} [dueDate] "YYYY-MM-DD" 형식의 마감일. 없으면 null.
 * @returns {Object}
 */
function addTodo(title, category, dueDate) {
  const todos = getTodos();
  const newTodo = {
    id: generateId(),
    title,
    category,
    dueDate: dueDate || null,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  todos.push(newTodo);
  saveTodos(todos);
  return newTodo;
}

/**
 * 특정 id의 할 일을 수정한다 (title, category 등).
 * @param {string} id
 * @param {Object} updates
 * @returns {Object|null} 수정된 항목, 없으면 null
 */
function updateTodo(id, updates) {
  const todos = getTodos();
  const index = todos.findIndex((todo) => todo.id === id);
  if (index === -1) return null;

  todos[index] = { ...todos[index], ...updates };
  saveTodos(todos);
  return todos[index];
}

/**
 * 특정 id의 할 일을 삭제한다.
 * @param {string} id
 * @returns {boolean} 삭제 성공 여부
 */
function deleteTodo(id) {
  const todos = getTodos();
  const filtered = todos.filter((todo) => todo.id !== id);
  if (filtered.length === todos.length) return false;

  saveTodos(filtered);
  return true;
}

/**
 * 완료 상태를 토글한다.
 * true가 되면 completedAt을 현재 시각으로 기록하고,
 * false가 되면 completedAt을 null로 되돌린다.
 * @param {string} id
 * @returns {Object|null} 변경된 항목, 없으면 null
 */
function toggleComplete(id) {
  const todos = getTodos();
  const index = todos.findIndex((todo) => todo.id === id);
  if (index === -1) return null;

  const todo = todos[index];
  todo.completed = !todo.completed;
  todo.completedAt = todo.completed ? new Date().toISOString() : null;

  saveTodos(todos);
  return todo;
}

/**
 * ISO 날짜 문자열이 오늘(연-월-일 기준)인지 판단한다.
 * @param {string} isoDateString
 * @returns {boolean}
 */
function isSameDayAsToday(isoDateString) {
  const date = new Date(isoDateString);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * 오늘 날짜를 "YYYY-MM-DD" 형식(로컬 기준)으로 반환한다.
 * @returns {string}
 */
function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 할 일이 기한을 넘겼는지 여부를 반환한다.
 * completed가 false이고 dueDate가 오늘보다 이전이면 true. dueDate가 없으면 false.
 * @param {Object} todo
 * @returns {boolean}
 */
function isOverdue(todo) {
  if (todo.completed || !todo.dueDate) return false;
  return todo.dueDate < getTodayDateString();
}

// ===== 렌더링 계층 (Rendering Layer) =====

const CATEGORY_LABELS = {
  work: "업무",
  personal: "개인",
  study: "공부",
};

// 카테고리별 자동 분류 키워드. 제목에 이 키워드가 포함되면 해당 카테고리로 추정한다.
const CATEGORY_KEYWORDS = {
  work: ["회의", "미팅", "보고서", "보고", "발표", "이메일", "메일", "프로젝트", "출장", "계약", "클라이언트", "고객", "마감", "결재", "협업", "워크숍", "회사"],
  personal: ["병원", "약속", "쇼핑", "장보기", "운동", "헬스", "가족", "친구", "생일", "여행", "청소", "빨래", "요리", "은행", "보험", "데이트"],
  study: ["공부", "시험", "과제", "숙제", "강의", "수업", "독서", "논문", "스터디", "학습", "자격증", "강좌", "책"],
};

/**
 * 제목에 포함된 키워드를 기준으로 카테고리를 추정한다.
 * work → personal → study 순으로 검사해 가장 먼저 일치하는 카테고리를 반환한다.
 * 일치하는 키워드가 없으면 null.
 * @param {string} title
 * @returns {"work"|"personal"|"study"|null}
 */
function detectCategoryFromTitle(title) {
  const trimmed = title.trim();
  if (!trimmed) return null;

  return (
    Object.keys(CATEGORY_KEYWORDS).find((category) =>
      CATEGORY_KEYWORDS[category].some((keyword) => trimmed.includes(keyword))
    ) ?? null
  );
}

/**
 * getTodos()로 목록을 가져와 activeFilter에 맞는 항목만 최신순으로 정렬해 #todo-list에 렌더링한다.
 * editingId와 일치하는 항목은 인라인 수정 모드로 렌더링된다.
 */
function renderTodos() {
  const list = document.getElementById("todo-list");
  if (!list) return;

  const todos = getTodos()
    .filter((todo) => activeFilter === "all" || todo.category === activeFilter)
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  list.innerHTML = "";

  todos.forEach((todo) => {
    const li = todo.id === editingId ? buildEditItem(todo) : buildDisplayItem(todo);
    list.appendChild(li);
  });

  if (editingId) {
    const input = list.querySelector(`.todo-item[data-id="${editingId}"] .edit-title-input`);
    if (input) {
      input.focus();
      input.select();
    }
  }

  renderProgress();
}

/**
 * 오늘 등록된 할 일 완료 개수와 전체 개수로 "X / Y 완료 (Z%)" 형태의 문자열을 만든다.
 * @param {Array<Object>} todos
 * @returns {{ total: number, completedCount: number, percent: number, text: string }}
 */
function summarizeProgress(todos) {
  const total = todos.length;
  const completedCount = todos.filter((todo) => todo.completed).length;
  const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  return { total, completedCount, percent, text: `${completedCount} / ${total} 완료 (${percent}%)` };
}

/**
 * 오늘 등록된 할 일 기준으로 "오늘 X / Y 완료 (Z%)" 텍스트, 진행률 막대,
 * 카테고리별 완료 현황을 갱신한다. (지연된 이전 항목은 집계에서 제외된다.)
 */
function renderProgress() {
  const progressText = document.getElementById("progress-text");
  const progressBarFill = document.getElementById("progress-bar-fill");
  const categoryList = document.getElementById("progress-category-list");
  if (!progressText || !progressBarFill || !categoryList) return;

  const todayTodos = getTodos().filter((todo) => isSameDayAsToday(todo.createdAt));
  const overall = summarizeProgress(todayTodos);

  progressText.textContent = `오늘 ${overall.text}`;
  progressBarFill.style.width = `${overall.percent}%`;

  categoryList.innerHTML = "";
  Object.keys(CATEGORY_LABELS).forEach((category) => {
    const categoryTodos = todayTodos.filter((todo) => todo.category === category);
    const summary = summarizeProgress(categoryTodos);

    const li = document.createElement("li");
    li.className = "progress-category-item";

    const label = document.createElement("span");
    label.className = `category-tag category-${category}`;
    label.textContent = CATEGORY_LABELS[category];

    const stat = document.createElement("span");
    stat.className = "progress-category-stat";
    stat.textContent = summary.text;

    li.append(label, stat);
    categoryList.appendChild(li);
  });
}

/**
 * 할 일 하나를 표시 모드 <li>로 만든다.
 * @param {Object} todo
 * @returns {HTMLLIElement}
 */
function buildDisplayItem(todo) {
  const li = document.createElement("li");
  li.className = "todo-item";
  li.dataset.id = todo.id;
  if (todo.completed) li.classList.add("completed");
  if (isOverdue(todo)) li.classList.add("overdue");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "todo-checkbox";
  checkbox.checked = todo.completed;

  // textContent 사용: 사용자가 입력한 title에 HTML 태그가 섞여도 그대로 텍스트로만 표시된다.
  const title = document.createElement("span");
  title.className = "todo-title";
  title.textContent = todo.title;

  const categoryTag = document.createElement("span");
  categoryTag.className = `category-tag category-${todo.category}`;
  categoryTag.textContent = CATEGORY_LABELS[todo.category] ?? todo.category;

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "edit-btn";
  editBtn.textContent = "수정";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "삭제";

  const actions = document.createElement("div");
  actions.className = "todo-actions";
  actions.append(editBtn, deleteBtn);

  li.append(checkbox, title);

  if (todo.dueDate) {
    const dueDateEl = document.createElement("span");
    dueDateEl.className = "due-date";
    dueDateEl.textContent = `📅 ${todo.dueDate}`;
    li.append(dueDateEl);
  }

  li.append(categoryTag, actions);
  return li;
}

/**
 * 할 일 하나를 인라인 수정 모드 <li>로 만든다.
 * @param {Object} todo
 * @returns {HTMLLIElement}
 */
function buildEditItem(todo) {
  const li = document.createElement("li");
  li.className = "todo-item editing";
  li.dataset.id = todo.id;

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.className = "edit-title-input";
  titleInput.value = todo.title;

  const dueDateInput = document.createElement("input");
  dueDateInput.type = "date";
  dueDateInput.className = "edit-due-date-input";
  dueDateInput.value = todo.dueDate || "";

  const categorySelect = document.createElement("select");
  categorySelect.className = "edit-category-select";
  Object.entries(CATEGORY_LABELS).forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    if (value === todo.category) option.selected = true;
    categorySelect.appendChild(option);
  });

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "save-btn";
  saveBtn.textContent = "확인";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "cancel-btn";
  cancelBtn.textContent = "취소";

  const actions = document.createElement("div");
  actions.className = "todo-actions";
  actions.append(saveBtn, cancelBtn);

  li.append(titleInput, dueDateInput, categorySelect, actions);
  return li;
}

document.addEventListener("DOMContentLoaded", renderTodos);

// ===== 상호작용 계층 (Interaction Layer) =====

let editingId = null;
let activeFilter = getActiveFilter();
let categoryManuallySet = false; // 사용자가 카테고리를 직접 선택하면 자동 분류를 멈춘다.

const todoForm = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const todoDueDateInput = document.getElementById("todo-due-date-input");
const todoCategorySelect = document.getElementById("todo-category-select");
const categoryHintEl = document.getElementById("category-hint");
const todoListEl = document.getElementById("todo-list");
const toastContainer = document.getElementById("toast-container");
const categoryTabsEl = document.getElementById("category-tabs");

/**
 * 날짜 입력란에 값이 있으면 네이티브 텍스트를 보이게 하고,
 * 비어 있으면 "일정 설정" 안내 문구가 보이도록 상태를 갱신한다.
 */
function updateDueDatePlaceholder() {
  todoDueDateInput.classList.toggle("has-value", Boolean(todoDueDateInput.value));
}

todoDueDateInput.addEventListener("input", updateDueDatePlaceholder);
updateDueDatePlaceholder();

// 할 일 추가
todoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = todoInput.value.trim();
  if (!title) return;

  addTodo(title, todoCategorySelect.value, todoDueDateInput.value || null);
  todoInput.value = "";
  todoDueDateInput.value = "";
  updateDueDatePlaceholder();
  categoryManuallySet = false;
  clearCategoryHint();
  renderTodos();
  todoInput.focus();
});

// 제목 입력 중 키워드 기반 자동 카테고리 분류
todoInput.addEventListener("input", () => {
  const value = todoInput.value;

  if (!value.trim()) {
    categoryManuallySet = false;
    clearCategoryHint();
    return;
  }

  if (categoryManuallySet) return;

  const detected = detectCategoryFromTitle(value);
  if (detected) {
    todoCategorySelect.value = detected;
    showCategoryHint(detected);
  } else {
    clearCategoryHint();
  }
});

// 카테고리를 직접 선택하면 이후 자동 분류가 이를 덮어쓰지 않는다.
todoCategorySelect.addEventListener("change", () => {
  categoryManuallySet = true;
  clearCategoryHint();
});

// 체크박스 토글 / 수정 / 삭제 / 인라인 수정 저장·취소 (이벤트 위임)
todoListEl.addEventListener("click", (e) => {
  const li = e.target.closest(".todo-item");
  if (!li) return;
  const id = li.dataset.id;

  if (e.target.matches(".todo-checkbox")) {
    toggleComplete(id);
    renderTodos();
    return;
  }

  if (e.target.matches(".edit-btn")) {
    editingId = id;
    renderTodos();
    return;
  }

  if (e.target.matches(".delete-btn")) {
    const deletedTodo = getTodos().find((todo) => todo.id === id);
    if (!deletedTodo) return;
    deleteTodo(id);
    renderTodos();
    showUndoToast(deletedTodo);
    return;
  }

  if (e.target.matches(".save-btn")) {
    saveEdit(id);
    return;
  }

  if (e.target.matches(".cancel-btn")) {
    cancelEdit();
  }
});

// 카테고리 필터 탭
categoryTabsEl.addEventListener("click", (e) => {
  if (!e.target.matches(".tab-btn")) return;
  setActiveFilter(e.target.dataset.category);
});

updateActiveTabUI();

// 인라인 수정 중 Enter(저장) / Esc(취소)
todoListEl.addEventListener("keydown", (e) => {
  if (!e.target.matches(".edit-title-input")) return;
  const li = e.target.closest(".todo-item");
  if (!li) return;

  if (e.key === "Enter") {
    e.preventDefault();
    saveEdit(li.dataset.id);
  } else if (e.key === "Escape") {
    cancelEdit();
  }
});

/**
 * 인라인 수정 내용을 저장한다. title이 비어 있으면 저장하지 않는다.
 * @param {string} id
 */
function saveEdit(id) {
  const li = todoListEl.querySelector(`.todo-item[data-id="${id}"]`);
  if (!li) return;

  const title = li.querySelector(".edit-title-input").value.trim();
  if (!title) return;

  const category = li.querySelector(".edit-category-select").value;
  const dueDate = li.querySelector(".edit-due-date-input").value || null;
  updateTodo(id, { title, category, dueDate });
  editingId = null;
  renderTodos();
}

/**
 * 인라인 수정을 취소하고 원래 표시 모드로 되돌린다.
 */
function cancelEdit() {
  editingId = null;
  renderTodos();
}

/**
 * 카테고리 필터를 변경하고 저장한 뒤 탭 강조와 목록을 갱신한다.
 * @param {"all"|"work"|"personal"|"study"} filter
 */
function setActiveFilter(filter) {
  activeFilter = filter;
  saveActiveFilter(filter);
  updateActiveTabUI();
  renderTodos();
}

/**
 * activeFilter에 맞는 탭 버튼에 "active" 클래스를 표시한다.
 */
function updateActiveTabUI() {
  categoryTabsEl.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.category === activeFilter);
  });
}

/**
 * 자동 분류된 카테고리를 입력 폼 아래에 안내 문구로 표시한다.
 * @param {"work"|"personal"|"study"} category
 */
function showCategoryHint(category) {
  if (!categoryHintEl) return;
  categoryHintEl.textContent = `💡 "${CATEGORY_LABELS[category]}"(으)로 자동 분류됨`;
}

/**
 * 카테고리 자동 분류 안내 문구를 지운다.
 */
function clearCategoryHint() {
  if (!categoryHintEl) return;
  categoryHintEl.textContent = "";
}

/**
 * 삭제 직후 3초간 되돌리기 토스트를 표시한다.
 * @param {Object} deletedTodo
 */
function showUndoToast(deletedTodo) {
  const toast = document.createElement("div");
  toast.className = "toast";

  const message = document.createElement("span");
  message.textContent = "삭제됨";

  const undoBtn = document.createElement("button");
  undoBtn.type = "button";
  undoBtn.className = "toast-undo-btn";
  undoBtn.textContent = "되돌리기";

  toast.append(message, undoBtn);
  toastContainer.appendChild(toast);

  const timerId = setTimeout(() => toast.remove(), 3000);

  undoBtn.addEventListener("click", () => {
    clearTimeout(timerId);
    toast.remove();
    restoreTodo(deletedTodo);
    renderTodos();
  });
}

/**
 * 삭제됐던 할 일을 원래 데이터 그대로 되살린다.
 * @param {Object} todo
 */
function restoreTodo(todo) {
  const todos = getTodos();
  todos.push(todo);
  saveTodos(todos);
}

// ===== 콘솔 테스트를 위한 전역 노출 =====
window.getTodos = getTodos;
window.addTodo = addTodo;
window.updateTodo = updateTodo;
window.deleteTodo = deleteTodo;
window.toggleComplete = toggleComplete;
window.isOverdue = isOverdue;
window.renderTodos = renderTodos;
window.detectCategoryFromTitle = detectCategoryFromTitle;
