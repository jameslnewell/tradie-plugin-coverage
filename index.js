const extRegex = require('ext-to-regex');

module.exports = tradie => {

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

    tradie.on('test.bundle', bundle => {

      var re = /__coverage__='([^;]*)';(\r\n?|\n)/gi,
        match;

      // capture all the matches, there might be multiple
      while (match = re.exec(bundle.bundle.toString())) {
        // match[1] contains JSON.stringify(__coverage__)
        console.log(JSON.parse(match[1]));
      }

    });

  }

};
