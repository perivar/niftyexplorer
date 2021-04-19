// config-overrides.js
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

module.exports = {
  webpack(config, env) {
    return config;
  },
  jest(config) {
    return config;
  },
  devServer(configFunction) {
    return (proxy, allowedHost) => {
      const config = configFunction(proxy, allowedHost);
      config.watchOptions.ignored = [path.resolve(__dirname, 'public', 'stored-images'), 'node_modules'];
      return config;
    };
  },
  paths(paths, env) {
    return paths;
  }
};
