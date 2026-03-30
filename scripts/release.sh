#!/bin/bash
# 一键打包所有插件 + 更新 registry.json
# 用法: ./scripts/release.sh

set -e

PLUGINS_DIR="./plugins"
RELEASES_DIR="./releases"

cd "$(dirname "$0")/.."

mkdir -p "$RELEASES_DIR"

PACKAGED=0
SKIPPED=0

for dir in "$PLUGINS_DIR"/*/; do
  plugin_name=$(basename "$dir")
  # 跳过 _ 开头的模板目录
  [[ "$plugin_name" == _* ]] && continue

  if ./scripts/package.sh "$plugin_name"; then
    PACKAGED=$((PACKAGED + 1))
  else
    echo "⚠️  打包失败: $plugin_name"
    SKIPPED=$((SKIPPED + 1))
  fi
done

# 更新 registry.json 的 updated 时间
python3 -c "
import json, datetime
with open('registry.json', 'r+') as f:
    data = json.load(f)
    data['updated'] = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
    f.seek(0)
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.truncate()
"

echo ""
echo "🎉 打包完成! 成功: $PACKAGED, 跳过: $SKIPPED"
echo "📁 输出目录: $RELEASES_DIR/"
ls -lh "$RELEASES_DIR/"
