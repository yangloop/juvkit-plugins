/**
 * Plugin Template - 新插件开发模板
 *
 * 复制 _template/ 目录，修改 plugin.json 即可开始开发。
 *
 * 生命周期：onActivate(api) -> render(container) -> onDeactivate()
 * API 文档：window.juvkit.* （clipboard, storage, http, notification, dialog, window, log）
 * 共享 UI：使用 .jk-* 类名（.jk-btn, .jk-input, .jk-card 等）
 * 辅助函数：juvkit.helpers.* （copyToClipboard, showLoading, showError 等）
 */

let api = null;

// ============================================
// 生命周期
// ============================================

/**
 * 插件激活时调用
 * @param {object} juvkitApi - window.juvkit API 对象
 */
exports.onActivate = function (juvkitApi) {
  api = juvkitApi;
  api.log.info('Plugin activated');
};

/**
 * 渲染插件 UI
 * @param {HTMLElement} container - 插件内容容器
 */
exports.render = function (container) {
  // style.css 已自动加载，可直接使用 .jk-* 类名
  container.innerHTML = `
    <div class="jk-container">
      <div class="jk-header">
        <h2 class="jk-title">🔌 Plugin Template</h2>
      </div>

      <div class="jk-body">
        <p style="color: var(--text-secondary); margin-bottom: 16px;">
          这是一个新插件的起点。修改此文件开始开发。
        </p>

        <div class="jk-btn-group" style="margin-bottom: 16px;">
          <button class="jk-btn jk-btn-primary" id="btn-test">测试存储</button>
          <button class="jk-btn jk-btn-success" id="btn-copy">测试剪贴板</button>
          <button class="jk-btn jk-btn-secondary" id="btn-notify">测试通知</button>
        </div>

        <div class="jk-card" id="output">
          点击上方按钮测试功能...
        </div>
      </div>

      <div class="jk-footer">
        Plugin Template v1.0.0
      </div>
    </div>
  `;

  // 绑定事件
  const output = container.querySelector('#output');

  container.querySelector('#btn-test').addEventListener('click', async function () {
    try {
      await api.storage.set('test_key', { time: Date.now(), msg: 'Hello!' });
      const data = await api.storage.get('test_key');
      output.textContent = '存储测试成功: ' + JSON.stringify(data);
    } catch (err) {
      output.textContent = '存储测试失败: ' + err.message;
    }
  });

  container.querySelector('#btn-copy').addEventListener('click', async function () {
    try {
      await api.helpers.copyToClipboard('Hello from plugin! ' + new Date().toLocaleTimeString(), output);
    } catch (err) {
      output.textContent = '剪贴板测试失败: ' + err.message;
    }
  });

  container.querySelector('#btn-notify').addEventListener('click', async function () {
    try {
      await api.notification.show('Plugin Template', '通知测试成功！');
      output.textContent = '通知已发送！';
    } catch (err) {
      output.textContent = '通知测试失败: ' + err.message;
    }
  });
};

/**
 * 插件停用时调用，清理资源
 */
exports.onDeactivate = function () {
  api = null;
};
