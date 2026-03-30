#!/bin/bash
# 打包单个插件为 zip
# 用法: ./scripts/package.sh <plugin-name>
# 示例: ./scripts/package.sh hello-plugin

set -e

PLUGIN_NAME=$1
PLUGINS_DIR="./plugins"
RELEASES_DIR="./releases"

if [ -z "$PLUGIN_NAME" ]; then
  echo "Usage: $0 <plugin-name>"
  echo "示例: $0 hello-plugin"
  exit 1
fi

PLUGIN_DIR="$PLUGINS_DIR/$PLUGIN_NAME"

if [ ! -d "$PLUGIN_DIR" ]; then
  echo "❌ 插件目录不存在: $PLUGIN_DIR"
  exit 1
fi

if [ ! -f "$PLUGIN_DIR/plugin.json" ]; then
  echo "❌ plugin.json 未找到: $PLUGIN_DIR/plugin.json"
  exit 1
fi

mkdir -p "$RELEASES_DIR"
ZIP_PATH="$RELEASES_DIR/$PLUGIN_NAME.zip"

# 删除旧的 zip
rm -f "$ZIP_PATH"

# 读取 runtime 类型
RUNTIME=$(python3 -c "import json; print(json.load(open('$PLUGIN_DIR/plugin.json')).get('runtime', 'runtime'))" 2>/dev/null || echo "runtime")

if [ "$RUNTIME" = "prebuilt" ]; then
  # Prebuilt 插件: 只打包 plugin.json + dist/
  if [ ! -d "$PLUGIN_DIR/dist" ]; then
    echo "❌ dist/ 目录不存在 (prebuilt 插件需要先构建): $PLUGIN_DIR/dist"
    exit 1
  fi
  cd "$PLUGIN_DIR"
  zip -r "$OLDPWD/$ZIP_PATH" plugin.json dist/
  cd "$OLDPWD"
  echo "📦 Prebuilt: $PLUGIN_NAME -> $ZIP_PATH"
else
  # Runtime 插件: 打包所有文件（排除隐藏文件和 node_modules）
  cd "$PLUGIN_DIR"
  zip -r "$OLDPWD/$ZIP_PATH" . -x ".*" -x "node_modules/*"
  cd "$OLDPWD"
  echo "📦 Runtime: $PLUGIN_NAME -> $ZIP_PATH"
fi

# 验证 zip 内容
FILE_COUNT=$(unzip -l "$ZIP_PATH" | tail -1 | awk '{print $2}')
echo "✅ 打包完成: $ZIP_PATH ($FILE_COUNT 个文件)"
