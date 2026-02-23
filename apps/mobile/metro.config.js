const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro配置
 * 优化打包和开发服务器性能
 */
const config = {
  // 缓存配置
  cacheStores: [
    {
      get: (key) => {
        // 自定义缓存获取
        return null;
      },
      set: (key, value) => {
        // 自定义缓存设置
      },
    },
  ],

  // 转换器配置
  transformer: {
    // 启用Hermes引擎
    hermesParser: true,
    // 优化Babel转换
    babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
    // 最小化配置
    minifierConfig: {
      keep_classnames: true,
      keep_fnames: true,
      mangle: {
        keep_classnames: true,
        keep_fnames: true,
      },
    },
  },

  // 服务器配置
  server: {
    // 增强错误报告
    enhanceMiddleware: (middleware) => middleware,
  },

  // 解析配置
  resolver: {
    // 平台扩展
    platforms: ['ios', 'android'],
    // 黑名单（不打包的文件）
    blacklistRE: /^(.*\/__tests__\/.*|.*\.test\.(js|ts|tsx)|.*\.spec\.(js|ts|tsx))$/,
    // 额外的Node模块路径
    nodeModulesPaths: [],
  },

  // 性能优化配置
  maxWorkers: 2, // 限制最大工作线程数
  resetCache: false, // 不重置缓存

  // 观察器配置（开发模式）
  watchFolders: [],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
