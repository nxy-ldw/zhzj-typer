/* 智慧职教逐字输入备用脚本（浏览器控制台版）
 *
 * 用法：
 *   1. F12 打开开发者工具，切到 Console；
 *   2. 粘贴本文件全部内容并回车；
 *   3. 先点击考试页面的答题框，再执行：zhzjPrompt()
 *
 * 它不派发 paste 事件，而是逐字符写入输入框并派发 input 事件。
 * 主方案请优先使用同目录的桌面版 zhzj-typer.exe。
 */
(() => {
  if (window.__zhzjTyperInstalled) {
    console.log("zhzj-typer 已经加载，直接执行 zhzjPrompt() 即可。");
    return;
  }
  window.__zhzjTyperInstalled = true;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const TEXT_INPUT_TYPES = new Set([
    "",
    "text",
    "search",
    "url",
    "tel",
    "email",
    "password",
  ]);

  function isEditable(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.isContentEditable) return true;
    if (el.tagName === "TEXTAREA") return !el.disabled && !el.readOnly;
    if (el.tagName === "INPUT") {
      const type = String(el.type || "text").toLowerCase();
      return TEXT_INPUT_TYPES.has(type) && !el.disabled && !el.readOnly;
    }
    return false;
  }

  function collectDocuments(doc = document, out = []) {
    out.push(doc);
    for (const frame of doc.querySelectorAll("iframe")) {
      try {
        if (frame.contentDocument) collectDocuments(frame.contentDocument, out);
      } catch (_) {
        /* 跨域 iframe 无法访问，跳过 */
      }
    }
    return out;
  }

  function visibleArea(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return 0;
    try {
      const style = el.ownerDocument.defaultView.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return 0;
    } catch (_) {}
    return rect.width * rect.height;
  }

  function activeEditable() {
    let doc = document;
    let el = doc.activeElement;
    while (el && el.tagName === "IFRAME") {
      try {
        doc = el.contentDocument;
        if (!doc) break;
        el = doc.activeElement;
      } catch (_) {
        break;
      }
    }
    return isEditable(el) ? el : null;
  }

  function bestEditable() {
    let best = null;
    let bestArea = 0;
    for (const doc of collectDocuments()) {
      for (const el of doc.querySelectorAll(
        'textarea, input, [contenteditable="true"], [contenteditable=""]'
      )) {
        if (!isEditable(el)) continue;
        const area = visibleArea(el);
        if (area > bestArea) {
          best = el;
          bestArea = area;
        }
      }
    }
    return best;
  }

  function resolveTarget() {
    return activeEditable() || bestEditable();
  }

  function setNativeValue(el, value) {
    const proto =
      el.tagName === "TEXTAREA"
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
  }

  function fireInput(el, type, data, inputType) {
    let event;
    if (type === "beforeinput" || type === "input") {
      event = new InputEvent(type, {
        bubbles: true,
        cancelable: type === "beforeinput",
        inputType: inputType || "insertText",
        data: data == null ? null : data,
      });
    } else {
      event = new Event(type, { bubbles: true });
    }
    el.dispatchEvent(event);
    return event;
  }

  function insertPlain(el, ch) {
    if (el.tagName === "INPUT" && (ch === "\n" || ch === "\r")) return;
    const start =
      typeof el.selectionStart === "number" ? el.selectionStart : el.value.length;
    const end =
      typeof el.selectionEnd === "number" ? el.selectionEnd : start;
    const next = el.value.slice(0, start) + ch + el.value.slice(end);
    // 即使页面取消了 beforeinput，也继续写入，避免被拦截。
    fireInput(el, "beforeinput", ch, "insertText");
    setNativeValue(el, next);
    try {
      el.selectionStart = el.selectionEnd = start + ch.length;
    } catch (_) {}
    fireInput(el, "input", ch, "insertText");
  }

  function insertRich(el, ch) {
    const doc = el.ownerDocument;
    el.focus();
    if (ch === "\n") {
      const before = el.innerHTML;
      let ok = false;
      try {
        ok = doc.execCommand("insertParagraph", false, null);
      } catch (_) {}
      if (!ok || el.innerHTML === before) {
        try {
          doc.execCommand("insertLineBreak", false, null);
        } catch (_) {}
      }
      return;
    }

    let ok = false;
    try {
      ok = doc.execCommand("insertText", false, ch);
    } catch (_) {}
    if (ok) return;

    const selection = doc.getSelection();
    if (!selection) return;
    if (!selection.rangeCount) {
      const range = doc.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = doc.createTextNode(ch);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    fireInput(el, "input", ch, "insertText");
  }

  async function typeInto(el, text, delayMs) {
    if (!isEditable(el)) throw new Error("目标不是可编辑的答题框。");
    el.focus();
    const chars = Array.from(String(text));
    let done = 0;
    for (const ch of chars) {
      if (el.isContentEditable) insertRich(el, ch);
      else insertPlain(el, ch);
      done += 1;
      if (done % 25 === 0 || done === chars.length) {
        console.log(`zhzj-typer: ${done}/${chars.length}`);
      }
      await sleep(delayMs + Math.random() * delayMs * 0.6);
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
    console.log("zhzj-typer: 输入完成。");
    return el;
  }

  async function zhzjType(text, delayMs = 25) {
    const value = String(text == null ? "" : text);
    if (!value) throw new Error("文本为空。");
    const el = resolveTarget();
    if (!el) {
      throw new Error("没有找到答题框。请先点击考试页面的答题框，再执行。");
    }
    console.log("zhzj-typer 目标：", el);
    return typeInto(el, value, Math.max(5, Number(delayMs) || 25));
  }

  async function zhzjPrompt(delayMs = 25) {
    const text = window.prompt("粘贴要逐字输入的答案：");
    if (text == null || text === "") return;
    return zhzjType(text, delayMs);
  }

  async function zhzjClipboard(delayMs = 25) {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      throw new Error("浏览器不支持读取剪贴板，请改用 zhzjPrompt()。");
    }
    const text = await navigator.clipboard.readText();
    return zhzjType(text, delayMs);
  }

  window.zhzjType = zhzjType;
  window.zhzjPrompt = zhzjPrompt;
  window.zhzjClipboard = zhzjClipboard;

  console.log(
    "%c智慧职教逐字输入脚本已加载",
    "color:#2563eb;font-weight:bold;font-size:14px"
  );
  console.log("先点击答题框，然后执行：zhzjPrompt()");
})();
