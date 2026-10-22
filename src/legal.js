// @ts-check
import { eraseAll } from "./ui/store.js";
import { req } from "./ui/dom.js";
import { refuseFrames } from "./ui/frame.js";

refuseFrames();

const button = req("#eraseAll", HTMLButtonElement);
const status = req("#eraseStatus", HTMLElement);
button.addEventListener("click", () => {
  eraseAll();
  status.textContent = "Erased. Nothing from Paste-Safe is saved in this browser now.";
});
