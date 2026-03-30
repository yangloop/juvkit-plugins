/**
 * Weather Plugin — 天气查询
 *
 * 三文件分离架构：
 *   template.html — UI 结构（含 <template> 卡片模板，沙箱自动注入）
 *   style.css     — 样式（沙箱自动加载）
 *   index.js      — 纯逻辑（本文件，零 HTML 字符串）
 *
 * render() 流程：沙箱注入 template.html → render() 绑定事件
 * 卡片渲染：clone <template> → textContent 赋值 → append
 */

let api = null;
let favorites = [];
let currentCity = null;

// ============================================
// 生命周期
// ============================================

exports.onActivate = function (juvkitApi) {
  api = juvkitApi;
  api.log.info('Weather plugin activated');

  api.storage.get('favorites', []).then(function (list) {
    favorites = Array.isArray(list) ? list : [];
  }).catch(function () {});
};

exports.render = function (container) {
  var input   = container.querySelector('#wq-input');
  var btn     = container.querySelector('#wq-search');
  var result  = container.querySelector('#wq-result');
  var favList = container.querySelector('#wq-favorites');
  var tplCard = container.querySelector('#tpl-card');
  var tplDetail = container.querySelector('#tpl-detail');

  // 搜索事件
  btn.addEventListener('click', function () { doSearch(input.value.trim()); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') doSearch(input.value.trim());
  });

  renderFavorites();

  // ==========================================
  // 搜索
  // ==========================================

  async function doSearch(city) {
    if (!city) return;
    currentCity = city;
    api.helpers.showLoading(result, '查询中...');

    try {
      var w = await fetchWeather(city);
      renderCard(w, city);
      api.log.info('Weather fetched: ' + city);
    } catch (err) {
      api.helpers.showError(result, '查询失败: ' + err.message);
      api.log.error('Weather error: ' + err.message);
    }
  }

  // ==========================================
  // 天气 API
  // ==========================================

  async function fetchWeather(city) {
    var resp = await api.http.fetch(
      'https://wttr.in/' + encodeURIComponent(city) + '?format=j1'
    );
    if (!resp.ok) throw new Error('HTTP ' + resp.status);

    var data = await resp.json();
    var cur  = data.current_condition[0];
    var area = data.nearest_area[0];

    return {
      city:       area.areaName[0].value,
      country:    area.country[0].value,
      temp:       cur.temp_C + '°C',
      feelsLike:  cur.FeelsLikeC + '°C',
      humidity:   cur.humidity + '%',
      wind:       cur.windspeedKmph + ' km/h ' + cur.winddir16Point,
      desc:       cur.weatherDesc[0].value,
      visibility: cur.visibility + ' km',
      pressure:   cur.pressure + ' hPa',
      uv:         cur.uvIndex,
    };
  }

  // ==========================================
  // 渲染 — 纯 DOM 操作，零 HTML 字符串
  // ==========================================

  function renderCard(w, queryCity) {
    var isFav = favorites.indexOf(queryCity.toLowerCase()) >= 0;

    // 克隆卡片模板
    var fragment = tplCard.content.cloneNode(true);

    // 填充文本
    fragment.querySelector('.weather-city').textContent    = w.city;
    fragment.querySelector('.weather-country').textContent = w.country;
    fragment.querySelector('.weather-temp').textContent    = w.temp;
    fragment.querySelector('.weather-desc').textContent    = w.desc;

    // 收藏按钮状态
    var favBtn = fragment.querySelector('.weather-fav-btn');
    favBtn.textContent = isFav ? '⭐' : '☆';
    favBtn.title = isFav ? '取消收藏' : '收藏';

    // 详情网格 — 克隆 detail 模板逐行填充
    var detailsEl = fragment.querySelector('.weather-details');
    var detailData = [
      ['体感',   w.feelsLike],
      ['湿度',   w.humidity],
      ['风速',   w.wind],
      ['能见度', w.visibility],
      ['气压',   w.pressure],
      ['UV',     w.uv],
    ];

    detailData.forEach(function (item) {
      var row = tplDetail.content.cloneNode(true);
      row.querySelector('.jk-detail-label').textContent = item[0];
      row.querySelector('.jk-detail-value').textContent = item[1];
      detailsEl.appendChild(row);
    });

    // 输出
    result.innerHTML = '';
    result.appendChild(fragment);

    // 绑定收藏按钮
    result.querySelector('#wq-fav').addEventListener('click', function () {
      toggleFavorite(queryCity);
    });
  }

  // ==========================================
  // 收藏
  // ==========================================

  async function toggleFavorite(city) {
    var key = city.toLowerCase();
    var idx = favorites.indexOf(key);
    if (idx >= 0) {
      favorites.splice(idx, 1);
    } else {
      favorites.push(key);
    }

    await api.storage.set('favorites', favorites);
    renderFavorites();
    if (currentCity) doSearch(currentCity);
    api.log.info('Favorites: ' + JSON.stringify(favorites));
  }

  function renderFavorites() {
    if (favorites.length === 0) {
      favList.textContent = '';
      var empty = document.createElement('span');
      empty.className = 'jk-empty';
      empty.style.fontSize = '12px';
      empty.textContent = '暂无收藏';
      favList.appendChild(empty);
      return;
    }

    favList.textContent = '';
    favorites.forEach(function (city) {
      var tag = document.createElement('button');
      tag.className = 'jk-tag';
      tag.textContent = city;
      tag.addEventListener('click', function () {
        input.value = city;
        doSearch(city);
      });
      favList.appendChild(tag);
    });
  }
};

exports.onDeactivate = function () {
  api = null;
  favorites = [];
  currentCity = null;
};
