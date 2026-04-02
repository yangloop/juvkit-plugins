import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker&inline';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker&inline';
import { createReactPlugin } from '@juvkit/plugin-sdk/react';
import App from './App';

// 配置 Monaco 使用内联 worker（?worker&inline 强制将 worker 代码内联为 data URL）
self.MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'json') {
      return new jsonWorker();
    }
    return new editorWorker();
  },
};

// 使用本地 monaco-editor，不走 CDN
loader.config({ monaco });

createReactPlugin(App);
