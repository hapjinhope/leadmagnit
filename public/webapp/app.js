const tg = window.Telegram.WebApp;
tg.ready();

const initData = tg.initData || "";
const content = document.getElementById("content");
const btnGroups = document.getElementById("btn-groups");
const btnKeywords = document.getElementById("btn-keywords");

function setContent(html) {
  content.innerHTML = html;
}

async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-telegram-init-data": initData,
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }
  return response.json();
}

async function loadSettings() {
  return apiFetch("/api/user/settings");
}

function renderKeywordItem(keyword, onRemove) {
  const div = document.createElement("div");
  div.className = "list-item";
  div.innerHTML = `<span>${keyword}</span>`;
  const btn = document.createElement("button");
  btn.className = "small-btn";
  btn.textContent = "Удалить";
  btn.onclick = () => onRemove(keyword);
  div.appendChild(btn);
  return div;
}

async function renderKeywordsView() {
  setContent("Загрузка...");
  try {
    const data = await loadSettings();
    const container = document.createElement("div");

    const list = document.createElement("div");
    list.className = "list";
    if (!data.keywords.length) {
      list.innerHTML = "<p>Ключевые слова не заданы.</p>";
    } else {
      data.keywords.forEach((k) => list.appendChild(renderKeywordItem(k, handleRemove)));
    }

    const inputRow = document.createElement("div");
    inputRow.className = "input-row";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Новое ключевое слово";
    const addBtn = document.createElement("button");
    addBtn.className = "save-btn";
    addBtn.textContent = "Добавить";

    addBtn.onclick = async () => {
      const value = input.value.trim().toLowerCase();
      if (!value) return;
      const next = Array.from(new Set([...data.keywords, value]));
      await apiFetch("/api/user/keywords", {
        method: "POST",
        body: JSON.stringify({ keywords: next }),
      });
      renderKeywordsView();
    };

    inputRow.appendChild(input);
    inputRow.appendChild(addBtn);

    container.appendChild(document.createElement("div")).innerHTML = "<strong>Ключевые слова:</strong>";
    container.appendChild(list);
    container.appendChild(inputRow);

    const status = document.createElement("div");
    status.className = "status";
    container.appendChild(status);

    async function handleRemove(keyword) {
      const next = data.keywords.filter((k) => k !== keyword);
      await apiFetch("/api/user/keywords", {
        method: "POST",
        body: JSON.stringify({ keywords: next }),
      });
      renderKeywordsView();
    }

    setContent("");
    content.appendChild(container);
  } catch (err) {
    setContent(`<p class="error">Ошибка: ${err.message}</p>`);
  }
}

async function renderGroupsView() {
  setContent("Загрузка...");
  try {
    const settings = await loadSettings();
    const container = document.createElement("div");
    container.innerHTML = `<div><strong>Текущие группы:</strong></div>`;

    const list = document.createElement("div");
    list.className = "list";
    if (!settings.groups.length) {
      list.innerHTML = "<p>Группы не выбраны.</p>";
    } else {
      settings.groups.forEach((g) => {
        const item = document.createElement("div");
        item.className = "list-item";
        item.textContent = g;
        list.appendChild(item);
      });
    }
    container.appendChild(list);

    const editBtn = document.createElement("button");
    editBtn.className = "action-btn";
    editBtn.textContent = "Редактировать группы";
    editBtn.onclick = () => renderGroupEditor(settings.groups);
    container.appendChild(editBtn);

    setContent("");
    content.appendChild(container);
  } catch (err) {
    setContent(`<p class="error">Ошибка: ${err.message}</p>`);
  }
}

async function renderGroupEditor(selectedGroups) {
  setContent("Загрузка...");
  try {
    const available = await apiFetch("/api/groups/available");
    const container = document.createElement("div");
    container.innerHTML = `<div><strong>Выберите группы для мониторинга:</strong></div>`;

    const checkboxList = document.createElement("div");
    checkboxList.className = "checkbox-list";

    available.groups.forEach((g) => {
      const item = document.createElement("label");
      item.className = "checkbox-item";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = g.id;
      input.checked = selectedGroups.includes(g.id);
      const title = document.createElement("span");
      title.textContent = `${g.title} (${g.id})`;
      item.appendChild(input);
      item.appendChild(title);
      checkboxList.appendChild(item);
    });

    const saveBtn = document.createElement("button");
    saveBtn.className = "save-btn";
    saveBtn.textContent = "Сохранить";
    saveBtn.onclick = async () => {
      const checked = Array.from(checkboxList.querySelectorAll("input[type=checkbox]"))
        .filter((el) => el.checked)
        .map((el) => el.value);
      await apiFetch("/api/user/groups", {
        method: "POST",
        body: JSON.stringify({ groups: checked }),
      });
      renderGroupsView();
    };

    container.appendChild(checkboxList);
    container.appendChild(saveBtn);
    setContent("");
    content.appendChild(container);
  } catch (err) {
    setContent(`<p class="error">Ошибка: ${err.message}</p>`);
  }
}

function renderWelcome() {
  setContent(`<p>Откройте одну из секций, чтобы настроить мониторинг.</p>`);
}

btnGroups.onclick = () => renderGroupsView();
btnKeywords.onclick = () => renderKeywordsView();

renderWelcome();
