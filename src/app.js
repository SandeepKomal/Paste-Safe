import { findSecrets, maskSegments, restoreSegments } from "./detect.js";
import { EXAMPLE } from "./example.js";

const $ = s => document.querySelector(s);
const esc = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const preview = v => {
  const one = v.replace(/\s+/g, " ");
  return one.length <= 10 ? one[0] + "•".repeat(Math.max(3, one.length - 1)) : one.slice(0, 4) + "••••" + one.slice(-3);
};

let result = { spans: [], items: [] };
const shown = new Set();
let safeText = "", restoredText = "";

function render() {
  const text = $("#input").value;
  result = findSecrets(text);
  for (const v of [...shown]) if (!result.items.some(i => i.value === v)) shown.delete(v);

  const segs = maskSegments(text, result.spans, shown);
  safeText = segs.map(s => s.text).join("");
  $("#safe").innerHTML = segs.map(s => s.placeholder ? `<span class="redact" title="${esc(s.placeholder)}">${esc(s.text)}</span>` : esc(s.text)).join("")
    || '<span class="hint">Your safe text appears here.</span>';

  const hidden = result.items.filter(i => !shown.has(i.value));
  $("#summary").textContent = result.items.length
    ? `${hidden.length} of ${result.items.length} value${result.items.length > 1 ? "s" : ""} hidden`
    : "";
  $("#items").innerHTML = result.items.length ? result.items.map((i, n) => `
    <label class="item${shown.has(i.value) ? " shown" : ""}">
      <input type="checkbox" id="hide-${n}" data-n="${n}" ${shown.has(i.value) ? "" : "checked"} aria-label="Hide ${esc(i.label)}">
      <code class="ph">${esc(i.placeholder)}</code>
      <span class="kind">${esc(i.label)}${i.count > 1 ? ` · ${i.count} times` : ""}</span>
      <code>${esc(preview(i.value))}</code>
    </label>`).join("") : '<div class="empty">Nothing that looks secret was found.</div>';
  renderAnswer();
}

function renderAnswer() {
  const answer = $("#answer").value;
  const active = result.items.filter(i => !shown.has(i.value));
  const segs = restoreSegments(answer, active);
  restoredText = segs.map(s => s.text).join("");
  const n = segs.filter(s => s.restored).length;
  $("#restored").innerHTML = segs.map(s => s.restored ? `<span class="restored" title="${esc(s.restored)}">${esc(s.text)}</span>` : esc(s.text)).join("")
    || '<span class="hint">Paste the AI\'s answer on the left.</span>';
  $("#restoreNote").textContent = answer ? `${n} label${n === 1 ? "" : "s"} turned back into your real values (highlighted).` : "Restored values are highlighted.";
}

function exampleAnswer() {
  const p = t => result.items.find(i => i.type === t && !shown.has(i.value))?.placeholder;
  const host = p("HOST"), ip = p("IP"), key = p("AWS_KEY"), pw = p("DB_PASSWORD") || p("SECRET");
  const lines = ["(Example answer, written the way an AI would reply to the safe text.)", ""];
  if (host && ip) lines.push(`The connection from ${ip} to ${host} is timing out on port 5432. Check that the database's security group allows inbound 5432 from ${ip}, and that both are in the same VPC.`, "");
  if (pw) lines.push(`Your database password ${pw} appears in plain text in the log and in .env. Move it to a secrets manager and rotate it.`, "");
  if (key) lines.push(`The AWS key ${key} was committed to .env. Deactivate it in IAM now, create a new one, and store it as a CI secret.`);
  if (lines.length === 2) lines.push("Paste a log with a hostname, IP or key on the left to see labels restored here.");
  $("#answer").value = lines.join("\n");
  renderAnswer();
}

async function copy(text, statusEl, okMsg, pre) {
  try {
    await navigator.clipboard.writeText(text);
    statusEl.textContent = okMsg;
  } catch {
    const r = document.createRange(); r.selectNodeContents(pre);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    statusEl.textContent = "Copy was blocked here. The text is selected: press Ctrl+C (Cmd+C on a Mac).";
  }
  clearTimeout(statusEl.t); statusEl.t = setTimeout(() => (statusEl.textContent = ""), 4000);
}

$("#input").addEventListener("input", render);
$("#answer").addEventListener("input", renderAnswer);
$("#items").addEventListener("change", e => {
  const i = result.items[e.target.dataset.n];
  if (!i) return;
  e.target.checked ? shown.delete(i.value) : shown.add(i.value);
  render();
});
$("#clearIn").addEventListener("click", () => { $("#input").value = ""; $("#answer").value = ""; render(); $("#input").focus(); });
$("#exampleAns").addEventListener("click", exampleAnswer);
$("#copySafe").addEventListener("click", () => copy(safeText, $("#copyStatus"), `Copied. ${result.items.length - shown.size} values hidden.`, $("#safe")));
$("#copyRestored").addEventListener("click", () => copy(restoredText, $("#copyStatus2"), "Copied the answer with your real values.", $("#restored")));

$("#input").value = EXAMPLE;
render();
exampleAnswer();
