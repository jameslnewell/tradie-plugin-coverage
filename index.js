'use strict';
const path = require('path');
const chalk = require('chalk');
const sprintf = require('sprintf-js').sprintf;
const extRegex = require('ext-to-regex');

const Istanbul = require('istanbul');
const summarizeCoverage = Istanbul.utils.summarizeCoverage;
const Report = Istanbul.Report;
const Collector = Istanbul.Collector;

/**
 * @param {object} webpackConfig
 * @param {object} extensions
 */
function modifyWebpackConfigToInstrumentScripts(webpackConfig, extensions) {
  const scriptRegexp = extRegex(extensions);
  const testScriptRegexp = extRegex(extensions.map(extension => `.test${extension}`));

  //configure `isparta-loader`
  webpackConfig.isparta = {
    embedSource: true,
    noAutoWrap: true,
    babel: {}
  };

  const babelLoader = webpackConfig.module.loaders.find(spec => spec.loader === 'babel-loader');
  if (!babelLoader) {
    throw new Error('Loader `babel-loader` is not configured.');
  }

  //run `isparta-loader` only on source files
  webpackConfig.module.loaders.push(Object.assign({}, babelLoader, {
    test: path => scriptRegexp.test(path) && !testScriptRegexp.test(path),
    loader: 'babel-istanbul-loader'
  }));

  //modify `babel-loader` to only run on test files
  babelLoader.test = testScriptRegexp;

}

function writeCoverageReports(coverage, reports, dir) {
  const collector = new Collector();

  collector.add(coverage);

  //report.on('done', () => {
  //  console.log('done');
  //});

  reports.forEach(type => {
    const report = Report.create(type, {dir: dir});
    report.writeReport(collector, true);// true => synchronous for simplicity now
  });

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

module.exports = (tradie, options) => {
  const reports = options.reports ? [].concat(options.reports) : [];
  const thresholds = options.thresholds || {};

  tradie.on('command.started', context => {
    let summary = null;

    //only show coverage summary on the test command
    if (context.name !== 'test') {
      return;
    }

    tradie.once('test.webpack.config', webpackConfig => modifyWebpackConfigToInstrumentScripts(webpackConfig, tradie.config.scripts.extensions));

    tradie.once('test.result', result => {
      const coverage = result.coverage;

      //TODO: check coverage exists (otherwise error)
      summary = summarizeCoverage(coverage);

      printCoverageSummary(summary, thresholds);

      writeCoverageReports(coverage, reports, path.join(tradie.config.tmp, 'coverage'));

    });

    tradie.once('command.finished', context => {

      //force the command to exit with an error code if the coverage is less than the threshold
      const lowerThanTheThreshold = isCoverageLowerThanTheThreshold(summary, thresholds);
      if (lowerThanTheThreshold) {
        context.exitCode = -1;
      }

    });

  });

};
