
module.exports = tradie => {

  console.log('tradie-plugin-coverage');

  if (tradie.context === 'test') {

    tradie.on('test.webpack-config', config => {

      //configure `isparta-loader`
      config.isparta = {
        embedSource: true,
        noAutoWrap: true,
        babel: {}
      };

      //find and remove the `babel-loader`
      const babelLoader = config.module.loaders.find(spec => spec.loader === 'babel');
      if (babelLoader) {

        //run `babel-loader` on test files
        //run `isparta-loader` on source files

        babelLoader.loader = 'isparta';

      }

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
