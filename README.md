# tradie-plugin-coverage

Adds code coverage to `tradie`.

## Installation

    npm install --save tradie-plugin-coverage

## Usage

Add the plugin in your `.tradie.js` file:

```js
module.exports = {
  plugins: [['coverage', config]]
};
```

Run `tradie test`.

## Configuration

```json
{
  "thresholds": {
    "statements": 90,
    "branches": 90,
    "functions": 90,
    "lines": 90
  },
  "reports": ["html"]
}
```

## To do
 - consider `remap-istanbul` instead of `isparta`?