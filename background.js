// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copyBase64",
    title: "复制图片 Base64",
    contexts: ["image"]
  });

  // 创建质量选项菜单（增加文本长度，使菜单更宽更好点击）
  for (let i = 10; i >= 1; i--) {
    const q = (i / 10).toFixed(1);
    chrome.contextMenus.create({
      id: `quality_${q}`,
      title: `质量 ${q}  `, // 增加宽度
      contexts: ["image"],
      parentId: "copyBase64"
    });
  }
});

// 点击菜单项
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info.srcUrl || !tab?.id) return;
  if (!info.menuItemId.startsWith("quality_")) return;

  const quality = parseFloat(info.menuItemId.split("_")[1]);
  
  // 发送消息给 content script，计算压缩并复制
  chrome.tabs.sendMessage(tab.id, {
    action: "compressAndCopy",
    url: info.srcUrl,
    quality
  }).catch(err => {
    // 处理错误（比如页面还没加载完成）
    console.error("发送消息失败:", err);
  });
});

// 接收 content script 的消息并处理
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "copySuccess") {
    // 显示成功通知
    const { quality } = msg;
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "复制成功",
      message: `质量 ${quality} 的 Base64 已复制到剪贴板`
    });
  } else if (msg.action === "copyError") {
    // 显示错误通知
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: "复制失败",
      message: msg.error || "压缩或复制过程中出现错误"
    });
  }
  return true;
});