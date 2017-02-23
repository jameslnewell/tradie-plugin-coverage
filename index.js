'use strict';
const path = require('path');
const webpack = require('webpack');
const chalk = require('chalk');
const sprintf = require('sprintf-js').sprintf;
const extRegex = require('ext-to-regex');
const extend = require('extend');

const libCoverage = require('istanbul-lib-coverage');
const libReport = require('istanbul-lib-report');
const reports = require('istanbul-reports');

function summarizeCoverage(coverage) {
  const map = libCoverage.createCoverageMap(coverage);
  const summary = libCoverage.createCoverageSummary();

  map.files().forEach(function (f) {
    const fc = map.fileCoverageFor(f);
    const fs = fc.toSummary();
    summary.merge(fs);
  });

  return summary;
}

/**
 * @param {object} webpackConfig
 * @param {object} extensions
 */
function modifyWebpackConfigToInstrumentScripts(webpackConfig, extensions) {
  const scriptRegexp = extRegex(extensions);
  const testScriptRegexp = extRegex(extensions.map(extension => `.test${extension}`));

  //find the babel loader
  const jsRule = webpackConfig.module.rules.find(rule => rule.use && rule.use.loader  === 'babel-loader');
  if (!jsRule) {
    throw new Error('Loader `babel-loader` is not configured.');
  }

  //run babel presets/plugins on test files
  webpackConfig.module.rules.push(extend(true, {}, jsRule, {
    test: path => testScriptRegexp.test(path)
  }));

  // //run babel presets/plugins + `babel-plugin-istanbul` on source files
  jsRule.test = path => scriptRegexp.test(path) && !testScriptRegexp.test(path);
  jsRule.use.options.plugins = jsRule.use.options.plugins ? [].concat('istanbul', jsRule.use.options.plugins) : ['istanbul'];

}

function writeCoverageReports(coverage, reportTypes, dir) {
  const map = libCoverage.createCoverageMap(coverage);
  const context = libReport.createContext({
    dir: dir,
    // watermarks: this.config.watermarks
  });

  const tree = libReport.summarizers.pkg(map);

  reportTypes.forEach(reportType => tree.visit(reports.create(reportType), context));

}

function printCoverageSummary(summary, thresholds) {

  //print a single coverage statistic
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

  //print the summary of all the coverage information
  console.log('Coverage:');
  console.log();
  printStat('Lines', summary.lines, thresholds.lines);
  printStat('Statements', summary.statements, thresholds.statements);
  printStat('Functions', summary.functions, thresholds.functions);
  printStat('Branches', summary.branches, thresholds.branches);
  console.log();

}

function isCoverageLowerThanTheThreshold(summary, thresholds) {

  if (!summary) {
    return false;
  }

  //check if a threshold is crossed and whether we should emit an error exit code
  if (thresholds) {
    const thresholdIsLower = summary.lines.pct < thresholds.lines
        || summary.statements.pct < thresholds.statements
        || summary.functions.pct < thresholds.functions
        || summary.branches.pct < thresholds.branches
      ;
    return thresholdIsLower;
  } else {
    return false;
  }

}

module.exports = options => tradie => {
  const reportTypes = options.reports ? [].concat(options.reports) : [];
  const thresholds = options.thresholds || {};

  //only calculate coverage when we're testing
  if (tradie.command !== 'test') {
    return;
  }

  let summary = null;

  tradie.once('test.webpack.config', webpackConfig => modifyWebpackConfigToInstrumentScripts(webpackConfig, tradie.script.extensions));

  tradie.once('test.result', result => {
    const coverage = result.coverage;

    if (!coverage) {
      console.log();
      console.error(chalk.red('Unable to retrieve coverage information :('));
      console.log();
      return;
    }

    summary = summarizeCoverage(coverage);
    printCoverageSummary(summary, thresholds);
    writeCoverageReports(coverage, reportTypes, path.join(tradie.tmp, 'coverage'));

  });

  tradie.once('exit', context => {

    //force the command to exit with an error code if the coverage is less than the threshold
    const lowerThanTheThreshold = isCoverageLowerThanTheThreshold(summary, thresholds);
    if (lowerThanTheThreshold) {
      context.exitCode = -1;
    }

  });

};
