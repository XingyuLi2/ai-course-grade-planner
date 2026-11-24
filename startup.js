// A classic script can explain a file:// launch before attempting ES modules.
(async function () {
  const element = id => document.getElementById(id);
  const disableNavigation = () => {
    element('nav-dashboard').disabled = true;
    element('nav-rules').disabled = true;
    if (element('nav-import')) element('nav-import').disabled = true;
  };
  if (location.protocol === 'file:') {
    element('startup-title').textContent = '请通过本地网址打开';
    element('startup-description').textContent = '你现在直接打开了 HTML 文件。浏览器会限制它的脚本，所以成绩区域无法加载。请点击下面的“打开课程 Demo”。';
    element('save-status').textContent = '当前是文件预览，请切换到本地网址';
    disableNavigation();
    return;
  }
  try {
    await import('./app.mjs');
    element('startup-panel').hidden = true;
  } catch (error) {
    element('startup-title').textContent = '页面没有成功加载';
    element('startup-description').textContent = '请刷新一次页面。如果仍未恢复，把下方错误信息发给开发者排查；不要清除已有课程记录。';
    element('save-status').textContent = '页面加载失败，尚未读取完成';
    element('startup-error').hidden = false;
    element('startup-error-detail').textContent = error && error.message ? error.message : String(error);
    disableNavigation();
  }
})();
