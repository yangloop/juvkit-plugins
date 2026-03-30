/**
 * Hello Plugin - 示例插件
 *
 * 展示独立窗口架构和 window.juvkit API 的使用方式
 */

let api = null;

exports.onActivate = function (juvkitApi) {
  api = juvkitApi;
  api.log.info('Hello Plugin activated');

  // 写入存储
  api.storage.set('activated_at', new Date().toISOString());

  // 显示通知
  api.notification.show('Hello Plugin', '插件已激活！');
};

exports.render = function (container) {
  container.innerHTML = `
    <div class="hello-plugin">
      <h1>👋 Hello Plugin</h1>
      <p class="desc">这是一个使用新架构的外部插件示例</p>

      <div class="jk-btn-group">
        <button class="jk-btn jk-btn-primary" id="btn-storage">测试存储</button>
        <button class="jk-btn jk-btn-success" id="btn-clipboard">测试剪贴板</button>
        <button class="jk-btn jk-btn-secondary" id="btn-notify">测试通知</button>
      </div>

      <div id="output">点击上方按钮测试功能...</div>

      <div class="close-section">
        <button class="jk-btn jk-btn-outline" id="btn-close">关闭窗口</button>
      </div>
    </div>
  `;

  var output = container.querySelector('#output');

  // 存储测试
  container.querySelector('#btn-storage').addEventListener('click', async function () {
    try {
      await api.storage.set('test_key', { time: Date.now(), message: 'Hello from plugin!' });
      var data = await api.storage.get('test_key');
      output.textContent = '存储测试成功！数据: ' + JSON.stringify(data, null, 2);
    } catch (err) {
      output.textContent = '存储测试失败: ' + err.message;
    }
  });

  // 剪贴板测试
  container.querySelector('#btn-clipboard').addEventListener('click', async function () {
    try {
      var text = 'Hello from Hello Plugin! ' + new Date().toLocaleTimeString();
      await api.clipboard.writeText(text);
      output.textContent = '已写入剪贴板: ' + text;
    } catch (err) {
      output.textContent = '剪贴板测试失败: ' + err.message;
    }
  });

  // 通知测试
  container.querySelector('#btn-notify').addEventListener('click', async function () {
    try {
      await api.notification.show('Hello Plugin', '这是一条测试通知！');
      output.textContent = '通知已发送！';
    } catch (err) {
      output.textContent = '通知测试失败: ' + err.message;
    }
  });

  // 关闭窗口
  container.querySelector('#btn-close').addEventListener('click', async function () {
    await api.window.close();
  });
};

exports.onDeactivate = function () {
  api = null;
};
