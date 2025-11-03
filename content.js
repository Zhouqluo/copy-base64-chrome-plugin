const cacheBase64 = new Map();

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.action === "compressAndCopy") {
    // 点击菜单时：计算压缩并复制
    const { url, quality } = msg;
    await compressAndCopy(url, quality);
    sendResponse({ success: true });
  }
  return true; // 保持消息通道打开
});

// 压缩并复制到剪贴板
async function compressAndCopy(url, quality) {
  try {
    const base64 = await fetchAndCompress(url, quality);
    
    // 复制到剪贴板
    await navigator.clipboard.writeText(base64);
    
    // 发送成功消息
    chrome.runtime.sendMessage({ 
      action: "copySuccess", 
      quality: quality.toFixed(1)
    }).catch(err => {
      console.error("发送成功消息失败:", err);
    });
  } catch (error) {
    console.error("压缩和复制失败:", error);
    
    chrome.runtime.sendMessage({ 
      action: "copyError", 
      error: error.message 
    }).catch(err => {
      console.error("发送错误消息失败:", err);
    });
  }
}

// 获取并压缩图片（核心逻辑）
async function fetchAndCompress(url, quality) {
  const key = `${url}_${quality}`;
  
  // 检查内存缓存
  if (cacheBase64.has(key)) {
    return cacheBase64.get(key);
  }

  try {
    // 获取图片
    const response = await fetch(url);
    const blob = await response.blob();
    
    // 加载图片
    const img = await loadImage(blob);
    
    // 创建 canvas 并压缩
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    
    // 转换为 base64
    const base64 = canvas.toDataURL("image/jpeg", quality);
    
    // 缓存到内存
    cacheBase64.set(key, base64);
    
    return base64;
  } catch (error) {
    console.error("压缩图片失败:", error);
    throw new Error(`压缩失败: ${error.message}`);
  }
}

// 加载图片
function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      resolve(img);
    };
    
    img.onerror = (error) => {
      reject(new Error("加载图片失败"));
    };
    
    img.src = URL.createObjectURL(blob);
  });
}