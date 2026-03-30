/**
 * Test Plugin - Webview 沙箱功能测试
 *
 * 测试 juvkit API 的各项功能：存储、剪贴板、通知
 */

let api = null;

exports.onActivate = function (juvkitApi) {
  api = juvkitApi;
  api.log.info('Test Plugin activated');
};

exports.render = function (container) {
  container.innerHTML = `
    <div class="test-plugin" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
      <div class="icon">🎉</div>
      <h1>插件加载成功!</h1>
      <p class="subtitle">Test Plugin 已成功在 Webview 沙箱中运行</p>
      <div class="results">
        <div class="results-header">📊 功能测试结果</div>
        <div id="status-init">⏳ 初始化中...</div>
      </div>
      <div class="meta">ID: test-plugin | v1.0.0</div>
    </div>
  `;

  runTests();
};

async function runTests() {
  var statusEl = document.getElementById('status-init');
  var resultsEl = statusEl ? statusEl.parentElement : null;

  function addResult(icon, text) {
    if (resultsEl) {
      var div = document.createElement('div');
      div.textContent = icon + ' ' + text;
      resultsEl.appendChild(div);
    }
  }

  if (!api) {
    statusEl.textContent = '❌ juvkit API 未找到';
    return;
  }

  statusEl.textContent = '✅ API 已连接';

  // 测试 1: 存储
  try {
    await api.storage.set('test-key', { message: 'Hello', time: Date.now() });
    var data = await api.storage.get('test-key');
    addResult('💾', '存储: ' + (data && data.message ? data.message : 'OK'));
  } catch (e) {
    addResult('❌', '存储: ' + e.message);
  }

  // 测试 2: 剪贴板
  try {
    await api.clipboard.writeText('Hello from Test Plugin!');
    var text = await api.clipboard.readText();
    addResult('📋', '剪贴板: ' + (text || '').substring(0, 15) + '...');
  } catch (e) {
    addResult('❌', '剪贴板: ' + e.message);
  }

  // 测试 3: 通知权限
  try {
    var hasPermission = await api.notification.getPermission();
    addResult('🔔', '通知权限: ' + (hasPermission ? '已授权' : '未授权'));
    if (hasPermission) {
      await api.notification.show('测试通知', 'Test Plugin 运行成功!');
    }
  } catch (e) {
    addResult('❌', '通知: ' + e.message);
  }

  addResult('✅', '所有测试完成!');
}

exports.onDeactivate = function () {
  api = null;
};
