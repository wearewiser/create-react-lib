const webpack = require('webpack');

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: process.env.npm_package_main.split('/').reverse()[0],
    libraryTarget: 'this'
  },
  target: 'node',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: ['ts-loader']
      }
    ]
  },
  plugins: [
    new webpack.BannerPlugin({ banner: "#!/usr/bin/env node", raw: true }),
  ],
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  stats: {
    warningsFilter: /^(?!CriticalDependenciesWarning$)/
  }
};

