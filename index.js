'use strict';
const chalk = require('chalk');
const sprintf = require('sprintf-js').sprintf;
const extRegex = require('ext-to-regex');
const summarizeCoverage = require('istanbul').utils.summarizeCoverage;

module.exports = (tradie, options) => {

  const thresholds = options.thresholds || {};

  const extensions = tradie.config.scripts.extensions;
  const scriptRegexp = extRegex(extensions);
  const testScriptRegexp = extRegex(extensions.map(extension => `.test${extension}`));

  console.log('tradie-plugin-coverage');

  if (tradie.context === 'test') {

    //configure webpack to
    tradie.on('test.webpack-config', config => {

      //configure `isparta-loader`
      config.isparta = {
        embedSource: true,
        noAutoWrap: true,
        babel: {}
      };

      const babelLoader = config.module.loaders.find(spec => spec.loader === 'babel');
      if (!babelLoader) {
        throw new Error('Loader `babel-loader` is not configured.');
      }

      //run `isparta-loader` only on source files
      config.module.loaders.push(Object.assign({}, babelLoader, {
        test: path => scriptRegexp.test(path) && !testScriptRegexp.test(path),
        loader: 'isparta'
      }));

      //modify `babel-loader` to only run on test files
      babelLoader.test = testScriptRegexp;

    });

    tradie.on('test.result', result => {
      const summary = summarizeCoverage(result.coverage);

      //TODO: write the report to disk

      //print a coverage statistic
      const printStat = (name, stat, threshold) => {
        let msg = sprintf('  %20s: %s%% %d/%d (%d skipped)', chalk.bold(name), chalk.bold(sprintf('%.2d', stat.pct)), stat.covered, stat.total, stat.skipped);
        if (threshold) {
          if (stat.pct < threshold) {
            msg = chalk.red.bold(msg);
          } else {
            msg = chalk.green(msg);
          }
        }
        console.log(msg);
      };

      //print a summary of the coverage information
      console.log('Coverage:');
      console.log();
      printStat('Lines', summary.lines, thresholds.lines);
      printStat('Statements', summary.statements, thresholds.statements);
      printStat('Functions', summary.functions, thresholds.functions);
      printStat('Branches', summary.branches, thresholds.branches);
      console.log();

      //check if a threshold is crossed and whether we should emit an error exit code
      if (thresholds) {
        const thresholdCrossed = summary.lines.pct < thresholds.lines
          || summary.statements.pct < thresholds.statements
          || summary.functions.pct < thresholds.functions
          || summary.branches.pct < thresholds.branches
        ;
        if (thresholdCrossed) {
          //trigger an error exit code
        }
      }

    });

  }

};
