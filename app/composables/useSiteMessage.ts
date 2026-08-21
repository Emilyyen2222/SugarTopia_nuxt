/**
 * 對應 vanilla 版本 site-enhancements.js 的 showSiteMessage()——右下角短暫
 * 出現的訊息提示（登入成功、錯誤訊息、demo 功能提示都共用這一個）。
 */
const message = () => useState<string>("site-message-text", () => "");
const visible = () => useState<boolean>("site-message-visible", () => false);

let hideTimer: ReturnType<typeof setTimeout> | undefined;

export function useSiteMessage() {
  function show(text: string) {
    message().value = text;
    visible().value = true;

    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      visible().value = false;
    }, 2600);
  }

  return { text: message(), visible: visible(), show };
}
