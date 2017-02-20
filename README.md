# tradie-plugin-coverage

Adds code coverage to `tradie`.

## Installation

    npm install --save tradie-plugin-coverage

## Usage

1. Configure `tradie.config.js`:

```js
var coverage = require('tradie-plugin-coverage');

module.exports = {
  plugins: [
    
    coverage({
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90
      },
      reports: ['html']
    })
    
  ]
};
```
2. Run `tradie test`.

## To do
 - consider `remap-istanbul` instead of `isparta`?
